// ================================================
// SISTEMA DE CHAMADA PRIVADA (DM CALL SYSTEM)
// Versão corrigida v3
//
// BUGS CORRIGIDOS:
//   1. 'reconnect' não existe no Socket.IO v3+ → trocado por 'connect'
//   2. Listener de reconexão ficava sem registro quando initDmCallSystem
//      rodava pelo caminho de polling (socket ainda não existia):
//      o bloco "if(window.socket)" do listener ficava com socket=undefined.
//      FIX: attachToSocket() registra o listener 'connect' DENTRO do
//      callback que detecta o socket — garante rebind em qualquer caso.
//   3. bindDmCallSocketEvents agora recebe a instância do socket como
//      parâmetro e marca a flag _dmCallBound no próprio objeto — evita
//      duplicar listeners sem depender de window.socket no futuro.
//   4. Race condition: dm:call:start não é enviado com toId=null;
//      aguarda resolução do ID (até 2s) e usa username como fallback.
// ================================================

const DM_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

function _dmGetUserId(username) {
  const key = (username || '').toLowerCase();
  return (window.friendIds && window.friendIds[key]) || null;
}

window.dmCallState = {
  isInCall: false,
  targetUser: null,
  callType: 'voice',
  startTime: null,
  durationInterval: null,
  micEnabled: true,
  audioEnabled: true,
  localStream: null,
  peerConnection: null,
  remoteAudio: null,
  isCaller: false,
  _incomingCallerId: null,
  targetUserId: null
};

// ================================================
// UTILITÁRIOS
// ================================================
function escHtmlDm(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDmDuration(s) {
  const m = Math.floor(s / 60).toString().padStart(2,'0');
  return m + ':' + (s % 60).toString().padStart(2,'0');
}

// ================================================
// ÁUDIO REMOTO
// ================================================
function ensureRemoteAudio() {
  if (!window.dmCallState.remoteAudio) {
    const a = document.createElement('audio');
    a.id = 'dm-remote-audio';
    a.autoplay = true;
    a.style.display = 'none';
    document.body.appendChild(a);
    window.dmCallState.remoteAudio = a;
  }
  return window.dmCallState.remoteAudio;
}

// ================================================
// PEER CONNECTION WEBRTC
// ================================================
function createDmPeerConnection(targetUser) {
  closeDmPeerConnection();
  const pc = new RTCPeerConnection({ iceServers: DM_ICE_SERVERS });
  window.dmCallState.peerConnection = pc;

  pc.onicecandidate = function(evt) {
    if (evt.candidate && window.socket && window.socket.connected) {
      window.socket.emit('dm:voice:ice', {
        to: targetUser,
        toId: window.dmCallState.targetUserId || _dmGetUserId(targetUser),
        fromId: window.myUserId || localStorage.getItem('zx_my_user_id'),
        candidate: evt.candidate
      });
    }
  };

  pc.ontrack = function(evt) {
    const audio = ensureRemoteAudio();
    if (evt.streams && evt.streams[0]) audio.srcObject = evt.streams[0];
  };

  pc.oniceconnectionstatechange = function() {
    if (pc.iceConnectionState === 'failed') { try { pc.restartIce(); } catch(_) {} }
    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      const statusEl = document.getElementById('dm-call-screen-status');
      if (statusEl) statusEl.textContent = '● Em chamada';
      const connEl = document.getElementById('dm-pcb-conn-status');
      if (connEl) { connEl.textContent = '● Conectado'; connEl.style.color = '#00ff88'; }
    }
  };
  return pc;
}

function closeDmPeerConnection() {
  const pc = window.dmCallState.peerConnection;
  if (pc) { try { pc.close(); } catch(_) {} window.dmCallState.peerConnection = null; }
  const a = window.dmCallState.remoteAudio;
  if (a) a.srcObject = null;
}

function addLocalStreamToPeer(pc) {
  const s = window.dmCallState.localStream;
  if (!s || !pc) return;
  s.getTracks().forEach(function(t) { try { pc.addTrack(t, s); } catch(_) {} });
}

