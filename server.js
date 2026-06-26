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
let supabaseBackend;
try { supabaseBackend = require('./supabase-backend'); } catch(_) {
  console.warn('[SERVER] supabase-backend não encontrado, rodando sem Supabase');
  const noop = async () => [];
  supabaseBackend = { getCommunities: noop, createCommunity: noop, deleteCommunity: noop, getServers: noop, createServer: noop, updateServer: noop, deleteServer: noop, getServerChannels: noop, createServerChannel: noop, deleteServerChannel: noop, getShorts: noop, createShort: noop, deleteShort: noop, saveDmMessage: async () => {}, getDmHistory: noop, getFriends: noop, addFriendship: async () => {}, removeFriendship: async () => {} };
}

const app  = express();
const server = http.createServer(app);
const io   = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 10e6
});

const PORT = process.env.PORT || 3002;
const APP_DIR = process.env.APP_DIR || __dirname;
const USER_DATA_DIR = process.env.USER_DATA_DIR || __dirname;

// ─── Servir arquivos estáticos ───────────────────────────────────────────────
app.use(express.static(path.join(APP_DIR, 'public')));
app.use('/uploads', express.static(path.join(USER_DATA_DIR, 'uploads')));
app.use(express.json({ limit: '10mb' }));

// ─── Estado em memória ───────────────────────────────────────────────────────
const users          = {};   // socketId -> { username, avatar, status, channel, serverId }
const dmHistory      = {};   // "a|b" (sorted) -> [msg, ...]
const channelHistory = {};   // "serverId:channel" -> [msg, ...]
const voiceRooms     = {};   // "serverId:channel" -> [{ username, avatar }]
const dmVoiceRooms   = {};   // "dm-voice-room:roomKey" -> [{ socketId, username, avatar }]
const feedPosts      = [];   // global feed
const userIdMap      = {};   // username.lower -> userId
const communities    = {};   // id -> community obj
const shorts         = [];   // array of short objects

