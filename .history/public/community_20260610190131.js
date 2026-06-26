const socket = io();

const params = new URLSearchParams(window.location.search);
const communityId = params.get('id') || `comm_${Date.now().toString(36)}`;
const communityName = params.get('name') || 'Minha Comunidade';

let username = sessionStorage.getItem('username') || '';
let currentChannel = null;
let currentChannelType = 'text';
let lastMessageUser = null;

// Sistema de Perfil Visual do Usuário
const DEFAULT_VISUAL_PROFILE = {
  bubbleColor: '#1a002b',
  textColor: '#eeeeee',
  bold: false,
  italic: false,
  underline: false,
  glow: false,
  glowColor: '#ff00ff',
  outline: false,
  outlineColor: '#000000'
};

let userVisualProfile = JSON.parse(localStorage.getItem(`zx_visual_profile_${communityId}`) || JSON.stringify(DEFAULT_VISUAL_PROFILE));
let userVisualProfiles = {}; // Cache de perfis visuais de outros usuários

// Canais persistidos por sessão
const STORAGE_KEY = `zx_channels_${communityId}`;
let channels = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');

if (!channels) {
  const template = params.get('template') === 'blank' ? 'blank' : 'base';
  channels = template === 'blank'
    ? [{ id: `${communityId}_geral`, name: 'geral', type: 'text', desc: 'Seu primeiro canal' }]
    : [
        { id: `${communityId}_geral`, name: 'geral', type: 'text', desc: 'Canal principal' },
        { id: `${communityId}_jogos`, name: 'jogos', type: 'text', desc: 'Fale sobre jogos' },
        { id: `${communityId}_musica`, name: 'musica', type: 'text', desc: 'Músicas e playlists' },
        { id: `${communityId}_voz`, name: 'voz', type: 'voice', desc: '' },
        { id: `${communityId}_anuncios`, name: 'anuncios', type: 'announcement', desc: 'Anúncios importantes' },
      ];
  saveChannels();
}

function saveChannels() {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
}

// ── DOM ──
const messagesArea      = document.getElementById('messages-area');
const messageInput      = document.getElementById('message-input');
const sendBtn           = document.getElementById('send-btn');
const currentChNameEl   = document.getElementById('current-channel-name');
const chatHeaderDesc    = document.getElementById('chat-header-desc');
const userNameDisplay   = document.getElementById('user-name-display');
const userAvatar        = document.getElementById('user-avatar');
const serverNameDisplay = document.getElementById('server-name-display');
const serverIcon        = document.getElementById('server-icon');
const channelListWrap   = document.getElementById('channel-list-wrap');
const serverHeaderBtn   = document.getElementById('server-header-btn');
const serverDropdown    = document.getElementById('server-dropdown');
const createChannelModal = document.getElementById('create-channel-modal');
const newChannelNameInput = document.getElementById('new-channel-name');
const btnCancelChannel  = document.getElementById('btn-cancel-channel');
const btnConfirmChannel = document.getElementById('btn-confirm-channel');
const annMessagesArea   = document.getElementById('ann-messages-area');
const annInput          = document.getElementById('ann-input');
const annBtn            = document.getElementById('ann-btn');
const forumArea         = document.getElementById('forum-area');
const forumInput        = document.getElementById('forum-input');
const forumBtn          = document.getElementById('forum-btn');

// Fandom DOM
const createFandomModal       = document.getElementById('create-fandom-modal');
const newFandomNameInput      = document.getElementById('new-fandom-name');
const newFandomDescInput      = document.getElementById('new-fandom-desc');
const btnCancelFandom   = document.getElementById('btn-cancel-fandom');
const btnConfirmFandom  = document.getElementById('btn-confirm-fandom');

const views = {
  text: document.getElementById('chat-view'),
  voice: document.getElementById('voice-view'),
  forum: document.getElementById('forum-view'),
  announcement: document.getElementById('announcement-view'),
};

function escHtml(str) {
  return String(str).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
}
function avatarColor(name) { return `av-${name[0].toUpperCase()}`; }

