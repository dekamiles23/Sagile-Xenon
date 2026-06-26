/**
 * presence-server-patch.js  —  VERSÃO 2
 * =========================================
 * Substitui COMPLETAMENTE a lógica de presença do servidor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CAUSA RAIZ DOS BUGS CONFIRMADOS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * BUG A — onlineSet contém apenas o próprio usuário
 *   Sintoma: cliente vê onlineSet = ['miles deka'], amigos online não aparecem.
 *   Causa  : o handler presence:request inclui o próprio nick no array `online`
 *            retornado (ou retorna TODOS os conectados em vez de só amigos).
 *   Correção: presenceRequest() exclui explicitamente o próprio nick do resultado.
 *
 * BUG B — userStatuses mostra amigos online como 'offline'
 *   Sintoma: MDK está conectado mas aparece como offline para miles deka.
 *   Causa  : user:status não está registrando socket.username corretamente,
 *            então quando MDK se conecta, o servidor não consegue associar
 *            o socket ao nick e não faz broadcast de friend:status.
 *   Correção: TANTO user:login QUANTO user:status registram socket.username
 *            (sem underscore, para compatibilidade com o código existente)
 *            E socket._username (para compatibilidade com patches anteriores).
 *
 * BUG C — Consulta de amigos retorna zero resultados
 *   Causa  : query usa `friends JOIN users` com INTEGER ids. Usuários criados
 *            via tabela `accounts` (UUID) não têm linha em `users`, então o
 *            JOIN sempre retorna vazio.
 *   Correção: query usa `friend_requests` com TEXT from_user/to_user.
 *
 * BUG D — Reconexão não re-notifica amigos
 *   Causa  : o disconnect deleta do onlineMap mas o reconnect não re-emite
 *            friend:status → amigos ficam travados vendo o usuário como offline.
 *   Correção: user:login sempre re-registra no onlineMap e re-notifica amigos.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * COMO INTEGRAR  (leia até o fim antes de editar)
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  PASSO 1 — Cole as variáveis globais ANTES de io.on('connection', ...):
 *
 *    const onlineMap    = {};   // nick.toLowerCase() → { socketId, status }
 *    const _dmCallUsers = {};   // nick.toLowerCase() → socket.id  (DM calls)
 *
 *  PASSO 2 — Cole a função getFriendsOf FORA de io.on('connection', ...):
 *    (já está abaixo — copie o bloco inteiro)
 *
 *  PASSO 3 — Dentro de io.on('connection', (socket) => { ... }) SUBSTITUA
 *    os handlers existentes de:
 *      • user:login
 *      • user:status
 *      • presence:request
 *      • disconnect    ← adicione o bloco de presença dentro do disconnect
 *                        existente (NÃO duplique o handler disconnect)
 *
 *  IMPORTANTE: se já existe um handler socket.on('user:login', ...) no seu
 *  server.js, substitua-o pelo bloco abaixo. Não duplique.
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════════════════════════════
 * VARIÁVEIS GLOBAIS — cole ANTES de io.on('connection', ...)
 * ═══════════════════════════════════════════════════════════════════════ */

// Descomente e cole no topo do server.js (fora de qualquer função):
//
//   const onlineMap    = {};
//   const _dmCallUsers = {};


/* ═══════════════════════════════════════════════════════════════════════
 * HELPER: buscar amigos pelo nick  — cole FORA de io.on('connection')
 * ═══════════════════════════════════════════════════════════════════════ */

async function getFriendsOf(nick) {
  if (!nick) return [];
  try {
    const result = await db.query(
      `SELECT
         CASE
           WHEN LOWER(from_user) = LOWER($1) THEN to_user
           ELSE from_user
         END AS friend_nick
       FROM friend_requests
       WHERE (LOWER(from_user) = LOWER($1) OR LOWER(to_user) = LOWER($1))
         AND status = 'accepted'`,
      [nick]
    );
    return result.rows.map(function (r) { return r.friend_nick; });
  } catch (_) {
    return [];
  }
}

/**
 * Emite friend:status para todos os amigos online de um nick.
 * Centraliza a lógica de broadcast para evitar repetição.
 */
