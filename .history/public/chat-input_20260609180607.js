// Guard: evita carregamento múltiplo que causa declarações duplicadas
if (window.__zx_chat_input_loaded) {
  console.warn('chat-input.js already loaded — skipping duplicate initialization');
} else {
window.__zx_chat_input_loaded = true;

// ✅ 🔴 SISTEMA DE EMOJIS PERSONALIZADOS - VERSÃO FINAL 100% FUNCIONAL
// ✅ REMOVER TODAS AS VERSÕES ANTIGAS ANTES DE DECLARAR
delete window.renderEmojiCategory;
delete window.updateEmojiCategories;

// ✅ FORÇAR ESTA FUNÇÃO COMO A ÚNICA VERSÃO EXISTENTE
window.renderEmojiCategory = renderEmojiCategory;
window.updateEmojiCategories = updateEmojiCategories;

// ✅ BLOQUEAR QUALQUER TENTATIVA DE SOBRESCREVER
Object.defineProperty(window, 'updateEmojiCategories', {
  value: updateEmojiCategories,
  writable: false,
  configurable: false
});

// ✅ EVENTO GLOBAL PARA ATUALIZAR FIGURINHAS EM TEMPO REAL
window.addEventListener('stickerAdded', () => {
  if (stickerPicker.classList.contains('active')) {
    renderStickerPack('server');
  }
});

window.addEventListener('emojiAdded', () => {
  if (emojiPicker.classList.contains('active')) {
    renderEmojiCategory('server');
  }
});

Object.defineProperty(window, 'updateEmojiCategories', {
  value: updateEmojiCategories,
  writable: false,
  configurable: false
});

  // ✅ CORREÇÃO: Espera DOM estar completamente carregado
  document.addEventListener('DOMContentLoaded', () => {

  // ================================================
  // BARRA DE DIGITAÇÃO - FUNCIONALIDADES COMPLETAS
  // ================================================

  const btnEmoji = document.getElementById('btn-emoji');
  const btnGif = document.getElementById('btn-gif');
  const btnStickers = document.getElementById('btn-stickers');
  const emojiPicker = document.getElementById('emoji-picker');
  const gifPicker = document.getElementById('gif-picker');
  const stickerPicker = document.getElementById('sticker-picker');
  const messageInput = document.getElementById('message-input');

// Dados dos Emojis por Categoria
const emojiCategories = {
  smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾'],
  gestures: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👣','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁','👅','👄','🫦','💋','🩸'],
  objects: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🔥','💯','⭐','✨','💫','⚡','🎈','🎉','🎊','🎁','🏆','💎','💵','💸','📱','💻','🎮','🎧','🎵','🎶','🔔','💡','📌','📎','✂️','🔒','🔓','✅','❌','⚠️','💤','💬','👁️‍🗨️','🗨️','🗯️','💭'],
  nature: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🐰','🐇','🐁','🐀','🐹','🦔','🐾'],
  food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🫓','🥨','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🫘','🍯','🍼','🥛','☕','🫖','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🫗','🥤','🧋','🧃','🧉','🧊','🥢','🍽️','🍴','🥄','🔪','🫙','🏺'],
  flags: ['🏳️','🏴','🏴‍☠️','🏁','🚩','🏳️‍🌈','🇧🇷','🇺🇸','🇪🇸','🇫🇷','🇩🇪','🇮🇹','🇯🇵','🇨🇳','🇰🇷','🇷🇺','🇦🇷','🇵🇹','🇬🇧','🇦🇺','🇨🇦','🇲🇽','🇮🇳','🇿🇦']
};

// Dados das Figurinhas
const stickerPacks = {
  default: {
    name: 'Padrão',
    stickers: ['😀','😂','😍','🥳','😎','🤔','😢','😡','👍','👎','❤️','🔥','💯','✨','🎉','💪']
  },
  reactions: {
    name: 'Reações',
    stickers: ['🤣','🥰','😱','🤯','😴','🤮','🥵','🥶','💀','👻','🤡','🙏','👏','💪','🫡','🤝']
  },
  memes: {
    name: 'Memes',
    stickers: ['🗿','🦀','🐸','🤡','💀','🙃','😎','🤔','👁️👄👁️','🚶','💨','🤙','🫂','🎭','🎪','🎯']
  }
};

// Fechar todos os pickers
function closeAllPickers() {
  emojiPicker.classList.remove('active');
  gifPicker.classList.remove('active');
  stickerPicker.classList.remove('active');
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

// ================================================
// EMOJI PICKER
// ================================================

async function renderEmojiCategory(category) {
  const container = emojiPicker.querySelector('.emoji-grid-container');
  
  let emojis = [];
  
  // ✅ CATEGORIA DE EMOJIS DO SERVIDOR - CARREGAR VIA API
  if (category === 'server') {
    try {
      // ✅ BUSCAR EMOJIS VIA ENDPOINT API
      const res = await fetch(`/api/servers/${window.currentServerId}/emojis`);
      const serverEmojis = await res.json();
      
      console.log('[API EMOJIS RECEBIDOS]', serverEmojis);
      
      if (serverEmojis && serverEmojis.length > 0) {
        emojis = serverEmojis;
      } else {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#888">
          <div style="font-size:48px;margin-bottom:16px">📭</div>
          <p>Nenhum emoji adicionado ainda</p>
          <p style="font-size:14px">Vá em Configurações do Servidor → Emojis para adicionar</p>
        </div>`;
        return;
      }
      
    } catch (err) {
      console.error('[ERRO AO CARREGAR EMOJIS]', err);
      container.innerHTML = `<div style="text-align:center;padding:40px;color:#ff6b6b">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <p>Erro ao carregar emojis do servidor</p>
      </div>`;
      return;
    }
  } else {
    emojis = emojiCategories[category] || [];
  }
  
  console.log('[EMOJIS TO RENDER FINAL]', emojis);
  console.log('[CONTAINER]', container);
  
  container.innerHTML = `<div class="emoji-grid">
    ${emojis.map(e => {
      console.log('[RENDERING EMOJI]', e);
      if (typeof e === 'object' && e.name) {
        // Emoji personalizado do servidor
        const emojiUrl = e.emoji || e.image_url || e.url || e.src || e.image;
        if (emojiUrl) {
          return `<button class="emoji-item" data-emoji=":${e.name}:" title=":${e.name}:"><img src="${emojiUrl}" class="custom-emoji" alt="${e.name}" style="width:24px;height:24px;object-fit:contain" /></button>`;
        } else {
          return `<button class="emoji-item" data-emoji=":${e.name}:" title=":${e.name}:">${e.name}</button>`;
        }
      } else {
        // Emoji padrão
        return `<button class="emoji-item">${e}</button>`;
      }
    }).join('')}
  </div>`;
  
  console.log('[ELEMENT CREATED]', container.innerHTML);
  console.log('[APPENDED TO DOM]', container);
  console.log('[CHILDREN COUNT]', container.children.length);
  console.log('[FINAL INNERHTML]', container.innerHTML);
  
  container.querySelectorAll('.emoji-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (btn.dataset.emoji) {
        insertAtCursor(btn.dataset.emoji);
      } else {
        // Para emojis com imagem, pegar o texto do atributo data-emoji
        const emojiCode = btn.getAttribute('data-emoji') || btn.textContent;
        insertAtCursor(emojiCode);
      }
      
      closeAllPickers();
    });
  });
}

// Atualizar categorias de emoji incluindo servidor
function updateEmojiCategories() {
  const categoriesContainer = emojiPicker.querySelector('.emoji-categories');
  const existingServerBtn = categoriesContainer.querySelector('[data-category="server"]');
  
  // Pegar servidor atual diretamente
  const server = window.servers?.find(s => s.id === window.currentServerId);
  if (server && server.emojis && server.emojis.length > 0) {
    // Adicionar botão de categoria do servidor se não existir
    if (!existingServerBtn) {
      const serverBtn = document.createElement('button');
      serverBtn.className = 'emoji-category-btn';
      serverBtn.dataset.category = 'server';
      serverBtn.title = 'Emojis do Servidor';
      serverBtn.innerHTML = '🏠';
      
      serverBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPicker.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
        serverBtn.classList.add('active');
        renderEmojiCategory('server');
      });
      
      // Adicionar como primeira categoria
      categoriesContainer.insertBefore(serverBtn, categoriesContainer.firstChild);
    }
  } else {
    // Remover botão se não houver emojis
    if (existingServerBtn) {
      existingServerBtn.remove();
    }
  }
}

// ✅ BOTÃO EMOJI PICKER
document.getElementById('emojiPickerBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const modal = document.getElementById('emojiPickerModal');
  
  if (modal.style.display === 'flex') {
    modal.style.display = 'none';
  } else {
    modal.style.display = 'flex';
    updateEmojiCategories();
    renderEmojiCategory('smileys');
  }
});

// ✅ BOTÃO FECHAR MODAL
document.getElementById('emojiPickerClose').addEventListener('click', () => {
  document.getElementById('emojiPickerModal').style.display = 'none';
});

// ✅ FECHAR AO CLICAR FORA
document.getElementById('emojiPickerModal').addEventListener('click', (e) => {
  if (e.target.id === 'emojiPickerModal') {
    document.getElementById('emojiPickerModal').style.display = 'none';
  }
});

emojiPicker.querySelectorAll('.emoji-category-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderEmojiCategory(btn.dataset.category);
  });
});

// ================================================
// GIF PICKER (TENOR API)
// ================================================

const TENOR_KEY = 'LIVDSRZULELA'; // Chave pública de teste da Tenor
let gifSearchTimeout = null;

async function loadGifs(search = '') {
  const container = gifPicker.querySelector('.gif-grid-container');
  container.innerHTML = '<div class="gif-loading">Carregando GIFs...</div>';
  
  try {
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
        const gifUrl = item.dataset.url;
  socket.emit('message', { 
    channel: currentChannel, 
    text: gifUrl, 
    communityId
  });
        closeAllPickers();
      });
    });
    
  } catch (err) {
    container.innerHTML = '<div class="gif-loading">Erro ao carregar GIFs</div>';
  }
}

btnGif.addEventListener('click', (e) => {
  e.stopPropagation();
  const isActive = gifPicker.classList.contains('active');
  closeAllPickers();
  if (!isActive) {
    gifPicker.classList.add('active');
    loadGifs();
    gifPicker.querySelector('.gif-search-input').value = '';
  }
});

gifPicker.querySelector('.gif-search-input').addEventListener('input', (e) => {
  clearTimeout(gifSearchTimeout);
  gifSearchTimeout = setTimeout(() => loadGifs(e.target.value), 400);
});

// ================================================
// STICKER PICKER
// ================================================

async function renderStickerPack(packId) {
  const container = stickerPicker.querySelector('.sticker-grid-container');
  
  if (packId === 'server') {
    // ✅ CATEGORIA DE FIGURINHAS DO SERVIDOR
    try {
      const res = await fetch(`/api/servers/${window.currentServerId}/stickers`);
      const serverStickers = await res.json();
      
      if (serverStickers && serverStickers.length > 0) {
        container.innerHTML = `<div class="sticker-grid">
          ${serverStickers.map(s => `
            <button class="sticker-item" data-sticker="${s.image_url}" title="${s.name}">
              <img src="${s.image_url}" alt="${s.name}" style="width:64px;height:64px;object-fit:contain" />
            </button>
          `).join('')}
        </div>`;
      } else {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#888">
          <div style="font-size:48px;margin-bottom:16px">📭</div>
          <p>Nenhuma figurinha adicionada ainda</p>
        </div>`;
      }
      
    } catch (err) {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:#ff6b6b">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <p>Erro ao carregar figurinhas</p>
      </div>`;
      return;
    }
  } else {
    // ✅ FIGURINHAS PADRÃO
    const pack = stickerPacks[packId] || stickerPacks.default;
    container.innerHTML = `<div class="sticker-grid">
      ${pack.stickers.map(s => `<button class="sticker-item">${s}</button>`).join('')}
    </div>`;
  }
  
  container.querySelectorAll('.sticker-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const stickerUrl = btn.dataset.sticker || btn.textContent;
      socket.emit('message', { 
        channel: currentChannel, 
        text: stickerUrl, 
        communityId
      });
      closeAllPickers();
    });
  });
}

// ✅ ATUALIZAR CATEGORIAS DE STICKERS
function updateStickerCategories() {
  const packsContainer = stickerPicker.querySelector('.sticker-packs');
  const existingServerBtn = packsContainer.querySelector('[data-pack="server"]');
  
  if (!existingServerBtn) {
    const serverBtn = document.createElement('button');
    serverBtn.className = 'sticker-pack-btn';
    serverBtn.dataset.pack = 'server';
    serverBtn.title = 'Figurinhas do Servidor';
    serverBtn.innerHTML = '🏠';
    
    serverBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stickerPicker.querySelectorAll('.sticker-pack-btn').forEach(b => b.classList.remove('active'));
      serverBtn.classList.add('active');
      renderStickerPack('server');
    });
    
    // Adicionar como primeira categoria
    packsContainer.insertBefore(serverBtn, packsContainer.firstChild);
  }
}

btnStickers.addEventListener('click', async (e) => {
  e.stopPropagation();
  const isActive = stickerPicker.classList.contains('active');
  closeAllPickers();
  if (!isActive) {
    stickerPicker.classList.add('active');
    
    // ✅ SEMPRE ADICIONAR ABA DO SERVIDOR AO ABRIR O PICKER
    const packsContainer = stickerPicker.querySelector('.sticker-packs');
    packsContainer.querySelectorAll('[data-pack="server"]').forEach(b => b.remove());
    
    const serverBtn = document.createElement('button');
    serverBtn.className = 'sticker-pack-btn';
    serverBtn.dataset.pack = 'server';
    serverBtn.title = 'Figurinhas do Servidor';
    serverBtn.innerHTML = '🏠';
    
    serverBtn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      stickerPicker.querySelectorAll('.sticker-pack-btn').forEach(b => b.classList.remove('active'));
      serverBtn.classList.add('active');
      
      // ✅ BUSCAR FIGURINHAS DIRETAMENTE DA API
      const container = stickerPicker.querySelector('.sticker-grid-container');
      try {
        const res = await fetch(`/api/servers/${window.currentServerId}/stickers`);
        const stickers = await res.json();
        
        if (stickers.length === 0) {
          container.innerHTML = `<div style="text-align:center;padding:40px;color:#888">
            <div style="font-size:48px;margin-bottom:16px">📭</div>
            <p>Nenhuma figurinha ainda</p>
            <p style="font-size:14px">Adicione uma nas configurações do servidor</p>
          </div>`;
          return;
        }
        
        container.innerHTML = `<div class="sticker-grid">
          ${stickers.map(s => `
            <button class="sticker-item" data-url="${s.image_url}" title="${s.name}">
              <img src="${s.image_url}" alt="${s.name}" style="width:64px;height:64px;object-fit:contain" />
            </button>
          `).join('')}
        </div>`;
        
        // ✅ EVENTO DE CLIQUE PARA ENVIAR NO CHAT
        container.querySelectorAll('.sticker-item').forEach(btn => {
          btn.addEventListener('click', () => {
            socket.emit('message', { 
              channel: currentChannel, 
              text: btn.dataset.url, 
              communityId
            });
            closeAllPickers();
          });
        });
        
      } catch (err) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#ff6b6b">
          <div style="font-size:48px;margin-bottom:16px">⚠️</div>
          <p>Erro ao carregar figurinhas</p>
        </div>`;
      }
    });
    
    // ✅ ADICIONAR ABA UPLOAD
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'sticker-pack-btn';
    uploadBtn.dataset.pack = 'upload';
    uploadBtn.title = 'Enviar figurinha';
    uploadBtn.innerHTML = '📤';
    
    uploadBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      stickerPicker.querySelectorAll('.sticker-pack-btn').forEach(b => b.classList.remove('active'));
      uploadBtn.classList.add('active');
      
      const container = stickerPicker.querySelector('.sticker-grid-container');
      container.innerHTML = `
        <div style="text-align:center;padding:40px">
          <div style="font-size:64px;margin-bottom:16px">📤</div>
          <h3>Enviar figurinha</h3>
          <p style="color:#888;margin-bottom:24px">Escolha uma imagem do seu computador para enviar como figurinha</p>
          
          <input type="file" id="quick-sticker-upload" accept="image/png,image/jpeg,image/gif,image/apng" style="display:none" />
          <button class="btn btn-primary" onclick="document.getElementById('quick-sticker-upload').click()" style="padding:12px 32px;font-size:16px">
            📁 Escolher imagem
          </button>
          <p style="font-size:12px;color:#666;margin-top:16px">Máximo 512KB • PNG, JPG, GIF</p>
        </div>
      `;
      
      // Upload rápido
      setTimeout(() => {
        document.getElementById('quick-sticker-upload').addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const formData = new FormData();
          formData.append('name', `sticker_${Date.now()}`);
          formData.append('image', file);
          
          try {
            const res = await fetch(`/api/servers/${window.currentServerId}/stickers`, {
              method: 'POST',
              body: formData
            });
            
            if (!res.ok) {
              const err = await res.json();
              alert(err.error);
              return;
            }
            
            // Atualizar em tempo real para TODOS
            window.dispatchEvent(new CustomEvent('stickerAdded'));
            
            // Voltar para aba do servidor
            serverBtn.click();
            
            showToast('✅ Figurinha enviada com sucesso!');
            
          } catch (err) {
            alert('Erro ao enviar figurinha');
          }
        });
      }, 100);
    });
    
    // ✅ ADICIONAR ABAS NA ORDEM
    packsContainer.insertBefore(uploadBtn, packsContainer.firstChild);
    packsContainer.insertBefore(serverBtn, packsContainer.firstChild);
    
    // ✅ ABRIR NA ABA DO SERVIDOR
    serverBtn.click();
  }
});

