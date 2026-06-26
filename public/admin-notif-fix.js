(function () {
  'use strict';

  var STAFF_USERS = ['Developer', 'Admin', 'Staff', 'demid'];

  /* ─── helpers ─────────────────────────────────────────────────── */
  function getUsername() {
    return window.username || window.currentUsername ||
      sessionStorage.getItem('username') ||
      localStorage.getItem('zx_username') || '';
  }

  function isStaff(u) {
    return STAFF_USERS.includes(u || getUsername());
  }

  /* ─── badge de notificação ─────────────────────────────────────── */
  function updateBadge(count) {
    var badge = document.getElementById('notification-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.classList.remove('hidden');
      badge.style.setProperty('display', 'flex', 'important');
    } else {
      badge.classList.add('hidden');
    }
  }

  function incrementBadge() {
    var badge = document.getElementById('notification-badge');
    var cur = parseInt((badge && badge.textContent) || '0') || 0;
    updateBadge(cur + 1);
  }

  /* ─── toast flutuante ──────────────────────────────────────────── */
  var _toastStyle = document.createElement('style');
  _toastStyle.textContent =
    '@keyframes anf-in{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}' +
    '.anf-toast{animation:anf-in 0.3s ease;position:fixed;top:70px;right:24px;z-index:9999999;' +
    'background:#12121a;border-radius:14px;padding:14px 18px;color:#fff;font-size:13px;' +
    'box-shadow:0 6px 32px rgba(0,0,0,0.6);max-width:340px;line-height:1.5;' +
    'border-left:4px solid #00ffc8;}';
  document.head && document.head.appendChild(_toastStyle);

  var _toastQueue = 0;
  function showToast(html, color) {
    var el = document.createElement('div');
    el.className = 'anf-toast';
    el.style.borderLeftColor = color || '#00ffc8';
    el.style.top = (70 + _toastQueue * 100) + 'px';
    el.innerHTML = html;
    document.body.appendChild(el);
    _toastQueue++;
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateX(40px)';
      el.style.transition = 'opacity 0.3s,transform 0.3s';
      setTimeout(function () { el.remove(); _toastQueue = Math.max(0, _toastQueue - 1); }, 320);
    }, 5500);
  }

  /* ─── botão Admin Panel ────────────────────────────────────────── */
  function tryShowAdminBtn() {
    var u = getUsername();
    if (!u || !isStaff(u)) return false;
    var btn = document.getElementById('btn-admin-panel');
    if (!btn) return false;
    btn.classList.remove('hidden');
    btn.style.setProperty('display', 'inline-flex', 'important');
    btn.style.setProperty('visibility', 'visible', 'important');
    btn.style.setProperty('opacity', '1', 'important');
    return true;
  }

  /* poll até o username aparecer */
  var _adminPoller = setInterval(function () {
    if (tryShowAdminBtn()) clearInterval(_adminPoller);
  }, 400);
  setTimeout(function () { clearInterval(_adminPoller); }, 15000);

  /* ─── eventos de socket ────────────────────────────────────────── */
  function attachSocket() {
    var sock = window.socket;
    if (!sock) { setTimeout(attachSocket, 800); return; }
    if (sock._adminNotifBound) return;
    sock._adminNotifBound = true;

    /* notificações acumuladas ao fazer login */
    sock.on('notifications:data', function (list) {
      var unread = (list || []).filter(function (n) { return !n.read; }).length;
      if (unread > 0) updateBadge(unread);
    });

    /* nova notificação em tempo real */
    sock.on('notification:new', function (notif) {
      incrementBadge();
      if (!notif) return;

      if (notif.type === 'community_request') {
        showToast(
          '🏘️ <strong>Nova comunidade para aprovar</strong><br>' +
          '<span style="color:#aaa;font-size:12px;">' + (notif.message || '') + '</span>',
          '#00ffc8'
        );
      } else {
        showToast(
          '🔔 <strong>' + (notif.title || 'Notificação') + '</strong>' +
          (notif.message ? '<br><span style="color:#aaa;font-size:12px;">' + notif.message + '</span>' : ''),
          '#a855f7'
        );
      }
    });

    /* pedido de aprovação chega para staff em tempo real */
    sock.on('community:new-request', function (req) {
      /* toast extra para garantir visibilidade */
      if (!req) return;
      var submitter = req.submittedBy || '?';
      var name = req.name || 'comunidade';
      showToast(
        '📥 <strong>' + submitter + '</strong> enviou a comunidade<br>' +
        '<span style="color:#00ffc8;font-weight:600;">"' + name + '"</span>' +
        '<span style="color:#aaa;font-size:12px;"> — aguardando aprovação</span>',
        '#00ffc8'
      );
    });

    /* comunidade aprovada — avisa o dono */
    sock.on('community:approved-notification', function (community) {
      var name = (community && community.name) || 'Sua comunidade';
      showToast(
        '✅ <strong>Comunidade aprovada!</strong><br>' +
        '<span style="color:#aaa;font-size:12px;">"' + name + '" foi aprovada pela staff e já aparece nas Sugeridas!</span>',
        '#00ff88'
      );
    });

    /* comunidade rejeitada — avisa o dono */
    sock.on('community:rejected', function (data) {
      var name = (data && data.community && data.community.name) || 'Sua comunidade';
      var reason = (data && data.reason) ? ' — ' + data.reason : '';
      showToast(
        '❌ <strong>Comunidade não aprovada</strong><br>' +
        '<span style="color:#aaa;font-size:12px;">"' + name + '"' + reason + '</span>',
        '#ff5555'
      );
    });
  }

  attachSocket();

  /* re-tenta se socket ainda não existir */
  setTimeout(attachSocket, 1500);
  setTimeout(attachSocket, 3000);
})();
