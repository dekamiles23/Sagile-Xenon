// FIX: caminho do .env correto dentro do .asar.unpacked
const _dotenvPath = process.env.APP_DIR
  ? require('path').join(process.env.APP_DIR, '.env')
  : require('path').join(__dirname, '.env');
require('dotenv').config({ path: _dotenvPath });

// Pasta persistente de dados do usuario (nao apagada em atualizacoes)
const USER_DATA_DIR = process.env.USER_DATA_DIR || __dirname;

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const migrations = require('./migrations');
const database = require('./database');
const accounts = require('./accounts');

const app = express();
const server = http.createServer(app);

// ── Handlers globais: previnem crash do servidor por erros não tratados ──
process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVIDOR] Promise rejeitada não tratada:', reason && reason.message ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[SERVIDOR] Exceção não capturada:', err.message);
  // Não encerra o processo — mantém o servidor no ar
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  allowEIO3: true,
  pingTimeout: 20000,
  pingInterval: 25000,
  transports: ['polling', 'websocket'],
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6
});

app.use(express.json({ limit: '1mb' }));
// CORS — permite acesso de qualquer origem (necessário para usuários externos)
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});



// Rota de teste para verificar conexão com o banco de dados
app.get('/api/health/database', async (req, res) => {
  const health = await database.healthCheck();
  res.status(health.connected ? 200 : 500).json(health);
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const result = await accounts.registerAccount(req.body || {});
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await accounts.loginAccount(req.body || {});
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.get('/api/account/me', accounts.authMiddleware, (req, res) => {
  res.json({ account: req.authAccount });
});

app.patch('/api/account', accounts.authMiddleware, async (req, res) => {
  try {
    const oldNick = req.authAccount.nick;
    const result = await accounts.updateAccount(req.authToken, req.body || {});
    const newNick = result.account.nick;

    if (oldNick !== newNick) {
      renameUserData(oldNick, newNick);
    }

    // Se avatar foi atualizado, broadcast em tempo real para amigos online
    if (req.body && req.body.avatar !== undefined && result.account.avatar) {
      const myFriends = friends[newNick] || friends[oldNick] || [];
      myFriends.forEach(friend => {
        const uname = typeof friend === 'string' ? friend : (friend.username || '');
        if (uname) emitToUser(uname, 'user:avatar:data', { username: newNick, avatar: result.account.avatar });
      });
    }

    res.json({ account: result.account });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/account/logout', accounts.authMiddleware, async (req, res) => {
  await accounts.logoutAccount(req.authToken);
  res.json({ ok: true });
});

app.delete('/api/account', accounts.authMiddleware, async (req, res) => {
  try {
    const deleted = await accounts.deleteAccount(req.authToken, req.body?.password);
    purgeUserData(deleted.nick);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(require('path').join(USER_DATA_DIR, 'uploads')));

// ✅ MULTER - Upload de arquivos para Shorts/Reels
const multer = require('multer');
const uploadsDir = require('path').join(USER_DATA_DIR, 'uploads', 'shorts');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const shortStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = require('path').extname(file.originalname) || (file.mimetype.startsWith('video/') ? '.mp4' : '.jpg');
    cb(null, 'short_' + Date.now() + '_' + Math.random().toString(36).slice(2,7) + ext);
  }
});
const shortUpload = multer({
  storage: shortStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// ✅ ENDPOINT DE UPLOAD DE SHORT
app.post('/api/upload-short', shortUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const fileUrl = '/uploads/shorts/' + req.file.filename;
  res.json({ ok: true, fileUrl, fileType: req.file.mimetype });
});

app.get('/version', (req, res) => {
  try {
    const pkg = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    res.json({ version: pkg.version });
  } catch (e) {
    res.json({ version: '1.0.0' });
  }
});

app.get('/api/check-update', async (req, res) => {
  const GITHUB_REPO = 'dekamiles23/Sagile-Xenon';
  try {
    const https = require('https');
    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${GITHUB_REPO}/releases/latest`,
        method: 'GET',
        headers: {
          'User-Agent': 'MegaZX-App',
          'Accept': 'application/vnd.github.v3+json'
        }
      };
      const req2 = https.request(options, (r) => {
        let body = '';
        r.on('data', (chunk) => { body += chunk; });
        r.on('end', () => {
          if (r.statusCode === 200) {
            try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('Resposta inválida do GitHub')); }
          } else if (r.statusCode === 404) {
            reject(new Error('Repositório não encontrado no GitHub'));
          } else {
            reject(new Error(`GitHub retornou status ${r.statusCode}`));
          }
        });
      });
      req2.on('error', (e) => reject(new Error('Sem conexão com o GitHub')));
      req2.setTimeout(8000, () => { req2.destroy(); reject(new Error('Tempo esgotado ao conectar ao GitHub')); });
      req2.end();
    });
    res.json({ ok: true, release: data });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

app.get('/', (req, res) => {
  // Verifica se há token de sessão válido nos headers ou cookie
  const token = req.headers['x-auth-token'] || (req.headers['cookie'] || '').match(/token=([^;]+)/)?.[1];
  if (!token) {
    // Sem token → vai para auth.html (login/registro)
    return res.sendFile(path.join(__dirname, 'public', 'auth.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ ENDPOINT DE LOG DE ATIVIDADE DE AMIGOS
app.get('/friends-log', (req, res) => {
  const { user } = req.query;
  if (!user) {
    return res.json({ log: friendsActivityLog.slice(0, 100) });
  }
  const userLog = friendsActivityLog.filter(e => e.actor === user || e.target === user);
  res.json({ log: userLog.slice(0, 100) });
});
// ── Endpoint de presença offline via sendBeacon (beforeunload) ──
app.post('/api/presence/offline', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const body = req.body;
    const username = body && body.username;
    if (username && onlineUsers[username]) {
      userStatuses[username] = 'invisible';
      const myFriends = friends[username] || [];
      myFriends.forEach(friend => emitToUser(friend, 'friend:status', { username, status: 'invisible' }));
      broadcastPresence();
    }
  } catch (_) {}
  res.json({ ok: true });
});

// ✅ ENDPOINT DE PERFIL PÚBLICO DO USUÁRIO (shorts + servidores)
app.get('/user/:username/profile', (req, res) => {
  const uname = req.params.username;
  const userShorts = friendsActivityLog && shorts
    ? shorts.filter(s => s.username === uname).slice(-12).reverse()
    : [];
  res.json({
    shorts: userShorts,
    servers: userServers[uname] || []
  });
});


// Arquivos de persistência
const DATA_FILE = require('path').join(USER_DATA_DIR, 'data.json');

// Carregar dados salvos ou inicializar
let savedData = { channels: {}, feedPosts: [], friendRequests: {}, friends: {}, diaryEntries: {}, shorts: [] };
try {
  if (fs.existsSync(DATA_FILE)) {
    savedData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log('✅ Dados carregados com sucesso do arquivo');
  }
} catch (e) {
  console.log('ℹ️ Criando novo arquivo de dados');
}

const channels = savedData.channels || {};
const feedPosts = savedData.feedPosts || [];
const friendRequests = savedData.friendRequests || {}; // { usuario: [solicitantes] }
const friends = savedData.friends || {}; // { usuario: [amigos] }
const diaryEntries = savedData.diaryEntries || {}; // { usuario: [entradas] }
const shorts = savedData.shorts || []; // Lista global de Shorts / Reels
const suggestedCommunities = savedData.suggestedCommunities || []; // ✅ Comunidades sugeridas GLOBAIS
const communityRequests = savedData.communityRequests || []; // ✅ Comunidades pendentes de aprovação
const userCommunities = savedData.userCommunities || {}; // ✅ Comunidades por usuário
// ✅ BANIMENTOS E CASTIGOS
const bannedUsers = new Set(savedData.bannedUsers || []);
const mutedUsers = {}; // nick -> { until: timestamp }
const FEED_MAX = 200;
const SHORTS_MAX = 100;

// ✅ LOG DE ATIVIDADE DE AMIGOS
const friendsActivityLog = savedData.friendsActivityLog || [];
const FRIENDS_LOG_MAX = 500;
const voiceRooms = {};
const onlineUsers = {}; // username -> Set<socketId>  (suporta múltiplas abas/reconexões)
const onlineUserIds = new Map(); // [BUG2 FIX] userId -> socketId  (roteamento DM por ID único)
const userStatuses = {}; // username -> 'online'|'idle'|'dnd'|'invisible'
const userServers = {}; // username -> [{ id, name }] — em memória, não persistido

// ─── Helpers de presença ───────────────────────────────────────────────────
// Registra socketId para o usuário (suporta múltiplas abas).
function addOnlineUser(username, socketId) {
  if (!onlineUsers[username]) onlineUsers[username] = new Set();
  onlineUsers[username].add(socketId);
}
// Registra userId->socketId no mapa de IDs (routing DM/voz por UUID Neon).
// Usa Map — sobrescreve automaticamente se o usuário abrir nova aba/reconectar.
function addOnlineUserId(userId, socketId) {
  if (!userId) return;
  const uid = String(userId);
  if (onlineUserIds.has(uid) && onlineUserIds.get(uid) !== socketId) {
    console.log(`[onlineUserIds] userId=${uid} atualizado: ${onlineUserIds.get(uid)} → ${socketId}`);
  }
  onlineUserIds.set(uid, socketId);
}

// Remove um socketId específico. Só remove o usuário quando não há mais sockets.
function removeOnlineUser(username, socketId) {
  if (!onlineUsers[username]) return;
  onlineUsers[username].delete(socketId);
  if (onlineUsers[username].size === 0) delete onlineUsers[username];
}
// [BUG2 FIX] Remove userId do mapa de IDs
function removeOnlineUserId(userId) {
  if (userId) onlineUserIds.delete(String(userId));
}

// Retorna true se o usuário tem pelo menos um socket ativo.
function isUserOnline(username) {
  return !!(onlineUsers[username] && onlineUsers[username].size > 0);
}

// Emite evento para TODOS os sockets do usuário.
// Retorna true se havia pelo menos um socket (usuário online).
function emitToUser(username, event, data) {
  // Lookup case-insensitive — msg.to pode chegar com capitalização diferente
  let key = username;
  if (!onlineUsers[key] || onlineUsers[key].size === 0) {
    const lower = (username || '').toLowerCase();
    key = Object.keys(onlineUsers).find(u => u.toLowerCase() === lower) || username;
  }
  const sockets = onlineUsers[key];
  if (!sockets || sockets.size === 0) return false;
  sockets.forEach(sid => io.to(sid).emit(event, data));
  return true;
}

// Emite evento para um usuário pelo UUID do Neon DB (para DM e voz).
// Usa onlineUserIds Map<userId -> socketId>.
// Retorna true se o userId estava registrado (usuário online).
function emitToUserId(userId, event, data) {
  if (!userId) return false;
  const sid = onlineUserIds.get(String(userId));
  if (!sid) return false;
  io.to(sid).emit(event, data);
  return true;
}

// Retorna o primeiro socketId de um usuário (para operações de kick/ban).
function getSocketId(username) {
  const sockets = onlineUsers[username];
  if (!sockets || sockets.size === 0) return null;
  return sockets.values().next().value;
}
// ──────────────────────────────────────────────────────────────────────────
// ✅ LISTA DE STAFFS — persistente em savedData.staffList
const DEV_EMAILS = ['admin@exemplo.com']; // Apenas devs podem gerenciar staffs (validação por e-mail)
let staffUsers = ['Developer', 'Admin', 'Staff', 'demid']; // padrão inicial
function loadStaffList() {
  const saved = savedData.staffList;
  if (Array.isArray(saved) && saved.length > 0) {
    // Mescla: devs sempre presentes + lista salva
    staffUsers.length = 0;
    const merged = new Set([...DEV_EMAILS, ...saved]);
    merged.forEach(u => staffUsers.push(u));
  }
  savedData.staffList = [...staffUsers];
}
loadStaffList();

// Função para salvar dados em arquivo
function saveData() {
  const data = {
    channels,
    feedPosts,
    friendRequests,
    friends,
    diaryEntries,
    shorts,
    dmMessages: savedData.dmMessages,
    notifications: savedData.notifications,
    staffList: [...staffUsers],
    bannedUsers: [...bannedUsers],
    friendsActivityLog: friendsActivityLog.slice(0, FRIENDS_LOG_MAX),
    savedAt: new Date().toISOString()
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Salvar automaticamente a cada 30 segundos
setInterval(saveData, 30000);

// FIX v6: verificar heartbeats a cada 60 segundos
// Sockets sem heartbeat há mais de 90s provavelmente são abas fechadas sem evento
// 'disconnect' limpo — removê-los do mapa online para não prender status em Online.
setInterval(() => {
  const now = Date.now();
  const TIMEOUT_MS = 90000; // 90 segundos
  io.sockets.sockets.forEach((sock) => {
    if (sock.username && sock._lastHeartbeat && (now - sock._lastHeartbeat) > TIMEOUT_MS) {
      console.log(`[HEARTBEAT] Timeout para ${sock.username} (${sock.id}) — desconectando zombie`);
      sock.disconnect(true);
    }
  });
}, 60000);

// ✅ LOG DE ATIVIDADE DE AMIGOS
function logFriendAction(actor, action, target) {
  const entry = {
    id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    actor,
    action,
    target,
    timestamp: new Date().toISOString()
  };
  friendsActivityLog.unshift(entry);
  if (friendsActivityLog.length > FRIENDS_LOG_MAX) {
    friendsActivityLog.splice(FRIENDS_LOG_MAX);
  }
  emitToUser(actor, 'friends:log:new', entry);
  if (actor !== target) emitToUser(target, 'friends:log:new', entry);
  return entry;
}

function broadcastPresence() {
  const list = Object.keys(onlineUsers);
  io.emit('friends:presence', { online: list, statuses: userStatuses });
}
// ── Cleanup periódico de conexões fantasmas (sem heartbeat em 90s) ──────────
// Reduz risco de usuários aparecerem como Online após fechar o app
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [username, socketIds] of Object.entries(onlineUsers)) {
    for (const sid of socketIds) {
      const sock = io.sockets.sockets.get(sid);
      if (sock && sock._lastHeartbeat && (now - sock._lastHeartbeat) > 90000) {
        console.log(`[heartbeat-cleanup] Desconectando socket inativo: ${username} (${sid})`);
        sock.disconnect(true);
        changed = true;
      }
    }
  }
}, 60000);

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTÊNCIA DE AMIZADES E SOLICITAÇÕES NO NEON (PostgreSQL)
// ═══════════════════════════════════════════════════════════════════════════

// ── Tabela de amizades (friendships) ──────────────────────────────────────

// ── Tabela de presença (user_presence) ─────────────────────────────────────
async function initPresenceTable() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS user_presence (
        nick VARCHAR(100) PRIMARY KEY,
        status VARCHAR(20) NOT NULL DEFAULT 'offline',
        last_seen TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ [PRESENCE] Tabela user_presence verificada/criada.');
  } catch (err) {
    console.error('❌ [PRESENCE] Erro ao criar tabela user_presence:', err.message);
  }
}

async function dbUpsertPresence(nick, status) {
  if (!nick) return;
  try {
    await database.query(`
      INSERT INTO user_presence (nick, status, last_seen)
      VALUES ($1, $2, NOW())
      ON CONFLICT (nick)
      DO UPDATE SET status = $2, last_seen = NOW()
    `, [nick, status]);
  } catch (err) {
    console.error('[PRESENCE] Erro ao upsert presença:', err.message);
  }
}

async function dbHeartbeat(nick) {
  if (!nick) return;
  try {
    await database.query(`
      INSERT INTO user_presence (nick, status, last_seen)
      VALUES ($1, 'online', NOW())
      ON CONFLICT (nick)
      DO UPDATE SET last_seen = NOW()
    `, [nick]);
  } catch (err) {} // silencioso no heartbeat
}

async function dbGetPresenceBatch(nicks) {
  if (!nicks || nicks.length === 0) return {};
  try {
    const placeholders = nicks.map((_, i) => '$' + (i+1)).join(',');
    const res = await database.query(`
      SELECT nick, status,
        CASE WHEN NOW() - last_seen > INTERVAL '90 seconds'
             THEN 'offline'
             ELSE status
        END AS effective_status
      FROM user_presence
      WHERE nick = ANY(ARRAY[${placeholders}]::VARCHAR[])
    `, nicks);
    const map = {};
    res.rows.forEach(r => { map[r.nick] = r.effective_status; });
    return map;
  } catch (err) {
    return {};
  }
}

async function dbSaveFriendship(userA, userB) {
  // Garante que a dupla (A,B) E (B,A) existam — relação bidirecional
  try {
    const [lo, hi] = userA.toLowerCase() < userB.toLowerCase() ? [userA, userB] : [userB, userA];
    await database.query(
      `INSERT INTO friendships (user_a, user_b) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [lo, hi]
    );
    console.log(`✅ [DB] Amizade salva no Neon: "${userA}" ↔ "${userB}"`);
  } catch (err) {
    console.error(`❌ [DB] Erro ao salvar amizade: ${err.message}`);
  }
}

async function dbRemoveFriendship(userA, userB) {
  try {
    const [lo, hi] = userA.toLowerCase() < userB.toLowerCase() ? [userA, userB] : [userB, userA];
    await database.query(
      `DELETE FROM friendships WHERE user_a = $1 AND user_b = $2`,
      [lo, hi]
    );
    console.log(`✅ [DB] Amizade removida do Neon: "${userA}" ↔ "${userB}"`);
  } catch (err) {
    console.error(`❌ [DB] Erro ao remover amizade: ${err.message}`);
  }
}

async function dbLoadFriends(username) {
  try {
    const res = await database.query(
      `SELECT user_a, user_b FROM friendships
       WHERE LOWER(user_a) = LOWER($1) OR LOWER(user_b) = LOWER($1)`,
      [username]
    );
    const list = res.rows.map(r =>
      r.user_a.toLowerCase() === username.toLowerCase() ? r.user_b : r.user_a
    );
    console.log(`📥 [DB] Amigos de "${username}" no Neon (${list.length}):`, list);
    return list;
  } catch (err) {
    console.error(`❌ [DB] Erro ao carregar amigos de "${username}": ${err.message}`);
    return null; // null = usar fallback JSON
  }
}

async function initFriendRequestsTable() {
  try {
    // ── Diagnóstico: listar colunas atuais da tabela (se existir) ──────────
    const colCheck = await database.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'friend_requests'
      ORDER BY ordinal_position
    `);

    if (colCheck.rows.length > 0) {
      console.log('🔍 [DB] friend_requests — colunas atuais:',
        colCheck.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));

      const hasFromUser = colCheck.rows.some(r => r.column_name === 'from_user');
      const hasToUser   = colCheck.rows.some(r => r.column_name === 'to_user');

      if (!hasFromUser || !hasToUser) {
        // ── Schema errado (e.g. from_user_id INTEGER do migrations.js) ──
        // Dropar e recriar com schema correto (tabela estava vazia de registros válidos)
        console.warn('⚠ [DB] Schema inválido — recriando tabela friend_requests com colunas TEXT corretas...');
        await database.query('DROP TABLE IF EXISTS friend_requests');
        console.log('🗑 [DB] Tabela friend_requests removida');
      } else {
        console.log('✅ [DB] friend_requests já tem colunas corretas (from_user, to_user)');
        // Garantir constraint UNIQUE (pode estar faltando em versões antigas)
        await database.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints
              WHERE table_name = 'friend_requests'
                AND constraint_type = 'UNIQUE'
                AND constraint_name = 'friend_requests_from_user_to_user_key'
            ) THEN
              ALTER TABLE friend_requests ADD CONSTRAINT friend_requests_from_user_to_user_key UNIQUE (from_user, to_user);
            END IF;
          END$$;
        `).catch(() => {});
        return;
      }
    } else {
      console.log('ℹ [DB] Tabela friend_requests não existe — será criada');
    }

    // ── Criar tabela com schema correto ────────────────────────────────────
    await database.query(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id          SERIAL       PRIMARY KEY,
        from_user   TEXT         NOT NULL,
        to_user     TEXT         NOT NULL,
        status      TEXT         NOT NULL DEFAULT 'pending',
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE (from_user, to_user)
      )
    `);
    console.log('✅ [DB] Tabela friend_requests criada com schema correto no Neon');
  } catch (err) {
    console.error('❌ [DB] Erro ao inicializar tabela friend_requests:', err.message);
  }
}

// Salva ou atualiza uma solicitação de amizade no Neon
async function dbSaveFriendRequest(fromUser, toUser) {
  try {
    // INSERT ... ON CONFLICT evita race conditions e não depende de updated_at
    await database.query(
      `INSERT INTO friend_requests (from_user, to_user, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (from_user, to_user)
       DO UPDATE SET status = 'pending'`,
      [fromUser, toUser]
    );
    console.log(`✅ [DB] Solicitação salva no Neon: "${fromUser}" → "${toUser}"`);
  } catch (err) {
    console.error(`❌ [DB] FALHA ao salvar solicitação "${fromUser}" → "${toUser}":`, err.message);
    // Fallback: se a constraint UNIQUE não existir, tenta INSERT simples ignorando duplicata
    try {
      await database.query(
        `INSERT INTO friend_requests (from_user, to_user, status) VALUES ($1, $2, 'pending')`,
        [fromUser, toUser]
      ).catch(() => {});
    } catch (_) {}
  }
}

// Carrega solicitações RECEBIDAS pelo usuário (to_user) pendentes
async function dbLoadReceivedRequests(toUser) {
  try {
    const res = await database.query(
      `SELECT from_user FROM friend_requests
       WHERE LOWER(to_user) = LOWER($1) AND status = 'pending'
       ORDER BY created_at DESC`,
      [toUser]
    );
    const list = res.rows.map(r => r.from_user);
    console.log(`📥 [DB] Solicitações recebidas por "${toUser}" (${list.length}):`, list);
    return list;
  } catch (err) {
    console.error(`❌ [DB] Erro ao carregar solicitações recebidas para "${toUser}":`, err.message);
    console.error(`❌ [DB] Dica: tabela friend_requests pode ter schema incorreto (colunas INTEGER em vez de TEXT)`);
    return null; // null = usar fallback do arquivo JSON
  }
}

// Carrega solicitações ENVIADAS pelo usuário (from_user) pendentes
async function dbLoadSentRequests(fromUser) {
  try {
    const res = await database.query(
      `SELECT to_user FROM friend_requests
       WHERE LOWER(from_user) = LOWER($1) AND status = 'pending'
       ORDER BY created_at DESC`,
      [fromUser]
    );
    const list = res.rows.map(r => r.to_user);
    console.log(`📤 [DB] Solicitações enviadas por "${fromUser}" (${list.length}):`, list);
    return list;
  } catch (err) {
    console.error(`❌ [DB] Erro ao carregar solicitações enviadas de "${fromUser}":`, err.message);
    return null;
  }
}

// Atualiza status de uma solicitação (accepted | rejected | cancelled)
async function dbUpdateFriendRequestStatus(fromUser, toUser, status) {
  try {
    await database.query(
      `UPDATE friend_requests SET status = $3, updated_at = NOW()
       WHERE LOWER(from_user) = LOWER($1) AND LOWER(to_user) = LOWER($2)`,
      [fromUser, toUser, status]
    );
    console.log(`🔄 [DB] Status atualizado: "${fromUser}" → "${toUser}" = ${status}`);
  } catch (err) {
    console.error(`❌ [DB] Erro ao atualizar status da solicitação:`, err.message);
  }
}

function roomKey(communityId, channel) {
  return communityId ? `${communityId}:${channel}` : channel;
}

function getHistory(communityId, channel) {
  const key = roomKey(communityId, channel);
  if (!channels[key]) channels[key] = [];
  return channels[key];
}

function pushMessage(communityId, channel, msg) {
  const history = getHistory(communityId, channel);
  history.push(msg);
  if (history.length > 100) history.shift();
}

function renameUserData(oldNick, newNick) {
  if (!oldNick || !newNick || oldNick === newNick) return;

  if (friendRequests[oldNick]) {
    friendRequests[newNick] = friendRequests[oldNick];
    delete friendRequests[oldNick];
  }
  if (friends[oldNick]) {
    friends[newNick] = friends[oldNick];
    delete friends[oldNick];
  }
  if (diaryEntries[oldNick]) {
    diaryEntries[newNick] = diaryEntries[oldNick];
    delete diaryEntries[oldNick];
  }
  if (userCommunities[oldNick]) {
    userCommunities[newNick] = userCommunities[oldNick];
    delete userCommunities[oldNick];
  }

  Object.keys(friendRequests).forEach((user) => {
    friendRequests[user] = (friendRequests[user] || []).map((name) => (name === oldNick ? newNick : name));
  });
  Object.keys(friends).forEach((user) => {
    friends[user] = (friends[user] || []).map((name) => (name === oldNick ? newNick : name));
  });

  if (savedData.dmMessages) {
    Object.keys(savedData.dmMessages).forEach((conversationId) => {
      if (conversationId.includes(oldNick)) {
        const messages = savedData.dmMessages[conversationId];
        const newConversationId = conversationId.replace(oldNick, newNick);
        savedData.dmMessages[newConversationId] = messages.map((msg) => ({
          ...msg,
          from: msg.from === oldNick ? newNick : msg.from,
          to: msg.to === oldNick ? newNick : msg.to,
        }));
        delete savedData.dmMessages[conversationId];
      } else {
        savedData.dmMessages[conversationId] = savedData.dmMessages[conversationId].map((msg) => ({
          ...msg,
          from: msg.from === oldNick ? newNick : msg.from,
          to: msg.to === oldNick ? newNick : msg.to,
        }));
      }
    });
  }

  if (savedData.notifications && savedData.notifications[oldNick]) {
    savedData.notifications[newNick] = savedData.notifications[oldNick];
    delete savedData.notifications[oldNick];
  }

  feedPosts.forEach((post) => {
    if (post.username === oldNick) post.username = newNick;
  });
  shorts.forEach((short) => {
    if (short.username === oldNick) short.username = newNick;
  });

  if (onlineUsers[oldNick]) {
    onlineUsers[newNick] = onlineUsers[oldNick]; // transfere o Set inteiro
    delete onlineUsers[oldNick];
  }

  saveData();
}

function purgeUserData(nick) {
  if (!nick) return;

  delete friendRequests[nick];
  delete friends[nick];
  delete diaryEntries[nick];
  delete userCommunities[nick];
  delete onlineUsers[nick];

  Object.keys(friendRequests).forEach((user) => {
    friendRequests[user] = (friendRequests[user] || []).filter((name) => name !== nick);
  });
  Object.keys(friends).forEach((user) => {
    friends[user] = (friends[user] || []).filter((name) => name !== nick);
  });

  if (savedData.dmMessages) {
    Object.keys(savedData.dmMessages).forEach((conversationId) => {
      if (conversationId.includes(nick)) {
        delete savedData.dmMessages[conversationId];
      } else {
        savedData.dmMessages[conversationId] = savedData.dmMessages[conversationId].filter(
          (msg) => msg.from !== nick && msg.to !== nick
        );
      }
    });
  }

  if (savedData.notifications && savedData.notifications[nick]) {
    delete savedData.notifications[nick];
  }

  for (let i = feedPosts.length - 1; i >= 0; i--) {
    if (feedPosts[i].username === nick) feedPosts.splice(i, 1);
  }
  for (let i = shorts.length - 1; i >= 0; i--) {
    if (shorts[i].username === nick) shorts.splice(i, 1);
  }

  suggestedCommunities.forEach((community, index) => {
    if (community.addedBy === nick || community.submittedBy === nick) {
      suggestedCommunities.splice(index, 1);
    }
  });

  saveData();
}


// ================================================
// MENSAGENS PRIVADAS - BANCO DE DADOS NEON
// ================================================
async function dbSavePrivateMessage(from_username, to_username, text, time_str) {
  try {
    await database.query(
      `INSERT INTO private_messages (from_username, to_username, text, time, timestamp, status)
       VALUES ($1, $2, $3, $4, $5, 'sent')`,
      [from_username, to_username, text, time_str, Date.now()]
    );
  } catch (err) {
    console.error('❌ [DM] Erro ao salvar mensagem privada:', err.message);
  }
}

async function dbLoadConversationHistory(user1, user2, limit) {
  limit = limit || 100;
  try {
    const result = await database.query(
      `SELECT from_username AS "from", to_username AS "to", text, time, timestamp
       FROM private_messages
       WHERE (LOWER(from_username) = LOWER($1) AND LOWER(to_username) = LOWER($2))
          OR (LOWER(from_username) = LOWER($2) AND LOWER(to_username) = LOWER($1))
       ORDER BY COALESCE(timestamp, EXTRACT(EPOCH FROM created_at)*1000) ASC
       LIMIT $3`,
      [user1, user2, limit]
    );
    return result.rows;
  } catch (err) {
    console.error('❌ [DM] Erro ao carregar histórico:', err.message);
    return [];
  }
}

io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  socket.on('user:login', async ({ username, email }) => {
    // ✅ BLOQUEAR LOGIN COM NOME "Usuário"
    if (!username || username === 'Usuário' || username.trim() === '') {
      console.warn('⚠ Tentativa de login com nome inválido bloqueada');
      return;
    }

    console.log(`\n🔐 [LOGIN] ───────────────────────────────────────`);
    console.log(`🔐 [LOGIN] Username recebido do cliente: "${username}" | socket.id: ${socket.id}`);

    // [FIX v6] Definir socket.username IMEDIATAMENTE antes de qualquer query async.
    // Sem isso, mensagens enviadas durante o SELECT nick (Neon frio = 2-5s) eram
    // descartadas pelo guard "if (!socket.username) return;" do handler dm:message.
    socket.username = username; // será atualizado para o nick canônico após o SELECT
    socket.join('dm:user:' + username.toLowerCase()); // room imediata

    // ── Normalizar username para o nick canônico do banco (corrige mismatch de capitalização) ──
    let canonicalUsername = username;
    try {
      const nickRes = await database.query(
        'SELECT id, nick FROM accounts WHERE LOWER(nick) = LOWER($1)',
        [username]
      );
      if (nickRes.rows.length > 0) {
        canonicalUsername = nickRes.rows[0].nick;
        socket.userId = String(nickRes.rows[0].id); // [BUG2 FIX] armazena ID único do usuário
        if (canonicalUsername !== username) {
          console.log(`🔐 [LOGIN] Nick normalizado: "${username}" → "${canonicalUsername}" | userId: ${socket.userId}`);
        }
      } else {
        console.warn(`⚠ [LOGIN] Nick "${username}" não encontrado na tabela accounts — usando como está`);
      }
    } catch (normErr) {
      console.warn(`⚠ [LOGIN] Falha ao normalizar nick (${normErr.message}) — usando "${username}" como está`);
    }
    
    socket.username = canonicalUsername;
    console.log('[DM ROOM]', receiverRoom);
console.log('[ROOM MEMBERS]', [...(io.sockets.adapter.rooms.get(receiverRoom) || [])]);
    socket.email = (email || '').trim().toLowerCase();
    addOnlineUser(canonicalUsername, socket.id); // suporta múltiplas abas e reconexões
    // [DM-RT FIX] Registrar por userId — mas APENAS se userId foi resolvido com sucesso.
    // Se socket.userId está undefined (query falhou), não chamar addOnlineUserId (já tem guard interno).
    addOnlineUserId(socket.userId, socket.id);
    console.log(`[LOGIN] socket.userId=${socket.userId} | onlineUserIds size=${onlineUserIds.size}`);
    console.log('[ONLINE USERS]', [...onlineUserIds.entries()]);
    // [DM-RT FIX] Entrar na room pessoal: garante entrega mesmo durante reconexão
    // A room é a fonte primária de entrega de DMs — sempre garantida independente do userId.
    socket.join('dm:user:' + canonicalUsername.toLowerCase());
    // FIX v6: garantir que todo usuário logado tenha um status padrão 'online'
    // Sem isso, broadcastPresence omite o usuário do mapa de statuses e
    // os amigos vêem 'Offline' mesmo com o usuário conectado.
    if (!userStatuses[canonicalUsername]) {
      userStatuses[canonicalUsername] = 'online';
    }
    socket._lastHeartbeat = Date.now();
    // Persistir presença no Neon
    dbUpsertPresence(canonicalUsername, 'online').catch(() => {});
    broadcastPresence();
    
    // ─── Carregar solicitações de amizade do Neon (fonte primária) ───
    // Fallback para o arquivo JSON se o DB falhar
    console.log(`\n🔍 [LOGIN] ── Diagnóstico friend_requests ──`);
    console.log(`🔍 [LOGIN] REMETENTE (socket.username): "${socket.username}"`);
    console.log(`🔍 [LOGIN] friendRequests em memória ANTES do load:`, JSON.stringify(friendRequests[canonicalUsername] || [], null, 2));

    // ── Carregar solicitações pendentes ──
    let receivedReqs = await dbLoadReceivedRequests(canonicalUsername);
    let sentReqs;
    if (receivedReqs !== null) {
      if (receivedReqs.length > 0) {
        friendRequests[canonicalUsername] = receivedReqs;
      } else if ((friendRequests[canonicalUsername] || []).length > 0) {
        console.warn(`⚠ [LOGIN] DB retornou [] mas memória tem dados — preservando memória: ${JSON.stringify(friendRequests[canonicalUsername])}`);
        receivedReqs = friendRequests[canonicalUsername];
      } else {
        friendRequests[canonicalUsername] = [];
      }
      sentReqs = await dbLoadSentRequests(canonicalUsername);
      if (sentReqs === null) {
        sentReqs = Object.keys(friendRequests).filter(u => (friendRequests[u] || []).includes(canonicalUsername));
      }
    } else {
      receivedReqs = friendRequests[canonicalUsername] || [];
      sentReqs = Object.keys(friendRequests).filter(u => (friendRequests[u] || []).includes(canonicalUsername));
    }

    // ── Carregar amigos do Neon DB (persistência bidirecional) ──
    // Se o DB tiver amigos que a memória não tem (ex: servidor reiniciado),
    // mesclar as duas fontes para garantir consistência.
    let dbFriends = await dbLoadFriends(canonicalUsername);
    if (dbFriends !== null && dbFriends.length > 0) {
      const memFriends = friends[canonicalUsername] || [];
      const mergedFriends = [...new Set([...memFriends, ...dbFriends])];
      friends[canonicalUsername] = mergedFriends;
      // Garantir bidirecionalidade em memória para cada amigo listado no DB
      dbFriends.forEach(f => {
        if (!friends[f]) friends[f] = [];
        if (!friends[f].includes(canonicalUsername)) friends[f].push(canonicalUsername);
      });
      if (mergedFriends.length !== memFriends.length) {
        console.log(`🔗 [LOGIN] Amigos sincronizados do Neon: ${dbFriends.join(', ')}`);
        saveData();
      }
    }

    console.log(`📥 [LOGIN] Solicitações RECEBIDAS por "${canonicalUsername}":`, receivedReqs);
    console.log(`📤 [LOGIN] Solicitações ENVIADAS por "${canonicalUsername}":`, sentReqs);
    console.log(`👥 [LOGIN] Amigos de "${canonicalUsername}":`, friends[canonicalUsername] || []);
    console.log(`🔐 [LOGIN] ─────────────────────────────────────────\n`);

    // [FIX v6] Enriquecer lista de amigos com IDs do Neon → resolve receiverId: null
    let friendsPayload = friends[canonicalUsername] || [];
    try {
      const rawList = friendsPayload;
      if (rawList.length > 0) {
        const idsRes = await database.query(
          `SELECT nick, id::text AS id, avatar FROM accounts WHERE LOWER(nick) = ANY($1::text[])`,
          [rawList.map(f => (typeof f === 'string' ? f : f.username || '').toLowerCase())]
        );
        const idMap = {};
        const avatarMap = {};
        idsRes.rows.forEach(r => { idMap[r.nick.toLowerCase()] = r.id; avatarMap[r.nick.toLowerCase()] = r.avatar || null; });
        friendsPayload = rawList.map(f => {
          const uname = typeof f === 'string' ? f : (f.username || '');
          return { username: uname, id: idMap[uname.toLowerCase()] || null, avatar: avatarMap[uname.toLowerCase()] || null };
        });
      }
    } catch (_e) { /* fallback: enviar strings */ }

    socket.emit('friends:data', {
      requests: receivedReqs,
      friends: friendsPayload,
      sentRequests: sentReqs,
      userId: socket.userId || null
    });

    // Enviar entradas do diário do usuário
    // BUG FIX v5: usar canonicalUsername em vez de username para todas as lookups pós-login
    socket.emit('diary:entries', {
      entries: diaryEntries[canonicalUsername] || diaryEntries[username] || []
    });

    // Enviar todos os Shorts salvos
    socket.emit('shorts:history', shorts.slice(-50).reverse());

    // Enviar notificações pendentes (não lidas) ao usuário
    // BUG FIX v5: tentar canonical primeiro, cair no username raw como fallback
    const pendingNotifs = (savedData.notifications && (
      savedData.notifications[canonicalUsername] ||
      savedData.notifications[username]
    )) || [];
    if (pendingNotifs.length > 0) {
      socket.emit('notifications:data', pendingNotifs);
    }

    // ✅ Emite o cargo/role do usuário ao cliente
    // BUG FIX v5: usar canonicalUsername para staffUsers check
    const isStaff = staffUsers.includes(canonicalUsername) || staffUsers.includes(username) ||
                    DEV_EMAILS.includes((email || '').trim().toLowerCase());
    socket.emit('user:role', { isStaff, isDev: DEV_EMAILS.includes((email || '').trim().toLowerCase()), staffList: staffUsers });

    // ✅ Bloqueia entrada de usuários banidos
    // BUG FIX v5: checar canonicalUsername E username (para compatibilidade com bans antigos)
    if (bannedUsers.has(canonicalUsername) || bannedUsers.has(username)) {
      socket.emit('member:banned', { target: canonicalUsername, reason: 'Você foi banido deste servidor.' });
      socket.disconnect(true);
      return;
    }
  });

  // ✅ Permite cliente pedir histórico de Shorts a qualquer momento
  socket.on('shorts:request', () => {
    socket.emit('shorts:history', shorts.slice(-50).reverse());
  });

  // ✅ Recebe lista de servidores do cliente para cálculo de servidores em comum
  socket.on('user:servers:report', ({ servers }) => {
    if (!socket.username) return;
    userServers[socket.username] = (Array.isArray(servers) ? servers : [])
      .slice(0, 50)
      .map(s => ({ id: String(s.id || ''), name: String(s.name || '') }));
  });

  // ✅ Recebe eventos de log gerados no cliente (abrir modal, ver amigo, etc.)
  socket.on('friends:log:client', ({ action, target }) => {
      if (!socket.username || !action) return;
      logFriendAction(socket.username, action, target || '—');
    });

    // ── Status do usuário (online, idle, dnd, invisible) ──
    socket.on('user:status', ({ status }) => {
      if (!socket.username) return;
      // Aceitar 'offline' do dropdown (normalizar para 'invisible' internamente)
      const valid = ['online', 'idle', 'dnd', 'invisible', 'offline'];
      if (!valid.includes(status)) return;
      const normalized = status === 'offline' ? 'invisible' : status;
      userStatuses[socket.username] = normalized;
      const myFriends = friends[socket.username] || [];
      myFriends.forEach(friend => emitToUser(friend, 'friend:status', { username: socket.username, status: normalized }));
      // Persistir no Neon
      dbUpsertPresence(socket.username, normalized).catch(() => {});
      console.log('[STATUS] ' + socket.username + ' → ' + normalized);
      broadcastPresence();
    });

  socket.on('friend:request', async ({ to }) => {
    // LOG DIAGNÓSTICO: rastrear remetente e destinatário
    console.log(`\n📨 [FRIEND:REQUEST] ─────────────────────────────────`);
    console.log(`📨 [FRIEND:REQUEST] socket.id:   ${socket.id}`);
    console.log(`📨 [FRIEND:REQUEST] REMETENTE:   "${socket.username}"`);
    console.log(`📨 [FRIEND:REQUEST] DESTINATÁRIO DIGITADO: "${to}"`);

    if (!socket.username) {
      console.warn('⚠ [FRIEND:REQUEST] Bloqueado: socket.username não definido (user:login ainda não foi processado)');
      socket.emit('friend:request:error', { message: 'Sessão inválida. Recarregue a página e faça login novamente.' });
      return;
    }
    const cleanTo = String(to || '').trim().replace(/^@/, '');
    // BUG FIX v5: usar comparação case-insensitive para auto-envio
    // Antes: 'alice' !== 'Alice' passava o bloco e criava self-request no DB
    if (!cleanTo || cleanTo.toLowerCase() === socket.username.toLowerCase()) {
      console.warn(`⚠ [FRIEND:REQUEST] Bloqueado: destinatário inválido ou self-request ("${cleanTo}")`);
      return;
    }

    // Normalizar nick via busca case-insensitive no banco (corrige bug de capitalização)
    let realTo = cleanTo;
    try {
      const res = await database.query(
        'SELECT nick FROM accounts WHERE LOWER(nick) = LOWER($1)',
        [cleanTo]
      );
      if (res.rows.length === 0) {
        console.warn(`⚠ [FRIEND:REQUEST] Usuário "${cleanTo}" não encontrado no banco`);
        socket.emit('friend:request:error', { to: cleanTo, message: `Usuário "${cleanTo}" não encontrado.` });
        return;
      }
      realTo = res.rows[0].nick;
    } catch (dbErr) {
      console.error('❌ [FRIEND:REQUEST] Falha na busca do nick no DB, usando fallback online:', dbErr.message);
      const onlineMatch = Object.keys(onlineUsers).find(u => u.toLowerCase() === cleanTo.toLowerCase());
      realTo = onlineMatch || cleanTo;
    }

    console.log(`📨 [FRIEND:REQUEST] DESTINATÁRIO REAL (normalizado): "${realTo}"`);

    // Verificar se já são amigos
    if ((friends[realTo] || []).includes(socket.username)) {
      console.log(`📨 [FRIEND:REQUEST] Já são amigos — ignorado`);
      socket.emit('friend:request:error', { to: realTo, message: `Você e ${realTo} já são amigos.` });
      return;
    }

    // Verificar se já existe solicitação pendente
    const jaExiste = (friendRequests[realTo] || []).includes(socket.username);

    // ── LOG DIAGNÓSTICO v5: mostrar estado completo ANTES de salvar ──
    const onlineList = Object.keys(onlineUsers);
    console.log(`📨 [FRIEND:REQUEST] Usuários online no momento: [${onlineList.join(', ') || 'nenhum'}]`);
    console.log(`📨 [FRIEND:REQUEST] "${realTo}" está online? ${onlineList.map(u=>u.toLowerCase()).includes(realTo.toLowerCase()) ? '✅ SIM' : '❌ NÃO (salvo para próximo login)'}`);
    console.log(`📨 [FRIEND:REQUEST] jaExiste na memória: ${jaExiste}`);
    console.log(`📨 [FRIEND:REQUEST] friendRequests["${realTo}"] ANTES:`, friendRequests[realTo] || []);

    // Salvar em memória (in-memory cache)
    if (!friendRequests[realTo]) friendRequests[realTo] = [];
    if (!jaExiste) {
      friendRequests[realTo].push(socket.username);
      saveData();
      logFriendAction(socket.username, 'request_sent', realTo);
    }

    // Salvar no Neon (persistência primária)
    await dbSaveFriendRequest(socket.username, realTo);

    console.log(`📨 [FRIEND:REQUEST] friendRequests["${realTo}"] DEPOIS:`, friendRequests[realTo]);
    console.log(`📨 [FRIEND:REQUEST] ─────────────────────────────────────\n`);

    // Entregar em tempo real ou guardar para o próximo login
    const delivered = emitToUser(realTo, 'friend:request', { from: socket.username });
    if (!delivered) {
      console.log(`📨 [FRIEND:REQUEST] "${realTo}" OFFLINE — solicitação persistida no Neon, será entregue no próximo login`);
      socket.emit('friend:request:sent', { to: realTo, offline: true });
    } else {
      console.log(`📨 [FRIEND:REQUEST] "${realTo}" ONLINE — solicitação entregue via socket em tempo real ✅`);
      socket.emit('friend:request:sent', { to: realTo, offline: false });
    }
  });

  socket.on('friend:accept', async ({ to }) => {
    console.log(`\n✅ [FRIEND:ACCEPT] "${socket.username}" aceitou solicitação de "${to}"`);

    // Atualizar memória
    if (friendRequests[socket.username]) {
      friendRequests[socket.username] = friendRequests[socket.username].filter(u => u !== to);
    }
    if (!friends[socket.username]) friends[socket.username] = [];
    if (!friends[socket.username].includes(to)) friends[socket.username].push(to);
    if (!friends[to]) friends[to] = [];
    if (!friends[to].includes(socket.username)) friends[to].push(socket.username);
    saveData();
    logFriendAction(socket.username, 'request_accepted', to);

    // Atualizar status no Neon
    await dbUpdateFriendRequestStatus(to, socket.username, 'accepted');

    // Notificar o remetente da solicitação que foi aceito
    emitToUser(to, 'friend:accepted', { by: socket.username });

    // Salvar amizade no Neon DB (persistência bidirecional)
    await dbSaveFriendship(socket.username, to);

    // [FIX v6] Emitir friends:data com IDs para AMBOS os usuários
    async function _emitFriendsData(targetSocket, targetUsername) {
      let fList = friends[targetUsername] || [];
      try {
        if (fList.length > 0) {
          const r = await database.query(
            `SELECT nick, id::text AS id, avatar FROM accounts WHERE LOWER(nick) = ANY($1::text[])`,
            [fList.map(f => (typeof f === 'string' ? f : f.username || '').toLowerCase())]
          );
          const m = {}; const av = {};
          r.rows.forEach(row => { m[row.nick.toLowerCase()] = row.id; av[row.nick.toLowerCase()] = row.avatar || null; });
          fList = fList.map(f => { const u = typeof f === 'string' ? f : (f.username || ''); return { username: u, id: m[u.toLowerCase()] || null, avatar: av[u.toLowerCase()] || null }; });
        }
      } catch (_e) {}
      const payload = {
        requests: friendRequests[targetUsername] || [],
        friends: fList,
        sentRequests: Object.keys(friendRequests).filter(u => (friendRequests[u] || []).includes(targetUsername))
      };
      if (targetSocket && typeof targetSocket.emit === 'function') {
        targetSocket.emit('friends:data', payload);
      } else {
        emitToUser(targetUsername, 'friends:data', payload);
      }
    }
    await _emitFriendsData(socket, socket.username);
    await _emitFriendsData(null, to);

    console.log(`✅ [FRIEND:ACCEPT] Amizade registrada: "${socket.username}" ↔ "${to}"\n`);
  });

  socket.on('friend:reject', async ({ to }) => {
    console.log(`\n❌ [FRIEND:REJECT] "${socket.username}" recusou solicitação de "${to}"`);

    if (friendRequests[socket.username]) {
      friendRequests[socket.username] = friendRequests[socket.username].filter(u => u !== to);
      saveData();
      logFriendAction(socket.username, 'request_rejected', to);
    }

    // Atualizar status no Neon
    await dbUpdateFriendRequestStatus(to, socket.username, 'rejected');

    emitToUser(to, 'friend:rejected', { by: socket.username });
    console.log(`❌ [FRIEND:REJECT] Solicitação de "${to}" para "${socket.username}" marcada como rejected\n`);
  });

  socket.on('friend:remove', async ({ to }) => {
    // Remover amizade para ambos (memória + JSON + Neon)
    if (friends[socket.username]) {
      friends[socket.username] = friends[socket.username].filter(u => u !== to);
    }
    if (friends[to]) {
      friends[to] = friends[to].filter(u => u !== socket.username);
    }
    saveData();
    logFriendAction(socket.username, 'friend_removed', to);
    // Remover do Neon também (persistência após reinicialização do servidor)
    await dbRemoveFriendship(socket.username, to);
    emitToUser(to, 'friend:removed', { by: socket.username });
    console.log(`🗑 [FRIEND:REMOVE] "${socket.username}" removeu amizade com "${to}"`);
  });

  // FIX v6: enviar presença atualizada apenas para o cliente que solicitou
  // (usado quando o modal de amigos é aberto para garantir dados frescos)
  socket.on('presence:request', async () => {
    if (!socket.username) return;
    // Buscar dados de presença do DB para os amigos (enriquece dados in-memory)
    const myFriends = friends[socket.username] || [];
    const dbStatuses = await dbGetPresenceBatch(myFriends).catch(() => ({}));
    // Mesclar: DB é fonte de verdade para usuários offline; memória para online (mais fresco)
    const mergedStatuses = Object.assign({}, dbStatuses, userStatuses);
    socket.emit('friends:presence', { online: Object.keys(onlineUsers), statuses: mergedStatuses });
    console.log('[PRESENCE:REQUEST] ' + socket.username + ' — online:', Object.keys(onlineUsers).length, 'friends:', myFriends.length);
  });

  // FIX v6: heartbeat do cliente — rastrear última atividade para detectar
  // conexões fantasmas (aba fechada sem evento disconnect limpo)
  socket.on('user:heartbeat', ({ status } = {}) => {
    if (!socket.username) return;
    socket._lastHeartbeat = Date.now();
    if (status && ['online', 'idle', 'dnd', 'invisible', 'offline'].includes(status)) {
      userStatuses[socket.username] = status === 'offline' ? 'invisible' : status;
    }
    // Atualizar last_seen no Neon
    dbHeartbeat(socket.username).catch(() => {});
  });

  // ── Cancelar solicitação enviada ──
    socket.on('friend:cancel', async ({ to }) => {
      const cleanTo = String(to || '').trim().replace(/^@/, '');
      if (!cleanTo || !socket.username) return;
      console.log(`🚫 [FRIEND:CANCEL] "${socket.username}" cancelou solicitação para "${cleanTo}"`);
      if (friendRequests[cleanTo]) {
        friendRequests[cleanTo] = friendRequests[cleanTo].filter(u => u !== socket.username);
        if (friendRequests[cleanTo].length === 0) delete friendRequests[cleanTo];
        saveData();
      }
      // Marcar como cancelado no Neon
      await dbUpdateFriendRequestStatus(socket.username, cleanTo, 'cancelled');
      socket.emit('friend:cancel:ok', { to: cleanTo });
      emitToUser(cleanTo, 'friend:request:cancelled', { by: socket.username });
    });

    // ==============================
  // SISTEMA DE MENSAGENS PRIVADAS
  // ==============================

  socket.on('dm:message', async (msg) => {
    if (!socket.username) {
      console.warn('[DM] Mensagem ignorada: socket.username não definido (user:login pendente)');
      return;
    }

    // Resolver username canônico do destinatário (case-insensitive)
    const toLower = (msg.to || '').toLowerCase();
    const canonicalTo = Object.keys(onlineUsers).find(u => u.toLowerCase() === toLower) || msg.to;

    const senderId   = socket.userId || socket.username;
    const receiverId = msg.receiverId ? String(msg.receiverId) : null;

    const fullMsg = {
      from: socket.username,
      to: canonicalTo,
      fromId: socket.userId || null,
      receiverId: receiverId,
      text: msg.text,
      time: msg.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    // ── Logs de diagnóstico (formato exato solicitado) ───────────────────────
    console.log('[ONLINE USERS]', [...onlineUserIds.entries()]);
    console.log('[DM receiverId]', msg.receiverId);

    const receiverSocketId = receiverId ? onlineUserIds.get(String(receiverId)) : undefined;
    console.log('[DM receiverSocketId]', receiverSocketId);

    // ── Entrega em tempo real: via Socket.IO room (primário) + socket direto (fallback) ──
    // A room 'dm:user:<username>' é unida imediatamente no user:login, antes de qualquer query async.
    // Isso garante entrega mesmo que userId não tenha sido resolvido (Neon DB frio, timeout, etc).
    const receiverRoom = 'dm:user:' + toLower;
    io.to(receiverRoom).emit('dm:message', fullMsg);
    console.log(`[DM-RT] ✅ Entregue via room ${receiverRoom}`);

    // Fallback adicional via socket ID direto (para casos de race condition)
    if (receiverSocketId && receiverSocketId !== socket.id) {
      // Verifica se esse socket já recebeu pela room antes de enviar duplicado
      const receiverSock = io.sockets.sockets.get(receiverSocketId);
      const alreadyInRoom = receiverSock && receiverSock.rooms.has(receiverRoom);
      if (!alreadyInRoom) {
        io.to(receiverSocketId).emit('dm:message', fullMsg);
        console.log(`[DM-RT] ✅ Fallback: receiverId=${receiverId} → socket=${receiverSocketId}`);
      }
    }

    // Confirmar ao remetente (com dados canônicos do servidor)
    socket.emit('dm:message:sent', fullMsg);
    console.log(`[DM ENVIADA] confirmação ao remetente ${socket.id}`);

    socket.on('dm:message', (msg) => {
  // msg tem { from, to, text, timestamp }
  const receiver = msg.to;
  if (!receiver) return;

  // Salvar no banco (opcional)

  // Emitir para a sala do destinatário
  const room = 'dm:user:' + receiver.toLowerCase();
  io.to(room).emit('dm:message', msg);
});

socket.on('dm:message', (msg) => {
  // ... salvar no banco ...

  // Determinar a room correta
  const receiver = msg.receiverId || msg.to; // fallback para o nome
  const room = `dm:user:${String(receiver).toLowerCase()}`;
  io.to(room).emit('dm:message', msg);
});

socket.on('connection', (socket) => {
  // Após login (ou identificação do usuário)
  socket.on('user:login', (data) => {
    const username = data.username;
    if (username) {
      socket.join('dm:user:' + username.toLowerCase());
      // ...
    }
  });

  // Também na reconexão, o Socket.IO já reentra automaticamente nas salas 
  // se o servidor for configurado com `adapter` (padrão), 
  // mas você pode forçar no evento `connect` do cliente.
});

// Quando o cliente pedir o ID de um usuário
socket.on('dm:get-user-id', async ({ username }) => {
  // Busca no banco pelo nick (case-insensitive)
  try {
    const result = await database.query('SELECT id::text AS id FROM accounts WHERE LOWER(nick) = LOWER($1)', [username]);
    const row = result.rows[0];
    socket.emit('dm:user-id', { username, userId: row ? row.id : null });
  } catch (err) {
    socket.emit('dm:user-id', { username, userId: null });
  }
});

    // Persistir no Neon DB
    dbSavePrivateMessage(fullMsg.from, fullMsg.to, fullMsg.text, fullMsg.time).catch(() => {});

    // Compatibilidade legado
    if (!savedData.dmMessages) savedData.dmMessages = {};
    const conversationId = [socket.username, canonicalTo].sort().join('_');
    if (!savedData.dmMessages[conversationId]) savedData.dmMessages[conversationId] = [];
    savedData.dmMessages[conversationId].push(fullMsg);
    saveData();
  });

  socket.on('dm:typing', ({ to }) => {
    // [FIX v6] Apenas via room (sem dupla entrega)
    const typingRoom = 'dm:user:' + (to || '').toLowerCase();
    io.to(typingRoom).emit('dm:typing', { from: socket.username });
  });

  socket.on('dm:read', ({ from }) => {
    const conversationId = [socket.username, from].sort().join('_');
    if (savedData.dmMessages && savedData.dmMessages[conversationId]) {
      savedData.dmMessages[conversationId].forEach(msg => {
        if (msg.to === socket.username) {
          msg.status = 'read';
        }
      });
      saveData();
    }
    emitToUser(from, 'dm:read', { by: socket.username });
  });

  // Carregar histórico de conversa do Neon DB
  socket.on('dm:history', async ({ with: otherUser }) => {
    if (!socket.username || !otherUser) return;
    try {
      const messages = await dbLoadConversationHistory(socket.username, otherUser, 100);
      // Fallback: se DB vazio, usar memória
      if (messages.length === 0 && savedData.dmMessages) {
        const convId = [socket.username, otherUser].sort().join('_');
        const mem = savedData.dmMessages[convId] || [];
        socket.emit('dm:history', { with: otherUser, messages: mem });
      } else {
        socket.emit('dm:history', { with: otherUser, messages });
      }
    } catch (err) {
      const convId = [socket.username, otherUser].sort().join('_');
      const mem = (savedData.dmMessages && savedData.dmMessages[convId]) || [];
      socket.emit('dm:history', { with: otherUser, messages: mem });
    }
  });

  // ==============================
  // DM: LISTAR CONVERSAS (Neon DB)
  // ==============================
  socket.on('dm:list', async () => {
    if (!socket.username) return;
    try {
      const result = await database.query(
        `SELECT DISTINCT
           CASE WHEN from_username = $1 THEN to_username ELSE from_username END AS partner,
           MAX(COALESCE(timestamp, EXTRACT(EPOCH FROM created_at)*1000)) AS last_ts,
           (SELECT text FROM private_messages pm2
            WHERE (pm2.from_username = $1 AND pm2.to_username = CASE WHEN from_username = $1 THEN to_username ELSE from_username END)
               OR (pm2.to_username = $1 AND pm2.from_username = CASE WHEN from_username = $1 THEN to_username ELSE from_username END)
            ORDER BY COALESCE(pm2.timestamp, EXTRACT(EPOCH FROM pm2.created_at)*1000) DESC
            LIMIT 1) AS last_text
         FROM private_messages
         WHERE from_username = $1 OR to_username = $1
         GROUP BY partner
         ORDER BY last_ts DESC
         LIMIT 50`,
        [socket.username]
      );
      socket.emit('dm:list', { partners: result.rows });
    } catch (err) {
      console.error('[DM:LIST] Erro:', err.message);
      socket.emit('dm:list', { partners: [] });
    }
  });

  // DM: buscar perfil de usuário para exibir avatar real na DM
  socket.on('dm:user:profile', async ({ username: targetUser }) => {
    if (!socket.username || !targetUser) return;
    try {
      const result = await database.query(
        'SELECT nick, visual_profile, avatar FROM accounts WHERE LOWER(nick) = LOWER($1)',
        [targetUser]
      );
      if (result.rows.length > 0) {
        socket.emit('dm:user:profile', {
          username: result.rows[0].nick,
          visualProfile: result.rows[0].visual_profile || {},
          avatar: result.rows[0].avatar || null
        });
      }
    } catch (err) {
      socket.emit('dm:user:profile', { username: targetUser, visualProfile: {}, avatar: null });
    }
  });

  // Salvar avatar do usuário no banco de dados
  socket.on('user:avatar:save', async ({ avatar }) => {
    if (!socket.username || !avatar) return;
    try {
      await database.query(
        'UPDATE accounts SET avatar = $1 WHERE LOWER(nick) = LOWER($2)',
        [avatar, socket.username]
      );
      // Notificar amigos online sobre a atualização do avatar em tempo real
      const myFriends = friends[socket.username] || [];
      myFriends.forEach(friend => {
        const uname = typeof friend === 'string' ? friend : (friend.username || '');
        if (uname) emitToUser(uname, 'user:avatar:data', { username: socket.username, avatar });
      });
    } catch (err) {
      console.error('[AVATAR:SAVE] Erro ao salvar avatar:', err.message);
    }
  });

  // Obter avatar de um usuário específico
  socket.on('user:avatar:get', async ({ username: targetUser }) => {
    if (!targetUser) return;
    try {
      const result = await database.query(
        'SELECT nick, avatar FROM accounts WHERE LOWER(nick) = LOWER($1)',
        [targetUser]
      );
      if (result.rows.length > 0) {
        socket.emit('user:avatar:data', {
          username: result.rows[0].nick,
          avatar: result.rows[0].avatar || null
        });
      }
    } catch (err) {
      console.error('[AVATAR:GET] Erro ao buscar avatar:', err.message);
    }
  });

  // Definir/broadcast do próprio avatar (emitido pelo cliente ao conectar)
  socket.on('user:avatar:set', async ({ avatar }) => {
    if (!socket.username || !avatar) return;
    try {
      await database.query(
        'UPDATE accounts SET avatar = $1 WHERE LOWER(nick) = LOWER($2)',
        [avatar, socket.username]
      );
      // Notificar amigos online
      const myFriends = friends[socket.username] || [];
      myFriends.forEach(friend => {
        const uname = typeof friend === 'string' ? friend : (friend.username || '');
        if (uname) emitToUser(uname, 'user:avatar:data', { username: socket.username, avatar });
      });
    } catch (err) {
      console.error('[AVATAR:SET] Erro ao salvar avatar:', err.message);
    }
  });

  // ==============================
  // SISTEMA DE NOTIFICAÇÕES
  // ==============================
  socket.on('notification:send', ({ to, type, data }) => {
    if (!savedData.notifications) savedData.notifications = {};
    if (!savedData.notifications[to]) savedData.notifications[to] = [];
    
    const notification = {
      id: `notif_${Date.now().toString(36)}`,
      type,
      data,
      from: socket.username,
      read: false,
      createdAt: Date.now(),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    
    savedData.notifications[to].unshift(notification);
    saveData();
    
    emitToUser(to, 'notification:new', notification);
  });

  socket.on('notification:mark-read', ({ notificationId }) => {
    if (savedData.notifications && savedData.notifications[socket.username]) {
      const notif = savedData.notifications[socket.username].find(n => n.id === notificationId);
      if (notif) notif.read = true;
      saveData();
    }
  });

  socket.on('notification:mark-all-read', () => {
    if (savedData.notifications && savedData.notifications[socket.username]) {
      savedData.notifications[socket.username].forEach(n => n.read = true);
      saveData();
    }
  });

  socket.on('join', ({ username, channel, communityId }) => {
    // ✅ NÃO ACEITA NOME DO CLIENTE NO JOIN - SÓ USA USUÁRIO JÁ LOGADO
    if (!socket.username || socket.username === 'Usuário' || socket.username.trim() === '') {
      console.warn('⚠ Usuário tentou entrar no canal sem estar logado');
      socket.emit('chat:error', { message: 'Faça login primeiro para acessar o chat' });
      return;
    }
    
    socket.communityId = communityId || null;
    socket.currentChannel = channel;
    const room = roomKey(communityId, channel);

    socket.join(room);
    socket.emit('history', getHistory(communityId, channel));
    
    io.to(room).emit('system', `${socket.username} entrou no canal #${channel}`);
  });

  socket.on('switch-channel', ({ channel, communityId }) => {
    const prevRoom = roomKey(socket.communityId, socket.currentChannel);

    if (socket.currentChannel) {
      socket.leave(prevRoom);
      io.to(prevRoom).emit('system', `${socket.username} saiu do canal`);
    }

    socket.communityId = communityId || socket.communityId;
    socket.currentChannel = channel;
    const room = roomKey(socket.communityId, channel);

    socket.join(room);
    socket.emit('history', getHistory(socket.communityId, channel));
    io.to(room).emit('system', `${socket.username} entrou no canal #${channel}`);
  });

  socket.on('message', ({ channel, text, communityId, visualProfile, username }) => {
    const cid = communityId || socket.communityId;
    const room = roomKey(cid, channel);
    
    // ✅ SOMENTE USUÁRIOS LOGADOS COM PERFIL NA PLATAFORMA PODEM ENVIAR MENSAGENS
    // ✅ NÃO ACEITA NENHUM NOME PASSADO PELO CLIENTE - SOMENTE O USUÁRIO AUTENTICADO NO SOCKET
    const nomeUsuario = socket.username;
    
    // ✅ BLOQUEIO TOTAL SE NÃO ESTIVER LOGADO CORRETAMENTE
    if (!nomeUsuario || nomeUsuario === 'Usuário' || nomeUsuario.trim() === '' || nomeUsuario === socket.id) {
      console.warn('⚠ MENSAGEM BLOQUEADA TOTALMENTE: usuário não autenticado');
      return;
    }

    // ✅ BLOQUEIO DE CASTIGO (mute temporário)
    if (mutedUsers[nomeUsuario] && mutedUsers[nomeUsuario].until > Date.now()) {
      socket.emit('chat:error', { message: '⏱ Você está em castigo e não pode enviar mensagens.' });
      return;
    } else if (mutedUsers[nomeUsuario]) {
      delete mutedUsers[nomeUsuario]; // castigo expirou
    }
    
    const msg = {
      username: nomeUsuario,
      text,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      visualProfile: visualProfile
    };

    pushMessage(cid, channel, msg);
    
    // ✅ Envia confirmação para o remetente primeiro
    socket.emit('message:sent', { success: true, message: msg });
    
    // Envia para os OUTROS usuários na sala
    socket.to(room).emit('message', msg);
    
    // ✅ LIMPAR HISTÓRICO ANTIGO COM NOME "Usuário"
    const historico = getHistory(cid, channel);
    const historicoLimpo = historico.filter(m => {
      const u = String(m.username || '').trim();
      return u !== 'Usuário' && u !== '';
    });
    channels[room] = historicoLimpo;
    saveData();
  });

  socket.on('feed:join', async () => {
    socket.join('global-feed');
    try {
      // ✅ Tenta carregar as postagens mais recentes do Neon
      const result = await database.query(
        `SELECT id, title, body, subreddit, username, time, score, created_at,
                EXTRACT(EPOCH FROM created_at)*1000 AS created_at_ms
         FROM posts ORDER BY created_at DESC LIMIT 50`
      );
      if (result.rows.length > 0) {
        const neonPosts = result.rows.map(r => ({
          id: r.id,
          title: r.title,
          body: r.body,
          subreddit: r.subreddit,
          username: r.username,
          time: r.time,
          score: r.score,
          createdAt: Number(r.created_at_ms),
          votes: {},
          comments: []
        }));
        console.log(`📤 [NEON] Enviando ${neonPosts.length} postagens do banco de dados`);
        socket.emit('feed:history', neonPosts);
        return;
      }
    } catch (err) {
      console.error('❌ [NEON] Erro ao carregar postagens:', err.message);
    }
    // ✅ Fallback: carrega da memória/JSON
    console.log(`📤 [JSON] Enviando ${feedPosts.length} postagens da memória`);
    socket.emit('feed:history', feedPosts.slice(-50).reverse());
  });

  socket.on('feed:post', async ({ title, body, subreddit, username }) => {
    const author = username || socket.username || 'Anônimo';
    const post = {
      id: `post_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      title: String(title || '').trim().slice(0, 200),
      body: String(body || '').trim().slice(0, 2000),
      subreddit: String(subreddit || 'geral').slice(0, 32),
      username: author,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      score: 1,
      votes: {},
      comments: [],
    };
    if (!post.title) return;

    // ✅ Salva na memória e persiste no JSON imediatamente
    feedPosts.push(post);
    if (feedPosts.length > FEED_MAX) feedPosts.shift();
    saveData();

    // ✅ Salva no banco de dados Neon
    try {
      await database.query(
        `INSERT INTO posts (id, title, body, subreddit, username, time, score, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TO_TIMESTAMP($8 / 1000.0))
         ON CONFLICT (id) DO NOTHING`,
        [post.id, post.title, post.body, post.subreddit, post.username, post.time, post.score, post.createdAt]
      );
      console.log('✅ [NEON] Postagem salva:', post.id);
    } catch (err) {
      console.error('❌ [NEON] Erro ao salvar postagem:', err.message);
    }

    // ✅ Envia em tempo real para todos no feed
    io.to('global-feed').emit('feed:new', post);
  });

  socket.on('feed:vote', ({ postId, vote }) => {
    const post = feedPosts.find(p => p.id === postId);
    if (!post) return;
    const uid = socket.id;
    const prev = post.votes[uid] || 0;
    const next = vote === prev ? 0 : vote;
    post.score += next - prev;
    if (next === 0) delete post.votes[uid];
    else post.votes[uid] = next;
    io.to('global-feed').emit('feed:updated', { id: postId, score: post.score });
  });

  socket.on('feed:comment', ({ postId, text, username, parentId }) => {
    const post = feedPosts.find(p => p.id === postId);
    if (!post || !String(text || '').trim()) return;
    const comment = {
      id: `comment_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      username: username || socket.username || 'Anônimo',
      text: String(text).trim().slice(0, 500),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      parentId: parentId || null,
      score: 0,
      votes: {},
      replies: []
    };
    
    if (parentId) {
      // É uma resposta a outro comentário
      function findAndAddComment(comments) {
        for (let c of comments) {
          if (c.id === parentId) {
            c.replies.push(comment);
            return true;
          }
          if (c.replies.length && findAndAddComment(c.replies)) return true;
        }
        return false;
      }
      findAndAddComment(post.comments);
    } else {
      // Comentário principal
      post.comments.push(comment);
    }
    
    io.to('global-feed').emit('feed:commented', { postId, comment });
    io.to(`post:${postId}`).emit('post:commented', { postId, comment });
  });

  socket.on('post:join', ({ postId }) => {
    socket.join(`post:${postId}`);
    const post = feedPosts.find(p => p.id === postId);
    if (post) {
      socket.emit('post:data', post);
    }
  });

  socket.on('post:leave', ({ postId }) => {
    socket.leave(`post:${postId}`);
  });

  socket.on('comment:vote', ({ postId, commentId, vote }) => {
    const post = feedPosts.find(p => p.id === postId);
    if (!post) return;
    
    function findComment(comments) {
      for (let c of comments) {
        if (c.id === commentId) return c;
        if (c.replies.length) {
          const found = findComment(c.replies);
          if (found) return found;
        }
      }
      return null;
    }
    
    const comment = findComment(post.comments);
    if (!comment) return;
    
    const uid = socket.id;
    const prev = comment.votes[uid] || 0;
    const next = vote === prev ? 0 : vote;
    comment.score += next - prev;
    if (next === 0) delete comment.votes[uid];
    else comment.votes[uid] = next;
    
    io.to(`post:${postId}`).emit('comment:updated', { commentId, score: comment.score });
  });

  socket.on('voice:join', ({ channelId, communityId, username }) => {
    const key = communityId ? `${communityId}:${channelId}` : channelId;
    socket.voiceRoom = key;
    socket.voiceUsername = username || socket.username || 'Anônimo';
    if (!voiceRooms[key]) voiceRooms[key] = [];
    const peers = voiceRooms[key].filter(u => u.socketId !== socket.id);
    socket.emit('voice:peers', { peers });
    voiceRooms[key].push({ socketId: socket.id, username: socket.voiceUsername });
    const allUsers = voiceRooms[key];
    io.to(key).emit('voice:room-users', { users: allUsers });
    socket.join(key);
    socket.to(key).emit('voice:user-joined', { socketId: socket.id, username: socket.voiceUsername });
  });

  socket.on('voice:leave', ({ channelId, communityId }) => {
    const key = socket.voiceRoom;
    if (!key) return;
    if (voiceRooms[key]) {
      voiceRooms[key] = voiceRooms[key].filter(u => u.socketId !== socket.id);
      if (voiceRooms[key].length === 0) delete voiceRooms[key];
    }
    socket.to(key).emit('voice:user-left', { socketId: socket.id });
    io.to(key).emit('voice:room-users', { users: voiceRooms[key] || [] });
    socket.leave(key);
    socket.voiceRoom = null;
  });

  socket.on('voice:offer', ({ to, offer }) => {
    io.to(to).emit('voice:offer', { from: socket.id, offer, username: socket.voiceUsername });
  });

  socket.on('voice:answer', ({ to, answer }) => {
    io.to(to).emit('voice:answer', { from: socket.id, answer });
  });

  socket.on('voice:ice', ({ to, candidate }) => {
    io.to(to).emit('voice:ice', { from: socket.id, candidate });
  });

  // ==============================
  // SISTEMA DE CHAMADAS DM (WebRTC via username)
  // ==============================

  // ── Chamadas de voz/DM: delivery por UUID (primário) + username (fallback) ──
  // data.toId = UUID do destinatário (vindo do cliente)
  // data.to   = username (fallback legado)
  function _voiceEmit(toId, toUsername, event, payload) {
    const _sid = toId ? onlineUserIds.get(String(toId)) : null;
    if (_sid) {
      io.to(_sid).emit(event, payload);
      console.log(`[VOICE] ✅ ${event} entregue por UUID ${toId} → socket ${_sid}`);
    } else {
      const _fb = emitToUser(toUsername, event, payload);
      console.log(`[VOICE] ${_fb ? '⚠ fallback username' : '✖ offline'} ${event} → "${toUsername}"`);
    }
  }

  // Iniciar chamada
  socket.on('dm:call:start', (data) => {
    if (!socket.username || !data.to) return;
    const from = socket.username;
    const to   = data.to;
    console.log(`[DM:CALL:START] ${from} → ${to} (toId=${data.toId})`);
    _voiceEmit(data.toId, to, 'dm:call:incoming', { from, fromId: socket.userId, type: data.type || 'voice' });
  });

  // Encerrar chamada
  socket.on('dm:call:end', (data) => {
    if (!socket.username || !data.to) return;
    const from = socket.username;
    const to   = data.to;
    console.log(`[DM:CALL:END] ${from} → ${to} (toId=${data.toId})`);
    _voiceEmit(data.toId, to, 'dm:call:ended', { from, fromId: socket.userId });
  });

  // Aceitar chamada recebida
  socket.on('dm:call:accept', (data) => {
    if (!socket.username || !data.to) return;
    console.log(`[DM:CALL:ACCEPT] ${socket.username} → ${data.to} (toId=${data.toId})`);
    _voiceEmit(data.toId, data.to, 'dm:call:accepted', { from: socket.username, fromId: socket.userId });
  });

  // Rejeitar chamada recebida
  socket.on('dm:call:reject', (data) => {
    if (!socket.username || !data.to) return;
    console.log(`[DM:CALL:REJECT] ${socket.username} → ${data.to} (toId=${data.toId})`);
    _voiceEmit(data.toId, data.to, 'dm:call:rejected', { from: socket.username, fromId: socket.userId });
  });

  // WebRTC offer
  socket.on('dm:voice:offer', (data) => {
    if (!socket.username || !data.to) return;
    console.log(`[DM:VOICE:OFFER] ${socket.username} → ${data.to} (toId=${data.toId})`);
    _voiceEmit(data.toId, data.to, 'dm:voice:offer', { from: socket.username, fromId: socket.userId, offer: data.offer });
  });

  // WebRTC answer
  socket.on('dm:voice:answer', (data) => {
    if (!socket.username || !data.to) return;
    console.log(`[DM:VOICE:ANSWER] ${socket.username} → ${data.to} (toId=${data.toId})`);
    _voiceEmit(data.toId, data.to, 'dm:voice:answer', { from: socket.username, fromId: socket.userId, answer: data.answer });
  });

  // ICE candidates
  socket.on('dm:voice:ice', (data) => {
    if (!socket.username || !data.to) return;
    _voiceEmit(data.toId, data.to, 'dm:voice:ice', { from: socket.username, fromId: socket.userId, candidate: data.candidate });
  });

  // ==============================
  // SISTEMA DE DIÁRIO
  // ==============================
  socket.on('diary:save', ({ entry }) => {
    if (!socket.username) return;
    
    if (!diaryEntries[socket.username]) {
      diaryEntries[socket.username] = [];
    }

    const existingIndex = diaryEntries[socket.username].findIndex(e => e.id === entry.id);
    
    if (existingIndex >= 0) {
      // Atualizar entrada existente
      entry.updatedAt = Date.now();
      diaryEntries[socket.username][existingIndex] = entry;
    } else {
      // Nova entrada
      entry.id = `diary_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      entry.userId = socket.username;
      entry.createdAt = Date.now();
      entry.updatedAt = Date.now();
      diaryEntries[socket.username].push(entry);
    }

    saveData();
    socket.emit('diary:saved', { entry });
  });

  socket.on('diary:delete', ({ entryId }) => {
    if (!socket.username || !diaryEntries[socket.username]) return;
    
    diaryEntries[socket.username] = diaryEntries[socket.username].filter(e => e.id !== entryId);
    saveData();
    socket.emit('diary:deleted', { entryId });
  });

  // ==============================
  // SISTEMA DE SHORTS / REELS
  // ==============================
  socket.on('short:create', async (shortData) => {
    const short = {
      id: `short_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      title: String(shortData.title || '').trim().slice(0, 100),
      description: String(shortData.description || '').trim().slice(0, 500),
      tags: String(shortData.tags || '').trim().slice(0, 150),
      fileType: String(shortData.fileType || ''),
      fileUrl: String(shortData.fileUrl || ''),
      username: socket.username || shortData.username || 'Anônimo',
      timestamp: shortData.timestamp || Date.now(),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    if (!short.title || !short.fileUrl) return;

    // ✅ Salva na memória e no arquivo JSON
    shorts.push(short);
    if (shorts.length > SHORTS_MAX) shorts.shift();
    saveData();

    // ✅ Salva no banco de dados Neon
    try {
      await database.query(
        `INSERT INTO reels (id, title, description, tags, file_type, file_url, username, time, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
        [short.id, short.title, short.description, short.tags, short.fileType, short.fileUrl, short.username, short.time, short.timestamp]
      );
      console.log('✅ Short salvo no Neon:', short.id);
    } catch (err) {
      console.error('❌ Erro ao salvar short no Neon:', err.message);
    }

    // ✅ Envia em tempo real para TODOS os usuários conectados
    io.emit('short:new', short);
  });

  socket.on('short:delete', async ({ shortId }) => {
    const shortIndex = shorts.findIndex(s => s.id === shortId);
    if (shortIndex === -1) return;

    const short = shorts[shortIndex];
    
    // Apenas o autor pode deletar
    if (short.username !== socket.username) {
      socket.emit('short:error', { message: 'Você não tem permissão para deletar este Short' });
      return;
    }

    shorts.splice(shortIndex, 1);
    saveData();

    // ✅ Remove do banco de dados Neon
    try {
      await database.query('DELETE FROM reels WHERE id = $1', [shortId]);
      console.log('✅ Short removido do Neon:', shortId);
    } catch (err) {
      console.error('❌ Erro ao remover short do Neon:', err.message);
    }

    // Avisar TODOS os usuários para remover o Short
    io.emit('short:removed', { shortId });
  });

  // ==============================================
  // ✅ SISTEMA DE COMUNIDADES SUGERIDAS GLOBAL
  // ==============================================
  
  // Enviar lista de sugeridas quando o usuário conectar
  socket.emit('suggested:communities', suggestedCommunities);

  // Quando alguém adicionar uma comunidade às sugeridas
  socket.on('community:add-suggested', (community) => {
    // Qualquer usuário logado pode sugerir suas próprias comunidades
    if (!socket.username) {
      socket.emit('suggested:error', { message: 'Faça login para sugerir comunidades.' });
      return;
    }

    // Verificar se já existe
    const exists = suggestedCommunities.find(c => c.id === community.id);
    if (exists) {
      socket.emit('suggested:exists', { community });
      return;
    }

    // Adicionar na lista global
    community.addedBy = socket.username;
    community.addedAt = Date.now();
    suggestedCommunities.push(community);
    
    // Salvar no arquivo
    savedData.suggestedCommunities = suggestedCommunities;
    saveData();

    // Enviar para TODOS os usuários conectados
    io.emit('suggested:new', community);
  });

  // Remover comunidade das sugeridas
  socket.on('community:unsuggest', ({ communityId }) => {
    const index = suggestedCommunities.findIndex(c => c.id === communityId);
    if (index === -1) return;

    suggestedCommunities.splice(index, 1);
    savedData.suggestedCommunities = suggestedCommunities;
    saveData();

    // Avisar todos para remover
    io.emit('suggested:removed', { communityId });
  });

  // ==============================================
  // ✅ SISTEMA DE APROVAÇÃO DE COMUNIDADES
  // ==============================================

  // Usuário envia comunidade para aprovação
  socket.on('community:submit', (community) => {
    // Verificar se já foi enviada
    const exists = communityRequests.find(c => c.id === community.id);
    if (exists) {
      socket.emit('community:already-submitted', { community });
      return;
    }

    // Adicionar na fila de aprovação
    const request = {
      ...community,
      submittedBy: socket.username,
      submittedAt: Date.now(),
      status: 'pending'
    };

    communityRequests.push(request);
    savedData.communityRequests = communityRequests;
    saveData();

    // ✅ ENVIAR NOTIFICAÇÃO PARA TODOS OS STAFFS (online e offline)
    if (!savedData.notifications) savedData.notifications = {};
    staffUsers.forEach(staffUsername => {
      // Salvar notificação persistente (offline também recebe ao reconectar)
      if (!savedData.notifications[staffUsername]) savedData.notifications[staffUsername] = [];
      const notif = {
        id: `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,5)}`,
        type: 'community_request',
        title: 'Nova comunidade para aprovar',
        message: `${socket.username} enviou a comunidade "${community.name}" para análise`,
        communityId: community.id,
        communityName: community.name,
        submittedBy: socket.username,
        read: false,
        createdAt: Date.now()
      };
      savedData.notifications[staffUsername].unshift(notif);

      // Emitir em tempo real para staff online
      emitToUser(staffUsername, 'community:new-request', request);
      emitToUser(staffUsername, 'notification:new', notif);
    });
    saveData();

    socket.emit('community:submitted', { success: true, community });
  });

  // Staff aprova comunidade
  socket.on('community:approve', ({ communityId }) => {
    // Verificar se é staff
    if (!staffUsers.includes(socket.username)) {
      socket.emit('community:permission-denied');
      return;
    }

    const requestIndex = communityRequests.findIndex(c => c.id === communityId);
    if (requestIndex === -1) return;

    const community = communityRequests[requestIndex];
    community.status = 'approved';
    community.approvedBy = socket.username;
    community.approvedAt = Date.now();

    // Adicionar nas comunidades sugeridas GLOBAIS
    suggestedCommunities.push(community);
    
    // Remover da fila de aprovação
    communityRequests.splice(requestIndex, 1);
    
    savedData.communityRequests = communityRequests;
    savedData.suggestedCommunities = suggestedCommunities;
    saveData();

    // ✅ ENVIAR PARA TODOS OS USUÁRIOS CONECTADOS
    io.emit('suggested:new', community);
    io.emit('community:approved', community);

    // Notificar o autor
    emitToUser(community.submittedBy, 'community:approved-notification', community);
  });

  // Staff rejeita comunidade
  socket.on('community:reject', ({ communityId, reason }) => {
    // Verificar se é staff
    if (!staffUsers.includes(socket.username)) {
      socket.emit('community:permission-denied');
      return;
    }

    const requestIndex = communityRequests.findIndex(c => c.id === communityId);
    if (requestIndex === -1) return;

    const community = communityRequests[requestIndex];
    communityRequests.splice(requestIndex, 1);
    
    savedData.communityRequests = communityRequests;
    saveData();

    // Notificar o autor
    emitToUser(community.submittedBy, 'community:rejected', { community, reason });
  });

  // Enviar lista de pendentes para staffs quando conectarem
  if (staffUsers.includes(socket.username)) {
    socket.emit('community:pending-requests', communityRequests);
  }

  // ==============================================
  // ✅ SISTEMA DE GERENCIAMENTO DE STAFFS
  // ==============================================

  // Enviar lista de staffs ao dev quando ele conecta
  if (DEV_EMAILS.includes(socket.email || '')) {
    socket.emit('staff:list', staffUsers.filter(u => !DEV_EMAILS.includes(u)));
  }

  // Dev busca usuário para adicionar como staff
  socket.on('staff:search', async ({ query }) => {
    if (!DEV_EMAILS.includes(socket.email || '')) {
      socket.emit('staff:error', 'Sem permissão.');
      return;
    }
    if (!query || query.trim().length < 2) {
      socket.emit('staff:search-result', null);
      return;
    }
    const clean = query.trim().replace(/^@/, '');
    try {
      const db = require('./database');
      const res = await db.query(
        'SELECT id, nick FROM accounts WHERE LOWER(nick) = LOWER() OR id = ',
        [clean, clean]
      );
      if (res.rows.length === 0) {
        socket.emit('staff:search-result', null);
      } else {
        const user = res.rows[0];
        socket.emit('staff:search-result', {
          id: user.id,
          nick: user.nick,
          isStaff: staffUsers.includes(user.nick),
          isDev: DEV_EMAILS.includes(socket.email || '')
        });
      }
    } catch(e) {
      socket.emit('staff:search-result', null);
    }
  });

  // Dev adiciona usuário como staff
  socket.on('staff:add', ({ username }) => {
    if (!DEV_EMAILS.includes(socket.email || '')) {
      socket.emit('staff:error', 'Sem permissão.');
      return;
    }
    if (!username || username.trim() === '') {
      socket.emit('staff:error', 'Usuário inválido.');
      return;
    }
    const nick = username.trim();
    if (staffUsers.includes(nick)) {
      socket.emit('staff:error', 'Este usuário já é staff.');
      return;
    }
    staffUsers.push(nick);
    savedData.staffList = [...staffUsers];
    saveData();
    socket.emit('staff:list', staffUsers.filter(u => !DEV_EMAILS.includes(u)));
    socket.emit('staff:added', { nick });
    // Notificar o usuário promovido se estiver online
    emitToUser(nick, 'staff:promoted', { promotedBy: socket.username });
  });

  // Dev remove usuário do staff
  socket.on('staff:remove', ({ username }) => {
    if (!DEV_EMAILS.includes(socket.email || '')) {
      socket.emit('staff:error', 'Sem permissão.');
      return;
    }
    const nick = username.trim();
    if (DEV_EMAILS.includes(socket.email || '')) {
      socket.emit('staff:error', 'Não é possível remover um desenvolvedor.');
      return;
    }
    const idx = staffUsers.indexOf(nick);
    if (idx === -1) {
      socket.emit('staff:error', 'Este usuário não é staff.');
      return;
    }
    staffUsers.splice(idx, 1);
    savedData.staffList = [...staffUsers];
    saveData();
    socket.emit('staff:list', staffUsers.filter(u => !DEV_EMAILS.includes(u)));
    socket.emit('staff:removed', { nick });
    // Notificar o usuário removido se estiver online
    emitToUser(nick, 'staff:demoted', { demotedBy: socket.username });
  });

  // Dev pede lista atual de staffs
  socket.on('staff:get-list', () => {
    if (!DEV_EMAILS.includes(socket.email || '')) return;
    socket.emit('staff:list', staffUsers.filter(u => !DEV_EMAILS.includes(u)));
  });

  // ============================================================
  // ✅ SISTEMA DE MODERAÇÃO - BAN / KICK / CASTIGO
  // ============================================================

  // ============================================================
  // ✅ SISTEMA DE PERMISSÕES POR SERVIDOR
  // Verifica cargos armazenados no servidor (ownerId + members[].role)
  // ============================================================

  // Função helper: verifica se o usuário tem permissão em um servidor específico
  function hasServerPerm(serverData, username, permission) {
    if (!serverData || !username) return false;
    if (serverData.ownerId === username) return true; // Dono tem tudo
    const member = (serverData.members || []).find(m => m.username === username);
    if (!member) return false;
    const perms = {
      ADMIN:    ['MANAGE_SERVER','MANAGE_CHANNELS','MANAGE_CATEGORIES','MANAGE_ROLES','MANAGE_MEMBERS',
                 'KICK_MEMBERS','BAN_MEMBERS','MUTE_MEMBERS','MODERATE_MESSAGES','CREATE_CHANNELS',
                 'CREATE_CATEGORIES','CREATE_EVENTS'],
      STAFF:    ['MODERATE_MESSAGES','KICK_MEMBERS','MUTE_MEMBERS','CREATE_CHANNELS','CREATE_CATEGORIES','CREATE_EVENTS'],
      MODERADOR:['MODERATE_MESSAGES','MUTE_MEMBERS'],
      MEMBRO:   []
    };
    return (perms[member.role] || []).includes(permission);
  }

  // Verificar permissão de servidor (chamado pelo frontend para validação)
  socket.on('server:check-permission', ({ serverId, permission }) => {
    if (!socket.username) return socket.emit('server:permission-result', { allowed: false });
    const serverData = savedData.serverPermissions?.[serverId];
    if (!serverData) return socket.emit('server:permission-result', { allowed: true }); // sem dados = sem restrição (compatibilidade)
    const allowed = hasServerPerm(serverData, socket.username, permission);
    socket.emit('server:permission-result', { allowed, serverId, permission });
  });

  // Salvar dados de permissão de um servidor (ownerId + members)
  socket.on('server:save-permissions', ({ serverId, ownerId, members }) => {
    if (!socket.username || !serverId) return;
    if (!savedData.serverPermissions) savedData.serverPermissions = {};
    const existing = savedData.serverPermissions[serverId];
    // Apenas o dono pode atualizar as permissões
    if (existing && existing.ownerId !== socket.username) {
      socket.emit('server:permissions-error', 'Apenas o Dono pode atualizar permissões.');
      return;
    }
    savedData.serverPermissions[serverId] = { ownerId, members: members || [], updatedAt: Date.now() };
    saveData();
    socket.emit('server:permissions-saved', { serverId });
  });

  // Obter cargo do usuário atual em um servidor
  socket.on('server:get-my-role', ({ serverId }) => {
    if (!socket.username || !serverId) return;
    const serverData = savedData.serverPermissions?.[serverId];
    let role = 'MEMBRO';
    if (serverData) {
      if (serverData.ownerId === socket.username) {
        role = 'OWNER';
      } else {
        const member = (serverData.members || []).find(m => m.username === socket.username);
        if (member) role = member.role;
      }
    }
    socket.emit('server:my-role', { serverId, role });
  });

  socket.on('member:ban', ({ target, reason, serverId }) => {
    if (!socket.username) return;
    // Verificar permissão: staff global OU cargo no servidor específico
    const serverData = serverId ? savedData.serverPermissions?.[serverId] : null;
    const hasServerBanPerm = serverData ? hasServerPerm(serverData, socket.username, 'BAN_MEMBERS') : false;
    const isAuth = staffUsers.includes(socket.username) || DEV_EMAILS.includes(socket.email || '') || hasServerBanPerm;
    if (!isAuth) { socket.emit('moderation:error', 'Sem permissão para banir membros.'); return; }
    if (!target || target === socket.username) return;

    bannedUsers.add(target);
    saveData();

    // Desconectar TODOS os sockets do alvo (suporta múltiplas abas)
    emitToUser(target, 'member:banned', { target, reason: reason || 'Sem motivo informado' });
    if (onlineUsers[target]) {
      onlineUsers[target].forEach(sid => {
        const sock = io.sockets.sockets.get(sid);
        if (sock) setTimeout(() => sock.disconnect(true), 1500);
      });
    }

    // Notificar sala
    const room = roomKey(socket.communityId, socket.currentChannel);
    io.to(room).emit('system', `🚫 ${target} foi banido do servidor por ${socket.username}.`);

    socket.emit('moderation:success', { action: 'ban', target });
    console.log(`[MODERAÇÃO] ${socket.username} baniu ${target}`);
  });

  socket.on('member:kick', ({ target, serverId }) => {
    if (!socket.username) return;
    const serverData2 = serverId ? savedData.serverPermissions?.[serverId] : null;
    const hasKickPerm = serverData2 ? hasServerPerm(serverData2, socket.username, 'KICK_MEMBERS') : false;
    const isAuth = staffUsers.includes(socket.username) || DEV_EMAILS.includes(socket.email || '') || hasKickPerm;
    if (!isAuth) { socket.emit('moderation:error', 'Sem permissão para expulsar membros.'); return; }
    if (!target || target === socket.username) return;

    // Desconectar TODOS os sockets do alvo (suporta múltiplas abas)
    emitToUser(target, 'member:kicked', { target });
    if (onlineUsers[target]) {
      onlineUsers[target].forEach(sid => {
        const sock = io.sockets.sockets.get(sid);
        if (sock) setTimeout(() => sock.disconnect(true), 1500);
      });
    }

    const room = roomKey(socket.communityId, socket.currentChannel);
    io.to(room).emit('system', `🚪 ${target} foi expulso do servidor por ${socket.username}.`);

    socket.emit('moderation:success', { action: 'kick', target });
    console.log(`[MODERAÇÃO] ${socket.username} expulsou ${target}`);
  });

  socket.on('member:punish', ({ target, minutes, serverId }) => {
    if (!socket.username) return;
    const serverData3 = serverId ? savedData.serverPermissions?.[serverId] : null;
    const hasMutePerm = serverData3 ? hasServerPerm(serverData3, socket.username, 'MUTE_MEMBERS') : false;
    const isAuth = staffUsers.includes(socket.username) || DEV_EMAILS.includes(socket.email || '') || hasMutePerm;
    if (!isAuth) { socket.emit('moderation:error', 'Sem permissão para castigar membros.'); return; }
    if (!target || target === socket.username) return;

    const mins = Math.max(1, Math.min(parseInt(minutes) || 5, 10080)); // máx 7 dias
    mutedUsers[target] = { until: Date.now() + mins * 60000, by: socket.username };

    emitToUser(target, 'member:punished', { target, minutes: mins, by: socket.username });

    const room = roomKey(socket.communityId, socket.currentChannel);
    io.to(room).emit('system', `⏱ ${target} foi castigado por ${mins} minuto(s) por ${socket.username}.`);

    socket.emit('moderation:success', { action: 'punish', target, minutes: mins });
    console.log(`[MODERAÇÃO] ${socket.username} castigou ${target} por ${mins} minuto(s)`);
  });

  socket.on('member:unban', ({ target }) => {
    if (!socket.username) return;
    const isAuth = staffUsers.includes(socket.username) || DEV_EMAILS.includes(socket.email || '');
    if (!isAuth) { socket.emit('moderation:error', 'Sem permissão.'); return; }
    bannedUsers.delete(target);
    saveData();
    socket.emit('moderation:success', { action: 'unban', target });
  });

  socket.on('member:set-nickname', ({ target, nickname }) => {
    emitToUser(target, 'member:nickname-changed', { nickname });
  });

  socket.on('server:leave', ({ serverId }) => {
    if (socket.currentChannel) {
      const room = roomKey(socket.communityId, socket.currentChannel);
      socket.leave(room);
      io.to(room).emit('system', `${socket.username} saiu do servidor.`);
    }
  });

  socket.on('disconnect', () => {
    if (socket.voiceRoom) {
      const key = socket.voiceRoom;
      if (voiceRooms[key]) {
        voiceRooms[key] = voiceRooms[key].filter(u => u.socketId !== socket.id);
        if (voiceRooms[key].length === 0) delete voiceRooms[key];
      }
      socket.to(key).emit('voice:user-left', { socketId: socket.id });
      io.to(key).emit('voice:room-users', { users: voiceRooms[key] || [] });
    }
    if (socket.username && socket.currentChannel) {
      const room = roomKey(socket.communityId, socket.currentChannel);
      io.to(room).emit('system', `${socket.username} saiu do servidor`);
    }
    if (socket.username) {
      // Remove apenas ESTE socket — usuário permanece online se tiver outras abas abertas
      removeOnlineUser(socket.username, socket.id);
      // Remove userId do mapa ao desconectar
      if (socket.userId) {
        onlineUserIds.delete(String(socket.userId));
        console.log(`[DISCONNECT] userId=${socket.userId} removido de onlineUserIds`);
        console.log('[ONLINE USERS]', [...onlineUserIds.entries()]);
      }
      // Só remove userServers quando realmente ficou offline (sem nenhum socket restante)
      if (!isUserOnline(socket.username)) {
        delete userServers[socket.username];
        delete userStatuses[socket.username];
        // Marcar offline no Neon
        dbUpsertPresence(socket.username, 'offline').catch(() => {});
      }
      broadcastPresence();
    }
    // [DM-RT FIX] Ao desconectar, Socket.IO remove automaticamente o socket das rooms
    // O room 'dm:user:<username>' ficará vazio até o próximo user:login
    if (socket.username) {
      console.log(`[DM-RT] Usuário "${socket.username}" saiu da room dm:user:${socket.username.toLowerCase()}`);
    }
    console.log(`Usuário desconectado: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3002;

server.on('error', (err) => {
  console.error('[ERRO FATAL] Servidor nao iniciou:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error('Porta ' + PORT + ' ja esta em uso! Feche outra instancia do app.');
  }
  if (process.send) process.send({ error: err.message });
});

// ── Catch-all: rotas desconhecidas → auth.html (SPA fallback) ─── catch-all auth fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

// [FIX v6] Rodar migrations ANTES de server.listen()
// Antes: migrations rodavam em background pós-listen → tabela private_messages podia
// não existir quando o primeiro DM chegasse → dbSavePrivateMessage falhava silenciosamente
// e o histórico não era persistido. Agora o servidor só fica pronto APÓS as tabelas existirem.
(async () => {
  try {
    console.log('🔧 [INIT] Iniciando configuração do banco de dados (pré-listen)...');
    await initFriendRequestsTable();
    console.log('✅ [INIT] friend_requests OK');
    await initFriendshipsTable();
    console.log('✅ [INIT] friendships OK');
    await initPresenceTable();
    console.log('✅ [INIT] user_presence OK');
    await migrations.runMigration();
    console.log('✅ [INIT] Migrations concluídas.');
  } catch (err) {
    console.error('❌ [INIT] Erro nas migrations (servidor continuará, mas pode ter problemas):', err.message);
  }

  server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    // Reporta ao processo pai (Electron) que o servidor está pronto
    if (process.send) process.send('ready');
  });
})();

async function initFriendshipsTable() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        user_a     TEXT        NOT NULL,
        user_b     TEXT        NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_a, user_b)
      )
    `);
    console.log('✅ [DB] Tabela friendships pronta');
  } catch (err) {
    console.error('❌ [DB] Erro ao criar tabela friendships:', err.message);
  }
}

async function dbSaveFriendship(userA, userB) {
  // Garante que a dupla (A,B) E (B,A) existam — relação bidirecional
  try {
    const [lo, hi] = userA.toLowerCase() < userB.toLowerCase() ? [userA, userB] : [userB, userA];
    await database.query(
      `INSERT INTO friendships (user_a, user_b) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [lo, hi]
    );
    console.log(`✅ [DB] Amizade salva no Neon: "${userA}" ↔ "${userB}"`);
  } catch (err) {
    console.error(`❌ [DB] Erro ao salvar amizade: ${err.message}`);
  }
}

