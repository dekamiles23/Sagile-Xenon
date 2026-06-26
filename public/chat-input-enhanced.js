/**
 * ============================================================================
 * SISTEMA APRIMORADO DE INPUT DO CHAT
 * ============================================================================
 * 
 * Funcionalidades:
 * 1. Textarea expansível automaticamente
 * 2. Suporte a Enter para nova linha (Shift+Enter ou Ctrl+Enter)
 * 3. Suporte a Ctrl+Enter para enviar
 * 4. Altura mínima e máxima confortáveis
 * 5. Scroll interno quando atinge altura máxima
 * 
 * ============================================================================
 */

if (window.__zx_chat_input_enhanced_loaded) {
  console.warn('chat-input-enhanced.js already loaded — skipping duplicate initialization');
} else {
  window.__zx_chat_input_enhanced_loaded = true;

  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando chat-input-enhanced.js');

    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');

    if (!messageInput) {
      console.warn('❌ #message-input não encontrado');
      return;
    }

    // ========================================================================
    // 1. CONVERTER INPUT PARA TEXTAREA SE NECESSÁRIO
    // ========================================================================
    if (messageInput.tagName !== 'TEXTAREA') {
      console.log('🔄 Convertendo input para textarea');
      const textarea = document.createElement('textarea');
      textarea.id = 'message-input';
      textarea.className = messageInput.className;
      textarea.placeholder = messageInput.placeholder || 'Digite uma mensagem...';
      textarea.spellcheck = 'true';
      
      // Copiar atributos importantes
      if (messageInput.style.cssText) {
        textarea.style.cssText = messageInput.style.cssText;
      }
      
      messageInput.parentNode.replaceChild(textarea, messageInput);
      messageInput = textarea;
    }

    // ========================================================================
    // 2. FUNÇÃO DE AUTO-EXPANSÃO DO TEXTAREA
    // ========================================================================
    function autoExpandTextarea() {
      // Reset altura para calcular o scroll height correto
      messageInput.style.height = '48px';
      
      // Calcular altura necessária
      const scrollHeight = messageInput.scrollHeight;
      const maxHeight = 200; // Máximo de 200px
      const minHeight = 48;  // Mínimo de 48px
      
      // Aplicar altura
      if (scrollHeight <= maxHeight) {
        messageInput.style.height = Math.max(scrollHeight, minHeight) + 'px';
        messageInput.style.overflowY = 'hidden';
      } else {
        messageInput.style.height = maxHeight + 'px';
        messageInput.style.overflowY = 'auto';
      }
      
      // Ajustar altura do wrapper se necessário
      const wrapper = messageInput.closest('.input-wrapper');
      if (wrapper) {
        const newHeight = Math.max(scrollHeight + 16, 48); // 16px padding
        if (newHeight <= 216) { // 200px max + 16px padding
          wrapper.style.minHeight = newHeight + 'px';
        }
      }
    }

    // ========================================================================
    // 3. EVENTOS DE DIGITAÇÃO
    // ========================================================================
    messageInput.addEventListener('input', () => {
      autoExpandTextarea();
    });

    messageInput.addEventListener('keydown', (e) => {
      // ====================================================================
      // ENTER PARA ENVIAR (sem modificadores)
      // ====================================================================
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        console.log('📤 Enter pressionado - enviando mensagem');
        
        // Disparar evento de envio
        if (sendBtn) {
          sendBtn.click();
        } else {
          // Fallback: emitir evento customizado
          const event = new Event('send-message', { bubbles: true });
          messageInput.dispatchEvent(event);
        }
        
        return;
      }

      // ====================================================================
      // SHIFT+ENTER OU CTRL+ENTER PARA NOVA LINHA
      // ====================================================================
      if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        console.log('📝 Shift+Enter ou Ctrl+Enter - nova linha');
        
        // Inserir quebra de linha na posição do cursor
        const start = messageInput.selectionStart;
        const end = messageInput.selectionEnd;
        const value = messageInput.value;
        
        messageInput.value = value.substring(0, start) + '\n' + value.substring(end);
        messageInput.selectionStart = messageInput.selectionEnd = start + 1;
        
        // Expandir textarea
        setTimeout(autoExpandTextarea, 0);
        
        return;
      }

      // ====================================================================
      // ESC PARA FECHAR PICKERS
      // ====================================================================
      if (e.key === 'Escape') {
        console.log('🔒 Escape pressionado - fechando pickers');
        
        // Fechar todos os pickers
        document.querySelectorAll('.chat-picker.active').forEach(picker => {
          picker.classList.remove('active');
        });
        
        // Fechar menu +
        document.querySelectorAll('.plus-menu').forEach(menu => {
          menu.remove();
        });
        
        return;
      }
    });

    // ========================================================================
    // 4. INICIALIZAR ALTURA DO TEXTAREA
    // ========================================================================
    setTimeout(() => {
      autoExpandTextarea();
      console.log('✅ Textarea inicializado com auto-expansão');
    }, 100);

    // ========================================================================
    // 5. REAJUSTAR ALTURA QUANDO JANELA MUDA
    // ========================================================================
    window.addEventListener('resize', () => {
      autoExpandTextarea();
    });

    // ========================================================================
    // 6. LIMPAR TEXTAREA APÓS ENVIO
    // ========================================================================
    const originalSendBtn = sendBtn?.onclick;
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        // Aguardar o envio ser processado
        setTimeout(() => {
          messageInput.value = '';
          messageInput.style.height = '48px';
          
          const wrapper = messageInput.closest('.input-wrapper');
          if (wrapper) {
            wrapper.style.minHeight = '48px';
          }
          
          messageInput.focus();
          console.log('🧹 Textarea limpo após envio');
        }, 100);
      });
    }

    // ========================================================================
    // 7. DIAGNOSTICAR ESTADO DO INPUT
    // ========================================================================
    console.log('🔍 DIAGNÓSTICO DO INPUT:');
    console.log('- ID:', messageInput.id);
    console.log('- Tag:', messageInput.tagName);
    console.log('- Classe:', messageInput.className);
    console.log('- Placeholder:', messageInput.placeholder);
    console.log('- Altura inicial:', messageInput.style.height);
    console.log('- Max-height:', messageInput.style.maxHeight);
    console.log('- Wrapper:', messageInput.closest('.input-wrapper'));

    console.log('✅ chat-input-enhanced.js carregado com sucesso!');
  });
}
