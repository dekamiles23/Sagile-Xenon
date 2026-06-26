// ================================================
// ✅ SISTEMA DE CHAMADAS DE VOZ COMPLETO
// ✅ Server View - Implementação Definitiva
// ================================================

console.log('✅ Voice System carregado!');

// ================================================
// VARIÁVEIS GLOBAIS
// ================================================
window.VoiceSystem = {
  isConnected: false,
  currentVoiceChannel: null,
  participants: new Map(),
  
  // Streams
  localMicStream: null,
  localWebcamStream: null,
  localScreenStream: null,
  localAudioStream: null,
  
  // Estados
  micEnabled: true,
  webcamEnabled: false,
  screenSharing: false,
  audioSharing: false,
  
  // Elementos
  voiceRoom: null,
  participantsGrid: null,
  controlsBar: null,
  floatingWindow: null,
  
  // ✅ Voice Activity Detection
  vad: {
    audioContext: null,
    analyser: null,
    interval: null,
    threshold: 75,
    isSpeaking: false
  }
};

// ================================================
// MODAL DE CONFIRMAÇÃO PARA ENTRAR NA CHAMADA
// ================================================
function showVoiceJoinModal(channel) {
  console.log("🔍 [DEBUG 2] showVoiceJoinModal() INICIADO");
  console.log("🔍 [DEBUG 2] Canal recebido:", channel);
  
  // Remove modal existente se houver
  document.getElementById('voice-join-modal')?.remove();
  
  const modal = document.createElement('div');
  modal.id = 'voice-join-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width: 420px;">
      <div class="mm-header">
        <span class="mm-title">🔊 Entrar na chamada</span>
        <button class="mm-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div style="padding: 1.5rem;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="font-size: 64px; margin-bottom: 1rem;">🔊</div>
          <h3 style="color: #fff; margin-bottom: 0.5rem;">${channel.name}</h3>
          <p style="color: #aaa;">Você está prestes a entrar na chamada de voz.</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <button type="button" class="btn-ghost" id="btn-voice-cancel">Cancelar</button>
          <button type="button" class="btn-neon" id="btn-voice-join">✅ Entrar na chamada</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  console.log("✅ [DEBUG 2] Modal criado e adicionado no DOM");
  
  // Eventos
  document.getElementById('btn-voice-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('btn-voice-join').addEventListener('click', () => {
    modal.remove();
    joinVoiceChannel(channel);
  });
  
  // Também suportar o ID usado no HTML
  const btnConfirm = document.getElementById('btn-voice-join-confirm');
  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      modal.remove();
      joinVoiceChannel(channel);
    });
  }
}

