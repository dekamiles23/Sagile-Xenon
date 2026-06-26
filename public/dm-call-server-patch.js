/**
 * dm-call-server-patch.js
 * ========================
 * PATCH DO SERVIDOR — adicione dentro do seu io.on('connection', ...).
 *
 * CAUSA RAIZ DO BUG:
 *   O servidor não possuía handlers para dm:call:start / dm:call:accept /
 *   dm:call:reject / dm:call:end. Resultado: o evento chegava no servidor
 *   mas nunca era encaminhado ao socket do destinatário →
 *   o modal de chamada recebida NUNCA aparecia para o usuário B.
 *
 * COMO INTEGRAR (3 passos):
 *
 *   Passo 1 — Cole o bloco abaixo ANTES do io.on('connection', ...):
 *
 *     const _dmCallUsers = {};  // username.toLowerCase() → socket.id
 *
 *   Passo 2 — Cole dentro do io.on('connection', (socket) => { ... }):
 *
 *     // Registra o socket no mapa ao receber user:status
 *     // (este evento já existe no seu servidor — adicione apenas a linha
 *     //  de registro se ainda não tiver)
 *     socket.on('user:status', function(data) {
 *       if (data && data.username) {
 *         var key = data.username.toLowerCase();
 *         _dmCallUsers[key] = socket.id;
 *         socket._dmUsername = key;
 *       }
 *     });
 *
 *     // Registra os handlers de chamada
 *     _registerDmCallHandlers(io, socket, _dmCallUsers);
 *
 *   Passo 3 — Cole dentro do handler de disconnect:
 *
 *     socket.on('disconnect', function() {
 *       if (socket._dmUsername) delete _dmCallUsers[socket._dmUsername];
 *     });
 *
 * IMPORTANTE:
 *   Se o seu servidor já tem um handler socket.on('user:status', ...)
 *   NÃO duplique o handler — adicione apenas as duas linhas dentro do
 *   handler existente:
 *     var key = data.username.toLowerCase();
 *     _dmCallUsers[key] = socket.id;
 *     socket._dmUsername = key;
 */

/**
 * Encontra o socket.id de um usuário pelo username ou UUID.
 * Tenta múltiplas estratégias para maior robustez.
 *
 * @param {object} io           - instância do Socket.IO server
 * @param {object} usersMap     - { username.toLowerCase() → socket.id }
 * @param {string} toUsername   - username do destinatário (campo 'to')
 * @param {string} toId         - UUID do destinatário (campo 'toId'), pode ser null
 * @returns {string|null}       - socket.id ou null se não encontrado
 */
function _dmCallFindSocketId(io, usersMap, toUsername, toId) {
  // 1. Busca por username no mapa próprio (mais confiável)
  if (toUsername) {
    var byName = usersMap[toUsername.toLowerCase()];
    if (byName) return byName;
  }

  // 2. Busca percorrendo todos os sockets conectados procurando pelo username
  //    (fallback para quando o mapa ainda não foi populado para este usuário)
  if (toUsername) {
    var sockets = io.sockets.sockets;
    // Compatibilidade Socket.IO v3/v4: sockets é um Map
    var found = null;
    if (sockets && typeof sockets.forEach === 'function') {
      sockets.forEach(function(sock) {
        if (!found && sock._dmUsername && sock._dmUsername === toUsername.toLowerCase()) {
          found = sock.id;
        }
        // Também testa _username (nome que outros handlers podem usar)
        if (!found && sock._username && sock._username.toLowerCase() === toUsername.toLowerCase()) {
          found = sock.id;
        }
      });
    }
    if (found) return found;
  }

  // 3. Busca por userId/_userId nos sockets conectados
  if (toId) {
    var sockets2 = io.sockets.sockets;
    var found2 = null;
    if (sockets2 && typeof sockets2.forEach === 'function') {
      sockets2.forEach(function(sock) {
        if (!found2 && (sock._userId === toId || sock._dmUserId === toId)) {
          found2 = sock.id;
        }
      });
    }
    if (found2) return found2;
  }

  return null;
}

/**
 * Registra todos os handlers de chamada DM no socket atual.
 * Chame dentro de io.on('connection', (socket) => { ... }).
 */
