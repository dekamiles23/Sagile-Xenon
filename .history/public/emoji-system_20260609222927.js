// ================================================
// SISTEMA DE EMOJIS SEPARADO - NÃO BUGA MAIS
// ================================================

document.addEventListener('DOMContentLoaded', () => {

  // Guard: evita carregamento múltiplo
  if (window.__zx_emoji_system_loaded) {
    console.warn('emoji-system.js already loaded — skipping duplicate initialization');
    return;
  }
  window.__zx_emoji_system_loaded = true;

  const btnEmoji = document.getElementById('btn-emoji');
  const emojiPicker = document.getElementById('emoji-picker');
  const messageInput = document.getElementById('message-input');

  // Dados dos Emojis por Categoria
  const emojiCategories = {
    smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
    gestures: ['👋','🤚','🖐','✋','✖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵'],
    objects: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🔥','💯','⭐','✨','💫','⚡','🎈','🎉','🎊','🎁','🏆','💎','💵','💸','📱','💻','🎮','🎧','🎵','🎶'],
    nature: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🦋','🐌','🐞','🐜'],
    food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌽','🥕','🥔','🍠','🥐','🥯','🍞','🥖','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕'],
    flags: ['🏳️','🏴','🏴‍☠️','🏁','🚩','🏳️‍🌈','🇧🇷','🇺🇸','🇪🇸','🇫🇷','🇩🇪','🇮🇹','🇯🇵','🇨🇳','🇰🇷','🇷🇺','🇦🇷','🇵🇹','🇬🇧','🇦🇺']
  };

  // Carregar emojis personalizados do localStorage
  function loadCustomEmojis() {
    try {
      return JSON.parse(localStorage.getItem('customEmojis') || '[]');
    } catch {
      return [];
    }
  }

  // Salvar emoji personalizado
  function saveCustomEmoji(imageData) {
    const customEmojis = loadCustomEmojis();
    customEmojis.push({
      id: Date.now(),
      data: imageData,
      addedAt: Date.now()
    });
    localStorage.setItem('customEmojis', JSON.stringify(customEmojis));
    return customEmojis;
  }

  // Deletar emoji personalizado
  function deleteCustomEmoji(id) {
    let customEmojis = loadCustomEmojis();
    customEmojis = customEmojis.filter(e => e.id !== id);
    localStorage.setItem('customEmojis', JSON.stringify(customEmojis));
    renderEmojiCategory('custom');
  }

  // Inserir texto na posição do cursor
  function insertAtCursor(text) {
    const start = messageInput.selectionStart;
    const end = messageInput.selectionEnd;
    const value = messageInput.value;
    
    messageInput.value = value.substring(0, start) + text + value.substring(end);
    messageInput.selectionStart = messageInput.selectionEnd = start + text.length;
    messageInput.focus();
  }

  // Renderizar categoria de emoji
  function renderEmojiCategory(category) {
    const container = emojiPicker.querySelector('.emoji-grid-container');
    
    if (category === 'custom') {
      const customEmojis = loadCustomEmojis();
      
      if (customEmojis.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: #888;">
            <div style="font-size: 48px; margin-bottom: 12px;">⭐</div>
            <div style="font-size: 14px; margin-bottom: 8px;">Nenhum emoji personalizado</div>
            <div style="font-size: 12px;">Clique no botão + para adicionar seus próprios emojis</div>
          </div>
        `;
        return;
      }
      
      container.innerHTML = `<div class="emoji-grid">
        ${customEmojis.map(e => `
          <button class="emoji-item custom-emoji" data-id="${e.id}">
            <img src="${e.data}" alt="custom emoji" />
            <span class="emoji-delete-btn" data-id="${e.id}">✕</span>
          </button>
        `).join('')}
      </div>`;
      
      // Eventos de clique nos emojis customizados
      container.querySelectorAll('.emoji-item.custom-emoji').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if (e.target.classList.contains('emoji-delete-btn')) {
            e.stopPropagation();
            deleteCustomEmoji(parseInt(e.target.dataset.id));
            return;
          }
          
          const img = btn.querySelector('img');
          insertAtCursor(img.src);
          closeAllPickers();
        });
      });
      
    } else {
      const emojis = emojiCategories[category] || [];
      
      container.innerHTML = `<div class="emoji-grid">
        ${emojis.map(e => `<button class="emoji-item">${e}</button>`).join('')}
      </div>`;
      
      container.querySelectorAll('.emoji-item').forEach(btn => {
        btn.addEventListener('click', () => {
          insertAtCursor(btn.textContent);
          closeAllPickers();
        });
      });
    }
  }

  // Fechar todos os pickers
  function closeAllPickers() {
    emojiPicker.classList.remove('active');
    const gifPicker = document.getElementById('gif-picker');
    if (gifPicker) gifPicker.classList.remove('active');
  }

  // Eventos das categorias
  emojiPicker.querySelectorAll('.emoji-category-btn:not(.emoji-add-btn)').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPicker.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderEmojiCategory(btn.dataset.category);
    });
  });

  // Botão adicionar emoji customizado
  document.getElementById('btn-add-custom-emoji').addEventListener('click', (e) => {
    e.stopPropagation();
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        saveCustomEmoji(event.target.result);
        renderEmojiCategory('custom');
        
        // Selecionar automaticamente a aba custom
        emojiPicker.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
        emojiPicker.querySelector('[data-category="custom"]').classList.add('active');
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  });

  // Botão abrir emoji picker
  btnEmoji.addEventListener('click', (e) => {
    e.stopPropagation();
    const isActive = emojiPicker.classList.contains('active');
    closeAllPickers();
    if (!isActive) {
      emojiPicker.classList.add('active');
      renderEmojiCategory('smileys');
    }
  });

  // Fechar picker ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.chat-picker') && 
        !e.target.closest('#btn-emoji')) {
      emojiPicker.classList.remove('active');
    }
  });

  // Fechar com ESC
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      emojiPicker.classList.remove('active');
    }
  });

  console.log('✅ Sistema de Emojis carregado com sucesso em arquivo separado!');

});