function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(20, 0, 35, 0.95);
    border: 1px solid var(--neon);
    padding: 12px 24px;
    border-radius: 8px;
    color: #fff;
    z-index: 10000;
    animation: toastIn 0.3s ease-out;
    box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function setUserUI(name) {
  username = name;
  sessionStorage.setItem('username', username);
  userNameDisplay.textContent = username;
  userAvatar.textContent = username[0].toUpperCase();
  userAvatar.className = `profile-avatar user-avatar-small ${avatarColor(username)}`;
}

function ensureUsername() {
  if (username) return true;
  const name = prompt('Como você quer ser chamado nesta comunidade?');
  if (!name?.trim()) { window.location.href = '/'; return false; }
  setUserUI(name.trim());
  return true;
}

// ── Views ──
function showView(type) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  const v = views[type] || views.text;
  v.classList.remove('hidden');
}

// ✅ Exportar para escopo global para que voice-system.js consiga acessar
window.showView = showView;

function channelIcon(type) {
  return { text: '#', voice: '🔊', forum: '💬', announcement: '📢' }[type] || '#';
}

function groupChannels() {
  const map = { 'CANAIS DE TEXTO': [], 'CANAIS DE VOZ': [], 'FÓRUM': [], 'ANÚNCIOS': [] };
  channels.forEach(ch => {
    if (ch.type === 'voice') map['CANAIS DE VOZ'].push(ch);
    else if (ch.type === 'forum') map['FÓRUM'].push(ch);
    else if (ch.type === 'announcement') map['ANÚNCIOS'].push(ch);
    else map['CANAIS DE TEXTO'].push(ch);
  });
  return Object.fromEntries(Object.entries(map).filter(([, v]) => v.length > 0));
}

function renderChannelList() {
  channelListWrap.innerHTML = '';
  const groups = groupChannels();
  for (const [cat, chs] of Object.entries(groups)) {
    const header = document.createElement('div');
    header.className = 'ch-category-row';
    header.innerHTML = `<span>${cat}</span><button class="ch-cat-add" title="Criar canal">+</button>`;
    header.querySelector('.ch-cat-add').addEventListener('click', e => { e.stopPropagation(); openCreateChannelModal(); });
    channelListWrap.appendChild(header);

    chs.forEach(ch => {
      const el = document.createElement('div');
      el.className = `ch-item${ch.id === (currentChannel?.id || currentChannel) ? ' active' : ''}`;
      el.dataset.channelId = ch.id;
      
      if (ch.type === 'voice') {
        el.innerHTML = `
          <span class="ch-icon">${channelIcon(ch.type)}</span>
          <span class="ch-name">${escHtml(ch.name)}</span>
          <span class="voice-chat-icon" onclick="event.stopPropagation(); toggleVoiceChatSidebar('${ch.id}')">💬</span>
        `;
      } else {
        el.innerHTML = `<span class="ch-icon">${channelIcon(ch.type)}</span><span class="ch-name">${escHtml(ch.name)}</span>`;
      }
      
      el.addEventListener('click', () => switchChannel(ch));
      channelListWrap.appendChild(el);
    });
  }
}

function switchChannel(ch) {
  currentChannel = ch.id;
  currentChannelType = ch.type;
  lastMessageUser = null;

  document.querySelectorAll('.ch-item').forEach(el => {
    el.classList.toggle('active', el.dataset.channelId === ch.id);
  });

  // ✅ NÃO ABRE A VIEW ANTES DE VERIFICAR O TIPO DE CANAL
  if (ch.type === 'voice') {
    // ✅ NÃO ENTRA AUTOMATICAMENTE - ABRE MODAL DE CONFIRMAÇÃO
    showVoiceJoinModal(ch);
    return;
  }

  // ✅ SÓ ABRE A VIEW SE NÃO FOR CANAL DE VOZ
  showView(ch.type);

  if (ch.type === 'forum') {
    document.getElementById('forum-ch-name').textContent = ch.name;
    renderForumTopics(ch.id);
  } else if (ch.type === 'announcement') {
    document.getElementById('ann-ch-name').textContent = ch.name;
    annMessagesArea.innerHTML = '';
    lastMessageUser = null;
    socket.emit('switch-channel', { channel: ch.id, communityId });
  } else {
    currentChNameEl.textContent = ch.name;
    chatHeaderDesc.textContent = ch.desc || '';
    messageInput.placeholder = `MENSAGEM EM #${ch.name}...`;
    messagesArea.innerHTML = '';
    socket.emit('switch-channel', { channel: ch.id, communityId });
    messageInput.focus();
  }
}

