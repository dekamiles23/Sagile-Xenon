/**
 * dm-voice-room-system.js
 * =======================
 * Sistema de sala de voz privada para DMs.
 *
 * SUBSTITUIÇÃO DO SISTEMA DE CHAMADA:
 *   Em vez de "ligar" para o outro usuário (que causava bugs de socket),
 *   este sistema cria uma SALA de voz permanente por conversa DM.
 *   Qualquer um dos dois usuários pode entrar ou sair quando quiser.
 *   Quando alguém entra, o outro recebe uma notificação discreta com botão "Entrar".
 *
 * LAYOUT:
 *   - Mesmo visual do dm-call-system.js (barra persistente + tela fullscreen)
 *   - Barra persistente aparece enquanto estiver na sala
 *   - Tela fullscreen mostra avatar + status + controles
 *
 * COMO FUNCIONA:
 *   1. User A clica no botão de chamada de voz na DM
 *   2. User A entra na sala (emite dm:voice-room:join)
 *   3. Servidor notifica User B: "User A está na sala de voz"
 *   4. User B vê toast com botão "Entrar na sala"
 *   5. Ambos conversam via WebRTC (socketId-based)
 *
 * INTEGRAÇÃO:
 *   - Sobrescreve window.startDmVoiceCall para usar salas
 *   - Compatível com private-chat-system.js e dm-call-system.js
 *   - Requer suporte a dm:voice-room:* no server.js (ver server-patch abaixo)
 *
 * SERVER EVENTS (precisam ser adicionados ao server.js):
 *   Recebe: dm:voice-room:join, dm:voice-room:leave
 *           dm:voice-room:offer, dm:voice-room:answer, dm:voice-room:ice
 *   Emite:  dm:voice-room:peers, dm:voice-room:users
 *           dm:voice-room:user-joined, dm:voice-room:user-left
 *           dm:voice-room:notification
 */

