// ================================================
// ✅ DM PICKERS - Reutiliza fix-pickers.js para o DM
// ================================================
// Este arquivo estende a funcionalidade de pickers
// do servidor para o chat privado (DM), garantindo
// que emojis, GIFs, stickers e áudio funcionem
// EXATAMENTE igual ao servidor.

(function() {
  'use strict';

  // ── Aguarda fix-pickers.js estar carregado ──
  function waitForFixPickers(callback) {
    if (typeof _FP_emojiCategories !== 'undefined' && 
        typeof _FP_stickerPacks !== 'undefined' &&
        typeof closeAllPickers === 'function') {
      callback();
    } else {
      setTimeout(() => waitForFixPickers(callback), 100);
    }
  }

  // ── Função auxiliar para inserir emoji no input correto ──
  function insertAtCursorDm(text) {
    const inp = document.getElementById('dm-message-input');
    if (!inp) return;
    const s = inp.selectionStart, e = inp.selectionEnd, v = inp.value;
    inp.value = v.slice(0, s) + text + v.slice(e);
    inp.selectionStart = inp.selectionEnd = s + text.length;
    inp.focus();
  }

  // ── Fechar todos os pickers do DM ──
  function closeAllDmPickers() {
    document.querySelectorAll('#dm-emoji-picker, #dm-gif-picker, #dm-sticker-picker').forEach(p => {
      p.classList.remove('active');
    });
  }

  // ================================================
  // EMOJI PICKER PARA DM
  // ================================================
  function renderDmEmojiCategory(category) {
    const picker = document.getElementById('dm-emoji-picker');
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
          const id = btn.dataset.delEmoji;
          _fp_deleteCustomEmoji(Number(id));
          renderDmEmojiCategory('custom');
        });
      });

      container.querySelectorAll('[data-custom-id]').forEach(item => {
        item.addEventListener('click', ev => {
          ev.stopPropagation();
          insertAtCursorDm(item.dataset.customSrc);
          closeAllDmPickers();
        });
      });
      return;
    }

    // ── categorias padrão ──
    const emojis = _FP_emojiCategories[category] || [];
    container.innerHTML = `<div class="emoji-grid">${emojis.map(e => 
      `<div class="emoji-item" style="cursor:pointer">${e}</div>`
    ).join('')}</div>`;

    container.querySelectorAll('.emoji-item').forEach(item => {
      item.addEventListener('click', () => {
        insertAtCursorDm(item.textContent);
        closeAllDmPickers();
      });
    });
  }

  // ================================================
  // GIF PICKER PARA DM
  // ================================================
  const TENOR_KEY = 'LIVDSRZULELA';
  let dmGifTimeout = null;

  async function loadDmGifs(search = '') {
    const container = document.querySelector('#dm-gif-picker .gif-grid-container');
    if (!container) return;
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
          insertAtCursorDm(gifUrl);
          closeAllDmPickers();
          // Enviar via socket se disponível
          if (window.socket && window.currentDmUser) {
            window.socket.emit('dm:message', {
              from: window.username,
              to: window.currentDmUser,
              text: gifUrl,
              time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            });
          }
        });
      });
    } catch (err) {
      container.innerHTML = '<div class="gif-loading">Erro ao carregar GIFs</div>';
    }
  }

  // ================================================
  // STICKER PICKER PARA DM
  // ================================================
  function renderDmStickerPack(pack) {
    const picker = document.getElementById('dm-sticker-picker');
    if (!picker) return;

    // ── Renderizar abas ──
    const tabsContainer = picker.querySelector('.sticker-tabs');
    if (!tabsContainer.innerHTML) {
      const packs = Object.keys(_FP_stickerPacks);
      const customStickers = _fp_loadCustomStickers();
      
      tabsContainer.innerHTML = packs.map(p => `
        <button class="sticker-pack-btn ${p === 'default' ? 'active' : ''}" data-pack="${p}">
          ${_FP_stickerPacks[p].name}
        </button>
      `).join('') + (customStickers.length > 0 ? `
        <button class="sticker-pack-btn" data-pack="custom">
          Meus (${customStickers.length})
        </button>
      ` : '');
    }

    // ── Renderizar grid ──
    const container = picker.querySelector('.sticker-grid-container');
    let stickers = [];

    if (pack === 'custom') {
      stickers = _fp_loadCustomStickers().map(s => s.data);
    } else {
      stickers = (_FP_stickerPacks[pack] || {}).stickers || [];
    }

    container.innerHTML = `<div class="sticker-grid">
      ${stickers.map((s, i) => `
        <div class="sticker-item" data-sticker="${s}" style="cursor:pointer;font-size:40px;display:flex;align-items:center;justify-content:center;">
          ${s.startsWith('data:') ? `<img src="${s}" style="width:50px;height:50px;object-fit:contain;" />` : s}
        </div>
      `).join('')}
    </div>`;

    container.querySelectorAll('.sticker-item').forEach(item => {
      item.addEventListener('click', () => {
        const sticker = item.dataset.sticker;
        insertAtCursorDm(sticker);
        closeAllDmPickers();
      });
    });
  }

  // ================================================
  // VOICE RECORDING PARA DM
  // ================================================
  let dmVoiceRecorder = null;
  let dmVoiceChunks = [];
  let dmIsRecording = false;

  function toggleDmVoiceRecorder() {
    if (!dmIsRecording) {
      startDmVoiceRecording();
    } else {
      stopDmVoiceRecording();
    }
  }

  async function startDmVoiceRecording() {
    try {
      const constraints = { audio: true };
      if (localStorage.getItem('audioDeviceId')) {
        constraints.audio = { deviceId: { exact: localStorage.getItem('audioDeviceId') } };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      dmVoiceRecorder = new MediaRecorder(stream);
      dmVoiceChunks = [];

      dmVoiceRecorder.ondataavailable = (e) => {
        dmVoiceChunks.push(e.data);
      };

      dmVoiceRecorder.onstop = () => {
        const blob = new Blob(dmVoiceChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          if (window.socket && window.currentDmUser) {
            window.socket.emit('dm:message', {
              from: window.username,
              to: window.currentDmUser,
              text: reader.result,
              type: 'voice',
              time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            });
          }
          if (typeof showToast === 'function') showToast('Mensagem de voz enviada!');
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      dmVoiceRecorder.start();
      dmIsRecording = true;
      document.getElementById('dm-btn-voice')?.classList.add('recording');
      if (typeof showToast === 'function') showToast('🎤 Gravando... Clique novamente para enviar');
    } catch (err) {
      if (typeof showToast === 'function') showToast('Não foi possível acessar o microfone');
    }
  }

  function stopDmVoiceRecording() {
    if (dmVoiceRecorder) {
      dmVoiceRecorder.stop();
      dmIsRecording = false;
      document.getElementById('dm-btn-voice')?.classList.remove('recording');
    }
  }

  // ================================================
  // LISTENERS GLOBAIS PARA DM
  // ================================================
  function attachDmPickerListeners() {
    document.addEventListener('click', ev => {
      // Botão Emoji do DM
      if (ev.target.closest('#dm-btn-emoji')) {
        ev.stopPropagation();
        const picker = document.getElementById('dm-emoji-picker');
        if (!picker) return;
        const wasActive = picker.classList.contains('active');
        closeAllDmPickers();
        if (!wasActive) {
          picker.classList.add('active');
          const activeTab = picker.querySelector('.emoji-category-btn.active');
          renderDmEmojiCategory(activeTab?.dataset.category || 'smileys');
        }
        return;
      }

      // Botão GIF do DM
      if (ev.target.closest('#dm-btn-gif')) {
        ev.stopPropagation();
        const picker = document.getElementById('dm-gif-picker');
        if (!picker) return;
        const wasActive = picker.classList.contains('active');
        closeAllDmPickers();
        if (!wasActive) {
          picker.classList.add('active');
          loadDmGifs();
        }
        return;
      }

      // Botão Stickers do DM
      if (ev.target.closest('#dm-btn-stickers')) {
        ev.stopPropagation();
        const picker = document.getElementById('dm-sticker-picker');
        if (!picker) return;
        const wasActive = picker.classList.contains('active');
        closeAllDmPickers();
        if (!wasActive) {
          picker.classList.add('active');
          renderDmStickerPack('default');
        }
        return;
      }

      // Botão de voz do DM
      if (ev.target.closest('#dm-btn-voice')) {
        ev.stopPropagation();
        toggleDmVoiceRecorder();
        return;
      }

      // Botão + (mais opções) do DM
      if (ev.target.closest('#dm-btn-plus')) {
        ev.stopPropagation();
        // TODO: Implementar menu de mais opções (enquete, tópico, arquivo)
        return;
      }

      // Tabs de categoria do emoji picker do DM
      const dmEmojiCat = ev.target.closest('#dm-emoji-picker .emoji-category-btn');
      if (dmEmojiCat && dmEmojiCat.id !== 'dm-btn-add-custom-emoji') {
        ev.stopPropagation();
        document.querySelectorAll('#dm-emoji-picker .emoji-category-btn').forEach(b => b.classList.remove('active'));
        dmEmojiCat.classList.add('active');
        renderDmEmojiCategory(dmEmojiCat.dataset.category);
        return;
      }

      // Tabs de pack do sticker picker do DM
      const dmStickerTab = ev.target.closest('#dm-sticker-picker .sticker-pack-btn');
      if (dmStickerTab) {
        ev.stopPropagation();
        document.querySelectorAll('#dm-sticker-picker .sticker-pack-btn').forEach(b => b.classList.remove('active'));
        dmStickerTab.classList.add('active');
        renderDmStickerPack(dmStickerTab.dataset.pack);
        return;
      }

      // Fechar ao clicar fora dos pickers do DM
      if (!ev.target.closest('#dm-emoji-picker') &&
          !ev.target.closest('#dm-gif-picker') &&
          !ev.target.closest('#dm-sticker-picker') &&
          !ev.target.closest('#dm-btn-emoji') &&
          !ev.target.closest('#dm-btn-gif') &&
          !ev.target.closest('#dm-btn-stickers') &&
          !ev.target.closest('#dm-btn-plus') &&
          !ev.target.closest('#dm-btn-voice')) {
        closeAllDmPickers();
      }
    }, true);

    // Pesquisa de GIFs do DM
    document.addEventListener('input', ev => {
      if (ev.target.closest('#dm-gif-picker .gif-search-input')) {
        clearTimeout(dmGifTimeout);
        dmGifTimeout = setTimeout(() => loadDmGifs(ev.target.value), 400);
      }
    }, true);

    // ESC fecha pickers do DM
    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') closeAllDmPickers();
    });
  }

  // ================================================
  // INICIALIZAÇÃO
  // ================================================
  waitForFixPickers(() => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachDmPickerListeners);
    } else {
      attachDmPickerListeners();
    }

    // Inicializar categorias padrão
    setTimeout(() => {
      const ep = document.getElementById('dm-emoji-picker');
      if (ep) renderDmEmojiCategory('smileys');
      const sp = document.getElementById('dm-sticker-picker');
      if (sp) renderDmStickerPack('default');
    }, 500);
  });

  // Expor funções globalmente para uso em HTML
  window.toggleDmVoiceRecorder = toggleDmVoiceRecorder;
  window.closeAllDmPickers = closeAllDmPickers;

})();
