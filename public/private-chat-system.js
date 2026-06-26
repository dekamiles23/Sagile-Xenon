/**
 * private-chat-system.js
 * ======================
 * Sistema completo de chat privado (DM) com botão de chamada WebRTC.
 *
 * CAUSA RAIZ CORRIGIDA:
 *   Este arquivo estava faltando no projeto. Sem ele:
 *   - Nenhuma UI de DM era criada
 *   - O cabeçalho da DM (com o botão de chamada) nunca era renderizado
 *   - document.querySelectorAll('[onclick*="call"]').length retornava 0
 *   - window.openDmChat não existia, impedindo abertura de qualquer DM
 *
 * INTEGRAÇÃO:
 *   - Usa window.startDmVoiceCall (dm-call-system.js) para iniciar chamadas
 *   - Usa window.socket para eventos Socket.IO
 *   - Expõe window.openDmChat / window.openPrivateChat / window.closeDmChat
 *   - Expõe window.currentDmUser e window.activePrivateChat
 *
 * EVENTOS SOCKET.IO USADOS:
 *   Emit:  dm:history, dm:message, dm:typing, dm:read
 *   On:    dm:history, dm:message, dm:message:sent, dm:typing
 */

(function () {
  'use strict';

  /* ─── CSS injetado uma única vez ──────────────────────────────────────── */
  function injectPrivateChatStyles() {
    if (document.getElementById('pcs-styles')) return;
    var style = document.createElement('style');
    style.id = 'pcs-styles';
    style.textContent = [
      /* Modal overlay */
      '#private-chat-modal{',
        'position:fixed;inset:0;z-index:9000;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);',
        'animation:pcsOverlayIn 0.2s ease-out;',
      '}',
      '#private-chat-modal.pcs-hidden{display:none!important;}',
      '@keyframes pcsOverlayIn{from{opacity:0;}to{opacity:1;}}',

      /* Panel */
      '.pcs-panel{',
        'position:relative;',
        'width:520px;max-width:96vw;',
        'height:600px;max-height:90vh;',
        'background:rgba(8,0,20,0.97);',
        'border:1px solid rgba(0,255,255,0.25);',
        'border-radius:16px;',
        'display:flex;flex-direction:column;overflow:hidden;',
        'box-shadow:0 0 60px rgba(0,255,255,0.12),0 24px 48px rgba(0,0,0,0.7);',
        'animation:pcsPanelIn 0.25s cubic-bezier(0.34,1.56,0.64,1);',
      '}',
      '@keyframes pcsPanelIn{from{opacity:0;transform:scale(0.94) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);}}',

      /* Header */
      '.pcs-header{',
        'display:flex;align-items:center;gap:12px;',
        'padding:14px 16px;',
        'background:rgba(0,0,0,0.4);',
        'border-bottom:1px solid rgba(0,255,255,0.15);',
        'flex-shrink:0;',
      '}',
      '.pcs-avatar{',
        'width:40px;height:40px;min-width:40px;border-radius:50%;',
        'background:linear-gradient(135deg,#8b00ff,#ff00ff);',
        'display:flex;align-items:center;justify-content:center;',
        'color:#fff;font-weight:700;font-size:18px;',
        'background-size:cover;background-position:center;',
        'border:2px solid rgba(0,255,255,0.4);',
        'flex-shrink:0;',
      '}',
      '.pcs-header-info{flex:1;min-width:0;}',
      '.pcs-header-name{',
        'color:#fff;font-weight:700;font-size:15px;',
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
      '}',
      '.pcs-header-status{color:#00ff88;font-size:12px;margin-top:2px;}',

      /* Header buttons */
      '.pcs-header-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;}',
      '.pcs-action-btn{',
        'width:36px;height:36px;border-radius:8px;border:none;',
        'background:rgba(255,255,255,0.06);',
        'color:#ccc;font-size:16px;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'transition:all 0.15s;flex-shrink:0;',
      '}',
      '.pcs-action-btn:hover{background:rgba(255,255,255,0.14);color:#fff;}',
      '.pcs-call-btn{',
        'background:rgba(0,255,136,0.1)!important;',
        'border:1px solid rgba(0,255,136,0.35)!important;',
        'color:#00ff88!important;',
        'font-size:18px!important;',
        'width:40px!important;height:40px!important;',
        'border-radius:10px!important;',
      '}',
      '.pcs-call-btn:hover{',
        'background:rgba(0,255,136,0.25)!important;',
        'box-shadow:0 0 12px rgba(0,255,136,0.3)!important;',
        'transform:scale(1.05);',
      '}',
      '.pcs-close-btn{',
        'background:rgba(237,66,69,0.1)!important;',
        'border:1px solid rgba(237,66,69,0.3)!important;',
        'color:#ed4245!important;',
      '}',
      '.pcs-close-btn:hover{background:rgba(237,66,69,0.25)!important;}',

      /* Messages */
      '#dm-messages-area{',
        'flex:1;overflow-y:auto;',
        'padding:12px 14px;',
        'display:flex;flex-direction:column;gap:4px;',
        'scroll-behavior:smooth;',
      '}',
      '#dm-messages-area::-webkit-scrollbar{width:4px;}',
      '#dm-messages-area::-webkit-scrollbar-track{background:transparent;}',
      '#dm-messages-area::-webkit-scrollbar-thumb{background:rgba(255,0,255,0.3);border-radius:4px;}',

      /* DM messages */
      '.dm-msg{',
        'display:flex;align-items:flex-start;gap:10px;',
        'padding:8px 10px;border-radius:10px;',
        'background:rgba(13,0,22,0.5);',
        'border:1px solid rgba(255,0,255,0.12);',
        'margin:2px 0;',
      '}',
      '.dm-msg:hover{background:rgba(255,0,255,0.06);border-color:rgba(255,0,255,0.25);}',
      '.dm-msg.dm-msg-own{',
        'flex-direction:row-reverse;',
        'background:rgba(0,255,136,0.05);',
        'border-color:rgba(0,255,136,0.15);',
      '}',
      '.dm-msg.dm-msg-own:hover{background:rgba(0,255,136,0.1);}',
      '.dm-msg-avatar{',
        'width:34px;height:34px;min-width:34px;border-radius:50%;',
        'background:linear-gradient(135deg,#8b00ff,#ff00ff);',
        'display:flex;align-items:center;justify-content:center;',
        'color:#fff;font-weight:700;font-size:14px;flex-shrink:0;',
        'background-size:cover;background-position:center;',
      '}',
      '.dm-msg-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}',
      '.dm-msg-own .dm-msg-body{align-items:flex-end;}',
      '.dm-msg-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
      '.dm-msg-own .dm-msg-meta{flex-direction:row-reverse;}',
      '.dm-msg-name{font-weight:700;font-size:13px;color:#00ffff;}',
      '.dm-msg-own .dm-msg-name{color:#00ff88;}',
      '.dm-msg-time{font-size:11px;color:#666;}',
      '.dm-msg-text{',
        'color:#eee;font-size:14px;line-height:1.55;',
        'white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;',
        'max-width:100%;',
      '}',

      /* System messages */
      '.dm-msg-system{',
        'text-align:center;color:#666;font-size:12px;',
        'padding:4px 0;margin:4px 0;',
      '}',

      /* Typing indicator */
      '#dm-typing-indicator{',
        'padding:4px 14px;font-size:12px;color:#888;',
        'height:20px;flex-shrink:0;',
        'font-style:italic;',
      '}',

      /* Input area */
      '.pcs-input-area{',
        'padding:10px 14px 12px;',
        'background:rgba(0,0,0,0.3);',
        'border-top:1px solid rgba(255,0,255,0.15);',
        'display:flex;flex-direction:column;gap:6px;flex-shrink:0;',
      '}',
      '.pcs-input-row{display:flex;align-items:flex-end;gap:8px;}',
      '#dm-message-input{',
        'flex:1;',
        'background:rgba(255,255,255,0.05);',
        'border:1px solid rgba(255,0,255,0.25);',
        'border-radius:10px;',
        'color:#fff;font-size:14px;',
        'padding:10px 14px;',
        'resize:none;outline:none;',
        'height:40px;max-height:150px;',
        'font-family:inherit;',
        'line-height:1.4;',
        'transition:border-color 0.15s;',
      '}',
      '#dm-message-input:focus{border-color:rgba(255,0,255,0.55);}',
      '#dm-message-input::placeholder{color:#555;}',
      '#dm-send-btn{',
        'width:40px;height:40px;border-radius:10px;border:none;',
        'background:rgba(0,255,136,0.15);',
        'border:1px solid rgba(0,255,136,0.35);',
        'color:#00ff88;font-size:18px;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'flex-shrink:0;transition:all 0.15s;',
      '}',
      '#dm-send-btn:hover{background:rgba(0,255,136,0.3);}',
      '#dm-send-btn:disabled{opacity:0.4;cursor:not-allowed;}',
      '.pcs-input-footer{display:flex;align-items:center;justify-content:flex-end;}',
      '#dm-char-counter{font-size:11px;color:#555;}',

      /* Empty state */
      '.dm-empty-state{',
        'flex:1;display:flex;flex-direction:column;',
        'align-items:center;justify-content:center;',
        'color:#555;gap:8px;',
      '}',
      '.dm-empty-state span{font-size:36px;}',
      '.dm-empty-state p{font-size:13px;text-align:center;margin:0;}'
    ].join('');
    document.head.appendChild(style);
  }

  /* ─── Escape HTML ─────────────────────────────────────────────────────── */
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ─── Formatar hora ───────────────────────────────────────────────────── */
  function formatTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var h = d.getHours().toString().padStart(2, '0');
    var m = d.getMinutes().toString().padStart(2, '0');
    return h + ':' + m;
  }

  /* ─── Meu username ────────────────────────────────────────────────────── */
  function myUsername() {
    return (
      window.username ||
      window.currentUsername ||
      localStorage.getItem('zx_username') ||
      localStorage.getItem('username') ||
      sessionStorage.getItem('username') ||
      'Eu'
    );
  }

  /* ─── Estado da conversa ──────────────────────────────────────────────── */
  var _currentDmUser = null;
  var _typingTimer = null;
  var _isTyping = false;
  var _historyLoaded = {};

  /* ─── Persistência local de histórico DM ─────────────────────────────── */
  function dmStorageKey(a, b) {
    return 'zx_dm_' + [a, b].map(function(x){ return (x||'').toLowerCase(); }).sort().join('_');
  }
  function loadLocalHistory(partner) {
    try { return JSON.parse(localStorage.getItem(dmStorageKey(myUsername(), partner)) || '[]'); } catch(e) { return []; }
  }
  function saveLocalHistory(partner, messages) {
    try { localStorage.setItem(dmStorageKey(myUsername(), partner), JSON.stringify(messages.slice(-200))); } catch(e) {}
  }
  function appendLocalHistory(partner, msg) {
    var msgs = loadLocalHistory(partner);
    // evita duplicatas por id
    if (msg.id && msgs.some(function(m){ return m.id === msg.id; })) return msgs;
    msgs.push(msg);
    saveLocalHistory(partner, msgs);
    return msgs;
  }

  /* ─── Criar modal (somente uma vez) ──────────────────────────────────── */
  function createModal() {
    if (document.getElementById('private-chat-modal')) return;
    injectPrivateChatStyles();

    var modal = document.createElement('div');
    modal.id = 'private-chat-modal';
    modal.className = 'pcs-hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = [
      '<div class="pcs-panel">',
        /* Header */
        '<div class="pcs-header">',
          '<div class="pcs-avatar pm-header-avatar" id="pcs-avatar-el"></div>',
          '<div class="pcs-header-info">',
            '<div class="pcs-header-name" id="pcs-username-el">—</div>',
            '<div class="pcs-header-status" id="pcs-status-el">● Online</div>',
          '</div>',
          '<div class="pcs-header-actions">',
            /* BOTÃO DE CHAMADA DE VOZ */
            '<button class="pcs-action-btn pcs-call-btn" id="pcs-call-btn" title="Chamada de voz">📞</button>',
            /* BOTÃO DE SALA PRIVADA DE TEXTO */
            '<button class="pcs-action-btn" id="pcs-room-btn" title="Sala privada" style="background:rgba(139,0,255,0.1);border:1px solid rgba(139,0,255,0.35);color:#c084fc;font-size:16px;width:40px;height:40px;border-radius:10px;">🏠</button>',
            '<button class="pcs-action-btn pcs-close-btn" id="pcs-close-btn" title="Fechar">✕</button>',
          '</div>',
        '</div>',
        /* Messages */
        '<div id="dm-messages-area">',
          '<div class="dm-empty-state" id="dm-empty-state">',
            '<span>💬</span>',
            '<p>Inicie uma conversa privada!</p>',
          '</div>',
        '</div>',
        /* Typing */
        '<div id="dm-typing-indicator"></div>',
        /* Input */
        '<div class="pcs-input-area">',
          '<div class="pcs-input-row">',
            '<textarea id="dm-message-input" placeholder="Mensagem privada..." rows="1" maxlength="4000"></textarea>',
            '<button id="dm-send-btn" title="Enviar">➤</button>',
          '</div>',
          '<div class="pcs-input-footer">',
            '<span id="dm-char-counter">0/4000</span>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);

    /* Fechar ao clicar no overlay fora do painel */
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeDmChat();
    });

    /* Botão fechar */
    document.getElementById('pcs-close-btn').addEventListener('click', closeDmChat);

    /* Botão sala privada de texto */
    document.getElementById('pcs-room-btn').addEventListener('click', function () {
      if (typeof window.openPrivateRoomsModal === 'function') {
        window.openPrivateRoomsModal();
      }
    });

    /* Botão de chamada de voz */
    document.getElementById('pcs-call-btn').addEventListener('click', function () {
      if (!_currentDmUser) return;
      if (typeof window.startDmVoiceCall === 'function') {
        window.startDmVoiceCall(_currentDmUser);
      } else {
        if (typeof showToast === 'function') showToast('⚠️ Sistema de voz ainda carregando...');
      }
    });

    /* Enviar mensagem */
    document.getElementById('dm-send-btn').addEventListener('click', sendMessage);
    document.getElementById('dm-message-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    /* Contador de caracteres e auto-height */
    document.getElementById('dm-message-input').addEventListener('input', function () {
      var len = this.value.length;
      var counter = document.getElementById('dm-char-counter');
      if (counter) {
        counter.textContent = len + '/4000';
        counter.style.color = len > 3800 ? '#ff4444' : '#555';
      }
      /* Auto height */
      this.style.height = '40px';
      this.style.height = Math.min(this.scrollHeight, 150) + 'px';

      /* Indicador de digitação */
      if (!_isTyping && _currentDmUser && window.socket && window.socket.connected) {
        _isTyping = true;
        window.socket.emit('dm:typing', { to: _currentDmUser });
      }
      clearTimeout(_typingTimer);
      _typingTimer = setTimeout(function () { _isTyping = false; }, 2500);
    });
  }

  /* ─── Abrir / focar modal ─────────────────────────────────────────────── */
  function openDmChat(username) {
    if (!username) return;
    createModal();

    var modal = document.getElementById('private-chat-modal');
    if (!modal) return;

    var prevUser = _currentDmUser;
    _currentDmUser = username;
    window.currentDmUser = username;
    window.activePrivateChat = username;

    /* Atualizar header */
    var nameEl = document.getElementById('pcs-username-el');
    var avatarEl = document.getElementById('pcs-avatar-el');
    var callBtn = document.getElementById('pcs-call-btn');

    if (nameEl) nameEl.textContent = username;

    /* Avatar: inicial ou imagem cacheada */
    if (avatarEl) {
      avatarEl.textContent = (username[0] || '?').toUpperCase();
      avatarEl.style.backgroundImage = '';
      avatarEl.classList.remove('has-image');
      var cachedAvatar = (window.userAvatarCache || {})[(username || '').toLowerCase()]
                      || (window.friendAvatarCache || {})[(username || '').toLowerCase()];
      if (cachedAvatar) {
        avatarEl.style.backgroundImage = 'url(' + cachedAvatar + ')';
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.classList.add('has-image');
        avatarEl.textContent = '';
      }
    }

    /* Atualizar data-attribute no call button para que outros patches o encontrem */
    if (callBtn) {
      callBtn.dataset.username = username;
    }

    /* Limpar mensagens se mudou de conversa */
    if (prevUser !== username) {
      clearMessages();
      _historyLoaded[username] = false;
    }

    /* Mostrar modal */
    modal.classList.remove('pcs-hidden');

    /* Focar no input */
    var input = document.getElementById('dm-message-input');
    if (input) setTimeout(function () { input.focus(); }, 80);

    /* Carregar histórico */
    if (!_historyLoaded[username]) {
      requestHistory(username);
    }

    /* Marcar como lidas */
    if (window.socket && window.socket.connected) {
      window.socket.emit('dm:read', { from: username });
    }

    console.log('[PCS] DM aberta, construindo...');
    console.log('[PCS] Barra criada');
    console.log('[PCS] Todos os eventos conectados');
  }

  /* ─── Fechar modal ────────────────────────────────────────────────────── */
  function closeDmChat() {
    var modal = document.getElementById('private-chat-modal');
    if (modal) modal.classList.add('pcs-hidden');
    window.currentDmUser = null;
    window.activePrivateChat = null;
    _currentDmUser = null;
  }

  /* ─── Limpar área de mensagens ────────────────────────────────────────── */
  function clearMessages() {
    var area = document.getElementById('dm-messages-area');
    if (!area) return;
    area.innerHTML = '<div class="dm-empty-state" id="dm-empty-state"><span>💬</span><p>Inicie uma conversa privada!</p></div>';
  }

  /* ─── Solicitar histórico ao servidor ────────────────────────────────── */
  function requestHistory(username) {
    _historyLoaded[username] = true;
    /* Carrega histórico local imediatamente */
    var local = loadLocalHistory(username);
    if (local.length > 0) renderDmHistory(local);
    /* Depois busca do servidor para mesclar */
    if (window.socket && window.socket.connected) {
      window.socket.emit('dm:history', { with: username });
    }
  }

  /* ─── Renderizar uma mensagem na área ────────────────────────────────── */
  function renderDmMessage(msg) {
    if (!msg) return;
    var area = document.getElementById('dm-messages-area');
    if (!area) return;

    /* Remover estado vazio */
    var empty = document.getElementById('dm-empty-state');
    if (empty) empty.remove();

    var me = myUsername();
    var isOwn = (msg.from || msg.username || '').toLowerCase() === me.toLowerCase();
    var sender = msg.from || msg.username || 'Alguém';
    var text = msg.text || msg.content || msg.message || '';
    var ts = msg.timestamp || msg.createdAt || msg.time || Date.now();
    var initial = (sender[0] || '?').toUpperCase();

    var avatarUrl = (window.userAvatarCache || {})[(sender || '').toLowerCase()]
                 || (window.friendAvatarCache || {})[(sender || '').toLowerCase()];

    var avatarStyle = avatarUrl
      ? 'background-image:url(' + avatarUrl + ');background-size:cover;background-position:center;'
      : '';
    var avatarContent = avatarUrl ? '' : initial;

    var div = document.createElement('div');
    div.className = 'dm-msg' + (isOwn ? ' dm-msg-own' : '');
    div.innerHTML = [
      '<div class="dm-msg-avatar msg-avatar" data-username="' + esc(sender) + '" style="' + avatarStyle + '">' + esc(avatarContent) + '</div>',
      '<div class="dm-msg-body">',
        '<div class="dm-msg-meta">',
          '<span class="dm-msg-name">' + esc(sender) + '</span>',
          '<span class="dm-msg-time">' + formatTime(ts) + '</span>',
        '</div>',
        '<div class="dm-msg-text">' + esc(text) + '</div>',
      '</div>'
    ].join('');

    area.appendChild(div);

    /* Auto-scroll se estava no final */
    var atBottom = area.scrollTop + area.clientHeight >= area.scrollHeight - 60;
    if (atBottom || isOwn) {
      requestAnimationFrame(function () {
        area.scrollTop = area.scrollHeight;
      });
    }
  }

  /* ─── Renderizar lote de mensagens (histórico) ───────────────────────── */
  function renderDmHistory(messages) {
    var area = document.getElementById('dm-messages-area');
    if (!area) return;
    area.innerHTML = '';
    if (!messages || messages.length === 0) {
      area.innerHTML = '<div class="dm-empty-state" id="dm-empty-state"><span>💬</span><p>Sem mensagens ainda. Diga olá!</p></div>';
      return;
    }
    messages.forEach(renderDmMessage);
    /* Scroll para o final */
    area.scrollTop = area.scrollHeight;
  }

  /* ─── Enviar mensagem ─────────────────────────────────────────────────── */
  function sendMessage() {
    var input = document.getElementById('dm-message-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text || !_currentDmUser) return;
    if (text.length > 4000) {
      if (typeof showToast === 'function') showToast('⚠️ Mensagem muito longa (máx 4000 caracteres)');
      return;
    }

    var msg = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2),
      from: myUsername(),
      to: _currentDmUser,
      text: text,
      timestamp: Date.now()
    };

    /* Renderiza imediatamente sem esperar servidor */
    renderDmMessage(msg);
    appendLocalHistory(_currentDmUser, msg);

    /* Envia ao servidor se conectado */
    if (window.socket && window.socket.connected) {
      window.socket.emit('dm:message', { from: msg.from, to: msg.to, text: msg.text, id: msg.id });
    }

    /* Limpar input */
    input.value = '';
    input.style.height = '40px';
    var counter = document.getElementById('dm-char-counter');
    if (counter) counter.textContent = '0/4000';
    _isTyping = false;
  }

  /* ─── Mostrar indicador de digitação ─────────────────────────────────── */
  var _typingHideTimer = null;
  function showTyping(fromUser) {
    if (fromUser !== _currentDmUser) return;
    var el = document.getElementById('dm-typing-indicator');
    if (!el) return;
    el.textContent = esc(fromUser) + ' está digitando...';
    clearTimeout(_typingHideTimer);
    _typingHideTimer = setTimeout(function () {
      el.textContent = '';
    }, 3000);
  }

  /* ─── Registrar listeners de socket ─────────────────────────────────── */
  function bindSocketEvents(socket) {
    if (socket._pcsEventsBound) return;
    socket._pcsEventsBound = true;

    /* Histórico de mensagens */
    socket.on('dm:history', function (data) {
      if (!data) return;
      var partner = data.with || '';
      if (partner.toLowerCase() !== (_currentDmUser || '').toLowerCase()) return;
      var serverMsgs = data.messages || [];
      /* Mescla com histórico local */
      var localMsgs = loadLocalHistory(partner);
      var seen = {};
      var merged = [];
      serverMsgs.concat(localMsgs).forEach(function(m) {
        var key = m.id || (m.from + m.timestamp);
        if (!seen[key]) { seen[key] = true; merged.push(m); }
      });
      merged.sort(function(a,b){ return (a.timestamp||0)-(b.timestamp||0); });
      saveLocalHistory(partner, merged);
      renderDmHistory(merged);
    });

    /* Nova mensagem recebida */
    socket.on('dm:message', function (msg) {
      if (!msg) return;
      var sender = (msg.from || msg.username || '').toLowerCase();
      var me = myUsername().toLowerCase();
      if (sender === me) return; /* já renderizamos localmente ao enviar */

      appendLocalHistory(sender, msg);

      if (_currentDmUser && sender === _currentDmUser.toLowerCase()) {
        renderDmMessage(msg);
        if (window.socket && window.socket.connected) {
          socket.emit('dm:read', { from: _currentDmUser });
        }
      } else {
        if (typeof showToast === 'function') {
          showToast('💬 ' + (msg.from || 'Alguém') + ': ' + (msg.text || '').substring(0, 60));
        }
      }
    });

    /* Confirmação do servidor — ignora se já renderizamos localmente */
    socket.on('dm:message:sent', function (msg) {
      if (!msg) return;
      appendLocalHistory(msg.to || _currentDmUser || '', msg);
    });

    /* Indicador de digitação */
    socket.on('dm:typing', function (data) {
      if (!data || !data.from) return;
      showTyping(data.from);
    });

    /* Re-bind em reconexão */
    socket.on('connect', function () {
      socket._pcsEventsBound = false;
      bindSocketEvents(socket);
      /* Se havia uma conversa aberta, recarregar histórico */
      if (_currentDmUser) {
        _historyLoaded[_currentDmUser] = false;
        requestHistory(_currentDmUser);
      }
    });
  }

  /* ─── Aguardar socket e inicializar ──────────────────────────────────── */
  function waitForSocketAndInit() {
    if (window.socket) {
      bindSocketEvents(window.socket);
    } else {
      var timer = setInterval(function () {
        if (window.socket) {
          clearInterval(timer);
          bindSocketEvents(window.socket);
        }
      }, 300);
      setTimeout(function () { clearInterval(timer); }, 20000);
    }
  }

  /* ─── Expor funções globais ───────────────────────────────────────────── */
  window.openDmChat = openDmChat;
  window.openPrivateChat = openDmChat;
  window.closeDmChat = closeDmChat;

  /* Expor para dm-message-unification.js */
  window.renderDmMessages = renderDmHistory;
  window.sendDmMessage = sendMessage;

  /* Referências de estado */
  Object.defineProperty(window, 'currentDmUser', {
    get: function () { return _currentDmUser; },
    set: function (v) { _currentDmUser = v; },
    configurable: true
  });

  /* ─── Init ao DOMContentLoaded ───────────────────────────────────────── */
  function init() {
    injectPrivateChatStyles();
    createModal();
    waitForSocketAndInit();

    /* Patch: botões "Mensagem" na lista de amigos chamam openDmChat */
    document.addEventListener('click', function (e) {
      /* Suporte a botões com data-dm-user ou data-username em contexto DM */
      var btn = e.target.closest('[data-dm-user]');
      if (btn && btn.dataset.dmUser) {
        openDmChat(btn.dataset.dmUser);
        return;
      }
      /* Suporte a links/botões com classe "btn-dm" */
      var dmBtn = e.target.closest('.btn-dm');
      if (dmBtn) {
        var uname = dmBtn.dataset.username || dmBtn.dataset.user || dmBtn.getAttribute('data-username');
        if (uname) openDmChat(uname);
      }
    });

    console.log('[PCS] private-chat-system.js carregado — botão de chamada ativo');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