// ================================================
// BARRA PERSISTENTE
// ================================================
function injectDmCallStyles() {
  if (document.getElementById('dm-call-bar-css')) return;
  const style = document.createElement('style');
  style.id = 'dm-call-bar-css';
  style.textContent = [
    '.dm-call-bar{position:fixed!important;bottom:30px!important;left:50%!important;transform:translateX(-50%)!important;z-index:2147483647!important;background:rgba(10,10,20,0.97)!important;backdrop-filter:blur(24px)!important;border:1px solid #00ff88!important;border-radius:60px!important;padding:12px 24px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:20px!important;box-shadow:0 0 40px rgba(0,255,136,0.45),0 8px 32px rgba(0,0,0,0.6)!important;min-width:520px!important;max-width:90vw!important;animation:dmCallBarIn 0.35s cubic-bezier(0.34,1.56,0.64,1)!important;pointer-events:auto!important;}',
    '.dm-call-bar-hidden{display:none!important;}',
    '@keyframes dmCallBarIn{from{opacity:0;transform:translateX(-50%) translateY(80px) scale(0.9);}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}}',
    '.dm-pcb-left{display:flex;align-items:center;gap:14px;}',
    '.dm-pcb-pulse{font-size:22px;animation:dmCallPulse 1.4s ease-in-out infinite;}',
    '@keyframes dmCallPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.6;transform:scale(0.9);}}',
    '.dm-pcb-info{display:flex;flex-direction:column;gap:3px;}',
    '.dm-pcb-title{color:#fff;font-weight:600;font-size:14px;white-space:nowrap;}',
    '.dm-pcb-subtitle{color:#aaa;font-size:12px;display:flex;align-items:center;gap:6px;}',
    '.dm-pcb-dot{color:#555;}',
    '.dm-pcb-controls{display:flex;align-items:center;gap:8px;}',
    '.dm-pcb-btn{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:14px;transition:all 0.15s;white-space:nowrap;}',
    '.dm-pcb-btn:hover{background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.25);}',
    '.dm-pcb-btn.muted{background:rgba(237,66,69,0.25)!important;border-color:rgba(237,66,69,0.5)!important;color:#ed4245!important;}',
    '.dm-pcb-btn-primary{background:rgba(0,255,136,0.15)!important;border-color:rgba(0,255,136,0.4)!important;color:#00ff88!important;}',
    '.dm-pcb-btn-primary:hover{background:rgba(0,255,136,0.28)!important;}',
    '.dm-pcb-btn-danger{background:rgba(237,66,69,0.15)!important;border-color:rgba(237,66,69,0.4)!important;color:#ed4245!important;}',
    '.dm-pcb-btn-danger:hover{background:rgba(237,66,69,0.28)!important;}',
    '@media(max-width:600px){.dm-call-bar{min-width:auto!important;width:calc(100vw - 32px)!important;padding:10px 14px!important;gap:10px!important;border-radius:20px!important;bottom:20px!important;}.dm-pcb-subtitle{display:none;}}',
    '.dm-call-screen{position:fixed!important;inset:0!important;z-index:2147483646!important;background:radial-gradient(ellipse at center,#0d001f 0%,#040008 100%)!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;animation:dmScreenIn 0.3s ease-out!important;}',
    '@keyframes dmScreenIn{from{opacity:0;}to{opacity:1;}}',
    '.dm-call-screen-avatar{width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#8b00ff,#ff00ff);display:flex;align-items:center;justify-content:center;font-size:52px;font-weight:700;color:#fff;box-shadow:0 0 60px rgba(0,255,136,0.5),0 0 120px rgba(0,255,136,0.2);animation:dmAvatarPulse 2s ease-in-out infinite;margin-bottom:24px;}',
    '@keyframes dmAvatarPulse{0%,100%{box-shadow:0 0 40px rgba(0,255,136,0.5),0 0 80px rgba(0,255,136,0.2);}50%{box-shadow:0 0 80px rgba(0,255,136,0.8),0 0 160px rgba(0,255,136,0.3);}}',
    '.dm-call-screen-name{color:#fff;font-size:28px;font-weight:700;margin-bottom:8px;text-shadow:0 0 20px rgba(0,255,136,0.4);}',
    '.dm-call-screen-status{color:#00ff88;font-size:16px;margin-bottom:48px;letter-spacing:0.5px;}',
    '.dm-call-screen-controls{display:flex;align-items:center;gap:24px;}',
    '.dm-call-screen-btn{width:64px;height:64px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer;transition:all 0.2s;}',
    '.dm-call-screen-btn:hover{transform:scale(1.1);}',
    '.dm-call-screen-btn.mic-btn{background:rgba(255,255,255,0.12);color:#fff;}',
    '.dm-call-screen-btn.mic-btn.muted{background:rgba(237,66,69,0.3);color:#ed4245;}',
    '.dm-call-screen-btn.spk-btn{background:rgba(255,255,255,0.12);color:#fff;}',
    '.dm-call-screen-btn.end-btn{background:#ed4245;color:#fff;width:72px;height:72px;font-size:28px;box-shadow:0 0 20px rgba(237,66,69,0.5);}',
    '.dm-call-screen-btn.end-btn:hover{background:#c0392b;}',
    '.dm-call-screen-btn.min-btn{background:rgba(255,200,0,0.15);color:#ffd700;}'
  ].join('');
  document.head.appendChild(style);
}

