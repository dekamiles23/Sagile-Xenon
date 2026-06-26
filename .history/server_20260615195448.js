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
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  allowEIO3: true,
  pingTimeout: 60000,
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

app.get('/version', (req, res) => {
  try {
    const pkg = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    res.json({ version: pkg.version });
  } catch (e) {
    res.json({ version: '1.0.0' });
  }
});

app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');

  console.log('Tentando abrir:', filePath);
  console.log('Existe?', fs.existsSync(filePath));

  res.sendFile(filePath);
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
const FEED_MAX = 200;
const SHORTS_MAX = 100;
const voiceRooms = {};
const onlineUsers = {}; // username -> socketId
// ✅ LISTA DE STAFFS — persistente em savedData.staffList
const DEV_EMAILS = ['skarking27@gmail.com']; // Apenas devs podem gerenciar staffs (validação por e-mail)
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
    savedAt: new Date().toISOString()
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Salvar automaticamente a cada 30 segundos
setInterval(saveData, 30000);

function broadcastPresence() {
  const list = Object.keys(onlineUsers);
  io.emit('friends:presence', { online: list });
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
    onlineUsers[newNick] = onlineUsers[oldNick];
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

io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  socket.on('user:login', ({ username, email }) => {
    // ✅ BLOQUEAR LOGIN COM NOME "Usuário"
    if (!username || username === 'Usuário' || username.trim() === '') {
      console.warn('⚠ Tentativa de login com nome inválido bloqueada');
      return;
    }
    
    socket.username = username;
    socket.email = (email || '').trim().toLowerCase();
    onlineUsers[username] = socket.id;
    broadcastPresence();
    
    // Enviar dados salvos para o usuário
    socket.emit('friends:data', {
      requests: friendRequests[username] || [],
      friends: friends[username] || []
    });

    // Enviar entradas do diário do usuário
    socket.emit('diary:entries', {
      entries: diaryEntries[username] || []
    });

    // Enviar todos os Shorts salvos
    socket.emit('shorts:history', shorts.slice(-50).reverse());

    // Enviar notificações pendentes (não lidas) ao usuário
    if (savedData.notifications && savedData.notifications[username] && savedData.notifications[username].length > 0) {
      socket.emit('notifications:data', savedData.notifications[username]);
    }
  });

  socket.on('friend:request', ({ to }) => {
    // Salvar solicitação no servidor
    if (!friendRequests[to]) friendRequests[to] = [];
    if (!friendRequests[to].includes(socket.username)) {
      friendRequests[to].push(socket.username);
      saveData();
    }
    
    const targetId = onlineUsers[to];
    if (targetId) {
      io.to(targetId).emit('friend:request', { from: socket.username });
    }
  });

  socket.on('friend:accept', ({ to }) => {
    // Remover solicitação pendente
    if (friendRequests[socket.username]) {
      friendRequests[socket.username] = friendRequests[socket.username].filter(u => u !== to);
    }
    
    // Adicionar amizade para ambos
    if (!friends[socket.username]) friends[socket.username] = [];
    if (!friends[socket.username].includes(to)) friends[socket.username].push(to);
    
    if (!friends[to]) friends[to] = [];
    if (!friends[to].includes(socket.username)) friends[to].push(socket.username);
    
    saveData();
    
    const targetId = onlineUsers[to];
    if (targetId) {
      io.to(targetId).emit('friend:accepted', { by: socket.username });
    }
  });

  socket.on('friend:reject', ({ to }) => {
    // Remover solicitação pendente
    if (friendRequests[socket.username]) {
      friendRequests[socket.username] = friendRequests[socket.username].filter(u => u !== to);
      saveData();
    }
    
    const targetId = onlineUsers[to];
    if (targetId) {
      io.to(targetId).emit('friend:rejected', { by: socket.username });
    }
  });

  socket.on('friend:remove', ({ to }) => {
    // Remover amizade para ambos
    if (friends[socket.username]) {
      friends[socket.username] = friends[socket.username].filter(u => u !== to);
    }
    if (friends[to]) {
      friends[to] = friends[to].filter(u => u !== socket.username);
    }
    saveData();
    
    const targetId = onlineUsers[to];
    if (targetId) {
      io.to(targetId).emit('friend:removed', { by: socket.username });
    }
  });

  // ==============================
  // SISTEMA DE MENSAGENS PRIVADAS
  // ==============================
  socket.on('dm:message', (msg) => {
    const targetId = onlineUsers[msg.to];
    if (targetId) {
      io.to(targetId).emit('dm:message', msg);
    }
    
    // Salvar mensagem no histórico
    if (!savedData.dmMessages) savedData.dmMessages = {};
    const conversationId = [socket.username, msg.to].sort().join('_');
    if (!savedData.dmMessages[conversationId]) savedData.dmMessages[conversationId] = [];
    
    savedData.dmMessages[conversationId].push({
      from: socket.username,
      to: msg.to,
      text: msg.text,
      time: msg.time,
      timestamp: Date.now(),
      status: targetId ? 'delivered' : 'sent'
    });
    
    saveData();
  });

  socket.on('dm:typing', ({ to }) => {
    const targetId = onlineUsers[to];
    if (targetId) {
      io.to(targetId).emit('dm:typing', { from: socket.username });
    }
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
    
    const targetId = onlineUsers[from];
    if (targetId) {
      io.to(targetId).emit('dm:read', { by: socket.username });
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
    
    const targetId = onlineUsers[to];
    if (targetId) {
      io.to(targetId).emit('notification:new', notification);
    }
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

  socket.on('feed:join', () => {
    console.log('📥 [SERVIDOR] Recebido feed:join de', socket.username || socket.id);
    socket.join('global-feed');
    console.log('📤 [SERVIDOR] Enviando', feedPosts.length, 'postagens para o cliente');
    socket.emit('feed:history', feedPosts.slice(-50).reverse());
  });

  socket.on('feed:post', ({ title, body, subreddit, username }) => {
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
    feedPosts.push(post);
    if (feedPosts.length > FEED_MAX) feedPosts.shift();
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
  socket.on('short:create', (shortData) => {
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

    shorts.push(short);
    if (shorts.length > SHORTS_MAX) shorts.shift();
    saveData();

    // Enviar para TODOS os usuários conectados
    io.emit('short:new', short);
  });

  socket.on('short:delete', ({ shortId }) => {
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
      const staffSocketId = onlineUsers[staffUsername];
      if (staffSocketId) {
        io.to(staffSocketId).emit('community:new-request', request);
        io.to(staffSocketId).emit('notification:new', notif);
      }
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
    const authorSocketId = onlineUsers[community.submittedBy];
    if (authorSocketId) {
      io.to(authorSocketId).emit('community:approved-notification', community);
    }
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
    const authorSocketId = onlineUsers[community.submittedBy];
    if (authorSocketId) {
      io.to(authorSocketId).emit('community:rejected', { community, reason });
    }
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
    const targetSocketId = onlineUsers[nick];
    if (targetSocketId) {
      io.to(targetSocketId).emit('staff:promoted', { promotedBy: socket.username });
    }
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
    const targetSocketId = onlineUsers[nick];
    if (targetSocketId) {
      io.to(targetSocketId).emit('staff:demoted', { demotedBy: socket.username });
    }
  });

  // Dev pede lista atual de staffs
  socket.on('staff:get-list', () => {
    if (!DEV_EMAILS.includes(socket.email || '')) return;
    socket.emit('staff:list', staffUsers.filter(u => !DEV_EMAILS.includes(u)));
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
      delete onlineUsers[socket.username];
      broadcastPresence();
    }
    console.log(`Usuário desconectado: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3002;

// FIX: Inicia escuta PRIMEIRO (responde rápido ao ping), migrations rodam em background
server.on('error', (err) => {
  console.error('[ERRO FATAL] Servidor nao iniciou:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error('Porta ' + PORT + ' ja esta em uso! Feche outra instancia do app.');
  }
  if (process.send) process.send({ error: err.message });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  if (process.send) process.send('ready');
  migrations.runMigration().catch((err) => {
    console.error('Erro na migração:', err.message);
  });
});
