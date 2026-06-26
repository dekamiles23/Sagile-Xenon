// dm-call-to-room-override.js — Redireciona botão de chamada para sala de voz DM
(function () {
  'use strict';

  // Remove listener antigo do dm-fix-complete, se existir
  const oldHandleCallClick = window._dmFixHandleCallClick;
  if (oldHandleCallClick) {
    document.removeEventListener('click', oldHandleCallClick);
  }

  function getCurrentDmPartner() {
    if (window.currentDmUser) return window.currentDmUser;
    const area = document.getElementById('dm-chat-area');
    if (area && area.dataset.activeChat) return area.dataset.activeChat;
    const nameEl = document.querySelector('#dm-chat-area .dm-username, .pcs-header-name');
    if (nameEl) return nameEl.textContent.trim();
    return null;
  }

  function handleCallClick(e) {
    const btn = e.target.closest('#dm-call-btn, .pcs-call-btn, [id="pcs-call-btn"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const partner = getCurrentDmPartner();
    console.log('[DM-CALL-TO-ROOM] Botão clicado, partner:', partner);
    if (!partner) {
      if (typeof showToast === 'function') showToast('❌ Nenhum parceiro encontrado.');
      return;
    }
    // Usa o sistema de sala de voz privada
    if (typeof window.startDmVoiceCall === 'function') {
      window.startDmVoiceCall(partner);
    } else {
      if (typeof showToast === 'function') showToast('⚠️ Sistema de voz ainda carregando...');
      console.warn('[DM-CALL-TO-ROOM] startDmVoiceCall não disponível');
    }
  }

  document.addEventListener('click', handleCallClick);
  window._dmFixHandleCallClick = handleCallClick;
  console.log('[DM-CALL-TO-ROOM] Listener atualizado — usa sala de voz privada');
})();