// ================================================
// ENTRAR NO CANAL DE VOZ
// ================================================
async function joinVoiceChannel(channel) {
  console.log("🔍 [DEBUG 3] joinVoiceChannel() INICIADO");
  console.log("🔍 [DEBUG 3] Canal recebido:", channel);
  
  // ✅ SE JÁ ESTÁ CONECTADO NO MESMO CANAL: SÓ REABRIR A INTERFACE
  if (VoiceSystem.isConnected && VoiceSystem.currentVoiceChannel && VoiceSystem.currentVoiceChannel.id === channel.id) {
    console.log('[VOICE] User already connected');
    console.log('[VOICE] Reopening call interface');
    console.log('[VOICE] Restoring active call UI');
    
    // ✅ USAR showLayout DIRETAMENTE (é a função real do sistema)
    if (typeof showLayout === 'function') {
      showLayout('voice-view');
    } else {
      document.querySelectorAll('.layout').forEach(v => v.classList.add('hidden'));
      const voiceView = document.getElementById('voice-view');
      if (voiceView) voiceView.classList.remove('hidden');
    }
    
    // ✅ RECRIAR A INTERFACE SE ELA NÃO EXISTIR MAIS
    const voiceRoom = document.getElementById('voice-room');
    if (voiceRoom && !voiceRoom.firstChild) {
      console.log('[VOICE] Recreating call layout for existing connection');
      
      const participantsGrid = document.createElement('div');
      participantsGrid.id = 'voice-participants-grid';
      participantsGrid.className = 'voice-participants-grid';
      participantsGrid.style.width = '100%';
      participantsGrid.style.height = '100%';
      participantsGrid.style.display = 'grid';
      participantsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
      participantsGrid.style.gap = '16px';
      participantsGrid.style.padding = '16px';
      participantsGrid.style.alignItems = 'center';
      participantsGrid.style.justifyItems = 'center';
      
      voiceRoom.appendChild(participantsGrid);
      VoiceSystem.participantsGrid = participantsGrid;
      
      // ✅ RENDERIZAR NOVAMENTE TODOS OS PARTICIPANTES
      VoiceSystem.participants.forEach(participant => {
        renderParticipant(participant);
      });
    }
    
    createFloatingWindow();
    
    // ✅ RESTAURAR ESTADO COMPLETO DO MICROFONE
    console.log('[VOICE] Restoring audio state for existing connection');
    console.log('[VOICE] Restoring mic state:', VoiceSystem.micEnabled);
    
    // ✅ GARANTIR QUE O ESTADO DO MICROFONE É SEMPRE TRUE ANTES DE QUALQUER COISA
    VoiceSystem.micEnabled = true;
    console.log('[VOICE] Mic state forced to TRUE');
    
    if (VoiceSystem.localMicStream) {
      console.log('[VOICE] Microfone já está ativo, restaurando interface');
      
      // ✅ GARANTIR QUE A TRACK ESTÁ HABILITADA
      const audioTrack = VoiceSystem.localMicStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        console.log('[VOICE] audioTrack.enabled:', audioTrack.enabled);
      }
      
      // ✅ LIMPAR COMPLETAMENTE TODO O SISTEMA DE VAD
      console.log('[VOICE] Resetting complete VAD system');
      
      // Parar qualquer detecção anterior
      stopVoiceActivityDetection();
      
      // Limpar TODAS as referências do VAD
      VoiceSystem.vad.audioContext = null;
      VoiceSystem.vad.analyser = null;
      VoiceSystem.vad.interval = null;
      VoiceSystem.vad.isSpeaking = false;
      
      // Aguardar liberação total
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // ✅ RECRIAR O SISTEMA DE DETECÇÃO DE VOZ COMPLETAMENTE DO ZERO
      console.log('[VOICE] Creating new VAD system from scratch');
      
      try {
        // Criar NOVO AudioContext
        VoiceSystem.vad.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Criar NOVO Analyser
        VoiceSystem.vad.analyser = VoiceSystem.vad.audioContext.createAnalyser();
        VoiceSystem.vad.analyser.fftSize = 256;
        VoiceSystem.vad.analyser.smoothingTimeConstant = 0.4;
        
        // Conectar NOVAMENTE a stream
        const source = VoiceSystem.vad.audioContext.createMediaStreamSource(VoiceSystem.localMicStream);
        source.connect(VoiceSystem.vad.analyser);
        
        const dataArray = new Uint8Array(VoiceSystem.vad.analyser.frequencyBinCount);
        
        // Criar NOVO intervalo
        VoiceSystem.vad.interval = setInterval(() => {
          if (!VoiceSystem.isConnected || !VoiceSystem.micEnabled) return;
          
          if (VoiceSystem.vad.audioContext.state === 'suspended') {
            VoiceSystem.vad.audioContext.resume();
          }
          
          VoiceSystem.vad.analyser.getByteFrequencyData(dataArray);
          
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const normalized = dataArray[i] - 128;
            sumSquares += normalized * normalized;
          }
          
      const rms = Math.sqrt(sumSquares / dataArray.length);
      const threshold = 10;
          
          const isSpeakingNow = rms > threshold;
          
      // ✅ GARANTIR QUE SEMPRE ENCONTRA O ELEMENTO: BUSCA EM TODOS OS NÍVEIS
      let participantEl = null;
      
      // 1. Primeiro tenta pelo ID exato
      participantEl = document.getElementById(`voice-participant-${VoiceSystem.localUserId}`);
      
      // 2. Se não encontrar, busca por classe dentro da grade
      if (!participantEl && VoiceSystem.participantsGrid) {
        participantEl = VoiceSystem.participantsGrid.querySelector('.voice-participant');
      }
      
      // 3. Se ainda não encontrar, busca globalmente
      if (!participantEl) {
        participantEl = document.querySelector('.voice-participant');
      }
      
      // 4. Se ainda não encontrar, busca qualquer elemento que tenha avatar
      if (!participantEl) {
        participantEl = document.querySelector('[class*="participant"]');
      }
      
      if (participantEl) {
        if (isSpeakingNow) {
          participantEl.classList.add('speaking');
          console.log('✅ [VAD] Voice detected');
          console.log('✅ [VAD] Applying speaking class');
          console.log('✅ [VAD] Participant element', participantEl);
        } else {
          participantEl.classList.remove('speaking');
        }
      } else {
        console.log('⚠️ [VAD] Elemento do participante não encontrado');
        console.log('⚠️ [VAD] Local User ID:', VoiceSystem.localUserId);
        console.log('⚠️ [VAD] Participants Grid exists:', !!VoiceSystem.participantsGrid);
      }
          
          VoiceSystem.vad.isSpeaking = isSpeakingNow;
          
        }, 80);
        
        console.log('[VOICE] ✅ NOVO VAD system created successfully');
        
      } catch (err) {
        console.error('[VOICE] ❌ Error creating new VAD:', err);
      }
      
      // ✅ ATUALIZAR BOTÕES
      document.getElementById('btn-toggle-mic')?.classList.add('active');
      document.getElementById('float-btn-mic')?.classList.add('active');
      
      // ✅ ATUALIZAR INDICADOR DE MICROFONE NO CARD DO USUÁRIO
      const localParticipant = document.querySelector('.voice-participant');
      if (localParticipant) {
        const indicators = localParticipant.querySelector('.voice-participant-indicators');
        if (indicators) {
          indicators.innerHTML = `<span class="voice-indicator mic-active">🎙</span>`;
        }
      }
      
      console.log('[VOICE] ✅ Microfone restaurado com sucesso 100%');
    }
    
    if (VoiceSystem.webcamEnabled) {
      document.getElementById('btn-toggle-webcam')?.classList.add('active');
      document.getElementById('float-btn-webcam')?.classList.add('active');
    }
    
    if (VoiceSystem.screenSharing) {
      document.getElementById('btn-share-screen')?.classList.add('active-screen');
      document.getElementById('float-btn-screen')?.classList.add('active-screen');
    }
    
    showToast("Voltando para a chamada");
    return;
  }
  
  // Limpar conexão anterior se existir
  if (VoiceSystem.isConnected) {
    await leaveVoiceChannel();
  }
  
  VoiceSystem.currentVoiceChannel = channel;
  VoiceSystem.isConnected = true;
  
  // Mudar para a visualização de voz
  console.log("🔍 [DEBUG 3] Chamando showLayout('voice-view')");
  
  // ✅ REMOVER BARRAS DE CONTROLE DUPLICADAS
  const allVoiceControls = document.querySelectorAll('.voice-controls');
  console.log(`🔍 DEBUG: Encontradas ${allVoiceControls.length} barras de controle (.voice-controls)`);
  allVoiceControls.forEach((el, index) => {
    console.log(`  Barra ${index}: ID=${el.id}, classes=${el.className}, parent=${el.parentElement?.id || 'body'}`);
  });
  
  if (allVoiceControls.length > 1) {
    console.log(`⚠️ Encontradas ${allVoiceControls.length} barras de controle (.voice-controls), removendo duplicadas`);
    allVoiceControls.forEach((el, index) => {
      if (index > 0) {
        console.log(`Removendo barra duplicada ${index}`);
        el.remove();
      }
    });
  }
  
  // ✅ REMOVER JANELAS FLUTUANTES DUPLICADAS
  const allFloatingWindows = document.querySelectorAll('.voice-floating-window');
  console.log(`🔍 DEBUG: Encontradas ${allFloatingWindows.length} janelas flutuantes (.voice-floating-window)`);
  allFloatingWindows.forEach((el, index) => {
    console.log(`  Janela ${index}: ID=${el.id}, classes=${el.className}`);
  });
  
  if (allFloatingWindows.length > 1) {
    console.log(`⚠️ Encontradas ${allFloatingWindows.length} janelas flutuantes, removendo duplicadas`);
    allFloatingWindows.forEach((el, index) => {
      if (index > 0) {
        console.log(`Removendo janela flutuante duplicada ${index}`);
        el.remove();
      }
    });
  }
  
  // ✅ REMOVER BARRA PERSISTENTE DUPLICADA (persistent-call-bar)
  const persistentCallBar = document.getElementById('persistent-call-bar');
  if (persistentCallBar) {
    console.log(`⚠️ Encontrada barra persistente (persistent-call-bar), removendo para evitar conflito`);
    persistentCallBar.remove();
  }

  // ✅ USAR showLayout DIRETAMENTE (é a função real do sistema)
  if (typeof showLayout === 'function') {
    showLayout('voice-view');
    console.log("✅ [DEBUG 3] showLayout('voice-view') executado com sucesso");
  } else {
    console.log("⚠️ [DEBUG 3] showLayout() não existe, usando fallback");
    document.querySelectorAll('.layout').forEach(v => v.classList.add('hidden'));
    const voiceView = document.getElementById('voice-view');
    if (voiceView) {
      voiceView.classList.remove('hidden');
      voiceView.style.setProperty('display', 'flex', 'important');
      voiceView.style.setProperty('flex', '1 1 auto', 'important');
      voiceView.style.setProperty('width', '100%', 'important');
      voiceView.style.setProperty('height', '100%', 'important');
      voiceView.style.setProperty('min-height', '0', 'important');
      console.log("✅ [DEBUG 3] voice-view exibido com sucesso via fallback");
    }
  }
  
  // Atualizar interface
  document.getElementById('voice-channel-name').textContent = channel.name;
  document.getElementById('voice-participants-count').textContent = '1 participante';
  
  // ✅ CORREÇÃO DEFINITIVA: NÃO RECRIAR O LAYOUT TODA VEZ
  console.log("🔍 [DEBUG 3] VERIFICANDO LAYOUT DA CHAMADA");
  
  const voiceRoom = document.getElementById('voice-room');
  if (voiceRoom) {
    // ✅ VERIFICAR SE A GRADE JÁ EXISTE
    let participantsGrid = document.getElementById('voice-participants-grid');
    
    if (!participantsGrid) {
      console.log("🔍 [DEBUG 3] Criando grade de participantes");
      
      // ✅ CRIAR A GRADE APENAS SE ELA NÃO EXISTIR
      participantsGrid = document.createElement('div');
      participantsGrid.id = 'voice-participants-grid';
      participantsGrid.className = 'voice-participants-grid';
      participantsGrid.style.width = '100%';
      participantsGrid.style.height = '100%';
      participantsGrid.style.display = 'grid';
      participantsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
      participantsGrid.style.gap = '16px';
      participantsGrid.style.padding = '16px';
      participantsGrid.style.alignItems = 'center';
      participantsGrid.style.justifyItems = 'center';
      
      voiceRoom.appendChild(participantsGrid);
    }
    
    VoiceSystem.participantsGrid = participantsGrid;
    VoiceSystem.voiceRoom = voiceRoom;
    
  console.log("✅ [DEBUG 3] LAYOUT OK!");
  }
  
  console.log("✅ [DEBUG 3] Elementos encontrados:");
  console.log("   voiceRoom:", VoiceSystem.voiceRoom);
  console.log("   participantsGrid:", VoiceSystem.participantsGrid);
  
  // Adicionar usuário local
  console.log("🔍 [DEBUG 3] Adicionando participante local");
  // ✅ CORREÇÃO: Salvar o ID do usuário local no VoiceSystem para usar depois
  // ✅ NÃO RECRIAR O ID SE ELE JÁ EXISTIR!
  if (!VoiceSystem.localUserId) {
    VoiceSystem.localUserId = window.currentUserId || 'local_user_' + Date.now();
  }
  const userId = VoiceSystem.localUserId;
  const username = window.currentUsername || window.username || 'Você';
  
  console.log("🔍 [DEBUG 3] Dados do usuário local:");
  console.log("   userId:", userId);
  console.log("   username:", username);
  
  // ✅ FUNÇÃO addParticipant DEFINIDA DIRETAMENTE AQUI
  const participant = {
    id: userId,
    username,
    isLocal: true,
    micActive: VoiceSystem.micEnabled,
    webcamActive: VoiceSystem.webcamEnabled,
    speaking: false
  };
  
  VoiceSystem.participants.set(userId, participant);
  
  // ✅ RENDERIZAR PARTICIPANTE DIRETAMENTE
  const el = document.createElement('div');
  el.className = 'voice-participant';
  el.id = `voice-participant-${participant.id}`;
  
  el.innerHTML = `
    <div class="voice-participant-avatar">${participant.username.charAt(0).toUpperCase()}</div>
    <div class="voice-participant-name">${participant.username}</div>
    <div class="voice-participant-indicators">
      ${participant.micActive ? '<span class="voice-indicator mic-active">🎙</span>' : ''}
      ${participant.webcamActive ? '<span class="voice-indicator webcam-active">📷</span>' : ''}
    </div>
  `;
  
  VoiceSystem.participantsGrid.appendChild(el);
  
  console.log("✅ [DEBUG 3] Participante adicionado com sucesso");
  
  // ✅ CORREÇÃO: Atualizar também o array global que o script.js usa
  if (!window._voiceRoomUsers) window._voiceRoomUsers = [];
  window._voiceRoomUsers.push({ socketId: userId, username: username, self: true });
  
  // ✅ CORREÇÃO: Chamar a função renderVoiceParticipants() do script.js também
  if (window.renderVoiceParticipants) {
    console.log("✅ [DEBUG 3] Chamando renderVoiceParticipants() global");
    window.renderVoiceParticipants();
  }
  
  // Criar janela flutuante
  createFloatingWindow();
  
  // ✅ LIGAR MICROFONE AUTOMATICAMENTE AO ENTRAR NA CHAMADA
  await startMicrophone();
  
  // Emitir evento para o servidor
  if (window.socket) {
    window.socket.emit('voice:join', {
      channelId: channel.id,
      communityId: window.communityId || null,
      userId: window.currentUserId,
      username: window.currentUsername || window.username || 'Usuário'
    });
  }
  
  console.log('✅ Conectado ao canal de voz:', channel.name);
}