// ✅ ADICIONAR ABA DO SERVIDOR SEMPRE QUE O PICKER ABRIR
const packsContainer = stickerPicker.querySelector('.sticker-packs');

// Remover abas antigas se existirem
packsContainer.querySelectorAll('[data-pack="server"]').forEach(b => b.remove());
packsContainer.querySelectorAll('[data-pack="upload"]').forEach(b => b.remove());

// Criar aba do servidor
const serverBtn = document.createElement('button');
serverBtn.className = 'sticker-pack-btn';
serverBtn.dataset.pack = 'server';
serverBtn.title = 'Figurinhas do Servidor';
serverBtn.innerHTML = '🏠';

serverBtn.addEventListener('click', async (ev) => {
  ev.stopPropagation();
  stickerPicker.querySelectorAll('.sticker-pack-btn').forEach(b => b.classList.remove('active'));
  serverBtn.classList.add('active');
  
  const container = stickerPicker.querySelector('.sticker-grid-container');
  try {
    const res = await fetch(`/api/servers/${window.currentServerId}/stickers`);
    const stickers = await res.json();
    
    if (stickers.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:#888">
        <div style="font-size:48px;margin-bottom:16px">📭</div>
        <p>Nenhuma figurinha ainda</p>
      </div>`;
      return;
    }
    
    container.innerHTML = `<div class="sticker-grid">
      ${stickers.map(s => `
        <button class="sticker-item" data-url="${s.image_url}" title="${s.name}">
          <img src="${s.image_url}" alt="${s.name}" style="width:64px;height:64px;object-fit:contain" />
        </button>
      `).join('')}
    </div>`;
    
    container.querySelectorAll('.sticker-item').forEach(btn => {
      btn.addEventListener('click', () => {
        socket.emit('message', { 
          channel: currentChannel, 
          text: btn.dataset.url, 
          communityId
        });
        closeAllPickers();
      });
    });
    
  } catch (err) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#ff6b6b">
      <div style="font-size:48px;margin-bottom:16px">⚠️</div>
      <p>Erro ao carregar figurinhas</p>
    </div>`;
  }
});

// Criar aba Upload
const uploadBtn = document.createElement('button');
uploadBtn.className = 'sticker-pack-btn';
uploadBtn.dataset.pack = 'upload';
uploadBtn.title = 'Enviar figurinha';
uploadBtn.innerHTML = '📤';

uploadBtn.addEventListener('click', (ev) => {
  ev.stopPropagation();
  stickerPicker.querySelectorAll('.sticker-pack-btn').forEach(b => b.classList.remove('active'));
  uploadBtn.classList.add('active');
  
  const container = stickerPicker.querySelector('.sticker-grid-container');
  container.innerHTML = `
    <div style="text-align:center;padding:40px">
      <div style="font-size:64px;margin-bottom:16px">📤</div>
      <h3>Enviar figurinha</h3>
      <p style="color:#888;margin-bottom:24px">Escolha uma imagem do seu computador</p>
      
      <input type="file" id="quick-sticker-upload" accept="image/png,image/jpeg,image/gif,image/apng" style="display:none" />
      <button class="btn btn-primary" onclick="document.getElementById('quick-sticker-upload').click()" style="padding:12px 32px;font-size:16px">
        📁 Escolher imagem
      </button>
      <p style="font-size:12px;color:#666;margin-top:16px">Máximo 512KB</p>
    </div>
  `;
  
  setTimeout(() => {
    document.getElementById('quick-sticker-upload').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('name', `sticker_${Date.now()}`);
      formData.append('image', file);
      
      try {
        const res = await fetch(`/api/servers/${window.currentServerId}/stickers`, {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) {
          const err = await res.json();
          alert(err.error);
          return;
        }
        
        window.dispatchEvent(new CustomEvent('stickerAdded'));
        serverBtn.click();
        showToast('✅ Figurinha enviada!');
        
      } catch (err) {
        alert('Erro ao enviar figurinha');
      }
    });
  }, 100);
});

