// ============================================================
// dm-call-system.js – Sistema de Chamadas Privadas (DM Calls)
// Versão 3.1 – Corrigida e Estendida
//
// BUGS CORRIGIDOS:
//   1. 'reconnect' não existe no Socket.IO v3+ → trocado por 'connect'
//   2. Listener de reconexão agora é registrado dinamicamente
//   3. bindDmCallSocketEvents usa flag no próprio socket
//   4. Race condition: dm:call:start não é enviado com toId=null;
//      aguarda resolução do ID (até 2s) e usa username como fallback.
//   5. Melhor tratamento de erros e logs para depuração
//   6. Fallback para quando o socket não está disponível
// ============================================================

// ============================================================
// CONSTANTES E CONFIGURAÇÕES
// ============================================================

/** Servidores STUN para WebRTC */
const DM_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
];

/** Estado global da chamada */
window.dmCallState = {
  isInCall: false,
  targetUser: null,
  targetUserId: null,
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
  _pendingUserIdCallback: null
};

// ============================================================
// UTILITÁRIOS
// ============================================================

/**
 * Escapa caracteres especiais para HTML
 */
function escHtmlDm(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Formata duração em MM:SS
 */
function formatDmDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return m + ':' + s;
}

/**
 * Obtém o ID de um usuário a partir do cache global friendIds
 */
function _dmGetUserId(username) {
  if (!username) return null;
  const key = username.toLowerCase();
  return (window.friendIds && window.friendIds[key]) || null;
}

// ============================================================
// ÁUDIO REMOTO
// ============================================================

/**
 * Garante que o elemento <audio> para áudio remoto exista
 */
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

// ============================================================
// PEER CONNECTION WEBRTC
// ============================================================

/**
 * Cria uma nova conexão PeerConnection para a chamada
 */
function createDmPeerConnection(targetUser) {
  // Fecha conexão anterior se existir
  closeDmPeerConnection();

  const pc = new RTCPeerConnection({ iceServers: DM_ICE_SERVERS });
  window.dmCallState.peerConnection = pc;

  // --- Evento: candidato ICE ---
  pc.onicecandidate = function(evt) {
    if (evt.candidate && window.socket && window.socket.connected) {
      const toId = window.dmCallState.targetUserId || _dmGetUserId(targetUser);
      const fromId = window.myUserId || localStorage.getItem('zx_my_user_id') || null;
      window.socket.emit('dm:voice:ice', {
        to: targetUser,
        toId: toId,
        fromId: fromId,
        candidate: evt.candidate
      });
    }
  };

  // --- Evento: stream remoto recebido ---
  pc.ontrack = function(evt) {
    const audio = ensureRemoteAudio();
    if (evt.streams && evt.streams[0]) {
      audio.srcObject = evt.streams[0];
    }
  };

  // --- Evento: estado da conexão ICE ---
  pc.oniceconnectionstatechange = function() {
    const state = pc.iceConnectionState;
    console.log('[DM-CALL] ICE connection state:', state);

    if (state === 'failed') {
      try { pc.restartIce(); } catch (_) {}
    }

    if (state === 'connected' || state === 'completed') {
      const statusEl = document.getElementById('dm-call-screen-status');
      if (statusEl) statusEl.textContent = '● Em chamada';
      const connEl = document.getElementById('dm-pcb-conn-status');
      if (connEl) {
        connEl.textContent = '● Conectado';
        connEl.style.color = '#00ff88';
      }
    }

    if (state === 'disconnected' || state === 'closed') {
      const connEl = document.getElementById('dm-pcb-conn-status');
      if (connEl) {
        connEl.textContent = '● Desconectado';
        connEl.style.color = '#ed4245';
      }
    }
  };

  // --- Evento: negociação necessária (para reiniciar ICE) ---
  pc.onnegotiationneeded = async function() {
    try {
      if (pc.signalingState !== 'stable') return;
      await pc.createOffer();
      // Não enviamos automaticamente, deixamos o fluxo normal
    } catch (_) {}
  };

  return pc;
}

/**
 * Fecha a PeerConnection atual e limpa recursos
 */
