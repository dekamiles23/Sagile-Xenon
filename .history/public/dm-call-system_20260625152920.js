// dm-call-fix.js – Correção definitiva do botão de chamada privada
// Versão que mantém o layout intacto (não remove onclick do HTML)
(function() {
  console.log('[DM-CALL-FIX] Iniciando...');

  // 1. Função para obter o parceiro atual da DM (confiável)
  function getCurrentDmPartner() {
    // Tenta de várias formas, em ordem de confiabilidade
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
      // Usa a função existente do dm-call-system.js
      if (typeof window.startDmVoiceCall === 'function') {
        window.startDmVoiceCall(partner);
      } else if (window.socket && window.socket.connected) {
        // Fallback: emite diretamente
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
  }

  // 3. Função para aplicar o fix no botão (sobrescreve o comportamento)
  function applyCallButtonFix() {
    const btn = document.getElementById('dm-call-btn');
    if (!btn) return false;
    if (btn.dataset.callFixApplied) return true;

    // Adiciona um listener que executa ANTES do onclick (capture phase)
    // Isso garante que nosso código rode primeiro, mas não remove o onclick
    btn.addEventListener('click', handleCallButtonClick, true);
    
    // Também substitui o onclick diretamente (sobrescreve em memória)
    // O atributo HTML permanece, mas o comportamento é substituído
    const originalOnclick = btn.onclick;
    btn.onclick = function(e) {
      // Se o evento já foi tratado pelo nosso listener, não faz nada
      if (e.defaultPrevented) return;
      handleCallButtonClick(e);
    };

    btn.dataset.callFixApplied = 'true';
    console.log('[DM-CALL-FIX] Listener aplicado ao botão #dm-call-btn (layout mantido)');
    return true;
  }

  // 4. Aplicar imediatamente se o botão já existir
  if (document.getElementById('dm-call-btn')) {
    applyCallButtonFix();
  }

  // 5. Observar o DOM para detectar quando o botão aparecer (criado dinamicamente)
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

  // 6. Interceptar openDmChat para reaplicar o fix sempre que abrir uma DM
  const originalOpenDmChat = window.openDmChat;
  if (typeof originalOpenDmChat === 'function') {
    window.openDmChat = function(username) {
      originalOpenDmChat.call(this, username);
      setTimeout(function() {
        applyCallButtonFix();
        // Sincroniza window.currentDmUser com o username
        if (username) {
          window.currentDmUser = username;
          const chatArea = document.getElementById('dm-chat-area');
          if (chatArea) chatArea.dataset.activeChat = username;
        }
      }, 200);
    };
    console.log('[DM-CALL-FIX] openDmChat interceptado com sucesso');
  }

  // 7. Também intercepta a função openPrivateChat se existir (do private-chat-system.js)
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
    console.log('[DM-CALL-FIX] openPrivateChat interceptado com sucesso');
  }

  console.log('[DM-CALL-FIX] Correção instalada com sucesso! Layout mantido.');
})();