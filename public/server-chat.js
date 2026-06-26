// ============================================
// SERVER CHAT - SISTEMA DE ENVIO DE MENSAGENS
// ============================================

(function() {
  'use strict';

  // ──────────────────────────────────────────
  // 1. GARANTE O NOME CORRETO DO USUÁRIO
  //    (sem sobrescrever funções globais nem
  //     clonar elementos do DOM)
  // ──────────────────────────────────────────
  function getNome() {
    let nome = localStorage.getItem('userNickname')
            || localStorage.getItem('currentUserNickname')
            || localStorage.getItem('username');

    if (!nome || nome === 'Usuário') {
      nome = prompt('Digite seu nome de usuário:');
      if (nome) {
        localStorage.setItem('userNickname', nome);
        localStorage.setItem('username', nome);
      }
    }
    return nome || 'Anônimo';
  }

  const nomeCorreto = getNome();
  console.log('✅ Usuário logado como:', nomeCorreto);

  // Expõe globalmente para outros scripts usarem se precisar
  window.currentUsername = nomeCorreto;

  // ──────────────────────────────────────────
  // 2. REMOVE MENSAGENS COM "Usuário" GENÉRICO
  //    (apenas as já renderizadas na tela,
  //     sem intervalo agressivo)
  // ──────────────────────────────────────────
  function limparMensagensUsuarioGenerico() {
    document.querySelectorAll('.message').forEach(msg => {
      const span = msg.querySelector('.msg-username');
      if (span && span.textContent.trim() === 'Usuário') {
        msg.remove();
      }
    });
  }

  // Roda uma vez no carregamento e observa novas inserções
  document.addEventListener('DOMContentLoaded', limparMensagensUsuarioGenerico);

  const _observer = new MutationObserver(limparMensagensUsuarioGenerico);
  document.addEventListener('DOMContentLoaded', () => {
    const area = document.getElementById('messages-area');
    if (area) {
      _observer.observe(area, { childList: true });
    }
  });

  // ──────────────────────────────────────────
  // 3. FUNÇÃO DE RENDERIZAÇÃO DE MENSAGEM
  // ──────────────────────────────────────────
  function renderizarMensagem(msg) {
    // Bloqueia mensagens com nome genérico vindo do servidor
    if (!msg || msg.username === 'Usuário' || !msg.username) return;

    const area = document.getElementById('messages-area');
    if (!area) return;

    const div = document.createElement('div');
    div.className = 'message';

    const inicial = (msg.username || '?').charAt(0).toUpperCase();
    const hora    = msg.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    // Buscar avatar do cache global (populado por dm-avatar-call-fix.js)
    const _avKey  = (msg.username || '').toLowerCase();
    const _avUrl  = (typeof getFriendAvatar === 'function' ? getFriendAvatar(msg.username) : null)
                 || (window.friendAvatarCache || {})[_avKey] || null;
    if (!_avUrl && msg.username && typeof requestUserAvatar === 'function') requestUserAvatar(msg.username);
    const _avDiv  = _avUrl
      ? '<div class="msg-avatar av-' + inicial + ' has-image" data-username="' + (msg.username || '') + '" style="background-image:url(' + _avUrl + ');background-size:cover;background-position:center;background-repeat:no-repeat;"></div>'
      : '<div class="msg-avatar av-' + inicial + '" data-username="' + (msg.username || '') + '">' + inicial + '</div>';

    // Mensagem de texto normal
    if (!msg.type || msg.type === 'text') {
      // Detecta se é uma URL de GIF
      const isGif = /\.(gif)(\?.*)?$/i.test(msg.text) || msg.text.includes('tenor.com') || msg.text.includes('giphy.com');

      div.innerHTML = `
        ${_avDiv}
        <div class="msg-body">
          <div class="msg-meta">
            <span class="msg-username">${escapeHtml(msg.username)}</span>
            <span class="msg-time">${hora}</span>
          </div>
          <div class="msg-text">
            ${isGif
              ? `<img src="${escapeHtml(msg.text)}" style="max-width:300px;max-height:200px;border-radius:8px;" />`
              : escapeHtml(msg.text)
            }
          </div>
        </div>`;

    // Enquete
    } else if (msg.type === 'poll') {
      const opcoesHtml = (msg.options || []).map((op, i) => `
        <button class="poll-option" data-index="${i}" style="
          display:block; width:100%; margin:4px 0; padding:8px 14px;
          background:rgba(255,0,255,0.1); border:1px solid rgba(255,0,255,0.3);
          border-radius:8px; color:#fff; cursor:pointer; text-align:left;">
          ${escapeHtml(op.text)} — <span class="poll-vote-count">${op.votes || 0}</span> votos
        </button>`).join('');

      div.innerHTML = `
        ${_avDiv}
        <div class="msg-body">
          <div class="msg-meta">
            <span class="msg-username">${escapeHtml(msg.username)}</span>
            <span class="msg-time">${hora}</span>
          </div>
          <div class="msg-text">
            <strong>📊 ${escapeHtml(msg.question)}</strong>
            <div style="margin-top:8px;">${opcoesHtml}</div>
          </div>
        </div>`;

    // Tópico
    } else if (msg.type === 'topic') {
      div.innerHTML = `
        ${_avDiv}
        <div class="msg-body">
          <div class="msg-meta">
            <span class="msg-username">${escapeHtml(msg.username)}</span>
            <span class="msg-time">${hora}</span>
          </div>
          <div class="msg-text">
            <strong>💬 ${escapeHtml(msg.title)}</strong>
            ${msg.content ? `<p style="margin:4px 0 0;color:#ccc;">${escapeHtml(msg.content)}</p>` : ''}
          </div>
        </div>`;

    // Voz
    } else if (msg.type === 'voice') {
      div.innerHTML = `
        ${_avDiv}
        <div class="msg-body">
          <div class="msg-meta">
            <span class="msg-username">${escapeHtml(msg.username)}</span>
            <span class="msg-time">${hora}</span>
          </div>
          <div class="msg-text">
            🎤 <audio controls src="${msg.audio}" style="max-width:240px;vertical-align:middle;"></audio>
          </div>
        </div>`;
    }

    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  // ──────────────────────────────────────────
  // 4. FUNÇÃO DE ENVIO
  // ──────────────────────────────────────────
  function enviarMensagem() {
    // Busca sempre pelo ID atual (sem cache de referência antiga)
    const input = document.getElementById('message-input');
    if (!input) return;

    const texto = input.value.trim();
    if (!texto) return;

    // LIMITE DE 4000 CARACTERES (MESMA LÓGICA DO DM)
    if (input.value.length > 4000) {
      if (typeof showToast === 'function') {
        showToast('⚠️ O limite máximo é de 4.000 caracteres.');
      } else {
        alert('⚠️ O limite máximo é de 4.000 caracteres.');
      }
      return;
    }

    const canal = window.currentChannel || localStorage.getItem('currentChannel') || 'geral';
    const communityId = window.currentServerId || window.communityId || localStorage.getItem('communityId');

    // Envia via socket no formato esperado pelo servidor
    const sock = window.socket || (typeof socket !== 'undefined' ? socket : null);
    if (sock && sock.connected) {
      sock.emit('message', {
        channel: canal,
        text: texto,
        communityId: communityId || null
      });
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

  // ──────────────────────────────────────────
  // 5. REGISTRA EVENTOS NOS ELEMENTOS ORIGINAIS
  //    (sem clonar nada — garante compatibilidade
  //     com chat-input.js e demais scripts)
  // ──────────────────────────────────────────
  function inicializar() {
    const sendBtn = document.getElementById('send-btn');
    const input   = document.getElementById('message-input');

    if (!sendBtn || !input) {
      // Tenta novamente após um tick (garante que o DOM está pronto)
      setTimeout(inicializar, 100);
      return;
    }

    // Evita registrar o listener mais de uma vez
    if (sendBtn.dataset.serverChatReady) return;
    sendBtn.dataset.serverChatReady = 'true';

    sendBtn.addEventListener('click', enviarMensagem);

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensagem();
      }
    });

    // LÓGICA DE CONTADOR E AUTO-AJUSTE EXPANSÍVEL
    input.addEventListener('input', function() {
      const counter = document.getElementById('char-counter');
      const limit = 4000;
      const length = this.value.length;
      if (counter) {
        counter.textContent = `${length}/${limit}`;
        counter.style.color = length > limit ? '#ff4444' : '#888';
      }
      const sendBtn = document.getElementById('send-btn');
      if (sendBtn) {
        sendBtn.disabled = length > limit;
        sendBtn.style.opacity = length > limit ? '0.5' : '1';
        sendBtn.style.cursor = length > limit ? 'not-allowed' : 'pointer';
      }
      
      // Auto-ajuste de altura
      this.style.height = '48px'; // Reset para a altura mínima confortável
      const newHeight = Math.min(this.scrollHeight, 200); // Altura máxima de 200px
      this.style.height = newHeight + 'px';
      
      // Scroll interno apenas se atingir o máximo
      this.style.overflowY = this.scrollHeight > 200 ? 'auto' : 'hidden';
    });

    console.log('✅ server-chat.js: listeners registrados nos elementos originais');
  }

  // ──────────────────────────────────────────
  // 6. HISTÓRICO DE MENSAGENS VIA SOCKET
  // ──────────────────────────────────────────
  function registrarSocketListeners() {
    if (typeof socket === 'undefined') {
      // Socket ainda não disponível — aguarda
      setTimeout(registrarSocketListeners, 200);
      return;
    }

    // Recebe histórico ao entrar no canal
    socket.on('history', function(msgs) {
      const area = document.getElementById('messages-area');
      if (!area) return;
      area.innerHTML = '';
      (msgs || []).forEach(renderizarMensagem);
    });

    // ✅ REMOVIDO: listeners duplicados de message e message:sent
    // Esses listeners já existem em script.js, causando duplicação
    console.log('✅ server-chat.js: listeners de mensagem removidos para evitar duplicação');

    console.log('✅ server-chat.js: socket listeners registrados');
  }

  // ──────────────────────────────────────────
  // INICIALIZAÇÃO
  // ──────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
  } else {
    inicializar();
  }

  registrarSocketListeners();

  // ──────────────────────────────────────────
  // UTILITÁRIO
  // ──────────────────────────────────────────
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();