// ================================================
// SAIR DO CANAL DE VOZ
// ================================================
async function leaveVoiceChannel() {
  console.log("✅ Saiu da call");
  
  // ✅ SALVAR channelId ANTES de limpar o estado
  const leavingChannelId = VoiceSystem.currentVoiceChannel?.id;
  
  // Parar TODOS os streams corretamente
  await stopMicrophone();
  await stopWebcam();
  await stopScreenShare();
  await stopAudioShare();
  
  // ✅ LIMPAR ESTADO
  VoiceSystem.isConnected = false;
  VoiceSystem.currentVoiceChannel = null;
  VoiceSystem.participants.clear();
  VoiceSystem.localUserId = null;
  
  // ✅ REMOVER JANELA FLUTUANTE
  if (VoiceSystem.floatingWindow) {
    VoiceSystem.floatingWindow.remove();
    VoiceSystem.floatingWindow = null;
  }
  document.getElementById('voice-floating-window')?.remove();
  
  // ✅ LIMPAR GRID DE PARTICIPANTES
  const grid = document.getElementById('voice-participants-grid');
  if (grid) grid.innerHTML = '';
  
  // ✅ EMITIR EVENTO DE SAÍDA (antes de navegar)
  if (window.socket) {
    try {
      window.socket.emit('voice:leave', {
        channelId: leavingChannelId,
        userId: window.currentUserId
      });
    } catch (e) {}
  }
  
  // ✅ NAVEGAR DE VOLTA PARA A TELA INICIAL / SERVIDOR
  try {
    if (typeof showLayout === 'function') {
      // Se havia um servidor aberto, voltar para o chat
      if (window.currentServerId) {
        showLayout('chat-view');
      } else {
        showLayout('discover-view');
      }
    } else {
      // Fallback: esconder voice-view e mostrar discover-view
      const voiceView = document.getElementById('voice-view');
      if (voiceView) voiceView.classList.add('hidden');
      const discoverView = document.getElementById('discover-view');
      if (discoverView) {
        discoverView.classList.remove('hidden');
        discoverView.style.setProperty('display', 'flex', 'important');
      }
    }
  } catch (e) {
    console.warn('[VOICE] Erro ao navegar após sair da call:', e);
  }
  
  console.log("✅ leaveVoiceChannel: cleanup completo");
}

// ================================================
// MICROFONE
// ================================================
async function toggleMicrophone() {
  console.log("🔍 [MIC] Toggle clicado, estado atual:", VoiceSystem.micEnabled);
  
  // ✅ SEMPRE USAR O ESTADO REAL DO SISTEMA, NÃO A CLASSE DO BOTÃO
  if (VoiceSystem.micEnabled === true) {
    console.log("🔍 [MIC] Desligando microfone");
    await stopMicrophone();
  } else {
    console.log("🔍 [MIC] Ligando microfone");
    await startMicrophone();
  }
  
  console.log("🔍 [MIC] Novo estado:", VoiceSystem.micEnabled);
}

async function startMicrophone() {
  try {
    const constraints = { audio: true };
    
    // Usar dispositivo salvo nas configurações se existir
    if (localStorage.getItem('audioDeviceId')) {
      constraints.audio = { deviceId: { exact: localStorage.getItem('audioDeviceId') } };
    }
    
    VoiceSystem.localMicStream = await navigator.mediaDevices.getUserMedia(constraints);
    VoiceSystem.micEnabled = true;
    
    document.getElementById('btn-toggle-mic').classList.add('active');
    console.log("✅ Microfone:", true);
    showToast("Microfone ligado");
    
    // ✅ INICIAR DETECÇÃO DE ATIVIDADE DE VOZ
    initVoiceActivityDetection();
    
  } catch (err) {
    console.error('❌ Erro ao ativar microfone:', err);
    showToast('Não foi possível acessar o microfone');
  }
}

async function stopMicrophone() {
  // ✅ PARAR DETECÇÃO DE VOZ ANTES DE FECHAR O STREAM
  stopVoiceActivityDetection();
  
  if (VoiceSystem.localMicStream) {
    VoiceSystem.localMicStream.getTracks().forEach(track => track.stop());
    VoiceSystem.localMicStream = null;
  }
  
  VoiceSystem.micEnabled = false;
  document.getElementById('btn-toggle-mic').classList.remove('active');
  console.log("✅ Microfone:", false);
  showToast("Microfone desligado");
}

// ================================================
// WEBCAM
// ================================================
async function toggleWebcam() {
  if (VoiceSystem.webcamEnabled) {
    await stopWebcam();
  } else {
    // ✅ APENAS ABRE O MODAL - NÃO ATIVA A WEBCAM AINDA
    showBroadcastModal('webcam');
  }
}

