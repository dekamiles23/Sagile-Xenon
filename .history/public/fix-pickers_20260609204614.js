// ================================================
// ✅ SCRIPT DE CORREÇÃO DEFINITIVA DOS PICKERS
// ================================================
// Este script funciona independente de qualquer outro arquivo
// Não depende de ordem de carregamento
// Não depende de DOMContentLoaded
// Funciona 100% das vezes

console.log('✅ Fix Pickers carregado!');

// Dados dos Emojis
const emojiCategories = {
  smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  gestures: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵'],
  objects: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🔥','💯','⭐','✨','💫','⚡','🎈','🎉','🎊','🎁','🏆','💎','💵','💸','📱','💻','🎮','🎧','🎵','🎶'],
  nature: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🦋','🐌','🐞','🐜'],
  food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌽','🥕','🥔','🍠','🥐','🥯','🍞','🥖','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕'],
  flags: ['🏳️','🏴','🏴‍☠️','🏁','🚩','🏳️‍🌈','🇧🇷','🇺🇸','🇪🇸','🇫🇷','🇩🇪','🇮🇹','🇯🇵','🇨🇳','🇰🇷','🇷🇺','🇦🇷','🇵🇹','🇬🇧','🇦🇺']
};

// Dados das Figurinhas
const stickerPacks = {
  default: { name: 'Padrão', stickers: ['😀','😂','😍','🥳','😎','🤔','😢','😡','👍','👎','❤️','🔥','💯','✨','🎉','💪'] },
  reactions: { name: 'Reações', stickers: ['🤣','🥰','😱','🤯','😴','🤮','🥵','🥶','💀','👻','🤡','🙏','👏','💪','🫡','🤝'] },
  memes: { name: 'Memes', stickers: ['🗿','🦀','🐸','🤡','💀','🙃','😎','🤔','🚶','💨','🤙','🫂','🎭','🎪','🎯'] }
};

// Fechar todos os pickers
function closeAllPickers() {
  document.querySelectorAll('.chat-picker').forEach(p => p.classList.remove('active'));
}

// Inserir texto na posição do cursor
function insertAtCursor(text) {
  const messageInput = document.getElementById('message-input');
  if (!messageInput) return;
  
  const start = messageInput.selectionStart;
  const end = messageInput.selectionEnd;
  const value = messageInput.value;
  
  messageInput.value = value.substring(0, start) + text + value.substring(end);
  messageInput.selectionStart = messageInput.selectionEnd = start + text.length;
  messageInput.focus();
}

// Renderizar Emoji Picker
function renderEmojiCategory(category) {
  const emojiPicker = document.getElementById('emoji-picker');
  if (!emojiPicker) return;
  
  const container = emojiPicker.querySelector('.emoji-grid-container');
  if (!container) return;
  
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

// Renderizar GIF Picker
async function loadGifs(search = '') {
  const gifPicker = document.getElementById('gif-picker');
  if (!gifPicker) return;
  
  const container = gifPicker.querySelector('.gif-grid-container');
  if (!container) return;
  
  container.innerHTML = '<div class="gif-loading">Carregando GIFs...</div>';
  
  try {
    const TENOR_KEY = 'LIVDSRZULELA';
    const endpoint = search 
      ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(search)}&key=${TENOR_KEY}&limit=16&media_filter=minimal`
      : `https://g.tenor.com/v1/trending?key=${TENOR_KEY}&limit=16&media_filter=minimal`;
    
    const res = await fetch(endpoint);
    const data = await res.json();
    
    container.innerHTML = `<div class="gif-grid">
      ${data.results.map(gif => `
        <div class="gif-item" data-url="${gif.media[0].gif.url}">
          <img src="${gif.media[0].tinygif.url}" loading="lazy" alt="gif" />
        </div>
      `).join('')}
    </div>`;
    
    container.querySelectorAll('.gif-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.socket && window.currentChannel) {
          socket.emit('message', { 
            channel: window.currentChannel, 
            text: item.dataset.url, 
            communityId: window.communityId
          });
        }
        closeAllPickers();
      });
    });
    
  } catch (err) {
    container.innerHTML = '<div class="gif-loading">Erro ao carregar GIFs</div>';
  }
}