function closeDmPeerConnection() {
  const pc = window.dmCallState.peerConnection;
  if (pc) {
    try { pc.close(); } catch (_) {}
    window.dmCallState.peerConnection = null;
  }
  const audio = window.dmCallState.remoteAudio;
  if (audio) {
    audio.srcObject = null;
  }
}

/**
 * Adiciona o stream local à PeerConnection
 */
function addLocalStreamToPeer(pc) {
  const stream = window.dmCallState.localStream;
  if (!stream || !pc) return;
  stream.getTracks().forEach(function(track) {
    try { pc.addTrack(track, stream); } catch (_) {}
  });
}

// ============================================================
// BARRA PERSISTENTE DE CHAMADA
// ============================================================

/**
 * Injeta os estilos CSS da barra de chamada
 */
function injectDmCallStyles() {
  if (document.getElementById('dm-call-bar-css')) return;

  const style = document.createElement('style');
  style.id = 'dm-call-bar-css';
  style.textContent = `
    .dm-call-bar {
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
      animation: dmCallBarIn 0.35s cubic-bezier(0.34,1.56,0.64,1) !important;
      pointer-events: auto !important;
    }
    .dm-call-bar-hidden { display: none !important; }
    @keyframes dmCallBarIn {
      from { opacity: 0; transform: translateX(-50%) translateY(80px) scale(0.9); }
      to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    }
    .dm-pcb-left { display: flex; align-items: center; gap: 14px; }
    .dm-pcb-pulse { font-size: 22px; animation: dmCallPulse 1.4s ease-in-out infinite; }
    @keyframes dmCallPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.9); }
    }
    .dm-pcb-info { display: flex; flex-direction: column; gap: 3px; }
    .dm-pcb-title { color: #fff; font-weight: 600; font-size: 14px; white-space: nowrap; }
    .dm-pcb-subtitle { color: #aaa; font-size: 12px; display: flex; align-items: center; gap: 6px; }
    .dm-pcb-dot { color: #555; }
    .dm-pcb-controls { display: flex; align-items: center; gap: 8px; }
    .dm-pcb-btn {
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
    .dm-pcb-btn:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.25); }
    .dm-pcb-btn.muted { background: rgba(237,66,69,0.25) !important; border-color: rgba(237,66,69,0.5) !important; color: #ed4245 !important; }
    .dm-pcb-btn-primary { background: rgba(0,255,136,0.15) !important; border-color: rgba(0,255,136,0.4) !important; color: #00ff88 !important; }
    .dm-pcb-btn-primary:hover { background: rgba(0,255,136,0.28) !important; }
    .dm-pcb-btn-danger { background: rgba(237,66,69,0.15) !important; border-color: rgba(237,66,69,0.4) !important; color: #ed4245 !important; }
    .dm-pcb-btn-danger:hover { background: rgba(237,66,69,0.28) !important; }
    @media(max-width:600px) {
      .dm-call-bar { min-width: auto !important; width: calc(100vw - 32px) !important; padding: 10px 14px !important; gap: 10px !important; border-radius: 20px !important; bottom: 20px !important; }
      .dm-pcb-subtitle { display: none; }
    }

    /* Tela fullscreen */
    .dm-call-screen {
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483646 !important;
      background: radial-gradient(ellipse at center, #0d001f 0%, #040008 100%) !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      animation: dmScreenIn 0.3s ease-out !important;
    }
    @keyframes dmScreenIn { from { opacity: 0; } to { opacity: 1; } }
    .dm-call-screen-avatar {
      width: 120px; height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #8b00ff, #ff00ff);
      display: flex; align-items: center; justify-content: center;
      font-size: 52px; font-weight: 700; color: #fff;
      box-shadow: 0 0 60px rgba(0,255,136,0.5), 0 0 120px rgba(0,255,136,0.2);
      animation: dmAvatarPulse 2s ease-in-out infinite;
      margin-bottom: 24px;
    }
    @keyframes dmAvatarPulse {
      0%, 100% { box-shadow: 0 0 40px rgba(0,255,136,0.5), 0 0 80px rgba(0,255,136,0.2); }
      50% { box-shadow: 0 0 80px rgba(0,255,136,0.8), 0 0 160px rgba(0,255,136,0.3); }
    }
    .dm-call-screen-name { color: #fff; font-size: 28px; font-weight: 700; margin-bottom: 8px; text-shadow: 0 0 20px rgba(0,255,136,0.4); }
    .dm-call-screen-status { color: #00ff88; font-size: 16px; margin-bottom: 48px; letter-spacing: 0.5px; }
    .dm-call-screen-controls { display: flex; align-items: center; gap: 24px; }
    .dm-call-screen-btn {
      width: 64px; height: 64px; border-radius: 50%; border: none;
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; cursor: pointer; transition: all 0.2s;
    }
    .dm-call-screen-btn:hover { transform: scale(1.1); }
    .dm-call-screen-btn.mic-btn { background: rgba(255,255,255,0.12); color: #fff; }
    .dm-call-screen-btn.mic-btn.muted { background: rgba(237,66,69,0.3); color: #ed4245; }
    .dm-call-screen-btn.spk-btn { background: rgba(255,255,255,0.12); color: #fff; }
    .dm-call-screen-btn.end-btn { background: #ed4245; color: #fff; width: 72px; height: 72px; font-size: 28px; box-shadow: 0 0 20px rgba(237,66,69,0.5); }
    .dm-call-screen-btn.end-btn:hover { background: #c0392b; }
    .dm-call-screen-btn.min-btn { background: rgba(255,200,0,0.15); color: #ffd700; }
  `;
  document.head.appendChild(style);
}

