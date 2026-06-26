// call-debug.js — Diagnóstico de chamadas de voz
// Abre o DevTools (Ctrl+Shift+I) para ver os logs

(function () {
  var LOG = function (msg, data) {
    var str = '[CALL-DEBUG] ' + msg;
    if (data !== undefined) console.log(str, data);
    else console.log(str);
  };

  function attachDebugToSocket(sock) {
    LOG('Socket conectado, id=' + sock.id);

    // Intercepta emit para logar chamadas saindo
    var origEmit = sock.emit.bind(sock);
    sock.emit = function (event) {
      if (event && (event.startsWith('dm:call') || event.startsWith('dm:voice-room') || event === 'user:heartbeat')) {
        LOG('EMIT → ' + event, arguments[1]);
      }
      return origEmit.apply(sock, arguments);
    };

    // Loga todos os eventos de chamada chegando
    var watchEvents = [
      'dm:call:incoming', 'dm:call:accepted', 'dm:call:rejected', 'dm:call:ended', 'dm:call:error',
      'dm:voice-room:notification', 'dm:voice-room:peers', 'dm:voice-room:user-joined',
      'dm:voice-room:user-left', 'dm:voice-room:users'
    ];

    watchEvents.forEach(function (ev) {
      sock.on(ev, function (data) {
        LOG('RECV ← ' + ev, data);
      });
    });

    sock.on('connect', function () {
      LOG('Socket reconectado, novo id=' + sock.id);
    });

    sock.on('disconnect', function (reason) {
      LOG('Socket desconectado, reason=' + reason);
    });
  }

  function waitForSocket() {
    if (window.socket) {
      attachDebugToSocket(window.socket);
      // Loga o username registrado
      setTimeout(function () {
        var u = window.username || window.currentUsername || localStorage.getItem('zx_username');
        LOG('Username local = ' + u);
        LOG('Socket conectado = ' + window.socket.connected);
      }, 2000);
    } else {
      setTimeout(waitForSocket, 300);
    }
  }

  waitForSocket();
  LOG('call-debug.js carregado — abra o DevTools para ver os logs');
})();
