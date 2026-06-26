// ================================================
// SISTEMA COMPLETO DE FIGURINHAS DO SERVIDOR
// + Aba de Figurinhas Personalizadas funcional
// ================================================

document.addEventListener('DOMContentLoaded', () => {

  const btnStickers = document.getElementById('btn-stickers');
  const stickerModal = document.getElementById('server-stickers-modal');

  // ================================================
  // ABRIR MODAL DE FIGURINHAS
  // ================================================
  btnStickers?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.chat-picker').forEach(p => p.classList.remove('active'));
    stickerModal.classList.remove('hidden');
    renderStickerTabs();
    loadServerStickers();

    if (!document.getElementById('btn-send-sticker-footer')) {
      const modalContent = stickerModal.querySelector('.modal-modern');
      const footer = document.createElement('div');
      footer.className = 'sticker-modal-footer';
      footer.innerHTML = '<button class="btn-send-selected-sticker" id="btn-send-sticker-footer" disabled>➤</button>';
      modalContent.appendChild(footer);
      footer.querySelector('#btn-send-sticker-footer').addEventListener('click', () => {
        if (window.selectedSticker) { sendSticker(window.selectedSticker); stickerModal.classList.add('hidden'); window.selectedSticker = null; }
      });
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#server-stickers-modal') && !e.target.closest('#btn-stickers')) {
      stickerModal?.classList.add('hidden');
    }
  });

  document.getElementById('stickers-modal-close')?.addEventListener('click', () => {
    stickerModal.classList.add('hidden');
  });

  // ================================================
  // TABS: Servidor | Personalizadas
  // ================================================
  let currentStickerTab = 'server';

  function renderStickerTabs() {
    const modalContent = stickerModal?.querySelector('.modal-modern');
    if (!modalContent) return;

    let tabBar = document.getElementById('sticker-tab-bar');
    if (!tabBar) {
      tabBar = document.createElement('div');
      tabBar.id = 'sticker-tab-bar';
      tabBar.style.cssText = 'display:flex;border-bottom:1px solid rgba(255,0,255,0.2);background:rgba(0,0,0,0.3);';
      // Insert after the modal header (first child)
      const header = modalContent.querySelector('.modal-header, .modal-modern-header, h2, .mm-title');
      if (header) { header.after(tabBar); } else { modalContent.prepend(tabBar); }
    }

    tabBar.innerHTML = `
      <button id="sticker-tab-server" onclick="switchStickerTab('server')"
        style="flex:1;padding:11px;background:${currentStickerTab==='server'?'rgba(255,0,255,0.15)':'transparent'};border:none;color:${currentStickerTab==='server'?'#fff':'#aaa'};cursor:pointer;font-size:13px;font-weight:${currentStickerTab==='server'?'700':'400'};border-bottom:${currentStickerTab==='server'?'2px solid #ff00ff':'2px solid transparent'};transition:all .15s;">
        🌐 Servidor
      </button>
      <button id="sticker-tab-custom" onclick="switchStickerTab('custom')"
        style="flex:1;padding:11px;background:${currentStickerTab==='custom'?'rgba(255,0,255,0.15)':'transparent'};border:none;color:${currentStickerTab==='custom'?'#fff':'#aaa'};cursor:pointer;font-size:13px;font-weight:${currentStickerTab==='custom'?'700':'400'};border-bottom:${currentStickerTab==='custom'?'2px solid #ff00ff':'2px solid transparent'};transition:all .15s;">
        ⭐ Personalizadas
      </button>
    `;
  }

  window.switchStickerTab = function(tab) {
    currentStickerTab = tab;
    renderStickerTabs();
    if (tab === 'server') { loadServerStickers(); }
    else { loadCustomStickers(); }
  };

  // ================================================
  // FIGURINHAS DO SERVIDOR (padrão + upload do servidor)
  // ================================================
  function loadServerStickers() {
    const serverId = localStorage.getItem('currentServerId');
    const grid = document.getElementById('server-stickers-grid');
    if (!grid) return;

    // Esconder botão de upload custom
    document.getElementById('btn-upload-custom-sticker')?.style && (document.getElementById('btn-upload-custom-sticker').style.display = 'none');
    document.getElementById('btn-upload-sticker')?.style && (document.getElementById('btn-upload-sticker').style.display = '');

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

    const globalStickers = JSON.parse(localStorage.getItem('stickers_global') || '[]');
    let customStickers = [...globalStickers];
    if (serverId) {
      const serverStickers = JSON.parse(localStorage.getItem('stickers_' + serverId) || '[]');
      customStickers = [...globalStickers, ...serverStickers];
    }

    const allStickers = [...defaultStickers, ...customStickers];
    grid.innerHTML = '';

    allStickers.forEach(sticker => {
      const item = document.createElement('div');
      item.className = 'server-sticker-item';
      if (sticker.isDefault) {
        item.innerHTML = '<img src="' + sticker.url + '" alt="' + sticker.name + '" loading="lazy" /><div class="sticker-actions"><button class="sticker-btn-preview" title="Ver figurinha">👁</button></div>';
        item.querySelector('.sticker-btn-preview').addEventListener('click', e => { e.stopPropagation(); showStickerPreview(sticker); });
      } else {
        item.innerHTML = '<img src="' + sticker.url + '" alt="' + sticker.name + '" loading="lazy" /><div class="sticker-actions"><button class="sticker-btn-edit" title="Editar nome">✏️</button><button class="sticker-btn-delete" title="Excluir">✕</button></div>';
        item.querySelector('.sticker-btn-edit').addEventListener('click', e => {
          e.stopPropagation();
          const n = prompt('Novo nome:', sticker.name);
          if (n && n.trim()) { sticker.name = n.trim(); saveEditedSticker(sticker, serverId); loadServerStickers(); }
        });
        item.querySelector('.sticker-btn-delete').addEventListener('click', e => {
          e.stopPropagation();
          if (confirm('Excluir a figurinha "' + sticker.name + '"?')) { deleteServerSticker(sticker, serverId); loadServerStickers(); }
        });
      }
      item.addEventListener('click', e => {
        if (!e.target.closest('button')) {
          document.querySelectorAll('.server-sticker-item.selected').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          window.selectedSticker = sticker;
          const btn = document.getElementById('btn-send-sticker-footer');
          if (btn) btn.disabled = false;
        }
      });
      grid.appendChild(item);
    });
  }

  function saveEditedSticker(sticker, serverId) {
    const key = serverId ? 'stickers_' + serverId : 'stickers_global';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = list.findIndex(s => s.id === sticker.id);
    if (idx !== -1) { list[idx].name = sticker.name; localStorage.setItem(key, JSON.stringify(list)); }
  }

  function deleteServerSticker(sticker, serverId) {
    const key = serverId ? 'stickers_' + serverId : 'stickers_global';
    let list = JSON.parse(localStorage.getItem(key) || '[]');
    list = list.filter(s => s.id !== sticker.id);
    localStorage.setItem(key, JSON.stringify(list));
  }

  // ================================================
  // FIGURINHAS PERSONALIZADAS (por usuário)
  // ================================================
  function loadCustomStickers() {
    const grid = document.getElementById('server-stickers-grid');
    if (!grid) return;

    // Mostrar botão upload custom
    const uploadBtn = document.getElementById('btn-upload-sticker');
    if (uploadBtn) uploadBtn.style.display = 'none';

    // Adicionar/atualizar botão upload custom
    let customUploadBtn = document.getElementById('btn-upload-custom-sticker');
    if (!customUploadBtn) {
      customUploadBtn = document.createElement('button');
      customUploadBtn.id = 'btn-upload-custom-sticker';
      customUploadBtn.textContent = '➕ Adicionar Figurinha';
      customUploadBtn.style.cssText = 'padding:10px 16px;background:linear-gradient(135deg,#8b00ff,#ff00ff);border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer;font-size:13px;margin:12px 16px 0;display:block;width:calc(100% - 32px);';
      const gridParent = grid.parentElement;
      if (gridParent) gridParent.insertBefore(customUploadBtn, grid);
    }
    customUploadBtn.style.display = 'block';
    customUploadBtn.onclick = uploadCustomSticker;

    const myStickers = loadMyCustomStickers();
    grid.innerHTML = '';

    if (myStickers.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#888;"><div style="font-size:48px;margin-bottom:12px;">⭐</div><div style="font-size:14px;margin-bottom:6px;">Nenhuma figurinha personalizada</div><div style="font-size:12px;">Clique em "Adicionar Figurinha" para criar as suas!</div></div>';
      return;
    }

    myStickers.forEach(sticker => {
      const item = document.createElement('div');
      item.className = 'server-sticker-item';
      item.innerHTML = '<img src="' + sticker.url + '" alt="' + (sticker.name || 'Figurinha') + '" loading="lazy" /><div class="sticker-name-label" style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.85));padding:8px 6px 6px;font-size:11px;color:#fff;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (sticker.name || '') + '</div><div class="sticker-actions"><button class="sticker-btn-edit" title="Renomear">✏️</button><button class="sticker-btn-delete" title="Excluir">✕</button></div>';
      item.querySelector('.sticker-btn-edit').addEventListener('click', e => {
        e.stopPropagation();
        const n = prompt('Novo nome para a figurinha:', sticker.name);
        if (n && n.trim()) { sticker.name = n.trim(); saveMyCustomStickers(myStickers); loadCustomStickers(); }
      });
      item.querySelector('.sticker-btn-delete').addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('Excluir a figurinha "' + (sticker.name || 'sem nome') + '"?')) {
          const updated = myStickers.filter(s => s.id !== sticker.id);
          saveMyCustomStickers(updated); loadCustomStickers();
        }
      });
      item.addEventListener('click', e => {
        if (!e.target.closest('button')) {
          document.querySelectorAll('.server-sticker-item.selected').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          window.selectedSticker = sticker;
          const btn = document.getElementById('btn-send-sticker-footer');
          if (btn) btn.disabled = false;
        }
      });
      grid.appendChild(item);
    });
  }

  function loadMyCustomStickers() {
    try { return JSON.parse(localStorage.getItem('my_custom_stickers') || '[]'); } catch { return []; }
  }

  function saveMyCustomStickers(list) {
    localStorage.setItem('my_custom_stickers', JSON.stringify(list));
  }

  function uploadCustomSticker() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*,image/gif';
    inp.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const name = prompt('Nome para a figurinha:', file.name.replace(/\.[^/.]+$/, '')) || 'Figurinha';
        const newSticker = { id: 'custom_' + Date.now(), name: name.trim(), url: ev.target.result, addedAt: Date.now() };
        const list = loadMyCustomStickers();
        list.push(newSticker);
        saveMyCustomStickers(list);
        loadCustomStickers();
        if (typeof showToast === 'function') showToast('✅ Figurinha "' + newSticker.name + '" adicionada!');
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  }

  // ================================================
  // ENVIAR FIGURINHA NO CHAT
  // ================================================
  function sendSticker(sticker) {
    const serverId = localStorage.getItem('currentServerId');
    const channel = localStorage.getItem('currentChannel');
    const username = localStorage.getItem('userNickname') || 'Usuário';
    const message = {
      id: Date.now(), type: 'sticker',
      stickerId: sticker.id, stickerUrl: sticker.url, stickerName: sticker.name,
      username, channel, serverId, time: new Date().toLocaleTimeString()
    };

    const area = document.getElementById('messages-area');
    if (area) {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'message sticker-message';
      msgDiv.innerHTML = '<div class="msg-avatar">' + username.charAt(0).toUpperCase() + '</div><div class="msg-body"><div class="msg-meta"><span class="msg-username">' + username + '</span><span class="msg-time">' + message.time + '</span></div><div class="sticker-container"><img src="' + sticker.url + '" alt="' + sticker.name + '" class="chat-sticker" /></div></div>';
      area.appendChild(msgDiv);
      area.scrollTop = area.scrollHeight;
    }

    const key = 'channel_' + channel;
    const messages = JSON.parse(localStorage.getItem(key) || '[]');
    messages.push(message); localStorage.setItem(key, JSON.stringify(messages));
    if (typeof socket !== 'undefined') socket.emit('message', message);
  }

  // ================================================
  // VISUALIZAR FIGURINHA EM TELA CHEIA
  // ================================================
  function showStickerPreview(sticker) {
    const prev = document.createElement('div');
    prev.className = 'modal-overlay';
    prev.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:999999;backdrop-filter:blur(4px);';
    prev.innerHTML = '<div class="sticker-preview-modal"><button class="mm-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button><img src="' + sticker.url + '" alt="' + sticker.name + '" /><div class="sticker-preview-info"><div class="sticker-preview-name">' + sticker.name + '</div><button class="btn-neon" id="btn-send-sticker-preview">📤 ENVIAR FIGURINHA</button></div></div>';
    document.body.appendChild(prev);
    prev.querySelector('#btn-send-sticker-preview').addEventListener('click', () => { sendSticker(sticker); prev.remove(); document.getElementById('server-stickers-modal')?.classList.add('hidden'); });
    prev.addEventListener('click', e => { if (e.target === prev) prev.remove(); });
  }

  // ================================================
  // UPLOAD DE FIGURINHA PARA O SERVIDOR
  // ================================================
  document.getElementById('btn-upload-sticker')?.addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*,image/gif';
    inp.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const serverId = localStorage.getItem('currentServerId');
        const newSticker = { id:'sticker_'+Date.now(), name:file.name.replace(/\.[^/.]+$/,''), url:ev.target.result, uploadedAt:Date.now(), uploadedBy:localStorage.getItem('userNickname')||'Usuário' };
        const key = serverId ? 'stickers_'+serverId : 'stickers_global';
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        list.push(newSticker); localStorage.setItem(key, JSON.stringify(list));
        loadServerStickers();
        if (typeof showToast === 'function') showToast('✅ Figurinha "' + newSticker.name + '" adicionada!');
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  });

  // ================================================
  // ESTILOS CSS
  // ================================================
  const styles = `
    #btn-stickers { display:inline-flex !important; }
    #server-stickers-modal { z-index:99999 !important; }
    #server-stickers-modal .modal-modern { width:650px; max-width:95vw; height:75vh; }
    .server-stickers-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; padding:16px; overflow-y:auto; height:calc(100% - 200px); }
    .server-sticker-item { position:relative; width:100%; aspect-ratio:1/1; border-radius:12px; overflow:hidden; border:2px solid rgba(255,0,255,0.2); background:rgba(0,0,0,0.3); cursor:pointer; transition:all .2s; }
    .server-sticker-item:hover { border-color:#ff00ff; transform:scale(1.05); box-shadow:0 0 20px rgba(255,0,255,0.4); }
    .server-sticker-item.selected { border-color:#00ff88 !important; box-shadow:0 0 25px rgba(0,255,136,0.6) !important; }
    .server-sticker-item img { width:100%; height:100%; object-fit:contain; padding:8px; }
    .sticker-modal-footer { position:absolute; bottom:0; left:0; right:0; height:80px; pointer-events:none; background:transparent; }
    .sticker-modal-footer button { pointer-events:all; }
    .btn-send-selected-sticker { position:absolute; bottom:20px; right:20px; width:60px; height:60px; border-radius:50%; background:transparent; border:3px solid #ffffff; color:#ffffff; font-size:24px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; z-index:10; }
    .btn-send-selected-sticker:hover { background:rgba(255,255,255,0.1); transform:scale(1.1); }
    .btn-send-selected-sticker:disabled { opacity:.3; cursor:not-allowed; }
    .sticker-actions { position:absolute; bottom:0; left:0; right:0; background:linear-gradient(transparent,rgba(0,0,0,.9)); padding:12px 8px 8px; display:flex; gap:8px; justify-content:center; opacity:0; transition:opacity .2s; }
    .server-sticker-item:hover .sticker-actions { opacity:1; }
    .sticker-btn-edit, .sticker-btn-preview { background:rgba(255,0,255,.2); border:1px solid rgba(255,0,255,.5); border-radius:6px; padding:6px 10px; color:#fff; cursor:pointer; font-size:14px; transition:all .15s; }
    .sticker-btn-edit:hover { background:#ffaa00; border-color:#ffaa00; color:#000; }
    .sticker-btn-delete:hover { background:#ff4444; border-color:#ff4444; color:#fff; }
    .sticker-btn-preview:hover { background:#00ffff; border-color:#00ffff; color:#000; }
    .sticker-preview-modal { position:relative; background:#12121a; border:2px solid #ff00ff; border-radius:16px; max-width:90vw; max-height:90vh; padding:20px; box-shadow:0 0 40px rgba(255,0,255,.5); }
    .sticker-preview-modal img { max-width:100%; max-height:60vh; border-radius:12px; margin-bottom:16px; }
    .sticker-preview-info { text-align:center; }
    .sticker-preview-name { color:#fff; font-size:18px; font-weight:600; margin-bottom:16px; }
    .sticker-message { background:rgba(13,0,22,0.65) !important; border-color:rgba(255,0,255,0.35) !important; }
    .sticker-container { margin-top:8px; }
    .chat-sticker { max-width:180px; max-height:180px; border-radius:8px; }
    #sticker-tab-bar button:hover { color:#fff !important; background:rgba(255,0,255,0.1) !important; }
    @media(max-width:768px) { .server-stickers-grid { grid-template-columns:repeat(3,1fr); } }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // ================================================
  // ADICIONAR BOTÃO DE FIGURINHAS NA BARRA SE NÃO EXISTIR
  // ================================================
  const inputWrapper = document.querySelector('.input-wrapper');
  if (inputWrapper && !document.getElementById('btn-stickers')) {
    const btnGif = document.getElementById('btn-gif');
    const stickerBtn = document.createElement('button');
    stickerBtn.type='button'; stickerBtn.className='input-action-btn'; stickerBtn.id='btn-stickers';
    stickerBtn.title='Figurinhas'; stickerBtn.textContent='🎭';
    if (btnGif) { btnGif.after(stickerBtn); } else { inputWrapper.appendChild(stickerBtn); }
    stickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.chat-picker').forEach(p => p.classList.remove('active'));
      stickerModal?.classList.remove('hidden');
      renderStickerTabs(); loadServerStickers();
    });
  }

  console.log('✅ Sistema de figurinhas + personalizadas carregado!');
});

window.openStickersModal = function() {
  document.getElementById('server-stickers-modal')?.classList.remove('hidden');
  document.dispatchEvent(new CustomEvent('stickers:load'));
};
