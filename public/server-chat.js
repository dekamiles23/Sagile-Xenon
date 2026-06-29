// ============================================
// SERVER CHAT - SISTEMA DE ENVIO DE MENSAGENS
// ============================================

(function() {
  'use strict';

  // ------------------------------------------
  // 1. GARANTE O NOME CORRETO DO USUÁRIO
  // ------------------------------------------
  function getNome() {
    let nome = localStorage.getItem('userNickname')
            || localStorage.getItem('currentUserNickname')
            || localStorage.getItem('username')
            || localStorage.getItem('zx_username');

    if (!nome || nome === 'Usuário' || nome === 'Anônimo') {
      nome = prompt('Digite seu nome de usuário:');
      if (nome) {
        localStorage.setItem('userNickname', nome);
        localStorage.setItem('username', nome);
        localStorage.setItem('zx_username', nome);
      }
    }
    return nome || 'Anônimo';
  }

  const nomeCorreto = getNome();
  console.log('? Usuário logado como:', nomeCorreto);

  // Expõe globalmente para outros scripts usarem se precisar
  window.currentUsername = nomeCorreto;

  // ------------------------------------------
  // 2. REMOVE MENSAGENS COM "Usuário" GENÉRICO
  // ------------------------------------------
  function limparMensagensUsuarioGenerico() {
    document.querySelectorAll('.message').forEach(msg => {
      const span = msg.querySelector('.msg-username');
      if (span && span.textContent.trim() === 'Usuário') {
        msg.remove();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', limparMensagensUsuarioGenerico);

  const _observer = new MutationObserver(limparMensagensUsuarioGenerico);
  document.addEventListener('DOMContentLoaded', () => {
    const area = document.getElementById('messages-area');
    if (area) {
      _observer.observe(area, { childList: true });
    }
  });

  // ------------------------------------------
  // 3. FUNÇÃO DE ENVIO
  // ------------------------------------------
  function enviarMensagem() {
    const input = document.getElementById('message-input');
    if (!input) return;

    const texto = input.value.trim();
    if (!texto) return;

    if (input.value.length > 4000) {
      if (typeof showToast === 'function') {
        showToast('?? O limite máximo é de 4.000 caracteres.');
      } else {
        alert('?? O limite máximo é de 4.000 caracteres.');
      }
      return;
    }

    const canal = window.currentChannel || localStorage.getItem('currentChannel') || 'geral';
    const serverId = window.currentServerId || localStorage.getItem('currentServerId') || null;

    console.log('?? Enviando mensagem:', { username: nomeCorreto, channel: canal, serverId });

    const sock = window.socket || (typeof socket !== 'undefined' ? socket : null);
    if (sock && sock.connected) {
      sock.emit('message', {
        channel: canal,
        text: texto,
        username: nomeCorreto,
        avatar: window.userAvatar || window.profileAvatarUrl || localStorage.getItem('zx_avatar') || null,
        serverId: serverId
      });
    } else {
      console.error('? Socket não conectado');
    }

    input.value = '';
    input.style.height = '48px';
    input.style.overflowY = 'hidden';
    const counter = document.getElementById('char-counter');
    if (counter) {
      counter.textContent = '0/4000';
      counter.style.color = '#888';
    }
    input.focus();
  }

  // ------------------------------------------
  // 4. REGISTRA EVENTOS NOS ELEMENTOS
  // ------------------------------------------
  function inicializar() {
    const sendBtn = document.getElementById('send-btn');
    const input   = document.getElementById('message-input');

    if (!sendBtn || !input) {
      setTimeout(inicializar, 100);
      return;
    }

    if (sendBtn.dataset.serverChatReady) return;
    sendBtn.dataset.serverChatReady = 'true';

    sendBtn.addEventListener('click', enviarMensagem);

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensagem();
      }
    });

    input.addEventListener('input', function() {
      const counter = document.getElementById('char-counter');
      const limit = 4000;
      const length = this.value.length;
      if (counter) {
        counter.textContent = ${length}/;
        counter.style.color = length > limit ? '#ff4444' : '#888';
      }
      const sendBtn = document.getElementById('send-btn');
      if (sendBtn) {
        sendBtn.disabled = length > limit;
        sendBtn.style.opacity = length > limit ? '0.5' : '1';
        sendBtn.style.cursor = length > limit ? 'not-allowed' : 'pointer';
      }
      
      this.style.height = '48px';
      const newHeight = Math.min(this.scrollHeight, 200);
      this.style.height = newHeight + 'px';
      this.style.overflowY = this.scrollHeight > 200 ? 'auto' : 'hidden';
    });

    console.log('? server-chat.js: listeners registrados');
  }

  // ------------------------------------------
  // INICIALIZAÇÃO
  // ------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
  } else {
    inicializar();
  }

  console.log('? server-chat.js carregado (sem listener de mensagem para evitar duplicação)');

})();