// dm-fix-complete.js – CORREÇÃO DEFINITIVA COM DELEGAÇÃO DE EVENTOS
(function() {
  console.log('[DM-FIX-COMPLETE] Iniciando correção definitiva com delegação...');

  // Garantir username
  if (typeof window.username === 'undefined' || !window.username) {
    window.username = sessionStorage.getItem('username') || localStorage.getItem('zx_username') || 'Usuário';
  }
  window.currentUsername = window.username;
  window.currentUserId = window.username;

  // Função para obter o parceiro atual
  function getCurrentDmPartner() {
    if (window.currentDmUser) return window.currentDmUser;
    const area = document.getElementById('dm-chat-area');
    if (area && area.dataset.activeChat) return area.dataset.activeChat;
    const name = document.querySelector('#dm-chat-area .dm-username');
    if (name) return name.textContent.trim();
    return null;
  }

  // Função que será chamada ao clicar no botão
  function handleCallClick(e) {
    const btn = e.target.closest('#dm-call-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const partner = getCurrentDmPartner();
    console.log('[DM-FIX-COMPLETE] Botão clicado (delegação), partner:', partner);
    if (partner) {
      if (typeof window.startDmVoiceCall === 'function') {
        window.startDmVoiceCall(partner);
      } else if (window.socket && window.socket.connected) {
        window.socket.emit('call:start', { targetUser: partner });
        if (typeof showToast === 'function') showToast('Chamando ' + partner + '...');
      }
    } else {
      if (typeof showToast === 'function') showToast('❌ Nenhum parceiro.');
    }
  }

  // Remove listeners antigos (para evitar duplicação)
  document.removeEventListener('click', handleCallClick);
  // Adiciona listener de delegação no document
  document.addEventListener('click', handleCallClick);
  console.log('[DM-FIX-COMPLETE] Listener de delegação adicionado ao document');

  // Função para criar o botão se ele não existir (para garantir que esteja lá)
  function ensureButton() {
    if (document.getElementById('dm-call-btn')) return;
    const header = document.querySelector('#dm-chat-area .chat-header, #dm-chat-area .dm-chat-header, #dm-chat-area .navbar');
    if (!header) return;
    const btn = document.createElement('button');
    btn.id = 'dm-call-btn';
    btn.innerHTML = '📞';
    btn.style.cssText = `
      background: rgba(0,255,136,0.1);
      border: 1px solid rgba(0,255,136,0.35);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      color: #00ff88;
      margin-left: 8px;
      flex-shrink: 0;
    `;
    header.appendChild(btn);
    console.log('[DM-FIX-COMPLETE] Botão criado (se não existia)');
  }

  // Observer para quando a DM for aberta
  function setupObserver() {
    if (!document.body) { setTimeout(setupObserver, 100); return; }
    const observer = new MutationObserver(function(mutations) {
      for (const m of mutations) {
        if (m.type === 'childList' || m.type === 'attributes') {
          const area = document.getElementById('dm-chat-area');
          if (area && !area.classList.contains('hidden')) {
            setTimeout(ensureButton, 200);
          }
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
    console.log('[DM-FIX-COMPLETE] Observer configurado');
  }

  // Interceptar openDmChat e openPrivateChat para sincronizar
  const origOpenDmChat = window.openDmChat;
  if (typeof origOpenDmChat === 'function') {
    window.openDmChat = function(username) {
      origOpenDmChat.call(this, username);
      window.currentDmUser = username;
      const area = document.getElementById('dm-chat-area');
      if (area) area.dataset.activeChat = username;
      setTimeout(ensureButton, 300);
    };
  }

  const origOpenPrivateChat = window.openPrivateChat;
  if (typeof origOpenPrivateChat === 'function') {
    window.openPrivateChat = function(username) {
      origOpenPrivateChat.call(this, username);
      window.currentDmUser = username;
      const area = document.getElementById('dm-chat-area');
      if (area) area.dataset.activeChat = username;
      setTimeout(ensureButton, 300);
    };
  }

  // Inicializa
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setupObserver();
      setTimeout(ensureButton, 500);
    });
  } else {
    setupObserver();
    setTimeout(ensureButton, 500);
  }

  // Força verificação periódica
  setInterval(function() {
    const area = document.getElementById('dm-chat-area');
    if (area && !area.classList.contains('hidden')) ensureButton();
  }, 3000);

  console.log('[DM-FIX-COMPLETE] Correção com delegação instalada!');
})();