async function broadcastStatusToFriends(nick, status) {
  const friendNicks = await getFriendsOf(nick);
  for (const fn of friendNicks) {
    const fkey = fn.toLowerCase();
    const entry = onlineMap[fkey];
    if (!entry) continue;
    const targetSocket = io.sockets.sockets.get(entry.socketId);
    if (targetSocket) {
      targetSocket.emit('friend:status', { username: nick, status: status });
    }
  }
}


/* ═══════════════════════════════════════════════════════════════════════
 * HANDLERS — cole DENTRO de io.on('connection', (socket) => { ... })
 * ═══════════════════════════════════════════════════════════════════════ */

/* ─── user:login ──────────────────────────────────────────────────────
 * Acionado pelo cliente ao conectar (e em toda reconexão).
 * Registra o socket, envia friends:data e notifica amigos.
 */
socket.on('user:login', async function (data) {
  if (!data || !data.username) return;

  const nick = String(data.username).trim();
  if (!nick) return;

  const key = nick.toLowerCase();

  /* ── 1. Registrar socket com TODAS as propriedades usadas pelo servidor ── */
  socket.username       = nick;        // compatibilidade com código legado
  socket._username      = nick;        // compatibilidade com patches v1
  socket._usernameKey   = key;
  socket._dmUsername    = key;         // compatibilidade com dm-call-server-patch

  onlineMap[key] = { socketId: socket.id, status: onlineMap[key]?.status || 'online' };

  /* ── 2. Registrar no mapa de DM calls ── */
  if (typeof _dmCallUsers !== 'undefined') {
    _dmCallUsers[key] = socket.id;
  }

  /* ── 3. Buscar amigos via friend_requests (funciona com ambas as tabelas) ── */
  const friendNicks = await getFriendsOf(nick);

  /* ── 4. Buscar solicitações pendentes recebidas ── */
  let requests = [];
  try {
    const reqResult = await db.query(
      `SELECT from_user FROM friend_requests
       WHERE LOWER(to_user) = LOWER($1) AND status = 'pending'
       ORDER BY created_at DESC`,
      [nick]
    );
    requests = reqResult.rows.map(function (r) { return { from: r.from_user }; });
  } catch (_) {}

  /* ── 5. Buscar solicitações enviadas (para sync cliente) ── */
  let sentRequests = [];
  try {
    const sentResult = await db.query(
      `SELECT to_user FROM friend_requests
       WHERE LOWER(from_user) = LOWER($1) AND status = 'pending'`,
      [nick]
    );
    sentRequests = sentResult.rows.map(function (r) { return r.to_user; });
  } catch (_) {}

  /* ── 6. Montar lista de amigos com status atual ── */
  const friendList = friendNicks.map(function (fn) {
    const fkey    = fn.toLowerCase();
    const entry   = onlineMap[fkey];
    const isOnline = !!entry;
    return {
      username: fn,
      nick:     fn,
      online:   isOnline,
      status:   isOnline ? (entry.status || 'online') : 'offline'
    };
  });

  /* ── 7. Emitir friends:data para o cliente recém-conectado ── */
  socket.emit('friends:data', {
    friends:      friendList,
    requests:     requests,
    sentRequests: sentRequests
  });

  /* ── 8. Notificar amigos online: "nick ficou online" ──
   *       ATENÇÃO: não emitir para si mesmo — apenas para amigos.
   */
  await broadcastStatusToFriends(nick, 'online');
});


/* ─── user:status ────────────────────────────────────────────────────
 * Atualiza o status do usuário (online / idle / dnd / invisible).
 * DEVE registrar socket.username mesmo que user:login não tenha sido
 * processado ainda (corrida de eventos na reconexão).
 */
socket.on('user:status', async function (data) {
  if (!data || !data.username) return;

  const nick   = String(data.username).trim();
  if (!nick) return;

  const key    = nick.toLowerCase();
  const status = data.status || 'online';

  /* ── Registrar / atualizar socket — igual ao user:login ── */
  socket.username     = nick;
  socket._username    = nick;
  socket._usernameKey = key;
  socket._dmUsername  = key;

  if (!onlineMap[key]) {
    onlineMap[key] = { socketId: socket.id, status: status };
  } else {
    onlineMap[key].status   = status;
    onlineMap[key].socketId = socket.id;
  }

  if (typeof _dmCallUsers !== 'undefined') {
    _dmCallUsers[key] = socket.id;
  }

  /* ── Broadcast friend:status para amigos conectados ── */
  await broadcastStatusToFriends(nick, status);
});


