// Guard: evita carregamento múltiplo que causa declarações duplicadas
if (window.__zx_chat_input_loaded) {
  console.warn('chat-input.js already loaded — skipping duplicate initialization');
} else {
window.__zx_chat_input_loaded = true;

document.addEventListener('DOMContentLoaded', () => {

  // ================================================
  // BARRA DE DIGITAÇÃO - SOMENTE EMOJIS E GIFS
  // ================================================

  const btnGif = document.getElementById('btn-gif');
  const gifPicker = document.getElementById('gif-picker');
  const messageInput = document.getElementById('message-input');

// Fechar todos os pickers
function closeAllPickers() {
  gifPicker.classList.remove('active');
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
// GIF PICKER (TENOR API)
// ================================================

const TENOR_KEY = 'LIVDSRZULELA';
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
// EVENTOS GLOBAIS
// ================================================

document.addEventListener('click', (e) => {
  if (!e.target.closest('.chat-picker') && 
      !e.target.closest('#btn-gif') &&
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
  
  menu.querySelectorAll('.plus-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      
      menu.remove();
      
      if (item.dataset.action === 'poll') {
        openPollCreator();
      } else if (item.dataset.action === 'topic') {
        openTopicCreator();
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
  
  // Focar automaticamente no campo de pergunta
  setTimeout(() => {
    document.getElementById('poll-question')?.focus();
  }, 100);
}

function openTopicCreator() {
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

}