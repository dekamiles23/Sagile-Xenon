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
    
    // ✅ APENAS ABRIR A INTERFACE, NÃO RECONECTAR NADA
    if (typeof showView === 'function') {
      showView('voice');
    } else {
      document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
      const voiceView = document.getElementById('voice-view');
      if (voiceView) {
        voiceView.classList.remove('hidden');
      }
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
  console.log("🔍 [DEBUG 3] Chamando showView('voice')");
  
  // ✅ CORREÇÃO: Verificar se showView existe antes de chamar
  if (typeof showView === 'function') {
    showView('voice');
    console.log("✅ [DEBUG 3] showView('voice') executado com sucesso");
  } else {
    console.log("⚠️ [DEBUG 3] showView() não existe, usando fallback");
    
    // Fallback para index.html
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const voiceView = document.getElementById('voice-view');
    if (voiceView) {
      voiceView.classList.remove('hidden');
      console.log("✅ [DEBUG 3] voice-view exibido com sucesso");
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
  
  // ✅ CORREÇÃO: Chamar a