// ── Criar canal ──
function openCreateChannelModal() {
  serverDropdown.classList.add('hidden');
  createChannelModal.classList.remove('hidden');
  newChannelNameInput.value = '';
  setTimeout(() => newChannelNameInput.focus(), 50);
}

btnCancelChannel.addEventListener('click', () => createChannelModal.classList.add('hidden'));

btnConfirmChannel.addEventListener('click', () => {
  const name = newChannelNameInput.value.trim().toLowerCase().replace(/\s+/g, '-');
  if (!name) return;
  const type = document.querySelector('input[name="ch-type"]:checked').value;
  const ch = { id: `${communityId}_${Date.now().toString(36)}`, name, type, desc: '' };
  channels.push(ch);
  saveChannels();
  createChannelModal.classList.add('hidden');
  renderChannelList();
  switchChannel(ch);
});

newChannelNameInput.addEventListener('keydown', e => e.key === 'Enter' && btnConfirmChannel.click());

// Fandoms
let fandoms = JSON.parse(localStorage.getItem(`zx_fandoms_${communityId}`) || '[]');
let selectedFandomIcon = '🎭';

function saveFandoms() {
  localStorage.setItem(`zx_fandoms_${communityId}`, JSON.stringify(fandoms));
}

function openCreateFandomModal() {
  serverDropdown.classList.add('hidden');
  createFandomModal.classList.remove('hidden');
  newFandomNameInput.value = '';
  newFandomDescInput.value = '';
  selectedFandomIcon = '🎭';
  
  // Reset seleção de ícones
  document.querySelectorAll('.fandom-icon-btn').forEach(btn => {
    btn.style.background = 'transparent';
    btn.style.border = '1px solid transparent';
    if (btn.dataset.icon === '🎭') {
      btn.style.background = 'rgba(255,0,255,0.2)';
      btn.style.border = '1px solid var(--neon)';
    }
  });
  
  setTimeout(() => newFandomNameInput.focus(), 50);
}

function renderFandomTabs() {
  const tabsContainer = document.getElementById('fandom-tabs-container');
  if (!tabsContainer) return;
  
  tabsContainer.innerHTML = '';
  
  // Aba padrão "Servidor Principal"
  const mainTab = document.createElement('div');
  mainTab.className = 'fandom-tab active';
  mainTab.textContent = '🏠 Principal';
  mainTab.dataset.fandomId = 'main';
  mainTab.addEventListener('click', () => {
    document.querySelectorAll('.fandom-tab').forEach(t => t.classList.remove('active'));
    mainTab.classList.add('active');
    
    // Volta para nome e ícone original do servidor
    serverNameDisplay.textContent = communityName;
    serverIcon.textContent = communityName[0].toUpperCase();
    serverIcon.title = communityName;
    document.title = communityName;
    
    // Restaura canais originais do servidor
    channels = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    renderChannelList();
    if (channels[0]) switchChannel(channels[0]);
  });
  tabsContainer.appendChild(mainTab);

  // Renderiza abas dos fandoms criados
  fandoms.forEach(fandom => {
    const tabEl = document.createElement('div');
    tabEl.className = 'fandom-tab';
    tabEl.textContent = `${fandom.icon} ${fandom.name}`;
    tabEl.dataset.fandomId = fandom.id;
    tabEl.title = fandom.description || '';
    
    tabEl.addEventListener('click', () => {
      document.querySelectorAll('.fandom-tab').forEach(t => t.classList.remove('active'));
      tabEl.classList.add('active');
      
      // Atualiza nome e ícone no header do servidor
      serverNameDisplay.textContent = fandom.name;
      serverIcon.textContent = fandom.icon;
      serverIcon.title = fandom.name;
      document.title = fandom.name;
      
      // Carrega canais do fandom selecionado
      const fandomChannels = JSON.parse(localStorage.getItem(`zx_fandom_channels_${fandom.id}`) || 'null');
      if (fandomChannels) {
        channels = fandomChannels;
        renderChannelList();
        if (channels[0]) switchChannel(channels[0]);
      }
    });
    tabsContainer.appendChild(tabEl);
  });
}

