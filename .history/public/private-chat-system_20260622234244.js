// ================================================
// ✅ SISTEMA COMPLETO DE CHAT PRIVADO
// ✅ Funcionalidades: Chamadas, Fixar mensagens, Grupos, Perfil
// ✅ Integração com sistema de amigos
// ================================================

(() => {
    let activePrivateChat = null;
    let pinnedMessages = JSON.parse(localStorage.getItem('pinned_messages') || '{}');
    let privateMessages = JSON.parse(localStorage.getItem('private_messages') || '{}');

    // 🔹 IMPLEMENTAÇÃO DO MÉTODO OPENCONVERSATION
    if (window.FriendsSystem) {
        FriendsSystem.prototype.openConversation = function(username) {
            openPrivateChat(username);
        };
    }

    // 🔹 ABRIR CHAT PRIVADO
    function openPrivateChat(username) {
        closePrivateChat();
        
        activePrivateChat = username;
        
        const modal = document.createElement('div');
        modal.id = 'private-chat-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #0a0012;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s ease-out;
        `;

        modal.innerHTML = `
            <!-- ✅ BARRA SUPERIOR DO CHAT -->
            <div style="
                height: 60px;
                background: #12121a;
                border-bottom: 1px solid rgba(255,0,255,0.2);
                display: flex;
                align-items: center;
                padding: 0 16px;
                gap: 12px;
            ">
                <button onclick="closePrivateChat()" style="
                    background: rgba(255,255,255,0.05);
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                ">←</button>

                <div style="
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #8b00ff, #ff00ff);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 18px;
                ">${username[0].toUpperCase()}</div>

                <div style="flex: 1;">
                    <div style="color: white; font-weight: 600; font-size: 16px;">${username}</div>
                    <div style="color: #00ff88; font-size: 12px;">● Online</div>
                </div>

                <!-- ✅ BOTÕES DA BARRA SUPERIOR -->
                <button onclick="startVoiceCall('${username}')" style="
                    background: rgba(0,255,136,0.1);
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    color: #00ff88;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                " title="Iniciar chamada de voz">📞</button>

                <button onclick="startVideoCall('${username}')" style="
                    background: rgba(0,150,255,0.1);
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    color: #0096ff;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                " title="Iniciar chamada de vídeo">📹</button>

                <button onclick="createGroupWith('${username}')" style="
                    background: rgba(255,0,255,0.1);
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    color: #ff00ff;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                " title="Criar grupo">👥</button>

                <button onclick="showUserProfile('${username}')" style="
                    background: rgba(255,255,255,0.05);
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                " title="Ver perfil">👤</button>

                <button onclick="toggleChatOptions('${username}')" style="
                    background: rgba(255,255,255,0.05);
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                " title="Mais opções">⋮</button>
            </div>

            <!-- ✅ MENSAGENS FIXADAS -->
            <div id="pinned-bar-${username}" style="
                background: rgba(255,200,0,0.1);
                border-bottom: 1px solid rgba(255,200,0,0.2);
                padding: 8px 16px;
                display: none;
                cursor: pointer;
            " onclick="showPinnedMessages('${username}')">
                <span style="color: #ffc800;">📌</span>
                <span style="color: #aaa; margin-left: 8px; font-size: 13px;">Mensagens fixadas</span>
                <span id="pinned-count-${username}" style="color: #ffc800; margin-left: 8px; font-size: 12px;">0</span>
            </div>

            <!-- ✅ ÁREA DAS MENSAGENS -->
            <div id="private-chat-messages" style="
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                background: #0a0012;
            ">
            </div>

            <!-- ✅ CAMPO DE ENVIO -->
            <div style="
                padding: 12px 16px;
                background: rgba(0,0,0,0.4);
                border-top: 1px solid rgba(255,0,255,0.2);
                display: flex;
                gap: 8px;
                align-items: center;
                width: 100%;
                box-sizing: border-box;
            ">
                <textarea id="private-chat-input" placeholder="Digite sua mensagem..." style="
                    width: calc(100% - 60px);
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,0,255,0.3);
                    border-radius: 24px;
                    padding: 12px 16px;
                    color: white;
                    outline: none;
                    font-size: 14px;
                    resize: vertical;
                    max-height: 150px;
                    min-height: 44px;
                    font-family: inherit;
                    box-sizing: border-box;
                "></textarea>
                
                <button onclick="sendPrivateMessage('${username}')" style="
                    background: linear-gradient(135deg, #8b00ff, #ff00ff);
                    border: none;
                    border-radius: 50%;
                    width: 44px;
                    height: 44px;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                ">➤</button>
            </div>

            <!-- ✅ MENU DE OPÇÕES -->
            <div id="chat-options-${username}" class="chat-options-menu hidden" style="
                position: absolute;
                top: 60px;
                right: 16px;
                background: #1a002b;
                border: 1px solid rgba(255,0,255,0.3);
                border-radius: 12px;
                padding: 8px;
                z-index: 1000000;
                min-width: 180px;
            ">
                <button onclick="toggleNotifications('${username}')" style="
                    width: 100%;
                    padding: 10px 12px;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    color: white;
                    text-align: left;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">🔔 Notificações</button>
                
                <button onclick="clearChatHistory('${username}')" style="
                    width: 100%;
                    padding: 10px 12px;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    color: white;
                    text-align: left;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">🗑️ Limpar histórico</button>
                
                <button onclick="blockUser('${username}')" style="
                    width: 100%;
                    padding: 10px 12px;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    color: #ff4444;
                    text-align: left;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">⛔ Bloquear usuário</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Carregar mensagens
        renderPrivateMessages(username);
        
        // Atualizar barra de fixadas
        updatePinnedBar(username);

        // Focar no input
        setTimeout(() => {
            const input = document.getElementById('private-chat-input');
            input.focus();
            
            // Enter para enviar, Shift+Enter para nova linha
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendPrivateMessage(username);
                }
            });
        }, 300);
    }

    // Redirecionar para o sistema correto de DM em tempo real (socket.io + Neon DB)
    window.openPrivateChat = function(targetUsername) {
      if (!targetUsername) return;
      var btn = document.getElementById('btn-dm-list') ||
                document.getElementById('btn-dm-list-sidebar') ||
                document.getElementById('btn-dm-list-dm');
      if (btn) btn.click();
      setTimeout(function() {
        if (typeof openDmChat === 'function') {
          openDmChat(targetUsername);
          if (window.socket && window.socket.connected) {
            window.socket.emit('dm:history', { with: targetUsername });
          }
        }
      }, 250);
    };

    // 🔹 FECHAR CHAT PRIVADO
    window.closePrivateChat = function() {
        document.getElementById('private-chat-modal')?.remove();
        activePrivateChat = null;
    }

    // 🔹 ENVIAR MENSAGEM PRIVADA
    window.sendPrivateMessage = function(username) {
        const input = document.getElementById('private-chat-input');
        const text = input.value.trim();
        if (!text) return;

        if (!privateMessages[username]) privateMessages[username] = [];
        
        const message = {
            id: Date.now(),
            text: text,
            sender: 'me',
            timestamp: new Date().toISOString(),
            pinned: false
        };

        privateMessages[username].push(message);
        savePrivateMessages();
        
        renderPrivateMessages(username);
        input.value = '';
    }

    // 🔹 RENDERIZAR MENSAGENS
    function renderPrivateMessages(username) {
        const area = document.getElementById('private-chat-messages');
        if (!area) return;

        const messages = privateMessages[username] || [];

        if (messages.length === 0) {
            area.innerHTML = `
                <div style="
                    text-align: center;
                    padding: 60px 20px;
                    color: #666;
                ">
                    <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.3;">💬</div>
                    <div style="font-size: 14px;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        word-break: break-word;
                        white-space: pre-wrap;
                        overflow: hidden;">Nenhuma mensagem ainda</div>
                    <div style="font-size: 12px; margin-top: 4px;">Envie a primeira mensagem para ${username}!</div>
                </div>
            `;
            return;
        }

        area.innerHTML = messages.map(msg => {
            const isMe = msg.sender === 'me';
            return `
                <div style="
                    display: flex;
                    justify-content: ${isMe ? 'flex-end' : 'flex-start'};
                    margin-bottom: 12px;
                    position: relative;
                " oncontextmenu="showMessageContextMenu(event, '${username}', ${msg.id}, ${isMe})">
<div style="
    max-width: min(75%, 700px);
    width: fit-content;
    box-sizing: border-box;
    display: inline-block;

    background: ${isMe ? 'linear-gradient(135deg, #8b00ff, #ff00ff)' : '#1a1a2e'};
    border-radius: ${isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};
    padding: 10px 14px;

    color: white;
    font-size: 14px;
    line-height: 1.45;

    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
    word-wrap: break-word;

    overflow-x: hidden;

    ${msg.pinned ? 'border: 1px solid #ffc800;' : ''}
">
                        ${msg.text}
                    </div>
                </div>
            `;
        }).join('');

        area.scrollTop = area.scrollHeight;
    }

    // 🔹 MENU CONTEXTUAL DAS MENSAGENS
    window.showMessageContextMenu = function(e, username, messageId, isMe) {
        e.preventDefault();
        e.stopPropagation();

        document.querySelectorAll('.message-ctx-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'message-ctx-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${Math.min(e.clientX, window.innerWidth - 200)}px;
            top: ${Math.min(e.clientY, window.innerHeight - 220)}px;
            background: #12121a;
            border: 1px solid #ff00ff;
            border-radius: 12px;
            box-shadow: 0 0 25px rgba(255, 0, 255, 0.3);
            z-index: 10000;
            min-width: 180px;
            padding: 8px;
        `;

        const ownItems = isMe ? `
            <div class="ctx-item" onclick="editPrivateMessage('${username}', ${messageId})">✏️ Editar</div>
            <div class="ctx-item ctx-danger" onclick="deleteMessage('${username}', ${messageId})">🗑️ Excluir</div>
        ` : '';
        menu.innerHTML = ownItems + `
            <div class="ctx-item" onclick="showPrivateReactPicker(event, '${username}', ${messageId})">😀 Reagir</div>
            <div class="ctx-item" onclick="forwardPrivateMessage(${messageId})">📤 Encaminhar</div>
            <div class="ctx-item" onclick="pinMessage('${username}', ${messageId})">📌 Fixar mensagem</div>
            <div class="ctx-item" onclick="copyMessage(${messageId})">📋 Copiar</div>
        `;

        document.body.appendChild(menu);

        setTimeout(() => {
            document.addEventListener('click', function closeMenu(evt) {
                if (!menu.contains(evt.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            }, { once: false });
        }, 10);
    }

    // 🔹 FIXAR MENSAGEM
    window.pinMessage = function(username, messageId) {
        if (!privateMessages[username]) return;
        
        const msg = privateMessages[username].find(m => m.id === messageId);
        if (msg) {
            msg.pinned = !msg.pinned;
            savePrivateMessages();
            renderPrivateMessages(username);
            updatePinnedBar(username);
            showToast(msg.pinned ? '✅ Mensagem fixada!' : '✅ Mensagem desfixada!');
        }

        document.querySelectorAll('.message-ctx-menu').forEach(m => m.remove());
    }

    // 🔹 ATUALIZAR BARRA DE MENSAGENS FIXADAS
    function updatePinnedBar(username) {
        const bar = document.getElementById(`pinned-bar-${username}`);
        const countEl = document.getElementById(`pinned-count-${username}`);
        
        if (!bar || !countEl) return;

        const pinned = (privateMessages[username] || []).filter(m => m.pinned);
        
        if (pinned.length > 0) {
            bar.style.display = 'block';
            countEl.textContent = pinned.length;
        } else {
            bar.style.display = 'none';
        }
    }

    // 🔹 MOSTRAR MENSAGENS FIXADAS
    window.showPinnedMessages = function(username) {
        const pinned = (privateMessages[username] || []).filter(m => m.pinned);
        
        if (pinned.length === 0) return;
        
        alert(`📌 ${pinned.length} mensagens fixadas:\n\n${pinned.map(m => `• ${m.text}`).join('\n')}`);
    }

    // 🔹 SALVAR MENSAGENS NO LOCALSTORAGE
    function savePrivateMessages() {
        localStorage.setItem('private_messages', JSON.stringify(privateMessages));
    }

    // 🔹 COPIAR MENSAGEM
    window.copyMessage = function(messageId) {
        let allMessages = Object.values(privateMessages).flat();
        const msg = allMessages.find(m => m.id === messageId);
        
        if (msg) {
            navigator.clipboard.writeText(msg.text).then(() => {
                showToast('✅ Mensagem copiada!');
            });
        }
        
        document.querySelectorAll('.message-ctx-menu').forEach(m => m.remove());
    }

    // 🔹 EXCLUIR MENSAGEM
    window.deleteMessage = function(username, messageId) {
        if (!privateMessages[username]) return;
        
        privateMessages[username] = privateMessages[username].filter(m => m.id !== messageId);
        savePrivateMessages();
        renderPrivateMessages(username);
        updatePinnedBar(username);
        
        showToast('✅ Mensagem excluída!');
        document.querySelectorAll('.message-ctx-menu').forEach(m => m.remove());
    }

    // 🔹 RESPONDER MENSAGEM
    window.replyMessage = function(messageId) {
        const input = document.getElementById('private-chat-input');
        if (input) {
            input.focus();
            showToast('💬 Modo resposta ativado');
        }
        document.querySelectorAll('.message-ctx-menu').forEach(m => m.remove());
    }

    // 🔹 FUNÇÕES AUXILIARES
    window.toggleChatOptions = function(username) {
        const menu = document.getElementById(`chat-options-${username}`);
        menu.classList.toggle('hidden');
    }

    window.clearChatHistory = function(username) {
        if (confirm('Tem certeza que deseja limpar todo o histórico deste chat?')) {
            privateMessages[username] = [];
            savePrivateMessages();
            renderPrivateMessages(username);
            updatePinnedBar(username);
            showToast('✅ Histórico limpo!');
        }
    }

    window.toggleNotifications = function(username) {
        showToast('🔔 Notificações alternadas');
    }

    window.blockUser = function(username) {
        if (confirm(`Tem certeza que deseja bloquear ${username}?`)) {
            closePrivateChat();
            showToast(`⛔ ${username} foi bloqueado`);
        }
    }

    // 🔹 SISTEMA DE CHAMADA PERSISTENTE PARA CHAT PRIVADO
    window.privateCallState = {
        isInCall: false,
        callType: null, // 'voice' / 'video'
        targetUser: null,
        startTime: null,
        durationInterval: null
    };

    // Criar barra de chamada persistente para privado
    function createPrivateCallBar() {
        if (document.getElementById('private-persistent-call-bar')) return;
        
        const callBar = document.createElement('div');
        callBar.id = 'private-persistent-call-bar';
        callBar.className = 'private-call-bar hidden';
        callBar.innerHTML = `
            <div class="pcb-left">
                <div class="pcb-icon">📞</div>
                <div class="pcb-info">
                    <div class="pcb-title">Em chamada privada com: <span id="pcb-private-username"></span></div>
                    <div class="pcb-subtitle">
                        <span id="pcb-private-type"></span>
                        <span class="pcb-dot">•</span>
                        <span id="pcb-private-duration">00:00</span>
                    </div>
                </div>
            </div>
            <div class="pcb-controls">
                <button class="pcb-btn" id="pcb-private-toggle-mic" title="Alternar microfone">🎙</button>
                <button class="pcb-btn" id="pcb-private-toggle-audio" title="Alternar áudio">🔊</button>
                <button class="pcb-btn pcb-btn-primary" id="pcb-private-return">Abrir chat</button>
                <button class="pcb-btn pcb-btn-danger" id="pcb-private-leave">Encerrar</button>
            </div>
        `;
        
        document.body.appendChild(callBar);
        
        // Adicionar CSS
        const style = document.createElement('style');
        style.textContent = `
        .private-call-bar {
            position: fixed !important;
            bottom: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 999999 !important;
            background: rgba(18, 18, 26, 0.95) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            border: 1px solid #00ff88 !important;
            border-radius: 60px !important;
            padding: 12px 24px !important;
            display: flex !important;
            gap: 16px !important;
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.5) !important;
            pointer-events: auto !important;
            align-items: center;
            justify-content: space-between;
            animation: callBarIn 0.3s ease-out;
            min-width: 520px;
            max-width: 90vw;
        }

        .private-call-bar.hidden {
            display: none !important;
        }

        @keyframes callBarIn {
            from { opacity: 0; transform: translateX(-50%) translateY(100%); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .private-call-bar .pcb-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .private-call-bar .pcb-icon {
            font-size: 22px;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }

        .private-call-bar .pcb-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .private-call-bar .pcb-title {
            color: #fff;
            font-weight: 600;
            font-size: 14px;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        word-break: break-word;
                        white-space: pre-wrap;
                        overflow: hidden;
        }

        .private-call-bar .pcb-subtitle {
            color: #aaa;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .private-call-bar .pcb-dot {
            color: #666;
        }

        .private-call-bar .pcb-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .private-call-bar .pcb-btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: #fff;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        word-break: break-word;
                        white-space: pre-wrap;
                        overflow: hidden;
            transition: all 0.15s;
        }

        .private-call-bar .pcb-btn:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .private-call-bar .pcb-btn.active {
            background: rgba(0, 255, 136, 0.3);
        }

        .private-call-bar .pcb-btn-primary {
            background: rgba(0, 255, 136, 0.2);
            color: #00ff88;
        }

        .private-call-bar .pcb-btn-primary:hover {
            background: rgba(0, 255, 136, 0.3);
        }

        .private-call-bar .pcb-btn-danger {
            background: rgba(255, 68, 68, 0.2);
            color: #ff4444;
        }

        .private-call-bar .pcb-btn-danger:hover {
            background: rgba(255, 68, 68, 0.3);
        }

        @media (max-width: 768px) {
            .private-call-bar {
                min-width: auto;
                width: calc(100vw - 40px);
                padding: 10px 16px !important;
                gap: 8px !important;
            }
            
            .private-call-bar .pcb-subtitle {
                display: none;
            }
            
            .private-call-bar .pcb-controls {
                gap: 4px;
            }
            
            .private-call-bar .pcb-btn {
                padding: 6px 8px;
            }
        }
        `;
        document.head.appendChild(style);
        
        // Eventos dos botões
        document.getElementById('pcb-private-toggle-mic').addEventListener('click', () => {
            document.getElementById('pcb-private-toggle-mic').classList.toggle('active');
            showToast('🎙 Microfone alternado');
        });

        document.getElementById('pcb-private-toggle-audio').addEventListener('click', () => {
            document.getElementById('pcb-private-toggle-audio').classList.toggle('active');
            showToast('🔊 Áudio alternado');
        });

        document.getElementById('pcb-private-return').addEventListener('click', () => {
            if (window.privateCallState.targetUser) {
                openPrivateChat(window.privateCallState.targetUser);
            }
        });

        document.getElementById('pcb-private-leave').addEventListener('click', () => {
            endPrivateCall();
        });
    }

    function updatePrivateCallBar() {
        createPrivateCallBar();
        const bar = document.getElementById('private-persistent-call-bar');
        
        if (!window.privateCallState.isInCall) {
            bar.classList.add('hidden');
            return;
        }

        bar.classList.remove('hidden');
        document.getElementById('pcb-private-username').textContent = window.privateCallState.targetUser;
        document.getElementById('pcb-private-type').textContent = window.privateCallState.callType === 'voice' ? 'Chamada de voz' : 'Chamada de vídeo';
        
        // Garantir que sempre fique no topo
        if (bar.parentNode === document.body) {
            document.body.appendChild(bar);
        }
    }

    function formatPrivateCallDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function startPrivateCallTimer() {
        let seconds = 0;
        window.privateCallState.durationInterval = setInterval(() => {
            seconds++;
            const el = document.getElementById('pcb-private-duration');
            if (el) el.textContent = formatPrivateCallDuration(seconds);
        }, 1000);
    }

    function stopPrivateCallTimer() {
        if (window.privateCallState.durationInterval) {
            clearInterval(window.privateCallState.durationInterval);
            window.privateCallState.durationInterval = null;
        }
    }

    window.startVoiceCall = function(username) {
        window.privateCallState.isInCall = true;
        window.privateCallState.callType = 'voice';
        window.privateCallState.targetUser = username;
        window.privateCallState.startTime = Date.now();
        
        updatePrivateCallBar();
        startPrivateCallTimer();
        showToast(`📞 Chamada de voz iniciada com ${username}`);
    }

    window.startVideoCall = function(username) {
        window.privateCallState.isInCall = true;
        window.privateCallState.callType = 'video';
        window.privateCallState.targetUser = username;
        window.privateCallState.startTime = Date.now();
        
        updatePrivateCallBar();
        startPrivateCallTimer();
        showToast(`📹 Chamada de vídeo iniciada com ${username}`);
    }

    window.endPrivateCall = function() {
        const user = window.privateCallState.targetUser;
        window.privateCallState.isInCall = false;
        window.privateCallState.callType = null;
        window.privateCallState.targetUser = null;
        stopPrivateCallTimer();
        updatePrivateCallBar();
        showToast(`✅ Chamada com ${user} encerrada`);
    }

    window.createGroupWith = function(username) {
        showToast(`👥 Criando grupo com ${username}...`);
    }

    window.showUserProfile = function(username) {
        showToast(`👤 Carregando perfil de ${username}...`);
    }


    // 🔹 EDITAR MENSAGEM PRIVADA
    window.editPrivateMessage = function(username, messageId) {
        document.querySelectorAll('.message-ctx-menu').forEach(m => m.remove());
        if (!privateMessages[username]) return;
        const msg = privateMessages[username].find(m => m.id === messageId);
        if (!msg) return;
        const overlay = document.createElement('div');
        overlay.id = 'edit-msg-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000002;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = '<div style="background:#12121a;border:1px solid #ff00ff;border-radius:16px;padding:24px;width:90%;max-width:420px;box-shadow:0 0 40px rgba(255,0,255,0.3);">'
            + '<div style="color:#fff;font-weight:700;font-size:16px;margin-bottom:16px;">✏️ Editar mensagem</div>'
            + '<textarea id="edit-msg-ta" style="width:100%;min-height:80px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,0,255,0.4);border-radius:10px;padding:12px;color:#fff;font-size:14px;resize:vertical;outline:none;box-sizing:border-box;">' + msg.text + '</textarea>'
            + '<div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;">'
            + '<button onclick="document.getElementById('edit-msg-overlay').remove()" style="background:rgba(255,255,255,0.08);border:none;border-radius:8px;color:#aaa;padding:10px 18px;cursor:pointer;font-size:14px;">Cancelar</button>'
            + '<button onclick="confirmEditPrivateMessage('' + "' + username + '" + '','' + "' + messageId + '" + '')" style="background:linear-gradient(135deg,#8b00ff,#ff00ff);border:none;border-radius:8px;color:#fff;padding:10px 18px;cursor:pointer;font-size:14px;font-weight:600;">Salvar</button>'
            + '</div></div>';
        // Use a simpler inline approach for the save button
        overlay.querySelector && setTimeout(() => {
            const saveBtn = overlay.querySelectorAll('button')[1];
            if (saveBtn) saveBtn.onclick = () => window.confirmEditPrivateMessage(username, messageId);
        }, 0);
        overlay.addEventListener('click', function(ev) { if(ev.target===overlay) overlay.remove(); });
        document.body.appendChild(overlay);
        const ta = document.getElementById('edit-msg-ta');
        if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    }

    window.confirmEditPrivateMessage = function(username, messageId) {
        const newText = document.getElementById('edit-msg-ta') && document.getElementById('edit-msg-ta').value.trim();
        if (!newText) return;
        const msg = (privateMessages[username] || []).find(function(m) { return m.id === messageId; });
        if (msg) {
            msg.text = newText;
            msg.edited = true;
            savePrivateMessages();
            renderPrivateMessages(username);
            showToast('✅ Mensagem editada!');
        }
        document.getElementById('edit-msg-overlay') && document.getElementById('edit-msg-overlay').remove();
    }

    // 🔹 REAGIR COM EMOJI NA MENSAGEM PRIVADA
    window.showPrivateReactPicker = function(e, username, messageId) {
        e.stopPropagation();
        document.querySelectorAll('.message-ctx-menu').forEach(function(m) { m.remove(); });
        document.querySelectorAll('.private-react-picker').forEach(function(p) { p.remove(); });
        var EMOJIS = ['👍','❤️','😂','😮','😢','😡','🔥','👏','🎉','💯','✨','🥰','🤔','😍','🙏','💪','🫡','😭','🤯','🥳'];
        var picker = document.createElement('div');
        picker.className = 'private-react-picker';
        picker.style.cssText = 'position:fixed;left:' + Math.min(e.clientX, window.innerWidth-280) + 'px;top:' + Math.min(e.clientY, window.innerHeight-80) + 'px;background:#12121a;border:1px solid #ff00ff;border-radius:12px;box-shadow:0 0 25px rgba(255,0,255,0.3);z-index:10002;padding:10px;display:flex;flex-wrap:wrap;gap:4px;max-width:270px;';
        EMOJIS.forEach(function(emoji) {
            var btn = document.createElement('button');
            btn.textContent = emoji;
            btn.title = 'Reagir com ' + emoji;
            btn.style.cssText = 'background:transparent;border:none;font-size:22px;cursor:pointer;border-radius:6px;padding:4px;transition:transform 0.15s,background 0.15s;width:36px;height:36px;';
            btn.onmouseenter = function() { btn.style.transform='scale(1.3)'; btn.style.background='rgba(255,0,255,0.15)'; };
            btn.onmouseleave = function() { btn.style.transform='scale(1)'; btn.style.background='transparent'; };
            btn.onclick = function() { addPrivateReaction(username, messageId, emoji); picker.remove(); };
            picker.appendChild(btn);
        });
        document.body.appendChild(picker);
        setTimeout(function() {
            document.addEventListener('click', function closePicker(ev) {
                if (!picker.contains(ev.target)) { picker.remove(); document.removeEventListener('click', closePicker); }
            });
        }, 10);
    }

    function addPrivateReaction(username, messageId, emoji) {
        var msg = (privateMessages[username] || []).find(function(m) { return m.id === messageId; });
        if (!msg) return;
        if (!msg.reactions) msg.reactions = {};
        msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;
        savePrivateMessages();
        renderPrivateMessages(username);
        showToast(emoji + ' Reação adicionada!');
    }

    // 🔹 ENCAMINHAR MENSAGEM PRIVADA
    window.forwardPrivateMessage = function(messageId) {
        document.querySelectorAll('.message-ctx-menu').forEach(function(m) { m.remove(); });
        var allMsgs = Object.values(privateMessages).reduce(function(a, b) { return a.concat(b); }, []);
        var msg = allMsgs.find(function(m) { return m.id === messageId; });
        if (!msg) return;
        var srvs = JSON.parse(localStorage.getItem('zx_servers') || '[]').filter(function(s) { return !String(s.id||'').startsWith('comm_'); });
        var frds = JSON.parse(localStorage.getItem('zx_friends') || '[]');
        var html = '';
        if (srvs.length > 0) {
            html += '<div style="color:#aaa;font-size:11px;font-weight:700;text-transform:uppercase;margin:8px 0 4px;letter-spacing:0.5px;">Servidores</div>';
            srvs.slice(0,8).forEach(function(srv) {
                var ch = (srv.channels||[]).find(function(c) { return c.type==='text'; }) || (srv.channels||[])[0];
                html += '<div onclick="doForwardPrivate(' + messageId + ','server','' + srv.id + '','' + (ch?ch.id:'') + '')" style="padding:10px 12px;border-radius:8px;cursor:pointer;color:#eee;font-size:14px;transition:background 0.15s;" onmouseenter="this.style.background='rgba(255,0,255,0.12)'" onmouseleave="this.style.background='transparent'">🌐 ' + (srv.name||'Servidor') + '</div>';
            });
        }
        if (frds.length > 0) {
            html += '<div style="color:#aaa;font-size:11px;font-weight:700;text-transform:uppercase;margin:8px 0 4px;letter-spacing:0.5px;">Mensagens Diretas</div>';
            frds.slice(0,8).forEach(function(f) {
                var name = f.username||f;
                html += '<div onclick="doForwardPrivate(' + messageId + ','dm','' + name + '','')" style="padding:10px 12px;border-radius:8px;cursor:pointer;color:#eee;font-size:14px;transition:background 0.15s;" onmouseenter="this.style.background='rgba(255,0,255,0.12)'" onmouseleave="this.style.background='transparent'">💬 ' + name + '</div>';
            });
        }
        if (!html) { showToast('⚠️ Nenhum destino disponível'); return; }
        var preview = msg.text.length > 80 ? msg.text.slice(0,80)+'…' : msg.text;
        var overlay = document.createElement('div');
        overlay.id = 'forward-msg-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000002;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = '<div style="background:#12121a;border:1px solid #ff00ff;border-radius:16px;padding:20px;width:90%;max-width:360px;box-shadow:0 0 40px rgba(255,0,255,0.3);max-height:80vh;overflow-y:auto;">'
            + '<div style="color:#fff;font-weight:700;font-size:16px;margin-bottom:8px;">📤 Encaminhar mensagem</div>'
            + '<div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:8px 12px;margin-bottom:12px;color:#ccc;font-size:13px;border-left:3px solid #ff00ff;">' + preview + '</div>'
            + '<div style="color:#aaa;font-size:13px;margin-bottom:6px;">Escolha o destino:</div>'
            + html
            + '<button onclick="document.getElementById('forward-msg-overlay').remove()" style="width:100%;margin-top:12px;background:rgba(255,255,255,0.06);border:none;border-radius:8px;color:#aaa;padding:10px;cursor:pointer;">Cancelar</button>'
            + '</div>';
        overlay.addEventListener('click', function(ev) { if(ev.target===overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    }

    window.doForwardPrivate = function(messageId, type, targetId, channelId) {
        document.getElementById('forward-msg-overlay') && document.getElementById('forward-msg-overlay').remove();
        var allMsgs = Object.values(privateMessages).reduce(function(a,b) { return a.concat(b); }, []);
        var msg = allMsgs.find(function(m) { return m.id === messageId; });
        if (!msg) return;
        if (type === 'dm') {
            if (!privateMessages[targetId]) privateMessages[targetId] = [];
            privateMessages[targetId].push({ id: Date.now(), text: '📤 ' + msg.text, sender: 'me', timestamp: new Date().toISOString(), pinned: false });
            savePrivateMessages();
            showToast('✅ Mensagem encaminhada para ' + targetId + '!');
        } else if (type === 'server') {
            var sock = window.socket;
            if (sock && sock.connected) {
                sock.emit('message', { channel: channelId, text: '📤 ' + msg.text, communityId: targetId });
                showToast('✅ Mensagem encaminhada para o servidor!');
            } else {
                showToast('⚠️ Sem conexão com o servidor');
            }
        }
    }

    // 🔹 TOAST HELPER
    function showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #12121a;
            border: 1px solid #ff00ff;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            z-index: 1000001;
            animation: fadeIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }

    // 🔹 FECHAR MENU AO CLICAR FORA
    document.addEventListener('click', () => {
        document.querySelectorAll('.chat-options-menu:not(.hidden)').forEach(m => {
            m.classList.add('hidden');
        });
    });

})();