// Adicionar abas no início
packsContainer.insertBefore(uploadBtn, packsContainer.firstChild);
packsContainer.insertBefore(serverBtn, packsContainer.firstChild);

// Eventos padrão
stickerPicker.querySelectorAll('.sticker-pack-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    stickerPicker.querySelectorAll('.sticker-pack-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderStickerPack(btn.dataset.pack);
  });
});

// ================================================
// EVENTOS GLOBAIS
// ================================================

document.addEventListener('click', (e) => {
  if (!e.target.closest('.chat-picker') && 
      !e.target.closest('#btn-emoji') && 
      !e.target.closest('#btn-gif') && 
      !e.target.closest('#btn-stickers') &&
      !e.target.closest('.plus-menu') &&
      !e.target.closest('#btn-plus')) {
    closeAllPickers();
    document.querySelectorAll('.plus-menu').forEach(m => m.remove());
  }
});

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllPickers();
});

// ================================================
// 1. BOTÃO + (ENQUETE + ARQUIVOS GERAIS)
// ================================================
function openPlusMenu(e) {
  e.stopPropagation();
  console.log('✅ Botão + clicado!');
  
  // Fechar outros pickers
  closeAllPickers();
  
  // Remover menu existente se houver
  document.querySelectorAll('.plus-menu').forEach(m => m.remove());
  
  const menu = document.createElement('div');
  menu.className = 'plus-menu';
  menu.innerHTML = `
    <div class="plus-menu-item" data-action="poll">📊 Criar Enquete</div>
    <div class="plus-menu-item" data-action="topic">💬 Criar Tópico</div>
    <div class="plus-menu-item" data-action="file">📁 Enviar Arquivo</div>
  `;
  
  const btnPlus = document.getElementById('btn-plus');
  const rect = btnPlus.getBoundingClientRect();
  menu.style.left = rect.left + 'px';
  menu.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
  
  document.body.appendChild(menu);
  console.log('✅ Menu aberto com sucesso!');
  
  menu.querySelectorAll('.plus-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('✅ Clique na opção:', item.dataset.action);
      
      menu.remove();
      
      if (item.dataset.action === 'poll') {
        console.log('🔹 Chamando openPollCreator()');
        try {
          openPollCreator();
          console.log('✅ openPollCreator() executou com sucesso');
        } catch(err) {
          console.error('❌ ERRO em openPollCreator:', err);
        }
      } else if (item.dataset.action === 'topic') {
        console.log('🔹 Chamando openTopicCreator()');
        try {
          openTopicCreator();
          console.log('✅ openTopicCreator() executou com sucesso');
        } catch(err) {
          console.error('❌ ERRO em openTopicCreator:', err);
        }
      } else if (item.dataset.action === 'file') {
        document.getElementById('file-upload-input').accept = '*';
        document.getElementById('file-upload-input').click();
      }
    });
  });

  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }, { once: true });
  }, 10);
}

