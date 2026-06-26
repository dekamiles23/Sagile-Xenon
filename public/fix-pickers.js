// ================================================
// ✅ PICKERS COMPLETOS: EMOJI + STICKER + CUSTOM UPLOAD
// ================================================

// ── Dados de emojis padrão ──
const _FP_emojiCategories = {
  smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  gestures: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵'],
  objects: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🔥','💯','⭐','✨','💫','⚡','🎈','🎉','🎊','🎁','🏆','💎','💵','💸','📱','💻','🎮','🎧','🎵','🎶'],
  nature: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🦋','🐌','🐞','🐜'],
  food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌽','🥕','🥔','🍠','🥐','🥯','🍞','🥖','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕'],
  flags: ['🏳️','🏴','🏴‍☠️','🏁','🚩','🏳️‍🌈','🇧🇷','🇺🇸','🇪🇸','🇫🇷','🇩🇪','🇮🇹','🇯🇵','🇨🇳','🇰🇷','🇷🇺','🇦🇷','🇵🇹','🇬🇧','🇦🇺']
};

// ── Packs de stickers padrão ──
const _FP_stickerPacks = {
  default:   { name: 'Padrão',  stickers: ['😀','😂','😍','🥳','😎','🤔','😢','😡','👍','👎','❤️','🔥','💯','✨','🎉','💪'] },
  reactions: { name: 'Reações', stickers: ['🤣','🥰','😱','🤯','😴','🤮','🥵','🥶','💀','👻','🤡','🙏','👏','💪','🫡','🤝'] },
  memes:     { name: 'Memes',   stickers: ['🗿','🦀','🐸','🤡','💀','🙃','😎','🤔','🚶','💨','🤙','🫂','🎭','🎪','🎯'] }
};

// ── LocalStorage helpers ──
function _fp_loadCustomEmojis() {
  try { return JSON.parse(localStorage.getItem('fp_customEmojis') || '[]'); } catch { return []; }
}
function _fp_saveCustomEmoji(dataUrl, name) {
  const list = _fp_loadCustomEmojis();
  list.push({ id: Date.now(), data: dataUrl, name: name || ('emoji_' + Date.now()) });
  localStorage.setItem('fp_customEmojis', JSON.stringify(list));
}
function _fp_deleteCustomEmoji(id) {
  const list = _fp_loadCustomEmojis().filter(e => e.id !== id);
  localStorage.setItem('fp_customEmojis', JSON.stringify(list));
}

function _fp_loadCustomStickers() {
  try { return JSON.parse(localStorage.getItem('fp_customStickers') || '[]'); } catch { return []; }
}
function _fp_saveCustomSticker(dataUrl, name) {
  const list = _fp_loadCustomStickers();
  list.push({ id: Date.now(), data: dataUrl, name: name || ('sticker_' + Date.now()) });
  localStorage.setItem('fp_customStickers', JSON.stringify(list));
}
function _fp_deleteCustomSticker(id) {
  const list = _fp_loadCustomStickers().filter(s => s.id !== id);
  localStorage.setItem('fp_customStickers', JSON.stringify(list));
}

// ── Fechar todos os pickers ──
function closeAllPickers() {
  document.querySelectorAll('.chat-picker').forEach(p => p.classList.remove('active'));
}

// ── Inserir texto no input ──
function insertAtCursor(text) {
  const inp = document.getElementById('message-input');
  if (!inp) return;
  const s = inp.selectionStart, e = inp.selectionEnd, v = inp.value;
  inp.value = v.slice(0, s) + text + v.slice(e);
  inp.selectionStart = inp.selectionEnd = s + text.length;
  inp.focus();
}