(function () {
  'use strict';

  // ============================================================
  // ESTADO GLOBAL DA SALA
  // ============================================================

  window.dmVoiceRoomState = window.dmVoiceRoomState || {
    inRoom:        false,
    roomKey:       null,   // "userA|userB" (sorted)
    otherUser:     null,   // username do outro participante na DM
    localStream:   null,
    remoteAudio:   null,
    peers:         {},     // socketId -> RTCPeerConnection
    micEnabled:    true,
    audioEnabled:  true,
    startTime:     null,
    timerInterval: null,
    _bound:        false
  };

  // ============================================================
  // UTILIDADES
  // ============================================================

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function dmRoomKey(a, b) {
    return [a, b].sort().join('|');
  }

  function formatDuration(secs) {
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  function getMyUsername() {
    return window.username || window.currentUsername ||
      localStorage.getItem('zx_username') || 'Eu';
  }

  function showToastDVR(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
      return;
    }
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
      'background:#222;color:#fff;padding:10px 18px;border-radius:8px;z-index:9999999;' +
      'font-size:14px;pointer-events:none;opacity:1;transition:opacity 0.4s;';
    document.body.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 400); }, 3000);
  }

  // ============================================================
  // ESTILOS (mesmo visual do dm-call-system.js)
  // ============================================================

  function injectDVRStyles() {
    if (document.getElementById('dvr-styles')) return;
    var style = document.createElement('style');
    style.id = 'dvr-styles';
    style.textContent = `
      /* ── Barra persistente ── */
      #dvr-persistent-bar {
        position: fixed !important;
        bottom: 30px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 2147483647 !important;
        background: rgba(10,10,20,0.97) !important;
        backdrop-filter: blur(24px) !important;
        border: 1px solid #00ff88 !important;
        border-radius: 60px !important;
        padding: 12px 24px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 20px !important;
        box-shadow: 0 0 40px rgba(0,255,136,0.45), 0 8px 32px rgba(0,0,0,0.6) !important;
        min-width: 520px !important;
        max-width: 90vw !important;
        animation: dvrBarIn 0.35s cubic-bezier(0.34,1.56,0.64,1) !important;
        pointer-events: auto !important;
      }
      #dvr-persistent-bar.dvr-hidden { display: none !important; }
      @keyframes dvrBarIn {
        from { opacity: 0; transform: translateX(-50%) translateY(80px) scale(0.9); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
      }
      .dvr-bar-left  { display: flex; align-items: center; gap: 14px; }
      .dvr-bar-pulse { font-size: 22px; animation: dvrPulse 1.4s ease-in-out infinite; }
      @keyframes dvrPulse {
        0%,100% { opacity: 1; transform: scale(1); }
        50%     { opacity: 0.6; transform: scale(0.9); }
      }
      .dvr-bar-info   { display: flex; flex-direction: column; gap: 3px; }
      .dvr-bar-title  { color: #fff; font-weight: 600; font-size: 14px; white-space: nowrap; }
      .dvr-bar-sub    { color: #aaa; font-size: 12px; display: flex; align-items: center; gap: 6px; }
      .dvr-bar-controls { display: flex; align-items: center; gap: 8px; }
      .dvr-btn {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
        color: #fff;
        padding: 8px 14px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .dvr-btn:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.25); }
      .dvr-btn.muted  { background: rgba(237,66,69,0.25)!important; border-color: rgba(237,66,69,0.5)!important; color: #ed4245!important; }
      .dvr-btn-green  { background: rgba(0,255,136,0.15)!important; border-color: rgba(0,255,136,0.4)!important; color: #00ff88!important; }
      .dvr-btn-green:hover { background: rgba(0,255,136,0.28)!important; }
      .dvr-btn-red    { background: rgba(237,66,69,0.15)!important; border-color: rgba(237,66,69,0.4)!important; color: #ed4245!important; }
      .dvr-btn-red:hover { background: rgba(237,66,69,0.28)!important; }
      @media(max-width:600px) {
        #dvr-persistent-bar {
          min-width: auto!important; width: calc(100vw - 32px)!important;
          padding: 10px 14px!important; gap: 10px!important;
          border-radius: 20px!important; bottom: 20px!important;
        }
        .dvr-bar-sub { display: none; }
      }

      /* ── Tela fullscreen ── */
      #dvr-fullscreen {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483646 !important;
        background: radial-gradient(ellipse at center, #0d001f 0%, #040008 100%) !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        animation: dvrScreenIn 0.3s ease-out !important;
      }
      @keyframes dvrScreenIn { from { opacity: 0; } to { opacity: 1; } }
      .dvr-fs-avatar {
        width: 120px; height: 120px; border-radius: 50%;
        background: linear-gradient(135deg, #8b00ff, #ff00ff);
        display: flex; align-items: center; justify-content: center;
        font-size: 52px; font-weight: 700; color: #fff;
        box-shadow: 0 0 60px rgba(0,255,136,0.5), 0 0 120px rgba(0,255,136,0.2);
        animation: dvrAvatarPulse 2s ease-in-out infinite;
        margin-bottom: 24px; overflow: hidden;
        background-size: cover; background-position: center;
      }
      @keyframes dvrAvatarPulse {
        0%,100% { box-shadow: 0 0 40px rgba(0,255,136,0.5), 0 0 80px rgba(0,255,136,0.2); }
        50%     { box-shadow: 0 0 80px rgba(0,255,136,0.8), 0 0 160px rgba(0,255,136,0.3); }
      }
      .dvr-fs-name   { color: #fff; font-size: 28px; font-weight: 700; margin-bottom: 8px; text-shadow: 0 0 20px rgba(0,255,136,0.4); }
      .dvr-fs-status { color: #00ff88; font-size: 16px; margin-bottom: 48px; letter-spacing: 0.5px; }
      .dvr-fs-controls { display: flex; align-items: center; gap: 24px; }
      .dvr-fs-btn {
        width: 64px; height: 64px; border-radius: 50%; border: none;
        display: flex; align-items: center; justify-content: center;
        font-size: 26px; cursor: pointer; transition: all 0.2s;
      }
      .dvr-fs-btn:hover { transform: scale(1.1); }
      .dvr-fs-btn.mic-btn { background: rgba(255,255,255,0.12); color: #fff; }
      .dvr-fs-btn.mic-btn.muted { background: rgba(237,66,69,0.3); color: #ed4245; }
      .dvr-fs-btn.spk-btn { background: rgba(255,255,255,0.12); color: #fff; }
      .dvr-fs-btn.min-btn { background: rgba(255,200,0,0.15); color: #ffd700; }
      .dvr-fs-btn.end-btn {
        background: #ed4245; color: #fff;
        width: 72px; height: 72px; font-size: 28px;
        box-shadow: 0 0 20px rgba(237,66,69,0.5);
      }
      .dvr-fs-btn.end-btn:hover { background: #c0392b; }

      /* ── Toast de notificação de sala ── */
      .dvr-room-toast {
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        z-index: 2147483645 !important;
        background: rgba(10,10,20,0.97) !important;
        border: 1px solid rgba(0,255,136,0.5) !important;
        border-radius: 14px !important;
        padding: 14px 18px !important;
        display: flex !important;
        align-items: center !important;
        gap: 14px !important;
        box-shadow: 0 0 30px rgba(0,255,136,0.3) !important;
        animation: dvrToastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) !important;
        min-width: 260px !important;
        max-width: 340px !important;
      }
      @keyframes dvrToastIn {
        from { opacity: 0; transform: translateX(60px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      .dvr-toast-icon  { font-size: 26px; flex-shrink: 0; }
      .dvr-toast-body  { flex: 1; }
      .dvr-toast-title { color: #fff; font-weight: 600; font-size: 13px; margin-bottom: 2px; }
      .dvr-toast-sub   { color: #aaa; font-size: 12px; }
      .dvr-toast-join  {
        background: rgba(0,255,136,0.15); border: 1px solid rgba(0,255,136,0.4);
        color: #00ff88; border-radius: 8px; padding: 6px 12px;
        cursor: pointer; font-size: 13px; font-weight: 600;
        white-space: nowrap; flex-shrink: 0; transition: all 0.15s;
      }
      .dvr-toast-join:hover { background: rgba(0,255,136,0.3); }
      .dvr-toast-close {
        background: none; border: none; color: #666;
        cursor: pointer; font-size: 16px; line-height: 1;
        padding: 2px 4px; flex-shrink: 0;
      }
      .dvr-toast-close:hover { color: #aaa; }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // BARRA PERSISTENTE
  // ============================================================

  function createDVRBar() {
    if (document.getElementById('dvr-persistent-bar')) return;
    injectDVRStyles();

    var bar = document.createElement('div');
    bar.id = 'dvr-persistent-bar';
    bar.className = 'dvr-hidden';
    bar.innerHTML =
      '<div class="dvr-bar-left">' +
        '<div class="dvr-bar-pulse">🔊</div>' +
        '<div class="dvr-bar-info">' +
          '<div class="dvr-bar-title">Sala de voz com <span id="dvr-bar-user" style="color:#00ff88;font-weight:700;"></span></div>' +
          '<div class="dvr-bar-sub">' +
            '<span id="dvr-bar-status" style="color:#aaa;">● Aguardando...</span>' +
            '<span style="color:#555;">•</span>' +
            '<span id="dvr-bar-timer">00:00</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="dvr-bar-controls">' +
        '<button class="dvr-btn" id="dvr-bar-mic" title="Microfone">🎙</button>' +
        '<button class="dvr-btn" id="dvr-bar-spk" title="Áudio">🔊</button>' +
        '<button class="dvr-btn dvr-btn-green" id="dvr-bar-expand">💬 Expandir</button>' +
        '<button class="dvr-btn dvr-btn-red"   id="dvr-bar-leave">📴 Sair da sala</button>' +
      '</div>';
    document.body.appendChild(bar);

    document.getElementById('dvr-bar-mic').addEventListener('click', toggleDVRMic);
    document.getElementById('dvr-bar-spk').addEventListener('click', toggleDVRAudio);
    document.getElementById('dvr-bar-expand').addEventListener('click', openDVRFullscreen);
    document.getElementById('dvr-bar-leave').addEventListener('click', leaveDVRRoom);
  }

  function showDVRBar(otherUser) {
    createDVRBar();
    var el = document.getElementById('dvr-bar-user');
    if (el) el.textContent = otherUser || '...';
    var bar = document.getElementById('dvr-persistent-bar');
    if (bar) bar.classList.remove('dvr-hidden');
  }

  function hideDVRBar() {
    var bar = document.getElementById('dvr-persistent-bar');
    if (bar) bar.classList.add('dvr-hidden');
  }

  function updateDVRBarStatus(text, color) {
    var el = document.getElementById('dvr-bar-status');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#aaa';
  }

  function startDVRTimer() {
    var state = window.dmVoiceRoomState;
    state.startTime = Date.now();
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(function () {
      var el = document.getElementById('dvr-bar-timer');
      if (!el || !state.inRoom) { clearInterval(state.timerInterval); return; }
      var secs = Math.floor((Date.now() - state.startTime) / 1000);
      el.textContent = formatDuration(secs);
    }, 500);
  }

  // ============================================================
  // TELA FULLSCREEN
  // ============================================================

  function openDVRFullscreen() {
    var state = window.dmVoiceRoomState;
    if (!state.inRoom) return;
    var username = state.otherUser || '...';
    var initial  = (username || '?')[0].toUpperCase();

    var existing = document.getElementById('dvr-fullscreen');
    if (existing) existing.remove();

    var screen = document.createElement('div');
    screen.id = 'dvr-fullscreen';
    screen.innerHTML =
      '<div class="dvr-fs-avatar" id="dvr-fs-avatar">' + escHtml(initial) + '</div>' +
      '<div class="dvr-fs-name">' + escHtml(username) + '</div>' +
      '<div class="dvr-fs-status" id="dvr-fs-status">● Aguardando...</div>' +
      '<div class="dvr-fs-controls">' +
        '<button class="dvr-fs-btn mic-btn' + (state.micEnabled ? '' : ' muted') + '" id="dvr-fs-mic">' +
          (state.micEnabled ? '🎙' : '🔇') + '</button>' +
        '<button class="dvr-fs-btn spk-btn" id="dvr-fs-spk">' +
          (state.audioEnabled ? '🔊' : '🔕') + '</button>' +
        '<button class="dvr-fs-btn min-btn" id="dvr-fs-min">⬇</button>' +
        '<button class="dvr-fs-btn end-btn" id="dvr-fs-end">📴</button>' +
      '</div>';
    document.body.appendChild(screen);

    // Carrega avatar se disponível
    var avatarEl = document.getElementById('dvr-fs-avatar');
    if (avatarEl) {
      var avatarUrl = _getDVRAvatarFor(username);
      if (avatarUrl) {
        avatarEl.style.backgroundImage = 'url(' + avatarUrl + ')';
        avatarEl.style.backgroundSize  = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.textContent = '';
      }
    }

    // Atualiza status dinamicamente
    if (Object.keys(state.peers).length > 0) {
      _updateFSStatus();
    } else {
      var statusEl = document.getElementById('dvr-fs-status');
      if (statusEl) statusEl.textContent = '● Aguardando ' + escHtml(username) + '...';
    }

    document.getElementById('dvr-fs-mic').addEventListener('click', function () {
      toggleDVRMic();
      this.classList.toggle('muted', !state.micEnabled);
      this.textContent = state.micEnabled ? '🎙' : '🔇';
    });

    document.getElementById('dvr-fs-spk').addEventListener('click', function () {
      toggleDVRAudio();
      this.textContent = state.audioEnabled ? '🔊' : '🔕';
    });

    document.getElementById('dvr-fs-min').addEventListener('click', function () {
      var sc = document.getElementById('dvr-fullscreen');
      if (sc) sc.remove();
      showToastDVR('🔊 Sala minimizada');
    });

    document.getElementById('dvr-fs-end').addEventListener('click', leaveDVRRoom);
  }

  function _updateFSStatus() {
    var state = window.dmVoiceRoomState;
    var count = Object.keys(state.peers).length;
    var statusEl = document.getElementById('dvr-fs-status');
    if (!statusEl) return;
    if (count > 0) {
      var secs = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
      statusEl.textContent = '● Em chamada · ' + formatDuration(secs);
      statusEl.style.color = '#00ff88';
    } else {
      statusEl.textContent = '● Aguardando ' + escHtml(state.otherUser || '...') + '...';
      statusEl.style.color = '#aaa';
    }
  }

  // Cache de avatares para uso no fullscreen
  var _dvrAvatarCache = {};
  function _getDVRAvatarFor(username) {
    if (_dvrAvatarCache[username]) return _dvrAvatarCache[username];
    // Tenta buscar do DOM (lista de DMs)
    var items = document.querySelectorAll('[data-username]');
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      if ((el.dataset.username || '').toLowerCase() === username.toLowerCase()) {
        var img = el.querySelector('img');
        if (img && img.src) { _dvrAvatarCache[username] = img.src; return img.src; }
      }
    }
    return null;
  }

  // ============================================================
  // NOTIFICAÇÃO DE SALA PARA O OUTRO USUÁRIO
  // ============================================================

  function showDVRRoomNotification(fromUser, roomKey) {
    var existingToast = document.getElementById('dvr-room-toast');
    if (existingToast) existingToast.remove();

    injectDVRStyles();

    // Toca som de chamada
    try {
      var ring = new Audio('call.wav');
      ring.id = 'dvr-ring-audio';
      ring.loop = true;
      ring.volume = 0.5;
      document.body.appendChild(ring);
      ring.play().catch(function() {});
    } catch(_) {}

    function stopRing() {
      var r = document.getElementById('dvr-ring-audio');
      if (r) { r.pause(); r.remove(); }
    }

    var toast = document.createElement('div');
    toast.id = 'dvr-room-toast';
    toast.className = 'dvr-room-toast';
    toast.style.cssText = 'position:fixed!important;top:50%!important;left:50%!important;' +
      'transform:translate(-50%,-50%)!important;z-index:2147483647!important;' +
      'background:rgba(10,10,20,0.98)!important;border:1px solid #00ff88!important;' +
      'border-radius:20px!important;padding:28px 32px!important;min-width:320px!important;' +
      'box-shadow:0 0 60px rgba(0,255,136,0.5)!important;text-align:center!important;' +
      'display:flex!important;flex-direction:column!important;align-items:center!important;gap:16px!important;';
    toast.innerHTML =
      '<div style="font-size:52px;animation:dvrPulse 1.4s ease-in-out infinite;">📞</div>' +
      '<div style="color:#fff;font-weight:700;font-size:18px;">' + escHtml(fromUser) + '</div>' +
      '<div style="color:#00ff88;font-size:14px;">Chamada de voz recebida</div>' +
      '<div style="display:flex;gap:12px;width:100%;">' +
        '<button id="dvr-toast-reject-btn" style="flex:1;padding:12px;background:rgba(237,66,69,0.2);border:1px solid rgba(237,66,69,0.5);border-radius:12px;color:#ed4245;cursor:pointer;font-size:15px;font-weight:600;">📵 Recusar</button>' +
        '<button id="dvr-toast-join-btn" style="flex:1;padding:12px;background:rgba(0,255,136,0.2);border:1px solid rgba(0,255,136,0.5);border-radius:12px;color:#00ff88;cursor:pointer;font-size:15px;font-weight:600;">📞 Atender</button>' +
      '</div>';
    document.body.appendChild(toast);

    var autoClose = setTimeout(function() {
      stopRing();
      toast.remove();
    }, 30000);

    document.getElementById('dvr-toast-join-btn').addEventListener('click', function() {
      clearTimeout(autoClose);
      stopRing();
      toast.remove();
      joinDVRRoom(fromUser, roomKey);
    });

    document.getElementById('dvr-toast-reject-btn').addEventListener('click', function() {
      clearTimeout(autoClose);
      stopRing();
      toast.remove();
      showToastDVR('📵 Chamada recusada');
    });
  }

  // ============================================================
  // WEBRTC — PEER CONNECTION
  // ============================================================

  function ensureDVRRemoteAudio() {
    var state = window.dmVoiceRoomState;
    if (!state.remoteAudio) {
      var audio = document.createElement('audio');
      audio.id = 'dvr-remote-audio';
      audio.autoplay = true;
      audio.style.display = 'none';
      document.body.appendChild(audio);
      state.remoteAudio = audio;
    }
    return state.remoteAudio;
  }

  var ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  function createDVRPeerConnection(peerSocketId) {
    var state = window.dmVoiceRoomState;
    if (state.peers[peerSocketId]) {
      try { state.peers[peerSocketId].close(); } catch (_) {}
    }

    var pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = function (evt) {
      if (!evt.candidate) return;
      var sock = window.socket;
      if (sock && sock.connected) {
        sock.emit('dm:voice-room:ice', {
          to:        peerSocketId,
          candidate: evt.candidate,
          roomKey:   state.roomKey
        });
      }
    };

    pc.ontrack = function (evt) {
      var audio = ensureDVRRemoteAudio();
      if (evt.streams && evt.streams[0]) {
        audio.srcObject = evt.streams[0];
        audio.play().catch(function () {});
      }
    };

    pc.oniceconnectionstatechange = function () {
      var s = pc.iceConnectionState;
      if (s === 'connected' || s === 'completed') {
        updateDVRBarStatus('● Em chamada', '#00ff88');
        _updateFSStatus();
        if (!state.startTime) startDVRTimer();
      }
      if (s === 'disconnected' || s === 'closed' || s === 'failed') {
        delete state.peers[peerSocketId];
        if (Object.keys(state.peers).length === 0) {
          updateDVRBarStatus('● Aguardando...', '#aaa');
          _updateFSStatus();
        }
      }
    };

    state.peers[peerSocketId] = pc;
    return pc;
  }

  function addLocalStreamToDVRPeer(pc) {
    var stream = window.dmVoiceRoomState.localStream;
    if (!stream || !pc) return;
    stream.getTracks().forEach(function (track) {
      try { pc.addTrack(track, stream); } catch (_) {}
    });
  }

  async function sendDVROffer(peerSocketId) {
    var pc = createDVRPeerConnection(peerSocketId);
    addLocalStreamToDVRPeer(pc);
    try {
      var offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      var sock = window.socket;
      if (sock && sock.connected) {
        sock.emit('dm:voice-room:offer', {
          to:      peerSocketId,
          offer:   pc.localDescription,
          roomKey: window.dmVoiceRoomState.roomKey
        });
      }
    } catch (err) {
      console.error('[DVR] Erro ao criar offer:', err);
    }
  }

  // ============================================================
  // ENTRAR / SAIR DA SALA
  // ============================================================

  async function joinDVRRoom(otherUser, roomKey) {
    var state = window.dmVoiceRoomState;

    // Se já está na mesma sala, só abre fullscreen
    if (state.inRoom && state.roomKey === roomKey) {
      openDVRFullscreen();
      return;
    }

    // Se está em outra sala, sai primeiro
    if (state.inRoom) {
      leaveDVRRoom();
      await new Promise(function (r) { setTimeout(r, 200); });
    }

    // Verifica socket
    if (!window.socket || !window.socket.connected) {
      showToastDVR('❌ Sem conexão com o servidor');
      return;
    }

    // Obtém stream de microfone
    try {
      var constraints = { audio: true };
      var savedDevice = localStorage.getItem('audioDeviceId');
      if (savedDevice) constraints.audio = { deviceId: { exact: savedDevice } };
      state.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      showToastDVR('⚠️ Sem acesso ao microfone — entrado sem áudio local');
    }

    // Atualiza estado
    state.inRoom    = true;
    state.roomKey   = roomKey;
    state.otherUser = otherUser;
    state.micEnabled   = true;
    state.audioEnabled = true;

    // Mostra barra
    showDVRBar(otherUser);
    startDVRTimer();
    updateDVRBarStatus('● Aguardando ' + otherUser + '...', '#aaa');

    // Emite para o servidor
    var myUsername = getMyUsername();
    window.socket.emit('dm:voice-room:join', {
      roomKey:  roomKey,
      username: myUsername,
      toUser:   otherUser,
      avatar:   window.userAvatar || localStorage.getItem('zx_avatar') || null
    });

    showToastDVR('🔊 Sala de voz aberta');
  }

  function leaveDVRRoom() {
    var state = window.dmVoiceRoomState;
    if (!state.inRoom) return;

    // Fecha todas as peer connections
    Object.keys(state.peers).forEach(function (id) {
      try { state.peers[id].close(); } catch (_) {}
    });
    state.peers = {};

    // Para stream local
    if (state.localStream) {
      state.localStream.getTracks().forEach(function (t) { t.stop(); });
      state.localStream = null;
    }

    // Para áudio remoto
    if (state.remoteAudio) {
      state.remoteAudio.srcObject = null;
    }

    // Para timer
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }

    // Emite saída
    if (window.socket && window.socket.connected) {
      window.socket.emit('dm:voice-room:leave', { roomKey: state.roomKey });
    }

    // Reseta estado
    state.inRoom    = false;
    state.roomKey   = null;
    state.otherUser = null;
    state.startTime = null;

    // Esconde UI
    hideDVRBar();
    var sc = document.getElementById('dvr-fullscreen');
    if (sc) sc.remove();

    showToastDVR('📴 Você saiu da sala de voz');
  }

  // ============================================================
  // CONTROLES DE MIC / ÁUDIO
  // ============================================================

  function toggleDVRMic() {
    var state = window.dmVoiceRoomState;
    state.micEnabled = !state.micEnabled;
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach(function (t) {
        t.enabled = state.micEnabled;
      });
    }
    var btn = document.getElementById('dvr-bar-mic');
    if (btn) {
      btn.classList.toggle('muted', !state.micEnabled);
      btn.textContent = state.micEnabled ? '🎙' : '🔇';
    }
    showToastDVR(state.micEnabled ? '🎙 Microfone ativado' : '🔇 Microfone mutado');
  }

  function toggleDVRAudio() {
    var state = window.dmVoiceRoomState;
    state.audioEnabled = !state.audioEnabled;
    if (state.remoteAudio) {
      state.remoteAudio.muted = !state.audioEnabled;
    }
    var btn = document.getElementById('dvr-bar-spk');
    if (btn) btn.textContent = state.audioEnabled ? '🔊' : '🔕';
    showToastDVR(state.audioEnabled ? '🔊 Áudio ativado' : '🔕 Áudio mutado');
  }

  // ============================================================
  // EVENTOS DO SOCKET
  // ============================================================

  function bindDVRSocketEvents(sock) {
    if (sock._dvrBound) return;
    sock._dvrBound = true;

    // Servidor informa quais peers já estão na sala (ao entrar)
    sock.on('dm:voice-room:peers', async function (data) {
      var state = window.dmVoiceRoomState;
      if (!state.inRoom) return;
      var peers = data.peers || [];
      // Envia offer para cada peer existente
      for (var i = 0; i < peers.length; i++) {
        await sendDVROffer(peers[i]);
      }
    });

    // Alguém entrou na sala (eu já estava dentro)
    sock.on('dm:voice-room:user-joined', async function (data) {
      var state = window.dmVoiceRoomState;
      if (!state.inRoom || data.roomKey !== state.roomKey) return;
      var peerSocketId = data.socketId;
      // O recém-chegado enviará offer para mim; eu aguardo
      // Mas se for o outro usuário da DM, atualiza status
      if (data.username && data.username.toLowerCase() === (state.otherUser || '').toLowerCase()) {
        updateDVRBarStatus('● ' + escHtml(data.username) + ' entrou na sala', '#00ff88');
      }
      showToastDVR('🔊 ' + (data.username || 'Alguém') + ' entrou na sala de voz');
    });

    // Alguém saiu da sala
    sock.on('dm:voice-room:user-left', function (data) {
      var state = window.dmVoiceRoomState;
      if (!state.inRoom) return;
      var peerSocketId = data.socketId;
      if (state.peers[peerSocketId]) {
        try { state.peers[peerSocketId].close(); } catch (_) {}
        delete state.peers[peerSocketId];
      }
      if (Object.keys(state.peers).length === 0) {
        updateDVRBarStatus('● Aguardando...', '#aaa');
        _updateFSStatus();
      }
      showToastDVR('📴 ' + (data.username || 'Alguém') + ' saiu da sala de voz');
    });

    // Notificação: outro usuário entrou na sala (eu não estou na sala ainda)
    sock.on('dm:voice-room:notification', function (data) {
      var state = window.dmVoiceRoomState;
      // Se já estou na mesma sala, ignora
      if (state.inRoom && state.roomKey === data.roomKey) return;
      if (data.action === 'joined' && data.from) {
        showDVRRoomNotification(data.from, data.roomKey);
      }
    });

    // Recebeu offer WebRTC
    sock.on('dm:voice-room:offer', async function (data) {
      var state = window.dmVoiceRoomState;
      if (!state.inRoom) return;

      // Garante stream local
      if (!state.localStream) {
        try {
          state.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (_) {}
      }

      var pc = createDVRPeerConnection(data.from);
      addLocalStreamToDVRPeer(pc);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        var answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sock.emit('dm:voice-room:answer', {
          to:      data.from,
          answer:  pc.localDescription,
          roomKey: state.roomKey
        });
      } catch (err) {
        console.error('[DVR] Erro ao processar offer:', err);
      }
    });

    // Recebeu answer WebRTC
    sock.on('dm:voice-room:answer', async function (data) {
      var state = window.dmVoiceRoomState;
      var pc = state.peers[data.from];
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (err) {
        console.error('[DVR] Erro ao processar answer:', err);
      }
    });

    // Recebeu ICE candidate
    sock.on('dm:voice-room:ice', async function (data) {
      var state = window.dmVoiceRoomState;
      var pc = state.peers[data.from];
      if (!pc || !data.candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.warn('[DVR] Erro ao adicionar ICE candidate:', err);
      }
    });

    // Reconexão: re-registra listeners
    sock.on('connect', function () {
      sock._dvrBound = false;
      bindDVRSocketEvents(sock);
      // Se estava em sala, tenta re-entrar
      var state = window.dmVoiceRoomState;
      if (state.inRoom && state.roomKey) {
        var myUsername = getMyUsername();
        sock.emit('dm:voice-room:join', {
          roomKey:  state.roomKey,
          username: myUsername,
          toUser:   state.otherUser,
          avatar:   window.userAvatar || localStorage.getItem('zx_avatar') || null
        });
      }
    });
  }

  // ============================================================
  // SUBSTITUIÇÃO DO SISTEMA DE CHAMADA ANTERIOR
  // ============================================================

  /**
   * Substitui window.startDmVoiceCall para usar salas em vez de chamadas.
   * O otherUser é o usuário com quem a DM está aberta.
   */
  window.startDmVoiceCall = async function (otherUser) {
    if (!otherUser) {
      showToastDVR('⚠️ Selecione um contato primeiro');
      return;
    }
    var myUsername = getMyUsername();
    var roomKey    = dmRoomKey(myUsername, otherUser);
    await joinDVRRoom(otherUser, roomKey);
  };

  // Aliases de compatibilidade
  window.startCall        = window.startDmVoiceCall;
  window.startVoiceCall   = window.startDmVoiceCall;
  window.startPrivateCall = window.startDmVoiceCall;

  window.openCall = function (otherUser) {
    var state = window.dmVoiceRoomState;
    if (state.inRoom) {
      openDVRFullscreen();
    } else if (otherUser) {
      window.startDmVoiceCall(otherUser);
    }
  };

  // Exposição de funções para uso externo
  window.leaveDmVoiceRoom   = leaveDVRRoom;
  window.openDmVoiceRoom    = openDVRFullscreen;
  window.joinDmVoiceRoom    = joinDVRRoom;

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================

  function initDVRSystem() {
    console.log('[DVR] Inicializando sistema de sala de voz privada...');
    injectDVRStyles();
    createDVRBar();
    ensureDVRRemoteAudio();

    function attachToSocket(sock) {
      bindDVRSocketEvents(sock);
    }

    if (window.socket) {
      attachToSocket(window.socket);
    } else {
      var timer = setInterval(function () {
        if (window.socket) {
          clearInterval(timer);
          attachToSocket(window.socket);
        }
      }, 300);
      setTimeout(function () { clearInterval(timer); }, 30000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDVRSystem);
  } else {
    initDVRSystem();
  }

  console.log('[DVR] ✅ dm-voice-room-system.js carregado!');

})();
