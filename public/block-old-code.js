// ================================================
// ✅ BLOQUEAR CÓDIGO ANTIGO DO SCRIPT.JS
// ✅ Esse arquivo carrega DEPOIS do script.js
// ================================================

console.log('✅ Bloqueador de código antigo carregado!');

// ✅ BLOQUEAR TODOS OS BOTÕES DA CHAMADA
document.addEventListener('click', (event) => {
  
  // ✅ BOTÃO COMPARTILHAR TELA
  if (event.target.id === 'btn-share-screen' || event.target.closest('#btn-share-screen')) {
    event.stopImmediatePropagation();
    event.preventDefault();
    event.stopPropagation();
    
    if (VoiceSystem.screenSharing) {
      stopScreenShare();
      return;
    }
    
    showScreenShareModal();
  }
  
  // ✅ BOTÃO WEBCAM
  if (event.target.id === 'btn-toggle-webcam' || event.target.closest('#btn-toggle-webcam')) {
    event.stopImmediatePropagation();
    event.preventDefault();
    event.stopPropagation();
    
    toggleWebcam();
  }
  
  // ✅ BOTÃO COMPARTILHAR ÁUDIO / MÚSICA
  if (event.target.id === 'btn-share-audio' || event.target.closest('#btn-share-audio')) {
    event.stopImmediatePropagation();
    event.preventDefault();
    event.stopPropagation();
    
    if (VoiceSystem.audioSharing) {
      stopAudioShare();
      return;
    }
    
    startAudioShare();
  }
  
  // ✅ BOTÃO COMPARTILHAR JANELA
  if (event.target.id === 'btn-share-window' || event.target.closest('#btn-share-window')) {
    event.stopImmediatePropagation();
    event.preventDefault();
    event.stopPropagation();
    
    if (VoiceSystem.screenSharing) {
      stopScreenShare();
      return;
    }
    
    showScreenShareModal();
  }
  
}, true);

console.log('✅ Bloqueador ativado para TODOS os botões!');