function createDmCallBar() {
  if (document.getElementById('dm-persistent-call-bar')) return;
  injectDmCallStyles();
  const bar = document.createElement('div');
  bar.id = 'dm-persistent-call-bar';
  bar.className = 'dm-call-bar dm-call-bar-hidden';
  bar.innerHTML = '<div class="dm-pcb-left">' +
    '<div class="dm-pcb-pulse">📞</div>' +
    '<div class="dm-pcb-info">' +
      '<div class="dm-pcb-title">Em chamada com <span id="dm-pcb-username" style="color:#00ff88;font-weight:700;"></span></div>' +
      '<div class="dm-pcb-subtitle">' +
        '<span id="dm-pcb-conn-status" style="color:#aaa;">● Conectando...</span>' +
        '<span class="dm-pcb-dot">•</span>' +
        '<span id="dm-pcb-duration">00:00</span>' +
      '</div>' +
    '</div></div>' +
    '<div class="dm-pcb-controls">' +
      '<button class="dm-pcb-btn" id="dm-pcb-mic">🎙</button>' +
      '<button class="dm-pcb-btn" id="dm-pcb-audio">🔊</button>' +
      '<button class="dm-pcb-btn dm-pcb-btn-primary" id="dm-pcb-return">💬 Expandir</button>' +
      '<button class="dm-pcb-btn dm-pcb-btn-danger" id="dm-pcb-hangup">📵 Encerrar</button>' +
    '</div>';
  document.body.appendChild(bar);
  document.getElementById('dm-pcb-mic').addEventListener('click', toggleDmCallMic);
  document.getElementById('dm-pcb-audio').addEventListener('click', toggleDmCallAudio);
  document.getElementById('dm-pcb-return').addEventListener('click', openDmCallScreen);
  document.getElementById('dm-pcb-hangup').addEventListener('click', endDmCall);
}

function showDmCallBar(username) {
  createDmCallBar();
  const bar = document.getElementById('dm-persistent-call-bar');
  if (!bar) return;
  const el = document.getElementById('dm-pcb-username');
  if (el) el.textContent = username;
  bar.classList.remove('dm-call-bar-hidden');
}

function hideDmCallBar() {
  const bar = document.getElementById('dm-persistent-call-bar');
  if (bar) bar.classList.add('dm-call-bar-hidden');
}

