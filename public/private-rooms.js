// ============================================================
// private-rooms.js – Sistema de Salas Privadas
// ============================================================

window.privateRoomsState = {
  currentRoom: null,
  rooms: [],
  messages: {}
};

// ============================================================
// CRIAR SALA PRIVADA
// ============================================================

/**
 * Cria uma nova sala privada
 * @param {string} name - Nome da sala
 */
window.createPrivateRoom = function(name) {
  if (!window.socket || !window.socket.connected) {
    if (typeof showToast === 'function') showToast('❌ Sem conexão com o servidor');
    return;
  }

  const roomName = name || 'Sala Privada';
  window.socket.emit('private-room:create', { name: roomName });
};

// ============================================================
// LISTAR SALAS
// ============================================================

/**
 * Solicita a lista de salas do usuário
 */
window.listPrivateRooms = function() {
  if (!window.socket || !window.socket.connected) return;
  window.socket.emit('private-room:list');
};

// ============================================================
// ENTRAR EM SALA
// ============================================================

/**
 * Entra em uma sala privada
 * @param {string} roomId - ID da sala
 */
window.joinPrivateRoom = function(roomId) {
  if (!window.socket || !window.socket.connected) {
    if (typeof showToast === 'function') showToast('❌ Sem conexão com o servidor');
    return;
  }

  window.socket.emit('private-room:join', { roomId });
};

// ============================================================
// SAIR DE SALA
// ============================================================

/**
 * Sai de uma sala privada
 * @param {string} roomId - ID da sala
 */
window.leavePrivateRoom = function(roomId) {
  if (!window.socket || !window.socket.connected) return;
  window.socket.emit('private-room:leave', { roomId });
  window.privateRoomsState.currentRoom = null;
};

// ============================================================
// ENVIAR MENSAGEM
// ============================================================

/**
 * Envia uma mensagem para a sala privada atual
 * @param {string} text - Texto da mensagem
 */
window.sendPrivateRoomMessage = function(text) {
  if (!window.socket || !window.socket.connected) {
    if (typeof showToast === 'function') showToast('❌ Sem conexão com o servidor');
    return;
  }

  if (!window.privateRoomsState.currentRoom) {
    if (typeof showToast === 'function') showToast('⚠️ Nenhuma sala selecionada');
    return;
  }

  if (!text || text.trim() === '') return;

  window.socket.emit('private-room:message', {
    roomId: window.privateRoomsState.currentRoom,
    text: text.trim()
  });
};

// ============================================================
// CONVIDAR USUÁRIO
// ============================================================

/**
 * Convida um usuário para a sala privada atual
 * @param {string} username - Nome do usuário a convidar
 */
window.inviteToPrivateRoom = function(username) {
  if (!window.socket || !window.socket.connected) {
    if (typeof showToast === 'function') showToast('❌ Sem conexão com o servidor');
    return;
  }

  if (!window.privateRoomsState.currentRoom) {
    if (typeof showToast === 'function') showToast('⚠️ Nenhuma sala selecionada');
    return;
  }

  if (!username) {
    if (typeof showToast === 'function') showToast('⚠️ Digite o nome do usuário');
    return;
  }

  window.socket.emit('private-room:invite', {
    roomId: window.privateRoomsState.currentRoom,
    username: username
  });
};

// ============================================================
// BIND DE EVENTOS SOCKET
// ============================================================

/**
 * Registra os listeners de eventos de salas privadas
 */
function bindPrivateRoomEvents() {
  if (!window.socket) return;
  if (window.socket._privateRoomBound) return;
  window.socket._privateRoomBound = true;

  // Sala criada
  window.socket.on('private-room:created', function(data) {
    console.log('[PRIVATE-ROOM] Sala criada:', data);
    if (typeof showToast === 'function') showToast('✅ Sala criada: ' + data.name);
    window.listPrivateRooms();
    window.joinPrivateRoom(data.roomId);
  });

  // Lista de salas recebida
  window.socket.on('private-room:list', function(rooms) {
    console.log('[PRIVATE-ROOM] Salas recebidas:', rooms);
    window.privateRoomsState.rooms = rooms;
    
    // Dispara evento customizado para UI
    const event = new CustomEvent('private-rooms-updated', { detail: rooms });
    document.dispatchEvent(event);
  });

  // Entrou na sala
  window.socket.on('private-room:joined', function(data) {
    console.log('[PRIVATE-ROOM] Entrou na sala:', data);
    window.privateRoomsState.currentRoom = data.roomId;
    if (typeof showToast === 'function') showToast('🚪 Entrou em: ' + data.name);
    
    const event = new CustomEvent('private-room-joined', { detail: data });
    document.dispatchEvent(event);
  });

  // Usuário entrou na sala
  window.socket.on('private-room:user-joined', function(data) {
    console.log('[PRIVATE-ROOM] Usuário entrou:', data);
    if (typeof showToast === 'function') showToast('👤 ' + data.username + ' entrou na sala');
    
    const event = new CustomEvent('private-room-user-joined', { detail: data });
    document.dispatchEvent(event);
  });

  // Usuário saiu da sala
  window.socket.on('private-room:user-left', function(data) {
    console.log('[PRIVATE-ROOM] Usuário saiu:', data);
    if (typeof showToast === 'function') showToast('👤 ' + data.username + ' saiu da sala');
    
    const event = new CustomEvent('private-room-user-left', { detail: data });
    document.dispatchEvent(event);
  });

  // Mensagem recebida
  window.socket.on('private-room:message', function(data) {
    console.log('[PRIVATE-ROOM] Mensagem recebida:', data);
    
    if (!window.privateRoomsState.messages[data.roomId]) {
      window.privateRoomsState.messages[data.roomId] = [];
    }
    window.privateRoomsState.messages[data.roomId].push(data);
    
    const event = new CustomEvent('private-room-message', { detail: data });
    document.dispatchEvent(event);
  });

  // Histórico recebido
  window.socket.on('private-room:history', function(data) {
    console.log('[PRIVATE-ROOM] Histórico recebido:', data);
    window.privateRoomsState.messages[data.roomId] = data.messages;
    
    const event = new CustomEvent('private-room-history', { detail: data });
    document.dispatchEvent(event);
  });

  // Convite recebido
  window.socket.on('private-room:invited', function(data) {
    console.log('[PRIVATE-ROOM] Convite recebido:', data);
    var event = new CustomEvent('private-room-invite-received', { detail: data });
    document.dispatchEvent(event);
  });
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

// Tenta registrar eventos quando o socket estiver disponível
function tryBindEvents() {
  if (window.socket && window.socket.connected) {
    bindPrivateRoomEvents();
    window.listPrivateRooms();
  } else {
    setTimeout(tryBindEvents, 500);
  }
}

// Inicia quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryBindEvents);
} else {
  tryBindEvents();
}