function openPollCreator() {
  console.log('✅ Abrindo modal de Criar Enquete');
  
  // Remover modal existente
  document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  
  modal.innerHTML = `
    <div class="modal-modern" style="width: 500px;">
      <div class="mm-header">
      <span class="mm-title">📊 Criar Enquete</span>
      <button class="mm-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 16px;">
        <div class="ms-field">
          <label>Pergunta</label>
          <input type="text" id="poll-question" placeholder="Qual a pergunta da enquete..." maxlength="120" />
        </div>
        <div class="ms-field">
          <label>Opções</label>
          <div id="poll-options">
            <input type="text" class="poll-option-input" placeholder="Opção 1" maxlength="60" />
            <input type="text" class="poll-option-input" placeholder="Opção 2" maxlength="60" />
          </div>
          <button type="button" class="btn-ghost-sm" onclick="addPollOption()">+ Adicionar opção</button>
        </div>
        <div class="create-channel-actions" style="margin-top: 1rem;">
          <button type="button" class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button type="button" class="btn-neon" onclick="sendPoll()">📤 Criar Enquete</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  console.log('✅ Modal de enquete adicionado ao DOM:', modal);
  
  // Focar automaticamente no campo de pergunta
  setTimeout(() => {
    document.getElementById('poll-question')?.focus();
  }, 100);
}

function openTopicCreator() {
  console.log('✅ Abrindo modal de Criar Tópico');
  
  // Remover modal existente
  document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  
  modal.innerHTML = `
    <div class="modal-modern" style="width: 500px;">
      <div class="mm-header">
        <span class="mm-title">💬 Criar Tópico</span>
        <button class="mm-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 16px;">
        <div class="ms-field">
          <label>Título do Tópico</label>
          <input type="text" id="topic-title" placeholder="Digite o título do tópico..." maxlength="100" />
        </div>
        <div class="ms-field">
          <label>Conteúdo</label>
          <textarea id="topic-content" placeholder="Escreva o conteúdo do tópico..." maxlength="2000" rows="6" style="resize: vertical;"></textarea>
        </div>
        <div class="create-channel-actions" style="margin-top: 1rem;">
          <button type="button" class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button type="button" class="btn-neon" onclick="sendTopic()">📤 Criar Tópico</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  console.log('✅ Modal de tópico adicionado ao DOM:', modal);
  
  // Focar automaticamente no campo de título
  setTimeout(() => {
    document.getElementById('topic-title')?.focus();
  }, 100);
}

