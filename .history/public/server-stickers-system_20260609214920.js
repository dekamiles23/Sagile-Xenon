// ================================================
// ✅ SISTEMA COMPLETO DE FIGURINHAS DO SERVIDOR
// ================================================

document.addEventListener('DOMContentLoaded', () => {

  // ================================================
  // 1. BOTÃO DE FIGURINHAS NA BARRA
  // ================================================
  const btnStickers = document.getElementById('btn-stickers');
  const stickerModal = document.getElementById('server-stickers-modal');

  // Abrir modal de figurinhas
  btnStickers?.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Fechar outros pickers
    document.querySelectorAll('.chat-picker').forEach(p => p.classList.remove('active'));
    
    // Abrir modal
    stickerModal.classList.remove('hidden');
    
    // Carregar figurinhas do servidor
    loadServerStickers();

    // ✅ ADICIONAR BOTÃO ENVIAR NO RODAPÉ DO MODAL
    if (!document.getElementById('btn-send-sticker-footer')) {
      const modalBody = stickerModal.querySelector('.modal-body');
      const footer = document.createElement('div');
      footer.className = 'sticker-modal-footer';
      footer.innerHTML = `<button class="btn-send-selected-sticker" id="btn-send-sticker-footer" disabled>📤 ENVIAR FIGURINHA</button>`;
      modalBody.appendChild(footer);

      // Evento do botão enviar
      footer.querySelector('#btn-send-sticker-footer').addEventListener('click', () => {
        if (window.selectedSticker) {
          sendSticker(window.selectedSticker);
          stickerModal.classList.add('hidden');
          window.selectedSticker = null;
        }
      });
    }
  });

  // Fechar modal ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#server-stickers-modal') && !e.target.closest('#btn-stickers')) {
      stickerModal.classList.add('hidden');
    }
  });

  // Fechar modal no botão X
  document.getElementById('stickers-modal-close')?.addEventListener('click', () => {
    stickerModal.classList.add('hidden');
  });

  // ================================================
  // 2. CARREGAR FIGURINHAS DO SERVIDOR
  // ================================================
  function loadServerStickers() {
    const serverId = localStorage.getItem('currentServerId');
    const grid = document.getElementById('server-stickers-grid');

    // ✅ STICKERS PADRÃO SEMPRE APARECEM, MESMO SEM SERVIDOR
    const defaultStickers = [
      { id: 'default_1', name: 'Feliz', url: 'https://em-content.zobj.net/thumbs/120/apple/354/grinning-face-with-smiling-eyes_1f604.png', isDefault: true },
      { id: 'default_2', name: 'Rindo', url: 'https://em-content.zobj.net/thumbs/120/apple/354/face-with-tears-of-joy_1f602.png', isDefault: true },
      { id: 'default_3', name: 'Amor', url: 'https://em-content.zobj.net/thumbs/120/apple/354/smiling-face-with-heart-eyes_1f60d.png', isDefault: true },
      { id: 'default_4', name: 'Wow', url: 'https://em-content.zobj.net/thumbs/120/apple/354/astonished-face_1f632.png', isDefault: true },
      { id: 'default_5', name: 'Triste', url: 'https://em-content.zobj.net/thumbs/120/apple/354/crying-face_1f622.png', isDefault: true },
      { id: 'default_6', name: 'Raiva', url: 'https://em-content.zobj.net/thumbs/120/apple/354/angry-face_1f620.png', isDefault: true },
      { id: 'default_7', name: 'Pensando', url: 'https://em-content.zobj.net/thumbs/120/apple/354/thinking-face_1f914.png', isDefault: true },
      { id: 'default_8', name: 'Joinha', url: 'https://em-content.zobj.net/thumbs/120/apple/354/thumbs-up_1f44d.png', isDefault: true },
      { id: 'default_9', name: 'Ok', url: 'https://em-content.zobj.net/thumbs/120/apple/354/ok-hand_1f44c.png', isDefault: true },
      { id: 'default_10', name: 'Dance', url: 'https://cdn3.emoji.gg/emojis/2381-dance.gif', isDefault: true },
    ];

    // Carregar stickers customizados
    let customStickers = [];
    
    // Carregar stickers globais sempre
    const globalStickers = JSON.parse(localStorage.getItem('stickers_global') || '[]');
    
    // Carregar stickers do servidor se tiver servidor
    if (serverId) {
      const serverStickers = JSON.parse(localStorage.getItem(`stickers_${serverId}`) || '[]');
      customStickers = [...globalStickers, ...serverStickers];
    } else {
      customStickers = globalStickers;
    }

    // Juntar stickers padrão + customizados
    const allStickers = [...defaultStickers, ...customStickers];

    grid.innerHTML = '';

    allStickers.forEach(sticker => {
      const stickerItem = document.createElement('div');
      stickerItem.className = 'server-sticker-item';
      if (sticker.isDefault) {
        // ✅ FIGURINHAS PADRÃO SÓ TEM BOTÃO DE VISUALIZAR
        stickerItem.innerHTML = `
          <img src="${sticker.url}" alt="${sticker.name}" loading="lazy" />
          <div class="sticker-actions">
            <button class="sticker-btn-preview" title="Ver figurinha">👁</button>
          </div>
        `;
      } else {
        // ✅ FIGURINHAS CUSTOMIZADAS TEM EDITAR E EXCLUIR
        stickerItem.innerHTML = `
          <img src="${sticker.url}" alt="${sticker.name}" loading="lazy" />
          <div class="sticker-actions">
            <button class="sticker-btn-edit" title="Editar nome">✏️</button>
            <button class="sticker-btn-delete" title="Excluir figurinha">✕</button>
            <button class="sticker-btn-preview" title="Ver figurinha">👁</button>
          </div>
        `;

        // Botão EDITAR NOME
        stickerItem.querySelector('.sticker-btn-edit').addEventListener('click', (e) => {
          e.stopPropagation();
          const novoNome = prompt('Digite o novo nome da figurinha:', sticker.name);
          if (novoNome && novoNome.trim()) {
            sticker.name = novoNome.trim();
            
            const serverId = localStorage.getItem('currentServerId');
            if (serverId) {
              const stickers = JSON.parse(localStorage.getItem(`stickers_${serverId}`) || '[]');
              const index = stickers.findIndex(s => s.id === sticker.id);
              if (index !== -1) {
                stickers[index].name = novoNome.trim();
                localStorage.setItem(`stickers_${serverId}`, JSON.stringify(stickers));
              }
            } else {
              const stickers = JSON.parse(localStorage.getItem('stickers_global') || '[]');
              const index = stickers.findIndex(s => s.id === sticker.id);
              if (index !== -1) {
                stickers[index].name = novoNome.trim();
                localStorage.setItem('stickers_global', JSON.stringify(stickers));
              }
            }
            
            loadServerStickers();
          }
        });

        // Botão EXCLUIR FIGURINHA
        stickerItem.querySelector('.sticker-btn-delete').addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Tem certeza que deseja excluir a figurinha "${sticker.name}"?`)) {
            const serverId = localStorage.getItem('currentServerId');
            if (serverId) {
              let stickers = JSON.parse(localStorage.getItem(`stickers_${serverId}`) || '[]');
              stickers = stickers.filter(s => s.id !== sticker.id);
              localStorage.setItem(`stickers_${serverId}`, JSON.stringify(stickers));
            } else {
              let stickers = JSON.parse(localStorage.getItem('stickers_global') || '[]');
              stickers = stickers.filter(s => s.id !== sticker.id);
              localStorage.setItem('stickers_global', JSON.stringify(stickers));
            }
            loadServerStickers();
          }
        });
      }

      // Botão VISUALIZAR
      stickerItem.querySelector('.sticker-btn-preview').addEventListener('click', (e) => {
        e.stopPropagation();
        showStickerPreview(sticker);
      });

      // ✅ CLICAR NA FIGURINHA SELECIONA ELA
      stickerItem.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          // Remover seleção de todos
          document.querySelectorAll('.server-sticker-item.selected').forEach(el => el.classList.remove('selected'));
          // Selecionar esta
          stickerItem.classList.add('selected');
          // Salvar selecionado
          window.selectedSticker = sticker;
          // Habilitar botão enviar
          const btnSend = document.getElementById('btn-send-sticker-footer');
          if (btnSend) btnSend.disabled = false;
        }
      });

      grid.appendChild(stickerItem);
    });
  }

  // ================================================
  // 3. ENVIAR FIGURINHA NO CHAT
  // ================================================
  function sendSticker(sticker) {
    const serverId = localStorage.getItem('currentServerId');
    const channel = localStorage.getItem('currentChannel');
    const username = localStorage.getItem('userNickname') || 'Usuário';

    const message = {
      id: Date.now(),
      type: 'sticker',
      stickerId: sticker.id,
      stickerUrl: sticker.url,
      stickerName: sticker.name,
      username: username,
      channel: channel,
      serverId: serverId,
      time: new Date().toLocaleTimeString()
    };

    // Mostrar localmente
    const area = document.getElementById('messages-area');
    if (area) {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'message sticker-message';
      msgDiv.innerHTML = `
        <div class="msg-avatar">${username.charAt(0).toUpperCase()}</div>
        <div class="msg-body">
          <div class="msg-meta">
            <span class="msg-username">${username}</span>
            <span class="msg-time">${message.time}</span>
          </div>
          <div class="sticker-container">
            <img src="${sticker.url}" alt="${sticker.name}" class="chat-sticker" />
          </div>
        </div>
      `;
      area.appendChild(msgDiv);
      area.scrollTop = area.scrollHeight;
    }

    // Salvar no histórico
    const key = `channel_${channel}`;
    const messages = JSON.parse(localStorage.getItem(key) || '[]');
    messages.push(message);
    localStorage.setItem(key, JSON.stringify(messages));

    // Enviar para todos os usuários via socket
    if (typeof socket !== 'undefined') {
      socket.emit('message', message);
    }

    alert(`✅ Figurinha "${sticker.name}" enviada!`);
  }

  // ================================================
  // 4. VISUALIZAR FIGURINHA EM TELA CHEIA
  // ================================================
  function showStickerPreview(sticker) {
    const previewModal = document.createElement('div');
    previewModal.className = 'modal-overlay';
    previewModal.style.zIndex = '999999';
    previewModal.style.display = 'flex';
    
    previewModal.innerHTML = `
      <div class="sticker-preview-modal">
        <button class="mm-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <img src="${sticker.url}" alt="${sticker.name}" />
        <div class="sticker-preview-info">
          <div class="sticker-preview-name">${sticker.name}</div>
          <button class="btn-neon" id="btn-send-sticker-preview">📤 ENVIAR FIGURINHA</button>
        </div>
      </div>
    `;

    document.body.appendChild(previewModal);
    
    // ✅ BOTÃO ENVIAR DENTRO DO MODAL FUNCIONANDO
    previewModal.querySelector('#btn-send-sticker-preview').addEventListener('click', () => {
      sendSticker(sticker);
      previewModal.remove();
      document.getElementById('server-stickers-modal').classList.add('hidden');
    });
    
    previewModal.addEventListener('click', (e) => {
      if (e.target === previewModal) previewModal.remove();
    });
  }

  // ================================================
  // 5. UPLOAD DE NOVA FIGURINHA
  // ================================================
  document.getElementById('btn-upload-sticker')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,image/gif';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const serverId = localStorage.getItem('currentServerId');
        
        if (!serverId) {
          // Se não tiver servidor, salva globalmente temporariamente
          const newSticker = {
            id: 'sticker_' + Date.now(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            url: event.target.result,
            uploadedAt: Date.now(),
            uploadedBy: localStorage.getItem('userNickname') || 'Usuário'
          };

          // Adiciona diretamente na lista
          const stickers = JSON.parse(localStorage.getItem('stickers_global') || '[]');
          stickers.push(newSticker);
          localStorage.setItem('stickers_global', JSON.stringify(stickers));

          // Recarregar lista
          loadServerStickers();
          
          alert(`✅ Figurinha "${newSticker.name}" adicionada!`);
          return;
        }
        
        const newSticker = {
          id: 'sticker_' + Date.now(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: event.target.result,
          uploadedAt: Date.now(),
          uploadedBy: localStorage.getItem('userNickname') || 'Usuário'
        };

        // Salvar no servidor
        const stickers = JSON.parse(localStorage.getItem(`stickers_${serverId}`) || '[]');
        stickers.push(newSticker);
        localStorage.setItem(`stickers_${serverId}`, JSON.stringify(stickers));

        // Recarregar lista
        loadServerStickers();
        
        alert(`✅ Figurinha "${newSticker.name}" adicionada!`);
      };
      
      reader.readAsDataURL(file);
    };

    input.click();
  });

  // ================================================
  // 6. ESTILOS CSS DO SISTEMA
  // ================================================
  const styles = `
    /* ================================================
       ✅ ESTILOS DO SISTEMA DE FIGURINHAS
       ================================================ */

    #btn-stickers {
      display: inline-flex !important;
    }

    #server-stickers-modal {
      z-index: 99999 !important;
    }

    #server-stickers-modal .modal-modern {
      width: 650px;
      max-width: 95vw;
      height: 75vh;
    }

    .server-stickers-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      padding: 16px;
      overflow-y: auto;
      height: calc(100% - 150px);
    }

    .server-sticker-item {
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid rgba(255, 0, 255, 0.2);
      background: rgba(0,0,0,0.3);
      cursor: pointer;
      transition: all 0.2s;
    }

    .server-sticker-item:hover {
      border-color: #ff00ff;
      transform: scale(1.05);
      box-shadow: 0 0 20px rgba(255, 0, 255, 0.4);
    }

    .server-sticker-item.selected {
      border-color: #00ff88 !important;
      box-shadow: 0 0 25px rgba(0, 255, 136, 0.6) !important;
    }

    .sticker-modal-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px 16px;
      border-top: 1px solid rgba(255,0,255,0.2);
      display: flex;
      justify-content: flex-end;
      background: #12121a;
    }

    .btn-send-selected-sticker {
      background: #00ff88;
      color: #000;
      border: none;
      padding: 8px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-send-selected-sticker:hover {
      transform: scale(1.05);
      box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
    }

    .btn-send-selected-sticker:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .server-sticker-item img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 8px;
    }

    .sticker-actions {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.9));
      padding: 12px 8px 8px;
      display: flex;
      gap: 8px;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .server-sticker-item:hover .sticker-actions {
      opacity: 1;
    }

    .sticker-btn-edit,
    .sticker-btn-preview {
      background: rgba(255, 0, 255, 0.2);
      border: 1px solid rgba(255, 0, 255, 0.5);
      border-radius: 6px;
      padding: 6px 10px;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.15s;
    }

    .sticker-btn-edit:hover {
      background: #ffaa00;
      border-color: #ffaa00;
      color: #000;
    }

    .sticker-btn-delete:hover {
      background: #ff4444;
      border-color: #ff4444;
      color: #fff;
    }

    .sticker-btn-preview:hover {
      background: #00ffff;
      border-color: #00ffff;
      color: #000;
    }

    .sticker-empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      color: #888;
      font-size: 14px;
    }

    .sticker-preview-modal {
      position: relative;
      background: #12121a;
      border: 2px solid #ff00ff;
      border-radius: 16px;
      max-width: 90vw;
      max-height: 90vh;
      padding: 20px;
      box-shadow: 0 0 40px rgba(255, 0, 255, 0.5);
    }

    .sticker-preview-modal img {
      max-width: 100%;
      max-height: 60vh;
      border-radius: 12px;
      margin-bottom: 16px;
    }

    .sticker-preview-info {
      text-align: center;
    }

    .sticker-preview-name {
      color: #fff;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .sticker-message {
      background: rgba(13, 0, 22, 0.65) !important;
      border-color: rgba(255, 0, 255, 0.35) !important;
    }

    .sticker-container {
      margin-top: 8px;
    }

    .chat-sticker {
      max-width: 180px;
      max-height: 180px;
      border-radius: 8px;
    }

    @media (max-width: 768px) {
      .server-stickers-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
  `;

  // Adicionar estilos na página
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);

  // ================================================
  // 7. ADICIONAR BOTÃO DE FIGURINHAS NA BARRA
  // ================================================
  const inputWrapper = document.querySelector('.input-wrapper');
  
  if (inputWrapper && !document.getElementById('btn-stickers')) {
    const btnGif = document.getElementById('btn-gif');
    
    const stickerBtn = document.createElement('button');
    stickerBtn.type = 'button';
    stickerBtn.className = 'input-action-btn';
    stickerBtn.id = 'btn-stickers';
    stickerBtn.title = 'Figurinhas';
    stickerBtn.textContent = '🎭';
    
    btnGif.after(stickerBtn);
    
    // Reatribuir evento
    stickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.chat-picker').forEach(p => p.classList.remove('active'));
      stickerModal.classList.remove('hidden');
      loadServerStickers();
    });
  }

  console.log('✅ Sistema de figurinhas carregado com sucesso!');
});

// ================================================
// ✅ FUNÇÃO GLOBAL PARA ABRIR FIGURINHAS
// ================================================
window.openStickersModal = function() {
  document.getElementById('server-stickers-modal').classList.remove('hidden');
  document.dispatchEvent(new CustomEvent('stickers:load'));
};
