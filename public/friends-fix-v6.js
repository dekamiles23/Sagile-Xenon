/**
 * friends-fix-v6.js
 * Sistema completo do modal de Amigos:
 *   - Online / Todos / Solicitações / Atividade / Adicionar amigo
 *   - Persistência no localStorage (zx_friends, zx_friend_requests, zx_sent_requests)
 *   - Integração Socket.IO (friend:request, friend:accept, friend:reject, friend:remove)
 *   - Botão "Mensagem" abre o chat privado via window.openPrivateChat
 */
(function () {
  'use strict';

  // ── Estado ──────────────────────────────────────────────────────────────────
  var friends         = []; // Carregado do Supabase, não do localStorage
  var friendRequests  = JSON.parse(localStorage.getItem('zx_friend_requests')|| '[]');
  var sentRequests    = JSON.parse(localStorage.getItem('zx_sent_requests')  || '[]');
  var activityLog     = JSON.parse(localStorage.getItem('zx_friend_log')     || '[]');
  var friendsLoadedFromServer = false; // Flag para saber se já carregou do Supabase

  function save() {
    localStorage.setItem('zx_friends',          JSON.stringify(friends));
    localStorage.setItem('zx_friend_requests',  JSON.stringify(friendRequests));
    localStorage.setItem('zx_sent_requests',    JSON.stringify(sentRequests));
    localStorage.setItem('zx_friend_log',       JSON.stringify(activityLog.slice(-100)));
  }

  function myName() {
    return (
      window.username ||
      window.currentUsername ||
      localStorage.getItem('zx_username') ||
      sessionStorage.getItem('username') ||
      'Eu'
    );
  }

  function isOnline(uname) {
    if (!uname) return false;
    try {
      if (typeof onlineSet !== 'undefined' && onlineSet instanceof Set) {
        return onlineSet.has(uname.toLowerCase());
      }
    } catch (_) {}
    if (window.onlineUsers && Array.isArray(window.onlineUsers)) {
      return window.onlineUsers.some(function (u) {
        return (u.username || u).toLowerCase() === uname.toLowerCase();
      });
    }
    return false;
  }

  function addLog(text) {
    activityLog.unshift({ text: text, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
    save();
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Render helpers ───────────────────────────────────────────────────────────
  function avatarHtml(uname) {
    var av = (window.getFriendAvatar && window.getFriendAvatar(uname)) || '';
    var letter = (uname || '?')[0].toUpperCase();
    if (av) {
      return '<div class="mm-friend-av" style="background-image:url(' + av + ');background-size:cover;background-position:center;">&nbsp;</div>';
    }
    return '<div class="mm-friend-av">' + esc(letter) + '</div>';
  }

  function statusDot(uname) {
    return isOnline(uname)
      ? '<span class="mm-status-dot online"></span>'
      : '<span class="mm-status-dot offline"></span>';
  }

  // ── Render tabs ──────────────────────────────────────────────────────────────
  function renderTab(tabId) {
    var pane = document.getElementById(tabId);
    if (!pane) return;

    if (tabId === 'fo') renderOnlineFriends(pane);
    else if (tabId === 'fa') renderAllFriends(pane);
    else if (tabId === 'fr') renderRequests(pane);
    else if (tabId === 'fa-log') renderLog(pane);
    else if (tabId === 'fa-add') renderAddFriend(pane);
  }

  function renderOnlineFriends(pane) {
    var online = friends.filter(function (f) { return isOnline(f); });
    if (online.length === 0) {
      pane.innerHTML = '<div class="empty-state">🟢<p>Nenhum amigo online no momento.</p></div>';
      return;
    }
    pane.innerHTML = online.map(function (f) {
      return friendRow(f, true);
    }).join('');
    bindFriendRowEvents(pane);
  }

  function renderAllFriends(pane) {
    if (friends.length === 0) {
      pane.innerHTML = '<div class="empty-state">👥<p>Sua lista de amigos está vazia.</p></div>';
      return;
    }
    var sorted = friends.slice().sort(function (a, b) {
      return (isOnline(b) ? 1 : 0) - (isOnline(a) ? 1 : 0);
    });
    pane.innerHTML = sorted.map(function (f) {
      return friendRow(f, isOnline(f));
    }).join('');
    bindFriendRowEvents(pane);
  }

  function friendRow(uname, online) {
    return [
      '<div class="mm-friend-row" data-username="' + esc(uname) + '">',
        avatarHtml(uname),
        '<div class="mm-friend-info">',
          '<span class="mm-friend-name">' + esc(uname) + '</span>',
          statusDot(uname),
          '<span class="mm-friend-status-text">' + (online ? 'Online' : 'Offline') + '</span>',
        '</div>',
        '<div class="mm-friend-actions">',
          '<button class="btn-ghost-sm mm-btn-msg" data-username="' + esc(uname) + '" title="Mensagem">💬</button>',
          '<button class="btn-ghost-sm mm-btn-remove" data-username="' + esc(uname) + '" title="Remover">✕</button>',
        '</div>',
      '</div>'
    ].join('');
  }

  function renderRequests(pane) {
    if (friendRequests.length === 0 && sentRequests.length === 0) {
      pane.innerHTML = '<div class="empty-state">📩<p>Nenhuma solicitação pendente.</p></div>';
      return;
    }

    var html = '';
    if (friendRequests.length > 0) {
      html += '<div class="mm-section-label">RECEBIDAS — ' + friendRequests.length + '</div>';
      html += friendRequests.map(function (r) {
        var uname = typeof r === 'string' ? r : r.from;
        return [
          '<div class="mm-friend-row" data-username="' + esc(uname) + '">',
            avatarHtml(uname),
            '<div class="mm-friend-info">',
              '<span class="mm-friend-name">' + esc(uname) + '</span>',
              '<span class="mm-friend-status-text" style="color:#888;">Quer ser seu amigo</span>',
            '</div>',
            '<div class="mm-friend-actions">',
              '<button class="btn-neon mm-btn-accept" data-username="' + esc(uname) + '" title="Aceitar">✔</button>',
              '<button class="btn-ghost-sm mm-btn-reject" data-username="' + esc(uname) + '" title="Recusar">✕</button>',
            '</div>',
          '</div>'
        ].join('');
      }).join('');
    }

    if (sentRequests.length > 0) {
      html += '<div class="mm-section-label" style="margin-top:12px;">ENVIADAS — ' + sentRequests.length + '</div>';
      html += sentRequests.map(function (uname) {
        return [
          '<div class="mm-friend-row" data-username="' + esc(uname) + '">',
            avatarHtml(uname),
            '<div class="mm-friend-info">',
              '<span class="mm-friend-name">' + esc(uname) + '</span>',
              '<span class="mm-friend-status-text" style="color:#888;">Solicitação enviada</span>',
            '</div>',
            '<div class="mm-friend-actions">',
              '<button class="btn-ghost-sm mm-btn-cancel-req" data-username="' + esc(uname) + '" title="Cancelar">✕</button>',
            '</div>',
          '</div>'
        ].join('');
      }).join('');
    }

    pane.innerHTML = html;
    bindFriendRowEvents(pane);
  }

  function renderLog(pane) {
    if (activityLog.length === 0) {
      pane.innerHTML = '<div class="empty-state">📋<p>Nenhuma atividade ainda.</p></div>';
      return;
    }
    pane.innerHTML = activityLog.map(function (entry) {
      return '<div class="mm-log-item"><span class="mm-log-time">' + esc(entry.time) + '</span> ' + esc(entry.text) + '</div>';
    }).join('');
  }

  function renderAddFriend(pane) {
    pane.innerHTML = [
      '<div style="padding:16px;">',
        '<h3 style="color:#00ffff;margin:0 0 8px 0;font-size:15px;">ADICIONAR AMIGO</h3>',
        '<p style="color:#aaa;font-size:13px;margin:0 0 14px 0;">Digite o nome de usuário exato para enviar uma solicitação.</p>',
        '<div style="display:flex;gap:8px;margin-bottom:8px;">',
          '<input id="ff6-add-input" type="text" placeholder="Nome de usuário..." maxlength="32"',
            ' style="flex:1;padding:10px 14px;background:rgba(0,0,0,0.4);border:1px solid rgba(0,255,255,0.3);border-radius:8px;color:#fff;outline:none;font-size:14px;" />',
          '<button id="ff6-add-btn" class="btn-neon" style="padding:0 18px;">Enviar</button>',
        '</div>',
        '<p id="ff6-add-status" style="font-size:13px;margin:0;min-height:18px;"></p>',
      '</div>'
    ].join('');

    var input = pane.querySelector('#ff6-add-input');
    var btn   = pane.querySelector('#ff6-add-btn');
    var status = pane.querySelector('#ff6-add-status');

    function doAdd() {
      var uname = (input.value || '').trim().replace(/^@/, '');
      if (!uname) { setStatus('Digite um nome de usuário.', '#ff4444'); return; }
      if (uname.toLowerCase() === myName().toLowerCase()) { setStatus('Você não pode adicionar a si mesmo.', '#ff4444'); return; }
      if (friends.indexOf(uname) !== -1) { setStatus(uname + ' já é seu amigo.', '#ffaa00'); return; }
      if (sentRequests.indexOf(uname) !== -1) { setStatus('Solicitação já enviada para ' + uname + '.', '#ffaa00'); return; }

      sentRequests.push(uname);
      save();
      if (window.socket && window.socket.connected) {
        window.socket.emit('friend:request', { from: myName(), to: uname, avatar: localStorage.getItem('zx_avatar') || null });
      }
      addLog('Você enviou solicitação para ' + uname);
      setStatus('✅ Solicitação enviada para ' + uname + '!', '#00ff88');
      input.value = '';
      renderRequests(document.getElementById('fr'));
    }

    function setStatus(msg, color) {
      if (status) { status.textContent = msg; status.style.color = color || '#aaa'; }
    }

    btn.addEventListener('click', doAdd);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doAdd(); });
  }

  // ── Bind de eventos nas linhas ───────────────────────────────────────────────
  function bindFriendRowEvents(pane) {
    pane.querySelectorAll('.mm-btn-msg').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var uname = btn.dataset.username;
        closeFriendsModal();
        setTimeout(function () {
          if (typeof window.openPrivateChat === 'function') {
            window.openPrivateChat(uname);
          } else if (typeof window.openDmChat === 'function') {
            window.openDmChat(uname);
          }
        }, 50);
      });
    });

    pane.querySelectorAll('.mm-btn-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var uname = btn.dataset.username;
        if (!confirm('Remover ' + uname + ' da lista de amigos?')) return;
        friends = friends.filter(function (f) { return f !== uname; });
        save();
        if (window.socket && window.socket.connected) {
          window.socket.emit('friend:remove', { from: myName(), to: uname });
        }
        addLog('Você removeu ' + uname + ' dos amigos');
        renderFriendsModal();
        if (typeof window.renderDmList === 'function') window.renderDmList();
        if (window.friendsSystem) window.friendsSystem.syncFromGlobals && window.friendsSystem.syncFromGlobals();
      });
    });

    pane.querySelectorAll('.mm-btn-accept').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var uname = btn.dataset.username;
        friendRequests = friendRequests.filter(function (r) {
          return (typeof r === 'string' ? r : r.from) !== uname;
        });
        save();
        if (window.socket && window.socket.connected) {
          window.socket.emit('friend:accept', { from: myName(), to: uname });
        }
        addLog('Você aceitou a solicitação de ' + uname);
        // Não adiciona localmente - espera o servidor salvar no Supabase e recarregar via friends:loaded
        renderFriendsModal();
      });
    });

    pane.querySelectorAll('.mm-btn-reject').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var uname = btn.dataset.username;
        friendRequests = friendRequests.filter(function (r) {
          return (typeof r === 'string' ? r : r.from) !== uname;
        });
        save();
        if (window.socket && window.socket.connected) {
          window.socket.emit('friend:reject', { from: myName(), to: uname });
        }
        addLog('Você recusou a solicitação de ' + uname);
        renderFriendsModal();
      });
    });

    pane.querySelectorAll('.mm-btn-cancel-req').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var uname = btn.dataset.username;
        sentRequests = sentRequests.filter(function (r) { return r !== uname; });
        save();
        if (window.socket && window.socket.connected) {
          window.socket.emit('friend:cancel', { from: myName(), to: uname });
        }
        addLog('Você cancelou a solicitação para ' + uname);
        renderRequests(document.getElementById('fr'));
      });
    });
  }

  // ── Render modal completo ────────────────────────────────────────────────────
  function renderFriendsModal() {
    var activeTab = document.querySelector('.mm-tab.active');
    var tabId = activeTab ? activeTab.dataset.tab : 'fo';
    renderTab(tabId);
    updateRequestsBadge();
  }

  function updateRequestsBadge() {
    var tab = document.querySelector('.mm-tab[data-tab="fr"]');
    if (!tab) return;
    var count = friendRequests.length;
    tab.textContent = 'Solicitações' + (count > 0 ? ' (' + count + ')' : '');
  }

  function closeFriendsModal() {
    var modal = document.getElementById('friends-modal');
    if (modal) modal.classList.add('hidden');
  }

  function dispatchUpdated() {
    try { window.dispatchEvent(new CustomEvent('zx:friends:updated')); } catch (_) {}
    // Sync com variáveis globais usadas por script.js
    try {
      window.__zxFriends = friends.slice();
      window.__zxFriendRequests = friendRequests.slice();
    } catch (_) {}
  }

  // ── CSS minimal ──────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('ff6-styles')) return;
    var s = document.createElement('style');
    s.id = 'ff6-styles';
    s.textContent = [
      '.mm-friend-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;transition:background 0.15s;}',
      '.mm-friend-row:hover{background:rgba(255,255,255,0.05);}',
      '.mm-friend-av{width:38px;height:38px;min-width:38px;border-radius:50%;background:linear-gradient(135deg,#8b00ff,#ff00ff);',
        'display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0;}',
      '.mm-friend-info{flex:1;min-width:0;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}',
      '.mm-friend-name{color:#fff;font-weight:600;font-size:14px;}',
      '.mm-friend-status-text{color:#888;font-size:12px;}',
      '.mm-friend-actions{display:flex;gap:6px;flex-shrink:0;}',
      '.mm-status-dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex-shrink:0;}',
      '.mm-status-dot.online{background:#23d18b;box-shadow:0 0 6px #23d18b;}',
      '.mm-status-dot.offline{background:#747f8d;}',
      '.mm-section-label{color:#aaa;font-size:11px;text-transform:uppercase;letter-spacing:.8px;padding:8px 12px 4px;font-weight:700;}',
      '.mm-log-item{padding:6px 12px;font-size:13px;color:#ccc;border-bottom:1px solid rgba(255,255,255,0.05);}',
      '.mm-log-time{color:#666;font-size:11px;margin-right:6px;}'
    ].join('');
    document.head.appendChild(s);
  }

  // ── Socket.IO listeners ──────────────────────────────────────────────────────
  function bindSocket(socket) {
    if (socket._ff6Bound) return;
    socket._ff6Bound = true;

    // Carregar amigos persistidos no Supabase
    socket.on('friends:loaded', function (data) {
      var serverFriends = data && data.friends ? data.friends : [];
      // Substitui o array local com os dados do servidor (fonte de verdade)
      friends = serverFriends.slice();
      friendsLoadedFromServer = true;
      save();
      // Sincroniza globais
      window.__zxFriends = friends.slice();
      window.friends = friends;
      renderFriendsModal();
      if (typeof window.renderDmList === 'function') window.renderDmList();
      dispatchUpdated();
      console.log('[FF6] friends:loaded — total de amigos:', friends.length);
    });

    // Solicita amigos ao conectar — com retry até o username estar disponível
    var _friendsLoaded = false;
    function requestFriends() {
      var uname = myName();
      if (uname && uname !== 'Eu') {
        console.log('[FF6] Solicitando friends:load para', uname);
        socket.emit('friends:load', { username: uname });
        _friendsLoaded = true;
        return true;
      }
      return false;
    }

    // Tenta imediatamente; faz polling de 500ms até conseguir (máx 30s)
    if (!requestFriends()) {
      var _retryCount = 0;
      var _retryTimer = setInterval(function () {
        _retryCount++;
        if (requestFriends() || _retryCount >= 60) {
          clearInterval(_retryTimer);
        }
      }, 500);
    }

    // Também tenta ao receber eventos de login
    document.addEventListener('userLoggedIn', function () {
      setTimeout(requestFriends, 300);
    }, { once: true });

    // Observa window.username sendo definido (para apps que definem depois do carregamento)
    (function watchUsername() {
      var _prev = window.username;
      var _watcher = setInterval(function () {
        var cur = window.username;
        if (cur && cur !== _prev && cur !== 'Eu') {
          clearInterval(_watcher);
          setTimeout(requestFriends, 200);
        }
        _prev = cur;
      }, 300);
      setTimeout(function () { clearInterval(_watcher); }, 30000);
    })();

    // Solicitação recebida
    socket.on('friend:request', function (data) {
      var from = data && (data.from || data.username);
      if (!from) return;
      var already = friendRequests.some(function (r) { return (typeof r === 'string' ? r : r.from) === from; });
      if (!already && friends.indexOf(from) === -1) {
        friendRequests.push({ from: from, avatar: data.avatar || null });
        save();
        addLog(from + ' enviou uma solicitação de amizade');
        renderFriendsModal();
        dispatchUpdated();
        if (typeof showToast === 'function') showToast('👥 ' + from + ' quer ser seu amigo!');
      }
    });

    // Solicitação aceita
    socket.on('friend:accepted', function (data) {
      var by = data && (data.by || data.from);
      if (!by) return;
      sentRequests = sentRequests.filter(function (r) { return r !== by; });
      // Recarrega amigos do Supabase para garantir consistência
      var uname = myName();
      if (uname && uname !== 'Eu' && window.socket && window.socket.connected) {
        window.socket.emit('friends:load', { username: uname });
      }
      addLog(by + ' aceitou sua solicitação de amizade');
      if (typeof showToast === 'function') showToast('🎉 ' + by + ' aceitou sua solicitação!');
    });

    // Amigo removido
    socket.on('friend:removed', function (data) {
      var by = data && (data.by || data.from);
      if (!by) return;
      // Recarrega amigos do Supabase para garantir consistência
      var uname = myName();
      if (uname && uname !== 'Eu' && window.socket && window.socket.connected) {
        window.socket.emit('friends:load', { username: uname });
      }
      addLog(by + ' removeu você dos amigos');
    });

    // Cancelamento de solicitação recebida
    socket.on('friend:request:cancelled', function (data) {
      var by = data && (data.by || data.from);
      if (!by) return;
      friendRequests = friendRequests.filter(function (r) { return (typeof r === 'string' ? r : r.from) !== by; });
      save();
      renderFriendsModal();
    });

    // Dados de presença
    socket.on('friends:data', function (data) {
      if (!Array.isArray(data)) return;
      window.onlineUsers = data;
      renderFriendsModal();
      dispatchUpdated();
    });

    // Re-bind após reconexão
    socket.on('connect', function () {
      socket._ff6Bound = false;
      bindSocket(socket);
      // Recarrega amigos do servidor após reconectar
      setTimeout(function () {
        var uname = myName();
        if (uname && uname !== 'Eu') socket.emit('friends:load', { username: uname });
      }, 500);
    });
  }

  function waitForSocket() {
    if (window.socket) {
      bindSocket(window.socket);
    } else {
      var t = setInterval(function () {
        if (window.socket) { clearInterval(t); bindSocket(window.socket); }
      }, 300);
      setTimeout(function () { clearInterval(t); }, 20000);
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();

    // Tabs do modal de amigos
    document.addEventListener('click', function (e) {
      var tab = e.target.closest('.mm-tab');
      if (!tab) return;
      var tabId = tab.dataset.tab;
      if (!tabId) return;
      document.querySelectorAll('.mm-tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.mm-pane').forEach(function (p) {
        p.classList.toggle('hidden', p.id !== tabId);
        p.classList.toggle('active', p.id === tabId);
      });
      tab.classList.add('active');
      renderTab(tabId);
    });

    // Quando o modal de amigos abre, renderiza
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.target.id === 'friends-modal' && !m.target.classList.contains('hidden')) {
          renderFriendsModal();
        }
      });
    });
    var modal = document.getElementById('friends-modal');
    if (modal) observer.observe(modal, { attributes: true, attributeFilter: ['class'] });

    waitForSocket();

    // Expor globalmente para compatibilidade
    window.renderFriendsModal = renderFriendsModal;
    window.friends = friends;
    window.friendRequests = friendRequests;
    window.__zxFriends = friends;
    window.__zxFriendRequests = friendRequests;

    // Expor função pública para enviar solicitação
    window.sendFriendRequest = function (uname) {
      uname = (uname || '').trim().replace(/^@/, '');
      if (!uname) return;
      if (friends.indexOf(uname) !== -1) { if (typeof showToast === 'function') showToast(uname + ' já é seu amigo.'); return; }
      if (sentRequests.indexOf(uname) !== -1) { if (typeof showToast === 'function') showToast('Solicitação já enviada para ' + uname); return; }
      sentRequests.push(uname);
      save();
      if (window.socket && window.socket.connected) {
        window.socket.emit('friend:request', { from: myName(), to: uname, avatar: localStorage.getItem('zx_avatar') || null });
      }
      addLog('Você enviou solicitação para ' + uname);
      renderFriendsModal();
      if (typeof showToast === 'function') showToast('✅ Solicitação enviada para ' + uname);
    };

    console.log('[FF6] friends-fix-v6.js carregado');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
