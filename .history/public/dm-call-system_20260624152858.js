// ================================================
// SISTEMA DE CHAMADA PRIVADA (DM CALL SYSTEM)
// Versão corrigida: WebRTC real com STUN + relay pelo servidor
// ================================================

console.log('[DM:CALL:SYSTEM] Carregado.');

const DM_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

// Retorna o UUID Neon de um usuário pelo username (via mapa global friendIds)
function _dmGetUserId(username) {
  const key = (username || '').toLowerCase();
  const id = (window.friendIds && window.friendIds[key]) || null;
  console.log('[DM:CALL:SYSTEM] _dmGetUserId: username=', username, 'key=', key, 'id=', id, 'friendIds=', window.friendIds);
  return id;
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
  isCaller: false
};

// ================================================
// UTILITÁRIOS
// ================================================
function escHtmlDm(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDmDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ================================================
// ÁUDIO REMOTO
// ================================================
function ensureRemoteAudio() {
  if (!window.dmCallState.remoteAudio) {
    const audio = document.createElement('audio');
    audio.id = 'dm-remote-audio';
    audio.autoplay = true;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    window.dmCallState.remoteAudio = audio;
  }
  return window.dmCallState.remoteAudio;
}

// ================================================
// PEER CONNECTION WEBRTC COM STUN
// ================================================
function createDmPeerConnection(targetUser) {
  closeDmPeerConnection();

  const pc = new RTCPeerConnection({ iceServers: DM_ICE_SERVERS });
  window.dmCallState.peerConnection = pc;

  pc.onicecandidate = (evt) => {
    if (evt.candidate && window.socket && window.socket.connected) {
      const _myId = window.myUserId || localStorage.getItem('zx_my_user_id');
      window.socket.emit('dm:voice:ice', { to: targetUser, toId: window.dmCallState.targetUserId || _dmGetUserId(targetUser), fromId: _myId, candidate: evt.candidate });
    }
  };

  pc.ontrack = (evt) => {
    console.log('[DM:VOICE] Stream remoto recebido');
    const audio = ensureRemoteAudio();
    if (evt.streams && evt.streams[0]) {
      audio.srcObject = evt.streams[0];
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log('[DM:VOICE] ICE state:', pc.iceConnectionState);
    if (pc.iceConnectionState === 'failed') {
      try { pc.restartIce(); } catch(_) {}
    }
    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      const statusEl = document.getElementById('dm-call-screen-status');
      if (statusEl) statusEl.textContent = '● Em chamada';
      const connStatus = document.getElementById('dm-pcb-conn-status');
      if (connStatus) { connStatus.textContent = '● Conectado'; connStatus.style.color = '#00ff88'; }
    }
  };

  return pc;
}

function closeDmPeerConnection() {
  const pc = window.dmCallState.peerConnection;
  if (pc) {
    try { pc.close(); } catch(_) {}
    window.dmCallState.peerConnection = null;
  }
  const audio = window.dmCallState.remoteAudio;
  if (audio) audio.srcObject = null;
}

function addLocalStreamToPeer(pc) {
  const stream = window.dmCallState.localStream;
  if (!stream || !pc) return;
  stream.getTracks().forEach(track => {
    try { pc.addTrack(track, stream); } catch(_) {}
  });
}

// ================================================
// BARRA PERSISTENTE (flutua em qualquer tela)
// ================================================
function injectDmCallStyles() {
  if (document.getElementById('dm-call-bar-css')) return;
  const style = document.createElement('style');
  style.id = 'dm-call-bar-css';
  style.textContent = `
    .dm-call-bar {
      position:fixed!important; bottom:30px!important; left:50%!important;
      transform:translateX(-50%)!important; z-index:2147483647!important;
      background:rgba(10,10,20,0.97)!important; backdrop-filter:blur(24px)!important;
      border:1px solid #00ff88!important; border-radius:60px!important;
      padding:12px 24px!important; display:flex!important; align-items:center!important;
      justify-content:space-between!important; gap:20px!important;
      box-shadow:0 0 40px rgba(0,255,136,0.45),0 8px 32px rgba(0,0,0,0.6)!important;
      min-width:520px!important; max-width:90vw!important;
      animation:dmCallBarIn 0.35s cubic-bezier(0.34,1.56,0.64,1)!important;
      pointer-events:auto!important;
    }
    .dm-call-bar-hidden{display:none!important;}
    @keyframes dmCallBarIn{from{opacity:0;transform:translateX(-50%) translateY(80px) scale(0.9);}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}}
    .dm-pcb-left{display:flex;align-items:center;gap:14px;}
    .dm-pcb-pulse{font-size:22px;animation:dmCallPulse 1.4s ease-in-out infinite;}
    @keyframes dmCallPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.6;transform:scale(0.9);}}
    .dm-pcb-info{display:flex;flex-direction:column;gap:3px;}
    .dm-pcb-title{color:#fff;font-weight:600;font-size:14px;white-space:nowrap;}
    .dm-pcb-subtitle{color:#aaa;font-size:12px;display:flex;align-items:center;gap:6px;}
    .dm-pcb-dot{color:#555;}
    .dm-pcb-controls{display:flex;align-items:center;gap:8px;}
    .dm-pcb-btn{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:14px;transition:all 0.15s;white-space:nowrap;}
    .dm-pcb-btn:hover{background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.25);}
    .dm-pcb-btn.muted{background:rgba(237,66,69,0.25)!important;border-color:rgba(237,66,69,0.5)!important;color:#ed4245!important;}
    .dm-pcb-btn-primary{background:rgba(0,255,136,0.15)!important;border-color:rgba(0,255,136,0.4)!important;color:#00ff88!important;}
    .dm-pcb-btn-primary:hover{background:rgba(0,255,136,0.28)!important;}
    .dm-pcb-btn-danger{background:rgba(237,66,69,0.15)!important;border-color:rgba(237,66,69,0.4)!important;color:#ed4245!important;}
    .dm-pcb-btn-danger:hover{background:rgba(237,66,69,0.28)!important;}
    @media(max-width:600px){.dm-call-bar{min-width:auto!important;width:calc(100vw - 32px)!important;padding:10px 14px!important;gap:10px!important;border-radius:20px!important;bottom:20px!important;}.dm-pcb-subtitle{display:none;}}
    .dm-call-screen{position:fixed!important;inset:0!important;z-index:2147483646!important;background:radial-gradient(ellipse at center,#0d001f 0%,#040008 100%)!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;animation:dmScreenIn 0.3s ease-out!important;}
    @keyframes dmScreenIn{from{opacity:0;}to{opacity:1;}}
    .dm-call-screen-avatar{width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#8b00ff,#ff00ff);display:flex;align-items:center;justify-content:center;font-size:52px;font-weight:700;color:#fff;box-shadow:0 0 60px rgba(0,255,136,0.5),0 0 120px rgba(0,255,136,0.2);animation:dmAvatarPulse 2s ease-in-out infinite;margin-bottom:24px;}
    @keyframes dmAvatarPulse{0%,100%{box-shadow:0 0 40px rgba(0,255,136,0.5),0 0 80px rgba(0,255,136,0.2);}50%{box-shadow:0 0 80px rgba(0,255,136,0.8),0 0 160px rgba(0,255,136,0.3);}}
    .dm-call-screen-name{color:#fff;font-size:28px;font-weight:700;margin-bottom:8px;text-shadow:0 0 20px rgba(0,255,136,0.4);}
    .dm-call-screen-status{color:#00ff88;font-size:16px;margin-bottom:48px;letter-spacing:0.5px;}
    .dm-call-screen-controls{display:flex;align-items:center;gap:24px;}
    .dm-call-screen-btn{width:64px;height:64px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer;transition:all 0.2s;}
    .dm-call-screen-btn:hover{transform:scale(1.1);}
    .dm-call-screen-btn.mic-btn{background:rgba(255,255,255,0.12);color:#fff;}
    .dm-call-screen-btn.mic-btn.muted{background:rgba(237,66,69,0.3);color:#ed4245;}
    .dm-call-screen-btn.spk-btn{background:rgba(255,255,255,0.12);color:#fff;}
    .dm-call-screen-btn.end-btn{background:#ed4245;color:#fff;width:72px;height:72px;font-size:28px;box-shadow:0 0 20px rgba(237,66,69,0.5);}
    .dm-call-screen-btn.end-btn:hover{background:#c0392b;}
    .dm-call-screen-btn.min-btn{background:rgba(255,200,0,0.15);color:#ffd700;}
  `;
  document.head.appendChild(style);
}

function createDmCallBar() {
  if (document.getElementById('dm-persistent-call-bar')) return;
  injectDmCallStyles();

  const callBar = document.createElement('div');
  callBar.id = 'dm-persistent-call-bar';
  callBar.className = 'dm-call-bar dm-call-bar-hidden';
  callBar.innerHTML = `
    <div class="dm-pcb-left">
      <div class="dm-pcb-pulse">📞</div>
      <div class="dm-pcb-info">
        <div class="dm-pcb-title">Em chamada com <span id="dm-pcb-username" style="color:#00ff88;font-weight:700;"></span></div>
        <div class="dm-pcb-subtitle">
          <span id="dm-pcb-conn-status" style="color:#aaa;">● Conectando...</span>
          <span class="dm-pcb-dot">•</span>
          <span id="dm-pcb-duration">00:00</span>
        </div>
      </div>
    </div>
    <div class="dm-pcb-controls">
      <button class="dm-pcb-btn dm-pcb-btn-mic" id="dm-pcb-mic" title="Alternar microfone">🎙</button>
      <button class="dm-pcb-btn dm-pcb-btn-audio" id="dm-pcb-audio" title="Alternar áudio">🔊</button>
      <button class="dm-pcb-btn dm-pcb-btn-primary" id="dm-pcb-return" title="Ver chamada">💬 Expandir</button>
      <button class="dm-pcb-btn dm-pcb-btn-danger" id="dm-pcb-hangup" title="Encerrar chamada">📵 Encerrar</button>
    </div>
  `;
  document.body.appendChild(callBar);

  document.getElementById('dm-pcb-mic').addEventListener('click', toggleDmCallMic);
  document.getElementById('dm-pcb-audio').addEventListener('click', toggleDmCallAudio);
  document.getElementById('dm-pcb-return').addEventListener('click', openDmCallScreen);
  document.getElementById('dm-pcb-hangup').addEventListener('click', endDmCall);
}

function showDmCallBar(username) {
  createDmCallBar();
  const bar = document.getElementById('dm-persistent-call-bar');
  if (!bar) return;
  const nameEl = document.getElementById('dm-pcb-username');
  if (nameEl) nameEl.textContent = username;
  bar.classList.remove('dm-call-bar-hidden');
}

function hideDmCallBar() {
  const bar = document.getElementById('dm-persistent-call-bar');
  if (bar) bar.classList.add('dm-call-bar-hidden');
}

// ================================================
// TELA DE CHAMADA ATIVA (fullscreen)
// ================================================
function openDmCallScreen() {
  if (!window.dmCallState.isInCall) return;
  const username = window.dmCallState.targetUser;
  const initial  = (username || '?')[0].toUpperCase();

  document.getElementById('dm-call-screen')?.remove();

  const screen = document.createElement('div');
  screen.id = 'dm-call-screen';
  screen.className = 'dm-call-screen';
  screen.innerHTML = `
    <div class="dm-call-screen-avatar">${initial}</div>
    <div class="dm-call-screen-name">${escHtmlDm(username)}</div>
    <div class="dm-call-screen-status" id="dm-call-screen-status">● Chamando...</div>
    <div class="dm-call-screen-controls">
      <button class="dm-call-screen-btn mic-btn${window.dmCallState.micEnabled ? '' : ' muted'}" id="dm-call-screen-mic">${window.dmCallState.micEnabled ? '🎙' : '🔇'}</button>
      <button class="dm-call-screen-btn spk-btn" id="dm-call-screen-spk">${window.dmCallState.audioEnabled ? '🔊' : '🔕'}</button>
      <button class="dm-call-screen-btn min-btn" id="dm-call-screen-minimize">⬇</button>
      <button class="dm-call-screen-btn end-btn" id="dm-call-screen-end">📵</button>
    </div>
  `;
  document.body.appendChild(screen);

  // Sincronizar timer
  const startTime = window.dmCallState.startTime;
  if (startTime) {
    const statusEl = document.getElementById('dm-call-screen-status');
    const tick = () => {
      if (!document.getElementById('dm-call-screen-status') || !window.dmCallState.isInCall) return;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      statusEl.textContent = `● Em chamada · ${formatDmDuration(elapsed)}`;
      setTimeout(tick, 500);
    };
    setTimeout(tick, 500);
  }

  document.getElementById('dm-call-screen-mic').addEventListener('click', () => {
    toggleDmCallMic();
    const btn = document.getElementById('dm-call-screen-mic');
    if (btn) { btn.classList.toggle('muted', !window.dmCallState.micEnabled); btn.textContent = window.dmCallState.micEnabled ? '🎙' : '🔇'; }
  });
  document.getElementById('dm-call-screen-spk').addEventListener('click', () => {
    toggleDmCallAudio();
    const btn = document.getElementById('dm-call-screen-spk');
    if (btn) { btn.textContent = window.dmCallState.audioEnabled ? '🔊' : '🔕'; }
  });
  document.getElementById('dm-call-screen-minimize').addEventListener('click', () => {
    document.getElementById('dm-call-screen')?.remove();
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
    if (!confirm(`Você está em uma chamada com ${window.dmCallState.targetUser}. Encerrar e ligar para ${username}?`)) return;
    endDmCall();
    await new Promise(r => setTimeout(r, 300));
  }

  window.dmCallState.isInCall    = true;
  window.dmCallState.targetUser  = username;
  window.dmCallState.callType    = 'voice';
  window.dmCallState.startTime   = Date.now();
  window.dmCallState.micEnabled  = true;
  window.dmCallState.audioEnabled = true;
  window.dmCallState.isCaller    = true;

  // Som de chamada
  try { const a = new Audio('call.wav'); a.volume = 0.5; a.play().catch(() => {}); setTimeout(()=>{a.pause();a.src='';},3000); } catch(_) {}

  // Capturar microfone
  try {
    const constraints = { audio: true };
    
    // Usar dispositivo salvo nas configurações se existir
    if (localStorage.getItem('audioDeviceId')) {
      constraints.audio = { deviceId: { exact: localStorage.getItem('audioDeviceId') } };
    }
    
    window.dmCallState.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('[DM Call] Microfone ativado');
  } catch(err) {
    console.warn('[DM Call] Sem microfone:', err.message);
    if (typeof showToast === 'function') showToast('⚠️ Sem acesso ao microfone — chamada continuará sem áudio local');
  }

  createDmCallBar();
  showDmCallBar(username);
  startDmCallTimer();

  // Avisar o destinatário via servidor (inclui toId para routing por UUID)
  const _callTargetId = _dmGetUserId(username);
  window.dmCallState.targetUserId = _callTargetId;
  console.log('[DM:CALL:START] Iniciando chamada para', username, '(toId=', _callTargetId, ')');
  const _myId = window.myUserId || localStorage.getItem('zx_my_user_id');
  console.log('[DM:CALL:START] fromId=', _myId, 'from=', window.currentUsername || window.username || 'Usuário');
  if (window.socket && window.socket.connected) {
    window.socket.emit('dm:call:start', {
      to: username,
      toId: _callTargetId,
      from: window.currentUsername || window.username || 'Usuário',
      fromId: _myId || null,
      type: 'voice'
    });
    console.log('[DM:CALL:START] Evento emitido para servidor');
  } else {
    console.warn('[DM:CALL:START] Socket não conectado — não é possível iniciar chamada');
    if (typeof showToast === 'function') showToast('❌ Sem conexão com o servidor');
  }

  openDmCallScreen();
  if (typeof showToast === 'function') showToast(`📞 Chamando ${username}...`);
};

// Quando o destinatário aceitar → o caller cria o offer WebRTC
async function _onDmCallAccepted(data) {
  const targetUser = window.dmCallState.targetUser || data.from;
  if (!targetUser) return;
  console.log('[DM:CALL:ACCEPTED] Aceita por', data.from, '— criando offer WebRTC');

  const statusEl = document.getElementById('dm-call-screen-status');
  if (statusEl) statusEl.textContent = '● Conectando...';

  const pc = createDmPeerConnection(targetUser);
  addLocalStreamToPeer(pc);

  try {
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    console.log('[WEBRTC] Offer criada e setLocalDescription');
    window.socket.emit('dm:voice:offer', { to: targetUser, toId: window.dmCallState.targetUserId || _dmGetUserId(targetUser), offer: pc.localDescription });
    console.log('[WEBRTC] Offer enviada para', targetUser, '(toId=', window.dmCallState.targetUserId, ')');
  } catch(err) {
    console.error('[WEBRTC] Erro ao criar offer:', err.message);
    if (typeof showToast === 'function') showToast('❌ Erro ao conectar áudio');
  }
}

// ================================================
// ENCERRAR CHAMADA
// ================================================
window.endDmCall = function() {
  closeDmPeerConnection();

  if (window.dmCallState.localStream) {
    window.dmCallState.localStream.getTracks().forEach(t => t.stop());
    window.dmCallState.localStream = null;
  }
  if (window.dmCallState.durationInterval) {
    clearInterval(window.dmCallState.durationInterval);
    window.dmCallState.durationInterval = null;
  }

  if (window.socket && window.socket.connected && window.dmCallState.targetUser) {
    const _myId = window.myUserId || localStorage.getItem('zx_my_user_id');
    window.socket.emit('dm:call:end', {
      to: window.dmCallState.targetUser,
      toId: window.dmCallState.targetUserId || _dmGetUserId(window.dmCallState.targetUser),
      from: window.currentUsername || window.username || 'Usuário',
      fromId: _myId || null
    });
  }

  const username = window.dmCallState.targetUser;
  window.dmCallState.isInCall    = false;
  window.dmCallState.targetUser  = null;
  window.dmCallState.startTime   = null;
  window.dmCallState.micEnabled  = true;
  window.dmCallState.audioEnabled = true;
  window.dmCallState.isCaller    = false;

  hideDmCallBar();
  document.getElementById('dm-call-screen')?.remove();

  if (typeof showToast === 'function') showToast(`📵 Chamada encerrada${username ? ' com ' + username : ''}`);
  try { const a = new Audio('uncall.mp3'); a.volume = 0.4; a.play().catch(() => {}); } catch(_) {}
  console.log('[DM Call] Chamada encerrada');
};

// ================================================
// CONTROLES DE MIC E ÁUDIO
// ================================================
function toggleDmCallMic() {
  window.dmCallState.micEnabled = !window.dmCallState.micEnabled;
  if (window.dmCallState.localStream) {
    window.dmCallState.localStream.getAudioTracks().forEach(t => { t.enabled = window.dmCallState.micEnabled; });
  }
  const btn = document.getElementById('dm-pcb-mic');
  if (btn) { btn.classList.toggle('muted', !window.dmCallState.micEnabled); btn.textContent = window.dmCallState.micEnabled ? '🎙' : '🔇'; }
  if (typeof showToast === 'function') showToast(window.dmCallState.micEnabled ? '🎙 Microfone ativado' : '🔇 Microfone desativado');
}

function toggleDmCallAudio() {
  window.dmCallState.audioEnabled = !window.dmCallState.audioEnabled;
  const audio = window.dmCallState.remoteAudio;
  if (audio) audio.muted = !window.dmCallState.audioEnabled;
  const btn = document.getElementById('dm-pcb-audio');
  if (btn) { btn.classList.toggle('muted', !window.dmCallState.audioEnabled); btn.textContent = window.dmCallState.audioEnabled ? '🔊' : '🔕'; }
  if (typeof showToast === 'function') showToast(window.dmCallState.audioEnabled ? '🔊 Áudio ativado' : '🔕 Áudio desativado');
}

// ================================================
// TIMER
// ================================================
function startDmCallTimer() {
  if (window.dmCallState.durationInterval) clearInterval(window.dmCallState.durationInterval);
  let seconds = 0;
  window.dmCallState.durationInterval = setInterval(() => {
    seconds++;
    const el = document.getElementById('dm-pcb-duration');
    if (el) el.textContent = formatDmDuration(seconds);
  }, 1000);
}

// ================================================
// MODAL DE CHAMADA RECEBIDA
// ================================================
function showDmIncomingCall(from) {
  console.log('[DM:CALL:INCOMING] showDmIncomingCall chamado para:', from);
  document.getElementById('dm-incoming-call-modal')?.remove();

  // Tocar ringtone
  let ringAudio = null;
  try { 
    ringAudio = new Audio('call.wav'); 
    ringAudio.id = 'dm-incoming-audio'; 
    ringAudio.loop = true; 
    ringAudio.volume = 0.5; 
    document.body.appendChild(ringAudio); 
    ringAudio.play().catch(() => {}); 
  } catch(e) {
    console.warn('[DM:CALL:INCOMING] Erro ao tocar ringtone:', e.message);
  }

  function stopRing() { 
    if (ringAudio) { 
      ringAudio.pause(); 
      try { ringAudio.remove(); } catch(_) {} 
      ringAudio = null; 
    } 
  }

  const modal = document.createElement('div');
  modal.id = 'dm-incoming-call-modal';
  modal.style.cssText = `
    position:fixed!important;top:24px!important;right:24px!important;
    z-index:9999999!important;background:rgba(10,10,20,0.97)!important;
    backdrop-filter:blur(20px)!important;border:1px solid #00ff88!important;
    border-radius:20px!important;padding:20px 24px!important;min-width:280px!important;
    box-shadow:0 0 40px rgba(0,255,136,0.4)!important;
    animation:dmIncomingIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
  `;
  modal.innerHTML = `
    <style>@keyframes dmIncomingIn{from{opacity:0;transform:translateX(100px);}to{opacity:1;transform:translateX(0);}}</style>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
      <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#8b00ff,#ff00ff);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:22px;">${(from[0]||'?').toUpperCase()}</div>
      <div>
        <div style="color:#fff;font-weight:700;font-size:15px;">${escHtmlDm(from)}</div>
        <div style="color:#00ff88;font-size:13px;margin-top:2px;">📞 Chamada de voz recebida</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;">
      <button id="dm-incoming-reject" style="flex:1;padding:10px;background:rgba(237,66,69,0.2);border:1px solid rgba(237,66,69,0.5);border-radius:10px;color:#ed4245;cursor:pointer;font-size:14px;font-weight:600;">📵 Recusar</button>
      <button id="dm-incoming-accept" style="flex:1;padding:10px;background:rgba(0,255,136,0.2);border:1px solid rgba(0,255,136,0.5);border-radius:10px;color:#00ff88;cursor:pointer;font-size:14px;font-weight:600;">📞 Atender</button>
    </div>
  `;
  document.body.appendChild(modal);
  console.log('[DM:CALL:INCOMING] Modal adicionado ao DOM');

  const autoClose = setTimeout(() => { 
    console.log('[DM:CALL:INCOMING] Timeout - fechando modal');
    stopRing(); 
    modal.remove(); 
  }, 30000);

  const rejectBtn = document.getElementById('dm-incoming-reject');
  const acceptBtn = document.getElementById('dm-incoming-accept');
  
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => {
      console.log('[DM:CALL:INCOMING] Recusar clicado');
      clearTimeout(autoClose);
      stopRing();
      modal.remove();
      if (window.socket && window.socket.connected) {
        const _myId = window.myUserId || localStorage.getItem('zx_my_user_id');
        window.socket.emit('dm:call:reject', { to: from, toId: window.dmCallState._incomingCallerId || _dmGetUserId(from), from: window.currentUsername || window.username || 'Usuário', fromId: _myId || null });
        console.log('[DM:CALL:INCOMING] dm:call:reject emitido');
      }
      if (typeof showToast === 'function') showToast('📵 Chamada recusada');
    });
  } else {
    console.error('[DM:CALL:INCOMING] Botão recusar não encontrado');
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', async () => {
      console.log('[DM:CALL:INCOMING] Atender clicado');
      clearTimeout(autoClose);
      stopRing();
      modal.remove();

      // Configurar estado do destinatário
      window.dmCallState.isInCall    = true;
      window.dmCallState.targetUser  = from;
      window.dmCallState.callType    = 'voice';
      window.dmCallState.startTime   = Date.now();
      window.dmCallState.micEnabled  = true;
      window.dmCallState.audioEnabled = true;
      window.dmCallState.isCaller    = false;

      // Capturar microfone
      try {
        const constraints = { audio: true };
        
        // Usar dispositivo salvo nas configurações se existir
        if (localStorage.getItem('audioDeviceId')) {
          constraints.audio = { deviceId: { exact: localStorage.getItem('audioDeviceId') } };
        }
        
        window.dmCallState.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('[DM:CALL:INCOMING] Microfone ativado (destinatário)');
      } catch(err) {
        console.warn('[DM:CALL:INCOMING] Sem microfone:', err.message);
      }

      createDmCallBar();
      showDmCallBar(from);
      startDmCallTimer();

      // Avisar o caller que aceitou (o caller vai criar o offer WebRTC)
      const _acceptTargetId = window.dmCallState._incomingCallerId || _dmGetUserId(from);
      const _myId = window.myUserId || localStorage.getItem('zx_my_user_id');
      window.dmCallState.targetUserId = _acceptTargetId;
      if (window.socket && window.socket.connected) {
        window.socket.emit('dm:call:accept', { to: from, toId: _acceptTargetId, from: window.currentUsername || window.username || 'Usuário', fromId: _myId || null });
        console.log('[DM:CALL:INCOMING] dm:call:accept emitido para', from, '(toId=', _acceptTargetId, ')');
      }

      openDmCallScreen();
      const statusEl = document.getElementById('dm-call-screen-status');
      if (statusEl) statusEl.textContent = '● Aguardando conexão de áudio...';
      if (typeof showToast === 'function') showToast(`📞 Chamada atendida — aguardando áudio...`);
    });
  } else {
    console.error('[DM:CALL:INCOMING] Botão atender não encontrado');
  }
}