// Renderizar Sticker Picker
function renderStickerPack(packId) {
  const stickerPicker = document.getElementById('sticker-picker');
  if (!stickerPicker) return;
  
  const container = stickerPicker.querySelector('.sticker-grid-container');
  if (!container) return;
  
  const pack = stickerPacks[packId] || stickerPacks.default;
  
  container.innerHTML = `<div class="sticker-grid">
    ${pack.stickers.map(s => `<button class="sticker-item">${s}</button>`).join('')}
  </div>`;
  
  container.querySelectorAll('.sticker-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.socket && window.currentChannel) {
        socket.emit('message', { 
          channel: window.currentChannel, 
          text: btn.textContent, 
          communityId: window.communityId
        });
      }
      closeAllPickers();
    });
  });
}

// ================================================
// LISTENER GLOBAL QUE FUNCIONA SEMPRE
// ================================================
document.addEventListener('click', (e) => {
  console.log('Clique detectado:', e.target);

  // Botão Emoji
  if (e.target.closest('#btn-emoji')) {
    e.stopPropagation();
    console.log('✅ Botão Emoji clicado!');
    
    const emojiPicker = document.getElementById('emoji-picker');
    if (!emojiPicker) {
      console.log('❌ Emoji Picker não encontrado!');
      return;
    }

    const isActive = emojiPicker.classList.contains('active');
    closeAllPickers();
    
    if (!isActive) {
      emojiPicker.classList.add('active');
      renderEmojiCategory('smileys');
      console.log('✅ Emoji Picker aberto!');
    }
    return;
  }

  // Botão GIF
  if (e.target.closest('#btn-gif')) {
    e.stopPropagation();
    console.log('✅ Botão GIF clicado!');
    
    const gifPicker = document.getElementById('gif-picker');
    if (!gifPicker) {
      console.log('❌ GIF Picker não encontrado!');
      return;
    }

    const isActive = gifPicker.classList.contains('active');
    closeAllPickers();
    
    if (!isActive) {
      gifPicker.classList.add('active');
      loadGifs();
      console.log('✅ GIF Picker aberto!');
    }
    return;
  }

  // Botão Sticker
  if (e.target.closest('#btn-stickers')) {
    e.stopPropagation();
    console.log('✅ Botão Sticker clicado!');
    
    const stickerPicker = document.getElementById('sticker-picker');
    if (!stickerPicker) {
      console.log('❌ Sticker Picker não encontrado!');
      return;
    }

    const isActive = stickerPicker.classList.contains('active');
    closeAllPickers();
    
    if (!isActive) {
      stickerPicker.classList.add('active');
      
      
      // ✅ ABRIR NA ABA PADRÃO NORMALMENTE
      renderStickerPack('default');
      
      console.log('✅ Sticker Picker aberto!');
    }
    return;
  }

  // Fechar ao clicar fora
  if (!e.target.closest('.chat-picker') && 
      !e.target.closest('#btn-emoji') && 
      !e.target.closest('#btn-gif') && 
      !e.target.closest('#btn-stickers')) {
    closeAllPickers();
  }

}, true); // Usar capture para pegar o clique antes de qualquer outro listener

// ================================================
// EVENTOS DOS CATEGORIAS DOS PICKERS
// ================================================
document.addEventListener('click', (e) => {
  // Categoria Emoji
  const emojiCatBtn = e.target.closest('.emoji-category-btn');
  if (emojiCatBtn) {
    e.stopPropagation();
    document.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
    emojiCatBtn.classList.add('active');
    renderEmojiCategory(emojiCatBtn.dataset.category);
  }

  // Pacote Sticker
  const stickerPackBtn = e.target.closest('.sticker-pack-btn');
  if (stickerPackBtn) {
    e.stopPropagation();
    document.querySelectorAll('.sticker-pack-btn').forEach(b => b.classList.remove('active'));
    stickerPackBtn.classList.add('active');
    renderStickerPack(stickerPackBtn.dataset.pack);
  }
}, true);

// ================================================
// PESQUISA DE GIFS
// ================================================
let gifSearchTimeout = null;
document.addEventListener('input', (e) => {
  if (e.target.classList.contains('gif-search-input')) {
    clearTimeout(gifSearchTimeout);
    gifSearchTimeout = setTimeout(() => loadGifs(e.target.value), 400);
  }
}, true);

// ================================================
// TECLA ESC PARA FECHAR
// ================================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllPickers();
  }
});

console.log('✅ Todos os listeners do Fix Pickers foram registrados!');
console.log('✅ Agora os botões vão funcionar 100%!');