async function startWebcam() {
  try {
    console.log("🔍 [WEBCAM] ======================================");
    console.log("🔍 [WEBCAM] INICIANDO WEBCAM LINHA 444");
    console.log("🔍 [WEBCAM] ======================================");
    
    // ✅ 1. ENCERRAR QUALQUER STREAM ANTERIOR ABSOLUTAMENTE
    console.log("🔍 [WEBCAM] 1. Verificando streams antigas...");
    
    if (VoiceSystem.localWebcamStream) {
      console.log("🔍 [WEBCAM] ✅ Encerrando VoiceSystem.localWebcamStream");
      VoiceSystem.localWebcamStream.getTracks().forEach(track => {
        console.log("🔍 [WEBCAM] ✅ Parando track:", track.label, track.readyState);
        track.stop();
      });
      VoiceSystem.localWebcamStream = null;
      console.log("🔍 [WEBCAM] ✅ Stream local limpa");
    }
    
    if (broadcastModalStream) {
      console.log("🔍 [WEBCAM] ✅ Encerrando broadcastModalStream");
      broadcastModalStream.getTracks().forEach(track => {
        console.log("🔍 [WEBCAM] ✅ Parando track modal:", track.label, track.readyState);
        track.stop();
      });
      broadcastModalStream = null;
      console.log("🔍 [WEBCAM] ✅ Stream modal limpa");
    }
    
    // ✅ 2. AGUARDAR LIBERAÇÃO TOTAL DO DISPOSITIVO
    console.log("🔍 [WEBCAM] 2. Aguardando liberação do dispositivo...");
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log("🔍 [WEBCAM] ✅ Delay de 500ms concluído");
    
    // ✅ 3. LISTAR TODOS OS DISPOSITIVOS
    console.log("🔍 [WEBCAM] 3. Listando dispositivos...");
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.table(devices);
    
    const webcams = devices.filter(d => d.kind === 'videoinput');
    console.log("🔍 [WEBCAM] ✅ Webcams encontradas:", webcams.length);
    webcams.forEach((cam, i) => console.log(`🔍 [WEBCAM] Webcam ${i}:`, cam.deviceId, cam.label));
    
    // ✅ 4. VERIFICAR CAMERA SELECIONADA
    const selectedCameraId = localStorage.getItem('videoDeviceId');
    console.log("🔍 [WEBCAM] 4. Camera ID selecionada:", selectedCameraId);
    
    let cameraValida = false;
    let selectedCameraLabel = '';
    
    if (selectedCameraId) {
      const foundCam = webcams.find(d => d.deviceId === selectedCameraId);
      cameraValida = !!foundCam;
      selectedCameraLabel = foundCam ? foundCam.label : '';
      
      console.log("🔍 [WEBCAM] ✅ Camera ID existe:", cameraValida);
      console.log("🔍 [WEBCAM] ✅ Nome da camera:", selectedCameraLabel);
      
      if (!cameraValida) {
        console.log("🔍 [WEBCAM] ❌ Camera ID inválido, removendo localStorage");
        localStorage.removeItem('videoDeviceId');
      }
    }
    
    // ✅ 5. SELECIONAR WEBCAM PADRÃO INTELIGENTE
    if (!selectedCameraId || !cameraValida) {
      console.log("🔍 [WEBCAM] 🔍 Selecionando webcam padrão automaticamente...");
      
      // Prioridade: Integrated Camera > USB Camera > qualquer outra > NUNCA OBS Virtual Camera primeiro
      const prioridade = [
        'Integrated Camera',
        'HD Camera',
        'USB Camera',
        'Webcam',
        'Camera'
      ];
      
      let webcamPadrao = null;
      
      // Primeiro procurar webcams físicas
      for (const nome of prioridade) {
        webcamPadrao = webcams.find(cam => 
          cam.label.toLowerCase().includes(nome.toLowerCase()) && 
          !cam.label.toLowerCase().includes('obs') &&
          !cam.label.toLowerCase().includes('virtual')
        );
        if (webcamPadrao) break;
      }
      
      // Se não encontrar, pegar a primeira que NÃO seja OBS
      if (!webcamPadrao) {
        webcamPadrao = webcams.find(cam => 
          !cam.label.toLowerCase().includes('obs') &&
          !cam.label.toLowerCase().includes('virtual')
        );
      }
      
      // Se só existir OBS, usar ele
      if (!webcamPadrao && webcams.length > 0) {
        webcamPadrao = webcams[0];
      }
      
      if (webcamPadrao) {
        console.log("🔍 [WEBCAM] ✅ Webcam padrão selecionada:", webcamPadrao.label);
        localStorage.setItem('videoDeviceId', webcamPadrao.deviceId);
        selectedCameraId = webcamPadrao.deviceId;
        selectedCameraLabel = webcamPadrao.label;
        cameraValida = true;
      }
    }
    
    console.log("🔍 [WEBCAM] ✅ Webcam final escolhida:", selectedCameraLabel);
    console.log("🔍 [WEBCAM] ✅ Device ID final:", selectedCameraId);
    
    // ✅ 6. CRIAR CONSTRAINTS
    console.log("🔍 [WEBCAM] 6. Criando constraints...");
    const constraints = { 
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      } 
    };
    
    if (selectedCameraId && cameraValida) {
      console.log("🔍 [WEBCAM] ✅ Usando deviceId específico");
      constraints.video = { 
        deviceId: { exact: selectedCameraId },
        width: { ideal: 640 },
        height: { ideal: 480 }
      };
    } else {
      console.log("🔍 [WEBCAM] ✅ Usando webcam padrão do sistema");
    }
    
    console.log("🔍 [WEBCAM] ✅ Constraints final:", JSON.stringify(constraints, null, 2));
    
    showToast("Solicitando permissão para webcam...");
    
    // ✅ 6. SOLICITAR WEBCAM
    console.log("🔍 [WEBCAM] 6. Solicitando getUserMedia...");
    console.log("🔍 [WEBCAM] LINHA QUE VAI GERAR O ERRO LOGO ABAIXO");
    
    VoiceSystem.localWebcamStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    console.log("✅ [WEBCAM] ======================================");
    console.log("✅ [WEBCAM] WEBCAM INICIADA COM SUCESSO!");
    console.log("✅ [WEBCAM] ======================================");
    
    VoiceSystem.webcamEnabled = true;
    
    document.getElementById('btn-toggle-webcam').classList.add('active');
    
    // Atualizar botão flutuante também
    document.getElementById('float-btn-webcam')?.classList.add('active');
    
    // Adicionar vídeo na grid
    const localParticipant = document.querySelector('.voice-participant');
    if (localParticipant) {
      // ✅ CRIAR CONTAINER DE VÍDEO DEDICADO - NÃO USA O AVATAR
      localParticipant.innerHTML = '';
      
      const videoCard = document.createElement('div');
      videoCard.className = 'participant-video-card';
      
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsinline = true;
      video.muted = true;
      video.srcObject = VoiceSystem.localWebcamStream;
      
      videoCard.appendChild(video);
      localParticipant.appendChild(videoCard);
      
      // ✅ REMOVER CLASSES DE AVATAR CIRCULAR
      localParticipant.classList.remove('voice-participant');
      localParticipant.classList.add('voice-participant-video');
    }
    
    console.log("✅ [WEBCAM] Webcam iniciada");
    showToast("Webcam ligada com sucesso");
    
  } catch (err) {
    console.error('❌ [WEBCAM] Erro ao ativar webcam:', err);
    console.error('❌ [WEBCAM] Nome do erro:', err.name);
    console.error('❌ [WEBCAM] Mensagem:', err.message);
    
    if (err.name === 'NotAllowedError' || err.message === 'TIMEOUT') {
      showToast('❌ Permissão negada. Habilite a webcam nas configurações do Windows');
    } else if (err.name === 'NotFoundError') {
      showToast('❌ Nenhuma webcam encontrada no sistema');
    } else {
      showToast('❌ Não foi possível acessar a webcam');
    }
    
    VoiceSystem.webcamEnabled = false;
    document.getElementById('btn-toggle-webcam').classList.remove('active');
    document.getElementById('float-btn-webcam')?.classList.remove('active');
  }
}

