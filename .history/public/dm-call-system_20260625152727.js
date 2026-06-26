// dm-call-fix.js – Correção definitiva do botão de chamada privada
(function() {
  console.log('[DM-CALL-FIX] Iniciando...');

  // 1. Função para obter o parceiro atual da DM
  function getCurrentDmPartner() {
    // Tenta de várias formas, em ordem de confiabilidade
    if (window.currentDmUser && typeof window.currentDmUser === 'string' && window.currentDmUser.trim() !== '') {
      return window.currentDmUser;
    }

    const chatArea = document.getElementById('dm-chat-area');
    if (chatArea && chatArea.dataset.activeChat) {
      const name = chatArea.dataset.activeChat;
      if (name) {
        window.currentDmUser = name; // sincroniza
        return name;
      }
    }

    const headerName = document.querySelector('#dm-chat-area .dm-username');
    if (headerName) {
      const name = headerName.textContent.trim();
      if (name) {
        window.currentDmUser = name;
        return name;
      }
    }

    const activeItem = document.querySelector('.dm-conv-item.active');
    if (activeItem && activeItem.dataset.username) {
      const name = activeItem.dataset.username;
      window.currentDmUser = name;
      return name;
    }

    return null;
  }

  // 2. Função para aplicar o listener no botão de chamada
  function applyCallButtonFix() {
    const btn = document.getElementById('dm-call-btn');
    if (!btn) return false;
    if (btn.dataset.callFixApplied) return true;

    // Remove qualquer onclick antigo e adiciona via addEventListener
    btn.removeAttribute('onclick');
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const partner = getCurrentDmPartner();
      console.log('[DM-CALL-FIX] Botão clicado, partner:', partner);
      
      if (partner) {
        if (typeof window.startDmVoiceCall === 'function') {
          window.startDmVoiceCall(partner);
        } else if (window.socket && window.socket.connected) {
          window.socket.emit('call:start', { targetUser: partner });
          if (typeof showToast === 'function') {
            showToast('Chamando ' + partner + '...');
          }
        } else {
          if (typeof showToast === 'function') {
            showToast('❌ Sem conexão com o servidor.');
          }
        }
      } else {
        if (typeof showToast === 'function') {
          showToast('❌ Nenhum parceiro de DM selecionado.');
        }
        console.warn('[DM-CALL-FIX] Nenhum parceiro encontrado.');
      }
    });

    btn.dataset.callFixApplied = 'true';
    console.log('[DM-CALL-FIX] Listener aplicado ao botão #dm-call-btn');
    return true;
  }

  // 3. Aplicar imediatamente se o botão já existir
  if (document.getElementById('dm-call-btn')) {
    applyCallButtonFix();
  }

  // 4. Observar o DOM para detectar quando o botão aparecer (criado dinamicamente)
  const observer = new MutationObserver(function(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            if (node.id === 'dm-call-btn') {
              applyCallButtonFix();
            } else if (node.querySelector) {
              const found = node.querySelector('#dm-call-btn');
              if (found) applyCallButtonFix();
            }
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 5. Interceptar openDmChat para reaplicar o fix sempre que abrir uma DM
  const originalOpenDmChat = window.openDmChat;
  if (typeof originalOpenDmChat === 'function') {
    window.openDmChat = function(username) {
      originalOpenDmChat.call(this, username);
      setTimeout(function() {
        applyCallButtonFix();
      }, 200);
    };
    console.log('[DM-CALL-FIX] openDmChat interceptado com sucesso');
  } else {
    console.warn('[DM-CALL-FIX] openDmChat não encontrado, o fix será aplicado apenas via MutationObserver');
  }

  console.log('[DM-CALL-FIX] Correção instalada com sucesso!');
})();