// dm-call-fix.js – Correção definitiva do botão de chamada privada
// Versão com verificação de DOM para evitar erro no MutationObserver
(function() {
  console.log('[DM-CALL-FIX] Iniciando...');

  // 1. Função para obter o parceiro atual da DM
  function getCurrentDmPartner() {
    if (window.currentDmUser && typeof window.currentDmUser === 'string' && window.currentDmUser.trim() !== '') {
      return window.currentDmUser;
    }

    const chatArea = document.getElementById('dm-chat-area');
    if (chatArea && chatArea.dataset.activeChat) {
      const name = chatArea.dataset.activeChat;
      if (name) {
        window.currentDmUser = name;
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

  // 2. Função que será chamada quando o botão for clicado
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
        if (typeof showToast === 'function') showToast('❌ Sem conexão com o servidor.');
      }
    } else {
      if (typeof showToast === 'function') showToast('❌ Nenhum parceiro de DM selecionado.');
      console.warn('[DM-CALL-FIX] Nenhum parceiro encontrado.');
    }
  }

  // 3. Função para aplicar o fix no botão
  function applyCallButtonFix() {
    const btn = document.getElementById('dm-call-btn');
    if (!btn) return false;
    if (btn.dataset.callFixApplied) return true;

    // Adiciona listener em fase de captura
    btn.addEventListener('click', handleCallButtonClick, true);
    
    // Substitui onclick em memória (mantém o atributo HTML)
    btn.onclick = function(e) {
      if (e.defaultPrevented) return;
      handleCallButtonClick(e);
    };

    btn.dataset.callFixApplied = 'true';
    console.log('[DM-CALL-FIX] Listener aplicado ao botão #dm-call-btn');
    return true;
  }

  // 4. Aplica imediatamente se o botão já existir
  if (document.getElementById('dm-call-btn')) {
    applyCallButtonFix();
  }

  // 5. Configura MutationObserver APENAS quando o DOM estiver pronto
  function setupObserver() {
    if (!document.body) {
      // Se body ainda não existe, aguarda
      setTimeout(setupObserver, 100);
      return;
    }

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
    console.log('[DM-CALL-FIX] MutationObserver configurado');
  }

  // Aguarda DOM pronto para configurar o observer
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupObserver);
  } else {
    setupObserver();
  }

  // 6. Intercepta openDmChat
  const originalOpenDmChat = window.openDmChat;
  if (typeof originalOpenDmChat === 'function') {
    window.openDmChat = function(username) {
      originalOpenDmChat.call(this, username);
      setTimeout(function() {
        applyCallButtonFix();
        if (username) {
          window.currentDmUser = username;
          const chatArea = document.getElementById('dm-chat-area');
          if (chatArea) chatArea.dataset.activeChat = username;
        }
      }, 200);
    };
    console.log('[DM-CALL-FIX] openDmChat interceptado');
  }

  // 7. Intercepta openPrivateChat (do private-chat-system.js)
  const originalOpenPrivateChat = window.openPrivateChat;
  if (typeof originalOpenPrivateChat === 'function') {
    window.openPrivateChat = function(username) {
      originalOpenPrivateChat.call(this, username);
      setTimeout(function() {
        applyCallButtonFix();
        if (username) {
          window.currentDmUser = username;
          const chatArea = document.getElementById('dm-chat-area');
          if (chatArea) chatArea.dataset.activeChat = username;
        }
      }, 200);
    };
    console.log('[DM-CALL-FIX] openPrivateChat interceptado');
  }

  console.log('[DM-CALL-FIX] Correção instalada com sucesso!');
})();

// Teste: força a emissão do evento ao clicar
document.addEventListener('click', function(e) {
  const btn = e.target.closest('#dm-call-btn');
  if (btn) {
    console.log('[TESTE] Botão de chamada clicado via fallback!');
    const partner = getCurrentDmPartner();
    if (partner && window.socket) {
      window.socket.emit('call:start', { targetUser: partner });
    }
  }
});