async function stopWebcam() {
  if (VoiceSystem.localWebcamStream) {
    VoiceSystem.localWebcamStream.getTracks().forEach(track => {
      track.stop();
      console.log("✅ Webcam track parada:", track.label);
    });
    VoiceSystem.localWebcamStream = null;
  }
  
  VoiceSystem.webcamEnabled = false;
  document.getElementById('btn-toggle-webcam').classList.remove('active');
  document.getElementById('float-btn-webcam')?.classList.remove('active');
  
  // Restaurar avatar do participante
  const localParticipant = document.querySelector('.voice-participant');
  if (localParticipant) {
    const username = window.currentUsername || 'Você';
    localParticipant.innerHTML = `
      <div class="voice-participant-avatar">${username.charAt(0).toUpperCase()}</div>
      <div class="voice-participant-name">${username}</div>
      <div class="voice-participant-indicators">
        ${VoiceSystem.micEnabled ? '<span class="voice-indicator mic-active">🎙</span>' : ''}
      </div>
    `;
  }
  
  console.log("✅ Webcam desligada completamente");
  showToast("Webcam desligada");
}

// ================================================
// COMPARTILHAMENTO DE TELA
// ================================================
// ================================================
// ✅ MODAL DE COMPARTILHAMENTO DE TELA
// ================================================
async function showScreenShareModal() {
  if (VoiceSystem.screenSharing) {
    await stopScreenShare();
    return;
  }
  
  // Remover modal existente
  document.getElementById('screen-share-modal')?.remove();
  
  const modal = document.createElement('div');
  modal.id = 'screen-share-modal';
  modal.className = 'modal-overlay';
  
  modal.innerHTML = `
    <div class="modal broadcast-modal" style="max-width: 500px; width: 90%;">
      <div class="broadcast-header">
        <div class="broadcast-title">🖥️ Compartilhar Tela</div>
        <button class="broadcast-close" id="screen-share-close-btn">✕</button>
      </div>
      
      <div class="broadcast-content" style="padding: 24px;">
        <div style="margin-bottom: 12px; color: #aaa; font-size: 13px;">Selecione uma tela ou janela para compartilhar:</div>
        <select id="screen-source-select" style="width: 100%; padding: 12px; background: #12121a; border: 2px solid #ff00ff; border-radius: 8px; color: #fff; font-size: 14px;">
          <option value="" disabled selected>Carregando fontes...</option>
        </select>
      </div>
      
      <div class="broadcast-footer">
        <button class="broadcast-btn broadcast-btn-cancel" id="screen-share-cancel-btn">Cancelar</button>
        <button class="broadcast-btn broadcast-btn-start" id="screen-share-start-btn" disabled>Compartilhar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Eventos
  document.getElementById('screen-share-close-btn').addEventListener('click', () => modal.remove());
  document.getElementById('screen-share-cancel-btn').addEventListener('click', () => modal.remove());
  
  const select = document.getElementById('screen-source-select');
  const btnStart = document.getElementById('screen-share-start-btn');
  
  // ✅ CARREGAR FONTES SEM MINIATURAS
  try {
    const sources = await window.electronAPI.getScreenSources(['screen', 'window']);
    
    select.innerHTML = '';
    
    if (sources.length === 0) {
      select.innerHTML = '<option value="" disabled>Nenhuma fonte encontrada</option>';
      return;
    }
    
    // ✅ ADICIONAR APENAS NOMES DAS JANELAS
    sources.forEach(source => {
      const option = document.createElement('option');
      option.value = source.id;
      option.textContent = source.name;
      select.appendChild(option);
    });
    
    select.addEventListener('change', () => {
      btnStart.disabled = !select.value;
    });
    
  } catch (err) {
    console.error('❌ Erro ao carregar fontes:', err);
    select.innerHTML = '<option value="" disabled>Erro ao carregar fontes</option>';
  }
  
  // Botão compartilhar
  btnStart.addEventListener('click', async () => {
    if (!select.value) {
      showToast('Selecione uma tela ou janela para compartilhar');
      return;
    }
    
    modal.remove();
    
    try {
      const nomeFonte = select.options[select.selectedIndex].text;
      showToast(`Compartilhando: ${nomeFonte}...`);
      
      // ✅ CAPTURAR FONTE SELECIONADA
      VoiceSystem.localScreenStream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: select.value,
            maxWidth: 1920,
            maxHeight: 1080,
            frameRate: 30
          }
        }
      });
      
      VoiceSystem.screenSharing = true;
      document.getElementById('btn-share-screen').classList.add('active-screen');
      document.getElementById('float-btn-screen')?.classList.add('active-screen');
      
      const screenContainer = document.getElementById('screen-share-container');
      screenContainer.style.display = 'block';
      
      const video = document.getElementById('main-screen-video');
      video.srcObject = VoiceSystem.localScreenStream;
      video.autoplay = true;
      video.playsinline = true;
      video.muted = true;
      
      VoiceSystem.localScreenStream.getVideoTracks()[0].onended = () => stopScreenShare();
      
      console.log("✅ Compartilhamento iniciado com sucesso!");
      showToast(`Compartilhando: ${nomeFonte}`);
      
    } catch (err) {
      console.error('❌ Erro ao compartilhar:', err);
      
      if (err.name === 'NotAllowedError') {
        showToast('❌ Permissão negada. Habilite gravação de tela nas configurações');
      } else {
        showToast('❌ Não foi possível compartilhar');
      }
      
      VoiceSystem.screenSharing = false;
      document.getElementById('btn-share-screen').classList.remove('active-screen');
      document.getElementById('float-btn-screen')?.classList.remove('active-screen');
    }
  });
}

async function toggleScreenShare() {
  if (VoiceSystem.screenSharing) {
    await stopScreenShare();
    return;
  }
  
  showScreenShareModal();
}

// ================================================
// ✅ MODAL DE TRANSMISSÃO
// ================================================
let broadcastModalStream = null;
let broadcastModalActiveTab = 'screen';

async function showBroadcastModal(defaultTab = 'screen') {
  broadcastModalActiveTab = defaultTab;
  
  // Remover modal existente
  document.getElementById('broadcast-modal')?.remove();
  
  const modal = document.createElement('div');
  modal.id = 'broadcast-modal';
  modal.className = 'modal-overlay';
  
  modal.innerHTML = `
    <div class="modal broadcast-modal">
      <div class="broadcast-header">
        <div class="broadcast-title">📷 Webcam</div>
        <button class="broadcast-close" id="broadcast-close-btn">✕</button>
      </div>
      
      <div class="broadcast-content">
        <div class="broadcast-preview">
          <video id="broadcast-preview-webcam" autoplay playsinline muted></video>
          <div class="broadcast-preview-placeholder">
            <div class="broadcast-preview-icon">📷</div>
            <div>Carregando webcam...</div>
            <button class="broadcast-refresh-btn" id="broadcast-refresh-btn">🔄 Atualizar</button>
          </div>
        </div>
        
        <div class="broadcast-options">
          <div class="broadcast-select-row">
            <label>Webcam:</label>
            <select id="broadcast-webcam-select"></select>
          </div>
        </div>
      </div>
      
      <div class="broadcast-footer">
        <button class="broadcast-btn broadcast-btn-cancel" id="broadcast-cancel-btn">Cancelar</button>
        <button class="broadcast-btn broadcast-btn-start" id="broadcast-start-btn">Iniciar Transmissão</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listeners
  document.getElementById('broadcast-close-btn').addEventListener('click', closeBroadcastModal);
  document.getElementById('broadcast-cancel-btn').addEventListener('click', closeBroadcastModal);
  document.getElementById('broadcast-start-btn').addEventListener('click', startBroadcastFromModal);
  document.getElementById('broadcast-refresh-btn').addEventListener('click', async () => {
    console.log("🔄 Atualizando lista de webcams...");
    await loadWebcamsToModal();
  });
  
  // Carregar webcams
  await loadWebcamsToModal();
  
  // ✅ NÃO INICIAR PREVIEW AUTOMATICAMENTE (CAUSA ERRO NOTREADABLEERROR)
  // Preview só inicia quando o usuário clicar no botão Atualizar
}