function _registerDmCallHandlers(io, socket, usersMap) {

  // ── Resolver username → userId ─────────────────────────────────────────
  // O cliente emite este evento quando não consegue resolver o UUID localmente.
  socket.on('dm:get-user-id', function(data) {
    if (!data || !data.username) return;
    var key = data.username.toLowerCase();
    var targetSocketId = usersMap[key];
    if (!targetSocketId) {
      // Tenta encontrar pelo _username nos sockets conectados
      var sockets = io.sockets.sockets;
      if (sockets && typeof sockets.forEach === 'function') {
        sockets.forEach(function(sock) {
          if (!targetSocketId &&
              ((sock._dmUsername && sock._dmUsername === key) ||
               (sock._username && sock._username.toLowerCase() === key))) {
            targetSocketId = sock.id;
          }
        });
      }
    }
    if (targetSocketId) {
      var targetSock = io.sockets.sockets.get(targetSocketId);
      var userId = targetSock ? (targetSock._userId || targetSock._dmUserId || null) : null;
      socket.emit('dm:user-id', { username: data.username, userId: userId });
    } else {
      socket.emit('dm:user-id', { username: data.username, userId: null });
    }
  });

  // ── Iniciar chamada ────────────────────────────────────────────────────
  // Caller emite 'dm:call:start' → servidor envia 'dm:call:incoming' ao destinatário.
  // Este é o handler que estava FALTANDO e causava o bug.
  socket.on('dm:call:start', function(data) {
    if (!data || !data.to) return;
    var targetSocketId = _dmCallFindSocketId(io, usersMap, data.to, data.toId);
    if (!targetSocketId) return;   // destinatário offline ou não encontrado

    io.to(targetSocketId).emit('dm:call:incoming', {
      from:   data.from   || socket._dmUsername || socket._username || 'Usuário',
      fromId: data.fromId || socket._dmUserId   || socket._userId   || null,
      type:   data.type   || 'voice'
    });
  });

  // ── Aceitar chamada ────────────────────────────────────────────────────
  socket.on('dm:call:accept', function(data) {
    if (!data || !data.to) return;
    var targetSocketId = _dmCallFindSocketId(io, usersMap, data.to, data.toId);
    if (!targetSocketId) return;

    io.to(targetSocketId).emit('dm:call:accepted', {
      from:   data.from   || socket._dmUsername || socket._username || 'Usuário',
      fromId: data.fromId || socket._dmUserId   || socket._userId   || null
    });
  });

  // ── Rejeitar chamada ───────────────────────────────────────────────────
  socket.on('dm:call:reject', function(data) {
    if (!data || !data.to) return;
    var targetSocketId = _dmCallFindSocketId(io, usersMap, data.to, data.toId);
    if (!targetSocketId) return;

    io.to(targetSocketId).emit('dm:call:rejected', {
      from:   data.from   || socket._dmUsername || socket._username || 'Usuário',
      fromId: data.fromId || socket._dmUserId   || socket._userId   || null
    });
  });

  // ── Encerrar chamada ───────────────────────────────────────────────────
  socket.on('dm:call:end', function(data) {
    if (!data || !data.to) return;
    var targetSocketId = _dmCallFindSocketId(io, usersMap, data.to, data.toId);
    if (!targetSocketId) return;

    io.to(targetSocketId).emit('dm:call:ended', {
      from:   data.from   || socket._dmUsername || socket._username || 'Usuário',
      fromId: data.fromId || socket._dmUserId   || socket._userId   || null
    });
  });

  // ── WebRTC: offer ──────────────────────────────────────────────────────
  socket.on('dm:voice:offer', function(data) {
    if (!data || !data.to) return;
    var targetSocketId = _dmCallFindSocketId(io, usersMap, data.to, data.toId);
    if (!targetSocketId) return;

    io.to(targetSocketId).emit('dm:voice:offer', {
      from:   data.from   || socket._dmUsername || socket._username || 'Usuário',
      fromId: data.fromId || socket._dmUserId   || socket._userId   || null,
      offer:  data.offer
    });
  });

  // ── WebRTC: answer ─────────────────────────────────────────────────────
  socket.on('dm:voice:answer', function(data) {
    if (!data || !data.to) return;
    var targetSocketId = _dmCallFindSocketId(io, usersMap, data.to, data.toId);
    if (!targetSocketId) return;

    io.to(targetSocketId).emit('dm:voice:answer', {
      from:   data.from   || socket._dmUsername || socket._username || 'Usuário',
      fromId: data.fromId || socket._dmUserId   || socket._userId   || null,
      answer: data.answer
    });
  });

  // ── WebRTC: ICE candidate ──────────────────────────────────────────────
  socket.on('dm:voice:ice', function(data) {
    if (!data || !data.to) return;
    var targetSocketId = _dmCallFindSocketId(io, usersMap, data.to, data.toId);
    if (!targetSocketId) return;

    io.to(targetSocketId).emit('dm:voice:ice', {
      from:      data.from      || socket._dmUsername || socket._username || 'Usuário',
      fromId:    data.fromId    || socket._dmUserId   || socket._userId   || null,
      candidate: data.candidate
    });
  });
}

// Exporta para uso em Node.js/CommonJS se necessário
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { _registerDmCallHandlers: _registerDmCallHandlers };
}