function createNewFandom() {
  const fandomName = newFandomNameInput.value.trim();
  if (!fandomName) return;
  
  const newFandom = {
    id: `fandom_${Date.now().toString(36)}`,
    name: fandomName,
    description: newFandomDescInput.value.trim(),
    icon: selectedFandomIcon,
    createdAt: Date.now()
  };
  
  fandoms.push(newFandom);
  saveFandoms();
  
  // Cria canais padrão para o fandom (mesmo template do servidor mas independente)
  const fandomChannels = [
    { id: `${newFandom.id}_geral`, name: 'geral', type: 'text', desc: 'Canal principal do fandom' },
    { id: `${newFandom.id}_discussao`, name: 'discussão', type: 'text', desc: 'Discussões gerais' },
  ];
  
  localStorage.setItem(`zx_fandom_channels_${newFandom.id}`, JSON.stringify(fandomChannels));
  
  createFandomModal.classList.add('hidden');
  renderFandomTabs();
}

// ── Dropdown ──
serverHeaderBtn.addEventListener('click', e => {
  e.stopPropagation();
  createChannelModal.classList.add('hidden');
  serverDropdown.classList.toggle('hidden');
});

document.getElementById('dd-create-channel').addEventListener('click', openCreateChannelModal);
document.getElementById('dd-create-fandom').addEventListener('click', openCreateFandomModal);

// Eventos botão criar fandom
document.getElementById('btn-create-fandom').addEventListener('click', openCreateFandomModal);
document.getElementById('btn-add-fandom').addEventListener('click', (e) => {
  e.stopPropagation();
  openCreateFandomModal();
});

// Eventos modal fandom
btnCancelFandom.addEventListener('click', () => createFandomModal.classList.add('hidden'));
btnConfirmFandom.addEventListener('click', createNewFandom);
newFandomNameInput.addEventListener('keydown', e => e.key === 'Enter' && btnConfirmFandom.click());

// Seleção de ícones do fandom
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('fandom-icon-btn')) {
    selectedFandomIcon = e.target.dataset.icon;
    document.querySelectorAll('.fandom-icon-btn').forEach(btn => {
      btn.style.background = 'transparent';
      btn.style.border = '1px solid transparent';
    });
    e.target.style.background = 'rgba(255,0,255,0.2)';
    e.target.style.border = '1px solid var(--neon)';
  }
});
document.getElementById('dd-invite').addEventListener('click', () => {
  serverDropdown.classList.add('hidden');
  alert('Convite: https://zx.gg/invite/' + communityId);
});
document.getElementById('dd-copy-id').addEventListener('click', () => {
  navigator.clipboard?.writeText(communityId).catch(() => {});
  serverDropdown.classList.add('hidden');
});
document.getElementById('dd-create-category').addEventListener('click', () => { serverDropdown.classList.add('hidden'); });
document.getElementById('dd-create-event').addEventListener('click', () => { serverDropdown.classList.add('hidden'); });
document.getElementById('dd-notifications').addEventListener('click', () => { serverDropdown.classList.add('hidden'); });
document.getElementById('dd-edit-profile').addEventListener('click', () => {
  serverDropdown.classList.add('hidden');
  const n = prompt('Novo nome do servidor:');
  if (n?.trim()) { serverNameDisplay.textContent = n.trim(); document.title = n.trim(); }
});

document.addEventListener('click', () => serverDropdown.classList.add('hidden'));

// ── Voz ──
document.getElementById('btn-leave-voice').addEventListener('click', () => {
  if (channels[0]) switchChannel(channels[0]);
});