/**
 * Cria a barra persistente de chamada (se não existir)
 */
function createDmCallBar() {
  if (document.getElementById('dm-persistent-call-bar')) return;
  injectDmCallStyles();

  const bar = document.createElement('div');
  bar.id = 'dm-persistent-call-bar';
  bar.className = 'dm-call-bar dm-call-bar-hidden';
  bar.innerHTML = `
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
      <button class="dm-pcb-btn" id="dm-pcb-mic">🎙</button>
      <button class="dm-pcb-btn" id="dm-pcb-audio">🔊</button>
      <button class="dm-pcb-btn dm-pcb-btn-primary" id="dm-pcb-return">💬 Expandir</button>
      <button class="dm-pcb-btn dm-pcb-btn-danger" id="dm-pcb-hangup">📵 Encerrar</button>
    </div>
  `;
  document.body.appendChild(bar);

  // Eventos da barra
  document.getElementById('dm-pcb-mic').addEventListener('click', toggleDmCallMic);
  document.getElementById('dm-pcb-audio').addEventListener('click', toggleDmCallAudio);
  document.getElementById('dm-pcb-return').addEventListener('click', openDmCallScreen);
  document.getElementById('dm-pcb-hangup').addEventListener('click', endDmCall);
}

/**
 * Mostra a barra de chamada com o nome do usuário
 */
function showDmCallBar(username) {
  createDmCallBar();
  const bar = document.getElementById('dm-persistent-call-bar');
  if (!bar) return;
  const el = document.getElementById('dm-pcb-username');
  if (el) el.textContent = username;
  bar.classList.remove('dm-call-bar-hidden');
}

/**
 * Esconde a barra de chamada
 */
function hideDmCallBar() {
  const bar = document.getElementById('dm-persistent-call-bar');
  if (bar) bar.classList.add('dm-call-bar-hidden');
}

// ============================================================
// TELA FULLSCREEN DA CHAMADA
// ============================================================

/**
 * Abre a tela fullscreen da chamada
 */
function openDmCallScreen() {
  if (!window.dmCallState.isInCall) return;
  const username = window.dmCallState.targetUser;
  const initial = (username || '?')[0].toUpperCase();

  // Remove tela anterior se existir
  const existing = document.getElementById('dm-call-screen');
  if (existing) existing.remove();

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

  // Atualiza status com duração
  if (window.dmCallState.startTime) {
    const statusEl = document.getElementById('dm-call-screen-status');
    (function tick() {
      if (!document.getElementById('dm-call-screen-status') || !window.dmCallState.isInCall) return;
      const elapsed = Math.floor((Date.now() - window.dmCallState.startTime) / 1000);
      statusEl.textContent = '● Em chamada · ' + formatDmDuration(elapsed);
      setTimeout(tick, 500);
    })();
  }

  // Eventos dos botões da tela
  document.getElementById('dm-call-screen-mic').addEventListener('click', function() {
    toggleDmCallMic();
    this.classList.toggle('muted', !window.dmCallState.micEnabled);
    this.textContent = window.dmCallState.micEnabled ? '🎙' : '🔇';
  });

  document.getElementById('dm-call-screen-spk').addEventListener('click', function() {
    toggleDmCallAudio();
    this.textContent = window.dmCallState.audioEnabled ? '🔊' : '🔕';
  });

  document.getElementById('dm-call-screen-minimize').addEventListener('click', function() {
    const sc = document.getElementById('dm-call-screen');
    if (sc) sc.remove();
    if (typeof showToast === 'function') showToast('📞 Chamada minimizada');
  });

  document.getElementById('dm-call-screen-end').addEventListener('click', endDmCall);
}