function addPollOption() {
  const container = document.getElementById('poll-options');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'poll-option-input';
  input.placeholder = `Opção ${container.children.length + 1}`;
  input.maxLength = 60;
  container.appendChild(input);
}

function sendPoll() {
  const question = document.getElementById('poll-question').value.trim();
  const options = Array.from(document.querySelectorAll('.poll-option-input'))
    .map(i => i.value.trim())
    .filter(v => v);
  
  if (!question || options.length < 2) {
    showToast('Digite a pergunta e pelo menos 2 opções');
    return;
  }

  socket.emit('message', {
    channel: currentChannel,
    type: 'poll',
    question,
    options: options.map(text => ({ text, votes: 0 })),
    communityId
  });

  document.querySelector('.modal-overlay').remove();
  showToast('✅ Enquete criada com sucesso!');
  console.log('✅ Enquete enviada!');
}

function sendTopic() {
  const title = document.getElementById('topic-title').value.trim();
  const content = document.getElementById('topic-content').value.trim();
  
  if (!title) {
    showToast('Digite um título para o tópico');
    return;
  }

  socket.emit('message', {
    channel: currentChannel,
    type: 'topic',
    title,
    content,
    communityId
  });

  document.querySelector('.modal-overlay').remove();
  showToast('✅ Tópico criado com sucesso!');
  console.log('✅ Tópico enviado!');
}

