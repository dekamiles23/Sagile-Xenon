
// dm-call-fix.js – Correção definitiva do botão de chamada privada
(function() {
  console.log('[DM-CALL-FIX] Iniciando...');

  // 1. Garantir que a função getCurrentDmPartner exista
  if (typeof window.getCurrentDmPartner !== 'function') {
    window.getCurrentDmPartner = function() {
      if (window.currentDmUser && typeof window.currentDmUser === 'string' && window.currentDmUser.trim() !== '') {
        return window.currentDmUser;
      }
      const headerNameEl = document.querySelector('#dm-chat-area .dm-username');
      if (headerNameEl) {
        const name = headerNameEl.textContent.trim();
        if (name) { window.currentDmUser = name; return name; }
      }
      const chatArea = document.getElementById('dm-chat-area');
      if (chatArea && chatArea.dataset.activeChat) {
        const name = chatArea.dataset.activeChat;
        if (name) { window.currentDmUser = name; return name; }
      }
      const activeItem = document.querySelector('.dm-conv-item.active');
      if (activeItem && activeItem.dataset.username) {
        const name = activeItem.dataset.username;
        window.currentDmUser = name;
        return name;
      }
      return null;
    };
    console.log('[DM-CALL-FIX] getCurrentDmPartner definida');
  }

  // 2. Função para aplicar o listener no botão de chamada
  function applyCallButtonFix(btn) {
    if (!btn) return false;
    if (btn.dataset.callFixApplied) return true;
    btn.dataset.callFixApplied = 'true';

    // Remove o onclick antigo e adiciona via addEventListener
    btn.removeAttribute('onclick');
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const partner = window.getCurrentDmPartner();
      console.log('[DM-CALL-FIX] Botão clicado, partner:', partner);
      if (partner) {
        if (typeof startDmVoiceCall === 'function') {
          startDmVoiceCall(partner);
        } else if (window.socket && window.socket.connected) {
          window.socket.emit('call:start', { targetUser: partner });
          if (typeof showToast === 'function') showToast('Chamando ' + partner + '...');
        } else {
          if (typeof showToast === 'function') showToast('❌ Sem conexão.');
        }
      } else {
        if (typeof showToast === 'function') showToast('❌ Nenhum parceiro de DM.');
      }
    });
    console.log('[DM-CALL-FIX] Listener aplicado ao botão', btn.id);
    return true;
  }

  // 3. Aplicar imediatamente se o botão já existir
  let btn = document.getElementById('dm-call-btn');
  if (btn) {
    applyCallButtonFix(btn);
  } else {
    console.log('[DM-CALL-FIX] Botão não encontrado, aguardando criação...');
  }

  // 4. Observar o DOM para detectar quando o botão aparecer (criado dinamicamente)
  const observer = new MutationObserver(function(mutations) {
    for (let mutation of mutations) {
      if (mutation.type === 'childList') {
        for (let node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            if (node.id === 'dm-call-btn') {
              applyCallButtonFix(node);
            } else if (node.querySelector) {
              const found = node.querySelector('#dm-call-btn');
              if (found) applyCallButtonFix(found);
            }
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 5. Interceptar openDmChat para reaplicar o fix sempre que abrir uma DM
  const originalOpenDmChat = window.openDmChat;
  if (originalOpenDmChat && typeof originalOpenDmChat === 'function') {
    window.openDmChat = function(username) {
      originalOpenDmChat.call(this, username);
      setTimeout(function() {
        const btn = document.getElementById('dm-call-btn');
        if (btn) applyCallButtonFix(btn);
      }, 100);
    };
    console.log('[DM-CALL-FIX] openDmChat interceptado');
  }

  console.log('[DM-CALL-FIX] Correção instalada com sucesso!');
})();