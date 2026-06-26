/**
 * dm-voice-room-server-patch.js
 * ==============================
 * PATCH PARA O server.js — Sistema de Sala de Voz Privada para DMs
 *
 * INSTRUÇÕES:
 *   1. No server.js, encontre a linha:  const voiceRooms = {};
 *      Logo abaixo, adicione:           const dmVoiceRooms = {};
 *
 *   2. Dentro do bloco io.on('connection', (socket) => { ... }),
 *      adicione todos os eventos abaixo (pode colar antes do evento 'disconnect').
 *
 *   3. No handler de 'disconnect', adicione o bloco de limpeza (indicado abaixo).
 *
 *   4. No index.html ou onde os scripts são carregados, adicione:
 *      <script src="dm-voice-room-system.js"></script>
 *      (DEPOIS do dm-call-system.js, se este ainda existir — o novo sobrescreve startDmVoiceCall)
 */

// ============================================================
// 1) ADICIONE LOGO APÓS: const voiceRooms = {};
// ============================================================

const dmVoiceRooms = {};   // roomKey ("userA|userB") -> [{ socketId, username, avatar }]

// ============================================================
// 2) ADICIONE DENTRO DE io.on('connection', ...) — antes do 'disconnect'
// ============================================================

  // ── SISTEMA DE SALA DE VOZ PRIVADA (DM) ─────────────────────────────────

  // Entrar na sala de voz privada
  socket.on('dm:voice-room:join', ({ roomKey, username, toUser, avatar }) => {
    if (!roomKey) return;

    const room = 'dm-voice-room:' + roomKey;
    const uname = username || socket.username || 'Anônimo';

    // Remove entrada anterior deste socket nesta sala (se houver)
    if (!dmVoiceRooms[roomKey]) dmVoiceRooms[roomKey] = [];
    dmVoiceRooms[roomKey] = dmVoiceRooms[roomKey].filter(u => u.socketId !== socket.id);

    // Lista de peers ANTES de entrar (para quem acabou de entrar criar offers)
    const peers = dmVoiceRooms[roomKey].map(u => u.socketId);

    // Adiciona o novo membro
    dmVoiceRooms[roomKey].push({ socketId: socket.id, username: uname, avatar: avatar || null });

    // Salva no socket para limpeza no disconnect
    socket.dmVoiceRoom    = room;
    socket.dmVoiceRoomKey = roomKey;

    // Entra na room do Socket.IO
    socket.join(room);

    // Diz ao entrante quem já estava na sala
    socket.emit('dm:voice-room:peers', { peers, roomKey });

    // Avisa os já presentes que alguém novo entrou
    socket.to(room).emit('dm:voice-room:user-joined', {
      socketId: socket.id,
      username: uname,
      roomKey
    });

    // Notifica o outro usuário da DM (mesmo fora da sala) para exibir o botão "Entrar"
    if (toUser) {
      _voiceEmit(null, toUser, 'dm:voice-room:notification', {
        from:     uname,
        roomKey,
        action:   'joined'
      });
    }

    // Atualiza lista de usuários na sala para todos
    io.to(room).emit('dm:voice-room:users', {
      users: dmVoiceRooms[roomKey],
      roomKey
    });

    console.log(`[DM-VOICE-ROOM] ${uname} entrou na sala ${roomKey} (${peers.length} peers já presentes)`);
  });

  // Sair da sala de voz privada
  socket.on('dm:voice-room:leave', ({ roomKey: rk } = {}) => {
    const key  = rk || socket.dmVoiceRoomKey;
    const room = 'dm-voice-room:' + key;
    if (!key) return;

    if (dmVoiceRooms[key]) {
      dmVoiceRooms[key] = dmVoiceRooms[key].filter(u => u.socketId !== socket.id);
      if (dmVoiceRooms[key].length === 0) delete dmVoiceRooms[key];
    }

    socket.to(room).emit('dm:voice-room:user-left', {
      socketId: socket.id,
      username: socket.username,
      roomKey: key
    });
    io.to(room).emit('dm:voice-room:users', {
      users: dmVoiceRooms[key] || [],
      roomKey: key
    });

    socket.leave(room);
    socket.dmVoiceRoom    = null;
    socket.dmVoiceRoomKey = null;

    console.log(`[DM-VOICE-ROOM] ${socket.username || socket.id} saiu da sala ${key}`);
  });

  // WebRTC: repassar offer (baseado em socketId)
  socket.on('dm:voice-room:offer', ({ to, offer, roomKey }) => {
    if (!to || !offer) return;
    io.to(to).emit('dm:voice-room:offer', {
      from:     socket.id,
      offer,
      username: socket.username,
      roomKey
    });
  });

  // WebRTC: repassar answer
  socket.on('dm:voice-room:answer', ({ to, answer, roomKey }) => {
    if (!to || !answer) return;
    io.to(to).emit('dm:voice-room:answer', {
      from:    socket.id,
      answer,
      roomKey
    });
  });

  // WebRTC: repassar ICE candidate
  socket.on('dm:voice-room:ice', ({ to, candidate, roomKey }) => {
    if (!to || !candidate) return;
    io.to(to).emit('dm:voice-room:ice', {
      from:      socket.id,
      candidate,
      roomKey
    });
  });

// ============================================================
// 3) NO HANDLER 'disconnect', ADICIONE ESTE BLOCO:
//    (logo após o bloco de limpeza de voiceRoom existente)
// ============================================================

    // Limpeza de sala de voz privada DM
    if (socket.dmVoiceRoomKey) {
      const key  = socket.dmVoiceRoomKey;
      const room = 'dm-voice-room:' + key;
      if (dmVoiceRooms[key]) {
        dmVoiceRooms[key] = dmVoiceRooms[key].filter(u => u.socketId !== socket.id);
        if (dmVoiceRooms[key].length === 0) delete dmVoiceRooms[key];
      }
      socket.to(room).emit('dm:voice-room:user-left', {
        socketId: socket.id,
        username: socket.username
      });
      io.to(room).emit('dm:voice-room:users', {
        users: dmVoiceRooms[key] || [],
        roomKey: key
      });
    }