// ================================================
// EMOJI PICKER RENDER
// ================================================
function renderEmojiCategory(category) {
  const picker = document.getElementById('emoji-picker');
  if (!picker) return;
  const container = picker.querySelector('.emoji-grid-container');
  if (!container) return;

  // ── categoria: emojis personalizados ──
  if (category === 'custom') {
    const list = _fp_loadCustomEmojis();
    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:#888;">
          <div style="font-size:48px;margin-bottom:12px">⭐</div>
          <div style="font-size:14px;margin-bottom:8px">Nenhum emoji personalizado</div>
          <div style="font-size:12px">Clique no <strong style="color:#00ff88">＋</strong> para adicionar</div>
        </div>`;
      return;
    }
    container.innerHTML = `
      <div style="padding:8px 6px;font-size:11px;color:#888;display:flex;justify-content:space-between;align-items:center">
        <span>⭐ Seus emojis (${list.length})</span>
        <span style="color:#666;font-size:10px">clique = usar &nbsp;|&nbsp; ✕ = remover</span>
      </div>
      <div class="emoji-grid" style="grid-template-columns:repeat(7,1fr)">
        ${list.map(e => `
          <div class="emoji-item" style="position:relative;padding:4px;cursor:pointer"
               title="${e.name}" data-custom-id="${e.id}" data-custom-src="${e.data}">
            <img src="${e.data}" style="width:28px;height:28px;object-fit:contain;border-radius:4px;display:block;margin:auto" />
            <span data-del-emoji="${e.id}" style="position:absolute;top:0;right:0;font-size:9px;background:rgba(237,66,69,0.9);color:#fff;border-radius:50%;width:13px;height:13px;display:flex;align-items:center;justify-content:center;cursor:pointer;line-height:1">✕</span>
          </div>`).join('')}
      </div>`;

    container.querySelectorAll('[data-del-emoji]').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        _fp_deleteCustomEmoji(+btn.dataset.delEmoji);
        renderEmojiCategory('custom');
      });
    });
    container.querySelectorAll('[data-custom-src]').forEach(el => {
      el.addEventListener('click', ev => {
        if (ev.target.hasAttribute('data-del-emoji')) return;
        const src = el.dataset.customSrc;
        if (window.socket && window.currentChannel) {
          window.socket.emit('message', {
            channel: window.currentChannel,
            text: src,
            type: 'emoji-img',
            communityId: window.currentServerId || null
          });
        }
        closeAllPickers();
      });
    });
    return;
  }

  // ── categoria: emojis do servidor ──
  if (category === 'server') {
    const server = window.servers?.find(s => s.id === window.currentServerId);
    const emojis = server?.emojis || [];
    if (emojis.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:#888;">
          <div style="font-size:38px;margin-bottom:12px">🏠</div>
          <div style="font-size:13px">Nenhum emoji deste servidor</div>
          <div style="font-size:11px;margin-top:6px">Adicione em Configurações → Emojis</div>
        </div>`;
      return;
    }
    container.innerHTML = `
      <div class="emoji-grid" style="grid-template-columns:repeat(7,1fr)">
        ${emojis.map(e => {
          const src = e.emoji || e.image || e.url || e.src || '';
          const nm  = e.name || e.nome || 'emoji';
          return `<button class="emoji-item" title=":${nm}:" data-src="${src}" style="padding:4px">
            <img src="${src}" style="width:26px;height:26px;object-fit:contain" />
          </button>`;
        }).join('')}
      </div>`;
    container.querySelectorAll('button[data-src]').forEach(btn => {
      btn.addEventListener('click', () => { insertAtCursor(btn.dataset.src); closeAllPickers(); });
    });
    return;
  }

  // ── categorias padrão ──
  const emojis = _FP_emojiCategories[category] || [];
  container.innerHTML = `<div class="emoji-grid">${emojis.map(e =>
    `<button class="emoji-item">${e}</button>`).join('')}</div>`;
  container.querySelectorAll('.emoji-item').forEach(btn => {
    btn.addEventListener('click', () => { insertAtCursor(btn.textContent); closeAllPickers(); });
  });
}

// ── Atualizar botão 🏠 servidor no emoji picker ──
function updateServerEmojiTab() {
  const picker = document.getElementById('emoji-picker');
  if (!picker) return;
  const cats = picker.querySelector('.emoji-categories');
  if (!cats) return;
  const server = window.servers?.find(s => s.id === window.currentServerId);
  let existing = cats.querySelector('[data-category="server"]');
  if (server && server.emojis && server.emojis.length > 0) {
    if (!existing) {
      const btn = document.createElement('button');
      btn.className = 'emoji-category-btn';
      btn.dataset.category = 'server';
      btn.title = (server.name || 'Servidor') + ' — emojis personalizados';
      btn.textContent = '🏠';
      btn.style.cssText = 'font-size:14px;color:#a8b4ff';
      const customTab = cats.querySelector('#btn-emoji-custom-tab');
      cats.insertBefore(btn, customTab || null);
    }
  } else if (existing) {
    existing.remove();
  }
}