// ============================================================
// INICIAR CHAMADA (QUEM LIGA)
// ============================================================

/**
 * Inicia uma chamada de voz para um usuário
 * @param {string} username - Nome do usuário a ser chamado
 */
window.startDmVoiceCall = async function(username) {
  if (!username) {
    if (typeof showToast === 'function') showToast('⚠️ Selecione um contato primeiro');
    return;
  }

  // Se já está em chamada com a mesma pessoa, abre a tela
  if (window.dmCallState.isInCall && window.dmCallState.targetUser === username) {
    openDmCallScreen();
    return;
  }

  // Se está em chamada com outra pessoa, pergunta se quer encerrar
  if (window.dmCallState.isInCall) {
    const confirmMsg = `Encerrar chamada com ${window.dmCallState.targetUser} e ligar para ${username}?`;
    if (!confirm(confirmMsg)) return;
    endDmCall();
    await new Promise(function(r) { setTimeout(r, 300); });
  }

  // Verifica conexão com o socket
  if (!window.socket || !window.socket.connected) {
    if (typeof showToast === 'function') showToast('❌ Sem conexão com o servidor');
    return;
  }

  // Configura estado da chamada
  window.dmCallState.isInCall     = true;
  window.dmCallState.targetUser   = username;
  window.dmCallState.callType     = 'voice';
  window.dmCallState.startTime    = Date.now();
  window.dmCallState.micEnabled   = true;
  window.dmCallState.audioEnabled = true;
  window.dmCallState.isCaller     = true;

  // Toca som de chamada (opcional)
  try {
    const ring = new Audio('call.wav');
    ring.volume = 0.5;
    ring.play().catch(function() {});
    setTimeout(function() { ring.pause(); ring.src = ''; }, 3000);
  } catch (_) {}

  // Obtém stream de áudio local
  try {
    const constraints = { audio: true };
    const savedDevice = localStorage.getItem('audioDeviceId');
    if (savedDevice) {
      constraints.audio = { deviceId: { exact: savedDevice } };
    }
    window.dmCallState.localStream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Sem acesso ao microfone — chamada sem áudio local');
    }
  }

  // Cria e mostra a barra persistente
  createDmCallBar();
  showDmCallBar(username);
  startDmCallTimer();

  // Prepara dados do chamador
  const myUsername = window.username || window.currentUsername || 'Usuário';
  const myId = window.myUserId || localStorage.getItem('zx_my_user_id') || null;

  // --- CORREÇÃO: Resolve o ID do destinatário (até 2s) antes de emitir ---
  function _emitCallStart(toId) {
    window.dmCallState.targetUserId = toId;
    window.socket.emit('dm:call:start', {
      to:     username,
      toId:   toId || null,
      from:   myUsername,
      fromId: myId
    });
  }

  const cachedId = _dmGetUserId(username);
  if (cachedId) {
    _emitCallStart(cachedId);
  } else {
    let resolved = false;
    // Callback para quando o servidor responder com o ID
    window._dmCallPendingUserId = function(uname, uid) {
      if (uname.toLowerCase() !== username.toLowerCase() || resolved) return;
      resolved = true;
      window._dmCallPendingUserId = null;
      _emitCallStart(uid);
    };
    // Solicita o ID ao servidor
    window.socket.emit('dm:get-user-id', { username: username });
    // Timeout: se não responder em 2s, emite com null
    setTimeout(function() {
      if (!resolved) {
        resolved = true;
        window._dmCallPendingUserId = null;
        _emitCallStart(null);
      }
    }, 2000);
  }

  // Abre a tela fullscreen
  openDmCallScreen();
  if (typeof showToast === 'function') showToast('📞 Chamando ' + username + '...');
};