async function loadWebcamsToModal() {
  const select = document.getElementById('broadcast-webcam-select');
  if (!select) return;
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    let webcams = devices.filter(d => d.kind === 'videoinput');
    
    console.log("🔍 [MODAL] Webcams brutas:", webcams);
    
    // ✅ IDENTIFICAR WEBCAM FÍSICA REAL DO PC
    const webcamReal = webcams.find(cam => 
      cam.label.toLowerCase().includes('integrated') ||
      cam.label.toLowerCase().includes('hd camera') ||
      cam.label.toLowerCase().includes('usb camera') ||
      cam.label.toLowerCase().includes('webcam') ||
      (cam.label.toLowerCase().includes('camera') && !cam.label.toLowerCase().includes('obs') && !cam.label.toLowerCase().includes('virtual'))
    );
    
    // ✅ REMOVER APENAS SE EXISTIR OUTRA WEBCAM
    if (webcamReal) {
      console.log("✅ [MODAL] Webcam real encontrada:", webcamReal.label);
      // Manter apenas webcams que NÃO são OBS
      webcams = webcams.filter(cam => 
        !cam.label.toLowerCase().includes('obs') && 
        !cam.label.toLowerCase().includes('virtual')
      );
    } else {
      console.log("⚠️ [MODAL] Nenhuma webcam real encontrada, mantendo todas");
    }
    
    // ✅ ORDENAR: Webcams físicas PRIMEIRO
    webcams.sort((a, b) => {
      const aIsReal = a.label.toLowerCase().includes('integrated') || a.label.toLowerCase().includes('hd camera') || a.label.toLowerCase().includes('usb');
      const bIsReal = b.label.toLowerCase().includes('integrated') || b.label.toLowerCase().includes('hd camera') || b.label.toLowerCase().includes('usb');
      
      if (aIsReal && !bIsReal) return -1;
      if (!aIsReal && bIsReal) return 1;
      return 0;
    });
    
    console.log("🔍 [MODAL] Webcams ordenadas:", webcams);
    
    select.innerHTML = '';
    
    webcams.forEach((cam, index) => {
      const option = document.createElement('option');
      option.value = cam.deviceId;
      option.textContent = cam.label || `Webcam ${index + 1}`;
      
      select.appendChild(option);
    });
    
    // ✅ SELECIONAR PRIMEIRA WEBCAM DA LISTA
    if (webcams.length > 0) {
      console.log("🔍 [MODAL] Selecionando webcam padrão:", webcams[0].label);
      select.value = webcams[0].deviceId;
      localStorage.setItem('videoDeviceId', webcams[0].deviceId);
    }
    
    select.addEventListener('change', () => {
      localStorage.setItem('videoDeviceId', select.value);
      startWebcamPreview(select.value);
    });
    
    // ✅ NÃO INICIAR PREVIEW AUTOMATICAMENTE
    // Preview só inicia quando o usuário clicar no botão Atualizar
    // NUNCA abre a webcam sem confirmação do usuário
    
  } catch (err) {
    console.error('Erro ao carregar webcams:', err);
  }
}

async function startWebcamPreview(deviceId = null) {
  console.log("🔍 [PREVIEW] Iniciando preview webcam...");
  
  // ✅ PARAR TODAS AS STREAMS ANTES DE INICIAR PREVIEW
  if (broadcastModalStream) {
    console.log("🔍 [PREVIEW] Parando stream anterior do preview");
    broadcastModalStream.getTracks().forEach(t => t.stop());
    broadcastModalStream = null;
  }
  
  if (VoiceSystem.localWebcamStream) {
    console.log("🔍 [PREVIEW] Parando stream da webcam principal");
    VoiceSystem.localWebcamStream.getTracks().forEach(t => t.stop());
    VoiceSystem.localWebcamStream = null;
  }
  
  // Aguardar liberação do dispositivo
  await new Promise(resolve => setTimeout(resolve, 300));
  
  try {
    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    };
    
    if (deviceId || localStorage.getItem('videoDeviceId')) {
      constraints.video.deviceId = { exact: deviceId || localStorage.getItem('videoDeviceId') };
    }
    
    console.log("🔍 [PREVIEW] Constraints preview:", constraints);
    
    broadcastModalStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    const video = document.getElementById('broadcast-preview-webcam');
    if (video) {
      video.srcObject = broadcastModalStream;
      video.style.display = 'block';
      video.nextElementSibling.style.display = 'none';
    }
    
    console.log("✅ [PREVIEW] Preview webcam carregado com sucesso!");
    
  } catch (err) {
    console.error('❌ [PREVIEW] Erro no preview webcam:', err);
    console.error('❌ [PREVIEW] Nome erro:', err.name);
    console.error('❌ [PREVIEW] Mensagem:', err.message);
  }
}

function switchBroadcastTab(tab) {
  broadcastModalActiveTab = tab;
  
  document.querySelectorAll('.broadcast-tab').forEach(el => el.classList.remove('active'));
  document.querySelector(`.broadcast-tab[data-tab="${tab}"]`)?.classList.add('active');
  
  document.querySelectorAll('.broadcast-tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById(`broadcast-tab-${tab}`)?.classList.add('active');
}

function closeBroadcastModal() {
  if (broadcastModalStream) {
    broadcastModalStream.getTracks().forEach(t => t.stop());
    broadcastModalStream = null;
  }
  document.getElementById('broadcast-modal')?.remove();
}

async function startBroadcastFromModal() {
  console.log("✅ Iniciando transmissão da webcam");
  
  // ✅ 1. PARAR APENAS O PREVIEW DO MODAL
  if (broadcastModalStream) {
    console.log("✅ Parando stream do preview do modal");
    broadcastModalStream.getTracks().forEach(t => t.stop());
    broadcastModalStream = null;
  }
  
  // ✅ 2. FECHAR O MODAL IMEDIATAMENTE
  closeBroadcastModal();
  
  // ✅ 3. SALVAR DISPOSITIVO SELECIONADO
  const select = document.getElementById('broadcast-webcam-select');
  if (select && select.value) {
    localStorage.setItem('videoDeviceId', select.value);
  }
  
  // ✅ 4. INICIAR WEBCAM NO LAYOUT PRINCIPAL DA CHAMADA
  await startWebcam();
  
  console.log("✅ Webcam movida para o card do participante na grade da chamada");
}

async function startScreenShare(sourceId) {
  try {
    showToast("Iniciando compartilhamento de tela...");
    
    // ✅ CAPTURA NATIVA ELECTRON - NÃO USA getDisplayMedia()
    VoiceSystem.localScreenStream = await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          maxWidth: 1920,
          maxHeight: 1080,
          frameRate: 30
        }
      },
      audio: false
    });
    
    VoiceSystem.screenSharing = true;
    document.getElementById('btn-share-screen').classList.add('active-screen');
    document.getElementById('float-btn-screen')?.classList.add('active-screen');
    
    const screenContainer = document.getElementById('screen-share-container');
    screenContainer.style.display = 'block';
    document.getElementById('main-screen-video').srcObject = VoiceSystem.localScreenStream;
    
    VoiceSystem.localScreenStream.getVideoTracks()[0].onended = () => stopScreenShare();
    
    console.log("✅ Tela compartilhada com sucesso!");
    showToast("Compartilhamento de tela iniciado");
    
  } catch (err) {
    console.error('❌ Erro ao compartilhar tela:', err);
    
    if (err.name === 'NotAllowedError') {
      showToast('❌ Permissão negada. Habilite gravação de tela nas configurações');
    } else {
      showToast('❌ Não foi possível compartilhar a tela');
    }
    
    VoiceSystem.screenSharing = false;
    document.getElementById('btn-share-screen').classList.remove('active-screen');
    document.getElementById('float-btn-screen')?.classList.remove('active-screen');
  }
}