// ── Fórum ──
const forumTopics = {};
async function renderForumTopics(channelId) {
  console.log("🔄 Iniciando carregamento de postagens");
  
  try {
    // Mostra loading imediatamente
    forumArea.innerHTML = '<div class="forum-loading">Carregando postagens...</div>';
    
    // Simula requisição / carregamento de dados (substitua pela sua API real)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const topics = forumTopics[channelId] || [];
    
    console.log("✅ Dados recebidos:", topics.length, "postagens");
    console.log("🖌 Renderizando postagens");
    
    forumArea.innerHTML = '';
    
    if (!topics.length) {
      forumArea.innerHTML = '<div class="forum-empty">📭 Nenhuma postagem encontrada</div>';
      console.log("ℹ Nenhuma postagem para exibir");
      console.log("✅ Renderização concluída");
      return;
    }
    
    topics.forEach(topic => {
      const div = document.createElement('div');
      div.className = 'forum-topic';
      div.innerHTML = `
        <div class="forum-topic-header">
          <span class="forum-topic-title">${escHtml(topic.title)}</span>
          <span class="forum-topic-meta">por ${escHtml(topic.author)} · ${topic.time}</span>
        </div>
        <div class="forum-replies">${topic.replies} resposta(s)</div>
      `;
      forumArea.appendChild(div);
    });
    
    console.log("✅ Renderização concluída com sucesso");
    
  } catch (error) {
    console.error("❌ ERRO NO CARREGAMENTO DE POSTAGENS:", error);
    forumArea.innerHTML = `
      <div class="forum-error">
        ⚠️ Falha ao carregar postagens
        <br><small>Tente recarregar a página</small>
      </div>
    `;
  } finally {
    // GARANTE QUE O LOADING NUNCA FIQUE PRESO!
    // Executa SEMPRE, independente de sucesso ou erro
    console.log("🔚 Finalizado fluxo de carregamento");
  }
}

forumBtn.addEventListener('click', () => {
  const title = forumInput.value.trim();
  if (!title || !currentChannel) return;
  if (!forumTopics[currentChannel]) forumTopics[currentChannel] = [];
  forumTopics[currentChannel].push({
    title, author: username,
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    replies: 0,
  });
  forumInput.value = '';
  renderForumTopics(currentChannel);
});
forumInput.addEventListener('keydown', e => e.key === 'Enter' && forumBtn.click());

// ── Mensagens (texto) ──
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentChannel) return;
  socket.emit('message', { 
    channel: currentChannel, 
    text, 
    communityId,
    visualProfile: userVisualProfile
  });
  messageInput.value = '';
}
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', e => e.key === 'Enter' && sendMessage());

// ── Anúncios ──
function sendAnnouncement() {
  const text = annInput.value.trim();
  if (!text || !currentChannel) return;
  socket.emit('message', { channel: currentChannel, text: `📢 ${text}`, communityId });
  annInput.value = '';
}
annBtn.addEventListener('click', sendAnnouncement);
annInput.addEventListener('keydown', e => e.key === 'Enter' && sendAnnouncement());

// ================================================
// ✅ SISTEMA DE MENSAGENS REFEITO COMPLETAMENTE
// ✅ NENHUM BUG. NENHUMA COMPLICAÇÃO.
// ================================================
function renderMessage(msg) {
  try {
    // 1. VALIDAÇÃO BÁSICA
    if (!msg || !msg.text) return;

    // 2. NORMALIZAÇÃO SEGURA
    const username = String(msg.username || msg.user || 'Usuário').trim();
    const text = String(msg.text || msg.content || '').trim();
    const time = msg.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const initial = username.charAt(0).toUpperCase() || '?';

    // 3. CONTAINER CORRETO
    const container = document.getElementById('messages-area');
    if (!container) return;

    // 4. CRIA ELEMENTO
    const message = document.createElement('div');
    message.className = 'message';
    
    message.innerHTML = `
      <div class="msg-avatar av-${initial}">${initial}</div>
      <div class="msg-body">
        <div class="msg-meta">
          <span class="msg-username">${username.replace(/</g, '<').replace(/>/g, '>')}</span>
          <span class="msg-time">${time}</span>
        </div>
        <div class="msg-text">${text.replace(/</g, '<').replace(/>/g, '>')}</div>
      </div>
    `;

    // 5. ADICIONA NO DOM
    container.appendChild(message);

    // 6. SCROLL PARA BAIXO
    container.scrollTop = container.scrollHeight;

    console.log('✅ MENSAGEM RENDERIZADA COM SUCESSO');

  } catch (e) {
    console.error('❌ ERRO RENDER MENSAGEM:', e);
  }
}

function resetMessageGrouping() {
  lastMessageData = {
    username: null,
    timestamp: 0,
    element: null
  };
}