// ─── Salas privadas ───────────────────────────────────────────────────────────
const privateRooms   = {};   // roomId -> { id, name, createdBy, members: [], messages: [] }
const userRooms      = {};   // username.lower -> [roomId, ...]

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
    console.log('[SERVER] Usuário registrado:', username, '| socket:', socket.id);
    broadcastOnlineUsers();
  }

  socket.on('user:heartbeat', registerUser);
  socket.on('user:login',     registerUser);

  // Carregar amigos do Supabase ao logar
  socket.on('friends:load', async (data) => {
    const username = (data?.username || users[socket.id]?.username || '').toLowerCase();
    if (!username) return;
    const friends = await supabaseBackend.getFriends(username);
    console.log('[FRIEND] friends:load para', username, '→', friends.length, 'amigos');
    socket.emit('friends:loaded', { friends });
  });

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
  socket.on('dm:history', async (data) => {
    const me   = users[socket.id]?.username;
    const them = data?.with;
    if (!me || !them) return;
    const key  = dmKey(me, them);

    // Busca do Supabase e mescla com cache em memória
    const dbMsgs = await supabaseBackend.getDmHistory(me, them);
    const memMsgs = dmHistory[key] || [];

    // Deduplica por id
    const seen = new Set(dbMsgs.map(m => m.id));
    const merged = [...dbMsgs];
    memMsgs.forEach(m => { if (!seen.has(m.id)) merged.push(m); });
    merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Atualiza cache local
    dmHistory[key] = merged.slice(-500);

    socket.emit('dm:history', { with: them, messages: dmHistory[key].slice(-100) });
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

    // Persiste no Supabase (fire-and-forget)
    supabaseBackend.saveDmMessage(msg).catch(() => {});

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

  // ── Salas privadas ─────────────────────────────────────────────────────────
  // Criar uma sala privada
  socket.on('private-room:create', (data) => {
    const username = users[socket.id]?.username;
    if (!username) return;

    const roomId = 'private_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const roomName = data?.name || 'Sala Privada';

    privateRooms[roomId] = {
      id: roomId,
      name: roomName,
      createdBy: username,
      createdAt: Date.now(),
      members: [username],
      messages: []
    };

    const userKey = username.toLowerCase();
    if (!userRooms[userKey]) userRooms[userKey] = [];
    userRooms[userKey].push(roomId);

    socket.join(roomId);
    socket.emit('private-room:created', { roomId, name: roomName });
  });

  // Listar salas do usuário
  socket.on('private-room:list', () => {
    const username = users[socket.id]?.username;
    if (!username) return;

    const userKey = username.toLowerCase();
    const roomIds = userRooms[userKey] || [];
    const rooms = roomIds.map(id => privateRooms[id]).filter(Boolean);

    socket.emit('private-room:list', rooms);
  });

  // Entrar em uma sala privada
  socket.on('private-room:join', (data) => {
    const username = users[socket.id]?.username;
    const roomId = data?.roomId;
    if (!username || !roomId || !privateRooms[roomId]) return;

    const room = privateRooms[roomId];

    if (!room.members.includes(username)) {
      room.members.push(username);
      const userKey = username.toLowerCase();
      if (!userRooms[userKey]) userRooms[userKey] = [];
      if (!userRooms[userKey].includes(roomId)) {
        userRooms[userKey].push(roomId);
      }
    }

    socket.join(roomId);
    socket.emit('private-room:joined', { roomId, name: room.name });
    io.to(roomId).emit('private-room:user-joined', { username, roomId });

    socket.emit('private-room:history', { roomId, messages: room.messages.slice(-100) });
  });

  // Sair de uma sala privada
  socket.on('private-room:leave', (data) => {
    const username = users[socket.id]?.username;
    const roomId = data?.roomId;
    if (!username || !roomId) return;

    socket.leave(roomId);
    io.to(roomId).emit('private-room:user-left', { username, roomId });
  });

  // Enviar mensagem em sala privada
  socket.on('private-room:message', (data) => {
    const username = users[socket.id]?.username;
    const roomId = data?.roomId;
    if (!username || !roomId || !privateRooms[roomId]) return;

    const room = privateRooms[roomId];
    if (!room.members.includes(username)) return;

    const msg = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2),
      username,
      avatar: users[socket.id]?.avatar || null,
      text: data?.text || '',
      timestamp: Date.now(),
      type: data?.type || 'text',
      media: data?.media || null
    };

    room.messages.push(msg);
    if (room.messages.length > 500) room.messages.shift();

    io.to(roomId).emit('private-room:message', { ...msg, roomId });
  });

  // Convidar usuário para sala privada
  socket.on('private-room:invite', (data) => {
    const username = users[socket.id]?.username;
    const roomId = data?.roomId;
    const targetUsername = data?.username;
    if (!username || !roomId || !targetUsername) return;

    const room = privateRooms[roomId];
    if (!room || room.createdBy !== username) return;

    const targetSocket = Object.entries(users).find(([, u]) =>
      u.username?.toLowerCase() === targetUsername.toLowerCase()
    );

    if (targetSocket) {
      io.to(targetSocket[0]).emit('private-room:invited', {
        roomId,
        roomName: room.name,
        invitedBy: username
      });
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

  // ── Amizades ──────────────────────────────────────────────────────────────────
  socket.on('friend:request', (data) => {
    const from = data?.from || users[socket.id]?.username;
    const to   = data?.to;
    if (!from || !to) return;
    console.log('[FRIEND] request from=' + from + ' to=' + to);
    const toSid = findSocket(to);
    // Confirma para quem enviou
    socket.emit('friend:request:sent', { to, offline: !toSid });
    // Encaminha para o destinatário (se online)
    if (toSid) {
      io.to(toSid).emit('friend:request', { from, avatar: data?.avatar || null });
      console.log('[FRIEND] request encaminhado para', toSid);
    } else {
      console.log('[FRIEND] destinatario offline, notificacao salva');
    }
  });

  socket.on('friend:accept', async (data) => {
    const from = data?.from || users[socket.id]?.username;
    const to   = data?.to;
    if (!from || !to) return;
    console.log('[FRIEND] accept from=' + from + ' to=' + to);
    // Persiste amizade no Supabase
    await supabaseBackend.addFriendship(from, to);
    // Notifica o outro usuário
    const toSid = findSocket(to);
    if (toSid) {
      io.to(toSid).emit('friend:accepted', { by: from, avatar: data?.avatar || null });
      // Envia lista atualizada para o outro usuário também
      const toFriends = await supabaseBackend.getFriends(to.toLowerCase());
      io.to(toSid).emit('friends:loaded', { friends: toFriends });
    }
    // Envia lista atualizada para quem aceitou (para refletir imediatamente sem depender do localStorage)
    const fromFriends = await supabaseBackend.getFriends(from.toLowerCase());
    socket.emit('friends:loaded', { friends: fromFriends });
  });

  socket.on('friend:reject', (data) => {
    const from = data?.from || users[socket.id]?.username;
    const to   = data?.to;
    if (!from || !to) return;
    const toSid = findSocket(to);
    if (toSid) io.to(toSid).emit('friend:rejected', { by: from });
  });

  socket.on('friend:remove', async (data) => {
    const from = data?.from || users[socket.id]?.username;
    const to   = data?.to;
    if (!from || !to) return;
    // Remove amizade do Supabase
    await supabaseBackend.removeFriendship(from, to);
    const toSid = findSocket(to);
    if (toSid) io.to(toSid).emit('friend:removed', { by: from });
    // Envia lista atualizada para quem removeu
    const fromFriends = await supabaseBackend.getFriends(from.toLowerCase());
    socket.emit('friends:loaded', { friends: fromFriends });
  });

  socket.on('friend:cancel', (data) => {
    const from = data?.from || users[socket.id]?.username;
    const to   = data?.to;
    if (!from || !to) return;
    socket.emit('friend:cancel:ok', { to });
    const toSid = findSocket(to);
    if (toSid) io.to(toSid).emit('friend:request:cancelled', { by: from });
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
    const from = data.from || users[socket.id]?.username;
    const to   = data?.to;
    const toSid = findSocket(to);
    console.log('[CALL] dm:call:start from=' + from + ' to=' + to + ' toSid=' + toSid);
    console.log('[CALL] usuarios online:', Object.values(users).map(u => u.username));
    if (toSid) {
      io.to(toSid).emit('dm:call:incoming', { from, fromId: data.fromId || null, to, toId: data.toId || null });
      console.log('[CALL] dm:call:incoming enviado para', toSid);
    } else {
      console.log('[CALL] ERRO: usuario "' + to + '" nao encontrado nos users conectados');
      socket.emit('dm:call:error', { message: 'Usuário "' + to + '" não está online ou não enviou heartbeat' });
    }
  });

  socket.on('dm:call:accept', (data) => {
    const toSid = findSocket(data?.to);
    console.log('[CALL] dm:call:accept to=' + data?.to + ' toSid=' + toSid);
    if (toSid) {
      io.to(toSid).emit('dm:call:accepted', { from: data.from || users[socket.id]?.username, to: data.to });
    }
  });

  socket.on('dm:call:reject', (data) => {
    const toSid = findSocket(data?.to);
    console.log('[CALL] dm:call:reject to=' + data?.to + ' toSid=' + toSid);
    if (toSid) {
      io.to(toSid).emit('dm:call:rejected', { from: data.from || users[socket.id]?.username, to: data.to });
    }
  });

  socket.on('dm:call:end', (data) => {
    const toSid = findSocket(data?.to);
    console.log('[CALL] dm:call:end to=' + data?.to + ' toSid=' + toSid);
    if (toSid) {
      io.to(toSid).emit('dm:call:ended', { from: data.from || users[socket.id]?.username, to: data.to });
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
  socket.on('community:get-by-id', async (data) => {
    // Tenta buscar do Supabase primeiro
    const supabaseCommunities = await supabaseBackend.getCommunities();
    const comm = supabaseCommunities.find(c => c.id === data?.id) || communities[data?.id];
    socket.emit('community:by-id-response', { community: comm || null });
  });

  socket.on('community:suggest', async (data) => {
    if (data?.community) {
      // Salva no Supabase
      await supabaseBackend.createCommunity({
        id: data.community.id,
        name: data.community.name,
        description: data.community.description,
        iconUrl: data.community.iconUrl,
        bannerUrl: data.community.bannerUrl,
        createdBy: data.community.createdBy,
        memberCount: data.community.memberCount
      });
      
      communities[data.community.id] = data.community;
      io.emit('suggested:new', data.community);
    }
  });

  socket.on('community:unsuggest', async (data) => {
    const communityId = data?.id || data?.communityId;
    if (communityId) {
      await supabaseBackend.deleteCommunity(communityId);
      delete communities[communityId];
      io.emit('suggested:removed', { id: communityId, communityId });
    }
  });

  // Adicionar comunidade nas sugeridas e propagar para todos
  socket.on('community:add-suggested', async (data) => {
    if (data && data.id && data.name) {
      // Salva no Supabase
      await supabaseBackend.createCommunity({
        id: data.id,
        name: data.name,
        description: data.description || '',
        iconUrl: data.icon || '',
        bannerUrl: data.banner || '',
        createdBy: users[socket.id]?.username || '',
        memberCount: data.members || 0
      }).catch(() => {});
      communities[data.id] = data;
      io.emit('suggested:new', data);
    }
    // Retorna a lista completa atualizada
    const supabaseCommunities = await supabaseBackend.getCommunities();
    const allCommunities = { ...communities };
    supabaseCommunities.forEach(c => {
      allCommunities[c.id] = { id: c.id, name: c.name, icon: c.icon_url || '', banner: c.banner_url || '', members: c.member_count || 0, description: c.description || '' };
    });
    socket.emit('suggested:communities', Object.values(allCommunities));
  });

  // Buscar lista de comunidades sugeridas (sem adicionar)
  socket.on('community:get-suggested', async () => {
    const supabaseCommunities = await supabaseBackend.getCommunities();
    const allCommunities = { ...communities };
    supabaseCommunities.forEach(c => {
      allCommunities[c.id] = { id: c.id, name: c.name, icon: c.icon_url || '', banner: c.banner_url || '', members: c.member_count || 0, description: c.description || '' };
    });
    socket.emit('suggested:communities', Object.values(allCommunities));
  });

  // ── Servidores ───────────────────────────────────────────────────────────────
  socket.on('server:create', async (data) => {
    if (data?.server) {
      // Salva no Supabase
      await supabaseBackend.createServer({
        id: data.server.id,
        name: data.server.name,
        description: data.server.description,
        iconUrl: data.server.iconUrl,
        owner: data.server.owner,
        memberCount: data.server.memberCount
      });
      
      socket.emit('server:created', data.server);
    }
  });

  socket.on('server:list', async (data) => {
    const dbServers = await supabaseBackend.getServers();
    // Normaliza campos para o formato esperado pelo front-end
    const normalized = dbServers.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      icon: s.icon_url || '',
      owner: s.owner || '',
      members: s.member_count || 0,
      created_at: s.created_at
    }));
    socket.emit('server:list', normalized);
  });

  socket.on('server:update', async (data) => {
    if (data?.id && data?.updates) {
      await supabaseBackend.updateServer(data.id, data.updates);
      socket.emit('server:updated', { id: data.id, updates: data.updates });
    }
  });

  socket.on('server:delete', async (data) => {
    if (data?.id) {
      await supabaseBackend.deleteServer(data.id);
      socket.emit('server:deleted', { id: data.id });
    }
  });

  // ── Canais de Servidor ───────────────────────────────────────────────────────
  socket.on('server:channel:create', async (data) => {
    if (data?.channel) {
      await supabaseBackend.createServerChannel({
        id: data.channel.id,
        serverId: data.channel.serverId,
        name: data.channel.name,
        type: data.channel.type || 'text',
        description: data.channel.description
      });
      socket.emit('server:channel:created', data.channel);
    }
  });

  socket.on('server:channel:list', async (data) => {
    if (data?.serverId) {
      const channels = await supabaseBackend.getServerChannels(data.serverId);
      socket.emit('server:channel:list', channels);
    }
  });

  socket.on('server:channel:delete', async (data) => {
    if (data?.id) {
      await supabaseBackend.deleteServerChannel(data.id);
      socket.emit('server:channel:deleted', { id: data.id });
    }
  });

  // ── Shorts ────────────────────────────────────────────────────────────────
  socket.on('shorts:request', async () => {
    // Carrega shorts do Supabase e mescla com memória
    const supabaseShorts = await supabaseBackend.getShorts();
    const allShorts = [...shorts];
    supabaseShorts.forEach(s => {
      if (!allShorts.find(existing => existing.id === s.id)) {
        allShorts.push({
          id: s.id,
          title: s.title,
          description: s.description,
          fileUrl: s.file_url,
          fileType: s.file_type,
          username: s.username,
          tags: s.tags,
          timestamp: new Date(s.created_at).getTime()
        });
      }
    });
    // Ordena por timestamp e pega os últimos 50
    allShorts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const recentShorts = allShorts.slice(0, 50);
    // Emite ambos os eventos: 'shorts:history' (index.html) e 'shorts:list' (compat)
    socket.emit('shorts:history', recentShorts);
    socket.emit('shorts:list', recentShorts);
  });

  socket.on('short:create', async (data) => {
    const uname = data.username || users[socket.id]?.username || 'Anônimo';
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const s = { 
      ...data, 
      id: Date.now() + '_' + Math.random().toString(36).slice(2), 
      timestamp: Date.now(), 
      username: uname, 
      time 
    };
    
    // Salva na memória
    shorts.push(s);
    
    // Salva no Supabase
    await supabaseBackend.createShort({
      id: s.id,
      title: s.title,
      description: s.description,
      fileUrl: s.fileUrl,
      fileType: s.fileType || 'image',
      username: s.username,
      tags: s.tags || []
    });
    
    // Emite 'short:new' (esperado pelo index.html) e 'short:update' (compat)
    io.emit('short:new', s);
    io.emit('short:update', s);
  });

  socket.on('short:delete', (data) => {
    const shortId = data.shortId || data.id;
    const idx = shorts.findIndex(s => s.id === shortId);
    if (idx !== -1) shorts.splice(idx, 1);
    // Emite 'short:removed' (esperado pelo index.html) e 'short:delete' (compat)
    io.emit('short:removed', { shortId });
    io.emit('short:delete', { id: shortId });
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
    const uname = username || users[socket.id]?.username || 'Anonimo';
    // Salva username no socket para uso posterior
    socket.username = uname;
    if (!dmVoiceRooms[roomKey]) dmVoiceRooms[roomKey] = [];
    dmVoiceRooms[roomKey] = dmVoiceRooms[roomKey].filter(u => u.socketId !== socket.id);
    const peers = dmVoiceRooms[roomKey].map(u => u.socketId);
    dmVoiceRooms[roomKey].push({ socketId: socket.id, username: uname, avatar: avatar || null });
    socket.dmVoiceRoom = room; socket.dmVoiceRoomKey = roomKey;
    socket.join(room);
    socket.emit('dm:voice-room:peers', { peers, roomKey });
    socket.to(room).emit('dm:voice-room:user-joined', { socketId: socket.id, username: uname, roomKey });
    console.log('[VOICE-ROOM] ' + uname + ' entrou em ' + roomKey + ' | toUser=' + toUser);
    console.log('[VOICE-ROOM] peers na sala:', peers);
    if (toUser) {
      const targetSocket = Object.entries(users).find(([, u]) =>
        u.username?.toLowerCase() === toUser.toLowerCase()
      );
      console.log('[VOICE-ROOM] notificando toUser=' + toUser + ' sid=' + (targetSocket ? targetSocket[0] : 'NAO ENCONTRADO'));
      console.log('[VOICE-ROOM] usuarios online:', Object.values(users).map(u => u.username));
      if (targetSocket) {
        io.to(targetSocket[0]).emit('dm:voice-room:notification', { from: uname, roomKey, action: 'joined' });
        console.log('[VOICE-ROOM] notificacao enviada para', targetSocket[0]);
      } else {
        console.log('[VOICE-ROOM] ERRO: toUser "' + toUser + '" nao encontrado - heartbeat enviado?');
      }
    }
    io.to(room).emit('dm:voice-room:users', { users: dmVoiceRooms[roomKey], roomKey });
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
  res.sendFile(path.join(APP_DIR, 'public', 'index.html'));
});

// ─── Iniciar servidor ────────────────────────────────────────────────────────
function startListen(port) {
  server.listen(port, '0.0.0.0', () => {
    console.log(`✅ Servidor ZX rodando em http://0.0.0.0:${port}`);
    if (process.send) process.send({ type: 'ready', port });
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️  Porta ${PORT} ocupada, tentando porta ${PORT + 1}...`);
    startListen(PORT + 1);
  } else {
    throw err;
  }
});

startListen(PORT);

process.on('SIGINT',  () => { server.close(); process.exit(0); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
