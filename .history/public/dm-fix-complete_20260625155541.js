// ============================================================
// dm-fix-complete.js – CORREÇÃO DEFINITIVA DO DM CALL
// Carregue este arquivo POR ÚLTIMO no index.html
// ============================================================

(function() {
  console.log('[DM-FIX-COMPLETE] Iniciando correção definitiva...');

  // 1. Garantir que username existe globalmente
  if (typeof window.username === 'undefined' || !window.username) {
    window.username = sessionStorage.getItem('username') || localStorage.getItem('zx_username') || 'Usuário';
  }
  if (typeof window.currentUsername === 'undefined' || !window.currentUsername) {
    window.currentUsername = window.username;
  }
  if (typeof window.currentUserId === 'undefined' || !window.currentUserId) {
    window.currentUserId = window.username;
  }

  // 2. Sobrescrever openDmChat para garantir que window.currentDmUser seja definido
  const originalOpenDmChat = window.openDmChat;
  if (typeof originalOpenDmChat === 'function') {
    window.openDmChat = function(username) {
      console.log('[DM-FIX-COMPLETE] openDmChat chamado para:', username);
      originalOpenDmChat.call(this, username);
      window.currentDmUser = username;
      const chatArea = document.getElementById('dm-chat-area');
      if (chatArea) {
        chatArea.dataset.activeChat = username;
      }
      // Força a criação do botão após 300ms
      setTimeout(ensureCallButton, 300);
    };
    console.log('[DM-FIX-COMPLETE] openDmChat sobrescrito');
  }

  // 3. Sobrescrever openPrivateChat se existir
  const originalOpenPrivateChat = window.openPrivateChat;
  if (typeof originalOpenPrivateChat === 'function') {
    window.openPrivateChat = function(username) {
      console.log('[DM-FIX-COMPLETE] openPrivateChat chamado para:', username);
      originalOpenPrivateChat.call(this, username);
      window.currentDmUser = username;
      const chatArea = document.getElementById('dm-chat-area');
      if (chatArea) {
        chatArea.dataset.activeChat = username;
      }
      setTimeout(ensureCallButton, 300);
    };
    console.log('[DM-FIX-COMPLETE] openPrivateChat sobrescrito');
  }

  // 4. Função para obter o parceiro atual
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

  // 5. Função que CRIA o botão se ele não existir
  function ensureCallButton() {
    let btn = document.getElementById('dm-call-btn');
    if (btn) {
      // Se já existe, apenas aplica o listener
      applyListener(btn);
      return btn;
    }

    // Tenta encontrar o cabeçalho da DM
    const chatHeader = document.querySelector('#dm-chat-area .chat-header, #dm-chat-area .dm-chat-header, #dm-chat-area .navbar');
    if (!chatHeader) {
      console.log('[DM-FIX-COMPLETE] Cabeçalho da DM não encontrado');
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

    // Insere no cabeçalho
    chatHeader.appendChild(btn);
    console.log('[DM-FIX-COMPLETE] Botão criado e inserido no cabeçalho');
    applyListener(btn);
    return btn;
  }

  // 6. Aplica o listener ao botão
  function applyListener(btn) {
    if (!btn) return;
    if (btn.dataset.fixApplied) return;
    
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const partner = getCurrentDmPartner();
      console.log('[DM-FIX-COMPLETE] Botão clicado, partner:', partner);
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
    }, true);

    // Sobrescreve onclick
    btn.onclick = function(e) {
      if (e.defaultPrevented) return;
      const partner = getCurrentDmPartner();
      if (partner && typeof window.startDmVoiceCall === 'function') {
        window.startDmVoiceCall(partner);
      }
    };

    btn.dataset.fixApplied = 'true';
    console.log('[DM-FIX-COMPLETE] Listener aplicado ao botão');
  }

  // 7. Observer para detectar quando a DM é aberta
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
                setTimeout(ensureCallButton, 300);
              }
              if (node.id === 'dm-call-btn') {
                applyListener(node);
              }
            }
          }
        }
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const target = m.target;
          if (target.id === 'dm-chat-area' && !target.classList.contains('hidden')) {
            setTimeout(ensureCallButton, 300);
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

  // 8. Inicializa
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setupObserver();
      setTimeout(ensureCallButton, 1000);
    });
  } else {
    setupObserver();
    setTimeout(ensureCallButton, 1000);
  }

  // 9. Força verificação periódica (segurança)
  setInterval(function() {
    const chatArea = document.getElementById('dm-chat-area');
    if (chatArea && !chatArea.classList.contains('hidden')) {
      ensureCallButton();
    }
  }, 3000);

  console.log('[DM-FIX-COMPLETE] Correção definitiva instalada!');
})();