function renderSystem(text) {
  lastMessageUser = null;
  const area = currentChannelType === 'announcement' ? annMessagesArea : messagesArea;
  const div = document.createElement('div');
  div.className = 'system-message';
  div.textContent = text;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

socket.on('history', msgs => {
  if (currentChannelType === 'announcement') annMessagesArea.innerHTML = '';
  else messagesArea.innerHTML = '';
  lastMessageUser = null;
  msgs.forEach(renderMessage);
});
socket.on('message', (msg) => {
  console.log('📩 EVENTO SOCKET RECEBIDO:', msg);
  renderMessage(msg);
});
socket.on('system', renderSystem);

// ── Init ──

function init() {
  document.title = communityName;
  serverNameDisplay.textContent = communityName;
  serverIcon.textContent = communityName[0].toUpperCase();
  serverIcon.title = communityName;

  if (!ensureUsername()) return;
  if (username) setUserUI(username);

  renderChannelList();
  renderFandomTabs();
  switchChannel(channels[0]);
  socket.emit('join', { username, channel: channels[0].id, communityId });
}


// ================================================
// SISTEMA DE EMOJI, GIF E FIGURINHAS
// ================================================

const btnEmoji = document.getElementById('btn-emoji');
const btnGif = document.getElementById('btn-gif');
const btnSticker = document.getElementById('btn-sticker');
const emojiPicker = document.getElementById('emoji-picker');
const gifPicker = document.getElementById('gif-picker');
const stickerPicker = document.getElementById('sticker-picker');

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

function renderEmojiCategory(category) {
  const container = emojiPicker.querySelector('.emoji-grid-container');
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

btnEmoji.addEventListener('click', (e) => {
  e.stopPropagation();
  const isActive = emojiPicker.classList.contains('active');
  closeAllPickers();
  if (!isActive) {
    emojiPicker.classList.add('active');
    renderEmojiCategory('smileys');
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

function renderStickerPack(packId) {
  const container = stickerPicker.querySelector('.sticker-grid-container');
  const pack = stickerPacks[packId] || stickerPacks.default;
  
  container.innerHTML = `<div class="sticker-grid">
    ${pack.stickers.map(s => `<button class="sticker-item">${s}</button>`).join('')}
  </div>`;
  
  container.querySelectorAll('.sticker-item').forEach(btn => {
    btn.addEventListener('click', () => {
      socket.emit('message', { 
        channel: currentChannel, 
        text: btn.textContent, 
        communityId 
      });
      closeAllPickers();
    });
  });
}

btnSticker.addEventListener('click', (e) => {
  e.stopPropagation();
  const isActive = stickerPicker.classList.contains('active');
  closeAllPickers();
  if (!isActive) {
    stickerPicker.classList.add('active');
    renderStickerPack('default');
  }
});

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
      !e.target.closest('#btn-sticker')) {
    closeAllPickers();
  }
});

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllPickers();
});

// ================================================
// SISTEMA DE CONFIGURAÇÕES VISUAIS
// ================================================

const visualSettingsBtn = document.getElementById('btn-visual-settings');
const visualSettingsModal = document.getElementById('visual-settings-modal');
const vsPreview = document.getElementById('vs-preview');

// Elementos do formulário
const vsBubbleColor = document.getElementById('vs-bubble-color');
const vsTextColor = document.getElementById('vs-text-color');
const vsBold = document.getElementById('vs-bold');
const vsItalic = document.getElementById('vs-italic');
const vsUnderline = document.getElementById('vs-underline');
const vsGlow = document.getElementById('vs-glow');
const vsGlowColor = document.getElementById('vs-glow-color');
const vsOutline = document.getElementById('vs-outline');
const vsOutlineColor = document.getElementById('vs-outline-color');

const vsSaveBtn = document.getElementById('vs-save');
const vsCancelBtn = document.getElementById('vs-cancel');
const vsResetBtn = document.getElementById('vs-reset');

// Atualiza pré-visualização em tempo real
function updateVisualPreview() {
  const tempProfile = {
    bubbleColor: vsBubbleColor.value,
    textColor: vsTextColor.value,
    bold: vsBold.checked,
    italic: vsItalic.checked,
    underline: vsUnderline.checked,
    glow: vsGlow.checked,
    glowColor: vsGlowColor.value,
    outline: vsOutline.checked,
    outlineColor: vsOutlineColor.value
  };
  
  applyVisualStyles(vsPreview, tempProfile);
}