// ============================================================
// ACEITE DA CHAMADA (PELO CALLER)
// ============================================================

/**
 * Quando o destinatário aceita, cria a oferta WebRTC
 */
async function _onDmCallAccepted(data) {
  const targetUser = window.dmCallState.targetUser || data.from;
  if (!targetUser) return;

  const statusEl = document.getElementById('dm-call-screen-status');
  if (statusEl) statusEl.textContent = '● Conectando...';

  const pc = createDmPeerConnection(targetUser);
  addLocalStreamToPeer(pc);

  try {
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    const toId = window.dmCallState.targetUserId || _dmGetUserId(targetUser);
    window.socket.emit('dm:voice:offer', {
      to: targetUser,
      toId: toId,
      offer: pc.localDescription
    });
  } catch (err) {
    if (typeof showToast === 'function') showToast('❌ Erro ao conectar áudio');
    console.error('[DM-CALL] Erro ao criar offer:', err);
  }
}

// ============================================================
// ENCERRAR CHAMADA
// ============================================================

/**
 * Encerra a chamada atual e limpa todos os recursos
 */
window.endDmCall = function() {
  // Fecha PeerConnection
  closeDmPeerConnection();

  // Para stream local
  if (window.dmCallState.localStream) {
    window.dmCallState.localStream.getTracks().forEach(function(t) { t.stop(); });
    window.dmCallState.localStream = null;
  }

  // Para timer de duração
  if (window.dmCallState.durationInterval) {
    clearInterval(window.dmCallState.durationInterval);
    window.dmCallState.durationInterval = null;
  }

  // Notifica o servidor
  if (window.socket && window.socket.connected && window.dmCallState.targetUser) {
    const toId = window.dmCallState.targetUserId || _dmGetUserId(window.dmCallState.targetUser);
    const fromId = window.myUserId || localStorage.getItem('zx_my_user_id') || null;
    window.socket.emit('dm:call:end', {
      to:     window.dmCallState.targetUser,
      toId:   toId,
      from:   window.username || window.currentUsername || 'Usuário',
      fromId: fromId
    });
  }

  const username = window.dmCallState.targetUser;

  // Reseta estado
  window.dmCallState.isInCall     = false;
  window.dmCallState.targetUser   = null;
  window.dmCallState.targetUserId = null;
  window.dmCallState.startTime    = null;
  window.dmCallState.micEnabled   = true;
  window.dmCallState.audioEnabled = true;
  window.dmCallState.isCaller     = false;

  // Esconde UI
  hideDmCallBar();
  const screen = document.getElementById('dm-call-screen');
  if (screen) screen.remove();

  if (typeof showToast === 'function') {
    showToast('📵 Chamada encerrada' + (username ? ' com ' + username : ''));
  }

  // Toca som de desligar (opcional)
  try {
    const endSound = new Audio('uncall.mp3');
    endSound.volume = 0.4;
    endSound.play().catch(function() {});
  } catch (_) {}
};

// ============================================================
// CONTROLES: MIC / ÁUDIO
// ============================================================

/**
 * Alterna o microfone (mudo/ativo)
 */
function toggleDmCallMic() {
  window.dmCallState.micEnabled = !window.dmCallState.micEnabled;
  if (window.dmCallState.localStream) {
    window.dmCallState.localStream.getAudioTracks().forEach(function(t) {
      t.enabled = window.dmCallState.micEnabled;
    });
  }

  const btn = document.getElementById('dm-pcb-mic');
  if (btn) {
    btn.classList.toggle('muted', !window.dmCallState.micEnabled);
    btn.textContent = window.dmCallState.micEnabled ? '🎙' : '🔇';
  }

  if (typeof showToast === 'function') {
    showToast(window.dmCallState.micEnabled ? '🎙 Microfone ativado' : '🔇 Microfone desativado');
  }
}

/**
 * Alterna o áudio do alto-falante (mudo/ativo)
 */