// ================================================
// 2. BOTÃO ANEXAR (APENAS IMAGENS E VÍDEOS)
// ================================================
function openMediaUpload() {
  const input = document.getElementById('file-upload-input');
  input.accept = 'image/*,video/*';
  input.click();
}

// ================================================
// 6. BOTÃO MICROFONE (GRAVAR VOZ)
// ================================================
let voiceRecorder = null;
let voiceChunks = [];
let isRecording = false;

function toggleVoiceRecorder() {
  if (!isRecording) {
    startVoiceRecording();
  } else {
    stopVoiceRecording();
  }
}

async function startVoiceRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    voiceRecorder = new MediaRecorder(stream);
    voiceChunks = [];

    voiceRecorder.ondataavailable = (e) => {
      voiceChunks.push(e.data);
    };

    voiceRecorder.onstop = () => {
      const blob = new Blob(voiceChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onload = () => {
  socket.emit('message', {
    channel: currentChannel,
    type: 'voice',
    audio: reader.result,
    communityId
  });
        showToast('Mensagem de voz enviada!');
      };
      reader.readAsDataURL(blob);
      stream.getTracks().forEach(t => t.stop());
    };

    voiceRecorder.start();
    isRecording = true;
    
    document.getElementById('btn-voice').classList.add('recording');
    showToast('🎤 Gravando... Clique novamente para enviar');

  } catch {
    showToast('Não foi possível acessar o microfone');
  }
}