async function dbRemoveFriendship(userA, userB) {
  try {
    const [lo, hi] = userA.toLowerCase() < userB.toLowerCase() ? [userA, userB] : [userB, userA];
    await database.query(
      `DELETE FROM friendships WHERE user_a = $1 AND user_b = $2`,
      [lo, hi]
    );
    console.log(`✅ [DB] Amizade removida do Neon: "${userA}" ↔ "${userB}"`);
  } catch (err) {
    console.error(`❌ [DB] Erro ao remover amizade: ${err.message}`);
  }
}

async function dbLoadFriends(username) {
  try {
    const res = await database.query(
      `SELECT user_a, user_b FROM friendships
       WHERE LOWER(user_a) = LOWER($1) OR LOWER(user_b) = LOWER($1)`,
      [username]
    );
    const list = res.rows.map(r =>
      r.user_a.toLowerCase() === username.toLowerCase() ? r.user_b : r.user_a
    );
    console.log(`📥 [DB] Amigos de "${username}" no Neon (${list.length}):`, list);
    return list;
  } catch (err) {
    console.error(`❌ [DB] Erro ao carregar amigos de "${username}": ${err.message}`);
    return null; // null = usar fallback JSON
  }
}

async function initFriendRequestsTable() {
  try {
    // ── Diagnóstico: listar colunas atuais da tabela (se existir) ──────────
    const colCheck = await database.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'friend_requests'
      ORDER BY ordinal_position
    `);

    if (colCheck.rows.length > 0) {
      console.log('🔍 [DB] friend_requests — colunas atuais:',
        colCheck.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));

      const hasFromUser = colCheck.rows.some(r => r.column_name === 'from_user');
      const hasToUser   = colCheck.rows.some(r => r.column_name === 'to_user');

      if (!hasFromUser || !hasToUser) {
        // ── Schema errado (e.g. from_user_id INTEGER do migrations.js) ──
        // Dropar e recriar com schema correto (tabela estava vazia de registros válidos)
        console.warn('⚠ [DB] Schema inválido — recriando tabela friend_requests com colunas TEXT corretas...');
        await database.query('DROP TABLE IF EXISTS friend_requests');
        console.log('🗑 [DB] Tabela friend_requests removida');
      } else {
        console.log('✅ [DB] friend_requests já tem colunas corretas (from_user, to_user)');
        // Garantir constraint UNIQUE (pode estar faltando em versões antigas)
        await database.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints
              WHERE table_name = 'friend_requests'
                AND constraint_type = 'UNIQUE'
                AND constraint_name = 'friend_requests_from_user_to_user_key'
            ) THEN
              ALTER TABLE friend_requests ADD CONSTRAINT friend_requests_from_user_to_user_key UNIQUE (from_user, to_user);
            END IF;
          END$$;
        `).catch(() => {});
        return;
      }
    } else {
      console.log('ℹ [DB] Tabela friend_requests não existe — será criada');
    }

    // ── Criar tabela com schema correto ────────────────────────────────────
    await database.query(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id          SERIAL       PRIMARY KEY,
        from_user   TEXT         NOT NULL,
        to_user     TEXT         NOT NULL,
        status      TEXT         NOT NULL DEFAULT 'pending',
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE (from_user, to_user)
      )
    `);
    console.log('✅ [DB] Tabela friend_requests criada com schema correto no Neon');
  } catch (err) {
    console.error('❌ [DB] Erro ao inicializar tabela friend_requests:', err.message);
  }
}

// Salva ou atualiza uma solicitação de amizade no Neon
async function dbSaveFriendRequest(fromUser, toUser) {
  try {
    // INSERT ... ON CONFLICT evita race conditions e não depende de updated_at
    await database.query(
      `INSERT INTO friend_requests (from_user, to_user, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (from_user, to_user)
       DO UPDATE SET status = 'pending'`,
      [fromUser, toUser]
    );
    console.log(`✅ [DB] Solicitação salva no Neon: "${fromUser}" → "${toUser}"`);
  } catch (err) {
    console.error(`❌ [DB] FALHA ao salvar solicitação "${fromUser}" → "${toUser}":`, err.message);
    // Fallback: se a constraint UNIQUE não existir, tenta INSERT simples ignorando duplicata
    try {
      await database.query(
        `INSERT INTO friend_requests (from_user, to_user, status) VALUES ($1, $2, 'pending')`,
        [fromUser, toUser]
      ).catch(() => {});
    } catch (_) {}
  }
}

// Carrega solicitações RECEBIDAS pelo usuário (to_user) pendentes
async function dbLoadReceivedRequests(toUser) {
  try {
    const res = await database.query(
      `SELECT from_user FROM friend_requests
       WHERE LOWER(to_user) = LOWER($1) AND status = 'pending'
       ORDER BY created_at DESC`,
      [toUser]
    );
    const list = res.rows.map(r => r.from_user);
    console.log(`📥 [DB] Solicitações recebidas por "${toUser}" (${list.length}):`, list);
    return list;
  } catch (err) {
    console.error(`❌ [DB] Erro ao carregar solicitações recebidas para "${toUser}":`, err.message);
    console.error(`❌ [DB] Dica: tabela friend_requests pode ter schema incorreto (colunas INTEGER em vez de TEXT)`);
    return null; // null = usar fallback do arquivo JSON
  }
}

// Carrega solicitações ENVIADAS pelo usuário (from_user) pendentes
async function dbLoadSentRequests(fromUser) {
  try {
    const res = await database.query(
      `SELECT to_user FROM friend_requests
       WHERE LOWER(from_user) = LOWER($1) AND status = 'pending'
       ORDER BY created_at DESC`,
      [fromUser]
    );
    const list = res.rows.map(r => r.to_user);
    console.log(`📤 [DB] Solicitações enviadas por "${fromUser}" (${list.length}):`, list);
    return list;
  } catch (err) {
    console.error(`❌ [DB] Erro ao carregar solicitações enviadas de "${fromUser}":`, err.message);
    return null;
  }
}

// Atualiza status de uma solicitação (accepted | rejected | cancelled)
async function dbUpdateFriendRequestStatus(fromUser, toUser, status) {
  try {
    await database.query(
      `UPDATE friend_requests SET status = $3, updated_at = NOW()
       WHERE LOWER(from_user) = LOWER($1) AND LOWER(to_user) = LOWER($2)`,
      [fromUser, toUser, status]
    );
    console.log(`🔄 [DB] Status atualizado: "${fromUser}" → "${toUser}" = ${status}`);
  } catch (err) {
    console.error(`❌ [DB] Erro ao atualizar status da solicitação:`, err.message);
  }
}

function roomKey(communityId, channel) {
  return communityId ? `${communityId}:${channel}` : channel;
}

function getHistory(communityId, channel) {
  const key = roomKey(communityId, channel);
  if (!channels[key]) channels[key] = [];
  return channels[key];
}

function pushMessage(communityId, channel, msg) {
  const history = getHistory(communityId, channel);
  history.push(msg);
  if (history.length > 100) history.shift();
}

function renameUserData(oldNick, newNick) {
  if (!oldNick || !newNick || oldNick === newNick) return;

  if (friendRequests[oldNick]) {
    friendRequests[newNick] = friendRequests[oldNick];
    delete friendRequests[oldNick];
  }
  if (friends[oldNick]) {
    friends[newNick] = friends[oldNick];
    delete friends[oldNick];
  }
  if (diaryEntries[oldNick]) {
    diaryEntries[newNick] = diaryEntries[oldNick];
    delete diaryEntries[oldNick];
  }
  if (userCommunities[oldNick]) {
    userCommunities[newNick] = userCommunities[oldNick];
    delete userCommunities[oldNick];
  }

  Object.keys(friendRequests).forEach((user) => {
    friendRequests[user] = (friendRequests[user] || []).map((name) => (name === oldNick ? newNick : name));
  });
  Object.keys(friends).forEach((user) => {
    friends[user] = (friends[user] || []).map((name) => (name === oldNick ? newNick : name));
  });

  if (savedData.dmMessages) {
    Object.keys(savedData.dmMessages).forEach((conversationId) => {
      if (conversationId.includes(oldNick)) {
        const messages = savedData.dmMessages[conversationId];
        const newConversationId = conversationId.replace(oldNick, newNick);
        savedData.dmMessages[newConversationId] = messages.map((msg) => ({
          ...msg,
          from: msg.from === oldNick ? newNick : msg.from,
          to: msg.to === oldNick ? newNick : msg.to,
        }));
        delete savedData.dmMessages[conversationId];
      } else {
        savedData.dmMessages[conversationId] = savedData.dmMessages[conversationId].map((msg) => ({
          ...msg,
          from: msg.from === oldNick ? newNick : msg.from,
          to: msg.to === oldNick ? newNick : msg.to,
        }));
      }
    });
  }

  if (savedData.notifications && savedData.notifications[oldNick]) {
    savedData.notifications[newNick] = savedData.notifications[oldNick];
    delete savedData.notifications[oldNick];
  }

  feedPosts.forEach((post) => {
    if (post.username === oldNick) post.username = newNick;
  });
  shorts.forEach((short) => {
    if (short.username === oldNick) short.username = newNick;
  });

  if (onlineUsers[oldNick]) {
    onlineUsers[newNick] = onlineUsers[oldNick]; // transfere o Set inteiro
    delete onlineUsers[oldNick];
  }

  saveData();
}

function purgeUserData(nick) {
  if (!nick) return;

  delete friendRequests[nick];
  delete friends[nick];
  delete diaryEntries[nick];
  delete userCommunities[nick];
  delete onlineUsers[nick];

  Object.keys(friendRequests).forEach((user) => {
    friendRequests[user] = (friendRequests[user] || []).filter((name) => name !== nick);
  });
  Object.keys(friends).forEach((user) => {
    friends[user] = (friends[user] || []).filter((name) => name !== nick);
  });

  if (savedData.dmMessages) {
    Object.keys(savedData.dmMessages).forEach((conversationId) => {
      if (conversationId.includes(nick)) {
        delete savedData.dmMessages[conversationId];
      } else {
        savedData.dmMessages[conversationId] = savedData.dmMessages[conversationId].filter(
          (msg) => msg.from !== nick && msg.to !== nick
        );
      }
    });
  }

  if (savedData.notifications && savedData.notifications[nick]) {
    delete savedData.notifications[nick];
  }

  for (let i = feedPosts.length - 1; i >= 0; i--) {
    if (feedPosts[i].username === nick) feedPosts.splice(i, 1);
  }
  for (let i = shorts.length - 1; i >= 0; i--) {
    if (shorts[i].username === nick) shorts.splice(i, 1);
  }

  suggestedCommunities.forEach((community, index) => {
    if (community.addedBy === nick || community.submittedBy === nick) {
      suggestedCommunities.splice(index, 1);
    }
  });

  saveData();
}

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Rota para buscar a foto de perfil
app.get('/api/avatar/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query('SELECT foto_perfil FROM usuarios WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ avatar: result.rows[0].foto_perfil || null });
  } catch (err) {
    console.error('Erro ao buscar avatar:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ============================================================
// ROTA DE AVATAR COM CACHE (evita loading infinito)
// ============================================================

// Cache simples em memória (expira em 5 minutos)
const avatarCache = new Map();

app.get('/api/avatar/:username', async (req, res) => {
  const { username } = req.params;
  
  // 1. Verifica cache
  if (avatarCache.has(username)) {
    const cached = avatarCache.get(username);
    // Se o cache ainda é válido (menos de 5 minutos)
    if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return res.json({ avatar: cached.avatar });
    } else {
      // Cache expirado, remove
      avatarCache.delete(username);
    }
  }

  try {
    const result = await pool.query(
      'SELECT avatar FROM usuarios WHERE username = $1',
      [username]
    );
    
    let avatar = null;
    if (result.rows.length > 0) {
      avatar = result.rows[0].avatar;
    }
    
    // 2. Armazena em cache (mesmo se for null)
    avatarCache.set(username, {
      avatar: avatar,
      timestamp: Date.now()
    });
    
    // 3. Retorna sempre um JSON válido
    res.json({ avatar: avatar });
    
  } catch (err) {
    console.error('[AVATAR] Erro:', err);
    // Em caso de erro, retorna null (não bloqueia o frontend)
    res.json({ avatar: null });
  }
});

// Opcional: limpar cache a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of avatarCache) {
    if (now - value.timestamp > 5 * 60 * 1000) {
      avatarCache.delete(key);
    }
  }
}, 10 * 60 * 1000);