function toggleDmCallAudio() {
  window.dmCallState.audioEnabled = !window.dmCallState.audioEnabled;
  const audio = window.dmCallState.remoteAudio;
  if (audio) audio.muted = !window.dmCallState.audioEnabled;

  const btn = document.getElementById('dm-pcb-audio');
  if (btn) {
    btn.classList.toggle('muted', !window.dmCallState.audioEnabled);
    btn.textContent = window.dmCallState.audioEnabled ? '🔊' : '🔕';
  }

  if (typeof showToast === 'function') {
    showToast(window.dmCallState.audioEnabled ? '🔊 Áudio ativado' : '🔕 Áudio desativado');
  }
}

// ============================================================
// TIMER DE DURAÇÃO
// ============================================================

/**
 * Inicia o timer de duração da chamada (atualiza a cada segundo)
 */
function startDmCallTimer() {
  if (window.dmCallState.durationInterval) {
    clearInterval(window.dmCallState.durationInterval);
  }

  let seconds = 0;
  window.dmCallState.durationInterval = setInterval(function() {
    seconds++;
    const el = document.getElementById('dm-pcb-duration');
    if (el) el.textContent = formatDmDuration(seconds);
  }, 1000);
}

// ============================================================
// MODAL DE CHAMADA RECEBIDA
// ============================================================

/**
 * Exibe o modal de chamada recebida
 * @param {string} from - Nome do chamador
 */
function showDmIncomingCall(from) {
  // Remove modal anterior se existir
  const existing = document.getElementById('dm-incoming-call-modal');
  if (existing) existing.remove();

  const callerName = from || 'Alguém';
  let ringAudio = null;

  // Toca som de toque
  try {
    ringAudio = new Audio('call.wav');
    ringAudio.id = 'dm-incoming-audio';
    ringAudio.loop = true;
    ringAudio.volume = 0.5;
    document.body.appendChild(ringAudio);
    ringAudio.play().catch(function() {});
  } catch (e) {}

  function stopRing() {
    if (ringAudio) {
      ringAudio.pause();
      try { ringAudio.remove(); } catch (_) {}
      ringAudio = null;
    }
  }

  // Cria o modal
  const modal = document.createElement('div');
  modal.id = 'dm-incoming-call-modal';
  modal.style.cssText = `
    position: fixed !important;
    top: 24px !important;
    right: 24px !important;
    z-index: 9999999 !important;
    background: rgba(10,10,20,0.97) !important;
    backdrop-filter: blur(20px) !important;
    border: 1px solid #00ff88 !important;
    border-radius: 20px !important;
    padding: 20px 24px !important;
    min-width: 280px !important;
    box-shadow: 0 0 40px rgba(0,255,136,0.4) !important;
    animation: dmIncomingIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
  `;
  modal.innerHTML = `
    <style>@keyframes dmIncomingIn { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }</style>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
      <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#8b00ff,#ff00ff);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:22px;">
        ${(callerName[0] || '?').toUpperCase()}
      </div>
      <div>
        <div style="color:#fff;font-weight:700;font-size:15px;">${escHtmlDm(callerName)}</div>
        <div style="color:#00ff88;font-size:13px;margin-top:2px;">📞 Chamada de voz recebida</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;">
      <button id="dm-incoming-reject" style="flex:1;padding:10px;background:rgba(237,66,69,0.2);border:1px solid rgba(237,66,69,0.5);border-radius:10px;color:#ed4245;cursor:pointer;font-size:14px;font-weight:600;">📵 Recusar</button>
      <button id="dm-incoming-accept" style="flex:1;padding:10px;background:rgba(0,255,136,0.2);border:1px solid rgba(0,255,136,0.5);border-radius:10px;color:#00ff88;cursor:pointer;font-size:14px;font-weight:600;">📞 Atender</button>
    </div>
  `;
  document.body.appendChild(modal);

  // Fecha automaticamente após 30 segundos
  const autoClose = setTimeout(function() {
    stopRing();
    modal.remove();
  }, 30000);

  // Evento: Recusar
  document.getElementById('dm-incoming-reject').addEventListener('click', function() {
    clearTimeout(autoClose);
    stopRing();
    modal.remove();

    if (window.socket && window.socket.connected) {
      const toId = window.dmCallState._incomingCallerId || _dmGetUserId(callerName);
      const fromId = window.myUserId || localStorage.getItem('zx_my_user_id') || null;
      window.socket.emit('dm:call:reject', {
        to:     callerName,
        toId:   toId,
        from:   window.username || window.currentUsername || 'Usuário',
        fromId: fromId
      });
    }
    if (typeof showToast === 'function') showToast('📵 Chamada recusada');
  });

  // Evento: Atender
  document.getElementById('dm-incoming-accept').addEventListener('click', async function() {
    clearTimeout(autoClose);
    stopRing();
    modal.remove();

    // Configura estado da chamada
    window.dmCallState.isInCall     = true;
    window.dmCallState.targetUser   = callerName;
    window.dmCallState.callType     = 'voice';
    window.dmCallState.startTime    = Date.now();
    window.dmCallState.micEnabled   = true;
    window.dmCallState.audioEnabled = true;
    window.dmCallState.isCaller     = false;

    // Obtém stream de áudio local
    try {
      const constraints = { audio: true };
      const savedDevice = localStorage.getItem('audioDeviceId');
      if (savedDevice) constraints.audio = { deviceId: { exact: savedDevice } };
      window.dmCallState.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      if (typeof showToast === 'function') showToast('⚠️ Sem acesso ao microfone');
    }

    // Cria barra persistente
    createDmCallBar();
    showDmCallBar(callerName);
    startDmCallTimer();

    const targetId = window.dmCallState._incomingCallerId || _dmGetUserId(callerName);
    window.dmCallState.targetUserId = targetId;

    // Notifica o servidor que aceitou
    if (window.socket && window.socket.connected) {
      const fromId = window.myUserId || localStorage.getItem('zx_my_user_id') || null;
      window.socket.emit('dm:call:accept', {
        to:     callerName,
        toId:   targetId,
        from:   window.username || window.currentUsername || 'Usuário',
        fromId: fromId
      });
    }

    // Abre tela fullscreen
    openDmCallScreen();
    const statusEl = document.getElementById('dm-call-screen-status');
    if (statusEl) statusEl.textContent = '● Aguardando conexão de áudio...';

    if (typeof showToast === 'function') {
      showToast('📞 Chamada atendida — aguardando áudio...');
    }
  });
}

