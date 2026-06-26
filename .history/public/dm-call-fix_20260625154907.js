// dm-call-fix.js – Correção definitiva + criação do botão se ausente
(function() {
  console.log('[DM-CALL-FIX] Iniciando...');

  // 1. Função para obter o parceiro atual
  function getCurrentDmPartner() {
    if (window.currentDmUser && typeof window.currentDmUser === 'string' && window.currentDmUser.trim() !== '') {
      return window.currentDmUser;
    }
    const chatArea = document.getElementById('dm-chat-area');
    if (chatArea && chatArea.dataset.activeChat) {
      const name = chatArea.dataset.activeChat;
      if (name) { window.currentDmUser = name; return name; }
    }
    const headerName = document.querySelector('#dm-chat-area .dm-username');
    if (headerName) {
      const name = headerName.textContent.trim();
      if (name) { window.currentDmUser = name; return name; }
    }
    const activeItem = document.querySelector('.dm-conv-item.active');
    if (activeItem && activeItem.dataset.username) {
      const name = activeItem.dataset.username;
      window.currentDmUser = name;
      return name;
    }
    return null;
  }

  // 2. Função que será chamada no clique
  function handleCallButtonClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const partner = getCurrentDmPartner();
    console.log('[DM-CALL-FIX] Botão clicado, partner:', partner);
    if (partner) {
      if (typeof window.startDmVoiceCall === 'function') {
        window.startDmVoiceCall(partner);
      } else if (window.socket && window.socket.connected) {
        window.socket.emit('call:start', { targetUser: partner });
        if (typeof showToast === 'function') showToast('Chamando ' + partner + '...');
      } else {
        if (typeof showToast === 'function') showToast('❌ Sem conexão.');
      }
    } else {
      if (typeof showToast === 'function') showToast('❌ Nenhum parceiro.');
    }
  }

  // 3. Função que CRIA o botão se ele não existir
  function ensureCallButton() {
    let btn = document.getElementById('dm-call-btn');
    if (btn) return btn;

    // Tenta encontrar o cabeçalho da DM
    const chatHeader = document.querySelector('#dm-chat-area .chat-header, #dm-chat-area .dm-chat-header');
    if (!chatHeader) {
      console.log('[DM-CALL-FIX] Cabeçalho da DM não encontrado');
      return null;
    }

    // Cria o botão
    btn = document.createElement('button');
    btn.id = 'dm-call-btn';
    btn.title = 'Iniciar chamada de voz';
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
      transition: all 0.2s;
      font-size: 16px;
      color: #00ff88;
      margin-left: 8px;
      flex-shrink: 0;
    `;
    btn.innerHTML = '📞';
    btn.onmouseenter = function() {
      this.style.background = 'rgba(0,255,136,0.25)';
      this.style.boxShadow = '0 0 12px rgba(0,255,136,0.4)';
    };
    btn.onmouseleave = function() {
      this.style.background = 'rgba(0,255,136,0.1)';
      this.style.boxShadow = 'none';
    };

    // Insere no cabeçalho (ao lado do status, ou no final)
    chatHeader.appendChild(btn);
    console.log('[DM-CALL-FIX] Botão criado e inserido no cabeçalho da DM');
    return btn;
  }

  // 4. Aplica o listener ao botão (cria se necessário)
  function applyCallButtonFix() {
    let btn = document.getElementById('dm-call-btn');
    if (!btn) {
      btn = ensureCallButton();
      if (!btn) return false;
    }
    if (btn.dataset.callFixApplied) return true;

    btn.addEventListener('click', handleCallButtonClick, true);
    btn.onclick = function(e) {
      if (e.defaultPrevented) return;
      handleCallButtonClick(e);
    };
    btn.dataset.callFixApplied = 'true';
    console.log('[DM-CALL-FIX] Listener aplicado ao botão (existente ou criado)');
    return true;
  }

  // 5. Executa imediatamente se a DM já estiver aberta
  function checkAndFix() {
    const chatArea = document.getElementById('dm-chat-area');
    if (chatArea && !chatArea.classList.contains('hidden')) {
      applyCallButtonFix();
    }
  }

  // 6. Observer para quando a DM for aberta
  function setupObserver() {
    if (!document.body) {
      setTimeout(setupObserver, 100);
      return;
    }
    const observer = new MutationObserver(function(mutations) {
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) {
              if (node.id === 'dm-chat-area' || node.querySelector('#dm-chat-area')) {
                setTimeout(applyCallButtonFix, 200);
              }
              if (node.id === 'dm-call-btn') {
                applyCallButtonFix();
              }
            }
          }
        }
        // Também observa mudanças de classe (quando a DM é exibida)
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const target = m.target;
          if (target.id === 'dm-chat-area' && !target.classList.contains('hidden')) {
            setTimeout(applyCallButtonFix, 200);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    console.log('[DM-CALL-FIX] Observer configurado');
  }

  // 7. Intercepta openDmChat e openPrivateChat
  const originalOpenDmChat = window.openDmChat;
  if (typeof originalOpenDmChat === 'function') {
    window.openDmChat = function(username) {
      originalOpenDmChat.call(this, username);
      setTimeout(function() {
        window.currentDmUser = username;
        const area = document.getElementById('dm-chat-area');
        if (area) area.dataset.activeChat = username;
        applyCallButtonFix();
      }, 300);
    };
    console.log('[DM-CALL-FIX] openDmChat interceptado');
  }

  const originalOpenPrivateChat = window.openPrivateChat;
  if (typeof originalOpenPrivateChat === 'function') {
    window.openPrivateChat = function(username) {
      originalOpenPrivateChat.call(this, username);
      setTimeout(function() {
        window.currentDmUser = username;
        const area = document.getElementById('dm-chat-area');
        if (area) area.dataset.activeChat = username;
        applyCallButtonFix();
      }, 300);
    };
    console.log('[DM-CALL-FIX] openPrivateChat interceptado');
  }

  // Inicializa
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setupObserver();
      setTimeout(checkAndFix, 500);
    });
  } else {
    setupObserver();
    setTimeout(checkAndFix, 500);
  }

  console.log('[DM-CALL-FIX] Correção instalada (com criação automática do botão)');
})();