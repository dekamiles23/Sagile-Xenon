// ================================================
// SISTEMA DE CHAMADA PERSISTENTE
// ================================================

// Estado global da chamada
window.callState = {
  isInCall: false,
  channelId: null,
  channelName: null,
  participants: [],
  startTime: null,
  durationInterval: null
};

// Inicializar sistema quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
  // Criar barra se não existir
  if (!document.getElementById('persistent-call-bar')) {
    const callBar = document.createElement('div');
    callBar.id = 'persistent-call-bar';
    callBar.className = 'persistent-call-bar hidden';
    callBar.innerHTML = `
      <div class="pcb-left">
        <div class="pcb-icon">🔊</div>
        <div class="pcb-info">
          <div class="pcb-title">Em chamada: <span id="pcb-channel-name">Geral</span></div>
          <div class="pcb-subtitle">
            <span id="pcb-participants">0 participantes</span>
            <span class="pcb-dot">•</span>
            <span id="pcb-duration">00:00</span>
          </div>
        </div>
      </div>
      <div class="pcb-controls">
        <button class="pcb-btn" id="pcb-toggle-mic" title="Alternar microfone">🎙</button>
        <button class="pcb-btn" id="pcb-toggle-deaf" title="Alternar áudio">🔊</button>
        <button class="pcb-btn pcb-btn-primary" id="pcb-return">Voltar para chamada</button>
        <button class="pcb-btn pcb-btn-danger" id="pcb-leave">Encerrar</button>
      </div>
    `;
    
    // ✅ CORREÇÃO 1: Inserir como FILHO DIRETO DO BODY (último elemento para maior prioridade)
    document.body.appendChild(callBar);
    // ✅ CORREÇÃO 5: Garantir que o dock sempre esteja dentro do viewport
    callBar.style.maxWidth = 'calc(100vw - 40px)';
    callBar.style.boxSizing = 'border-box';
    
    // Adicionar CSS CORRIGIDO
    const style = document.createElement('style');
    style.textContent = `
    /* ✅ CORREÇÃO 2: Estilos da Call Dock com prioridade máxima */
    .persistent-call-bar {
      position: fixed !important;
      bottom: 20px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      z-index: 999999 !important;
      background: rgba(18, 18, 26, 0.95) !important;
      backdrop-filter: blur(20px) !important;
      -webkit-backdrop-filter: blur(20px) !important;
      border: 1px solid #ff00ff !important;
      border-radius: 60px !important;
      padding: 12px 24px !important;
      display: flex !important;
      gap: 16px !important;
      box-shadow: 0 0 30px rgba(255, 0, 255, 0.5) !important;
      pointer-events: auto !important;
      align-items: center;
      justify-content: space-between;
      animation: callBarIn 0.3s ease-out;
      min-width: 520px;
      max-width: 90vw;
    }

    .persistent-call-bar.hidden {
      display: none !important;
    }

    @keyframes callBarIn {
      from { opacity: 0; transform: translateX(-50%) translateY(100%); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    /* ✅ CORREÇÃO 3: Garantir que Navbar tenha z-index MENOR */
    .navbar,
    header,
    .top-nav,
    [class*="navbar"],
    [class*="header"] {
      z-index: 100 !important;
    }
    /* overflow dos containers: não modificar — position:fixed não é afetado por overflow:hidden */
.pcb-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .pcb-icon {
      font-size: 22px;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .pcb-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .pcb-title {
      color: #fff;
      font-weight: 600;
      font-size: 14px;
    }

    .pcb-subtitle {
      color: #aaa;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .pcb-dot {
      color: #666;
    }

    .pcb-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pcb-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.15s;
    }

    .pcb-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .pcb-btn.active {
      background: rgba(255, 0, 255, 0.3);
    }

    .pcb-btn-primary {
      background: rgba(0, 255, 136, 0.2);
      color: #00ff88;
    }

    .pcb-btn-primary:hover {
      background: rgba(0, 255, 136, 0.3);
    }

    .pcb-btn-danger {
      background: rgba(255, 68, 68, 0.2);
      color: #ff4444;
    }

    .pcb-btn-danger:hover {
      background: rgba(255, 68, 68, 0.3);
    }

    @media (max-width: 768px) {
      .persistent-call-bar {
        min-width: auto;
        width: calc(100vw - 40px);
        padding: 10px 16px !important;
        gap: 8px !important;
      }
      
      .pcb-subtitle {
        display: none;
      }
      
      .pcb-controls {
        gap: 4px;
      }
      
      .pcb-btn {
        padding: 6px 8px;
      }
    }
    `;
    document.head.appendChild(style);
    
    // Eventos dos botões
    document.getElementById('pcb-toggle-mic').addEventListener('click', () => {
      document.getElementById('btn-toggle-mic')?.click();
      document.getElementById('pcb-toggle-mic').classList.toggle('active', window.isMuted);
    });

    document.getElementById('pcb-toggle-deaf').addEventListener('click', () => {
      document.getElementById('btn-toggle-deaf')?.click();
      document.getElementById('pcb-toggle-deaf').classList.toggle('active', window.isDeafened);
    });

    document.getElementById('pcb-return').addEventListener('click', () => {
      if (window.callState.channelId) {
        const server = getCurrentServer();
        if (server) {
          const channel = server.channels.find(ch => ch.id === window.callState.channelId);
          if (channel) {
            openChannel(channel);
          }
        }
      }
    });

    document.getElementById('pcb-leave').addEventListener('click', () => {
      leaveVoiceChannel();
    });
  }
});