// ============================================================
// BIND DE EVENTOS SOCKET
// ============================================================

/**
 * Registra todos os listeners de eventos de chamada no socket
 * @param {object} sock - Instância do socket.io
 */
function bindDmCallSocketEvents(sock) {
  if (!sock) return;
  if (sock._dmCallBound) return;
  sock._dmCallBound = true;

  console.log('[DM-CALL] Registrando listeners no socket', sock.id);

  // --- Chamada recebida ---
  sock.on('dm:call:incoming', function(data) {
    if (!data || !data.from) return;
    window.dmCallState._incomingCallerId = data.fromId || null;
    showDmIncomingCall(data.from);
  });

  // --- Chamada aceita (pelo destinatário) ---
  sock.on('dm:call:accepted', function(data) {
    if (window.dmCallState.isInCall && window.dmCallState.isCaller) {
      _onDmCallAccepted(data);
    }
  });

  // --- Chamada rejeitada ---
  sock.on('dm:call:rejected', function(data) {
    if (window.dmCallState.isInCall) {
      endDmCall();
      if (typeof showToast === 'function') {
        showToast('📵 ' + escHtmlDm(data.from) + ' recusou a chamada');
      }
    }
  });

  // --- Chamada encerrada pelo outro lado ---
  sock.on('dm:call:ended', function(data) {
    if (window.dmCallState.isInCall) {
      const prev = window.dmCallState.targetUser;
      window.dmCallState.targetUser = null;
      window.dmCallState.isInCall = false;
      endDmCall();
      if (typeof showToast === 'function') {
        showToast('📵 ' + escHtmlDm(data.from || prev) + ' encerrou a chamada');
      }
    }
  });

  // --- Oferta WebRTC (recebida pelo destinatário) ---
  sock.on('dm:voice:offer', async function(data) {
    if (!window.dmCallState.isInCall) return;
    const targetUser = data.from;

    // Garante stream local
    if (!window.dmCallState.localStream) {
      try {
        const constraints = { audio: true };
        const savedDevice = localStorage.getItem('audioDeviceId');
        if (savedDevice) constraints.audio = { deviceId: { exact: savedDevice } };
        window.dmCallState.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        if (typeof showToast === 'function') showToast('⚠️ Sem acesso ao microfone');
      }
    }

    const pc = createDmPeerConnection(targetUser);
    addLocalStreamToPeer(pc);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const toId = window.dmCallState.targetUserId || _dmGetUserId(targetUser);
      sock.emit('dm:voice:answer', {
        to: targetUser,
        toId: toId,
        answer: pc.localDescription
      });
      const statusEl = document.getElementById('dm-call-screen-status');
      if (statusEl) statusEl.textContent = '● Conectando...';
    } catch (err) {
      if (typeof showToast === 'function') showToast('❌ Erro ao conectar áudio');
      console.error('[DM-CALL] Erro ao processar offer:', err);
    }
  });

  // --- Resposta WebRTC (recebida pelo caller) ---
  sock.on('dm:voice:answer', async function(data) {
    const pc = window.dmCallState.peerConnection;
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (err) {
      console.error('[DM-CALL] Erro ao processar answer:', err);
    }
  });

  // --- Candidato ICE ---
  sock.on('dm:voice:ice', async function(data) {
    const pc = window.dmCallState.peerConnection;
    if (!pc || !data.candidate) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) {
      console.warn('[DM-CALL] Erro ao adicionar ICE candidate:', err);
    }
  });

  // --- Resposta de ID do usuário (para resolver ID pendente) ---
  sock.on('dm:user-id-response', function(data) {
    if (data && data.username && data.userId) {
      if (typeof window._dmCallPendingUserId === 'function') {
        window._dmCallPendingUserId(data.username, data.userId);
      }
    }
  });
}