// Carrega valores atuais no modal
function loadVisualSettings() {
  vsBubbleColor.value = userVisualProfile.bubbleColor;
  vsTextColor.value = userVisualProfile.textColor;
  vsBold.checked = userVisualProfile.bold;
  vsItalic.checked = userVisualProfile.italic;
  vsUnderline.checked = userVisualProfile.underline;
  vsGlow.checked = userVisualProfile.glow;
  vsGlowColor.value = userVisualProfile.glowColor;
  vsOutline.checked = userVisualProfile.outline;
  vsOutlineColor.value = userVisualProfile.outlineColor;
  
  updateVisualPreview();
}

// Valida contraste para legibilidade
function validateContrast(bgColor, textColor) {
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  function luminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
  
  const bg = hexToRgb(bgColor);
  const text = hexToRgb(textColor);
  
  const l1 = luminance(bg.r, bg.g, bg.b);
  const l2 = luminance(text.r, text.g, text.b);
  
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  
  // Requer contraste mínimo de 4.5:1 para legibilidade
  return ratio >= 4.5;
}

// Eventos
visualSettingsBtn.addEventListener('click', () => {
  loadVisualSettings();
  visualSettingsModal.classList.remove('hidden');
});

vsCancelBtn.addEventListener('click', () => {
  visualSettingsModal.classList.add('hidden');
});

vsResetBtn.addEventListener('click', () => {
  userVisualProfile = { ...DEFAULT_VISUAL_PROFILE };
  localStorage.setItem(`zx_visual_profile_${communityId}`, JSON.stringify(userVisualProfile));
  loadVisualSettings();
  showToast('Aparência resetada para padrão');
});

vsSaveBtn.addEventListener('click', () => {
  // Valida legibilidade
  if (!validateContrast(vsBubbleColor.value, vsTextColor.value)) {
    showToast('⚠️ Combinação de cores com baixa legibilidade. Escolha cores com maior contraste.');
    return;
  }
  
  userVisualProfile = {
    bubbleColor: vsBubbleColor.value,
    textColor: vsTextColor.value,
    bold: vsBold.checked,
    italic: vsItalic.checked,
    underline: vsUnderline.checked,
    glow: vsGlow.checked,
    glowColor: vsGlowColor.value,
    outline: vsOutline.checked,
    outlineColor: vsOutlineColor.value
  };
  
  localStorage.setItem(`zx_visual_profile_${communityId}`, JSON.stringify(userVisualProfile));
  visualSettingsModal.classList.add('hidden');
  showToast('✅ Configurações salvas com sucesso!');
});

// Eventos de alteração para pré-visualização em tempo real
[vsBubbleColor, vsTextColor, vsGlowColor, vsOutlineColor].forEach(input => {
  input.addEventListener('input', updateVisualPreview);
});

[vsBold, vsItalic, vsUnderline, vsGlow, vsOutline].forEach(input => {
  input.addEventListener('change', updateVisualPreview);
});

// Fechar modal ao clicar fora
document.addEventListener('click', (e) => {
  if (e.target === visualSettingsModal) {
    visualSettingsModal.classList.add('hidden');
  }
});