/* ─── presence:request ───────────────────────────────────────────────
 * O cliente pede a lista de presença dos seus amigos.
 *
 * !! CORREÇÃO DO BUG A !!
 * O array `online` retornado NUNCA deve incluir o próprio nick.
 * Deve conter APENAS amigos que estão em onlineMap neste momento.
 */
socket.on('presence:request', async function () {
  /* Resolver nick a partir de qualquer propriedade que o servidor usa */
  const nick =
    socket.username      ||
    socket._username     ||
    socket._usernameKey  ||
    null;

  if (!nick) return;

  const selfKey    = nick.toLowerCase();
  const friendNicks = await getFriendsOf(nick);

  const online   = [];
  const statuses = {};

  for (const fn of friendNicks) {
    const fkey = fn.toLowerCase();
    /* !! GARANTE que o próprio usuário nunca entra na lista de amigos !! */
    if (fkey === selfKey) continue;
    const entry = onlineMap[fkey];
    if (entry) {
      online.push(fn);
      statuses[fkey] = entry.status || 'online';
    }
  }

  socket.emit('friends:presence', { online: online, statuses: statuses });
});


/* ─── disconnect ─────────────────────────────────────────────────────
 * Cole DENTRO do handler disconnect existente — NÃO crie um segundo
 * socket.on('disconnect', ...).
 *
 * Exemplo de como deve ficar o disconnect:
 *
 *   socket.on('disconnect', async () => {
 *     // ... código existente ...
 *
 *     // ── BLOCO DE PRESENÇA (adicione aqui) ──
 *     const _nick = socket.username || socket._username || socket._usernameKey;
 *     if (_nick) {
 *       const _key = _nick.toLowerCase();
 *       delete onlineMap[_key];
 *       if (typeof _dmCallUsers !== 'undefined') delete _dmCallUsers[_key];
 *       await broadcastStatusToFriends(_nick, 'offline');
 *     }
 *     // ── FIM DO BLOCO DE PRESENÇA ──
 *   });
 */

/* Bloco isolado para colar dentro do disconnect existente: */
(function _presenceDisconnectBlock() {
  /*
   *  const _nick = socket.username || socket._username || socket._usernameKey;
   *  if (_nick) {
   *    const _key = _nick.toLowerCase();
   *    delete onlineMap[_key];
   *    if (typeof _dmCallUsers !== 'undefined') delete _dmCallUsers[_key];
   *    await broadcastStatusToFriends(_nick, 'offline');
   *  }
   */
})();


/* ═══════════════════════════════════════════════════════════════════════
 * CHECKLIST DE VERIFICAÇÃO
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Após aplicar o patch, confirme no Render.com (Logs):
 *
 *  1. Quando "miles deka" conecta:
 *       - user:login recebido com username = 'miles deka' ✓
 *       - onlineMap['miles deka'] criado ✓
 *       - friends:data emitido para miles deka ✓
 *
 *  2. Quando "mdk" conecta (estando já como amigo de miles deka):
 *       - user:login recebido com username = 'mdk' ✓
 *       - onlineMap['mdk'] criado ✓
 *       - friend:status { username:'mdk', status:'online' } emitido para miles deka ✓
 *
 *  3. Quando miles deka emite presence:request:
 *       - friends:presence retornado com online = ['mdk'] (SEM 'miles deka') ✓
 *       - statuses = { mdk: 'online' } ✓
 *
 *  4. Quando mdk desconecta:
 *       - delete onlineMap['mdk'] ✓
 *       - friend:status { username:'mdk', status:'offline' } emitido para miles deka ✓
 *
 * ═══════════════════════════════════════════════════════════════════════
 * DIAGNÓSTICO: SE AINDA NÃO FUNCIONAR
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Adicione temporariamente ao início do handler user:login:
 *    console.log('[PRESENCE] user:login', { nick, socketId: socket.id });
 *
 *  E ao início do presence:request:
 *    console.log('[PRESENCE] presence:request', { nick, onlineMap });
 *
 *  Se nick for undefined no presence:request, significa que user:login
 *  não foi processado antes de presence:request — verifique a ordem de
 *  emissão no cliente (friends-fix-v6.js deve emitir user:status ANTES
 *  de presence:request).
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

// Exporta helpers para uso em outros módulos do servidor
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getFriendsOf, broadcastStatusToFriends };
}