// ================================================
// TELA FULLSCREEN
// ================================================
function openDmCallScreen() {
  if (!window.dmCallState.isInCall) return;
  const username = window.dmCallState.targetUser;
  const initial = (username || '?')[0].toUpperCase();
  const existing = document.getElementById('dm-call-screen');
  if (existing) existing.remove();

  const screen = document.createElement('div');
  screen.id = 'dm-call-screen';
  screen.className = 'dm-call-screen';
  screen.innerHTML =
    '<div class="dm-call-screen-avatar">' + initial + '</div>' +
    '<div class="dm-call-screen-name">' + escHtmlDm(username) + '</div>' +
    '<div class="dm-call-screen-status" id="dm-call-screen-status">● Chamando...</div>' +
    '<div class="dm-call-screen-controls">' +
      '<button class="dm-call-screen-btn mic-btn' + (window.dmCallState.micEnabled ? '' : ' muted') + '" id="dm-call-screen-mic">' + (window.dmCallState.micEnabled ? '🎙' : '🔇') + '</button>' +
      '<button class="dm-call-screen-btn spk-btn" id="dm-call-screen-spk">' + (window.dmCallState.audioEnabled ? '🔊' : '🔕') + '</button>' +
      '<button class="dm-call-screen-btn min-btn" id="dm-call-screen-minimize">⬇</button>' +
      '<button class="dm-call-screen-btn end-btn" id="dm-call-screen-end">📵</button>' +
    '</div>';
  document.body.appendChild(screen);

  if (window.dmCallState.startTime) {
    var statusEl = document.getElementById('dm-call-screen-status');
    (function tick() {
      if (!document.getElementById('dm-call-screen-status') || !window.dmCallState.isInCall) return;
      statusEl.textContent = '● Em chamada · ' + formatDmDuration(Math.floor((Date.now() - window.dmCallState.startTime) / 1000));
      setTimeout(tick, 500);
    })();
  }

  document.getElementById('dm-call-screen-mic').addEventListener('click', function() {
    toggleDmCallMic();
    var btn = document.getElementById('dm-call-screen-mic');
    if (btn) { btn.classList.toggle('muted', !window.dmCallState.micEnabled); btn.textContent = window.dmCallState.micEnabled ? '🎙' : '🔇'; }
  });
  document.getElementById('dm-call-screen-spk').addEventListener('click', function() {
    toggleDmCallAudio();
    var btn = document.getElementById('dm-call-screen-spk');
    if (btn) btn.textContent = window.dmCallState.audioEnabled ? '🔊' : '🔕';
  });
  document.getElementById('dm-call-screen-minimize').addEventListener('click', function() {
    var sc = document.getElementById('dm-call-screen');
    if (sc) sc.remove();
    if (typeof showToast === 'function') showToast('📞 Chamada minimizada');
  });
  document.getElementById('dm-call-screen-end').addEventListener('click', endDmCall);
}

// ================================================
// INICIAR CHAMADA (quem liga)
// ================================================
window.startDmVoiceCall = async function(username) {
  if (!username) {
    if (typeof showToast === 'function') showToast('⚠️ Selecione um contato primeiro');
    return;
  }
  if (window.dmCallState.isInCall && window.dmCallState.targetUser === username) {
    openDmCallScreen(); return;
  }
  if (window.dmCallState.isInCall) {
    if (!confirm('Encerrar chamada com ' + window.dmCallState.targetUser + ' e ligar para ' + username + '?')) return;
    endDmCall();
    await new Promise(function(r) { setTimeout(r, 300); });
  }

  if (!window.socket || !window.socket.connected) {
    if (typeof showToast === 'function') showToast('❌ Sem conexão com o servidor');
    return;
  }

  window.dmCallState.isInCall     = true;
  window.dmCallState.targetUser   = username;
  window.dmCallState.callType     = 'voice';
  window.dmCallState.startTime    = Date.now();
  window.dmCallState.micEnabled   = true;
  window.dmCallState.audioEnabled = true;
  window.dmCallState.isCaller     = true;

  try { var ra = new Audio('call.wav'); ra.volume = 0.5; ra.play().catch(function(){}); setTimeout(function(){ra.pause();ra.src='';},3000); } catch(_){}

  try {
    var c = { audio: true };
    if (localStorage.getItem('audioDeviceId')) c.audio = { deviceId: { exact: localStorage.getItem('audioDeviceId') } };
    window.dmCallState.localStream = await navigator.mediaDevices.getUserMedia(c);
  } catch(err) {
    if (typeof showToast === 'function') showToast('⚠️ Sem acesso ao microfone — chamada sem áudio local');
  }

  createDmCallBar();
  showDmCallBar(username);
  startDmCallTimer();

  var _myUsername = window.username || window.currentUsername || 'Usuário';
  var _myId       = window.myUserId || localStorage.getItem('zx_my_user_id') || null;

  // -----------------------------------------------------------------------
  // CORREÇÃO #4: não emite dm:call:start com toId=null quando possível.
  // Usa username como campo principal de routing (o servidor faz lookup).
  // Aguarda até 2 s pela resolução do UUID antes de emitir com null.
  // -----------------------------------------------------------------------
  function _emit(toId) {
    window.dmCallState.targetUserId = toId;
    window.socket.emit('dm:call:start', {
      to:     username,
      toId:   toId || null,
      from:   _myUsername,
      fromId: _myId
    });
  }

  var cached = _dmGetUserId(username);
  if (cached) {
    _emit(cached);
  } else {
    var _done = false;
    window._dmCallPendingUserId = function(uname, uid) {
      if (uname.toLowerCase() !== username.toLowerCase() || _done) return;
      _done = true;
      window._dmCallPendingUserId = null;
      _emit(uid);
    };
    window.socket.emit('dm:get-user-id', { username: username });
    setTimeout(function() {
      if (!_done) {
        _done = true;
        window._dmCallPendingUserId = null;
        _emit(null);
      }
    }, 2000);
  }

  openDmCallScreen();
  if (typeof showToast === 'function') showToast('📞 Chamando ' + username + '...');
};

