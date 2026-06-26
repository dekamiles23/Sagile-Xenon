// ================================================
// ✅ DM MESSAGE UNIFICATION
// ================================================
// Este arquivo garante que o sistema de mensagens
// do DM seja EXATAMENTE idêntico ao do servidor.
// Inclui: quebra de linha, scroll, altura, renderização.

(function() {
  'use strict';

  // Aguarda script.js estar carregado
  function waitForScriptJs(callback) {
    if (typeof renderDmMessages === 'function' && typeof sendDmMessage === 'function') {
      callback();
    } else {
      setTimeout(() => waitForScriptJs(callback), 100);
    }
  }

  // ================================================
  // 1. UNIFICAR COMPORTAMENTO DE SCROLL
  // ================================================
  function setupDmScrollBehavior() {
    const container = document.getElementById('dm-messages-area');
    if (!container) return;

    // Preservar scroll position quando não estiver no final
    let wasAtBottom = true;
    
    container.addEventListener('scroll', () => {
      wasAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 40;
    });

    // Observer para detectar mudanças no DOM e rolar se necessário
    const observer = new MutationObserver(() => {
      if (wasAtBottom) {
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
      }
    });

    observer.observe(container, { childList: true, subtree: true });
  }

  // ================================================
  // 2. UNIFICAR COMPORTAMENTO DO TEXTAREA
  // ================================================
  function setupDmTextareaAutoHeight() {
    const textarea = document.getElementById('dm-message-input');
    if (!textarea) return;

    // Auto-height no input
    function adjustHeight() {
      textarea.style.height = '40px';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    textarea.addEventListener('input', adjustHeight);
    textarea.addEventListener('change', adjustHeight);

    // Ajustar altura inicial
    adjustHeight();
  }

  // ================================================
  // 3. UNIFICAR LIMITE DE CARACTERES
  // ================================================
  function setupDmCharacterCounter() {
    const textarea = document.getElementById('dm-message-input');
    const counter = document.getElementById('dm-char-counter');
    const sendBtn = document.getElementById('dm-send-btn');
    
    if (!textarea || !counter) return;

    const limit = 4000;

    function updateCounter() {
      const length = textarea.value.length;
      counter.textContent = `${length}/${limit}`;
      counter.style.color = length > limit ? '#ff4444' : '#888';

      if (sendBtn) {
        sendBtn.disabled = length > limit;
        sendBtn.style.opacity = length > limit ? '0.5' : '1';
        sendBtn.style.cursor = length > limit ? 'not-allowed' : 'pointer';
      }
    }

    textarea.addEventListener('input', updateCounter);
    textarea.addEventListener('change', updateCounter);

    // Atualizar no carregamento
    updateCounter();
  }

  // ================================================
  // 4. UNIFICAR QUEBRA DE LINHA (Enter vs Shift+Enter)
  // ================================================
  function setupDmEnterBehavior() {
    const textarea = document.getElementById('dm-message-input');
    const sendBtn = document.getElementById('dm-send-btn');

    if (!textarea) return;

    textarea.addEventListener('keydown', (e) => {
      // Enter sem Shift = enviar
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (typeof sendDmMessage === 'function') {
          sendDmMessage();
        }
      }
      // Shift+Enter = nova linha (comportamento padrão)
    });

    // Botão de enviar
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (typeof sendDmMessage === 'function') {
          sendDmMessage();
        }
      });
    }
  }

  // ================================================
  // 5. UNIFICAR RENDERIZAÇÃO DE MENSAGENS
  // ================================================
  function setupDmMessageRendering() {
    // Interceptar renderDmMessages para garantir estilos corretos
    const originalRenderDmMessages = window.renderDmMessages;
    
    if (typeof originalRenderDmMessages === 'function') {
      window.renderDmMessages = function() {
        originalRenderDmMessages.call(this);
        
        // Após renderizar, aplicar estilos uniformes
        const container = document.getElementById('dm-messages-area');
        if (container) {
          container.querySelectorAll('.message').forEach(msg => {
            // Garantir que a estrutura é idêntica ao servidor
            const msgBody = msg.querySelector('.msg-body');
            if (msgBody) {
              msgBody.style.maxWidth = '75ch';
              msgBody.style.display = 'flex';
              msgBody.style.flexDirection = 'column';
              msgBody.style.gap = '4px';
            }

            const msgText = msg.querySelector('.msg-text');
            if (msgText) {
              msgText.style.fontSize = '0.95rem';
              msgText.style.lineHeight = '1.5';
              msgText.style.whiteSpace = 'pre-wrap';
              msgText.style.wordBreak = 'break-word';
              msgText.style.overflowWrap = 'anywhere';
              msgText.style.overflow = 'visible';
              msgText.style.height = 'auto';
              msgText.style.margin = '0';
              msgText.style.padding = '0';
            }
          });
        }
      };
    }
  }

  // ================================================
  // 6. UNIFICAR COMPORTAMENTO DO SEND
  // ================================================
  function setupDmSendBehavior() {
    const originalSendDmMessage = window.sendDmMessage;

    if (typeof originalSendDmMessage === 'function') {
      window.sendDmMessage = function() {
        const textarea = document.getElementById('dm-message-input');
        if (textarea && textarea.value.length > 4000) {
          if (typeof showToast === 'function') {
            showToast('⚠️ O limite máximo é de 4.000 caracteres.');
          }
          return;
        }

        // Chamar original
        originalSendDmMessage.call(this);

        // Resetar textarea e counter
        if (textarea) {
          textarea.value = '';
          textarea.style.height = '40px';
        }

        const counter = document.getElementById('dm-char-counter');
        if (counter) {
          counter.textContent = '0/4000';
          counter.style.color = '#888';
        }
      };
    }
  }

  // ================================================
  // 7. UNIFICAR COMPORTAMENTO DE FOCO
  // ================================================
  function setupDmFocusBehavior() {
    const textarea = document.getElementById('dm-message-input');
    if (!textarea) return;

    // Focar no textarea quando abrir DM
    const originalOpenDmChat = window.openDmChat;
    if (typeof originalOpenDmChat === 'function') {
      window.openDmChat = function(...args) {
        originalOpenDmChat.call(this, ...args);
        setTimeout(() => {
          const input = document.getElementById('dm-message-input');
          if (input) input.focus();
        }, 100);
      };
    }
  }

  // ================================================
  // INICIALIZAÇÃO
  // ================================================
  waitForScriptJs(() => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setupDmScrollBehavior();
        setupDmTextareaAutoHeight();
        setupDmCharacterCounter();
        setupDmEnterBehavior();
        setupDmMessageRendering();
        setupDmSendBehavior();
        setupDmFocusBehavior();
      });
    } else {
      setupDmScrollBehavior();
      setupDmTextareaAutoHeight();
      setupDmCharacterCounter();
      setupDmEnterBehavior();
      setupDmMessageRendering();
      setupDmSendBehavior();
      setupDmFocusBehavior();
    }
  });

})();
