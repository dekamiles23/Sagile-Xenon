// ================================================
// ✅ MENU CONTEXTUAL DE MENSAGENS - SERVER VIEW
// ✅ Funções: Editar, Excluir, Reagir, Encaminhar
// ================================================

(function() {
    'use strict';

    var QUICK_EMOJIS = ['👍','❤️','😂','😮','😢','😡','🔥','👏','🎉','💯','✨','🥰','🤔','😍','🙏','💪','🫡','😭','🤯','🥳'];

    // Armazena dados das mensagens do servidor para edição/encaminhamento
    var serverMsgStore = {};

    // ── Intercepta rightclick em mensagens do server-view ──
    document.addEventListener('contextmenu', function(e) {
        var msgEl = e.target.closest && e.target.closest('#messages-area .message, #ann-messages-area .message');
        if (!msgEl) return;

        e.preventDefault();
        e.stopPropagation();
        showServerMsgContextMenu(e, msgEl);
    });

    // Fecha menus ao clicar fora
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.srv-msg-ctx-menu') && !e.target.closest('.srv-react-picker')) {
            document.querySelectorAll('.srv-msg-ctx-menu').forEach(function(m) { m.remove(); });
            document.querySelectorAll('.srv-react-picker').forEach(function(p) { p.remove(); });
        }
    });

    // ── Mostra o menu contextual ──
    function showServerMsgContextMenu(e, msgEl) {
        document.querySelectorAll('.srv-msg-ctx-menu').forEach(function(m) { m.remove(); });
        document.querySelectorAll('.srv-react-picker').forEach(function(p) { p.remove(); });

        var usernameEl = msgEl.querySelector('.msg-username');
        var textEl = msgEl.querySelector('.msg-text');
        var senderName = usernameEl ? usernameEl.textContent.trim() : '';
        var msgText = textEl ? textEl.textContent.trim() : '';
        var msgId = msgEl.dataset.msgId || ('srv_' + Date.now());

        // Armazena dados da mensagem
        msgEl.dataset.msgId = msgId;
        serverMsgStore[msgId] = { text: msgText, sender: senderName, el: msgEl };

        var currentUser = window.currentUsername || window.username || localStorage.getItem('userNickname') || '';
        var isOwn = senderName && currentUser && senderName === currentUser;

        var menu = document.createElement('div');
        menu.className = 'srv-msg-ctx-menu';
        menu.style.cssText = 'position:fixed;left:' + Math.min(e.clientX, window.innerWidth - 200) + 'px;top:' + Math.min(e.clientY, window.innerHeight - 220) + 'px;background:#12121a;border:1px solid #ff00ff;border-radius:12px;box-shadow:0 0 25px rgba(255,0,255,0.3);z-index:100000;min-width:190px;padding:8px;animation:ctxFadeIn 0.15s ease-out;';

        var ownHtml = isOwn ? (
            '<div class="ctx-item" onclick="editServerMessage(\'' + msgId + '\')" style="' + CTX_ITEM_STYLE + '">✏️ Editar</div>' +
            '<div class="ctx-item ctx-danger" onclick="deleteServerMessage(\'' + msgId + '\')" style="' + CTX_DANGER_STYLE + '">🗑️ Excluir</div>'
        ) : '';

        menu.innerHTML = ownHtml +
            '<div class="ctx-item" onclick="showServerReactPicker(event,\'' + msgId + '\')" style="' + CTX_ITEM_STYLE + '">😀 Reagir</div>' +
            '<div class="ctx-item" onclick="forwardServerMessage(\'' + msgId + '\')" style="' + CTX_ITEM_STYLE + '">📤 Encaminhar</div>';

        // Adiciona CSS de animação se ainda não existir
        if (!document.getElementById('msg-actions-style')) {
            var style = document.createElement('style');
            style.id = 'msg-actions-style';
            style.textContent = '@keyframes ctxFadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}' +
                '.ctx-item{padding:10px 14px;border-radius:8px;cursor:pointer;color:#eee;font-size:14px;display:flex;align-items:center;gap:8px;transition:background 0.15s;}' +
                '.ctx-item:hover{background:rgba(255,0,255,0.15);color:#fff;}' +
                '.ctx-item.ctx-danger{color:#ff6b6b;}' +
                '.ctx-item.ctx-danger:hover{background:rgba(255,50,50,0.15);}';
            document.head.appendChild(style);
        }

        document.body.appendChild(menu);
    }

    var CTX_ITEM_STYLE = 'padding:10px 14px;border-radius:8px;cursor:pointer;color:#eee;font-size:14px;display:flex;align-items:center;gap:8px;transition:background 0.15s;';
    var CTX_DANGER_STYLE = 'padding:10px 14px;border-radius:8px;cursor:pointer;color:#ff6b6b;font-size:14px;display:flex;align-items:center;gap:8px;transition:background 0.15s;';

    // ── Editar mensagem do servidor ──
    window.editServerMessage = function(msgId) {
        document.querySelectorAll('.srv-msg-ctx-menu').forEach(function(m) { m.remove(); });
        var data = serverMsgStore[msgId];
        if (!data) return;

        var overlay = document.createElement('div');
        overlay.id = 'edit-srv-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000002;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = '<div style="background:#12121a;border:1px solid #ff00ff;border-radius:16px;padding:24px;width:90%;max-width:420px;box-shadow:0 0 40px rgba(255,0,255,0.3);">'
            + '<div style="color:#fff;font-weight:700;font-size:16px;margin-bottom:16px;">✏️ Editar mensagem</div>'
            + '<textarea id="edit-srv-ta" style="width:100%;min-height:80px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,0,255,0.4);border-radius:10px;padding:12px;color:#fff;font-size:14px;resize:vertical;outline:none;box-sizing:border-box;">' + escSrv(data.text) + '</textarea>'
            + '<div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;">'
            + '<button id="edit-srv-cancel" style="background:rgba(255,255,255,0.08);border:none;border-radius:8px;color:#aaa;padding:10px 18px;cursor:pointer;font-size:14px;">Cancelar</button>'
            + '<button id="edit-srv-save" style="background:linear-gradient(135deg,#8b00ff,#ff00ff);border:none;border-radius:8px;color:#fff;padding:10px 18px;cursor:pointer;font-size:14px;font-weight:600;">Salvar</button>'
            + '</div></div>';

        overlay.addEventListener('click', function(ev) { if (ev.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);

        document.getElementById('edit-srv-cancel').onclick = function() { overlay.remove(); };
        document.getElementById('edit-srv-save').onclick = function() { confirmEditServerMessage(msgId); };

        var ta = document.getElementById('edit-srv-ta');
        if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    };

    function confirmEditServerMessage(msgId) {
        var newText = document.getElementById('edit-srv-ta') && document.getElementById('edit-srv-ta').value.trim();
        if (!newText) return;

        var data = serverMsgStore[msgId];
        if (data && data.el) {
            var textEl = data.el.querySelector('.msg-text');
            if (textEl) {
                textEl.textContent = newText;
                data.text = newText;
            }
            // Tenta emitir para o servidor
            var sock = window.socket;
            if (sock && sock.connected) {
                sock.emit('message:edit', { msgId: msgId, text: newText, channel: window.currentChannel, communityId: window.currentServerId });
            }
            srvToast('✅ Mensagem editada!');
        }
        document.getElementById('edit-srv-overlay') && document.getElementById('edit-srv-overlay').remove();
    }

    // ── Excluir mensagem do servidor ──
    window.deleteServerMessage = function(msgId) {
        document.querySelectorAll('.srv-msg-ctx-menu').forEach(function(m) { m.remove(); });
        var data = serverMsgStore[msgId];
        if (!data) return;

        if (!confirm('Excluir esta mensagem?')) return;

        if (data.el && data.el.parentNode) {
            data.el.style.transition = 'opacity 0.3s, transform 0.3s';
            data.el.style.opacity = '0';
            data.el.style.transform = 'translateX(40px)';
            setTimeout(function() {
                data.el.parentNode && data.el.parentNode.removeChild(data.el);
            }, 300);
        }

        // Tenta emitir para o servidor
        var sock = window.socket;
        if (sock && sock.connected) {
            sock.emit('message:delete', { msgId: msgId, channel: window.currentChannel, communityId: window.currentServerId });
        }

        delete serverMsgStore[msgId];
        srvToast('✅ Mensagem excluída!');
    };

    // ── Reagir com emoji na mensagem do servidor ──
    window.showServerReactPicker = function(e, msgId) {
        e.stopPropagation();
        document.querySelectorAll('.srv-msg-ctx-menu').forEach(function(m) { m.remove(); });
        document.querySelectorAll('.srv-react-picker').forEach(function(p) { p.remove(); });

        var picker = document.createElement('div');
        picker.className = 'srv-react-picker';
        picker.style.cssText = 'position:fixed;left:' + Math.min(e.clientX, window.innerWidth - 280) + 'px;top:' + Math.min(e.clientY, window.innerHeight - 80) + 'px;background:#12121a;border:1px solid #ff00ff;border-radius:12px;box-shadow:0 0 25px rgba(255,0,255,0.3);z-index:100002;padding:10px;display:flex;flex-wrap:wrap;gap:4px;max-width:270px;animation:ctxFadeIn 0.15s ease-out;';

        QUICK_EMOJIS.forEach(function(emoji) {
            var btn = document.createElement('button');
            btn.textContent = emoji;
            btn.title = 'Reagir com ' + emoji;
            btn.style.cssText = 'background:transparent;border:none;font-size:22px;cursor:pointer;border-radius:6px;padding:4px;transition:transform 0.15s,background 0.15s;width:36px;height:36px;';
            btn.onmouseenter = function() { btn.style.transform = 'scale(1.3)'; btn.style.background = 'rgba(255,0,255,0.15)'; };
            btn.onmouseleave = function() { btn.style.transform = 'scale(1)'; btn.style.background = 'transparent'; };
            btn.onclick = function() {
                addServerReaction(msgId, emoji);
                picker.remove();
            };
            picker.appendChild(btn);
        });

        document.body.appendChild(picker);
    };

    function addServerReaction(msgId, emoji) {
        var data = serverMsgStore[msgId];
        if (!data || !data.el) { srvToast(emoji + ' Reação adicionada!'); return; }

        var reactBar = data.el.querySelector('.srv-react-bar');
        if (!reactBar) {
            reactBar = document.createElement('div');
            reactBar.className = 'srv-react-bar';
            reactBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;padding-left:52px;';
            var msgBody = data.el.querySelector('.msg-body');
            if (msgBody) msgBody.appendChild(reactBar);
            else data.el.appendChild(reactBar);
        }

        var existing = reactBar.querySelector('[data-emoji="' + emoji + '"]');
        if (existing) {
            var count = parseInt(existing.dataset.count || '1') + 1;
            existing.dataset.count = count;
            existing.querySelector('.react-count') && (existing.querySelector('.react-count').textContent = count);
        } else {
            var chip = document.createElement('div');
            chip.dataset.emoji = emoji;
            chip.dataset.count = '1';
            chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(255,0,255,0.12);border:1px solid rgba(255,0,255,0.3);border-radius:12px;padding:2px 8px;cursor:pointer;font-size:13px;transition:background 0.15s;';
            chip.innerHTML = emoji + ' <span class="react-count" style="color:#eee;font-size:12px;">1</span>';
            chip.onmouseenter = function() { chip.style.background = 'rgba(255,0,255,0.22)'; };
            chip.onmouseleave = function() { chip.style.background = 'rgba(255,0,255,0.12)'; };
            chip.onclick = function() {
                var c = parseInt(chip.dataset.count || '1') + 1;
                chip.dataset.count = c;
                chip.querySelector('.react-count').textContent = c;
            };
            reactBar.appendChild(chip);
        }

        srvToast(emoji + ' Reação adicionada!');
    }

    // ── Encaminhar mensagem do servidor ──
    window.forwardServerMessage = function(msgId) {
        document.querySelectorAll('.srv-msg-ctx-menu').forEach(function(m) { m.remove(); });
        var data = serverMsgStore[msgId];
        if (!data) return;

        var srvs = JSON.parse(localStorage.getItem('zx_servers') || '[]').filter(function(s) { return !String(s.id||'').startsWith('comm_'); });
        var frds = JSON.parse(localStorage.getItem('zx_friends') || '[]');
        var privateMessages = JSON.parse(localStorage.getItem('private_messages') || '{}');

        var html = '';
        if (srvs.length > 0) {
            html += '<div style="color:#aaa;font-size:11px;font-weight:700;text-transform:uppercase;margin:8px 0 4px;letter-spacing:0.5px;">Servidores</div>';
            srvs.slice(0,8).forEach(function(srv) {
                var ch = (srv.channels||[]).find(function(c) { return c.type==='text'; }) || (srv.channels||[])[0];
                html += '<div onclick="doForwardServer(\'' + msgId + '\',\'server\',\'' + srv.id + '\',\'' + (ch?ch.id:'') + '\')" style="padding:10px 12px;border-radius:8px;cursor:pointer;color:#eee;font-size:14px;transition:background 0.15s;" onmouseenter="this.style.background=\'rgba(255,0,255,0.12)\'" onmouseleave="this.style.background=\'transparent\'">🌐 ' + (srv.name||'Servidor') + '</div>';
            });
        }
        if (frds.length > 0) {
            html += '<div style="color:#aaa;font-size:11px;font-weight:700;text-transform:uppercase;margin:8px 0 4px;letter-spacing:0.5px;">Mensagens Diretas</div>';
            frds.slice(0,8).forEach(function(f) {
                var name = f.username||f;
                html += '<div onclick="doForwardServer(\'' + msgId + '\',\'dm\',\'' + name + '\',\'\')" style="padding:10px 12px;border-radius:8px;cursor:pointer;color:#eee;font-size:14px;transition:background 0.15s;" onmouseenter="this.style.background=\'rgba(255,0,255,0.12)\'" onmouseleave="this.style.background=\'transparent\'">💬 ' + name + '</div>';
            });
        }

        if (!html) { srvToast('⚠️ Nenhum destino disponível'); return; }

        var preview = data.text.length > 80 ? data.text.slice(0,80)+'…' : data.text;

        var overlay = document.createElement('div');
        overlay.id = 'fwd-srv-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000002;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = '<div style="background:#12121a;border:1px solid #ff00ff;border-radius:16px;padding:20px;width:90%;max-width:360px;box-shadow:0 0 40px rgba(255,0,255,0.3);max-height:80vh;overflow-y:auto;">'
            + '<div style="color:#fff;font-weight:700;font-size:16px;margin-bottom:8px;">📤 Encaminhar mensagem</div>'
            + '<div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:8px 12px;margin-bottom:12px;color:#ccc;font-size:13px;border-left:3px solid #ff00ff;">' + escSrv(preview) + '</div>'
            + '<div style="color:#aaa;font-size:13px;margin-bottom:6px;">Escolha o destino:</div>'
            + html
            + '<button id="fwd-srv-cancel" style="width:100%;margin-top:12px;background:rgba(255,255,255,0.06);border:none;border-radius:8px;color:#aaa;padding:10px;cursor:pointer;">Cancelar</button>'
            + '</div>';

        overlay.addEventListener('click', function(ev) { if (ev.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
        document.getElementById('fwd-srv-cancel') && (document.getElementById('fwd-srv-cancel').onclick = function() { overlay.remove(); });
    };

    window.doForwardServer = function(msgId, type, targetId, channelId) {
        document.getElementById('fwd-srv-overlay') && document.getElementById('fwd-srv-overlay').remove();
        var data = serverMsgStore[msgId];
        if (!data) return;

        var sock = window.socket;
        if (type === 'server') {
            if (sock && sock.connected) {
                sock.emit('message', { channel: channelId, text: '📤 ' + data.text, communityId: targetId });
                srvToast('✅ Mensagem encaminhada para o servidor!');
            } else {
                srvToast('⚠️ Sem conexão com o servidor');
            }
        } else if (type === 'dm') {
            var privateMessages = JSON.parse(localStorage.getItem('private_messages') || '{}');
            if (!privateMessages[targetId]) privateMessages[targetId] = [];
            privateMessages[targetId].push({ id: Date.now(), text: '📤 ' + data.text, sender: 'me', timestamp: new Date().toISOString(), pinned: false });
            localStorage.setItem('private_messages', JSON.stringify(privateMessages));
            srvToast('✅ Mensagem encaminhada para ' + targetId + '!');
        }
    };

    // ── Utilitários ──
    function srvToast(msg) {
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#12121a;border:1px solid #ff00ff;padding:12px 24px;border-radius:8px;color:#fff;z-index:1000001;font-size:14px;pointer-events:none;animation:ctxFadeIn 0.3s ease;';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 3000);
    }

    function escSrv(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

})();