// ================================================
// EVENTOS SOCKET — CHAMADAS E WEBRTC
// ================================================
function bindDmCallSocketEvents() {
  if (window._dmCallSocketBound) {
    console.log('[DM:CALL:SYSTEM] Socket events já foram bound anteriormente');
    return;
  }
  window._dmCallSocketBound = true;
  console.log('[DM:CALL:SYSTEM] Binding socket events...');

  // Receber chamada de voz — armazenar fromId para routing de volta
  window.socket.on('dm:call:incoming', (data) => {
    console.log('[DM:CALL:INCOMING] EVENTO RECEBIDO!', data);
    const from = data.from || 'Alguém';
    console.log('[DM:CALL:INCOMING] Recebida de:', from, '(fromId=', data.fromId, ')');
    window.dmCallState._incomingCallerId = data.fromId || null;
    showDmIncomingCall(from);
  });

  // Chamada aceita → caller cria offer WebRTC
  window.socket.on('dm:call:accepted', (data) => {
    console.log('[DM:CALL:ACCEPTED] Recebido de:', data.from);
    if (window.dmCallState.isInCall && window.dmCallState.isCaller) {
      _onDmCallAccepted(data);
    }
  });

  // Chamada rejeitada
  window.socket.on('dm:call:rejected', (data) => {
    console.log('[DM:CALL:REJECTED] Recebido de:', data.from);
    if (window.dmCallState.isInCall) {
      endDmCall();
      if (typeof showToast === 'function') showToast(`📵 ${escHtmlDm(data.from)} recusou a chamada`);
    }
  });

  // Outro lado encerrou
  window.socket.on('dm:call:ended', (data) => {
    console.log('[DM:CALL:ENDED] Recebido de:', data.from);
    if (window.dmCallState.isInCall) {
      // Evitar loop: zerar target antes de chamar endDmCall
      const prevTarget = window.dmCallState.targetUser;
      window.dmCallState.targetUser = null;
      window.dmCallState.isInCall = false;
      endDmCall();
      if (typeof showToast === 'function') showToast(`📵 ${escHtmlDm(data.from || prevTarget)} encerrou a chamada`);
    }
  });

  // OFFER WebRTC recebido → destinatário responde com answer
  window.socket.on('dm:voice:offer', async (data) => {
    console.log('[WEBRTC] Offer recebido de:', data.from);
    if (!window.dmCallState.isInCall) {
      console.warn('[WEBRTC] Offer ignorado — não está em chamada');
      return;
    }
    const targetUser = data.from;

    if (!window.dmCallState.localStream) {
      try {
        const constraints = { audio: true };
        
        // Usar dispositivo salvo nas configurações se existir
        if (localStorage.getItem('audioDeviceId')) {
          constraints.audio = { deviceId: { exact: localStorage.getItem('audioDeviceId') } };
        }
        
        window.dmCallState.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('[WEBRTC] Microfone ativado (destinatário)');
      } catch(err) { 
        console.warn('[WEBRTC] Sem microfone:', err.message); 
      }
    }

    const pc = createDmPeerConnection(targetUser);
    addLocalStreamToPeer(pc);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      console.log('[WEBRTC] setRemoteDescription (offer) concluído');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[WEBRTC] Answer criada e setLocalDescription');
      window.socket.emit('dm:voice:answer', { to: targetUser, toId: window.dmCallState.targetUserId || _dmGetUserId(targetUser), answer: pc.localDescription });
      console.log('[WEBRTC] Answer enviada para', targetUser, '(toId=', window.dmCallState.targetUserId, ')');

      const statusEl = document.getElementById('dm-call-screen-status');
      if (statusEl) statusEl.textContent = '● Conectando...';
    } catch(err) {
      console.error('[WEBRTC] Erro ao criar answer:', err.message);
      if (typeof showToast === 'function') showToast('❌ Erro ao conectar áudio');
    }
  });

  // ANSWER WebRTC recebido → caller finaliza handshake
  window.socket.on('dm:voice:answer', async (data) => {
    console.log('[WEBRTC] Answer recebido de:', data.from);
    const pc = window.dmCallState.peerConnection;
    if (!pc) { console.warn('[WEBRTC] Answer ignorado — sem peer connection'); return; }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      console.log('[WEBRTC] setRemoteDescription (answer) concluído — aguardando ICE');
    } catch(err) {
      console.error('[WEBRTC] Erro ao setar answer:', err.message);
    }
  });

  // ICE candidates
  window.socket.on('dm:voice:ice', async (data) => {
    const pc = window.dmCallState.peerConnection;
    if (!pc || !data.candidate) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      console.log('[WEBRTC] ICE candidate adicionado');
    } catch(err) {
      console.warn('[WEBRTC] ICE candidate ignorado:', err.message);
    }
  });
}

