// ================================================
// SISTEMA DE PERFIL DE USUÁRIO + MENUS DE CONTEXTO
// Estilo Discord: popup de perfil ao clicar no nick
// Dropdown com clique direito em qualquer nick
// ================================================

(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // ESTADO GLOBAL
  // ──────────────────────────────────────────────
  window.isCurrentUserStaff = false;
  window.currentUserNick = null;
  window._ignoredUsers = window._ignoredUsers || [];
  window._blockedUsers = window._blockedUsers || [];
  window._punishedUsers = window._punishedUsers || {}; // nick -> { until: timestamp }

  // ──────────────────────────────────────────────
  // ESTILOS INJETADOS
  // ──────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* ── Popup de Perfil ── */
    #zx-profile-popup {
      position: fixed;
      z-index: 99999;
      width: 300px;
      background: linear-gradient(180deg, #1a0a2e 0%, #12121a 60%);
      border: 1px solid rgba(255,0,255,0.4);
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.8), 0 0 30px rgba(255,0,255,0.15);
      overflow: hidden;
      animation: popupIn 0.18s cubic-bezier(.34,1.56,.64,1);
      display: none;
    }
    #zx-profile-popup.active { display: block; }
    @keyframes popupIn {
      from { opacity:0; transform: scale(0.88) translateY(8px); }
      to   { opacity:1; transform: scale(1) translateY(0); }
    }
    .zxp-banner {
      height: 72px;
      background: linear-gradient(135deg, #ff00ff33, #00ffff22, #7700ff33);
      position: relative;
    }
    .zxp-avatar-wrap {
      position: absolute;
      bottom: -28px;
      left: 16px;
    }
    .zxp-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 3px solid #12121a;
      background: linear-gradient(135deg, #ff00ff, #00ffff);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
      color: #fff;
      box-shadow: 0 0 16px rgba(255,0,255,0.5);
      overflow: hidden;
    }
    .zxp-avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
    .zxp-status-dot {
      width: 14px; height: 14px;
      border-radius: 50%;
      border: 2px solid #12121a;
      position: absolute;
      bottom: 2px; right: 2px;
      background: #00ff88;
    }
    .zxp-status-dot.idle { background: #ffd700; }
    .zxp-status-dot.dnd  { background: #ff4444; }
    .zxp-status-dot.offline { background: #555; }
    .zxp-body {
      padding: 36px 16px 16px;
    }
    .zxp-name {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 2px;
    }
    .zxp-handle {
      font-size: 12px;
      color: #888;
      margin-bottom: 8px;
    }
    .zxp-roles {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 10px;
      min-height: 4px;
    }
    .zxp-role-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid;
    }
    .zxp-bio {
      font-size: 12px;
      color: #aaa;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      min-height: 24px;
      line-height: 1.5;
    }
    .zxp-section-title {
      font-size: 11px;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: .05em;
      margin: 10px 0 6px;
    }
    .zxp-shorts-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 5px;
      margin-bottom: 8px;
    }
    .zxp-short-thumb {
      aspect-ratio: 9/16;
      border-radius: 6px;
      overflow: hidden;
      background: #1a1a2e;
      border: 1px solid rgba(255,0,255,0.15);
      cursor: pointer;
      transition: transform .15s;
    }
    .zxp-short-thumb:hover { transform: scale(1.04); }
    .zxp-short-thumb img,
    .zxp-short-thumb video {
      width: 100%; height: 100%; object-fit: cover; display: block;
    }
    .zxp-short-thumb-empty {
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; height: 100%;
    }
    .zxp-servers-list {
      display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px;
    }
    .zxp-server-tag {
      background: rgba(255,0,255,0.08);
      border: 1px solid rgba(255,0,255,0.2);
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 11px;
      color: #ddd;
    }
    .zxp-profile-loading {
      text-align: center; color: #555; font-size: 11px; padding: 6px 0;
    }
    .zxp-actions {
      display: flex;
      gap: 6px;
    }
    .zxp-btn {
      flex: 1;
      padding: 7px 6px;
      border-radius: 8px;
      border: 1px solid rgba(255,0,255,0.3);
      background: rgba(255,0,255,0.1);
      color: #fff;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: center;
    }
    .zxp-btn:hover {
      background: rgba(255,0,255,0.25);
      border-color: rgba(255,0,255,0.6);
      transform: translateY(-1px);
    }
    .zxp-btn.primary {
      background: rgba(0,255,255,0.1);
      border-color: rgba(0,255,255,0.3);
    }
    .zxp-btn.primary:hover {
      background: rgba(0,255,255,0.2);
      border-color: rgba(0,255,255,0.6);
    }
    .zxp-divider {
      height: 1px;
      background: rgba(255,0,255,0.15);
      margin: 10px -16px;
    }
    .zxp-staff-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(255,0,255,0.12);
      border: 1px solid rgba(255,0,255,0.35);
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 11px;
      color: #ff00ff;
      margin-bottom: 6px;
    }

    /* ── Menu de Contexto Universal ── */
    .zx-ctx-menu {
      position: fixed;
      z-index: 99998;
      min-width: 220px;
      background: #12121a;
      border: 1px solid rgba(255,0,255,0.4);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 20px rgba(255,0,255,0.2);
      overflow: hidden;
      animation: popupIn 0.15s ease-out;
      padding: 4px 0;
    }
    .zx-ctx-item {
      padding: 10px 16px;
      cursor: pointer;
      font-size: 13.5px;
      color: #e0e0e0;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.12s;
      user-select: none;
    }
    .zx-ctx-item:hover { background: rgba(255,0,255,0.15); }
    .zx-ctx-item.danger { color: #ff6b6b; }
    .zx-ctx-item.danger:hover { background: rgba(255,107,107,0.15); }
    .zx-ctx-item.staff-only { color: #ffa0a0; }
    .zx-ctx-item.staff-only:hover { background: rgba(255,80,80,0.18); }
    .zx-ctx-divider {
      height: 1px;
      background: rgba(255,0,255,0.18);
      margin: 3px 0;
    }
    .zx-ctx-header {
      padding: 6px 16px 4px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #666;
      user-select: none;
    }
    .zx-ctx-item.disabled {
      color: #555;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ── Nick clicável no chat ── */
    .msg-username {
      cursor: pointer;
    }
    .msg-username:hover {
      text-decoration: underline;
      opacity: 0.85;
    }

    /* ── Castigo visual no chat ── */
    .punished-badge {
      display: inline-block;
      background: rgba(255,100,0,0.2);
      border: 1px solid rgba(255,100,0,0.4);
      color: #ff8800;
      border-radius: 4px;
      font-size: 10px;
      padding: 1px 5px;
      margin-left: 5px;
      vertical-align: middle;
    }

    /* ── Server dropdown extras ── */
    #dd-leave-server {
      color: #ff6b6b !important;
    }
    #dd-leave-server:hover {
      background: rgba(255, 107, 107, 0.15) !important;
    }
    .dropdown-item.staff-item {
      border-left: 2px solid rgba(255,0,255,0.4);
    }
  `;
  document.head.appendChild(style);

  // ──────────────────────────────────────────────
  // RECEBE ROLE DO SERVIDOR
  // ──────────────────────────────────────────────
  function setupSocketRoleListener() {
    const trySocket = setInterval(() => {
      const sock = window.socket || window.io_socket;
      if (!sock) return;
      clearInterval(trySocket);

      sock.on('user:role', function (data) {
        window.isCurrentUserStaff = !!(data && data.isStaff);
        updateDropdownVisibility();
      });

      // Detecta nick atual
      sock.on('connect', function () {
        const nick = localStorage.getItem('userNickname')
          || localStorage.getItem('currentUserNickname')
          || localStorage.getItem('username');
        window.currentUserNick = nick;
      });

      // Castigo: ao receber punição, impede envio de mensagens
      sock.on('member:punished', function (data) {
        if (data.target === window.currentUserNick) {
          window._punishedUsers[data.target] = { until: Date.now() + (data.minutes || 5) * 60000 };
          showToast('⏱ Você foi castigado por ' + (data.minutes || 5) + ' minutos e não pode enviar mensagens.');
          const inp = document.getElementById('message-input');
          if (inp) {
            inp.disabled = true;
            inp.placeholder = '⛔ Você está em castigo...';
          }
          setTimeout(function () {
            if (inp) { inp.disabled = false; inp.placeholder = 'Escreva uma mensagem...'; }
            delete window._punishedUsers[data.target];
            showToast('✅ Seu castigo terminou. Você pode voltar a falar!');
          }, (data.minutes || 5) * 60000);
        }
      });

      // Banimento: desconectar e informar
      sock.on('member:banned', function (data) {
        if (data.target === window.currentUserNick) {
          alert('🚫 Você foi banido deste servidor.\nMotivo: ' + (data.reason || 'sem motivo informado'));
          window.location.reload();
        }
      });

      // Expulsão
      sock.on('member:kicked', function (data) {
        if (data.target === window.currentUserNick) {
          alert('🚪 Você foi expulso deste servidor.');
          window.location.reload();
        }
      });
    }, 200);
  }

  // ──────────────────────────────────────────────
  // VISIBILIDADE DO DROPDOWN DO SERVIDOR
  // ──────────────────────────────────────────────
  function updateDropdownVisibility() {
    const staffItems = document.querySelectorAll('.staff-item');
    staffItems.forEach(function (el) {
      el.style.display = window.isCurrentUserStaff ? '' : 'none';
    });
  }

  function setupServerDropdown() {
    const dropdown = document.getElementById('server-dropdown');
    if (!dropdown) return;

    // Marcar os itens que são só para staff
    ['dd-configure', 'dd-create-channel', 'dd-create-category', 'dd-create-event'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.classList.add('staff-item');
    });

    // Adicionar "Sair do servidor" se ainda não existe
    if (!document.getElementById('dd-leave-server')) {
      const divider = document.createElement('div');
      divider.className = 'dropdown-divider';

      const leaveBtn = document.createElement('button');
      leaveBtn.className = 'dropdown-item';
      leaveBtn.id = 'dd-leave-server';
      leaveBtn.textContent = '🚪 Sair do servidor';
      leaveBtn.addEventListener('click', function () {
        dropdown.classList.add('hidden');
        const serverName = document.getElementById('sidebar-server-name')?.textContent || 'este servidor';
        if (confirm('Tem certeza que deseja sair de "' + serverName + '"?\nVocê precisará de um convite para voltar.')) {
          const sock = window.socket || window.io_socket;
          if (sock) sock.emit('server:leave', { serverId: window.currentServerId });

          // Remove visualmente
          const serverSidebar = document.getElementById('server-sidebar');
          if (serverSidebar) serverSidebar.classList.add('hidden');

          if (typeof showLayout === 'function') showLayout('discover-view');
          else if (typeof window.showLayout === 'function') window.showLayout('discover-view');

          if (typeof showToast === 'function') showToast('🚪 Você saiu do servidor');
        }
      });

      dropdown.appendChild(divider);
      dropdown.appendChild(leaveBtn);
    }

    updateDropdownVisibility();
  }

  // ──────────────────────────────────────────────
  // PROFILE POPUP (estilo Discord)
  // ──────────────────────────────────────────────
  let profilePopupEl = null;
  let profilePopupTimeout = null;

  function getPopupEl() {
    if (!profilePopupEl) {
      profilePopupEl = document.createElement('div');
      profilePopupEl.id = 'zx-profile-popup';
      document.body.appendChild(profilePopupEl);

      // Fecha ao clicar fora
      document.addEventListener('click', function (e) {
        if (profilePopupEl && !profilePopupEl.contains(e.target)) {
          hideProfilePopup();
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') hideProfilePopup();
      });
    }
    return profilePopupEl;
  }

  function getUserRoles(username) {
    const userRoles = [];
    if (window.roles && window.roles.list) {
      window.roles.list.forEach(function (role) {
        if (role.members && role.members.includes(username)) {
          userRoles.push(role);
        }
      });
    }
    return userRoles;
  }

  function isUserStaff(username) {
    const adminRole = window.roles && window.roles.list &&
      window.roles.list.find(r => r.id === 'role_admin');
    if (adminRole && adminRole.members && adminRole.members.includes(username)) return true;
    if (window._staffList && window._staffList.includes(username)) return true;
    return false;
  }

  function showProfilePopup(username, anchorEl) {
    if (!username || username === window.currentUserNick) return;

    const popup = getPopupEl();
    const userRoles = getUserRoles(username);
    const topRole = userRoles[0] || null;
    const avatarColor = topRole ? topRole.color : '#ff00ff';
    const initial = username.charAt(0).toUpperCase();
    const isStaff = isUserStaff(username);

    const rolesHtml = userRoles.map(function (r) {
      return '<span class="zxp-role-badge" style="background:' + r.color + '22;color:' + r.color + ';border-color:' + r.color + '55;">' +
        (r.icon ? r.icon + ' ' : '') + r.name + '</span>';
    }).join('');

    popup.innerHTML =
      '<div class="zxp-banner" style="background:linear-gradient(135deg,' + avatarColor + '44,#12121a)">' +
        '<div class="zxp-avatar-wrap">' +
          '<div class="zxp-avatar" style="background:linear-gradient(135deg,' + avatarColor + ',#12121a)">' +
            initial +
            '<div class="zxp-status-dot"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="zxp-body">' +
        (isStaff ? '<div class="zxp-staff-badge">🛡️ Staff</div>' : '') +
        '<div class="zxp-name">' + escHtml(username) + '</div>' +
        '<div class="zxp-handle">@' + escHtml(username) + '</div>' +
        (rolesHtml ? '<div class="zxp-roles">' + rolesHtml + '</div>' : '') +
        '<div class="zxp-bio">Sem biografia definida.</div>' +
        '<div id="zxp-profile-extras" class="zxp-profile-loading">Carregando...</div>' +
        '<div class="zxp-divider"></div>' +
        '<div class="zxp-actions">' +
          '<button class="zxp-btn primary" data-action="dm">💬 Mensagem</button>' +
          '<button class="zxp-btn" data-action="friend">➕ Amigo</button>' +
          '<button class="zxp-btn" data-action="mention">@ Mencionar</button>' +
        '</div>' +
      '</div>';

    // Botões do popup
    popup.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'dm') openDM(username);
        else if (action === 'friend') addFriend(username);
        else if (action === 'mention') mentionUser(username);
        hideProfilePopup();
      });
    });

    // Posicionamento inteligente
    positionElement(popup, anchorEl);
    popup.classList.add('active');

    // Registrar visualização no log de amigos
    if (window._friendsLog) window._friendsLog.logProfileView(username);

    // Carregar shorts e servidores em comum de forma assíncrona
    fetch('/user/' + encodeURIComponent(username) + '/profile')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var extrasEl = document.getElementById('zxp-profile-extras');
        if (!extrasEl || !profilePopupEl || !profilePopupEl.classList.contains('active')) return;

        var html = '';

        // Shorts / Reels do usuário
        var userShorts = data.shorts || [];
        if (userShorts.length > 0) {
          html += '<div class="zxp-section-title">🎬 Shorts (' + userShorts.length + ')</div>';
          html += '<div class="zxp-shorts-row">';
          userShorts.slice(0, 6).forEach(function(s) {
            var isImg = (s.fileType || '').startsWith('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(s.fileUrl || '');
            html += '<div class="zxp-short-thumb" title="' + escHtml(s.title || 'Short') + '">';
            if (isImg) {
              html += '<img src="' + escHtml(s.fileUrl) + '" loading="lazy">';
            } else {
              html += '<video src="' + escHtml(s.fileUrl) + '" muted playsinline preload="metadata"></video>';
            }
            html += '</div>';
          });
          html += '</div>';
        }

        // Servidores em comum
        var theirServers  = data.servers || [];
        var myServers = [];
        try {
          myServers = JSON.parse(localStorage.getItem('zx_servers') || '[]')
            .filter(function(s) { return !String(s.id || '').startsWith('comm_'); });
        } catch(e) {}
        var mutual = myServers.filter(function(ms) {
          return theirServers.some(function(ts) { return ts.id === ms.id; });
        });
        if (mutual.length > 0) {
          html += '<div class="zxp-section-title">🌐 Servidores em comum (' + mutual.length + ')</div>';
          html += '<div class="zxp-servers-list">';
          mutual.forEach(function(s) {
            html += '<div class="zxp-server-tag">' + escHtml(s.name || s.id) + '</div>';
          });
          html += '</div>';
        }

        extrasEl.className = '';
        extrasEl.innerHTML = html || '';
      })
      .catch(function() {
        var extrasEl = document.getElementById('zxp-profile-extras');
        if (extrasEl) { extrasEl.className = ''; extrasEl.innerHTML = ''; }
      });
  }

  function hideProfilePopup() {
    if (profilePopupEl) {
      profilePopupEl.classList.remove('active');
    }
  }

  function positionElement(el, anchor) {
    el.style.display = 'block';
    const rect = anchor ? anchor.getBoundingClientRect() : { left: 100, bottom: 100, right: 100, top: 100 };
    const elW = el.offsetWidth || 300;
    const elH = el.offsetHeight || 350;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.right + 12;
    let top = rect.top;

    if (left + elW > vw - 8) left = rect.left - elW - 12;
    if (left < 8) left = 8;
    if (top + elH > vh - 8) top = vh - elH - 8;
    if (top < 8) top = 8;

    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.display = '';
  }

  // ──────────────────────────────────────────────
  // MENU DE CONTEXTO UNIVERSAL
  // ──────────────────────────────────────────────
  let currentCtxMenu = null;

  function closeAllMenus() {
    if (currentCtxMenu) { currentCtxMenu.remove(); currentCtxMenu = null; }
    document.querySelectorAll('.zx-ctx-menu').forEach(function (m) { m.remove(); });
    hideProfilePopup();
  }

  function buildContextMenu(username, x, y) {
    closeAllMenus();

    const menu = document.createElement('div');
    menu.className = 'zx-ctx-menu';
    currentCtxMenu = menu;

    const isSelf = username === window.currentUserNick;
    const targetIsStaff = isUserStaff(username);
    const canModerate = window.isCurrentUserStaff && !isSelf && !targetIsStaff;

    const items = [
      { label: '👤 Perfil', action: 'profile' },
      { label: '@ Mencionar', action: 'mention' },
      { label: '💬 Mensagem privada', action: 'dm' },
      { label: '➕ Adicionar amigo', action: 'friend' },
      { divider: true },
      { label: '✏️ Alterar apelido', action: 'nickname' },
      { label: '🙈 Ignorar', action: 'ignore' },
      { label: '⛔ Bloquear', action: 'block' },
      { label: '🏷 Cargos', action: 'roles' },
      { label: '🔗 Copiar ID de membro', action: 'copyid' },
    ];

    if (canModerate) {
      items.push({ divider: true });
      items.push({ label: '⏱ Castigar membro', action: 'punish', cls: 'staff-only' });
      items.push({ label: '🚪 Expulsar membro', action: 'kick', cls: 'staff-only' });
      items.push({ label: '🚫 Banir membro', action: 'ban', cls: 'danger staff-only' });
    }

    items.forEach(function (item) {
      if (item.divider) {
        const d = document.createElement('div');
        d.className = 'zx-ctx-divider';
        menu.appendChild(d);
        return;
      }
      const el = document.createElement('div');
      el.className = 'zx-ctx-item ' + (item.cls || '');
      el.textContent = item.label;
      el.addEventListener('click', function () {
        menu.remove();
        currentCtxMenu = null;
        handleContextAction(item.action, username);
      });
      menu.appendChild(el);
    });

    // Posicionar
    document.body.appendChild(menu);
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    let px = x, py = y;
    if (px + mw > window.innerWidth - 8) px = window.innerWidth - mw - 8;
    if (py + mh > window.innerHeight - 8) py = window.innerHeight - mh - 8;
    menu.style.left = px + 'px';
    menu.style.top = py + 'px';

    // Fecha ao clicar fora
    setTimeout(function () {
      document.addEventListener('click', function closer(e) {
        if (!menu.contains(e.target)) { menu.remove(); currentCtxMenu = null; document.removeEventListener('click', closer); }
      });
    }, 10);
  }

  function handleContextAction(action, username) {
    const sock = window.socket || window.io_socket;

    switch (action) {
      case 'profile':
        // Abre popup de perfil no centro da tela
        const anchor = document.body;
        showProfilePopup(username, null);
        if (profilePopupEl) {
          profilePopupEl.style.left = '50%';
          profilePopupEl.style.top = '50%';
          profilePopupEl.style.transform = 'translate(-50%, -50%)';
        }
        break;

      case 'mention':
        mentionUser(username);
        break;

      case 'dm':
        openDM(username);
        break;

      case 'friend':
        addFriend(username);
        break;

      case 'nickname':
        const newNick = prompt('Novo apelido para ' + username + ':');
        if (newNick && newNick.trim()) {
          if (sock) sock.emit('member:set-nickname', { target: username, nickname: newNick.trim() });
          if (typeof showToast === 'function') showToast('✅ Apelido alterado para ' + newNick.trim());
        }
        break;

      case 'ignore':
        if (!window._ignoredUsers.includes(username)) {
          window._ignoredUsers.push(username);
          try { localStorage.setItem('zx_ignored', JSON.stringify(window._ignoredUsers)); } catch(e){}
          if (typeof showToast === 'function') showToast('🙈 ' + username + ' está sendo ignorado');
        } else {
          window._ignoredUsers = window._ignoredUsers.filter(function (u) { return u !== username; });
          try { localStorage.setItem('zx_ignored', JSON.stringify(window._ignoredUsers)); } catch(e){}
          if (typeof showToast === 'function') showToast('✅ ' + username + ' deixou de ser ignorado');
        }
        break;

      case 'block':
        if (confirm('Bloquear ' + username + '?\nEle não poderá te enviar mensagens privadas.')) {
          if (!window._blockedUsers.includes(username)) window._blockedUsers.push(username);
          try { localStorage.setItem('zx_blocked', JSON.stringify(window._blockedUsers)); } catch(e){}
          if (typeof showToast === 'function') showToast('⛔ ' + username + ' foi bloqueado');
        }
        break;

      case 'roles':
        // Abre modal de config de servidor na aba de cargos
        const cfgEl = document.getElementById('dd-configure');
        if (cfgEl) cfgEl.click();
        setTimeout(function () {
          const rolesTab = document.querySelector('[data-stab="cargos"]') ||
            document.querySelector('.settings-tab[data-tab="roles"]');
          if (rolesTab) rolesTab.click();
        }, 300);
        if (typeof showToast === 'function') showToast('🏷 Cargos de ' + username);
        break;

      case 'copyid':
        const id = username + '#' + (Math.abs(hashStr(username)) % 9000 + 1000);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(id).then(function () {
            if (typeof showToast === 'function') showToast('✅ ID copiado: ' + id);
          }).catch(function () {
            prompt('Copie o ID:', id);
          });
        } else {
          prompt('Copie o ID:', id);
        }
        break;

      case 'punish':
        const minutes = prompt('Quantos minutos de castigo para ' + username + '?\n(O membro ficará sem poder falar)', '10');
        if (minutes && !isNaN(minutes) && parseInt(minutes) > 0) {
          if (sock) sock.emit('member:punish', { target: username, minutes: parseInt(minutes) });
          if (typeof showToast === 'function') showToast('⏱ ' + username + ' castigado por ' + minutes + ' minutos');
        }
        break;

      case 'kick':
        if (confirm('Expulsar ' + username + ' do servidor?\n\nEle poderá entrar novamente com um convite.')) {
          if (sock) sock.emit('member:kick', { target: username });
          if (typeof showToast === 'function') showToast('🚪 ' + username + ' foi expulso do servidor');
        }
        break;

      case 'ban':
        const reason = prompt('Motivo do ban de ' + username + ' (opcional):');
        if (reason !== null) {
          if (confirm('BANIR PERMANENTEMENTE ' + username + '?\n\nEsta ação não pode ser desfeita facilmente.')) {
            if (sock) sock.emit('member:ban', { target: username, reason: reason || 'sem motivo informado' });
            if (typeof showToast === 'function') showToast('🚫 ' + username + ' foi BANIDO do servidor');
          }
        }
        break;
    }
  }

  // ──────────────────────────────────────────────
  // AÇÕES AUXILIARES
  // ──────────────────────────────────────────────
  function mentionUser(username) {
    const input = document.getElementById('message-input');
    if (input) {
      input.value += '@' + username + ' ';
      input.focus();
      if (typeof showToast === 'function') showToast('@ ' + username + ' mencionado');
    }
  }

  function openDM(username) {
    // Tenta usar o sistema de DM existente
    if (typeof window.openPrivateChat === 'function') {
      window.openPrivateChat(username);
    } else {
      const dmBtn = document.getElementById('btn-dm-list');
      if (dmBtn) dmBtn.click();
      if (typeof showToast === 'function') showToast('💬 Abrindo DM com ' + username);
    }
  }

  function addFriend(username) {
    // CORREÇÃO BUG #1: delegar para sendFriendRequest() global que atualiza sentRequests,
    // verifica duplicatas e aguarda confirmação do servidor antes de mostrar toast
    if (typeof window.sendFriendRequest === 'function') {
      window.sendFriendRequest(username);
    } else {
      // Fallback se a função global ainda não estiver disponível
      const sock = window.socket || window.io_socket;
      if (sock) {
        sock.emit('friend:request', { to: username });
        if (typeof showToast === 'function') showToast('➕ Pedido de amizade enviado para ' + username);
      }
    }
  }

  function hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h;
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ──────────────────────────────────────────────
  // DELEGAR CLICK/CONTEXTMENU EM MSG-USERNAME
  // ──────────────────────────────────────────────
  function attachChatEvents() {
    const messagesArea = document.getElementById('messages-area');
    if (!messagesArea) return;

    // Click no nick → abre profile popup
    messagesArea.addEventListener('click', function (e) {
      const nick = e.target.closest('.msg-username');
      if (!nick) return;
      e.stopPropagation();
      const username = nick.textContent.trim();
      if (!username || username === window.currentUserNick) return;
      showProfilePopup(username, nick);
    });

    // Clique direito no nick → menu de contexto
    messagesArea.addEventListener('contextmenu', function (e) {
      const nick = e.target.closest('.msg-username');
      if (!nick) return;
      e.preventDefault();
      e.stopPropagation();
      const username = nick.textContent.trim();
      if (!username) return;
      buildContextMenu(username, e.clientX, e.clientY);
    });
  }

  // ──────────────────────────────────────────────
  // DELEGAR CLICK/CONTEXTMENU NA SIDEBAR ONLINE
  // ──────────────────────────────────────────────
  function attachSidebarEvents() {
    const sidebar = document.getElementById('online-users-list');
    if (!sidebar) return;

    sidebar.addEventListener('click', function (e) {
      const item = e.target.closest('.user-item');
      if (!item) return;

      const nameEl = item.querySelector('.user-name');
      if (!nameEl) return;

      const username = nameEl.childNodes[0]
        ? nameEl.childNodes[0].textContent.trim()
        : nameEl.textContent.trim();

      if (!username || username === window.currentUserNick) return;
      showProfilePopup(username, nameEl);
    });

    sidebar.addEventListener('contextmenu', function (e) {
      const item = e.target.closest('.user-item');
      if (!item) return;
      e.preventDefault();

      const nameEl = item.querySelector('.user-name');
      if (!nameEl) return;

      const username = nameEl.childNodes[0]
        ? nameEl.childNodes[0].textContent.trim()
        : nameEl.textContent.trim();

      if (!username) return;
      buildContextMenu(username, e.clientX, e.clientY);
    });
  }

  // ──────────────────────────────────────────────
  // INICIALIZAÇÃO
  // ──────────────────────────────────────────────
  function init() {
    // Detectar nick atual
    window.currentUserNick = localStorage.getItem('userNickname')
      || localStorage.getItem('currentUserNickname')
      || localStorage.getItem('username')
      || window.currentUsername
      || null;

    // Carregar listas persistidas
    try {
      const ig = localStorage.getItem('zx_ignored');
      if (ig) window._ignoredUsers = JSON.parse(ig);
      const bl = localStorage.getItem('zx_blocked');
      if (bl) window._blockedUsers = JSON.parse(bl);
    } catch (e) {}

    setupSocketRoleListener();
    setupServerDropdown();
    attachChatEvents();
    attachSidebarEvents();

    // Observar novos elementos no messages-area (mensagens dinâmicas)
    const observer = new MutationObserver(function () {
      // eventos são delegados, não precisa reattach
    });
    const area = document.getElementById('messages-area');
    if (area) observer.observe(area, { childList: true });

    // Atualiza nick quando login muda
    const checkNick = setInterval(function () {
      const nick = localStorage.getItem('userNickname')
        || localStorage.getItem('currentUserNickname')
        || localStorage.getItem('username')
        || window.currentUsername;
      if (nick && nick !== 'Usuário') {
        window.currentUserNick = nick;
        clearInterval(checkNick);
      }
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

  // Exporta funções úteis globalmente
  window.showUserProfile = showProfilePopup;
  window.showUserContextMenu = buildContextMenu;
  window.closeAllContextMenus = closeAllMenus;

}());

function openDM(username) {

    // Atualiza avatar do topo da DM
    const avatarEl = document.querySelector('.dm-header .user-avatar, .dm-header .avatar, .dm-user-avatar');

    if (avatarEl) {
        const avatarUrl =
            window.userAvatars?.[username] ||
            window.profileAvatarUrl?.[username] ||
            '';

        if (avatarUrl) {
            avatarEl.innerHTML = '';
            avatarEl.style.backgroundImage = `url("${avatarUrl}")`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.style.backgroundRepeat = 'no-repeat';
        } else {
            avatarEl.style.backgroundImage = 'none';
            avatarEl.textContent = username?.charAt(0)?.toUpperCase() || '?';
        }
    }

    // Código original
    if (typeof window.openPrivateChat === 'function') {
        window.openPrivateChat(username);
    } else {
        const dmBtn = document.getElementById('btn-dm-list');
        if (dmBtn) dmBtn.click();
        if (typeof showToast === 'function') {
            showToast('💬 Abrindo DM com ' + username);
        }
    }
}