// ================================================
// ACEITE PELO CALLER: cria WebRTC offer
// ================================================
async function _onDmCallAccepted(data) {
  var targetUser = window.dmCallState.targetUser || data.from;
  if (!targetUser) return;
  var statusEl = document.getElementById('dm-call-screen-status');
  if (statusEl) statusEl.textContent = '● Conectando...';

  var pc = createDmPeerConnection(targetUser);
  addLocalStreamToPeer(pc);
  try {
    var offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    window.socket.emit('dm:voice:offer', {
      to: targetUser,
      toId: window.dmCallState.targetUserId || _dmGetUserId(targetUser),
      offer: pc.localDescription
    });
  } catch(err) {
    if (typeof showToast === 'function') showToast('❌ Erro ao conectar áudio');
  }
}

// ================================================
// ENCERRAR CHAMADA
// ================================================
window.endDmCall = function() {
  closeDmPeerConnection();
  if (window.dmCallState.localStream) {
    window.dmCallState.localStream.getTracks().forEach(function(t) { t.stop(); });
    window.dmCallState.localStream = null;
  }
  if (window.dmCallState.durationInterval) {
    clearInterval(window.dmCallState.durationInterval);
    window.dmCallState.durationInterval = null;
  }

  if (window.socket && window.socket.connected && window.dmCallState.targetUser) {
    window.socket.emit('dm:call:end', {
      to:     window.dmCallState.targetUser,
      toId:   window.dmCallState.targetUserId || _dmGetUserId(window.dmCallState.targetUser),
      from:   window.username || window.currentUsername || 'Usuário',
      fromId: window.myUserId || localStorage.getItem('zx_my_user_id') || null
    });
  }

  var username = window.dmCallState.targetUser;
  window.dmCallState.isInCall     = false;
  window.dmCallState.targetUser   = null;
  window.dmCallState.startTime    = null;
  window.dmCallState.micEnabled   = true;
  window.dmCallState.audioEnabled = true;
  window.dmCallState.isCaller     = false;
  window.dmCallState.targetUserId = null;

  hideDmCallBar();
  var sc = document.getElementById('dm-call-screen');
  if (sc) sc.remove();
  if (typeof showToast === 'function') showToast('📵 Chamada encerrada' + (username ? ' com ' + username : ''));
  try { var ua = new Audio('uncall.mp3'); ua.volume = 0.4; ua.play().catch(function(){}); } catch(_){}
};