async function stopScreenShare() {
  if (VoiceSystem.localScreenStream) {
    VoiceSystem.localScreenStream.getTracks().forEach(track => {
      track.stop();
      console.log("✅ Transmissão track parada:", track.label);
    });
    VoiceSystem.localScreenStream = null;
  }
  
  VoiceSystem.screenSharing = false;
  document.getElementById('btn-share-screen').classList.remove('active-screen');
  document.getElementById('btn-share-window').classList.remove('active-screen');
  document.getElementById('float-btn-screen')?.classList.remove('active-screen');
  document.getElementById('screen-share-container').style.display = 'none';
  
  document.getElementById('main-screen-video').srcObject = null;
  
  const localParticipant = document.querySelector('.voice-participant');
  if (localParticipant) {
    localParticipant.classList.remove('screen-sharing');
  }
  
  console.log("✅ Transmissão encerrada completamente");
  showToast("Transmissão encerrada");
}

// ================================================
// COMPARTILHAMENTO DE ÁUDIO
// ================================================

async function startAudioShare() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/mp3,audio/wav,audio/ogg,audio/flac,audio/m4a,.mp3,.wav,.ogg,.flac,.m4a';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (currentAudioElement) {
      currentAudioElement.pause();
      currentAudioElement.src = '';
      currentAudioElement = null;
    }
    
    currentAudioElement = new Audio();
    currentAudioElement.src = URL.createObjectURL(file);
    currentAudioElement.loop = true;
    
    VoiceSystem.localAudioStream = currentAudioElement.captureStream ? 
      currentAudioElement.captureStream() : 
      currentAudioElement.mozCaptureStream();
    
    currentAudioElement.play();
    VoiceSystem.audioSharing = true;
    
    document.getElementById('btn-share-audio').classList.add('active-audio');
    console.log("✅ Música iniciada:", file.name);
    showToast(`Reproduzindo: ${file.name}`);
  };
  
  input.click();
}

async function stopAudioShare() {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.src = '';
    currentAudioElement = null;
  }
  
  if (VoiceSystem.localAudioStream) {
    VoiceSystem.localAudioStream.getTracks().forEach(track => track.stop());
    VoiceSystem.localAudioStream = null;
  }
  
  VoiceSystem.audioSharing = false;
  document.getElementById('btn-share-audio').classList.remove('active-audio');
  
  console.log("✅ Música parada");
  showToast("Música parada");
}

// ================================================
// JANELA FLUTUANTE PERSISTENTE
// ================================================
// ✅ REMOVIDO: A janela flutuante agora é gerenciada pelo arquivo voice-floating-window.js
// function createFloatingWindow() { ... }

// ================================================
// ATUALIZAR CONTADOR DE PARTICIPANTES
// ================================================
function updateParticipantsCount() {
  const count = VoiceSystem.participants.size;
  document.getElementById('voice-participants-count').textContent = `${count} participante${count > 1 ? 's' : ''}`;
  
  // ✅ Atualizar janela flutuante se existir
  if (typeof window.updateVoiceFloatingWindow === 'function') {
    window.updateVoiceFloatingWindow();
  }
}

// ================================================
// INICIALIZAR EVENT LISTENERS
// ================================================
function initVoiceSystem() {
  document.getElementById('btn-toggle-mic')?.addEventListener('click', toggleMicrophone);
  
  document.getElementById('btn-toggle-deaf')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-toggle-deaf');
    btn.classList.toggle('active');
    
    document.querySelectorAll('audio.voice-audio').forEach(audio => {
      audio.muted = !audio.muted;
    });
    
    console.log("🔊 Alto-falante:", btn.classList.contains('active') ? "MUTADO" : "LIGADO");
    showToast(btn.classList.contains('active') ? "Alto-falante desligado" : "Alto-falante ligado");
  });
  
  document.getElementById('btn-toggle-webcam')?.addEventListener('click', toggleWebcam);
  document.getElementById('btn-share-screen')?.addEventListener('click', toggleScreenShare);
  
  // ✅ BOTÃO COMPARTILHAR JANELA REMOVIDO
  
  document.getElementById('btn-share-audio')?.addEventListener('click', () => {
    if (VoiceSystem.audioSharing) {
      stopAudioShare();
    } else {
      startAudioShare();
    }
  });
  
  document.getElementById('btn-leave-voice')?.addEventListener('click', leaveVoiceChannel);
  
  // ✅ REMOVIDO: listener global que estava interferindo com cliques em canais
  // O sistema de voz agora usa o openChannel do script.js que já trata canais de voz
  
  console.log('✅ Voice System inicializado com sucesso!');
}

// ================================================
// ✅ DETECÇÃO DE ATIVIDADE DE VOZ (VAD)
// ================================================
function initVoiceActivityDetection() {
  console.log("✅ [VAD] Iniciando detecção de atividade de voz");
  
  if (!VoiceSystem.localMicStream) {
    console.log("⚠️ [VAD] Sem stream de microfone disponível");
    return;
  }
  
  try {
    VoiceSystem.vad.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    VoiceSystem.vad.analyser = VoiceSystem.vad.audioContext.createAnalyser();
    VoiceSystem.vad.analyser.fftSize = 256;
    VoiceSystem.vad.analyser.smoothingTimeConstant = 0.4;
    
    const source = VoiceSystem.vad.audioContext.createMediaStreamSource(VoiceSystem.localMicStream);
    source.connect(VoiceSystem.vad.analyser);
    
    const dataArray = new Uint8Array(VoiceSystem.vad.analyser.frequencyBinCount);
    
    VoiceSystem.vad.interval = setInterval(() => {
      if (!VoiceSystem.isConnected || !VoiceSystem.micEnabled) return;
      
      if (VoiceSystem.vad.audioContext.state === 'suspended') {
        VoiceSystem.vad.audioContext.resume();
      }
      
      VoiceSystem.vad.analyser.getByteFrequencyData(dataArray);
      
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = dataArray[i] - 128;
        sumSquares += normalized * normalized;
      }
      
      const rms = Math.sqrt(sumSquares / dataArray.length);
      const threshold = 20;
      
      const isSpeakingNow = rms > threshold;
      
      // ✅ GARANTIR QUE SEMPRE ENCONTRA O ELEMENTO: BUSCA EM TODOS OS NÍVEIS
      let participantEl = null;
      
      // 1. Primeiro tenta pelo ID exato
      participantEl = document.getElementById(`voice-participant-${VoiceSystem.localUserId}`);
      
      // 2. Se não encontrar, busca por classe dentro da grade
      if (!participantEl && VoiceSystem.participantsGrid) {
        participantEl = VoiceSystem.participantsGrid.querySelector('.voice-participant');
      }
      
      // 3. Se ainda não encontrar, busca globalmente
      if (!participantEl) {
        participantEl = document.querySelector('.voice-participant');
      }
      
      // 4. Se ainda não encontrar, busca qualquer elemento que tenha avatar
      if (!participantEl) {
        participantEl = document.querySelector('[class*="participant"]');
      }
      
      if (participantEl) {
        if (isSpeakingNow) {
          participantEl.classList.add('speaking');
          console.log('✅ [VAD] Voice detected');
          console.log('✅ [VAD] Applying speaking class');
          console.log('✅ [VAD] Participant element', participantEl);
        } else {
          participantEl.classList.remove('speaking');
        }
      } else {
        console.log('⚠️ [VAD] Elemento do participante não encontrado');
        console.log('⚠️ [VAD] Local User ID:', VoiceSystem.localUserId);
        console.log('⚠️ [VAD] Participants Grid exists:', !!VoiceSystem.participantsGrid);
      }
      
      VoiceSystem.vad.isSpeaking = isSpeakingNow;
      
    }, 80);
    
    console.log("✅ [VAD] Detecção de voz inicializada com sucesso");
    
  } catch (err) {
    console.error("❌ [VAD] Erro ao inicializar detecção de voz:", err);
  }
}

