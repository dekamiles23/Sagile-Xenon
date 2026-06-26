// ================================================
// SISTEMA @todos - MENCIONAR TODOS OS MEMBROS
// Funciona no chat-view do servidor
// ================================================

(function() {
  'use strict';

  // ──────────────────────────────────────────
  // 1. ESTILOS CSS
  // ──────────────────────────────────────────
  const css = `
    /* Destaque de @todos na mensagem */
    .mention-todos {
      display: inline-block;
      background: rgba(255, 170, 0, 0.2);
      color: #ffaa00;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .mention-todos:hover {
      background: rgba(255, 170, 0, 0.35);
    }

    /* Destaque de @cargo na mensagem */
    .mention-role {
      display: inline-block;
      background: rgba(88, 101, 242, 0.2);
      color: #a8b4ff;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .mention-role:hover {
      background: rgba(88, 101, 242, 0.35);
    }

    /* Autocomplete de menção */
    .mention-autocomplete {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 0;
      background: #1a1a2e;
      border: 1px solid #ff00ff;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(255,0,255,0.25);
      z-index: 10000;
      min-width: 240px;
      max-height: 220px;
      overflow-y: auto;
      display: none;
      animation: acOpen 0.15s ease-out;
    }
    @keyframes acOpen {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .mention-autocomplete.visible {
      display: block;
    }
    .mention-ac-header {
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #888;
      border-bottom: 1px solid rgba(255,0,255,0.15);
      letter-spacing: 0.5px;
    }
    .mention-ac-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      cursor: pointer;
      transition: background 0.12s;
    }
    .mention-ac-item:hover,
    .mention-ac-item.selected {
      background: rgba(255,0,255,0.12);
    }
    .mention-ac-icon {
      font-size: 18px;
      width: 28px;
      text-align: center;
    }
    .mention-ac-label {
      color: #eee;
      font-size: 14px;
      font-weight: 600;
    }
    .mention-ac-desc {
      color: #888;
      font-size: 12px;
      margin-left: auto;
    }

    /* Notificação de menção na mensagem recebida */
    .message.has-mention {
      background: rgba(255, 170, 0, 0.07) !important;
      border-color: rgba(255, 170, 0, 0.35) !important;
    }
    .message.has-mention-role {
      background: rgba(88, 101, 242, 0.07) !important;
      border-color: rgba(88, 101, 242, 0.35) !important;
    }

    /* Badge de notificação @todos */
    .todos-ping-badge {
      position: fixed;
      top: 70px;
      right: 24px;
      background: linear-gradient(135deg, #ff8800, #ffaa00);
      color: #000;
      font-weight: 700;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 20px;
      box-shadow: 0 4px 16px rgba(255,170,0,0.4);
      z-index: 99999;
      animation: pingIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
      cursor: pointer;
    }
    @keyframes pingIn {
      from { transform: scale(0.5) translateX(60px); opacity: 0; }
      to   { transform: scale(1) translateX(0);  opacity: 1; }
    }
    .todos-ping-badge.fade-out {
      animation: pingOut 0.4s ease forwards;
    }
    @keyframes pingOut {
      to { opacity: 0; transform: translateY(-10px); }
    }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ──────────────────────────────────────────
  // 2. AUTOCOMPLETE NO INPUT
  // ──────────────────────────────────────────
  function init() {
    const input = document.getElementById('message-input');
    if (!input) { setTimeout(init, 300); return; }

    const wrapper = input.closest('.input-wrapper') || input.parentElement;
    if (!wrapper.style.position) wrapper.style.position = 'relative';

    const ac = document.createElement('div');
    ac.className = 'mention-autocomplete';
    ac.id = 'mention-autocomplete';
    wrapper.appendChild(ac);

    let acIndex = 0;

    function getMentionOptions(query) {
      const q = (query || '').toLowerCase();
      const options = [];

      // @todos sempre aparece primeiro
      if ('todos'.startsWith(q)) {
        options.push({ key: '@todos', label: '@todos', desc: 'Menciona todos', icon: '📢', type: 'todos' });
      }

      // @here — mencionar membros online
      if ('here'.startsWith(q) || 'aqui'.startsWith(q)) {
        options.push({ key: '@here', label: '@here', desc: 'Membros online', icon: '🟢', type: 'here' });
      }

      // Cargos do servidor
      if (window.roles && window.roles.list) {
        window.roles.list.forEach(role => {
          if (role.mentionable !== false && role.name.toLowerCase().startsWith(q)) {
            options.push({
              key: `@${role.name}`,
              label: `@${role.name}`,
              desc: `${role.members ? role.members.length : 0} membros`,
              icon: role.icon || '🏷️',
              type: 'role',
              roleId: role.id,
              color: role.color
            });
          }
        });
      }

      return options;
    }

    function renderAc(options) {
      if (options.length === 0) { ac.classList.remove('visible'); return; }

      acIndex = 0;
      ac.innerHTML = `
        <div class="mention-ac-header">Menções</div>
        ${options.map((o, i) => `
          <div class="mention-ac-item ${i === 0 ? 'selected' : ''}" data-key="${o.key}" data-index="${i}">
            <span class="mention-ac-icon">${o.icon}</span>
            <span class="mention-ac-label" style="${o.color ? `color:${o.color}` : ''}">${o.label}</span>
            <span class="mention-ac-desc">${o.desc}</span>
          </div>
        `).join('')}
      `;
      ac.classList.add('visible');

      ac.querySelectorAll('.mention-ac-item').forEach(item => {
        item.addEventListener('click', () => {
          insertMention(item.dataset.key);
          ac.classList.remove('visible');
        });
      });
    }

    function insertMention(key) {
      const val = input.value;
      const cursor = input.selectionStart;
      const before = val.substring(0, cursor);
      const atPos = before.lastIndexOf('@');
      const after = val.substring(cursor);
      input.value = before.substring(0, atPos) + key + ' ' + after;
      const newCursor = atPos + key.length + 1;
      input.selectionStart = input.selectionEnd = newCursor;
      input.focus();
    }

    input.addEventListener('input', () => {
      const val = input.value;
      const cursor = input.selectionStart;
      const before = val.substring(0, cursor);
      const atPos = before.lastIndexOf('@');

      if (atPos === -1 || (atPos > 0 && /\S/.test(before[atPos - 1]))) {
        ac.classList.remove('visible');
        return;
      }

      const query = before.substring(atPos + 1);
      if (query.includes(' ')) { ac.classList.remove('visible'); return; }

      const opts = getMentionOptions(query);
      renderAc(opts);
    });

    input.addEventListener('keydown', (e) => {
      if (!ac.classList.contains('visible')) return;
      const items = ac.querySelectorAll('.mention-ac-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        acIndex = Math.min(acIndex + 1, items.length - 1);
        items.forEach((it, i) => it.classList.toggle('selected', i === acIndex));
        items[acIndex]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        acIndex = Math.max(acIndex - 1, 0);
        items.forEach((it, i) => it.classList.toggle('selected', i === acIndex));
        items[acIndex]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        const sel = ac.querySelector('.mention-ac-item.selected');
        if (sel) {
          e.preventDefault();
          insertMention(sel.dataset.key);
          ac.classList.remove('visible');
        }
      } else if (e.key === 'Escape') {
        ac.classList.remove('visible');
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#mention-autocomplete') && e.target !== input) {
        ac.classList.remove('visible');
      }
    });

    console.log('✅ Sistema @todos: autocomplete carregado');
  }

  // ──────────────────────────────────────────
  // 3. RENDERIZAR MENÇÕES NAS MENSAGENS
  // ──────────────────────────────────────────
  window.processMessageMentions = function(text, msgElement) {
    if (!text || typeof text !== 'string') return text;

    const currentUser = localStorage.getItem('userNickname') || localStorage.getItem('username') || '';

    // Processar @todos
    let processed = text.replace(/@todos/g, `<span class="mention-todos" title="Menção a todos">@todos</span>`);

    // Processar @here
    processed = processed.replace(/@here/g, `<span class="mention-todos" title="Menção aos online" style="color:#00ff88;">@here</span>`);

    // Processar menções de cargos
    if (window.roles && window.roles.list) {
      window.roles.list.forEach(role => {
        const safeRoleName = role.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`@${safeRoleName}`, 'g');
        processed = processed.replace(re,
          `<span class="mention-role" style="color:${role.color || '#a8b4ff'}" title="Cargo ${role.name}">@${role.name}</span>`
        );
      });
    }

    // Marcar mensagem se o usuário atual foi mencionado
    if (msgElement && (text.includes('@todos') || text.includes('@here'))) {
      msgElement.classList.add('has-mention');
      showTodosPingBadge();
    }

    return processed;
  };

  // ──────────────────────────────────────────
  // 4. NOTIFICAÇÃO DE @todos
  // ──────────────────────────────────────────
  function showTodosPingBadge() {
    const existing = document.querySelector('.todos-ping-badge');
    if (existing) { existing.remove(); }

    const badge = document.createElement('div');
    badge.className = 'todos-ping-badge';
    badge.textContent = '📢 Você foi mencionado com @todos';
    document.body.appendChild(badge);

    badge.addEventListener('click', () => {
      badge.classList.add('fade-out');
      setTimeout(() => badge.remove(), 400);
    });

    setTimeout(() => {
      if (badge.parentElement) {
        badge.classList.add('fade-out');
        setTimeout(() => badge.remove(), 400);
      }
    }, 5000);
  }

  // ──────────────────────────────────────────
  // 5. PATCHEAR renderizarMensagem GLOBAL
  // ──────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    init();

    // Observar novas mensagens e processar menções
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          const msgText = node.classList?.contains('message') ? node : node.querySelector?.('.message');
          const targets = node.classList?.contains('message') ? [node] : (node.querySelectorAll ? [...node.querySelectorAll('.message')] : []);

          targets.forEach(msgEl => {
            const textEl = msgEl.querySelector('.msg-text');
            if (textEl && !textEl.dataset.mentionsProcessed) {
              textEl.dataset.mentionsProcessed = '1';
              const rawText = textEl.textContent;
              if (rawText.includes('@')) {
                textEl.innerHTML = window.processMessageMentions(textEl.innerHTML, msgEl);
              }
            }
          });
        });
      });
    });

    const messagesArea = document.getElementById('messages-area');
    if (messagesArea) {
      observer.observe(messagesArea, { childList: true, subtree: true });
    } else {
      setTimeout(() => {
        const area = document.getElementById('messages-area');
        if (area) observer.observe(area, { childList: true, subtree: true });
      }, 1000);
    }
  });

  console.log('✅ Sistema @todos carregado!');
})();