// Função para atualizar barra
function updatePersistentCallBar() {
  const bar = document.getElementById('persistent-call-bar');
  if (!bar) return;
  
  if (!window.callState.isInCall) {
    bar.classList.add('hidden');
    return;
  }

  bar.classList.remove('hidden');
  
  document.getElementById('pcb-channel-name').textContent = window.callState.channelName || 'Chamada';
  document.getElementById('pcb-participants').textContent = `${window.callState.participants.length} participantes`;
  
  document.getElementById('pcb-toggle-mic').classList.toggle('active', window.isMuted);
  document.getElementById('pcb-toggle-deaf').classList.toggle('active', window.isDeafened);
  
  // ✅ Garantir que a barra sempre fique no topo da pilha DOM
  if (bar.parentNode === document.body) {
    document.body.appendChild(bar);
  }
}

// Formatar duração
function formatCallDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Iniciar timer
function startCallDurationTimer() {
  let seconds = 0;
  window.callState.durationInterval = setInterval(() => {
    seconds++;
    const el = document.getElementById('pcb-duration');
    if (el) el.textContent = formatCallDuration(seconds);
  }, 1000);
}

// Parar timer
function stopCallDurationTimer() {
  if (window.callState.durationInterval) {
    clearInterval(window.callState.durationInterval);
    window.callState.durationInterval = null;
  }
}

// Sobrescrever função joinVoiceChannel
const originalJoinVoiceChannel = window.joinVoiceChannel;
window.joinVoiceChannel = async function(ch) {
  // Chamar função original
  if (originalJoinVoiceChannel) await originalJoinVoiceChannel(ch);
  
  // Ativar chamada persistente
  window.callState.isInCall = true;
  window.callState.channelId = ch.id;
  window.callState.channelName = ch.name;
  window.callState.startTime = Date.now();
  
  updatePersistentCallBar();
  startCallDurationTimer();
};

// Sobrescrever função leaveVoiceChannel
const originalLeaveVoiceChannel = window.leaveVoiceChannel;
window.leaveVoiceChannel = function() {
  // Chamar função original
  if (originalLeaveVoiceChannel) originalLeaveVoiceChannel();
  
  // Desativar chamada persistente
  window.callState.isInCall = false;
  window.callState.channelId = null;
  window.callState.channelName = null;
  window.callState.participants = [];
  stopCallDurationTimer();
  updatePersistentCallBar();
};

// Sobrescrever evento de usuários na sala
// Guard: socket e renderVoiceParticipants podem não existir neste ponto
if (typeof window.socket !== 'undefined' && window.socket) {
  window.socket.on('voice:room-users', function(data) {
    var users = data.users || [];
    window._voiceRoomUsers = users;
    window.callState.participants = users;
    updatePersistentCallBar();
    if (typeof renderVoiceParticipants === 'function') renderVoiceParticipants();
  });
}

console.log('✅ Sistema de chamada persistente CARREGADO E CORRIGIDO!');