function stopVoiceActivityDetection() {
  console.log("✅ [VAD] Parando detecção de voz");
  
  if (VoiceSystem.vad.interval) {
    clearInterval(VoiceSystem.vad.interval);
    VoiceSystem.vad.interval = null;
  }
  
  if (VoiceSystem.vad.audioContext) {
    VoiceSystem.vad.audioContext.close().catch(() => {});
    VoiceSystem.vad.audioContext = null;
  }
  
  VoiceSystem.vad.analyser = null;
  VoiceSystem.vad.isSpeaking = false;
  
  document.querySelectorAll('.voice-participant.speaking').forEach(el => {
    el.classList.remove('speaking');
  });
  
  console.log("✅ [VAD] Detecção de voz parada completamente");
}

// ================================================
// ✅ SISTEMA DE SELEÇÃO DE DISPOSITIVOS DE ÁUDIO
// ================================================
async function loadAudioDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    const microphones = devices.filter(d => d.kind === 'audioinput');
    const speakers = devices.filter(d => d.kind === 'audiooutput');
    
    console.log("✅ Microfones encontrados:", microphones);
    console.log("✅ Alto-falantes encontrados:", speakers);
    
    const micSelect = document.getElementById('select-microphone');
    const speakerSelect = document.getElementById('select-speaker');
    
    if (micSelect) {
      micSelect.innerHTML = '';
      microphones.forEach(mic => {
        const option = document.createElement('option');
        option.value = mic.deviceId;
        option.textContent = mic.label || `Microfone ${micSelect.options.length + 1}`;
        if (mic.deviceId === localStorage.getItem('audioDeviceId')) {
          option.selected = true;
        }
        micSelect.appendChild(option);
      });
    }
    
    if (speakerSelect) {
      speakerSelect.innerHTML = '';
      speakers.forEach(speaker => {
        const option = document.createElement('option');
        option.value = speaker.deviceId;
        option.textContent = speaker.label || `Alto-falante ${speakerSelect.options.length + 1}`;
        if (speaker.deviceId === localStorage.getItem('audioOutputDeviceId')) {
          option.selected = true;
        }
        speakerSelect.appendChild(option);
      });
    }
    
  } catch (err) {
    console.error("❌ Erro ao carregar dispositivos de áudio:", err);
  }
}

// Eventos dos selects nas configurações
document.addEventListener('change', (e) => {
  if (e.target.id === 'select-microphone') {
    localStorage.setItem('audioDeviceId', e.target.value);
    console.log("✅ Microfone selecionado:", e.target.value);
    
    // Se estiver em chamada, trocar microfone dinamicamente
    if (VoiceSystem.isConnected && VoiceSystem.micEnabled) {
      restartMicrophoneWithNewDevice();
    }
  }
  
  if (e.target.id === 'select-speaker') {
    localStorage.setItem('audioOutputDeviceId', e.target.value);
    console.log("✅ Alto-falante selecionado:", e.target.value);
  }
});

async function restartMicrophoneWithNewDevice() {
  console.log("🔄 Trocando microfone durante chamada...");
  
  await stopMicrophone();
  await startMicrophone();
  
  console.log("✅ Microfone trocado com sucesso!");
}

// Carregar dispositivos quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  loadAudioDevices();
  
  // Atualizar lista de dispositivos a cada 5 segundos
  setInterval(loadAudioDevices, 5000);
});

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVoiceSystem);
} else {
  // ✅ Verificar se já foi inicializado para evitar duplicação
  if (!window._voiceSystemInitialized) {
    window._voiceSystemInitialized = true;
    initVoiceSystem();
  }
}

// ✅ Observer para detectar e remover barras de controle duplicadas
const voiceControlsObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) { // Element node
        // Verificar se é uma barra de controle duplicada
        if (node.classList && node.classList.contains('voice-controls') && !node.id.includes('voice-controls-main')) {
          console.log(`⚠️ Observer: Detectada barra de controle duplicada, removendo`);
          node.remove();
        }
        // Verificar se é uma janela flutuante duplicada
        if (node.classList && node.classList.contains('voice-floating-window') && node.id !== 'voice-floating-window') {
          console.log(`⚠️ Observer: Detectada janela flutuante duplicada, removendo`);
          node.remove();
        }
      }
    });
  });
  
  // Verificação adicional
  const allVoiceControls = document.querySelectorAll('.voice-controls');
  if (allVoiceControls.length > 1) {
    console.log(`⚠️ Observer: Encontradas ${allVoiceControls.length} barras de controle (.voice-controls), removendo duplicadas`);
    allVoiceControls.forEach((el, index) => {
      if (index > 0) {
        console.log(`Observer: Removendo barra duplicada ${index}`);
        el.remove();
      }
    });
  }
  
  const allFloatingWindows = document.querySelectorAll('.voice-floating-window');
  if (allFloatingWindows.length > 1) {
    console.log(`⚠️ Observer: Encontradas ${allFloatingWindows.length} janelas flutuantes, removendo duplicadas`);
    allFloatingWindows.forEach((el, index) => {
      if (index > 0) {
        console.log(`Observer: Removendo janela flutuante duplicada ${index}`);
        el.remove();
      }
    });
  }
});

voiceControlsObserver.observe(document.body, { childList: true, subtree: true });

// ================================================
// ✅ FUNÇÕES GLOBAIS EXPOSTAS
// ================================================
window.showScreenShareModal = showScreenShareModal;
window.toggleWebcam = toggleWebcam;
window.startAudioShare = startAudioShare;
window.stopAudioShare = stopAudioShare;
window.stopScreenShare = stopScreenShare;
if (typeof createFloatingWindow === 'function') window.createFloatingWindow = createFloatingWindow;
window.renderParticipant = function(participant) {
  // Implementação da função renderParticipant
  const el = document.createElement('div');
  el.className = 'voice-participant';
  el.id = `voice-participant-${participant.id}`;
  
  el.innerHTML = `
    <div class="voice-participant-avatar">${participant.username.charAt(0).toUpperCase()}</div>
    <div class="voice-participant-name">${participant.username}</div>
    <div class="voice-participant-indicators">
      ${participant.micActive ? '<span class="voice-indicator mic-active">🎙</span>' : ''}
      ${participant.webcamActive ? '<span class="voice-indicator webcam-active">📷</span>' : ''}
    </div>
  `;
  
  if (VoiceSystem.participantsGrid) {
    VoiceSystem.participantsGrid.appendChild(el);
  }
};

console.log('✅ Todas as funções globais expostas com sucesso!');