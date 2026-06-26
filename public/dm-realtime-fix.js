/**
 * dm-realtime-fix.js
 * ====================
 * BUGS CORRIGIDOS:
 *
 *   1. friendIds nunca era populado quando o script carregava antes do socket
 *      estar disponível: o bloco if(window.socket) executava com socket=undefined
 *      e os listeners de 'friends:data' / 'dm:user-id' nunca eram registrados.
 *      FIX: usa o mesmo padrão de polling de dm-call-system.js — aguarda o
 *      socket estar disponível antes de registrar os listeners.
 *
 *   2. 'dm:user-id' chegava do servidor mas _dmCallPendingUserId era null
 *      (porque o callback era definido em dm-call-system.js mas este arquivo
 *      sobrescrevia o listener no socket). Agora o listener chama o callback
 *      global window._dmCallPendingUserId se existir.
 */

(function() {
  function attachDmRealtimeListeners(socket) {
    // Popula window.friendIds com o mapa username→UUID recebido do servidor
    socket.on('friends:data', function(data) {
      if (!data) return;

      // Salva o próprio userId se vier no payload
      if (data.userId) {
        window.myUserId = data.userId;
        localStorage.setItem('zx_my_user_id', data.userId);
      }

      // Constrói o mapa friendIds: { username.toLowerCase() → UUID }
      if (!window.friendIds) window.friendIds = {};

      var list = data.friends || data.friendsList || data.data || [];
      if (Array.isArray(list)) {
        list.forEach(function(f) {
          if (!f) return;
          var uname = (f.username || f.name || '').toLowerCase();
          var uid   = f.id || f.userId || f.uuid || null;
          if (uname && uid) window.friendIds[uname] = uid;
        });
      }

      // Suporte a formato alternativo: objeto { userId: UUID } indexado por username
      if (data.friends && !Array.isArray(data.friends)) {
        Object.keys(data.friends).forEach(function(uname) {
          var entry = data.friends[uname];
          var uid   = (typeof entry === 'string') ? entry : (entry && (entry.id || entry.userId));
          if (uname && uid) window.friendIds[uname.toLowerCase()] = uid;
        });
      }
    });

    // Resposta do servidor ao dm:get-user-id — dispara o callback pendente
    socket.on('dm:user-id', function(data) {
      if (!data || !data.username) return;
      // Armazena no mapa global para uso futuro
      if (data.userId) {
        if (!window.friendIds) window.friendIds = {};
        window.friendIds[data.username.toLowerCase()] = data.userId;
      }
      // Notifica dm-call-system.js se houver chamada pendente aguardando este ID
      if (typeof window._dmCallPendingUserId === 'function') {
        window._dmCallPendingUserId(data.username, data.userId || null);
      }
    });
  }

  // Aguarda o socket estar disponível antes de registrar os listeners
  if (window.socket) {
    attachDmRealtimeListeners(window.socket);
  } else {
    var timer = setInterval(function() {
      if (window.socket) {
        clearInterval(timer);
        attachDmRealtimeListeners(window.socket);
      }
    }, 300);
    setTimeout(function() { clearInterval(timer); }, 20000);
  }
})();
