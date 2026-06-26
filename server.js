/**
 * Sagile ZX — Servidor Principal
 * Express + Socket.IO na porta 3002
 * Serve arquivos estáticos de /public e /uploads
 */

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const server = http.createServer(app);
const io   = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 10e6
});

const PORT = 3002;

// ─── Servir arquivos estáticos ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json({ limit: '10mb' }));

// ─── Estado em memória ───────────────────────────────────────────────────────
const users          = {};   // socketId -> { username, avatar, status, channel, serverId }
const dmHistory      = {};   // "a|b" (sorted) -> [msg, ...]
const channelHistory = {};   // "serverId:channel" -> [msg, ...]
const voiceRooms     = {};   // "serverId:channel" -> [{ username, avatar }]
const feedPosts      = [];   // global feed
const userIdMap      = {};   // username.lower -> userId
const communities    = {};   // id -> community obj
const shorts         = [];   // array of short objects

function dmKey(a, b) {
  return [a, b].sort().join('|');
}

function broadcastOnlineUsers() {
  const online = Object.values(users).map(u => ({
    username: u.username,
    avatar:   u.avatar || null,
    status:   u.status || 'online'
  }));
  io.emit('friends:data', online);
}

// ─── Conexão Socket.IO ───────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[SERVER] Nova conexão:', socket.id);

  // ── Heartbeat / identificação do usuário ─────────────────────────────────