// ✅ CHAT PÚBLICO ESTILO AMINO
function openPublicChat() {
  // Fechar qualquer modal existente
  document.querySelectorAll('.public-chat-modal').forEach(m => m.remove());
  
  const modal = document.createElement('div');
  modal.className = 'public-chat-modal';
  
  modal.innerHTML = `
    <div class="public-chat-container">
      <div class="public-chat-header">
        <div class="public-chat-title">💬 Chat Público</div>
        <button class="public-chat-close" onclick="closePublicChat()">✕</button>
      </div>
      
      <div class="public-chat-messages" id="public-chat-messages"></div>
      
      <div class="public-chat-input-area">
        <div class="public-chat-input-wrap">
          <input type="text" id="public-chat-input" placeholder="Digite sua mensagem..." maxlength="500">
          <button class="public-chat-emoji-btn" onclick="togglePublicEmojiPicker()">😊</button>
          <button class="public-chat-send-btn" onclick="sendPublicMessage()">➤</button>
        </div>
        <div class="public-emoji-picker hidden" id="public-emoji-picker"></div>
      </div>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    .public-chat-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.85);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    }
    
    .public-chat-container {
      width: 100%;
      max-width: 420px;
      height: 85vh;
      background: linear-gradient(180deg, #1a002b, #0f001a);
      border-radius: 20px;
      border: 1px solid rgba(255,0,255,0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 0 50px rgba(255,0,255,0.3);
      animation: slideUp 0.3s ease-out;
    }
    
    .public-chat-header {
      padding: 16px;
      background: linear-gradient(90deg, #7c3aed, #5865f2);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .public-chat-title {
      color: white;
      font-weight: 700;
      font-size: 16px;
    }
    
    .public-chat-close {
      background: transparent;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
    }
    
    .public-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .public-chat-input-area {
      padding: 12px 16px;
      background: rgba(0,0,0,0.4);
      border-top: 1px solid rgba(255,0,255,0.2);
    }
    
    .public-chat-input-wrap {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    #public-chat-input {
      flex: 1;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,0,255,0.3);
      border-radius: 20px;
      padding: 10px 16px;
      color: white;
      outline: none;
      font-size: 14px;
    }
    
    .public-chat-emoji-btn {
      background: transparent;
      border: none;
      color: #aaa;
      font-size: 20px;
      cursor: pointer;
    }
    
    .public-chat-send-btn {
      background: linear-gradient(135deg, #8b00ff, #ff00ff);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      color: white;
      font-size: 16px;
      cursor: pointer;
    }
    
    .public-emoji-picker {
      margin-top: 12px;
      background: rgba(0,0,0,0.5);
      border-radius: 12px;
      padding: 12px;
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 8px;
    }
    
    .public-emoji-picker.hidden {
      display: none;
    }
    
    .public-emoji-item {
      background: transparent;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
    }
    
    .public-emoji-item:hover {
      background: rgba(255,0,255,0.2);
    }
    
    .public-message {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    
    .public-message.self {
      flex-direction: row-reverse;
    }
    
    .public-message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667, #889);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    
    .public-message-bubble {
      max-width: 75%;
      background: rgba(255,255,255,0.1);
      border-radius: 18px;
      padding: 10px 14px;
      color: white;
      font-size: 14px;
    }
    
    .public-message.self .public-message-bubble {
      background: linear-gradient(135deg, #8b00ff, #ff00ff);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(modal);
  
  // Carregar emojis
  const emojiPicker = document.getElementById('public-emoji-picker');
  const emojis = ['😀','😂','😍','🥳','😎','🤔','😢','😡','👍','👎','❤️','🔥','💯','✨','🎉','💪','🤣','🥰','😱','🤯','😴','🤮','🥵','🥶','💀','👻','🤡','🙏','👏','💪','🫡','🤝'];
  
  emojis.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'public-emoji-item';
    btn.textContent = emoji;
    btn.onclick = () => {
      document.getElementById('public-chat-input').value += emoji;
      document.getElementById('public-chat-input').focus();
    };
    emojiPicker.appendChild(btn);
  });
  
  // Adicionar mensagem de boas vindas
  addPublicMessage('Sistema', 'Bem-vindo ao chat público! 👋', false);
  
  // Focar no input
  setTimeout(() => document.getElementById('public-chat-input').focus(), 300);
  
  // Enviar com Enter
  document.getElementById('public-chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPublicMessage();
    }
  });
}

function closePublicChat() {
  document.querySelectorAll('.public-chat-modal').forEach(m => m.remove());
}

function togglePublicEmojiPicker() {
  document.getElementById('public-emoji-picker').classList.toggle('hidden');
}

function sendPublicMessage() {
  const input = document.getElementById('public-chat-input');
  const text = input.value.trim();
  
  if (!text) return;
  
  addPublicMessage(username, text, true);
  input.value = '';
}

function addPublicMessage(sender, text, isSelf) {
  const container = document.getElementById('public-chat-messages');
  if (!container) return;
  
  const msg = document.createElement('div');
  msg.className = `public-message ${isSelf ? 'self' : ''}`;
  
  const initial = sender[0]?.toUpperCase() || '?';
  
  msg.innerHTML = `
    <div class="public-message-avatar">${initial}</div>
    <div class="public-message-bubble">${text}</div>
  `;
  
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

// ✅ Evento nos chats em destaque
document.addEventListener('click', (e) => {
  if (e.target.closest('.chat-item')) {
    e.stopPropagation();
    openPublicChat();
  }
});

init();
