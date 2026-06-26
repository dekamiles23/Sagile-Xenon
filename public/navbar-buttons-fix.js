// ================================================
// CORREÇÃO DOS BOTÕES DA BARRA SUPERIOR DIREITA
// ================================================
(function () {
  'use strict';

  // ── Armazenamento de notificações em memória ──
  window._megaNotifications = window._megaNotifications || [];

  function updateBadge() {
    var unread = window._megaNotifications.filter(function (n) { return !n.read; }).length;
    var badge = document.getElementById('notification-badge');
    if (!badge) return;
    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : unread;
      badge.classList.remove('hidden');
      badge.style.display = 'flex';
    } else {
      badge.textContent = '0';
      badge.classList.add('hidden');
      badge.style.display = '';
    }
  }

  function addNotification(notif) {
    // Evitar duplicatas
    var exists = window._megaNotifications.some(function (n) { return n.id === notif.id; });
    if (!exists) {
      window._megaNotifications.unshift(notif);
    }
    updateBadge();
  }

  function renderNotifDropdown() {
    var existing = document.getElementById('notif-dropdown-fix');
    if (existing) { existing.remove(); return; }
    var btn  = document.getElementById('btn-notifications');
    if (!btn) return;
    var rect = btn.getBoundingClientRect();
    var dropdown = document.createElement('div');
    dropdown.id = 'notif-dropdown-fix';
    dropdown.style.cssText = [
      'position:fixed',
      'top:' + (rect.bottom + 8) + 'px',
      'right:' + (window.innerWidth - rect.right) + 'px',
      'min-width:320px',
      'max-width:380px',
      'max-height:420px',
      'overflow-y:auto',
      'background:#12121a',
      'border:1px solid rgba(255,0,255,0.3)',
      'border-radius:12px',
      'padding:16px',
      'z-index:999999',
      'box-shadow:0 0 25px rgba(255,0,255,0.2)'
    ].join(';');

    var notifs = window._megaNotifications;
    var markAllBtn = notifs.length > 0 ? '<button id="notif-mark-all" style="background:none;border:none;color:#a78bfa;cursor:pointer;font-size:11px;padding:0">Marcar todas como lidas</button>' : '';

    var header = [
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">',
      '<span style="color:#fff;font-weight:700;font-size:14px">🔔 Notificações</span>',
      '<div style="display:flex;gap:8px;align-items:center">' + markAllBtn + '<button id="notif-close-btn" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px">✕</button></div>',
      '</div>'
    ].join('');

    var body;
    if (notifs.length === 0) {
      body = [
        '<div style="text-align:center;padding:24px;color:#888">',
        '<div style="font-size:32px;margin-bottom:8px">🔔</div>',
        '<p style="margin:0;font-size:13px">Nenhuma notificação no momento</p>',
        '</div>'
      ].join('');
    } else {
      body = notifs.map(function (n, idx) {
        var isUnread = !n.read;
        var icon = n.type === 'community_request' ? '🏘️' : '🔔';
        var timeStr = n.createdAt ? new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
        var bg = isUnread ? 'rgba(167,139,250,0.08)' : 'transparent';
        var borderLeft = isUnread ? 'border-left:3px solid #a78bfa;padding-left:8px;' : 'border-left:3px solid transparent;padding-left:8px;';
        var approveBtn = (n.type === 'community_request' && window.isUserStaff && window.isUserStaff())
          ? '<button data-notif-idx="' + idx + '" class="notif-goto-admin" style="margin-top:6px;background:#a78bfa;border:none;border-radius:6px;color:#000;font-size:11px;font-weight:700;padding:3px 8px;cursor:pointer">Ver no painel admin</button>'
          : '';
        return [
          '<div class="notif-item" data-idx="' + idx + '" style="background:' + bg + ';border-radius:8px;padding:10px;margin-bottom:8px;cursor:pointer;' + borderLeft + '">',
          '<div style="display:flex;align-items:flex-start;gap:8px">',
          '<span style="font-size:20px">' + icon + '</span>',
          '<div style="flex:1;min-width:0">',
          '<div style="font-weight:700;font-size:12px;color:#fff;margin-bottom:2px">' + (n.title || 'Notificação') + '</div>',
          '<div style="font-size:12px;color:#ccc;line-height:1.4;word-break:break-word">' + (n.message || '') + '</div>',
          approveBtn,
          '</div>',
          '<span style="font-size:10px;color:#888;flex-shrink:0">' + timeStr + '</span>',
          '</div>',
          '</div>'
        ].join('');
      }).join('');
    }

    dropdown.innerHTML = header + body;
    document.body.appendChild(dropdown);

    dropdown.querySelector('#notif-close-btn').addEventListener('click', function () { dropdown.remove(); });

    var markAllEl = dropdown.querySelector('#notif-mark-all');
    if (markAllEl) {
      markAllEl.addEventListener('click', function () {
        window._megaNotifications.forEach(function (n) { n.read = true; });
        updateBadge();
        if (window.socket) window.socket.emit('notification:mark-all-read');
        dropdown.remove();
      });
    }

    // Marcar como lida ao clicar e ir pro admin se for community_request
    dropdown.querySelectorAll('.notif-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = parseInt(el.dataset.idx);
        var n = window._megaNotifications[idx];
        if (n && !n.read) {
          n.read = true;
          updateBadge();
          if (window.socket && n.id) window.socket.emit('notification:mark-read', { notificationId: n.id });
        }
      });
    });

    // Botão "Ver no painel admin"
    dropdown.querySelectorAll('.notif-goto-admin').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.remove();
        // Abrir painel admin
        var adminBtn = document.querySelector('[data-section="admin"]') || document.getElementById('btn-admin-panel');
        if (adminBtn) adminBtn.click();
      });
    });

    setTimeout(function () {
      document.addEventListener('click', function close(ev) {
        if (!dropdown.contains(ev.target) && ev.target.id !== 'btn-notifications') {
          dropdown.remove();
          document.removeEventListener('click', close);
        }
      });
    }, 10);
  }

  // ── Socket: ouvir notificações novas e pendentes ──
  function attachSocketNotif() {
    var sock = window.socket;
    if (!sock) { setTimeout(attachSocketNotif, 800); return; }
    if (sock._notifBound) return;
    sock._notifBound = true;

    // Notificação em tempo real (staff online)
    sock.on('notification:new', function (notif) {
      addNotification(notif);
      // Som de notificação
      try {
        var audio = new Audio('Notification.wav');
        audio.volume = 0.3;
        audio.play().catch(function(){});
      } catch(e){}
    });

    // Notificações pendentes recebidas ao conectar
    sock.on('notifications:data', function (list) {
      if (!Array.isArray(list)) return;
      list.forEach(function (n) { addNotification(n); });
    });
  }

  function bindBtn(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  function openSettings() {
    if (typeof window.openSettingsModal === 'function') {
      window.openSettingsModal();
      return;
    }

    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    const ms = document.getElementById('ms-content');
    if (ms && typeof window.renderSettingsSection === 'function') {
      const empty = !ms.innerHTML.trim() || ms.innerHTML.includes('<!-- preenchido pelo JS -->') || !ms.querySelector('.ms-section-title');
      if (empty) {
        window.renderSettingsSection('conta');
        document.querySelectorAll('#settings-modal .ms-nav-item[data-section]').forEach(function (item) {
          item.classList.toggle('active', item.dataset.section === 'conta');
        });
      }
    }
  }

  function init() {
    bindBtn('btn-open-settings',         openSettings);
    bindBtn('btn-open-settings-dm',      openSettings);
    bindBtn('btn-open-settings-sidebar', openSettings);

    function openCommunity() {
      if (window.servers && window.servers.length > 0) {
        if (typeof window.openServer === 'function') window.openServer(window.servers[0].id);
      } else if (typeof openCommunityModal === 'function') {
        openCommunityModal();
      } else {
        var modal = document.getElementById('community-modal');
        if (modal) modal.classList.remove('hidden');
      }
    }
    bindBtn('btn-open-community',         openCommunity);
    bindBtn('btn-open-community-dm',      openCommunity);
    bindBtn('btn-open-community-sidebar', openCommunity);

    // Atualizações: modal gerenciado pelo AutoUpdater (auto-updater.js)
    bindBtn('btn-update-check', function () {
      if (window.AutoUpdater && typeof window.AutoUpdater.checkForUpdatesWithModal === 'function') {
        window.AutoUpdater.checkForUpdatesWithModal();
      }
    });

    bindBtn('btn-notifications', renderNotifDropdown);

    // Iniciar listener de socket
    attachSocketNotif();
  }

  function openTypewriter() {
    var views = ['discover-view','chat-view','voice-view','forum-view',
                 'announcement-view','dm-view','typewriter-view','post-view'];
    views.forEach(function (vid) {
      var el = document.getElementById(vid);
      if (el) {
        el.classList.add('hidden');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      }
    });
    var tw = document.getElementById('typewriter-view');
    if (tw) {
      tw.classList.remove('hidden');
      tw.style.removeProperty('display');
      tw.style.removeProperty('visibility');
      tw.style.removeProperty('pointer-events');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