// ================================================
// STICKER PICKER RENDER
// ================================================
function renderStickerPack(packId) {
  const picker = document.getElementById('sticker-picker');
  if (!picker) return;
  const container = picker.querySelector('.sticker-grid-container');
  if (!container) return;

  // ── pack: figurinhas personalizadas ──
  if (packId === 'custom') {
    const list = _fp_loadCustomStickers();
    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:#888;">
          <div style="font-size:48px;margin-bottom:12px">🖼️</div>
          <div style="font-size:14px;margin-bottom:8px">Nenhuma figurinha personalizada</div>
          <div style="font-size:12px">Clique no <strong style="color:#00ff88">＋</strong> para adicionar</div>
        </div>`;
      return;
    }
    container.innerHTML = `
      <div style="padding:6px 10px;font-size:11px;color:#888">
        ⭐ Suas figurinhas (${list.length}) &nbsp;|&nbsp; ✕ para remover
      </div>
      <div class="sticker-grid">
        ${list.map(s => `
          <div class="sticker-item" style="position:relative;padding:6px;cursor:pointer"
               data-sticker-id="${s.id}" data-sticker-src="${s.data}" title="${s.name}">
            <img src="${s.data}" style="width:60px;height:60px;object-fit:contain;border-radius:8px;display:block;margin:auto" />
            <span data-del-sticker="${s.id}" style="position:absolute;top:2px;right:2px;font-size:10px;background:rgba(237,66,69,0.9);color:#fff;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;cursor:pointer">✕</span>
          </div>`).join('')}
      </div>`;

    container.querySelectorAll('[data-del-sticker]').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        _fp_deleteCustomSticker(+btn.dataset.delSticker);
        renderStickerPack('custom');
      });
    });
    container.querySelectorAll('[data-sticker-src]').forEach(el => {
      el.addEventListener('click', ev => {
        if (ev.target.hasAttribute('data-del-sticker')) return;
        if (window.socket && window.currentChannel) {
          window.socket.emit('message', {
            channel: window.currentChannel,
            text: el.dataset.stickerSrc,
            type: 'sticker',
            communityId: window.currentServerId || null
          });
        }
        closeAllPickers();
      });
    });
    return;
  }

  // ── packs padrão ──
  const pack = _FP_stickerPacks[packId] || _FP_stickerPacks.default;
  container.innerHTML = `<div class="sticker-grid">
    ${pack.stickers.map(s =>
      `<button class="sticker-item" style="font-size:40px;line-height:1;display:flex;align-items:center;justify-content:center">${s}</button>`
    ).join('')}
  </div>`;
  container.querySelectorAll('.sticker-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.socket && window.currentChannel) {
        window.socket.emit('message', {
          channel: window.currentChannel,
          text: btn.textContent.trim(),
          communityId: window.currentServerId || null
        });
      }
      closeAllPickers();
    });
  });
}

// ================================================
// GIF LOADER
// ================================================
async function loadGifs(search = '') {
  const picker = document.getElementById('gif-picker');
  if (!picker) return;
  const container = picker.querySelector('.gif-grid-container');
  if (!container) return;
  container.innerHTML = '<div class="gif-loading">Carregando GIFs...</div>';
  try {
    const KEY = 'LIVDSRZULELA';
    const url = search
      ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(search)}&key=${KEY}&limit=16&media_filter=minimal`
      : `https://g.tenor.com/v1/trending?key=${KEY}&limit=16&media_filter=minimal`;
    const data = await (await fetch(url)).json();
    container.innerHTML = `<div class="gif-grid">${data.results.map(g =>
      `<div class="gif-item" data-url="${g.media[0].gif.url}">
         <img src="${g.media[0].tinygif.url}" loading="lazy" />
       </div>`).join('')}</div>`;
    container.querySelectorAll('.gif-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.socket && window.currentChannel) {
          window.socket.emit('message', {
            channel: window.currentChannel,
            text: item.dataset.url,
            communityId: window.currentServerId || null
          });
        }
        closeAllPickers();
      });
    });
  } catch {
    container.innerHTML = '<div class="gif-loading">Erro ao carregar GIFs</div>';
  }
}