function registerUser(data) {
  const username = data?.username || data?.user || null;
  if (!username) return;
  users[socket.id] = {
    ...(users[socket.id] || {}),
    username,
    avatar: data?.avatar || users[socket.id]?.avatar || null,
    status: data?.status || 'online',
    socketId: socket.id
  };
  socket.username = username;
  if (data?.userId) userIdMap[username.toLowerCase()] = data.userId;
  broadcastOnlineUsers();
}
socket.on('user:heartbeat', registerUser);
socket.on('user:login',     registerUser);


  socket.on('user:status', (data) => {
    if (!data?.username) return;
    if (users[socket.id]) users[socket.id].status = data.status || 'online';
    io.emit('friend:status', { username: data.username, status: data.status || 'online' });
  });

  // ── Avatar ───────────────────────────────────────────────────────────────
  socket.on('user:avatar:set', (data) => {
    if (!data?.username) return;
    if (users[socket.id]) users[socket.id].avatar = data.avatar;
    socket.emit('user:avatar:data', { username: data.username, avatar: data.avatar });
    socket.broadcast.emit('user:avatar:data', { username: data.username, avatar: data.avatar });
  });

  socket.on('user:avatar:get', (data) => {
    const target = Object.values(users).find(u =>
      u.username?.toLowerCase() === data?.username?.toLowerCase()
    );
    socket.emit('user:avatar:data', {
      username: data?.username,
      avatar: target?.avatar || null
    });
  });

  // ── Resolver userId por username ──────────────────────────────────────────
  socket.on('dm:get-user-id', (data) => {
    const username = data?.username;
    if (!username) return;
    const uid = userIdMap[username.toLowerCase()] || null;
    socket.emit('dm:user-id', { username, userId: uid });
  });

  // ── Presença ─────────────────────────────────────────────────────────────
  socket.on('presence:request', () => {
    const online = Object.values(users).map(u => ({
      username: u.username,
      avatar:   u.avatar || null,
      status:   u.status || 'online'
    }));
    socket.emit('friends:data', online);
  });

  // ── Canal de servidor (chat) ──────────────────────────────────────────────
  socket.on('switch-channel', (data) => {
    // Sai do canal anterior
    if (users[socket.id]?.room) socket.leave(users[socket.id].room);
    const room = `${data.serverId}:${data.channel}`;
    socket.join(room);
    if (users[socket.id]) {
      users[socket.id].room    = room;
      users[socket.id].channel = data.channel;
      users[socket.id].serverId = data.serverId;
    }
    // Envia histórico
    const hist = channelHistory[room] || [];
    socket.emit('history', hist.slice(-100));
  });

  socket.on('message', (data) => {
    const room = users[socket.id]?.room;
    if (!room) return;
    const msg = {
      id:        Date.now() + '_' + Math.random().toString(36).slice(2),
      username:  data.username || 'Anônimo',
      avatar:    data.avatar   || null,
      text:      data.text     || data.content || '',
      timestamp: Date.now(),
      type:      data.type || 'text',
      media:     data.media || null
    };
    if (!channelHistory[room]) channelHistory[room] = [];
    channelHistory[room].push(msg);
    if (channelHistory[room].length > 500) channelHistory[room].shift();
    io.to(room).emit('message', msg);
    socket.emit('message:sent', { ...msg, status: 'delivered' });
  });

  // ── DM (mensagens diretas) ────────────────────────────────────────────────
  socket.on('dm:history', (data) => {
    const me   = users[socket.id]?.username;
    const them = data?.with;
    if (!me || !them) return;
    const key  = dmKey(me, them);
    socket.emit('dm:history', { with: them, messages: (dmHistory[key] || []).slice(-100) });
  });

  socket.on('dm:message', (data) => {
    const from = data?.from || users[socket.id]?.username;
    const to   = data?.to;
    if (!from || !to) return;

    const msg = {
      id:        Date.now() + '_' + Math.random().toString(36).slice(2),
      from,
      to,
      text:      data.text || data.content || '',
      timestamp: Date.now(),
      avatar:    data.avatar || users[socket.id]?.avatar || null,
      type:      data.type || 'text',
      media:     data.media || null
    };

    const key = dmKey(from, to);
    if (!dmHistory[key]) dmHistory[key] = [];
    dmHistory[key].push(msg);
    if (dmHistory[key].length > 500) dmHistory[key].shift();

    // Envia ao remetente
    socket.emit('dm:message:sent', msg);

    // Envia ao destinatário (se online)
    const targetSocket = Object.entries(users).find(([, u]) =>
      u.username?.toLowerCase() === to.toLowerCase()
    );
    if (targetSocket) {
      io.to(targetSocket[0]).emit('dm:message', msg);
    }
  });

  socket.on('dm:typing', (data) => {
    const from = data?.from || users[socket.id]?.username;
    const to   = data?.to;
    if (!from || !to) return;
    const targetSocket = Object.entries(users).find(([, u]) =>
      u.username?.toLowerCase() === to.toLowerCase()
    );
    if (targetSocket) {
      io.to(targetSocket[0]).emit('dm:typing', { from });
    }
  });

  socket.on('dm:read', (data) => {
    const me   = data?.from || users[socket.id]?.username;
    const from = data?.from;
    if (!from) return;
    const targetSocket = Object.entries(users).find(([, u]) =>
      u.username?.toLowerCase() === from.toLowerCase()
    );
    if (targetSocket) {
      io.to(targetSocket[0]).emit('dm:read', { by: me });
    }
  });

  // ── Chamadas de voz DM (WebRTC signaling) ────────────────────────────────
  function findSocket(username) {
    if (!username) return null;
    const entry = Object.entries(users).find(([, u]) =>
      u.username?.toLowerCase() === username.toLowerCase()
    );
    return entry ? entry[0] : null;
  }

  socket.on('dm:call:start', (data) => {
    const toSid = findSocket(data?.to);
    if (toSid) {
      io.to(toSid).emit('dm:call:start', {
        from:   data.from   || users[socket.id]?.username,
        fromId: data.fromId || null,
        to:     data.to,
        toId:   data.toId   || null
      });
    }
  });

  socket.on('dm:call:accept', (data) => {
    const toSid = findSocket(data?.to);
    if (toSid) {
      io.to(toSid).emit('dm:call:accept', {
        from: data.from || users[socket.id]?.username,
        to:   data.to
      });
    }
  });

  socket.on('dm:call:reject', (data) => {
    const toSid = findSocket(data?.to);
    if (toSid) {
      io.to(toSid).emit('dm:call:reject', {
        from: data.from || users[socket.id]?.username,
        to:   data.to
      });
    }
  });

  socket.on('dm:call:end', (data) => {
    const toSid = findSocket(data?.to);
    if (toSid) {
      io.to(toSid).emit('dm:call:end', {
        from: data.from || users[socket.id]?.username,
        to:   data.to
      });
    }
  });

  socket.on('dm:voice:offer', (data) => {
    const toSid = findSocket(data?.to);
    if (toSid) {
      io.to(toSid).emit('dm:voice:offer', {
        from:  data.from || users[socket.id]?.username,
        offer: data.offer
      });
    }
  });

  socket.on('dm:voice:answer', (data) => {
    const toSid = findSocket(data?.to);
    if (toSid) {
      io.to(toSid).emit('dm:voice:answer', {
        from:   data.from || users[socket.id]?.username,
        answer: data.answer
      });
    }
  });

  socket.on('dm:voice:ice', (data) => {
    const toSid = findSocket(data?.to);
    if (toSid) {
      io.to(toSid).emit('dm:voice:ice', {
        from:      data.from || users[socket.id]?.username,
        candidate: data.candidate
      });
    }
  });

  // ── Salas de voz (servidor) ───────────────────────────────────────────────
  socket.on('voice:join', (data) => {
    const roomKey = `${data.serverId}:${data.channel}`;
    if (!voiceRooms[roomKey]) voiceRooms[roomKey] = [];
    const entry = {
      username:  data.username || users[socket.id]?.username,
      avatar:    data.avatar   || users[socket.id]?.avatar || null,
      socketId:  socket.id
    };
    voiceRooms[roomKey] = voiceRooms[roomKey].filter(u => u.socketId !== socket.id);
    voiceRooms[roomKey].push(entry);
    if (users[socket.id]) users[socket.id].voiceRoom = roomKey;
    io.emit('voice:room-users', { room: roomKey, users: voiceRooms[roomKey] });
  });

  socket.on('voice:leave', (data) => {
    const roomKey = `${data.serverId}:${data.channel}`;
    if (voiceRooms[roomKey]) {
      voiceRooms[roomKey] = voiceRooms[roomKey].filter(u => u.socketId !== socket.id);
      io.emit('voice:room-users', { room: roomKey, users: voiceRooms[roomKey] });
    }
    if (users[socket.id]) delete users[socket.id].voiceRoom;
  });

  // ── Compartilhamento de mídia (relay) ────────────────────────────────────
  ['audio_share_started','audio_share_stopped','camera_started','camera_stopped',
   'screen_share_started','screen_share_stopped','window_share_started','window_share_stopped',
   'call:start'
  ].forEach(evt => {
    socket.on(evt, (data) => {
      const room = users[socket.id]?.room;
      if (room) socket.to(room).emit(evt, { ...data, from: users[socket.id]?.username });
    });
  });

  // ── Feed ─────────────────────────────────────────────────────────────────
  socket.on('feed:join', () => {
    socket.join('feed');
    socket.emit('feed:history', feedPosts.slice(-50));
  });

  socket.on('feed:post', (data) => {
    const post = {
      id:        Date.now() + '_' + Math.random().toString(36).slice(2),
      username:  data.username || users[socket.id]?.username,
      avatar:    data.avatar   || null,
      text:      data.text     || '',
      media:     data.media    || null,
      timestamp: Date.now(),
      votes:     0,
      comments:  []
    };
    feedPosts.push(post);
    if (feedPosts.length > 200) feedPosts.shift();
    io.to('feed').emit('feed:new', post);
  });

  socket.on('feed:vote', (data) => {
    const post = feedPosts.find(p => p.id === data.postId);
    if (post) {
      post.votes = (post.votes || 0) + (data.direction === 'up' ? 1 : -1);
      io.to('feed').emit('feed:new', post);
    }
  });

  socket.on('feed:comment', (data) => {
    const post = feedPosts.find(p => p.id === data.postId);
    if (post) {
      const comment = {
        username:  data.username || users[socket.id]?.username,
        text:      data.text,
        timestamp: Date.now()
      };
      if (!post.comments) post.comments = [];
      post.comments.push(comment);
      io.to('feed').emit('feed:new', post);
    }
  });

  // ── Posts individuais ─────────────────────────────────────────────────────
  socket.on('post:join', (data) => {
    socket.join('post:' + data.postId);
    const post = feedPosts.find(p => p.id === data.postId);
    if (post) socket.emit('post:data', post);
  });

  socket.on('post:leave', (data) => {
    socket.leave('post:' + data.postId);
  });

  // ── Communidades sugeridas ────────────────────────────────────────────────
  socket.on('community:get-by-id', (data) => {
    const comm = communities[data?.id];
    socket.emit('community:by-id-response', { community: comm || null });
  });

  socket.on('community:suggest', (data) => {
    if (data?.community) {
      communities[data.community.id] = data.community;
      io.emit('suggested:new', data.community);
    }
  });

  socket.on('community:unsuggest', (data) => {
    if (data?.id) {
      delete communities[data.id];
      io.emit('suggested:removed', { id: data.id });
    }
  });

  socket.on('community:add-suggested', (data) => {
    socket.emit('suggested:communities', Object.values(communities));
  });

  // ── Shorts ────────────────────────────────────────────────────────────────
  socket.on('shorts:request', () => {
    socket.emit('shorts:list', shorts.slice(-50));
  });

  socket.on('short:create', (data) => {
    const s = { ...data, id: Date.now() + '_' + Math.random().toString(36).slice(2), timestamp: Date.now() };
    shorts.push(s);
    io.emit('short:update', s);
  });

  socket.on('short:delete', (data) => {
    const idx = shorts.findIndex(s => s.id === data.id);
    if (idx !== -1) shorts.splice(idx, 1);
    io.emit('short:delete', { id: data.id });
  });

  // ── Notificações ──────────────────────────────────────────────────────────
  socket.on('notification:mark-read', (data) => {
    socket.emit('notification:mark-read', { id: data?.id });
  });
  socket.on('notification:mark-all-read', () => {
    socket.emit('notification:mark-all-read', {});
  });

  // ── Desconexão ────────────────────────────────────────────────────────────

  // ── SALA DE VOZ PRIVADA DM ──────────────────────────────────
  socket.on('dm:voice-room:join', ({ roomKey, username, toUser, avatar } = {}) => {
    if (!roomKey) return;
    const room = 'dm-voice-room:' + roomKey;
    const uname = username || socket.username || 'Anônimo';
    if (!dmVoiceRooms[roomKey]) dmVoiceRooms[roomKey] = [];
    dmVoiceRooms[roomKey] = dmVoiceRooms[roomKey].filter(u => u.socketId !== socket.id);
    const peers = dmVoiceRooms[roomKey].map(u => u.socketId);
    dmVoiceRooms[roomKey].push({ socketId: socket.id, username: uname, avatar: avatar || null });
    socket.dmVoiceRoom = room; socket.dmVoiceRoomKey = roomKey;
    socket.join(room);
    socket.emit('dm:voice-room:peers', { peers, roomKey });
    socket.to(room).emit('dm:voice-room:user-joined', { socketId: socket.id, username: uname, roomKey });
    if (toUser) _voiceEmit(null, toUser, 'dm:voice-room:notification', { from: uname, roomKey, action: 'joined' });
    io.to(room).emit('dm:voice-room:users', { users: dmVoiceRooms[roomKey], roomKey });
    console.log('[DM-VOICE-ROOM] ' + uname + ' entrou em ' + roomKey);
  });
  socket.on('dm:voice-room:leave', ({ roomKey: rk } = {}) => {
    const key = rk || socket.dmVoiceRoomKey, room = 'dm-voice-room:' + key;
    if (!key) return;
    if (dmVoiceRooms[key]) { dmVoiceRooms[key] = dmVoiceRooms[key].filter(u => u.socketId !== socket.id); if (!dmVoiceRooms[key].length) delete dmVoiceRooms[key]; }
    socket.to(room).emit('dm:voice-room:user-left', { socketId: socket.id, username: socket.username, roomKey: key });
    io.to(room).emit('dm:voice-room:users', { users: dmVoiceRooms[key] || [], roomKey: key });
    socket.leave(room); socket.dmVoiceRoom = null; socket.dmVoiceRoomKey = null;
  });
  socket.on('dm:voice-room:offer',  ({ to, offer,     roomKey } = {}) => { if (to && offer)      io.to(to).emit('dm:voice-room:offer',  { from: socket.id, offer,     username: socket.username, roomKey }); });
  socket.on('dm:voice-room:answer', ({ to, answer,    roomKey } = {}) => { if (to && answer)     io.to(to).emit('dm:voice-room:answer', { from: socket.id, answer,    roomKey }); });
  socket.on('dm:voice-room:ice',    ({ to, candidate, roomKey } = {}) => { if (to && candidate)  io.to(to).emit('dm:voice-room:ice',    { from: socket.id, candidate, roomKey }); });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user?.voiceRoom && voiceRooms[user.voiceRoom]) {
      voiceRooms[user.voiceRoom] = voiceRooms[user.voiceRoom].filter(u => u.socketId !== socket.id);
      io.emit('voice:room-users', {
        room: user.voiceRoom,
        users: voiceRooms[user.voiceRoom]
      });
    }
    if (user?.username) {
      io.emit('friend:status', { username: user.username, status: 'offline' });
    }
    delete users[socket.id];
    console.log('[SERVER] Desconectado:', socket.id);
  });
});

// ─── Rota raiz ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Iniciar servidor (com auto-kill da instância anterior) ─────────────────
const { execSync } = require('child_process');

function killPortAndListen() {
  try {
    // Windows
    execSync(`for /f "tokens=5" %a in ('netstat -aon ^| find ":${PORT}" ^| find "LISTENING"') do taskkill /F /PID %a`, { stdio: 'ignore' });
  } catch (_) {}
  try {
    // Linux / macOS
    execSync(`lsof -ti tcp:${PORT} | xargs kill -9`, { stdio: 'ignore' });
  } catch (_) {}

  setTimeout(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Servidor ZX rodando em http://localhost:${PORT}`);
      console.log(`   Acesse: http://localhost:${PORT}`);
    });
  }, 500);
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️  Porta ${PORT} ocupada. Encerrando processo anterior...`);
    killPortAndListen();
  } else {
    throw err;
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor ZX rodando em http://localhost:${PORT}`);
  console.log(`   Acesse: http://localhost:${PORT}`);
});

process.on('SIGINT',  () => { server.close(); process.exit(0); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