// ================================================
// MIC / ÁUDIO
// ================================================
function toggleDmCallMic() {
  window.dmCallState.micEnabled = !window.dmCallState.micEnabled;
  if (window.dmCallState.localStream)
    window.dmCallState.localStream.getAudioTracks().forEach(function(t) { t.enabled = window.dmCallState.micEnabled; });
  var btn = document.getElementById('dm-pcb-mic');
  if (btn) { btn.classList.toggle('muted', !window.dmCallState.micEnabled); btn.textContent = window.dmCallState.micEnabled ? '🎙' : '🔇'; }
  if (typeof showToast === 'function') showToast(window.dmCallState.micEnabled ? '🎙 Microfone ativado' : '🔇 Microfone desativado');
}

function toggleDmCallAudio() {
  window.dmCallState.audioEnabled = !window.dmCallState.audioEnabled;
  var a = window.dmCallState.remoteAudio;
  if (a) a.muted = !window.dmCallState.audioEnabled;
  var btn = document.getElementById('dm-pcb-audio');
  if (btn) { btn.classList.toggle('muted', !window.dmCallState.audioEnabled); btn.textContent = window.dmCallState.audioEnabled ? '🔊' : '🔕'; }
  if (typeof showToast === 'function') showToast(window.dmCallState.audioEnabled ? '🔊 Áudio ativado' : '🔕 Áudio desativado');
}

// ================================================
// TIMER
// ================================================
function startDmCallTimer() {
  if (window.dmCallState.durationInterval) clearInterval(window.dmCallState.durationInterval);
  var s = 0;
  window.dmCallState.durationInterval = setInterval(function() {
    s++;
    var el = document.getElementById('dm-pcb-duration');
    if (el) el.textContent = formatDmDuration(s);
  }, 1000);
}

// ================================================
// MODAL DE CHAMADA RECEBIDA
// ================================================
function showDmIncomingCall(from) {
  var existing = document.getElementById('dm-incoming-call-modal');
  if (existing) existing.remove();
  var callerName = from || 'Alguém';

  var ringAudio = null;
  try {
    ringAudio = new Audio('call.wav');
    ringAudio.id = 'dm-incoming-audio';
    ringAudio.loop = true;
    ringAudio.volume = 0.5;
    document.body.appendChild(ringAudio);
    ringAudio.play().catch(function() {});
  } catch(e) {}

  function stopRing() {
    if (ringAudio) { ringAudio.pause(); try { ringAudio.remove(); } catch(_){} ringAudio = null; }
  }

  var modal = document.createElement('div');
  modal.id = 'dm-incoming-call-modal';
  modal.style.cssText = 'position:fixed!important;top:24px!important;right:24px!important;z-index:9999999!important;background:rgba(10,10,20,0.97)!important;backdrop-filter:blur(20px)!important;border:1px solid #00ff88!important;border-radius:20px!important;padding:20px 24px!important;min-width:280px!important;box-shadow:0 0 40px rgba(0,255,136,0.4)!important;animation:dmIncomingIn 0.35s cubic-bezier(0.34,1.56,0.64,1);';
  modal.innerHTML =
    '<style>@keyframes dmIncomingIn{from{opacity:0;transform:translateX(100px);}to{opacity:1;transform:translateX(0);}}</style>' +
    '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">' +
      '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#8b00ff,#ff00ff);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:22px;">' + (callerName[0]||'?').toUpperCase() + '</div>' +
      '<div>' +
        '<div style="color:#fff;font-weight:700;font-size:15px;">' + escHtmlDm(callerName) + '</div>' +
        '<div style="color:#00ff88;font-size:13px;margin-top:2px;">📞 Chamada de voz recebida</div>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;gap:10px;">' +
      '<button id="dm-incoming-reject" style="flex:1;padding:10px;background:rgba(237,66,69,0.2);border:1px solid rgba(237,66,69,0.5);border-radius:10px;color:#ed4245;cursor:pointer;font-size:14px;font-weight:600;">📵 Recusar</button>' +
      '<button id="dm-incoming-accept" style="flex:1;padding:10px;background:rgba(0,255,136,0.2);border:1px solid rgba(0,255,136,0.5);border-radius:10px;color:#00ff88;cursor:pointer;font-size:14px;font-weight:600;">📞 Atender</button>' +
    '</div>';
  document.body.appendChild(modal);

  var autoClose = setTimeout(function() { stopRing(); modal.remove(); }, 30000);

  document.getElementById('dm-incoming-reject').addEventListener('click', function() {
    clearTimeout(autoClose); stopRing(); modal.remove();
    if (window.socket && window.socket.connected) {
      window.socket.emit('dm:call:reject', {
        to:     callerName,
        toId:   window.dmCallState._incomingCallerId || _dmGetUserId(callerName),
        from:   window.username || window.currentUsername || 'Usuário',
        fromId: window.myUserId || localStorage.getItem('zx_my_user_id') || null
      });
    }
    if (typeof showToast === 'function') showToast('📵 Chamada recusada');
  });

  document.getElementById('dm-incoming-accept').addEventListener('click', async function() {
    clearTimeout(autoClose); stopRing(); modal.remove();

    window.dmCallState.isInCall     = true;
    window.dmCallState.targetUser   = callerName;
    window.dmCallState.callType     = 'voice';
    window.dmCallState.startTime    = Date.now();
    window.dmCallState.micEnabled   = true;
    window.dmCallState.audioEnabled = true;
    window.dmCallState.isCaller     = false;

    try {
      var c = { audio: true };
      if (localStorage.getItem('audioDeviceId')) c.audio = { deviceId: { exact: localStorage.getItem('audioDeviceId') } };
      window.dmCallState.localStream = await navigator.mediaDevices.getUserMedia(c);
    } catch(err) {}

    createDmCallBar();
    showDmCallBar(callerName);
    startDmCallTimer();

    var targetId = window.dmCallState._incomingCallerId || _dmGetUserId(callerName);
    window.dmCallState.targetUserId = targetId;

    if (window.socket && window.socket.connected) {
      window.socket.emit('dm:call:accept', {
        to:     callerName,
        toId:   targetId,
        from:   window.username || window.currentUsername || 'Usuário',
        fromId: window.myUserId || localStorage.getItem('zx_my_user_id') || null
      });
    }

    openDmCallScreen();
    var s = document.getElementById('dm-call-screen-status');
    if (s) s.textContent = '● Aguardando conexão de áudio...';
    if (typeof showToast === 'function') showToast('📞 Chamada atendida — aguardando áudio...');
  });
}

