// Handlers do modal de criação de Short
// Este arquivo é carregado após o script principal do index.html

(function() {
  function attachShortsHandlers() {
    // File change → show preview
    var inp = document.getElementById('short-file-input');
    if (inp && !inp._shortsHandlerAttached) {
      inp._shortsHandlerAttached = true;
      inp.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        window._shortFile = file;
        window._shortUrl = URL.createObjectURL(file);
        var ua = document.getElementById('short-upload-area');
        var pc = document.getElementById('short-preview-container');
        var pv = document.getElementById('short-preview-video');
        var pi = document.getElementById('short-preview-image');
        if (file.type.startsWith('video/')) {
          pv.src = window._shortUrl; pv.classList.remove('hidden'); pi.classList.add('hidden');
        } else {
          pi.src = window._shortUrl; pi.classList.remove('hidden'); pv.classList.add('hidden');
        }
        if (ua) ua.style.display = 'none';
        if (pc) pc.classList.remove('hidden');
      });
    }

    // Remove file
    var btnRm = document.getElementById('short-remove-file');
    if (btnRm && !btnRm._shortsHandlerAttached) {
      btnRm._shortsHandlerAttached = true;
      btnRm.addEventListener('click', function() {
        if (window._shortResetModal) window._shortResetModal();
      });
    }

    // Cancel
    var btnCancel = document.getElementById('btn-cancel-short');
    if (btnCancel && !btnCancel._shortsHandlerAttached) {
      btnCancel._shortsHandlerAttached = true;
      btnCancel.addEventListener('click', function() {
        if (window._shortResetModal) window._shortResetModal();
        if (window.closeShortModal) window.closeShortModal();
      });
    }

    // Publish
    var btnPublish = document.getElementById('btn-publish-short');
    if (btnPublish && !btnPublish._shortsHandlerAttached) {
      btnPublish._shortsHandlerAttached = true;
      btnPublish.addEventListener('click', async function() {
        var title = (document.getElementById('short-title').value || '').trim();
        var description = (document.getElementById('short-description').value || '').trim();
        var tags = (document.getElementById('short-tags').value || '').trim();
        var file = window._shortFile || (document.getElementById('short-file-input').files[0]);
        if (!file) { alert('Selecione um vídeo ou imagem para publicar o Short'); return; }
        if (!title) { alert('Digite um título para o Short'); return; }

        btnPublish.disabled = true;
        btnPublish.textContent = '⏳ Enviando...';
        var btnC2 = document.getElementById('btn-cancel-short');
        if (btnC2) btnC2.disabled = true;

        try {
          var formData = new FormData();
          formData.append('file', file);
          var uploadResp = await fetch('/api/upload-short', { method: 'POST', body: formData });
          if (!uploadResp.ok) throw new Error('Falha no upload do arquivo');
          var uploadData = await uploadResp.json();
          console.log('[SHORTS-HANDLERS] Upload OK:', uploadData);
          
          var socket = window.socket;
          console.log('[SHORTS-HANDLERS] Socket:', socket);
          console.log('[SHORTS-HANDLERS] Socket.connected:', socket ? socket.connected : 'N/A');
          console.log('[SHORTS-HANDLERS] Socket.id:', socket ? socket.id : 'N/A');
          
          if (socket && socket.connected) {
            console.log('[SHORTS-HANDLERS] Emitindo short:create');
            socket.emit('short:create', {
              title: title, description: description, tags: tags,
              fileType: uploadData.fileType || file.type,
              fileUrl: uploadData.fileUrl,
              username: window.currentUsername || window.username || 'Usuário',
              timestamp: Date.now()
            });
            
            // Aguarda confirmação do servidor
            socket.once('short:created', (response) => {
              console.log('[SHORTS-HANDLERS] Servidor confirmou criação:', response);
            });
          } else {
            console.error('[SHORTS-HANDLERS] Socket não disponível ou não conectado');
            throw new Error('Conexão com servidor não disponível');
          }
          if (window._shortResetModal) window._shortResetModal();
          if (window.closeShortModal) window.closeShortModal();
          alert('✅ Short publicado com sucesso!');
        } catch (err) {
          console.error('[SHORTS-HANDLERS] Erro:', err);
          alert('❌ Erro ao enviar o arquivo: ' + err.message);
        } finally {
          btnPublish.disabled = false;
          btnPublish.textContent = '📤 Publicar Short';
          if (btnC2) btnC2.disabled = false;
        }
      });
    }

    // Drag-and-drop
    if (!document._shortsDragDropAttached) {
      document._shortsDragDropAttached = true;
      document.addEventListener('dragover', function(e) {
        if (e.target.closest('#short-upload-area')) {
          e.preventDefault();
          e.target.closest('#short-upload-area').style.borderColor = 'rgba(0,255,255,0.9)';
          e.target.closest('#short-upload-area').style.background = 'rgba(0,255,255,0.12)';
        }
      });
      document.addEventListener('dragleave', function(e) {
        var area = document.getElementById('short-upload-area');
        if (area && !area.contains(e.relatedTarget)) {
          area.style.borderColor = 'rgba(0,255,255,0.4)';
          area.style.background = 'rgba(0,255,255,0.05)';
        }
      });
      document.addEventListener('drop', function(e) {
        if (e.target.closest('#short-upload-area')) {
          e.preventDefault();
          var area = e.target.closest('#short-upload-area');
          area.style.borderColor = 'rgba(0,255,255,0.4)';
          area.style.background = 'rgba(0,255,255,0.05)';
          var file = e.dataTransfer.files[0];
          if (file && (file.type.startsWith('video/') || file.type.startsWith('image/'))) {
            var inp2 = document.getElementById('short-file-input');
            var dt = new DataTransfer();
            dt.items.add(file);
            if (inp2) { inp2.files = dt.files; inp2.dispatchEvent(new Event('change', { bubbles: true })); }
          }
        }
      });
    }
  }

  // Tenta anexar handlers imediatamente, ou espera DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachShortsHandlers);
  } else {
    attachShortsHandlers();
  }

  console.log('[SHORTS-HANDLERS] Carregado com sucesso');
})();
