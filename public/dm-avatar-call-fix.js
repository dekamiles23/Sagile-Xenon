/**
 * dm-avatar-call-fix.js
 * Correções:
 *  1. Renderizar avatares reais nas DMs, modal de amigos e tela de chamada
 *  2. Botão de chamada no chat privado usa o sistema WebRTC real (startDmVoiceCall)
 *  3. Tela de espera correta quando o usuário inicia uma chamada
 */

(function () {
  'use strict';

  /* ─── Cache de avatares: username.toLowerCase() → dataURL | null ──── */
  window.userAvatarCache = window.userAvatarCache || {};

  /* ─── Aplicar avatar a um elemento DOM ─────────────────────────────── */
  function applyAvatar(el, avatarUrl) {
    if (!el || !avatarUrl) return;
    el.style.backgroundImage = 'url(' + avatarUrl + ')';
    el.style.backgroundSize  = 'cover';
    el.style.backgroundPosition = 'center';
    el.style.backgroundRepeat   = 'no-repeat';
    el.classList.add('has-image');
    el.textContent = '';
  }

  /* ─── Atualiza todos os elementos de um usuário no DOM ─────────────── */
  function refreshAvatarsForUser(username, avatarUrl) {
    if (!avatarUrl || !username) return;
    const key = username.toLowerCase();
    window.userAvatarCache[key] = avatarUrl;

    /* Cards do modal de amigos */
    document.querySelectorAll('[data-friend-card]').forEach(function (card) {
      if ((card.dataset.friendCard || '').toLowerCase() !== key) return;
      var avatarEl = card.querySelector('.friend-avatar');
      if (avatarEl) applyAvatar(avatarEl, avatarUrl);
    });

    /* Lista de conversas DM */
    document.querySelectorAll('.dm-conv-item[data-username]').forEach(function (item) {
      if ((item.dataset.username || '').toLowerCase() !== key) return;
      var el = item.querySelector('.profile-avatar, .dm-avatar');
      if (el) applyAvatar(el, avatarUrl);
    });

    /* Cabeçalho do chat DM ativo */
    if (window.currentDmUser && window.currentDmUser.toLowerCase() === key) {
      var dmHdr = document.querySelector('#dm-chat-area .dm-avatar');
      if (dmHdr) applyAvatar(dmHdr, avatarUrl);
    }

    /* Modal de chat privado — avatar no header */
    var privateModal = document.getElementById('private-chat-modal');
    if (privateModal && window.activePrivateChat &&
        window.activePrivateChat.toLowerCase() === key) {
      var hdrAvatar = privateModal.querySelector('.pm-header-avatar');
      if (hdrAvatar) applyAvatar(hdrAvatar, avatarUrl);
    }

    /* Tela de chamada ativa */
    var callScreen = document.getElementById('dm-call-screen');
    if (callScreen && window.dmCallState &&
        (window.dmCallState.targetUser || '').toLowerCase() === key) {
      var scAvatar = callScreen.querySelector('.dm-call-screen-avatar');
      if (scAvatar) applyAvatar(scAvatar, avatarUrl);
    }

    /* Modal de chamada recebida */
    var incomingModal = document.getElementById('dm-incoming-call-modal');
    if (incomingModal) {
      var incAvatar = incomingModal.querySelector('.dm-incoming-avatar');
      if (incAvatar) applyAvatar(incAvatar, avatarUrl);
    }

    /* Mensagens do canal do servidor (server-chat) já renderizadas no DOM */
    document.querySelectorAll('#messages-area .msg-avatar').forEach(function (el) {
      if ((el.dataset.username || '').toLowerCase() === key) applyAvatar(el, avatarUrl);
    });

    /* Mensagens do chat DM já renderizadas no DOM */
    document.querySelectorAll('#dm-messages-area .msg-avatar').forEach(function (el) {
      if ((el.dataset.username || '').toLowerCase() === key) applyAvatar(el, avatarUrl);
    });

    /* Atualizar modal de amigos (todas as abas: Online, Todos, Solicitações) */
    // FIX: Debounce to prevent flickering
    if (typeof window.renderFriendsModal === 'function') {
      clearTimeout(window._friendsModalRenderTimeout);
      window._friendsModalRenderTimeout = setTimeout(window.renderFriendsModal, 100);
    }
  }

  /* ─── Solicitar avatar de um usuário ao servidor ────────────────────── */
  function requestAvatar(username) {
    var key = (username || '').toLowerCase();
    if (!username) return;
    if (window.userAvatarCache[key] !== undefined) {
      /* já cacheado (pode ser null = sem avatar) */
      if (window.userAvatarCache[key]) refreshAvatarsForUser(username, window.userAvatarCache[key]);
      return;
    }
    window.userAvatarCache[key] = null; /* marcado como solicitado */
    if (window.socket && window.socket.connected) {
      window.socket.emit('user:avatar:get', { username: username });
    }
  }

  /* ─── Varredura do DOM: aplica avatares cacheados ───────────────────── */
  function scanAndApply() {
    /* Cards de amigos */
    document.querySelectorAll('[data-friend-card]').forEach(function (card) {
      var uname = card.dataset.friendCard;
      if (!uname) return;
      var key = uname.toLowerCase();
      var avatarUrl = window.userAvatarCache[key];
      if (avatarUrl) {
        var el = card.querySelector('.friend-avatar');
        if (el) applyAvatar(el, avatarUrl);
      } else {
        requestAvatar(uname);
      }
    });

    /* Itens da lista DM */
    document.querySelectorAll('.dm-conv-item[data-username]').forEach(function (item) {
      var uname = item.dataset.username;
      if (!uname) return;
      var key = uname.toLowerCase();
      var avatarUrl = window.userAvatarCache[key];
      if (avatarUrl) {
        var el = item.querySelector('.profile-avatar, .dm-avatar');
        if (el) applyAvatar(el, avatarUrl);
      } else {
        requestAvatar(uname);
      }
    });

    /* Mensagens do server-chat já no DOM */
    document.querySelectorAll('#messages-area .msg-avatar[data-username]').forEach(function (el) {
      var uname = el.dataset.username;
      if (!uname) return;
      var key = uname.toLowerCase();
      var av = window.userAvatarCache[key] || (window.friendAvatarCache || {})[key];
      if (av) { applyAvatar(el, av); }
      else { requestAvatar(uname); }
    });

    /* Mensagens do chat DM já no DOM */
    document.querySelectorAll('#dm-messages-area .msg-avatar[data-username]').forEach(function (el) {
      var uname = el.dataset.username;
      if (!uname) return;
      var key = uname.toLowerCase();
      var av = window.userAvatarCache[key] || (window.friendAvatarCache || {})[key];
      if (av) { applyAvatar(el, av); }
      else { requestAvatar(uname); }
    });
  }

  /* ─── CSS extra: friend-avatar suporta has-image ───────────────────── */
  (function injectCss() {
    if (document.getElementById('dm-avatar-fix-css')) return;
    var style = document.createElement('style');
    style.id = 'dm-avatar-fix-css';
    style.textContent = [
      '.friend-avatar.has-image { background-image: var(--img) !important; }',
      '.friend-avatar.has-image { color: transparent !important; }',
      '.dm-call-screen-avatar.has-image { background: none !important; font-size: 0 !important; }',
      '.dm-incoming-avatar.has-image   { background: none !important; font-size: 0 !important; }',
      '.pm-header-avatar { width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#8b00ff,#ff00ff);',
      '  display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;',
      '  background-size:cover;background-position:center;flex-shrink:0; }'
    ].join('\n');
    document.head.appendChild(style);
  })();

  /* ─── Eventos de socket para avatares ──────────────────────────────── */
  function bindAvatarSocket() {
    if (window._avatarFixSocketBound) return;
    window._avatarFixSocketBound = true;

    /* Receber avatar de outro usuário */
    window.socket.on('user:avatar:data', function (data) {
      if (!data || !data.username) return;
      var key = data.username.toLowerCase();
      window.userAvatarCache[key] = data.avatar || null;
      if (data.avatar) {
        // Sync to script.js friendAvatarCache so getFriendAvatar() also works
        if (window.friendAvatarCache) {
          window.friendAvatarCache[key] = data.avatar;
          try { localStorage.setItem('zx_friend_avatars', JSON.stringify(window.friendAvatarCache)); } catch(e){}
        }
        // FIX: Don't call renderDmList() here to prevent excessive re-rendering
        // Avatar changes should be handled surgically
        // if (typeof window.renderDmList === 'function') window.renderDmList();
        refreshAvatarsForUser(data.username, data.avatar);
      }
    });

    /* Quando receber lista de amigos, solicitar avatares */
    window.socket.on('friends:data', function (data) {
      var list = (data && data.friends) || [];
      list.forEach(function (f) {
        var uname = typeof f === 'string' ? f : (f.username || '');
        if (uname) requestAvatar(uname);
      });
    });

    /* Ao conectar, enviar próprio avatar */
    function broadcastOwnAvatar() {
      var myAvatar = window.profileAvatarUrl || localStorage.getItem('zx_avatar') || '';
      if (myAvatar && window.socket && window.socket.connected) {
        window.socket.emit('user:avatar:set', { avatar: myAvatar });
      }
    }

    broadcastOwnAvatar();
    window.socket.on('connect', broadcastOwnAvatar);

    /* Sempre que o avatar próprio mudar, reenviar */
    var _originalSave = window.localStorage.setItem.bind(window.localStorage);
    Object.defineProperty(window.localStorage, 'setItem', {
      configurable: true,
      writable: true,
      value: function (k, v) {
        _originalSave(k, v);
        if (k === 'zx_avatar') {
          window.profileAvatarUrl = v;
          broadcastOwnAvatar();
        }
      }
    });
  }

  /* ─── FIX: startVoiceCall → startDmVoiceCall (WebRTC real) ─────────── */
  // REMOVIDO: O private-chat-system.js agora lida com isso internamente
  // Este override estava causando conflito quando o username era passado corretamente

  /* ─── Modal de "chamando" simples (fallback) ────────────────────────── */
  function _showSimpleCallingModal(username) {
    document.getElementById('_simple-calling-modal')?.remove();
    var modal = document.createElement('div');
    modal.id = '_simple-calling-modal';
    modal.style.cssText = [
      'position:fixed;inset:0;z-index:9999999;',
      'background:radial-gradient(ellipse at center,#0d001f 0%,#040008 100%);',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;'
    ].join('');
    var initial = (username || '?')[0].toUpperCase();
    var cacheKey = (username || '').toLowerCase();
    var avatarStyle = window.userAvatarCache[cacheKey]
      ? 'background-image:url(' + window.userAvatarCache[cacheKey] + ');background-size:cover;background-position:center;font-size:0;'
      : 'background:linear-gradient(135deg,#8b00ff,#ff00ff);';
    modal.innerHTML = [
      '<div style="width:120px;height:120px;border-radius:50%;' + avatarStyle,
      'display:flex;align-items:center;justify-content:center;font-size:52px;font-weight:700;color:#fff;',
      'box-shadow:0 0 60px rgba(0,255,136,0.5);animation:dmAvatarPulse 2s ease-in-out infinite;margin-bottom:24px;">' + initial + '</div>',
      '<div style="color:#fff;font-size:28px;font-weight:700;margin-bottom:8px;">' + _esc(username) + '</div>',
      '<div style="color:#00ff88;font-size:16px;margin-bottom:48px;" id="_calling-status">📞 Chamando...</div>',
      '<div style="display:flex;gap:24px;">',
      '<button onclick="document.getElementById(\'_simple-calling-modal\').remove()" ',
      'style="width:64px;height:64px;border-radius:50%;border:none;background:#ed4245;color:#fff;font-size:28px;cursor:pointer;">📵</button>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ─── Patch do openDmChat para usar avatar real ─────────────────────── */
  var _originalOpenDmChat = null;
  function patchOpenDmChat() {
    if (typeof window.openDmChat !== 'function' || window.openDmChat._avatarPatched) return;
    _originalOpenDmChat = window.openDmChat;
    window.openDmChat = function (username) {
      _originalOpenDmChat.apply(this, arguments);
      /* Após abrir, aplicar avatar no header se disponível */
      requestAnimationFrame(function () {
        var key = (username || '').toLowerCase();
        var avatarUrl = window.userAvatarCache[key];
        if (avatarUrl) {
          var el = document.querySelector('#dm-chat-area .dm-avatar');
          if (el) applyAvatar(el, avatarUrl);
        }
        requestAvatar(username);
      });
    };
    window.openDmChat._avatarPatched = true;
  }

  /* ─── Patch do header do private-chat-system ──────────────────────────
   * O private-chat-system.js cria um div genérico sem classe no header.
   * Adicionamos a classe pm-header-avatar depois da criação.
  */
  function patchPrivateChatHeader() {
    var observer = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.id !== 'private-chat-modal') return;
          /* Encontrar o div circular do avatar no header */
          var headerAvatarDivs = node.querySelectorAll(
            'div[style*="border-radius: 50%"], div[style*="border-radius:50%"]'
          );
          headerAvatarDivs.forEach(function (div) {
            /* O avatar do header é pequeno (40px) e vem antes dos botões */
            if (parseInt(div.style.width) === 40 || div.style.width === '40px') {
              div.classList.add('pm-header-avatar');
              /* Aplicar avatar se já em cache */
              if (window.activePrivateChat) {
                var key = window.activePrivateChat.toLowerCase();
                var avatarUrl = window.userAvatarCache[key];
                if (avatarUrl) applyAvatar(div, avatarUrl);
                else requestAvatar(window.activePrivateChat);
              }
            }
          });
        });
      });
    });
    observer.observe(document.body, { childList: true });
  }

  /* ─── Patch da tela de chamada: avatar real na tela fullscreen ──────── */
  function patchCallScreen() {
    var observer = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (!node.id) return;

          /* Tela de chamada ativa */
          if (node.id === 'dm-call-screen') {
            var uname = window.dmCallState && window.dmCallState.targetUser;
            if (uname) {
              var key = uname.toLowerCase();
              var avatarUrl = window.userAvatarCache[key];
              var avatarEl = node.querySelector('.dm-call-screen-avatar');
              if (avatarEl) {
                if (avatarUrl) {
                  applyAvatar(avatarEl, avatarUrl);
                } else {
                  requestAvatar(uname);
                }
              }
            }
          }

          /* Modal de chamada recebida */
          if (node.id === 'dm-incoming-call-modal') {
            /* Marcar o círculo do avatar com a classe dm-incoming-avatar */
            var circles = node.querySelectorAll(
              'div[style*="border-radius:50%"], div[style*="border-radius: 50%"]'
            );
            circles.forEach(function (c) {
              var w = parseInt(c.style.width);
              if (w >= 48 && w <= 60) {
                c.classList.add('dm-incoming-avatar');
                /* tentar aplicar avatar do chamador */
                var callerEl = node.querySelector('div[style*="font-size:15px"], div[style*="font-weight:700"]');
                var callerName = callerEl ? callerEl.textContent.trim() : null;
                if (!callerName && window.dmCallState) callerName = window.dmCallState._incomingCaller;
                if (callerName) {
                  var key = callerName.toLowerCase();
                  var avatarUrl = window.userAvatarCache[key];
                  if (avatarUrl) applyAvatar(c, avatarUrl);
                  else requestAvatar(callerName);
                }
              }
            });
          }
        });
      });
    });
    observer.observe(document.body, { childList: true });
  }

  /* ─── MutationObserver geral: aplica avatares nos novos cards ───────── */
  function watchDom() {
    var debounceTimer = null;
    var observer = new MutationObserver(function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scanAndApply, 120);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ─── Inicialização ─────────────────────────────────────────────────── */
  function init() {
    bindAvatarSocket();
    patchOpenDmChat();
    patchPrivateChatHeader();
    patchCallScreen();
    watchDom();
    /* Pre-populate userAvatarCache from friendAvatarCache (set by script.js friends:data) */
    var _fc = window.friendAvatarCache;
    if (_fc) {
      Object.keys(_fc).forEach(function(k) {
        if (_fc[k] && !window.userAvatarCache[k]) {
          window.userAvatarCache[k] = _fc[k];
        }
      });
    }

    scanAndApply();

    /* Pedir avatares dos amigos já carregados */
    var friends = JSON.parse(localStorage.getItem('zx_friends') || '[]');
    friends.forEach(function (f) {
      var uname = typeof f === 'string' ? f : (f.username || '');
      if (uname) requestAvatar(uname);
    });
  }

  function waitForSocket() {
    if (window.socket) {
      if (window.socket.connected) { init(); }
      else { window.socket.once('connect', init); }
    } else {
      var t = setInterval(function () {
        if (window.socket) {
          clearInterval(t);
          if (window.socket.connected) init();
          else window.socket.once('connect', init);
        }
      }, 300);
      setTimeout(function () { clearInterval(t); }, 20000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForSocket);
  } else {
    waitForSocket();
  }

})();
