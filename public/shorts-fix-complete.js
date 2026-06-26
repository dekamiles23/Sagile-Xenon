/* =====================================================================
 * SHORTS / REELS — CORREÇÃO DEFINITIVA v14
 * • Imagem preenche 100% do card (sem barra preta)
 * • Botão direito (dono) → dropdown Editar / Apagar
 * • Modal de edição de título, descrição e tags
 * • Clique esquerdo → viewer tela cheia
 *   – Imagem: fecha após 10 s (barra de progresso)
 *   – Vídeo:  fecha após 60 s (barra de progresso)
 * ===================================================================== */
(function () {
  'use strict';

  var TAG = '[SHORTS]';
  function log()  { var a = [].slice.call(arguments); console.log.apply(console,  [TAG].concat(a)); }
  function warn() { var a = [].slice.call(arguments); console.warn.apply(console, ['⚠ '+TAG].concat(a)); }
  function err()  { var a = [].slice.call(arguments); console.error.apply(console,['❌ '+TAG].concat(a)); }

  /* ── fonte da verdade em memória ──────────────────────────────── */
  var _shortsData    = [];
  var _file          = null;
  var _historyLoaded = false;

  function getSocket() { return window.socket || null; }

  function upsertShort(data, prepend) {
    if (_shortsData.find(function (s) { return s.id === data.id; })) return;
    prepend ? _shortsData.unshift(data) : _shortsData.push(data);
    log('upsertShort id=' + data.id + ' total=' + _shortsData.length);
  }
  function removeShort(id) {
    _shortsData = _shortsData.filter(function (s) { return s.id !== id; });
  }
  function updateShort(id, patch) {
    var s = _shortsData.find(function (s) { return s.id === id; });
    if (s) Object.assign(s, patch);
  }

  /* ═══════════════════════════════════════════════════════════════
   *  CONTAINER
   * ═══════════════════════════════════════════════════════════════ */
  var CONTAINER_STYLE =
    'display:grid;grid-template-columns:1fr 1fr;gap:10px;' +
    'align-items:start;align-content:start;' +
    'height:calc(100vh - 180px);overflow-y:auto;padding:4px 8px 8px;';

  function getOrCreateContainer() {
    var c = document.getElementById('shorts-container');
    if (c) { c.style.cssText = CONTAINER_STYLE; return c; }
    var panel = document.getElementById('discover-right-content');
    if (!panel) { warn('discover-right-content ausente'); return null; }
    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;' +
      'margin-bottom:12px;padding:0 12px;">' +
        '<h3 style="color:#00ffff;font-size:14px;font-weight:700;margin:0;">📱 SHORTS / REELS</h3>' +
        '<button onclick="window.openShortModal()" style="background:var(--neon,#00ffff);' +
        'border:none;border-radius:6px;padding:6px 10px;color:#0a0a1a;' +
        'font-size:11px;font-weight:600;cursor:pointer;">+ CRIAR</button>' +
      '</div>' +
      '<div id="shorts-container" style="' + CONTAINER_STYLE + '"></div>';
    return document.getElementById('shorts-container');
  }

  /* ═══════════════════════════════════════════════════════════════
   *  RENDER
   * ═══════════════════════════════════════════════════════════════ */
  function showEmpty(c) {
    if (!c || c.querySelector('[data-short-id]')) return;
    c.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 12px;color:#888;">' +
      '<div style="font-size:48px;margin-bottom:12px;">📱</div>' +
      '<div style="font-size:14px;margin-bottom:8px;">Nenhum Short ainda</div>' +
      '<div style="font-size:12px;">Seja o primeiro a criar um Short!</div></div>';
  }

  function renderAll() {
    var c = getOrCreateContainer();
    if (!c) { setTimeout(renderAll, 300); return; }
    c.querySelectorAll('[data-short-id]').forEach(function (el) { el.remove(); });
    var empty = c.querySelector('div[style*="grid-column"]');
    if (empty) empty.remove();
    if (!_shortsData.length) { showEmpty(c); return; }
    _shortsData.forEach(function (d) {
      if (!c.querySelector('[data-short-id="' + d.id + '"]')) c.appendChild(buildCard(d));
    });
    log('renderAll: ' + _shortsData.length + ' cards');
  }

  function prependCard(data) {
    var c = getOrCreateContainer();
    if (!c) { setTimeout(function () { prependCard(data); }, 300); return; }
    var empty = c.querySelector('div[style*="grid-column"]');
    if (empty) empty.remove();
    if (!c.querySelector('[data-short-id="' + data.id + '"]')) {
      c.prepend(buildCard(data));
      log('prependCard id=' + data.id);
    }
  }

  function removeCardFromDom(id) {
    var card = document.querySelector('[data-short-id="' + id + '"]');
    if (!card) return;
    card.style.opacity = '0'; card.style.transform = 'scale(0.8)';
    setTimeout(function () {
      card.remove();
      showEmpty(document.getElementById('shorts-container'));
    }, 200);
  }

  function refreshCardMeta(id) {
    var d = _shortsData.find(function (s) { return s.id === id; });
    if (!d) return;
    var card = document.querySelector('[data-short-id="' + id + '"]');
    if (!card) return;
    var titleEl = card.querySelector('.sf-title');
    var userEl  = card.querySelector('.sf-user');
    if (titleEl) titleEl.textContent = d.title || '';
    if (userEl)  userEl.textContent  = d.username || '';
  }

  /* ═══════════════════════════════════════════════════════════════
   *  BUILD CARD  (imagem preenche 100%, ratio quadrado)
   * ═══════════════════════════════════════════════════════════════ */
  function buildCard(d) {
    var isVideo  = d.fileType && d.fileType.startsWith('video/');
    var me       = window.username || window.currentUsername || sessionStorage.getItem('username') || '';
    var isAuthor = String(d.username) === String(me);

    var card = document.createElement('div');
    card.dataset.shortId = d.id;
    card.style.cssText =
      'position:relative;width:100%;border-radius:14px;overflow:hidden;cursor:pointer;' +
      'border:1px solid rgba(255,0,255,0.3);background:#000;' +
      'box-shadow:0 4px 16px rgba(0,0,0,0.5);transition:transform .18s,box-shadow .18s;';

    /* ── proporção 1:1 (quadrado) ── */
    var ratio = document.createElement('div');
    ratio.style.cssText = 'position:relative;width:100%;padding-bottom:100%;overflow:hidden;';

    /* ── mídia ── */
    var mediaEl = document.createElement(isVideo ? 'video' : 'img');
    mediaEl.src = d.fileUrl;
    mediaEl.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;' +
      'object-fit:cover;object-position:center;display:block;';
    mediaEl.onerror = function() {
      this.style.display = 'none';
      var fallback = document.createElement('div');
      fallback.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px;text-align:center;padding:20px;';
      fallback.textContent = isVideo ? 'Vídeo não disponível' : 'Imagem não disponível';
      ratio.appendChild(fallback);
    };
    if (isVideo) {
      mediaEl.muted = true; mediaEl.loop = true;
      mediaEl.setAttribute('playsinline', '');
    }

    /* ── overlay gradiente com meta ── */
    var overlay = document.createElement('div');
    overlay.style.cssText =
      'position:absolute;bottom:0;left:0;right:0;' +
      'background:linear-gradient(transparent 40%,rgba(0,0,0,0.78) 100%);' +
      'padding:20px 8px 7px;pointer-events:none;';
    overlay.innerHTML =
      '<div class="sf-title" style="color:#fff;font-size:11px;font-weight:700;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
      'text-shadow:0 1px 3px #000;">' + escHtml(d.title||'') + '</div>' +
      '<div class="sf-user" style="color:rgba(255,255,255,0.6);font-size:10px;margin-top:1px;">' +
        escHtml(d.username||'') + '</div>';

    ratio.appendChild(mediaEl);
    ratio.appendChild(overlay);
    card.appendChild(ratio);

    /* ── hover ── */
    card.addEventListener('mouseenter', function () {
      card.style.transform = 'scale(1.04)';
      card.style.boxShadow = '0 6px 26px rgba(0,255,255,0.22)';
      if (isVideo) mediaEl.play().catch(function(){});
    });
    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
      card.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)';
      if (isVideo) { mediaEl.pause(); mediaEl.currentTime = 0; }
    });

    /* ── clique esquerdo → viewer ── */
    card.addEventListener('click', function (e) {
      e.stopPropagation();
      openViewer(d);
    });

    /* ── clique direito (dono) → context menu ── */
    if (isAuthor) {
      card.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.clientX, e.clientY, d);
      });
    }

    return card;
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ═══════════════════════════════════════════════════════════════
   *  CONTEXT MENU (botão direito)
   * ═══════════════════════════════════════════════════════════════ */
  function showContextMenu(x, y, data) {
    closeContextMenu();
    var menu = document.createElement('div');
    menu.id = 'shorts-ctx-menu';
    menu.style.cssText =
      'position:fixed;z-index:99999;left:' + x + 'px;top:' + y + 'px;' +
      'background:#1a1a2e;border:1px solid rgba(0,255,255,0.3);border-radius:10px;' +
      'padding:6px 0;min-width:150px;box-shadow:0 8px 32px rgba(0,0,0,0.7);' +
      'animation:sfFadeIn .12s ease;';

    var items = [
      { icon: '✏️', label: 'Editar',  action: function () { openEditModal(data); } },
      { icon: '🗑️', label: 'Apagar',  action: function () { confirmDelete(data); } }
    ];

    items.forEach(function (item) {
      var btn = document.createElement('button');
      btn.style.cssText =
        'display:flex;align-items:center;gap:8px;width:100%;padding:9px 16px;' +
        'background:none;border:none;color:#fff;font-size:13px;cursor:pointer;' +
        'transition:background .12s;text-align:left;';
      btn.innerHTML = '<span>' + item.icon + '</span><span>' + item.label + '</span>';
      btn.onmouseenter = function () { btn.style.background = 'rgba(0,255,255,0.12)'; };
      btn.onmouseleave = function () { btn.style.background = 'none'; };
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeContextMenu();
        item.action();
      });
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    /* fechar ao clicar fora */
    setTimeout(function () {
      document.addEventListener('click', closeContextMenu, { once: true });
      document.addEventListener('contextmenu', closeContextMenu, { once: true });
    }, 10);

    /* garantir que não sai da tela */
    var r = menu.getBoundingClientRect();
    if (r.right  > window.innerWidth)  menu.style.left = (x - r.width)  + 'px';
    if (r.bottom > window.innerHeight) menu.style.top  = (y - r.height) + 'px';
  }

  function closeContextMenu() {
    var m = document.getElementById('shorts-ctx-menu');
    if (m) m.remove();
  }

  /* ═══════════════════════════════════════════════════════════════
   *  MODAL DE EDIÇÃO
   * ═══════════════════════════════════════════════════════════════ */
  function openEditModal(data) {
    closeEditModal();
    var ov = document.createElement('div');
    ov.id = 'shorts-edit-modal';
    ov.style.cssText =
      'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);' +
      'display:flex;align-items:center;justify-content:center;' +
      'animation:sfFadeIn .15s ease;';

    var box = document.createElement('div');
    box.style.cssText =
      'background:#1a1a2e;border:1px solid rgba(0,255,255,0.3);border-radius:16px;' +
      'padding:24px;width:340px;max-width:90vw;box-shadow:0 12px 48px rgba(0,0,0,0.8);';

    var field = function (id, label, value, tag) {
      tag = tag || 'input';
      var lbl  = '<label style="display:block;color:#00ffff;font-size:12px;' +
                 'font-weight:600;margin-bottom:4px;">' + label + '</label>';
      var base = 'width:100%;box-sizing:border-box;background:#0d0d22;border:1px solid rgba(0,255,255,0.2);' +
                 'border-radius:8px;padding:9px 12px;color:#fff;font-size:13px;' +
                 'outline:none;font-family:inherit;resize:vertical;';
      if (tag === 'textarea') {
        return lbl + '<textarea id="sf-edit-' + id + '" rows="3" style="' + base + '">' +
          escHtml(value||'') + '</textarea>';
      }
      return lbl + '<input id="sf-edit-' + id + '" type="text" style="' + base + '" value="' +
        escHtml(value||'') + '">';
    };

    box.innerHTML =
      '<h3 style="color:#fff;font-size:15px;font-weight:700;margin:0 0 18px;">✏️ Editar Short</h3>' +
      '<div style="margin-bottom:14px;">' + field('title', 'Título', data.title) + '</div>' +
      '<div style="margin-bottom:14px;">' + field('description', 'Descrição', data.description, 'textarea') + '</div>' +
      '<div style="margin-bottom:20px;">' + field('tags', 'Tags', data.tags) + '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
        '<button id="sf-edit-cancel" style="background:rgba(255,255,255,0.08);border:none;' +
        'border-radius:8px;padding:9px 20px;color:#aaa;font-size:13px;cursor:pointer;">Cancelar</button>' +
        '<button id="sf-edit-save" style="background:#00ffff;border:none;border-radius:8px;' +
        'padding:9px 20px;color:#0a0a1a;font-size:13px;font-weight:700;cursor:pointer;">Salvar</button>' +
      '</div>';

    ov.appendChild(box);
    document.body.appendChild(ov);

    ov.addEventListener('click', function (e) { if (e.target === ov) closeEditModal(); });
    document.getElementById('sf-edit-cancel').addEventListener('click', closeEditModal);
    document.getElementById('sf-edit-save').addEventListener('click', function () {
      var title       = document.getElementById('sf-edit-title').value.trim();
      var description = document.getElementById('sf-edit-description').value.trim();
      var tags        = document.getElementById('sf-edit-tags').value.trim();
      if (!title) { alert('Título não pode ser vazio.'); return; }
      var patch = { title: title, description: description, tags: tags };
      updateShort(data.id, patch);
      refreshCardMeta(data.id);
      var sock = getSocket();
      if (sock) sock.emit('short:edit', Object.assign({ shortId: data.id }, patch));
      closeEditModal();
      log('short editado id=' + data.id);
    });

    setTimeout(function () { var t = document.getElementById('sf-edit-title'); if (t) t.focus(); }, 50);
  }

  function closeEditModal() {
    var m = document.getElementById('shorts-edit-modal');
    if (m) m.remove();
  }

  /* ═══════════════════════════════════════════════════════════════
   *  CONFIRMAR APAGAR
   * ═══════════════════════════════════════════════════════════════ */
  function confirmDelete(data) {
    if (!confirm('Apagar o Short "' + (data.title||data.id) + '"?')) return;
    removeShort(data.id);
    removeCardFromDom(data.id);
    var sock = getSocket();
    if (sock) sock.emit('short:delete', { shortId: data.id });
    log('short deletado id=' + data.id);
  }

  /* ═══════════════════════════════════════════════════════════════
   *  VIEWER TELA CHEIA
   *  • Imagem: 10 s, barra de progresso, fecha automaticamente
   *  • Vídeo: toca até 60 s ou terminar, fecha automaticamente
   * ═══════════════════════════════════════════════════════════════ */
  var _viewerTimer  = null;
  var _viewerRaf    = null;

  function openViewer(data) {
    closeViewer();
    var isVideo = data.fileType && data.fileType.startsWith('video/');
    var DURATION = isVideo ? 60 : 10; /* segundos */

    var ov = document.createElement('div');
    ov.id = 'shorts-viewer';
    ov.style.cssText =
      'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.96);' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'animation:sfFadeIn .2s ease;';

    /* botão fechar */
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText =
      'position:absolute;top:16px;right:20px;background:rgba(255,255,255,0.12);' +
      'border:none;border-radius:50%;width:38px;height:38px;color:#fff;font-size:18px;' +
      'cursor:pointer;z-index:2;transition:background .15s;';
    closeBtn.onmouseenter = function () { closeBtn.style.background = 'rgba(255,255,255,0.25)'; };
    closeBtn.onmouseleave = function () { closeBtn.style.background = 'rgba(255,255,255,0.12)'; };
    closeBtn.addEventListener('click', function (e) { e.stopPropagation(); closeViewer(); });

    /* info (título + autor) — sobre o vídeo */
    var info = document.createElement('div');
    info.style.cssText =
      'position:absolute;top:16px;left:16px;right:16px;' +
      'z-index:10;' +
      'background:linear-gradient(180deg,rgba(0,0,0,0.8),transparent);' +
      'backdrop-filter:blur(4px);' +
      'border-radius:12px 12px 0 0;padding:12px 16px;';
    info.innerHTML =
      '<div style="color:#fff;font-size:16px;font-weight:700;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
      'text-shadow:0 2px 8px rgba(0,0,0,0.8);letter-spacing:.3px;">' + escHtml(data.title||'') + '</div>' +
      '<div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:4px;' +
      'text-shadow:0 1px 4px rgba(0,0,0,0.8);">' +
        escHtml(data.username||'') + '</div>';

    /* mídia centralizada */
    var mediaWrap = document.createElement('div');
    mediaWrap.style.cssText =
      'display:flex;align-items:center;justify-content:center;' +
      'max-height:85vh;max-width:90vw;position:relative;';

    var mediaEl = document.createElement(isVideo ? 'video' : 'img');
    mediaEl.src = data.fileUrl;
    mediaEl.style.cssText =
      'max-height:82vh;max-width:88vw;border-radius:16px;' +
      'object-fit:contain;box-shadow:0 8px 48px rgba(0,0,0,0.8);' +
      'border:2px solid rgba(255,0,255,0.2);';
    mediaEl.onerror = function() {
      this.style.display = 'none';
      var fallback = document.createElement('div');
      fallback.style.cssText = 'color:#888;font-size:14px;text-align:center;padding:20px;';
      fallback.textContent = isVideo ? 'Vídeo não disponível' : 'Imagem não disponível';
      mediaWrap.appendChild(fallback);
    };
    if (isVideo) {
      mediaEl.controls = false; // Remove controles nativos
      mediaEl.autoplay = true;
      mediaEl.setAttribute('playsinline','');
      mediaEl.id = 'modern-viewer-video';
      
      // Adicionar controles personalizados
      var controls = document.createElement('div');
      controls.style.cssText =
        'position:absolute;bottom:0;left:0;right:0;' +
        'background:linear-gradient(transparent,rgba(0,0,0,0.9));' +
        'padding:16px;border-radius:0 0 16px 16px;' +
        'opacity:0;transition:opacity 0.3s ease;';
      controls.id = 'viewer-video-controls';
      
      // Barra de progresso
      var progressWrap = document.createElement('div');
      progressWrap.style.cssText =
        'width:100%;height:4px;background:rgba(255,255,255,0.2);' +
        'border-radius:2px;margin-bottom:12px;cursor:pointer;position:relative;overflow:hidden;';
      
      var progressBar = document.createElement('div');
      progressBar.style.cssText =
        'height:100%;background:linear-gradient(90deg,#ff00ff,#00ffff);' +
        'width:0%;border-radius:2px;transition:width 0.1s linear;';
      progressBar.id = 'viewer-progress-bar';
      
      var progressHandle = document.createElement('div');
      progressHandle.style.cssText =
        'position:absolute;top:50%;transform:translate(-50%,-50%);' +
        'width:12px;height:12px;background:#fff;border-radius:50%;' +
        'box-shadow:0 0 10px rgba(255,0,255,0.5);left:0%;' +
        'transition:left 0.1s linear;';
      progressHandle.id = 'viewer-progress-handle';
      
      progressWrap.appendChild(progressBar);
      progressWrap.appendChild(progressHandle);
      
      // Botões de controle
      var controlsRow = document.createElement('div');
      controlsRow.style.cssText =
        'display:flex;align-items:center;justify-content:space-between;';
      
      var leftControls = document.createElement('div');
      leftControls.style.cssText = 'display:flex;align-items:center;gap:12px;';
      
      var playPauseBtn = document.createElement('button');
      playPauseBtn.innerHTML = '⏸️';
      playPauseBtn.style.cssText =
        'background:rgba(255,0,255,0.2);border:none;color:#fff;' +
        'font-size:18px;cursor:pointer;padding:8px;border-radius:50%;' +
        'width:40px;height:40px;display:flex;align-items:center;justify-content:center;' +
        'transition:all 0.3s ease;';
      playPauseBtn.id = 'viewer-play-pause';
      
      var muteBtn = document.createElement('button');
      muteBtn.innerHTML = '🔊';
      muteBtn.style.cssText =
        'background:transparent;border:none;color:#fff;font-size:16px;' +
        'cursor:pointer;padding:6px;transition:all 0.3s ease;';
      muteBtn.id = 'viewer-mute-btn';
      
      // Volume slider container
      var volumeContainer = document.createElement('div');
      volumeContainer.style.cssText =
        'display:flex;align-items:center;gap:6px;position:relative;';
      
      var volumeSlider = document.createElement('input');
      volumeSlider.type = 'range';
      volumeSlider.min = '0';
      volumeSlider.max = '1';
      volumeSlider.step = '0.1';
      volumeSlider.value = '1';
      volumeSlider.style.cssText =
        'width:60px;height:4px;background:rgba(255,255,255,0.2);' +
        'border-radius:2px;outline:none;cursor:pointer;' +
        '-webkit-appearance:none;';
      volumeSlider.id = 'viewer-volume-slider';
      
      volumeContainer.appendChild(muteBtn);
      volumeContainer.appendChild(volumeSlider);
      
      var timeDisplay = document.createElement('span');
      timeDisplay.style.cssText =
        'color:rgba(255,255,255,0.8);font-size:12px;font-family:monospace;';
      timeDisplay.id = 'viewer-time-display';
      timeDisplay.textContent = '0:00 / 0:00';
      
      leftControls.appendChild(playPauseBtn);
      leftControls.appendChild(volumeContainer);
      leftControls.appendChild(timeDisplay);
      
      var rightControls = document.createElement('div');
      rightControls.style.cssText = 'display:flex;align-items:center;gap:8px;';
      
      var downloadBtn = document.createElement('button');
      downloadBtn.innerHTML = '⬇️';
      downloadBtn.style.cssText =
        'background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);' +
        'color:#00ff88;font-size:14px;cursor:pointer;padding:6px 10px;' +
        'border-radius:6px;transition:all 0.3s ease;';
      downloadBtn.title = 'Baixar vídeo';
      downloadBtn.id = 'viewer-download-btn';
      
      var fullscreenBtn = document.createElement('button');
      fullscreenBtn.innerHTML = '⛶';
      fullscreenBtn.style.cssText =
        'background:rgba(0,255,255,0.1);border:1px solid rgba(0,255,255,0.3);' +
        'color:#fff;font-size:14px;cursor:pointer;padding:6px 10px;' +
        'border-radius:6px;transition:all 0.3s ease;';
      fullscreenBtn.id = 'viewer-fullscreen-btn';
      
      rightControls.appendChild(downloadBtn);
      rightControls.appendChild(fullscreenBtn);
      
      controlsRow.appendChild(leftControls);
      controlsRow.appendChild(rightControls);
      
      controls.appendChild(progressWrap);
      controls.appendChild(controlsRow);
      
      mediaWrap.appendChild(controls);
      
      // Botão central de play/pause
      var centerPlayBtn = document.createElement('div');
      centerPlayBtn.innerHTML = '▶️';
      centerPlayBtn.style.cssText =
        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:70px;height:70px;background:rgba(255,0,255,0.3);' +
        'backdrop-filter:blur(10px);border:2px solid rgba(255,0,255,0.5);' +
        'border-radius:50%;display:flex;align-items:center;justify-content:center;' +
        'font-size:28px;cursor:pointer;transition:all 0.3s ease;opacity:0;';
      centerPlayBtn.id = 'viewer-center-play';
      mediaWrap.appendChild(centerPlayBtn);
      
      // Mostrar controles ao passar o mouse
      mediaWrap.addEventListener('mouseenter', function() {
        controls.style.opacity = '1';
        centerPlayBtn.style.opacity = mediaEl.paused ? '1' : '0';
      });
      mediaWrap.addEventListener('mouseleave', function() {
        controls.style.opacity = '0';
        centerPlayBtn.style.opacity = '0';
      });
      
      // Funcionalidade dos controles
      setTimeout(function() {
        var video = document.getElementById('modern-viewer-video');
        if (!video) return;
        
        var togglePlay = function() {
          if (video.paused) {
            video.play();
            playPauseBtn.innerHTML = '⏸️';
            centerPlayBtn.style.opacity = '0';
          } else {
            video.pause();
            playPauseBtn.innerHTML = '▶️';
            centerPlayBtn.style.opacity = '1';
          }
        };
        
        playPauseBtn.addEventListener('click', togglePlay);
        centerPlayBtn.addEventListener('click', togglePlay);
        video.addEventListener('click', togglePlay);
        
        muteBtn.addEventListener('click', function() {
          video.muted = !video.muted;
          muteBtn.innerHTML = video.muted ? '🔇' : '🔊';
          volumeSlider.value = video.muted ? '0' : video.volume;
        });
        
        volumeSlider.addEventListener('input', function() {
          video.volume = parseFloat(this.value);
          video.muted = video.volume === 0;
          muteBtn.innerHTML = video.muted ? '🔇' : '🔊';
        });
        
        downloadBtn.addEventListener('click', function() {
          var link = document.createElement('a');
          link.href = data.fileUrl;
          link.download = (data.title || 'short') + '.mp4';
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
        
        fullscreenBtn.addEventListener('click', function() {
          if (video.requestFullscreen) {
            video.requestFullscreen();
          } else if (video.webkitRequestFullscreen) {
            video.webkitRequestFullscreen();
          }
        });
        
        progressWrap.addEventListener('click', function(e) {
          var rect = progressWrap.getBoundingClientRect();
          var percent = (e.clientX - rect.left) / rect.width;
          video.currentTime = percent * video.duration;
        });
        
        video.addEventListener('timeupdate', function() {
          var percent = (video.currentTime / video.duration) * 100;
          progressBar.style.width = percent + '%';
          progressHandle.style.left = percent + '%';
          
          var current = formatTime(video.currentTime);
          var total = formatTime(video.duration);
          timeDisplay.textContent = current + ' / ' + total;
        });
        
        video.addEventListener('play', function() {
          centerPlayBtn.style.opacity = '0';
        });
        
        video.addEventListener('pause', function() {
          centerPlayBtn.style.opacity = '1';
        });
        
        function formatTime(seconds) {
          var mins = Math.floor(seconds / 60);
          var secs = Math.floor(seconds % 60);
          return mins + ':' + secs.toString().padStart(2, '0');
        }
      }, 100);
    }
    mediaWrap.appendChild(mediaEl);

    /* barra de progresso + contador */
    var barWrap = document.createElement('div');
    barWrap.style.cssText =
      'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);' +
      'width:min(360px,80vw);';

    var timerLabel = document.createElement('div');
    timerLabel.style.cssText =
      'color:rgba(255,255,255,0.65);font-size:11px;text-align:center;' +
      'margin-bottom:5px;font-family:monospace;';

    var barTrack = document.createElement('div');
    barTrack.style.cssText =
      'height:3px;background:rgba(255,255,255,0.15);border-radius:2px;overflow:hidden;';

    var barFill = document.createElement('div');
    barFill.style.cssText =
      'height:100%;width:0%;background:linear-gradient(90deg,#00ffff,#ff00ff);' +
      'border-radius:2px;transition:width .1s linear;';

    barTrack.appendChild(barFill);
    barWrap.appendChild(timerLabel);
    barWrap.appendChild(barTrack);

    ov.appendChild(closeBtn);
    ov.appendChild(info);
    ov.appendChild(mediaWrap);
    ov.appendChild(barWrap);
    document.body.appendChild(ov);

    /* fechar ao clicar fora da mídia */
    ov.addEventListener('click', function (e) { if (e.target === ov) closeViewer(); });

    /* ESC fecha */
    function onKey(e) { if (e.key === 'Escape') closeViewer(); }
    document.addEventListener('keydown', onKey);
    ov._removeKey = function () { document.removeEventListener('keydown', onKey); };

    /* temporizador */
    var start = null;
    function tick(ts) {
      if (!start) start = ts;
      var elapsed  = (ts - start) / 1000;
      var pct      = Math.min(elapsed / DURATION * 100, 100);
      var remaining = Math.max(DURATION - elapsed, 0);
      barFill.style.width  = pct + '%';
      timerLabel.textContent = isVideo
        ? '⏱ ' + remaining.toFixed(0) + 's restantes'
        : '🕐 Fecha em ' + remaining.toFixed(1) + 's';
      if (elapsed >= DURATION) { closeViewer(); return; }
      _viewerRaf = requestAnimationFrame(tick);
    }

    if (isVideo) {
      /* para vídeo: inicia barra quando reprodução começar */
      mediaEl.addEventListener('play', function () {
        if (!start) _viewerRaf = requestAnimationFrame(tick);
      }, { once: true });
      /* fecha quando o vídeo terminar (antes do limite de 60s) */
      mediaEl.addEventListener('ended', closeViewer);
    } else {
      _viewerRaf = requestAnimationFrame(tick);
    }
  }

  function closeViewer() {
    if (_viewerRaf)  { cancelAnimationFrame(_viewerRaf);  _viewerRaf  = null; }
    if (_viewerTimer){ clearTimeout(_viewerTimer);         _viewerTimer = null; }
    var ov = document.getElementById('shorts-viewer');
    if (ov) {
      if (ov._removeKey) ov._removeKey();
      var vid = ov.querySelector('video');
      if (vid) { vid.pause(); vid.src = ''; }
      ov.remove();
    }
  }

  /* ═══════════════════════════════════════════════════════════════
   *  SOCKET
   * ═══════════════════════════════════════════════════════════════ */
  function registerSocketListeners(sock) {
    if (sock._shortsFixDone) { log('listeners já registrados'); return; }
    sock._shortsFixDone = true;

    sock.on('shorts:history', function (list) {
      log('shorts:history ' + (Array.isArray(list) ? list.length : '?') + ' item(s)');
      if (!Array.isArray(list)) return;
      _shortsData = []; _historyLoaded = true;
      list.forEach(function (d) { upsertShort(d, false); });
      renderAll();
    });

    sock.on('short:new', function (d) {
      log('short:new id=' + d.id);
      upsertShort(d, true);
      prependCard(d);
    });

    sock.on('short:removed', function (info) {
      log('short:removed id=' + info.shortId);
      removeShort(info.shortId);
      removeCardFromDom(info.shortId);
    });

    sock.on('short:updated', function (info) {
      log('short:updated id=' + info.shortId);
      if (info.shortId) { updateShort(info.shortId, info); refreshCardMeta(info.shortId); }
    });
  }

  function requestHistory(sock) {
    if (!sock) return;
    if (sock.connected) { log('emitindo shorts:request'); sock.emit('shorts:request'); }
    else sock.once('connect', function () { sock.emit('shorts:request'); });
  }

  /* ═══════════════════════════════════════════════════════════════
   *  PATCH setHomeSidebar
   * ═══════════════════════════════════════════════════════════════ */
  function patchSetHomeSidebar() {
    var original = window.setHomeSidebar;
    window.setHomeSidebar = function () {
      log('setHomeSidebar called (mem=' + _shortsData.length + ')');
      if (typeof original === 'function') {
        try { original.call(this); } catch(e) { warn('original lançou: ' + e.message); }
      }
      setTimeout(function () {
        if (_historyLoaded && _shortsData.length > 0) renderAll();
        else requestHistory(getSocket());
      }, 160);
    };
    log('patchSetHomeSidebar ok');
  }

  /* ═══════════════════════════════════════════════════════════════
   *  PUBLISH HANDLER
   * ═══════════════════════════════════════════════════════════════ */
  function attachPublishHandler() {
    var btn = document.getElementById('btn-publish-short');
    if (!btn) { warn('#btn-publish-short não encontrado'); return; }
    var fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);

    fresh.addEventListener('click', async function (e) {
      e.stopImmediatePropagation();
      var title       = (document.getElementById('short-title')?.value       || '').trim();
      var description = (document.getElementById('short-description')?.value || '').trim();
      var tags        = (document.getElementById('short-tags')?.value        || '').trim();
      var file        = _file || document.getElementById('short-file-input')?.files[0];

      if (!file)  { alert('Selecione um vídeo ou imagem primeiro.'); return; }
      if (!title) { alert('Digite um título.'); return; }

      fresh.disabled = true; fresh.textContent = '⏳ Enviando...';
      var btnC = document.getElementById('btn-cancel-short');
      if (btnC) btnC.disabled = true;

      try {
        var fd = new FormData(); fd.append('file', file);
        var resp = await fetch('/api/upload-short', { method: 'POST', body: fd });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var json = await resp.json();
        if (!json.fileUrl) throw new Error('Sem fileUrl');

        var sock = getSocket();
        if (!sock) throw new Error('Socket indisponível');

        sock.emit('short:create', {
          title: title, description: description, tags: tags,
          fileType: json.fileType || file.type,
          fileUrl:  json.fileUrl,
          username: window.username || window.currentUsername || sessionStorage.getItem('username') || 'Usuário',
          timestamp: Date.now()
        });

        resetModal();
        var modal = document.getElementById('create-short-modal');
        if (modal) { modal.classList.add('hidden'); modal.removeAttribute('style'); }
        alert('✅ Short publicado!');
      } catch (e) {
        err('publish error:', e.message); alert('❌ Erro: ' + e.message);
      } finally {
        fresh.disabled = false; fresh.textContent = '📤 Publicar Short';
        if (btnC) btnC.disabled = false;
      }
    });
    log('attachPublishHandler ok');
  }

  function resetModal() {
    _file = null;
    ['short-title','short-description','short-tags','short-file-input'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    var pc = document.getElementById('short-preview-container'); if (pc) pc.classList.add('hidden');
    var ua = document.getElementById('short-upload-area');       if (ua) { ua.classList.remove('hidden'); ua.style.display=''; }
    var pv = document.getElementById('short-preview-video');     if (pv) { pv.src=''; pv.classList.add('hidden'); }
    var pi = document.getElementById('short-preview-image');     if (pi) { pi.src=''; pi.classList.add('hidden'); }
  }

  function attachFileHandler() {
    var inp = document.getElementById('short-file-input'); if (!inp) return;
    var fresh = inp.cloneNode(true); inp.parentNode.replaceChild(fresh, inp);
    fresh.addEventListener('change', function (e) {
      var file = e.target.files[0]; if (!file) return;
      _file = file;
      var url = URL.createObjectURL(file);
      var ua = document.getElementById('short-upload-area');
      var pc = document.getElementById('short-preview-container');
      var pv = document.getElementById('short-preview-video');
      var pi = document.getElementById('short-preview-image');
      if (file.type.startsWith('video/')) {
        if (pv) { pv.src=url; pv.classList.remove('hidden'); } if (pi) pi.classList.add('hidden');
      } else {
        if (pi) { pi.src=url; pi.classList.remove('hidden'); } if (pv) pv.classList.add('hidden');
      }
      if (ua) ua.style.display = 'none'; if (pc) pc.classList.remove('hidden');
    });
  }

  function attachRemoveFileHandler() {
    var btn = document.getElementById('short-remove-file'); if (!btn) return;
    var fresh = btn.cloneNode(true); btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener('click', resetModal);
  }

  /* ═══════════════════════════════════════════════════════════════
   *  ESTILOS GLOBAIS (animação fade-in + foco nos inputs)
   * ═══════════════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('shorts-fix-styles')) return;
    var s = document.createElement('style');
    s.id = 'shorts-fix-styles';
    s.textContent =
      '@keyframes sfFadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}' +
      '#sf-edit-title:focus,#sf-edit-description:focus,#sf-edit-tags:focus{' +
        'border-color:rgba(0,255,255,0.6)!important;box-shadow:0 0 0 2px rgba(0,255,255,0.15);}' +
      '#shorts-ctx-menu button:focus{outline:none;}';
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════════════
   *  INIT
   * ═══════════════════════════════════════════════════════════════ */
  function init() {
    log('=== init() v14 ===');
    injectStyles();
    patchSetHomeSidebar();
    attachPublishHandler();
    attachFileHandler();
    attachRemoveFileHandler();

    var sock = getSocket();
    if (sock) { registerSocketListeners(sock); requestHistory(sock); }
    else {
      var tries = 0, t = setInterval(function () {
        var s = getSocket();
        if (s || ++tries > 50) {
          clearInterval(t);
          if (s) { registerSocketListeners(s); requestHistory(s); }
          else err('socket não encontrado após 5s');
        }
      }, 100);
    }

    window.addShortCard = function (d, p) { upsertShort(d, !!p); prependCard(d); };
    log('✅ shorts-fix-complete.js v14 pronto');
  }

  if (document.readyState === 'complete') { init(); }
  else { window.addEventListener('load', init); }
})();