// ================================================
// BIND DE EVENTOS SOCKET
//
// CORREÇÃO PRINCIPAL:
//   - Recebe a instância do socket como parâmetro (não usa window.socket
//     em momento posterior onde pode ter mudado ou ser undefined).
//   - Flag _dmCallBound marcada no OBJETO do socket, não em window global
//     → se o socket for substituído, a nova instância não tem a flag e os
//     listeners são registrados novamente.
// ================================================
function bindDmCallSocketEvents(sock) {
  var s = sock || window.socket;
  if (!s) return;
  if (s._dmCallBound) return;
  s._dmCallBound = true;

  // ── Chamada recebida ──────────────────────────────────────────────────────
  // Este é o listener crítico: o servidor emite 'dm:call:incoming' para o
  // destinatário. Se este listener não estiver registrado, o modal nunca aparece.
  s.on('dm:call:incoming', function(data) {
    if (!data || !data.from) return;
    window.dmCallState._incomingCallerId = data.fromId || null;
    showDmIncomingCall(data.from);
  });

  // ── Chamada aceita (quem ligou) ───────────────────────────────────────────
  s.on('dm:call:accepted', function(data) {
    if (window.dmCallState.isInCall && window.dmCallState.isCaller) {
      _onDmCallAccepted(data);
    }
  });

  // ── Chamada rejeitada ─────────────────────────────────────────────────────
  s.on('dm:call:rejected', function(data) {
    if (window.dmCallState.isInCall) {
      endDmCall();
      if (typeof showToast === 'function') showToast('📵 ' + escHtmlDm(data.from) + ' recusou a chamada');
    }
  });

  // ── Outro lado encerrou ───────────────────────────────────────────────────
  s.on('dm:call:ended', function(data) {
    if (window.dmCallState.isInCall) {
      var prev = window.dmCallState.targetUser;
      window.dmCallState.targetUser = null;
      window.dmCallState.isInCall = false;
      endDmCall();
      if (typeof showToast === 'function') showToast('📵 ' + escHtmlDm(data.from || prev) + ' encerrou a chamada');
    }
  });

  // ── WebRTC: offer recebido (destinatário) ─────────────────────────────────
  s.on('dm:voice:offer', async function(data) {
    if (!window.dmCallState.isInCall) return;
    var targetUser = data.from;

    if (!window.dmCallState.localStream) {
      try {
        var c = { audio: true };
        if (localStorage.getItem('audioDeviceId')) c.audio = { deviceId: { exact: localStorage.getItem('audioDeviceId') } };
        window.dmCallState.localStream = await navigator.mediaDevices.getUserMedia(c);
      } catch(err) {}
    }

    var pc = createDmPeerConnection(targetUser);
    addLocalStreamToPeer(pc);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      var answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit('dm:voice:answer', {
        to: targetUser,
        toId: window.dmCallState.targetUserId || _dmGetUserId(targetUser),
        answer: pc.localDescription
      });
      var st = document.getElementById('dm-call-screen-status');
      if (st) st.textContent = '● Conectando...';
    } catch(err) {
      if (typeof showToast === 'function') showToast('❌ Erro ao conectar áudio');
    }
  });

  // ── WebRTC: answer recebido (caller) ──────────────────────────────────────
  s.on('dm:voice:answer', async function(data) {
    var pc = window.dmCallState.peerConnection;
    if (!pc) return;
    try { await pc.setRemoteDescription(new RTCSessionDescription(data.answer)); } catch(err) {}
  });

  // ── WebRTC: ICE candidate ─────────────────────────────────────────────────
  s.on('dm:voice:ice', async function(data) {
    var pc = window.dmCallState.peerConnection;
    if (!pc || !data.candidate) return;
    try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch(err) {}
  });
}