// ============================================================
// INICIALIZAÇÃO DO SISTEMA
// ============================================================

/**
 * Inicializa o sistema de chamadas privadas.
 * Detecta o socket e registra listeners, incluindo reconexão.
 */
function initDmCallSystem() {
  console.log('[DM-CALL] Inicializando sistema...');

  // Injeta estilos e cria barra
  injectDmCallStyles();
  createDmCallBar();
  ensureRemoteAudio();

  /**
   * Função interna para anexar listeners ao socket.
   * Também registra o evento 'connect' para re-registrar em reconexões.
   */
  function attachToSocket(sock) {
    if (!sock) return;

    // Registra listeners principais
    bindDmCallSocketEvents(sock);

    // Socket.IO v3+: 'connect' dispara na conexão inicial E em reconexões
    sock.on('connect', function() {
      console.log('[DM-CALL] Socket reconectado, re-registrando listeners...');
      // Limpa flag para forçar re-registro
      sock._dmCallBound = false;
      bindDmCallSocketEvents(sock);
    });

    // Se o socket já estiver conectado, também registra
    if (sock.connected) {
      console.log('[DM-CALL] Socket já conectado, listeners ativos');
    }
  }

  // Caso o socket já exista globalmente
  if (window.socket) {
    attachToSocket(window.socket);
  } else {
    // Aguarda o socket aparecer (polling)
    const timer = setInterval(function() {
      if (window.socket) {
        clearInterval(timer);
        attachToSocket(window.socket);
      }
    }, 300);
    // Timeout de segurança (20s)
    setTimeout(function() {
      clearInterval(timer);
      if (!window.socket) {
        console.warn('[DM-CALL] Socket não disponível após 20s');
      }
    }, 20000);
  }
}

// ============================================================
// ALIASES GLOBAIS PARA COMPATIBILIDADE
// ============================================================

// Garante que os nomes usados pelos botões estejam disponíveis
window.startCall         = window.startDmVoiceCall;
window.startVoiceCall    = window.startDmVoiceCall;
window.startPrivateCall  = window.startDmVoiceCall;

/**
 * Abre a chamada (se já estiver em andamento) ou inicia uma nova
 * @param {string} username - Nome do usuário (opcional)
 */
window.openCall = function(username) {
  if (window.dmCallState && window.dmCallState.isInCall) {
    if (typeof openDmCallScreen === 'function') openDmCallScreen();
  } else if (username) {
    window.startDmVoiceCall(username);
  }
};

// ============================================================
// AUTO-INICIALIZAÇÃO
// ============================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDmCallSystem);
} else {
  initDmCallSystem();
}

console.log('[DM-CALL] Sistema de chamadas privadas carregado com sucesso!');