// ================================================
// INICIALIZAR
// ================================================
function initDmCallSystem() {
  console.log('[DM:CALL:SYSTEM] Iniciando sistema...');
  console.log('[DM:CALL:SYSTEM] window.socket disponível?', !!window.socket);
  console.log('[DM:CALL:SYSTEM] window.socket.connected?', window.socket?.connected);
  injectDmCallStyles();
  createDmCallBar();
  ensureRemoteAudio();

  if (window.socket) {
    console.log('[DM:CALL:SYSTEM] Socket já disponível, binding events...');
    bindDmCallSocketEvents();
  } else {
    console.log('[DM:CALL:SYSTEM] Socket não disponível ainda, aguardando...');
    const timer = setInterval(() => {
      if (window.socket) {
        console.log('[DM:CALL:SYSTEM] Socket disponível, binding events...');
        clearInterval(timer);
        bindDmCallSocketEvents();
      }
    }, 300);
    // Para de tentar após 20 segundos
    setTimeout(() => {
      clearInterval(timer);
      console.warn('[DM:CALL:SYSTEM] Timeout aguardando socket');
    }, 20000);
  }
  
  // Listener para reconexão - rebind events se necessário
  if (window.socket) {
    window.socket.on('reconnect', () => {
      console.log('[DM:CALL:SYSTEM] Socket reconectado, re-binding events...');
      window._dmCallSocketBound = false; // Permitir rebind
      bindDmCallSocketEvents();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDmCallSystem);
} else {
  initDmCallSystem();
}
