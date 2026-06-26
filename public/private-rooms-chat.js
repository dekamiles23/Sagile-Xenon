// ============================================================
// private-rooms-chat.js – Interface de Chat para Salas Privadas
// ============================================================

function injectPrivateRoomChat() {
  if (document.getElementById('private-room-chat-panel')) return;

  const chatPanel = document.createElement('div');
  chatPanel.id = 'private-room-chat-panel';
  chatPanel.innerHTML = `
    <style>
      #private-room-chat-panel {
        display: none;
        position: fixed;
        top: 0;
        right: 0;
        width: 400px;
        height: 100vh;
        background: rgba(15, 15, 25, 0.98);
        border-left: 1px solid #8b00ff;
        z-index: 9998;
        flex-direction: column;
        box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
      }
      #private-room-chat-panel.active {
        display: flex;
      }
      #private-room-chat-header {
        padding: 16px;
        background: linear-gradient(135deg, rgba(139, 0, 255, 0.2), rgba(255, 0, 255, 0.2));
        border-bottom: 1px solid #8b00ff;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      #private-room-chat-header h3 {
        color: #fff;
        margin: 0;
        font-size: 16px;
      }
      #private-room-chat-close {
        background: none;
        border: none;
        color: #fff;
        font-size: 20px;
        cursor: pointer;
        padding: 4px 8px;
      }
      #private-room-chat-close:hover {
        color: #ed4245;
      }
      #private-room-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #private-room-chat-messages .message {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 10px 12px;
        max-width: 85%;
      }
      #private-room-chat-messages .message.own {
        background: rgba(139, 0, 255, 0.2);
        align-self: flex-end;
        border: 1px solid rgba(139, 0, 255, 0.3);
      }
      #private-room-chat-messages .message.other {
        align-self: flex-start;
      }
      #private-room-chat-messages .message-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      #private-room-chat-messages .message-username {
        color: #ff00ff;
        font-weight: 600;
        font-size: 13px;
      }
      #private-room-chat-messages .message-time {
        color: #666;
        font-size: 11px;
      }
      #private-room-chat-messages .message-text {
        color: #fff;
        font-size: 14px;
        word-wrap: break-word;
      }
      #private-room-chat-input-area {
        padding: 16px;
        border-top: 1px solid #8b00ff;
        display: flex;
        gap: 8px;
      }
      #private-room-chat-input {
        flex: 1;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(139, 0, 255, 0.3);
        border-radius: 20px;
        color: #fff;
        font-size: 14px;
      }
      #private-room-chat-input::placeholder {
        color: #666;
      }
      #private-room-chat-input:focus {
        outline: none;
        border-color: #ff00ff;
      }
      #private-room-chat-send {
        background: linear-gradient(135deg, #8b00ff, #ff00ff);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        cursor: pointer;
        color: #fff;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      }
      #private-room-chat-send:hover {
        transform: scale(1.1);
      }
      #private-room-chat-messages::-webkit-scrollbar {
        width: 6px;
      }
      #private-room-chat-messages::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }
      #private-room-chat-messages::-webkit-scrollbar-thumb {
        background: #8b00ff;
        border-radius: 3px;
      }
    </style>
    
    <div id="private-room-chat-header">
      <h3 id="private-room-chat-title">🏠 Sala Privada</h3>
      <button id="private-room-chat-close">✕</button>
    </div>
    
    <div id="private-room-chat-messages"></div>
    
    <div id="private-room-chat-input-area">
      <input type="text" id="private-room-chat-input" placeholder="Digite sua mensagem...">
      <button id="private-room-chat-send">➤</button>
    </div>
  `;
  
  document.body.appendChild(chatPanel);
  
  // Event listeners
  document.getElementById('private-room-chat-close').addEventListener('click', function() {
    document.getElementById('private-room-chat-panel').classList.remove('active');
  });
  
  document.getElementById('private-room-chat-send').addEventListener('click', function() {
    const input = document.getElementById('private-room-chat-input');
    const text = input.value.trim();
    if (text) {
      window.sendPrivateRoomMessage(text);
      input.value = '';
    }
  });
  
  document.getElementById('private-room-chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      document.getElementById('private-room-chat-send').click();
    }
  });
}

// Abre o painel de chat
window.openPrivateRoomChat = function(roomName) {
  injectPrivateRoomChat();
  const panel = document.getElementById('private-room-chat-panel');
  const title = document.getElementById('private-room-chat-title');
  if (panel && title) {
    title.textContent = '🏠 ' + (roomName || 'Sala Privada');
    panel.classList.add('active');
  }
};

// Fecha o painel de chat
window.closePrivateRoomChat = function() {
  const panel = document.getElementById('private-room-chat-panel');
  if (panel) {
    panel.classList.remove('active');
  }
};

// Adiciona uma mensagem ao chat
function addPrivateRoomMessage(msg) {
  const messagesEl = document.getElementById('private-room-chat-messages');
  if (!messagesEl) return;
  
  const isOwn = msg.username === (window.username || window.currentUsername);
  const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  const msgEl = document.createElement('div');
  msgEl.className = 'message ' + (isOwn ? 'own' : 'other');
  msgEl.innerHTML = `
    <div class="message-header">
      <span class="message-username">${msg.username}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-text">${msg.text}</div>
  `;
  
  messagesEl.appendChild(msgEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Limpa as mensagens do chat
function clearPrivateRoomMessages() {
  const messagesEl = document.getElementById('private-room-chat-messages');
  if (messagesEl) {
    messagesEl.innerHTML = '';
  }
}

// Event listeners para mensagens
document.addEventListener('private-room-joined', function(e) {
  window.openPrivateRoomChat(e.detail.name);
  clearPrivateRoomMessages();
});

document.addEventListener('private-room-message', function(e) {
  const msg = e.detail;
  // Só mostra se for da sala atual
  if (msg.roomId === window.privateRoomsState.currentRoom) {
    addPrivateRoomMessage(msg);
  }
});

document.addEventListener('private-room-history', function(e) {
  const { roomId, messages } = e.detail;
  if (roomId === window.privateRoomsState.currentRoom) {
    clearPrivateRoomMessages();
    messages.forEach(addPrivateRoomMessage);
  }
});
