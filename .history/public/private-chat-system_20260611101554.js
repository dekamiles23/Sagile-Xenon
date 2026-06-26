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
            ">
                <input id="private-chat-input" type="text" placeholder="Digite sua mensagem..." style="
                    flex: 1;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,0,255,0.3);
                    border-radius: 24px;
                    padding: 12px 16px;
                    color: white;
                    outline: none;
                    font-size: 14px;
                ">
                
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
            input.addEventListener('keydown', e => e.key === 'Enter' && sendPrivateMessage(username));
        }, 300);
    }

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
                    <div style="font-size: 14px;">Nenhuma mensagem ainda</div>
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
                " oncontextmenu="showMessageContextMenu(event, '${username}', ${msg.id})">
                    <div style="
                        max-width: 75%;
                        background: ${isMe ? 'linear-gradient(135deg, #8b00ff, #ff00ff)' : '#1a1a2e'};
                        border-radius: ${isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};
                        padding: 10px 14px;
                        color: white;
                        font-size: 14px;
                        ${msg.pinned ? 'border: 1px solid #ffc800;' : ''}
                    ">
                        ${msg.pinned ? '<span style="color: #ffc800; font-size: 10px;">📌 Fixada</span><br>' : ''}
                        ${msg.text}
                    </div>
                </div>
            `;
        }).join('');

        area.scrollTop = area.scrollHeight;
    }

    // 🔹 MENU CONTEXTUAL DAS MENSAGENS
    window.showMessageContextMenu = function(e, username, messageId) {
        e.preventDefault();
        e.stopPropagation();

        document.querySelectorAll('.message-ctx-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'message-ctx-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            background: #12121a;
            border: 1px solid #ff00ff;
            border-radius: 12px;
            box-shadow: 0 0 25px rgba(255, 0, 255, 0.3);
            z-index: 10000;
            min-width: 180px;
            padding: 8px;
        `;

        menu.innerHTML = `
            <div class="ctx-item" onclick="pinMessage('${username}', ${messageId})">📌 Fixar mensagem</div>
            <div class="ctx-item" onclick="copyMessage(${messageId})">📋 Copiar</div>
            <div class="ctx-item" onclick="replyMessage(${messageId})">↩️ Responder</div>
            <div class="ctx-item ctx-danger" onclick="deleteMessage('${username}', ${messageId})">🗑️ Excluir</div>
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