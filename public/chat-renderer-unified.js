/**
 * ============================================================================
 * RENDERIZADOR UNIFICADO DE MENSAGENS DO CHAT
 * ============================================================================
 * 
 * Propósito:
 * - Centralizar toda a lógica de renderização de mensagens
 * - Evitar duplicação de mensagens
 * - Garantir consistência visual
 * - Facilitar manutenção e debugging
 * 
 * Funcionalidades:
 * 1. Renderização unificada de mensagens
 * 2. Suporte a agrupamento de mensagens (mesmo usuário consecutivo)
 * 3. Suporte a diferentes tipos (texto, emoji, figurinha, etc)
 * 4. Auto-scroll para mensagens novas
 * 5. Logs de diagnóstico
 * 
 * ============================================================================
 */

if (window.__zx_unified_renderer_loaded) {
  console.warn('chat-renderer-unified.js already loaded — skipping duplicate initialization');
} else {
  window.__zx_unified_renderer_loaded = true;

  // ========================================================================
  // 1. ESTADO GLOBAL DO RENDERIZADOR
  // ========================================================================
  window.ChatRenderer = {
    lastMessageUser: null,
    lastMessageTimestamp: 0,
    messageGroupThreshold: 5 * 60 * 1000, // 5 minutos
    
    /**
     * Renderizar uma mensagem no chat
     * @param {Object} msg - Objeto da mensagem
     * @param {string} msg.text - Texto da mensagem
     * @param {string} msg.username - Nome do usuário
     * @param {string} msg.time - Hora da mensagem
     * @param {string} msg.type - Tipo (text, emoji, sticker, etc)
     * @param {string} msg.avatar - URL do avatar (opcional)
     * @param {HTMLElement} container - Container onde renderizar (padrão: #messages-area)
     */
    renderMessage: function(msg, container) {
      try {
        // Validação básica
        if (!msg || !msg.text) {
          console.warn('❌ Mensagem inválida:', msg);
          return;
        }

        // Obter container
        if (!container) {
          container = document.getElementById('messages-area');
        }
        if (!container) {
          console.error('❌ Container #messages-area não encontrado');
          return;
        }

        // Normalizar dados
        const username = String(msg.username || msg.user || 'Usuário').trim();
        const text = String(msg.text || msg.content || msg.message || '').trim();
        const time = msg.time || new Date().toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const initial = username.charAt(0).toUpperCase() || '?';
        const timestamp = msg.timestamp || Date.now();

        // Verificar agrupamento (mesmo usuário dentro do threshold)
        const shouldGroup = 
          username === this.lastMessageUser && 
          (timestamp - this.lastMessageTimestamp) < this.messageGroupThreshold;

        // Atualizar estado
        this.lastMessageUser = username;
        this.lastMessageTimestamp = timestamp;

        // Criar elemento da mensagem
        const messageEl = document.createElement('div');
        messageEl.className = `message${shouldGroup ? ' grouped' : ''}`;
        messageEl.dataset.username = username;
        messageEl.dataset.timestamp = timestamp;

        // Avatar
        const avatarHtml = msg.avatar
          ? `<div class="msg-avatar av-${initial} has-image" style="background-image:url(${this.escapeHtml(msg.avatar)});background-size:cover;background-position:center;"></div>`
          : `<div class="msg-avatar av-${initial}">${initial}</div>`;

        // Corpo da mensagem
        let contentHtml = '';
        
        if (msg.type === 'emoji') {
          contentHtml = `<img src="${this.escapeHtml(text)}" style="max-height: 80px; max-width: 200px;" alt="emoji" />`;
        } else if (msg.type === 'sticker') {
          contentHtml = `<img src="${this.escapeHtml(msg.stickerUrl || text)}" style="max-height: 150px; max-width: 200px;" alt="sticker" />`;
        } else if (msg.type === 'poll') {
          const opcoesHtml = (msg.options || [])
            .map((op, i) => `
              <button class="poll-option" data-index="${i}" style="
                display:block; width:100%; margin:4px 0; padding:8px 14px;
                background:rgba(255,0,255,0.1); border:1px solid rgba(255,0,255,0.3);
                border-radius:8px; color:#fff; cursor:pointer; text-align:left;">
                ${this.escapeHtml(op.text)} — <span class="poll-vote-count">${op.votes || 0}</span> votos
              </button>
            `)
            .join('');
          contentHtml = `
            <strong>📊 ${this.escapeHtml(msg.question || 'Enquete')}</strong>
            <div style="margin-top:8px;">${opcoesHtml}</div>
          `;
        } else if (msg.type === 'topic') {
          contentHtml = `
            <strong>💬 ${this.escapeHtml(msg.title || 'Tópico')}</strong>
            ${msg.content ? `<p style="margin:4px 0 0;color:#ccc;">${this.escapeHtml(msg.content)}</p>` : ''}
          `;
        } else if (msg.type === 'voice') {
          contentHtml = `
            🎤 <audio controls src="${this.escapeHtml(msg.audio || text)}" style="max-width:240px;vertical-align:middle;"></audio>
          `;
        } else {
          // Texto normal
          contentHtml = this.escapeHtml(text);
        }

        // Montar HTML
        messageEl.innerHTML = `
          ${avatarHtml}
          <div class="msg-body">
            ${!shouldGroup ? `
              <div class="msg-meta">
                <span class="msg-username">${this.escapeHtml(username)}</span>
                <span class="msg-time">${time}</span>
              </div>
            ` : ''}
            <div class="msg-text">${contentHtml}</div>
          </div>
        `;

        // Adicionar ao container
        container.appendChild(messageEl);

        // Auto-scroll para a mensagem nova
        container.scrollTop = container.scrollHeight;

        // Log de sucesso
        console.log('✅ Mensagem renderizada:', {
          username,
          text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          grouped: shouldGroup,
          type: msg.type || 'text'
        });

      } catch (e) {
        console.error('❌ ERRO AO RENDERIZAR MENSAGEM:', e, msg);
      }
    },

    /**
     * Renderizar mensagem de sistema
     * @param {string} text - Texto da mensagem
     * @param {HTMLElement} container - Container (padrão: #messages-area)
     */
    renderSystem: function(text, container) {
      try {
        if (!text) return;

        if (!container) {
          container = document.getElementById('messages-area');
        }
        if (!container) return;

        this.lastMessageUser = null;

        const div = document.createElement('div');
        div.className = 'system-message';
        div.textContent = text;

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;

        console.log('✅ Mensagem de sistema renderizada:', text);
      } catch (e) {
        console.error('❌ ERRO AO RENDERIZAR SISTEMA:', e);
      }
    },

    /**
     * Limpar histórico de mensagens
     * @param {HTMLElement} container - Container (padrão: #messages-area)
     */
    clearHistory: function(container) {
      try {
        if (!container) {
          container = document.getElementById('messages-area');
        }
        if (!container) return;

        container.innerHTML = '';
        this.lastMessageUser = null;
        this.lastMessageTimestamp = 0;

        console.log('🧹 Histórico de mensagens limpo');
      } catch (e) {
        console.error('❌ ERRO AO LIMPAR HISTÓRICO:', e);
      }
    },

    /**
     * Renderizar múltiplas mensagens
     * @param {Array} messages - Array de mensagens
     * @param {HTMLElement} container - Container (padrão: #messages-area)
     */
    renderBatch: function(messages, container) {
      try {
        if (!Array.isArray(messages)) return;

        this.clearHistory(container);

        messages.forEach(msg => {
          this.renderMessage(msg, container);
        });

        console.log(`✅ ${messages.length} mensagens renderizadas em lote`);
      } catch (e) {
        console.error('❌ ERRO AO RENDERIZAR LOTE:', e);
      }
    },

    /**
     * Escapar HTML para evitar XSS
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    escapeHtml: function(text) {
      if (!text) return '';
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return String(text).replace(/[&<>"']/g, m => map[m]);
    },

    /**
     * Diagnosticar estado do renderizador
     */
    diagnose: function() {
      console.log('🔍 DIAGNÓSTICO DO RENDERIZADOR:');
      console.log('- Último usuário:', this.lastMessageUser);
      console.log('- Último timestamp:', new Date(this.lastMessageTimestamp));
      console.log('- Container:', document.getElementById('messages-area'));
      console.log('- Mensagens no DOM:', document.querySelectorAll('.message').length);
      console.log('- Mensagens de sistema:', document.querySelectorAll('.system-message').length);
    }
  };

  // ========================================================================
  // 2. INTEGRAÇÃO COM SOCKET.IO (SE DISPONÍVEL)
  // ========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando chat-renderer-unified.js');

    // Aguardar socket estar disponível
    const waitForSocket = (cb) => {
      if (window.socket) {
        cb();
      } else {
        const timer = setInterval(() => {
          if (window.socket) {
            clearInterval(timer);
            cb();
          }
        }, 100);
        setTimeout(() => clearInterval(timer), 5000); // Timeout de 5s
      }
    };

    waitForSocket(() => {
      console.log('✅ Socket.IO detectado - registrando listeners');

      // Listener de histórico REMOVIDO - duplicado com o listener em script.js (linha 6695)
      // O listener principal usa renderMessage() que suporta avatares e agrupamento
      if (window.socket && typeof window.socket.on === 'function') {
        // window.socket.on('history', ...) REMOVIDO para evitar duplicação
        console.log('✅ chat-renderer-unified.js: listener de history removido para evitar duplicação');
        console.log('✅ chat-renderer-unified.js: listener de mensagem removido para evitar duplicação');

        // Listener de mensagem de sistema
        window.socket.on('system', (text) => {
          console.log('📢 Sistema:', text);
          window.ChatRenderer.renderSystem(text);
        });
      }
    });

    // Diagnosticar estado
    setTimeout(() => {
      window.ChatRenderer.diagnose();
    }, 2000);

    console.log('✅ chat-renderer-unified.js carregado com sucesso!');
  });
}
