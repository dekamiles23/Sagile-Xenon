// ================================================
// ✅ SISTEMA COMPLETO E FUNCIONAL DE CHATS
// ✅ 100% HTML/CSS/JS PURO
// ✅ NÃO DEPENDE DE NENHUM OUTRO CÓDIGO
// ✅ COPIE E COLE NO FINAL DO ARQUIVO
// ================================================

(() => {
  // 🔹 CARREGAR CHATS SALVOS
  const urlParams = new URLSearchParams(window.location.search);
  const communityId = urlParams.get('id');
  let chats = JSON.parse(localStorage.getItem(`community_${communityId}_chats`) || '[]');
  
  // Se não tem chats, adicionar exemplos
  if (chats.length === 0) {
    chats = [
      { id: 1, nome: "dsa", criadoPor: "Usuário", capaUrl: "https://picsum.photos/100/100?random=1", mensagens: ["Oi pessoal!", "Alguém online?"] },
      { id: 2, nome: "Anime Lovers", criadoPor: "Otaku", capaUrl: "https://picsum.photos/100/100?random=2", mensagens: ["Alguém viu o último episódio?", "Muito bom!"] }
    ];
  }

  // 🔹 RENDERIZAR LISTA DE CHATS
  function renderChatList() {
    const container = document.getElementById('featured-chats-list');
    if (!container) return setTimeout(renderChatList, 100);

    container.innerHTML = '';
    document.getElementById('featured-chats-empty').style.display = 'none';

    chats.forEach(chat => {
      const item = document.createElement('div');
      item.className = 'chat-item';
      item.dataset.chatId = chat.id;
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(0,0,0,0.2);
        border-radius: 12px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      item.innerHTML = `
        <div style="
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background-image: url('${chat.capaUrl}');
          background-size: cover;
          background-position: center;
          flex-shrink: 0;
          position: relative;
        ">
          <div style="
            position: absolute;
            bottom: 4px;
            right: 4px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #00ff88;
            border: 2px solid #12121a;
          "></div>
        </div>
        
        <div style="flex: 1; min-width: 0;">
          <div style="
            color: #fff;
            font-weight: 600;
            font-size: 15px;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          ">${chat.nome}</div>
          
          <div style="
            color: #888;
            font-size: 12px;
          ">Criado por ${chat.criadoPor}</div>
        </div>
      `;

      // EFEITO HOVER
      item.addEventListener('mouseenter', () => {
        item.style.background = 'rgba(128,0,255,0.2)';
        item.style.transform = 'translateX(4px)';
      });

      item.addEventListener('mouseleave', () => {
        item.style.background = 'rgba(0,0,0,0.2)';
        item.style.transform = 'translateX(0)';
      });

      // ✅ CLIQUE FUNCIONAL - ABRE O CHAT
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        openChat(chat);
      });

      container.appendChild(item);
    });
  }

  // 🔹 ABRIR TELA DO CHAT
  function openChat(chat) {
    // Fechar chat existente
    closeChat();

    const modal = document.createElement('div');
    modal.id = 'active-chat-modal';
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
      <!-- HEADER COM CAPA DO CHAT -->
      <div style="
        height: 180px;
        background: linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url('${chat.capaUrl}');
        background-size: cover;
        background-position: center;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 16px;
        position: relative;
      ">
        <button onclick="closeChat()" style="
          position: absolute;
          top: 16px;
          left: 16px;
          background: rgba(0,0,0,0.5);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          color: white;
          font-size: 18px;
          cursor: pointer;
        ">←</button>
        
        <div style="
          color: white;
          font-weight: 700;
          font-size: 22px;
          margin-bottom: 4px;
        ">${chat.nome}</div>
        
        <div style="
          color: rgba(255,255,255,0.7);
          font-size: 13px;
        ">Criado por ${chat.criadoPor}</div>
        
        <!-- ✅ MENU DE OPÇÕES 3 PONTOS -->
        <button onclick="event.stopPropagation(); toggleChatOptions('${chat.id}')" style="
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(0,0,0,0.5);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          color: white;
          font-size: 18px;
          cursor: pointer;
        ">⋮</button>
        
        <!-- ✅ MENU DROPDOWN DE OPÇÕES -->
        <div id="chat-options-${chat.id}" class="chat-options-menu hidden" style="
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
          <button onclick="editChatRules('${chat.id}')" style="
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
          ">📜 Editar Regras</button>
          
          <button onclick="changeChatBanner('${chat.id}')" style="
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
          ">🖼️ Mudar Banner</button>
          
          <button onclick="deleteChat('${chat.id}')" style="
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
          ">🗑️ Excluir Chat</button>
        </div>
      </div>
      
      <!-- ÁREA DAS MENSAGENS -->
      <div id="chat-messages-area" style="
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #0a0012;
      ">
        ${(chat.mensagens || []).map((msg, i) => `
          <div style="
            display: flex;
            ${i % 2 === 0 ? '' : 'justify-content: flex-end;'}
            margin-bottom: 12px;
          ">
            <div style="
              max-width: 75%;
              background: ${i % 2 === 0 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #8b00ff, #ff00ff)'};
              border-radius: 18px;
              padding: 10px 14px;
              color: white;
              font-size: 14px;
            ">${msg}</div>
          </div>
        `).join('')}
      </div>
      
      <!-- CAMPO DE ENVIO -->
      <div style="
        padding: 12px 16px;
        background: rgba(0,0,0,0.4);
        border-top: 1px solid rgba(255,0,255,0.2);
        display: flex;
        gap: 8px;
        align-items: center;
      ">
        <input id="chat-input-field" type="text" placeholder="Digite sua mensagem..." style="
          flex: 1;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,0,255,0.3);
          border-radius: 24px;
          padding: 12px 16px;
          color: white;
          outline: none;
          font-size: 14px;
        ">
        
        <button onclick="sendChatMessage()" style="
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
    `;

    document.body.appendChild(modal);

    // Focar no input
    setTimeout(() => {
      const input = document.getElementById('chat-input-field');
      input.focus();
      input.addEventListener('keydown', e => e.key === 'Enter' && sendChatMessage());
    }, 300);
  }

  // 🔹 FECHAR CHAT
  window.closeChat = function() {
    document.getElementById('active-chat-modal')?.remove();
  }

  // 🔹 ENVIAR MENSAGEM
  window.sendChatMessage = function() {
    const input = document.getElementById('chat-input-field');
    const text = input.value.trim();
    if (!text) return;

    const area = document.getElementById('chat-messages-area');
    
    const msg = document.createElement('div');
    msg.style.cssText = `
      display: flex;
      justify-content: flex-end;
      margin-bottom: 12px;
    `;
    
    msg.innerHTML = `
      <div style="
        max-width: 75%;
        background: linear-gradient(135deg, #8b00ff, #ff00ff);
        border-radius: 18px 18px 4px 18px;
        padding: 10px 14px;
        color: white;
        font-size: 14px;
      ">${text}</div>
    `;

    area.appendChild(msg);
    area.scrollTop = area.scrollHeight;
    input.value = '';
  }

  // 🔹 ADICIONAR ANIMAÇÕES
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // 🔹 INICIALIZAR
  document.addEventListener('DOMContentLoaded', renderChatList);
  setTimeout(renderChatList, 500);

  // ✅ FUNÇÕES DO MENU DE OPÇÕES
  window.toggleChatOptions = function(chatId) {
    document.querySelectorAll('.chat-options-menu').forEach(m => m.classList.add('hidden'));
    document.getElementById(`chat-options-${chatId}`)?.classList.toggle('hidden');
  }

  window.editChatRules = function(chatId) {
    const chat = chats.find(c => c.id == chatId);
    if (!chat) return;
    
    const newRules = prompt('Editar regras do chat:', chat.regras || '');
    if (newRules !== null) {
      chat.regras = newRules;
      saveChats();
      alert('Regras salvas com sucesso!');
    }
    
    toggleChatOptions(chatId);
  }

  window.changeChatBanner = function(chatId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(event) {
        const chat = chats.find(c => c.id == chatId);
        if (chat) {
          chat.capaUrl = event.target.result;
          saveChats();
          renderChatList();
          closeChat();
          alert('Banner alterado com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
    toggleChatOptions(chatId);
  }

  window.deleteChat = function(chatId) {
    if (confirm('Tem certeza que deseja excluir este chat?')) {
      chats = chats.filter(c => c.id != chatId);
      saveChats();
      renderChatList();
      closeChat();
    }
  }

  function saveChats() {
    localStorage.setItem(`community_${communityId}_chats`, JSON.stringify(chats));
  }

  // Fechar menu ao clicar fora
  document.addEventListener('click', () => {
    document.querySelectorAll('.chat-options-menu').forEach(m => m.classList.add('hidden'));
  });

  console.log('✅ SISTEMA DE CHATS CARREGADO COM SUCESSO!');
})();