// ================================================
// UPLOAD DE EMOJI PERSONALIZADO
// ================================================
function triggerCustomEmojiUpload() {
  let inp = document.getElementById('custom-emoji-file-input');
  if (!inp) {
    inp = Object.assign(document.createElement('input'), {
      type: 'file', accept: 'image/*', id: 'custom-emoji-file-input', style: 'display:none'
    });
    document.body.appendChild(inp);
  }
  inp.value = '';
  inp.onchange = ev => {
    const file = ev.target.files[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      if (typeof showToast === 'function') showToast('❌ Arquivo muito grande (máx 2 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      _fp_saveCustomEmoji(e.target.result, file.name.replace(/\.[^.]+$/, ''));
      const picker = document.getElementById('emoji-picker');
      if (picker) {
        picker.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
        const tab = picker.querySelector('[data-category="custom"]');
        if (tab) tab.classList.add('active');
        renderEmojiCategory('custom');
      }
      if (typeof showToast === 'function') showToast('✅ Emoji personalizado adicionado!');
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}

// ================================================
// UPLOAD DE FIGURINHA PERSONALIZADA
// ================================================
function triggerCustomStickerUpload() {
  let inp = document.getElementById('custom-sticker-file-input');
  if (!inp) {
    inp = Object.assign(document.createElement('input'), {
      type: 'file', accept: 'image/*,image/gif', id: 'custom-sticker-file-input', style: 'display:none'
    });
    document.body.appendChild(inp);
  }
  inp.value = '';
  inp.onchange = ev => {
    const file = ev.target.files[0]; if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      if (typeof showToast === 'function') showToast('❌ Arquivo muito grande (máx 3 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      _fp_saveCustomSticker(e.target.result, file.name.replace(/\.[^.]+$/, ''));
      const picker = document.getElementById('sticker-picker');
      if (picker) {
        picker.querySelectorAll('.sticker-pack-btn').forEach(b => b.classList.remove('active'));
        const tab = picker.querySelector('[data-pack="custom"]');
        if (tab) tab.classList.add('active');
        renderStickerPack('custom');
      }
      if (typeof showToast === 'function') showToast('✅ Figurinha adicionada!');
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}

// ================================================
// LISTENERS GLOBAIS (capture = true)
// ================================================
document.addEventListener('click', ev => {

  // Botão Emoji 😀
  if (ev.target.closest('#btn-emoji')) {
    ev.stopPropagation();
    const picker = document.getElementById('emoji-picker');
    if (!picker) return;
    const wasActive = picker.classList.contains('active');
    closeAllPickers();
    if (!wasActive) {
      picker.classList.add('active');
      updateServerEmojiTab();
      const activeTab = picker.querySelector('.emoji-category-btn.active');
      renderEmojiCategory(activeTab?.dataset.category || 'smileys');
    }
    return;
  }

  // Botão GIF
  if (ev.target.closest('#btn-gif')) {
    ev.stopPropagation();
    const picker = document.getElementById('gif-picker');
    if (!picker) return;
    const wasActive = picker.classList.contains('active');
    closeAllPickers();
    if (!wasActive) { picker.classList.add('active'); loadGifs(); }
    return;
  }

  // Botão Figurinhas
  if (ev.target.closest('#btn-stickers')) {
    ev.stopPropagation();
    const picker = document.getElementById('sticker-picker');
    if (!picker) return;
    const wasActive = picker.classList.contains('active');
    closeAllPickers();
    if (!wasActive) {
      picker.classList.add('active');
      const activeTab = picker.querySelector('.sticker-pack-btn.active');
      renderStickerPack(activeTab?.dataset.pack || 'default');
    }
    return;
  }

  // Botão ＋ emoji personalizado
  if (ev.target.closest('#btn-add-custom-emoji')) {
    ev.stopPropagation(); ev.preventDefault();
    triggerCustomEmojiUpload();
    return;
  }

  // Botão ＋ figurinha personalizada
  if (ev.target.closest('#btn-add-custom-sticker')) {
    ev.stopPropagation(); ev.preventDefault();
    triggerCustomStickerUpload();
    return;
  }

  // Tabs de categoria do emoji picker
  const emojiCat = ev.target.closest('.emoji-category-btn');
  if (emojiCat && emojiCat.id !== 'btn-add-custom-emoji') {
    ev.stopPropagation();
    document.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
    emojiCat.classList.add('active');
    renderEmojiCategory(emojiCat.dataset.category);
    return;
  }

  // Tabs de pack do sticker picker
  const stickerTab = ev.target.closest('.sticker-pack-btn');
  if (stickerTab && stickerTab.id !== 'btn-add-custom-sticker') {
    ev.stopPropagation();
    document.querySelectorAll('.sticker-pack-btn').forEach(b => b.classList.remove('active'));
    stickerTab.classList.add('active');
    renderStickerPack(stickerTab.dataset.pack);
    return;
  }

  // Fechar ao clicar fora dos pickers
  if (!ev.target.closest('.chat-picker') &&
      !ev.target.closest('#btn-emoji') &&
      !ev.target.closest('#btn-gif') &&
      !ev.target.closest('#btn-stickers')) {
    closeAllPickers();
  }

}, true);

// Pesquisa de GIFs
let _fp_gifTimeout = null;
document.addEventListener('input', ev => {
  if (ev.target.classList.contains('gif-search-input')) {
    clearTimeout(_fp_gifTimeout);
    _fp_gifTimeout = setTimeout(() => loadGifs(ev.target.value), 400);
  }
}, true);

// ESC fecha pickers
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeAllPickers(); });

// Inicializar categorias padrão
document.addEventListener('DOMContentLoaded', () => {
  const ep = document.getElementById('emoji-picker');
  if (ep) renderEmojiCategory('smileys');
  const sp = document.getElementById('sticker-picker');
  if (sp) renderStickerPack('default');
});

console.log('✅ Fix Pickers v2 — custom emoji ⭐ + custom sticker 🖼️ + server tab 🏠');