function stopVoiceRecording() {
  if (voiceRecorder) {
    voiceRecorder.stop();
    isRecording = false;
    document.getElementById('btn-voice').classList.remove('recording');
  }
}

// ================================================
// INICIALIZAR EVENTOS NOS BOTÕES
// ================================================
function initChatInputButtons() {
  document.getElementById('btn-plus')?.addEventListener('click', openPlusMenu);
  document.getElementById('btn-attach-file')?.addEventListener('click', openMediaUpload);
  document.getElementById('btn-voice')?.addEventListener('click', toggleVoiceRecorder);
}

// Tentar inicializar imediatamente e depois novamente após login
if (document.readyState === 'complete') {
  initChatInputButtons();
} else {
  document.addEventListener('DOMContentLoaded', initChatInputButtons);
}

  }); // ✅ Fechamento do DOMContentLoaded

  // ✅ SCRIPT DIRETO PARA ABRIR OS MENUS
  // Garante que os botões funcionam mesmo que o script carregue múltiplas vezes
  document.addEventListener('click', (e) => {
    const btnEmoji = e.target.closest('#btn-emoji');
    const btnGif = e.target.closest('#btn-gif');
    const btnStickers = e.target.closest('#btn-stickers');
    
    if (btnEmoji) {
      e.stopPropagation();
      const emojiPicker = document.getElementById('emoji-picker');
      const isActive = emojiPicker.classList.contains('active');
      
      document.querySelectorAll('.chat-picker').forEach(p => p.classList.remove('active'));
      
      if (!isActive) {
        emojiPicker.classList.add('active');
        updateEmojiCategories();
        renderEmojiCategory('smileys');
      }
    }

    if (btnGif) {
      e.stopPropagation();
      const gifPicker = document.getElementById('gif-picker');
      const isActive = gifPicker.classList.contains('active');
      
      document.querySelectorAll('.chat-picker').forEach(p => p.classList.remove('active'));
      
      if (!isActive) {
        gifPicker.classList.add('active');
        loadGifs();
      }
    }

    if (btnStickers) {
      e.stopPropagation();
      const stickerPicker = document.getElementById('sticker-picker');
      const isActive = stickerPicker.classList.contains('active');
      
      document.querySelectorAll('.chat-picker').forEach(p => p.classList.remove('active'));
      
      if (!isActive) {
        stickerPicker.classList.add('active');
        
        // ✅ ADICIONAR ABAS DO SERVIDOR E UPLOAD
        const packsContainer = stickerPicker.querySelector('.sticker-packs');
        
        // Remover abas antigas
        packsContainer.querySelectorAll('[data-pack="server"]').forEach(b => b.remove());
        packsContainer.querySelectorAll('[data-pack="upload"]').forEach(b => b.remove());
        
        // Criar aba do servidor
        const serverBtn = document.createElement('button');
        serverBtn.className = 'sticker-pack-btn';
        serverBtn.dataset.pack = 'server';
        serverBtn.title = 'Figurinhas do Servidor';
        serverBtn.innerHTML = '🏠';
        
        serverBtn.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          stickerPicker.querySelectorAll('.sticker-pack-btn').forEach(b => b.classList.remove('active'));
          serverBtn.classList.add('active');
          
          const container = stickerPicker.querySelector('.sticker-grid-container');
          try {
            const res = await fetch(`/api/servers/${window.currentServerId}/stickers`);
            const stickers = await res.json();
            
            if (stickers.length === 0) {
              container.innerHTML = `<div style="text-align:center;padding:40px;color:#888">
                <div style="font-size:48px;margin-bottom:16px">📭</div>
                <p>Nenhuma figurinha ainda</p>
              </div>`;
              return;
            }
            
            container.innerHTML = `<div class="sticker-grid">
              ${stickers.map(s => `
                <button class="sticker-item" data-url="${s.image_url}" title="${s.name}">
                  <img src="${s.image_url}" alt="${s.name}" style="width:64px;height:64px;object-fit:contain" />
                </button>
              `).join('')}
            </div>`;
            
            container.querySelectorAll('.sticker-item').forEach(btn => {
              btn.addEventListener('click', () => {
                socket.emit('message', { 
                  channel: currentChannel, 
                  text: btn.dataset.url, 
                  communityId
                });
                closeAllPickers();
              });
            });
            
          } catch (err) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:#ff6b6b">
              <div style="font-size:48px;margin-bottom:16px">⚠️</div>
              <p>Erro ao carregar figurinhas</p>
            </div>`;
          }
        });
        
        // Criar aba Upload
        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'sticker-pack-btn';
        uploadBtn.dataset.pack = 'upload';
        uploadBtn.title = 'Enviar figurinha';
        uploadBtn.innerHTML = '📤';
        
        uploadBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          stickerPicker.querySelectorAll('.sticker-pack-btn').forEach(b => b.classList.remove('active'));
          uploadBtn.classList.add('active');
          
          const container = stickerPicker.querySelector('.sticker-grid-container');
          container.innerHTML = `
            <div style="text-align:center;padding:40px">
              <div style="font-size:64px;margin-bottom:16px">📤</div>
              <h3>Enviar figurinha</h3>
              <p style="color:#888;margin-bottom:24px">Escolha uma imagem do seu computador</p>
              
              <input type="file" id="quick-sticker-upload" accept="image/png,image/jpeg,image/gif,image/apng" style="display:none" />
              <button class="btn btn-primary" onclick="document.getElementById('quick-sticker-upload').click()" style="padding:12px 32px;font-size:16px">
                📁 Escolher imagem
              </button>
              <p style="font-size:12px;color:#666;margin-top:16px">Máximo 512KB</p>
            </div>
          `;
          
          setTimeout(() => {
            document.getElementById('quick-sticker-upload').addEventListener('change', async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              
              const formData = new FormData();
              formData.append('name', `sticker_${Date.now()}`);
              formData.append('image', file);
              
              try {
                const res = await fetch(`/api/servers/${window.currentServerId}/stickers`, {
                  method: 'POST',
                  body: formData
                });
                
                if (!res.ok) {
                  const err = await res.json();
                  alert(err.error);
                  return;
                }
                
                window.dispatchEvent(new CustomEvent('stickerAdded'));
                serverBtn.click();
                showToast('✅ Figurinha enviada!');
                
              } catch (err) {
                alert('Erro ao enviar figurinha');
              }
            });
          }, 100);
        });
        
        // Adicionar abas no início
        packsContainer.insertBefore(uploadBtn, packsContainer.firstChild);
        packsContainer.insertBefore(serverBtn, packsContainer.firstChild);
        
        // Abrir na aba padrão
        renderStickerPack('default');
      }
    }
  });

} // end guard for chat-input.js