// ================================================
// INICIALIZAR
//
// CORREÇÃO PRINCIPAL:
//   attachToSocket() registra o listener 'connect' DENTRO do mesmo bloco
//   que detecta o socket — isso garante que o listener de reconexão é
//   sempre registrado, independente de quando o socket ficou disponível.
//
//   ANTES (bugado): o if(window.socket) para o listener 'reconnect' ficava
//   fora do callback de polling → se o socket não existia na primeira
//   execução, o listener nunca era adicionado.
//
//   DEPOIS (corrigido): attachToSocket é chamada de ambos os caminhos
//   (socket já existe / socket aparece depois) e garante o listener 'connect'.
// ================================================
function initDmCallSystem() {
  injectDmCallStyles();
  createDmCallBar();
  ensureRemoteAudio();

  function attachToSocket(sock) {
    bindDmCallSocketEvents(sock);

    // 'connect' dispara na conexão inicial E em reconexões (Socket.IO v3+).
    // Limpa a flag _dmCallBound para forçar re-registro dos listeners.
    sock.on('connect', function() {
      sock._dmCallBound = false;
      bindDmCallSocketEvents(sock);
    });
  }

  if (window.socket) {
    attachToSocket(window.socket);
  } else {
    var timer = setInterval(function() {
      if (window.socket) {
        clearInterval(timer);
        attachToSocket(window.socket);
      }
    }, 300);
    setTimeout(function() { clearInterval(timer); }, 20000);
  }
}

// ================================================
// ALIASES GLOBAIS — compatibilidade com botões legados
// Garante que startCall / startVoiceCall / openCall /
// startPrivateCall estejam sempre disponíveis no window,
// independente de como o botão foi escrito no HTML.
// ================================================
window.startCall         = window.startDmVoiceCall;
window.startVoiceCall    = window.startDmVoiceCall;
window.startPrivateCall  = window.startDmVoiceCall;
window.openCall = function(username) {
  if (window.dmCallState && window.dmCallState.isInCall) {
    if (typeof openDmCallScreen === 'function') openDmCallScreen();
  } else if (username) {
    window.startDmVoiceCall(username);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDmCallSystem);
} else {
  initDmCallSystem();
}
