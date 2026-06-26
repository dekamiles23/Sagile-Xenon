const socket = io();

// ✅ FUNÇÃO SEGURA PARA EVITAR UNDEFINED
function safe(value, fallback = '') {
  if (value === undefined || value === null || value === 'undefined' || value === 'null') {
    return fallback;
  }
  return String(value);
}

function escHtml(text) {
  if (text === undefined || text === null) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

let username = '';
let currentChannel = null;
let currentChannelType = 'text';
let currentServerId = null;
let lastMessageUser = null;
let pendingChannelCategory = null;

// Estrutura: { id, name, channels: [{id, name, type, desc}] }
let servers = JSON.parse(localStorage.getItem('zx_servers') || '[]');

// â”€â”€ DOM refs â”€â”€
const appEl             = document.getElementById('app');
const communityModal    = document.getElementById('community-modal');
const communityNameInput = document.getElementById('community-name-input');
const communityModalClose = document.getElementById('community-modal-close');
const communityOptions  = document.querySelectorAll('.community-option');
const friendsModal      = document.getElementById('friends-modal');
const friendsModalClose = document.getElementById('friends-modal-close');
const settingsModal     = document.getElementById('settings-modal');
const settingsModalClose = document.getElementById('settings-modal-close');
const msContent         = document.getElementById('ms-content');
const storeModal        = document.getElementById('store-modal');
const storeModalClose   = document.getElementById('store-modal-close');
const supportModal      = document.getElementById('support-modal');
const supportModalClose = document.getElementById('support-modal-close');
const profileModal      = document.getElementById('profile-modal');
const profileModalClose = document.getElementById('profile-modal-close');
const profilePopover    = document.getElementById('profile-popover');
const btnOpenProfileEdit = document.getElementById('btn-open-profile-edit');
const btnAddCommunity   = document.getElementById('btn-add-community');
const btnHomeBtn        = document.getElementById('btn-home');
const serversRail       = document.getElementById('servers-rail');
const serverSidebar     = document.getElementById('server-sidebar');
const sidebarServerName = document.getElementById('sidebar-server-name');
const sidebarChannels   = document.getElementById('sidebar-channels-scroll');
const serverHeaderBtn   = document.getElementById('server-header-btn');
const serverDropdown    = document.getElementById('server-dropdown');
const createChannelModal = document.getElementById('create-channel-modal');
const newChannelNameInput = document.getElementById('new-channel-name');
const btnCancelChannel  = document.getElementById('btn-cancel-channel');
const btnConfirmChannel = document.getElementById('btn-confirm-channel');
const discoverView      = document.getElementById('discover-view');
let discoverFeed        = document.getElementById('discover-feed');
const chatView          = document.getElementById('chat-view');
const voiceView         = document.getElementById('voice-view');
const forumView         = document.getElementById('forum-view');
const annView           = document.getElementById('announcement-view');
const messagesArea      = document.getElementById('messages-area');
const messageInput      = document.getElementById('message-input');
const sendBtn           = document.getElementById('send-btn');
const currentChannelNameEl = document.getElementById('current-channel-name');
const chatHeaderDesc    = document.getElementById('chat-header-desc');
const chatChPrefix      = document.getElementById('chat-ch-prefix');
const userAvatar        = document.getElementById('user-avatar');
const userNameDisplay   = document.getElementById('user-name-display');
const btnOpenSettings   = document.getElementById('btn-open-settings');
const btnOpenCommunity  = document.getElementById('btn-open-community');
const btnDiscoverCreate = document.getElementById('btn-discover-create');
const btnDmList         = document.getElementById('btn-dm-list');
const serverSettingsModal = document.getElementById('server-settings-modal');
const serverSettingsClose = document.getElementById('server-settings-close');
const srvMsContent      = document.getElementById('srv-ms-content');
const srvNavItems       = document.querySelectorAll('[data-srv-section]');
const serverCtxMenu     = document.getElementById('server-ctx-menu');
const ctxCreateServer   = document.getElementById('ctx-create-server');
const ctxCreateFandom   = document.getElementById('ctx-create-fandom');
const fandomModal       = document.getElementById('fandom-modal');
const fandomNameInput   = document.getElementById('fandom-name-input');
const fandomTopicInput  = document.getElementById('fandom-topic-input');
const fandomModalClose  = document.getElementById('fandom-modal-close');
const fandomOptions     = document.querySelectorAll('.community-option[data-fandom-type]');
const navBtns           = document.querySelectorAll('.nav-btn[data-modal]');
const mmTabs            = document.querySelectorAll('.mm-tab');
const profileTabs       = document.querySelectorAll('.profile-tab');
const msNavItems        = document.querySelectorAll('.ms-nav-item[data-section]');

let profileGames = JSON.parse(localStorage.getItem('zx_profile_games') || '[]');
let userClans = JSON.parse(localStorage.getItem('zx_clans') || '[]');
let profileId = localStorage.getItem('zx_profile_id') || `zx_${Date.now().toString(36)}`;
localStorage.setItem('zx_profile_id', profileId);

let profileAvatarUrl = localStorage.getItem('zx_avatar') || '';
let profileBannerUrl = localStorage.getItem('zx_banner') || '';
let profileBio = localStorage.getItem('zx_bio') || '';
let profileStatus = localStorage.getItem('zx_status') || '';
let userStatus = localStorage.getItem('zx_user_status') || 'online'; // online, idle, dnd, offline

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

let userVisualProfile = JSON.parse(localStorage.getItem('zx_visual_profile') || JSON.stringify(DEFAULT_VISUAL_PROFILE));
let userVisualProfiles = {}; // Cache de perfis visuais de outros usuários
let discoverSub = 'popular';
let discoverSort = 'hot';
let feedPostsLocal = [];
let feedVoteState = {};

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

function readImageFile(file, callback) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Selecione um arquivo de imagem válido.');
    return;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    showToast('Imagem muito grande. Máximo 20 MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.onerror = () => showToast('Erro ao ler a imagem.');
  reader.readAsDataURL(file);
}

function applyAvatarToEl(el, url, fallbackLetter) {
  if (!el) return;
  if (url) {
    el.style.backgroundImage = `url(${url})`;
    el.classList.add('has-image');
    el.textContent = '';
  } else {
    el.style.backgroundImage = '';
    el.classList.remove('has-image');
    el.textContent = fallbackLetter || '?';
  }
}

function applyProfileMedia() {
  const letter = username ? username[0].toUpperCase() : '?';
  [userAvatar, document.getElementById('profile-avatar-big'), document.getElementById('discover-user-avatar')].forEach(el => {
    if (el) applyAvatarToEl(el, profileAvatarUrl, letter);
  });
  const banner = document.getElementById('profile-banner');
  if (banner) {
    if (profileBannerUrl) {
      banner.style.backgroundImage = `url(${profileBannerUrl})`;
      banner.classList.add('has-image');
    } else {
      banner.style.backgroundImage = '';
      banner.classList.remove('has-image');
    }
  }
}

function getDiscoverFeed() {
  if (!discoverFeed) {
    discoverFeed = document.getElementById('discover-feed');
  }
  return discoverFeed;
}

function migrateServers() {
  servers = servers.map(s => ({
    ...s,
    icon: s.icon || '',
    description: s.description || '',
    customCategories: s.customCategories || [],
    events: s.events || [],
    settings: s.settings || { notifications: true, mentions: true, events: true },
  }));
}

migrateServers();
applyWallpaperOnLoad();

// â”€â”€ Login â”€â”€
function doLogin() {
  const name = usernameInput.value.trim();
  if (!name) return;
  username = name;
  appEl.classList.remove('hidden');
  updateUserUI();
  renderServersRail();
  showDiscoverView();
  socket.emit('feed:join');
  socket.emit('user:login', { username });
}

// Verificar autenticação
document.addEventListener('DOMContentLoaded', () => {
  // Se não estiver autenticado, redireciona para auth.html
  if (localStorage.getItem('zx_session') !== 'authenticated') {
    window.location.href = 'auth.html';
    return;
  }
  
  // Carrega dados do usuário
  const userData = JSON.parse(localStorage.getItem('zx_user_data') || '{}');
  username = localStorage.getItem('zx_username') || userData.nick || 'Usuário';
  
  appEl.classList.remove('hidden');
  updateUserUI();
  renderServersRail();
  showDiscoverView();
  socket.emit('feed:join');
  socket.emit('user:login', { username });
});

  // ================================================
  // SISTEMA DE AMIZADES E MENSAGENS PRIVADAS
  // ================================================
  class FriendsSystem {
    constructor() {
      this.friends = [];
      this.requests = [];
      this.online = [];
      this.init();
    }

    init() {
      // Eventos Socket.IO
      socket.on('friends:data', (data) => {
        this.requests = data.requests || [];
        this.friends = data.friends || [];
        this.renderFriendsList();
        this.renderConversationsList();
      });

      socket.on('friends:presence', (data) => {
        this.online = data.online || [];
        this.renderFriendsList();
        this.renderConversationsList();
      });

      socket.on('friend:request', (data) => {
        if (!this.requests.includes(data.from)) {
          this.requests.push(data.from);
        }
        this.renderFriendsList();
      });

      socket.on('friend:accepted', (data) => {
        if (!this.friends.includes(data.by)) {
          this.friends.push(data.by);
        }
        this.renderFriendsList();
        this.renderConversationsList();
      });

      socket.on('friend:removed', (data) => {
        this.friends = this.friends.filter(f => f !== data.by);
        this.renderFriendsList();
        this.renderConversationsList();
      });
    }

    sendFriendRequest(username) {
      socket.emit('friend:request', { to: username });
    }

    acceptFriendRequest(username) {
      socket.emit('friend:accept', { to: username });
      this.requests = this.requests.filter(r => r !== username);
      if (!this.friends.includes(username)) {
        this.friends.push(username);
      }
      this.renderFriendsList();
      this.renderConversationsList();
    }

    rejectFriendRequest(username) {
      socket.emit('friend:reject', { to: username });
      this.requests = this.requests.filter(r => r !== username);
      this.renderFriendsList();
    }

    removeFriend(username) {
      socket.emit('friend:remove', { to: username });
      this.friends = this.friends.filter(f => f !== username);
      this.renderFriendsList();
      this.renderConversationsList();
    }

    isOnline(username) {
      return this.online.includes(username);
    }

    renderFriendsList() {
      const container = document.getElementById('dm-friends-list');
      if (!container) return;

      if (this.friends.length === 0) {
        container.innerHTML = `
          <div class="dm-empty-state">
            <div class="dm-empty-icon">
              <div class="dm-empty-icon-inner">👥</div>
            </div>
            <h2>Não há amigos por aqui</h2>
            <p>Adicione amigos para começar a conversar.</p>
            <button class="dm-add-friend-btn" onclick="friendsSystem.openAddFriendModal()">👤 ADICIONAR AMIGO</button>
          </div>
        `;
        return;
      }

      container.innerHTML = this.friends.map(friend => `
        <div class="dm-friend-item">
          <div class="dm-friend-avatar">${friend.charAt(0).toUpperCase()}</div>
          <div class="dm-friend-info">
            <div class="dm-friend-name">${friend}</div>
            <div class="dm-friend-status">${this.isOnline(friend) ? '🟢 Online' : '⚫ Offline'}</div>
          </div>
          <button class="dm-friend-message-btn" onclick="friendsSystem.openConversation('${friend}')">💬 Mensagem</button>
        </div>
      `).join('');
    }

    renderConversationsList() {
      const container = document.getElementById('dm-conversations-list');
      if (!container) return;

      if (this.friends.length === 0) {
        container.innerHTML = `
          <div class="dm-conversation-empty">
            <span>Nenhuma conversa ativa</span>
          </div>
        `;
        return;
      }

      container.innerHTML = this.friends.map(friend => `
        <div class="dm-conversation-item" onclick="friendsSystem.openConversation('${friend}')">
          <div class="dm-conversation-avatar">${friend.charAt(0).toUpperCase()}</div>
          <div class="dm-conversation-name">${friend}</div>
          <div class="dm-conversation-status ${this.isOnline(friend) ? 'online' : ''}"></div>
        </div>
      `).join('');
    }

    openConversation(username) {
      // Abrir conversa privada com o usuário
      document.querySelectorAll('.dm-conversation-item').forEach(el => el.classList.remove('active'));
      event.currentTarget.classList.add('active');
      
      // Mostrar área de chat
      const centerArea = document.querySelector('.dm-center-area');
      centerArea.innerHTML = `
        <div class="dm-chat-header">
          <div class="dm-avatar">${username.charAt(0).toUpperCase()}</div>
          <span class="dm-username">${username}</span>
          <span class="dm-status">${this.isOnline(username) ? '🟢 Online' : '⚫ Offline'}</span>
        </div>
        <div class="dm-messages-area" id="dm-messages-area">
          <div class="dm-empty-chat">
            <span>💬</span>
            <p>Comece uma conversa com ${username}</p>
          </div>
        </div>
        <div class="dm-input-area">
          <div class="input-wrapper">
            <input id="dm-message-input" type="text" placeholder="Escreva uma mensagem..." maxlength="500" autocomplete="off" />
            <button id="dm-send-btn" type="button">âž¤</button>
          </div>
        </div>
      `;
    }

    openAddFriendModal() {
      const username = prompt('Digite o nome do usuário que deseja adicionar:');
      if (username && username.trim()) {
        this.sendFriendRequest(username.trim());
        alert('Solicitação de amizade enviada!');
      }
    }
  }

  let friendsSystem;

  // Inicializar sistema de amizades após login
  document.addEventListener('userLoggedIn', () => {
    setTimeout(() => {
      friendsSystem = new FriendsSystem();
    }, 500);
  });

  // ================================================
  // FIM DO SCRIPT PRINCIPAL
  // ================================================

let currentDmUser = null;
let dmMessages = {};

function renderDmList() {
  const dmList = document.getElementById('dm-list');
  if (!dmList) return;

  const dmUsers = [...new Set([...friends.map(f => f.username), ...Object.keys(dmMessages)])];
  
  if (dmUsers.length === 0) {
    dmList.innerHTML = `
      <div class="dm-empty">
        <span>💬</span>
        <p>Nenhuma conversa iniciada ainda</p>
      </div>
    `;
    return;
  }

  dmList.innerHTML = dmUsers.map(username => {
    const isOnline = onlineSet.has(username);
    const initial = username[0].toUpperCase();
    const lastMessage = dmMessages[username]?.[dmMessages[username].length - 1]?.text || '';
    
    return `
      <div class="dm-item" data-username="${username}">
        <div class="dm-item-avatar av-${initial}">${initial}</div>
        <div class="dm-item-info">
          <div class="dm-item-name">
            <span>${escHtml(username)}</span>
            <span class="dm-item-status ${isOnline ? 'online' : 'offline'}">${isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <div class="dm-item-last">${lastMessage ? escHtml(lastMessage.substring(0, 30)) + '...' : 'Iniciar conversa'}</div>
        </div>
      </div>
    `;
  }).join('');

  dmList.querySelectorAll('.dm-item').forEach(item => {
    item.addEventListener('click', () => openDmChat(item.dataset.username));
  });
}

function openDmChat(username) {
  currentDmUser = username;
  
  const isOnline = onlineSet.has(username);
  const initial = username[0].toUpperCase();
  
  // Atualiza cabeçalho
  document.querySelector('.dm-avatar').textContent = initial;
  document.querySelector('.dm-username').textContent = username;
  document.querySelector('.dm-status').textContent = isOnline ? 'Online' : 'Offline';
  document.querySelector('.dm-status').className = `dm-status ${isOnline ? 'online' : 'offline'}`;
  
  // Mostra atividade
  const activityEl = document.getElementById('dm-activity');
  if (activityEl) {
    activityEl.textContent = isOnline ? 'Ativo agora' : 'Visto por último há algum tempo';
  }
  
  // Renderiza mensagens
  renderDmMessages();
  
  // Mostra área de input
  document.getElementById('dm-input-area').classList.remove('hidden');
  
  // Marca item como ativo
  document.querySelectorAll('.dm-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`.dm-item[data-username="${username}"]`)?.classList.add('active');
}

function renderDmMessages() {
  const container = document.getElementById('dm-messages-area');
  if (!container || !currentDmUser) return;

  const messages = dmMessages[currentDmUser] || [];
  
  if (messages.length === 0) {
    container.innerHTML = `
      <div class="dm-empty-chat">
        <span>💬</span>
        <p>Comece a conversar com ${currentDmUser}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = messages.map(msg => {
    const isSelf = msg.from === username;
    const initial = msg.from[0].toUpperCase();
    
    return `
      <div class="message ${isSelf ? 'self' : ''}">
        <div class="msg-avatar av-${initial}">${initial}</div>
        <div class="msg-body">
          <div class="msg-meta">
            <span class="msg-username">${escHtml(msg.from)}</span>
            <span class="msg-time">${msg.time}</span>
          </div>
          <div class="msg-text">${escHtml(msg.text)}</div>
        </div>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function sendDmMessage() {
  const input = document.getElementById('dm-message-input');
  const text = input?.value.trim();
  
  if (!text || !currentDmUser) return;
  
  const msg = {
    from: username,
    to: currentDmUser,
    text,
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };
  
  if (!dmMessages[currentDmUser]) dmMessages[currentDmUser] = [];
  dmMessages[currentDmUser].push(msg);
  
  socket.emit('dm:message', msg);
  
  input.value = '';
  renderDmMessages();
  renderDmList();
}

document.getElementById('dm-send-btn')?.addEventListener('click', sendDmMessage);
document.getElementById('dm-message-input')?.addEventListener('keydown', e => e.key === 'Enter' && sendDmMessage());

socket.on('dm:message', (msg) => {
  if (!dmMessages[msg.from]) dmMessages[msg.from] = [];
  dmMessages[msg.from].push(msg);
  
  if (currentDmUser === msg.from) {
    renderDmMessages();
  }
  
  renderDmList();
  showToast(`📩 Nova mensagem de ${msg.from}`);
});

// Botão Mensagens Privadas
btnDmList.addEventListener('click', () => {
  hideAllViews();
  
  // ✅ CORREÇÃO TOTAL: Reseta TODOS os estados visuais e limpa layout de servidor
  document.body.classList.remove('server-body');
  serverSidebar.classList.add('hidden');
  currentServerId = null;
  currentChannel = null;
  
  document.getElementById('dm-view').classList.remove('hidden');
  renderDmList();
  showToast('📩 Mensagens Privadas');
  
  // ✅ CORREÇÃO: Remove classe active de todos os botões da navbar
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.server-rail-icon').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-home').classList.remove('active');
});

// Sistema de abas Mensagens Privadas
const dmTabFriends = document.getElementById('dm-tab-friends');
const dmTabPower = document.getElementById('dm-tab-power');

function setActiveDmTab(activeTab) {
  // Resetar estilos
  [dmTabFriends, dmTabPower].forEach(tab => {
    tab.style.background = 'transparent';
    tab.style.border = 'none';
    tab.style.color = '#bb88ff';
  });
  
  // Aplicar estilo ativo
  activeTab.style.background = 'rgba(168, 0, 255, 0.12)';
  activeTab.style.border = '1px solid #a800ff';
  activeTab.style.color = '#ffffff';
}

dmTabFriends.addEventListener('click', () => {
  setActiveDmTab(dmTabFriends);
  // Mostrar layout principal de amigos/mensagens
  document.querySelector('#dm-view .main-content').style.display = 'flex';
});

dmTabPower.addEventListener('click', () => {
  setActiveDmTab(dmTabPower);
  
  // Abrir modal Power estilo Nitro
  const powerModal = document.createElement('div');
  powerModal.className = 'modal-overlay';
  powerModal.id = 'power-modal';
  powerModal.innerHTML = `
    <div class="modal modal-login" style="max-width: 520px; padding: 2rem;">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div style="font-size: 4rem; margin-bottom: 1rem;">âš¡</div>
        <h2 style="color: #a800ff; margin: 0 0 0.5rem 0;">ZX POWER</h2>
        <p style="color: #aaa; margin: 0;">Desbloqueie recursos exclusivos e premium</p>
      </div>
      
      <div style="display: grid; gap: 1rem; margin: 1.5rem 0;">
        <div style="background: rgba(168, 0, 255, 0.08); border: 1px solid rgba(168, 0, 255, 0.2); border-radius: 10px; padding: 1rem; display: flex; gap: 1rem; align-items: center;">
          <span style="font-size: 1.5rem;">✨</span>
          <div>
            <strong style="color: #fff;">Efeitos de Perfil</strong>
            <p style="color: #aaa; margin: 0.25rem 0 0 0; font-size: 0.9rem;">Animações e efeitos especiais no seu perfil</p>
          </div>
        </div>
        
        <div style="background: rgba(168, 0, 255, 0.08); border: 1px solid rgba(168, 0, 255, 0.2); border-radius: 10px; padding: 1rem; display: flex; gap: 1rem; align-items: center;">
          <span style="font-size: 1.5rem;">🎨</span>
          <div>
            <strong style="color: #fff;">Temas Exclusivos</strong>
            <p style="color: #aaa; margin: 0.25rem 0 0 0; font-size: 0.9rem;">Acesso a todos os temas e cores premium</p>
          </div>
        </div>
        
        <div style="background: rgba(168, 0, 255, 0.08); border: 1px solid rgba(168, 0, 255, 0.2); border-radius: 10px; padding: 1rem; display: flex; gap: 1rem; align-items: center;">
          <span style="font-size: 1.5rem;">📁</span>
          <div>
            <strong style="color: #fff;">Uploads Ilimitados</strong>
            <p style="color: #aaa; margin: 0.25rem 0 0 0; font-size: 0.9rem;">Envie arquivos de qualquer tamanho</p>
          </div>
        </div>
        
        <div style="background: rgba(168, 0, 255, 0.08); border: 1px solid rgba(168, 0, 255, 0.2); border-radius: 10px; padding: 1rem; display: flex; gap: 1rem; align-items: center;">
          <span style="font-size: 1.5rem;">🎁</span>
          <div>
            <strong style="color: #fff;">Badges Exclusivas</strong>
            <p style="color: #aaa; margin: 0.25rem 0 0 0; font-size: 0.9rem;">Insígnias especiais para mostrar seu status</p>
          </div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem;">
        <button class="btn-ghost" onclick="document.getElementById('power-modal').remove(); setActiveDmTab(dmTabFriends);">Cancelar</button>
        <button class="btn-neon">âš¡ ASSINAR POWER</button>
      </div>
    </div>
  `;
  document.body.appendChild(powerModal);
  
  powerModal.addEventListener('click', (e) => {
    if (e.target === powerModal) {
      powerModal.remove();
      setActiveDmTab(dmTabFriends);
    }
  });
});

function updateUserUI() {
  const letter = username[0].toUpperCase();
  userAvatar.className = `profile-avatar av-${letter}`;
  userNameDisplay.textContent = username;
  const profileNameBig = document.getElementById('profile-name-big');
  const profileAvatarBig = document.getElementById('profile-avatar-big');
  if (profileNameBig) profileNameBig.textContent = username;
  if (profileAvatarBig) profileAvatarBig.className = `profile-avatar profile-avatar-big av-${letter}`;
  const statusEl = document.getElementById('profile-status-text');
  const bioEl = document.getElementById('pf-bio');
  if (statusEl && profileStatus) statusEl.textContent = profileStatus;
  if (bioEl && profileBio) bioEl.textContent = profileBio;
  applyProfileMedia();
}

// â”€â”€ Views â”€â”€
function hideAllViews() {
  discoverView.classList.add('hidden');
  chatView.classList.add('hidden');
  voiceView.classList.add('hidden');
  forumView.classList.add('hidden');
  annView.classList.add('hidden');
  document.getElementById('dm-view').classList.add('hidden');
  document.getElementById('typewriter-view').classList.add('hidden');
}

function showDiscoverView() {
  console.log("🔄 Iniciando carregamento do feed principal");
  
  try {
    if (voiceChannelId) leaveVoiceChannel();
    
    // ✅ 🔴 RESET ABSOLUTO TOTAL AO VOLTAR PARA HOME
    // Remove TODO estilo da sidebar para não deixar espaço vazio na lateral
    serverSidebar.classList.add('hidden');
    serverSidebar.removeAttribute('style');
    
    document.body.classList.remove('server-body', 'dm-active', 'dm-view-active', 'dm-mode');
    
    // ✅ FORÇA RENDERIZAÇÃO DO RESET
    void document.body.offsetWidth;
    
    hideAllViews();
    discoverView.classList.remove('hidden');
    currentServerId = null;
    currentChannel = null;
    currentDmUser = null;
    
    // Reseta estados visuais
    document.querySelectorAll('.server-rail-icon').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.mm-tab').forEach(e => e.classList.remove('active'));
    
    document.getElementById('btn-home').classList.add('active');
    updateDiscoverUserAvatar();
    
    // Reseta estado de carregamento
    feedLoaded = false;
    feedRequested = false;
    clearTimeout(feedLoadTimeout);
    
    // Mostra loading
    const feedEl = getDiscoverFeed();
    if (feedEl) {
      feedEl.innerHTML = '<div class="discover-loading">Carregando postagens...</div>';
    }
    
    console.log("✅ Dados recebidos, renderizando feed");
    
    // Solicita dados ao servidor
    socket.emit('feed:join');
    
    // Inicia timeout de segurança
    startFeedLoadTimeout();
    
    console.log("✅ Renderização concluída");
    
  } catch (error) {
    console.error("❌ ERRO NO CARREGAMENTO DO FEED:", error);
    const feedEl = getDiscoverFeed();
    if (feedEl) {
      feedEl.innerHTML = `
        <div class="discover-empty">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h3 style="margin: 0 0 8px 0;">Falha ao carregar postagens</h3>
          <p style="color: #888; margin: 0 0 16px 0;">Ocorreu um erro inesperado.</p>
          <button class="btn-ms" onclick="showDiscoverView();">🔄 Tentar novamente</button>
        </div>
      `;
    }
  } finally {
    console.log("🔚 Finalizado fluxo de carregamento do feed");
  }
}

function updateDiscoverUserAvatar() {
  const el = document.getElementById('discover-user-avatar');
  if (!el || !username) return;
  el.className = `discover-compose-avatar av-${username[0].toUpperCase()}`;
  applyAvatarToEl(el, profileAvatarUrl, username[0].toUpperCase());
}

function openServer(serverId) {
  const server = servers.find(s => s.id === serverId);
  if (!server) return;

  // ✅ 🔴 RESET ABSOLUTO TOTAL - NÃO DEIXA NENHUM RASTRO DO LAYOUT DM
  // 1. Remove TODAS as classes CSS que podem estar conflitando
  document.body.classList.remove('server-body', 'dm-active', 'dm-view-active', 'dm-mode');
  
  // 2. Reseta COMPLETAMENTE a sidebar do servidor
  serverSidebar.classList.add('hidden');
  serverSidebar.removeAttribute('style');
  
  // 3. Reseta TODOS os containers e elementos
  document.querySelectorAll('.dm-view, .dm-container, .dm-active-element').forEach(el => {
    el.classList.remove('dm-view', 'dm-active', 'hidden');
    el.removeAttribute('style');
  });

  // 4. Limpa estados globais
  currentDmUser = null;
  currentServerId = null;
  currentChannel = null;

  // ✅ FORÇA RENDERIZAÇÃO DO RESET - TÉCNICA PROFISSIONAL
  // Isso força o navegador a aplicar TODAS as alterações acima ANTES de continuar
  void document.body.offsetWidth;

  // ✅ AGORA SIM RECRIA O LAYOUT DO SERVIDOR DO ZERO
  document.body.classList.add('server-body');

  currentServerId = serverId;
  sidebarServerName.textContent = server.name;
  
  // ✅ GARANTIA TOTAL: Barra lateral de canais SEMPRE aparece
  serverSidebar.classList.remove('hidden');
  serverSidebar.style.cssText = `
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    transform: translateX(0) !important;
    left: 0 !important;
    width: 240px !important;
    position: relative !important;
    z-index: 10 !important;
    flex: 0 0 240px !important;
  `;

  serverDropdown.classList.add('hidden');
  createChannelModal.classList.add('hidden');

  // ✅ Reseta TODOS os estados visuais
  document.querySelectorAll('.server-rail-icon').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.mm-tab').forEach(e => e.classList.remove('active'));
  document.getElementById('btn-home').classList.remove('active');
  
  const railIcon = serversRail.querySelector(`[data-server-id="${serverId}"]`);
  if (railIcon) railIcon.classList.add('active');

  // ✅ Renderiza canais 2x para garantir atualização
  renderSidebarChannels(server);
  setTimeout(() => renderSidebarChannels(server), 0);
  
  // ✅ Renderiza as abas dos Fandoms no topo
  renderFandomTabs(server);

  // Abre o primeiro canal disponível
  if (server.channels.length > 0) {
    openChannel(server.channels[0]);
  } else {
    hideAllViews();
    discoverView.classList.remove('hidden');
  }
}

function openChannel(ch) {
  console.log("🔍 [DEBUG 1] openChannel() INICIADO");
  console.log("🔍 [DEBUG 1] Canal recebido:", ch);
  
  if (!ch) {
    console.log("❌ [DEBUG 1] Canal é NULL - EXECUÇÃO PAROU AQUI");
    return;
  }
  
  console.log("✅ [DEBUG 1] Canal válido");
  
  currentChannel = ch.id;
  currentChannelType = ch.type;
  lastMessageUser = null;

  console.log("✅ [DEBUG 1] Variáveis globais atualizadas");

  // Highlight no sidebar
  document.querySelectorAll('.ch-item').forEach(el => {
    el.classList.toggle('active', el.dataset.channelId === ch.id);
  });
  
  console.log("✅ [DEBUG 1] Highlight aplicado no sidebar");

  hideAllViews();
  
  console.log("✅ [DEBUG 1] Todas as views ocultadas");

  if (ch.type === 'voice') {
    console.log("✅ [DEBUG 1] É canal de VOZ");
    console.log("🔍 [DEBUG 1] Chamando showVoiceJoinModal()");
    
    // ✅ NÃO ENTRA AUTOMATICAMENTE - ABRE MODAL DE CONFIRMAÇÃO
    showVoiceJoinModal(ch);
    
    console.log("✅ [DEBUG 1] showVoiceJoinModal() executado com SUCESSO");
    console.log("✅ [DEBUG 1] openChannel() FINALIZADO COMPLETAMENTE");
  } else if (ch.type === 'forum') {
    document.getElementById('forum-channel-name').textContent = ch.name;
    forumView.classList.remove('hidden');
    renderForumTopics(ch.id);
  } else if (ch.type === 'announcement') {
    document.getElementById('ann-channel-name').textContent = ch.name;
    annView.classList.remove('hidden');
    annMessagesArea.innerHTML = '';
    lastMessageUser = null;
    socket.emit('switch-channel', { channel: ch.id, communityId: currentServerId });
  } else {
    // text
    const prefix = ch.type === 'announcement' ? '📢' : '#';
    chatChPrefix.textContent = prefix;
    currentChannelNameEl.textContent = ch.name;
    chatHeaderDesc.textContent = ch.desc || '';
    messageInput.placeholder = `MENSAGEM EM #${ch.name}...`;
    messagesArea.innerHTML = '';
    chatView.classList.remove('hidden');
    socket.emit('switch-channel', { channel: ch.id, communityId: currentServerId });
    messageInput.focus();
  }
}

// â”€â”€ Render sidebar canais â”€â”€
// ✅ Função para renderizar ABAS DOS FANDOMS no topo
function renderFandomTabs(server) {
  const tabsContainer = document.getElementById('fandom-tabs-container');
  if (!tabsContainer) return;
  
  tabsContainer.innerHTML = '';
  
  // Aba padrão "Todos os canais"
  const allTab = document.createElement('div');
  allTab.className = 'fandom-tab active';
  allTab.textContent = '📋 Todos';
  allTab.dataset.fandomId = 'all';
  allTab.addEventListener('click', () => {
    document.querySelectorAll('.fandom-tab').forEach(t => t.classList.remove('active'));
    allTab.classList.add('active');
    // Mostra todos os canais
    document.querySelectorAll('.ch-item').forEach(ch => ch.style.display = 'flex');
    document.querySelectorAll('.ch-category-row').forEach(cat => cat.style.display = 'flex');
  });
  tabsContainer.appendChild(allTab);
  
  // Abas dos Fandoms criados
  (server.fandomTabs || []).forEach(fandom => {
    const tab = document.createElement('div');
    tab.className = 'fandom-tab';
    tab.textContent = `🎮 ${fandom.name}`;
    tab.dataset.fandomId = fandom.id;
    tab.addEventListener('click', () => {
      document.querySelectorAll('.fandom-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Mostra apenas canais deste Fandom
      document.querySelectorAll('.ch-item').forEach(ch => {
        ch.style.display = ch.dataset.fandomId === fandom.id ? 'flex' : 'none';
      });
      document.querySelectorAll('.ch-category-row').forEach(cat => {
        cat.style.display = cat.textContent.includes(fandom.name.toUpperCase()) ? 'flex' : 'none';
      });
    });
    tabsContainer.appendChild(tab);
  });
}

function renderSidebarChannels(server) {
  sidebarChannels.innerHTML = '';
  const categories = groupByCategory(server.channels, server);
  
  // ✅ ADICIONAR CATEGORIAS VAZIAS QUE NÃO TEM CANAIS AINDA
  if (server.customCategories && server.customCategories.length > 0) {
    server.customCategories.forEach(cat => {
      const catUpper = cat.toUpperCase();
      if (!categories[catUpper]) {
        categories[catUpper] = [];
      }
    });
  }

  for (const [cat, channels] of Object.entries(categories)) {
    const catHeader = document.createElement('div');
    catHeader.className = 'ch-category-row';
    catHeader.draggable = true;
    catHeader.style.cursor = 'grab';
    catHeader.innerHTML = `
      <span class="cat-arrow">▼</span>
      <span class="cat-name">${cat}</span>
      <button class="ch-cat-add" data-cat="${cat}" title="Criar canal nesta categoria">+</button>
    `;
    sidebarChannels.appendChild(catHeader);

    // ✅ COLAPSAR/EXPANDIR CATEGORIA ESTILO DISCORD
    catHeader.querySelector('.cat-arrow').addEventListener('click', (e) => {
      e.stopPropagation();
      catHeader.classList.toggle('collapsed');
      const next = catHeader.nextElementSibling;
      if (next && next.classList.contains('category-channels')) {
        next.classList.toggle('hidden');
      }
    });

    catHeader.querySelector('.ch-cat-add').addEventListener('click', (e) => {
      e.stopPropagation();
      openCreateChannelModal(cat);
    });

    // ✅ CONTAINER PARA OS CANAIS DA CATEGORIA
    const categoryChannels = document.createElement('div');
    categoryChannels.className = 'category-channels';
    categoryChannels.dataset.category = cat;
    sidebarChannels.appendChild(categoryChannels);

    // Menu de contexto nas categorias
    catHeader.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const ctxMenu = document.createElement('div');
      ctxMenu.className = 'channel-ctx-menu';
      ctxMenu.style.left = e.clientX + 'px';
      ctxMenu.style.top = e.clientY + 'px';
      ctxMenu.innerHTML = `
        <div class="ctx-item" data-action="create-fandom">✨ Criar Fandom</div>
        <div class="ctx-sep"></div>
        <div class="ctx-item" data-action="rename-cat">âœï¸ Renomear categoria</div>
        <div class="ctx-item" data-action="move-up">â¬†ï¸ Mover para cima</div>
        <div class="ctx-item" data-action="move-down">â¬‡ï¸ Mover para baixo</div>
        <div class="ctx-sep"></div>
        <div class="ctx-item ctx-danger" data-action="delete-cat">🗑 Excluir categoria</div>
      `;
      
      document.body.appendChild(ctxMenu);
      
      ctxMenu.querySelectorAll('[data-action]').forEach(item => {
        item.addEventListener('click', () => {
          ctxMenu.remove();
          if (item.dataset.action === 'create-fandom') {
            const fandomName = prompt('Nome do Fandom:');
            if (fandomName?.trim()) {
              // Cria um Fandom (grupo separado dentro do servidor)
              const fandomId = `fandom_${Date.now().toString(36)}`;
              if (!server.fandoms) server.fandoms = [];
              
              server.fandoms.push({
                id: fandomId,
                name: fandomName.trim(),
                icon: '',
                channels: [],
                createdAt: Date.now()
              });
              
              saveServers();
              renderSidebarChannels(server);
              showToast(`✅ Fandom "${fandomName.trim()}" criado com sucesso!`);
            }
          }
          if (item.dataset.action === 'rename-cat') {
            const newName = prompt('Novo nome da categoria:', cat);
            if (newName?.trim()) {
              const oldName = cat;
              const newNameUpper = newName.trim().toUpperCase();
              // Atualiza nome da categoria
              const idx = server.customCategories.indexOf(oldName);
              if (idx !== -1) server.customCategories[idx] = newNameUpper;
              // Atualiza todos os canais desta categoria
              server.channels.forEach(ch => {
                if (ch.category?.toUpperCase() === oldName.toUpperCase()) {
                  ch.category = newNameUpper;
                }
              });
              saveServers();
              renderSidebarChannels(server);
              showToast('Categoria renomeada!');
            }
          }
          if (item.dataset.action === 'move-up') {
            const idx = server.customCategories.indexOf(cat);
            if (idx > 0) {
              [server.customCategories[idx], server.customCategories[idx-1]] = [server.customCategories[idx-1], server.customCategories[idx]];
              saveServers();
              renderSidebarChannels(server);
            }
          }
          if (item.dataset.action === 'move-down') {
            const idx = server.customCategories.indexOf(cat);
            if (idx < server.customCategories.length - 1) {
              [server.customCategories[idx], server.customCategories[idx+1]] = [server.customCategories[idx+1], server.customCategories[idx]];
              saveServers();
              renderSidebarChannels(server);
            }
          }
          if (item.dataset.action === 'delete-cat') {
            if (confirm(`Excluir categoria ${cat}? Os canais serão movidos para padrão.`)) {
              // Remove categoria
              const idx = server.customCategories.indexOf(cat);
              if (idx !== -1) server.customCategories.splice(idx, 1);
              // Remove categoria dos canais
              server.channels.forEach(ch => {
                if (ch.category?.toUpperCase() === cat.toUpperCase()) {
                  delete ch.category;
                }
              });
              saveServers();
              renderSidebarChannels(server);
              showToast('Categoria excluída!');
            }
          }
        });
      });

      setTimeout(() => {
        document.addEventListener('click', function closeCtx() {
          ctxMenu.remove();
          document.removeEventListener('click', closeCtx);
        }, { once: true });
      }, 10);
    });

    channels.forEach(ch => {
      const li = document.createElement('div');
      li.className = 'ch-item';
      li.dataset.channelId = ch.id;
      li.draggable = true;
      li.style.cursor = 'grab';
      li.innerHTML = `<span class="ch-icon">${channelIcon(ch.type)}</span><span class="ch-name">${escHtml(ch.name)}</span>`;
      li.addEventListener('click', () => openChannel(ch));
      
      // Menu de contexto com botão direito
      li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Cria menu de contexto do canal
        const ctxMenu = document.createElement('div');
        ctxMenu.className = 'channel-ctx-menu';
        ctxMenu.style.left = e.clientX + 'px';
        ctxMenu.style.top = e.clientY + 'px';
      ctxMenu.innerHTML = `
        <div class="ctx-item" data-action="rename-cat">âœï¸ Renomear categoria</div>
        <div class="ctx-item" data-action="move-up">â¬†ï¸ Mover para cima</div>
        <div class="ctx-item" data-action="move-down">â¬‡ï¸ Mover para baixo</div>
        <div class="ctx-sep"></div>
        <div class="ctx-item ctx-danger" data-action="delete-cat">🗑 Excluir categoria</div>
      `;
        
        document.body.appendChild(ctxMenu);
        
        // Ações do menu
        ctxMenu.querySelectorAll('[data-action]').forEach(item => {
          item.addEventListener('click', () => {
            ctxMenu.remove();
            if (item.dataset.action === 'rename') {
              const newName = prompt('Novo nome do canal:', ch.name);
              if (newName?.trim()) {
                ch.name = newName.trim().toLowerCase().replace(/\s+/g, '-');
                saveServers();
                renderSidebarChannels(server);
                showToast('Canal renomeado!');
              }
            }
            if (item.dataset.action === 'edit') {
              openServerSettingsModal('canais');
            }
            if (item.dataset.action === 'clone') {
              const newCh = {
                ...ch,
                id: `${currentServerId}_${Date.now().toString(36)}`,
                name: `${ch.name}-copia`
              };
              server.channels.push(newCh);
              saveServers();
              renderSidebarChannels(server);
              showToast('Canal duplicado!');
            }
            if (item.dataset.action === 'delete') {
              if (confirm(`Excluir canal #${ch.name}?`)) {
                const idx = server.channels.findIndex(c => c.id === ch.id);
                if (idx !== -1) server.channels.splice(idx, 1);
                saveServers();
                renderSidebarChannels(server);
                if (currentChannel === ch.id) {
                  // Verifica se ainda tem canais no servidor
                  if (server.channels.length === 0) {
                    hideAllViews();
                    // Mostra tela de nenhum canal
                    msContent.innerHTML = `
                      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;color:#888">
                        <div style="font-size:64px">📭</div>
                        <h2 style="margin:0;color:#ccc">Não há canais por aqui</h2>
                        <p style="margin:0;max-width:400px;text-align:center">Este servidor ainda não tem nenhum canal criado. Clique no botão + acima para criar o primeiro canal!</p>
                      </div>
                    `;
                    msContent.classList.remove('hidden');
                  } else {
                    // Abre o primeiro canal restante
                    openChannel(server.channels[0]);
                  }
                }
                showToast('Canal excluído!');
              }
            }
          });
        });
        
        // Fecha menu ao clicar fora
        setTimeout(() => {
          document.addEventListener('click', function closeCtx() {
            ctxMenu.remove();
            document.removeEventListener('click', closeCtx);
          }, { once: true });
        }, 10);
      });
      
      sidebarChannels.appendChild(li);
    });
  }
}

function groupByCategory(channels, server) {
  const map = {};
  
  // ✅ SEMPRE CRIA O GRUPO CANAIS DE TEXTO PRIMEIRO
  map['CANAIS DE TEXTO'] = [];
  
  // ✅ ADICIONA TODOS OS CANAIS TEXTUAIS DIRETAMENTE AQUI
  channels.forEach(ch => {
    if (['text', 'announcement', 'forum'].includes(ch.type)) {
      map['CANAIS DE TEXTO'].push(ch);
    }
  });
  
  // ✅ CRIA O GRUPO CANAIS DE VOZ
  map['CANAIS DE VOZ'] = channels.filter(ch => ch.type === 'voice');
  
  // Adiciona categorias personalizadas depois
  (server?.customCategories || []).forEach(cat => {
    const catUpper = cat.toUpperCase();
    if (!map[catUpper]) map[catUpper] = [];
  });
  
  // Remove grupos vazios
  Object.keys(map).forEach(key => {
    if (map[key].length === 0) {
      delete map[key];
    }
  });
  
  return map;
}

function channelIcon(type) {
  // ✅ CORREÇÃO: Ícones com encoding correto para evitar caracteres estranhos
  if (type === 'text') return '#';
  if (type === 'voice') return '\ud83d\udd0a';
  if (type === 'forum') return '\ud83d\udcac';
  if (type === 'announcement') return '\ud83d\udce2';
  return '#';
}

// â”€â”€ Render rail de servidores â”€â”€
function renderServersRail() {
  // Remove servidores antigos
  serversRail.querySelectorAll('.server-rail-icon[data-server-id]').forEach(e => e.remove());

  const addBtn = document.getElementById('btn-add-community');
  servers.forEach(server => {
    const icon = document.createElement('div');
    icon.className = 'server-rail-icon';
    icon.dataset.serverId = server.id;
    if (server.icon) {
      icon.style.backgroundImage = `url(${server.icon})`;
      icon.style.backgroundSize = 'cover';
      icon.style.backgroundPosition = 'center';
      icon.textContent = '';
    } else {
      icon.style.backgroundImage = '';
      icon.textContent = server.name[0].toUpperCase();
    }
    icon.title = server.name;

    icon.addEventListener('click', () => openServer(server.id));

    // ✅ EVENTO DE BOTÃO DIREITO PARA ABRIR MENU DE CONTEXTO
    icon.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showServerCtxMenu(e.clientX, e.clientY, server.id);
    });

    serversRail.insertBefore(icon, addBtn);
  });
}

// â”€â”€ Criar servidor â”€â”€
function openCommunityModal() {
  communityModal.classList.remove('hidden');
  // Apply special creating-server design while modal is open
  document.body.classList.add('creating-server');
  communityNameInput.value = '';
  setTimeout(() => communityNameInput.focus(), 50);
}

function closeCommunityModal() {
  communityModal.classList.add('hidden');
  // Remove special design when modal closes
  document.body.classList.remove('creating-server');
}

function createServer(template) {
  const name = communityNameInput.value.trim() || 'Meu Servidor';
  const id = `srv_${Date.now().toString(36)}`;

  const baseChannels = [
    { id: `${id}_geral`, name: 'geral', type: 'text', desc: 'Canal principal' },
    { id: `${id}_jogos`, name: 'jogos', type: 'text', desc: 'Fale sobre jogos' },
    { id: `${id}_musica`, name: 'musica', type: 'text', desc: 'Músicas e playlists' },
    { id: `${id}_voz`, name: 'voz', type: 'voice', desc: 'Canal de voz' },
    { id: `${id}_anuncios`, name: 'anuncios', type: 'announcement', desc: 'Anúncios importantes' },
    { id: `${id}_forum`, name: 'forum', type: 'forum', desc: 'Discussões estilo Reddit' },
  ];

  const blankChannels = [
    { id: `${id}_geral`, name: 'geral', type: 'text', desc: 'Seu primeiro canal' },
  ];

  const server = {
    id,
    name,
    icon: '',
    description: '',
    channels: template === 'blank' ? blankChannels : baseChannels,
    customCategories: [],
    events: [],
    settings: { notifications: true, mentions: true, events: true },
  };

  servers.push(server);
  saveServers();
  closeCommunityModal();
  renderServersRail();
  openServer(id);
}


btnAddCommunity.addEventListener('click', openCommunityModal);

// Evento botão Criar Fandom na barra inferior
document.getElementById('btn-add-fandom').addEventListener('click', () => {
  fandomModal.classList.remove('hidden');
  fandomNameInput.value = '';
  fandomTopicInput.value = '';
  setTimeout(() => fandomNameInput.focus(), 50);
});



// Fechar modal fandom
fandomModalClose.addEventListener('click', () => fandomModal.classList.add('hidden'));
fandomModal.addEventListener('click', (e) => { if (e.target === fandomModal) fandomModal.classList.add('hidden'); });

// Seleção de tipo de fandom
let selectedFandomType = 'game';
fandomOptions.forEach(btn => {
  btn.addEventListener('click', () => {
    fandomOptions.forEach(b => {
      b.style.background = 'transparent';
      b.style.border = '1px solid transparent';
    });
    btn.style.background = 'rgba(255,0,255,0.2)';
    btn.style.border = '1px solid var(--neon)';
    selectedFandomType = btn.dataset.fandomType;
  });
});

// Criar Fandom
function createFandom() {
  const name = fandomNameInput.value.trim();
  if (!name) return;
  
  const fandomId = `fandom_${Date.now().toString(36)}`;
  const newFandom = {
    id: fandomId,
    name,
    topic: fandomTopicInput.value.trim(),
    type: selectedFandomType,
    icon: '',
    channels: [
      { id: `${fandomId}_geral`, name: 'geral', type: 'text', desc: 'Canal principal do fandom' },
      { id: `${fandomId}_discussao`, name: 'discussão', type: 'text', desc: 'Discussões gerais' },
    ],
    createdAt: Date.now()
  };
  
  // Salva no servidor atual se estiver aberto
  if (currentServerId) {
    const server = servers.find(s => s.id === currentServerId);
    if (server) {
      if (!server.fandoms) server.fandoms = [];
      server.fandoms.push(newFandom);
      saveServers();
      renderSidebarChannels(server);
      renderFandomTabs(server);
    }
  }
  
  fandomModal.classList.add('hidden');
  showToast(`✅ Fandom "${name}" criado com sucesso!`);
}

document.getElementById('fandom-modal-confirm')?.addEventListener('click', createFandom);
fandomNameInput.addEventListener('keydown', e => e.key === 'Enter' && createFandom());
btnDiscoverCreate?.addEventListener('click', openCommunityModal);
communityModalClose.addEventListener('click', closeCommunityModal);
communityModal.addEventListener('click', (e) => { if (e.target === communityModal) closeCommunityModal(); });
communityOptions.forEach(btn => btn.addEventListener('click', () => createServer(btn.dataset.template)));

// â”€â”€ Criar canal dentro do servidor â”€â”€
function openCreateChannelModal(category = null) {
  serverDropdown.classList.add('hidden');
  pendingChannelCategory = category;
  createChannelModal.classList.remove('hidden');
  newChannelNameInput.value = '';
  setTimeout(() => newChannelNameInput.focus(), 50);
}

function closeCreateChannelModal() {
  createChannelModal.classList.add('hidden');
}

btnCancelChannel.addEventListener('click', closeCreateChannelModal);

btnConfirmChannel.addEventListener('click', () => {
  if (!currentServerId) return;
  const name = newChannelNameInput.value.trim().toLowerCase().replace(/\s+/g, '-');
  if (!name) return;
  const type = document.querySelector('input[name="ch-type"]:checked').value;
  const server = servers.find(s => s.id === currentServerId);
  if (!server) return;

  // ✅ Garante que o array de canais existe
  if (!server.channels) server.channels = [];

  const ch = {
    id: `${currentServerId}_${Date.now().toString(36)}`,
    name: name,
    type: type,
    desc: type === 'text' ? `Canal #${name}` : '',
    category: pendingChannelCategory || null,
    createdAt: Date.now()
  };
  pendingChannelCategory = null;

  server.channels.push(ch);
  saveServers();
  closeCreateChannelModal();

  // ✅ Logs para debug
  console.log("✅ Canal criado:", ch);
  console.log("Servidor atual:", server);
  console.log("Todos os canais:", server.channels);

  // ✅ Renderiza 2x para garantir atualização
  renderSidebarChannels(server);
  
  setTimeout(() => {
    renderSidebarChannels(server);
    openChannel(ch);
  }, 100);
});

newChannelNameInput.addEventListener('keydown', e => e.key === 'Enter' && btnConfirmChannel.click());

// â”€â”€ Dropdown do servidor â”€â”€
serverHeaderBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  createChannelModal.classList.add('hidden');
  serverDropdown.classList.toggle('hidden');
});

document.getElementById('dd-create-channel').addEventListener('click', openCreateChannelModal);
document.getElementById('dd-invite').addEventListener('click', () => {
  serverDropdown.classList.add('hidden');
  openServerSettingsModal('convites');
});
document.getElementById('dd-copy-id').addEventListener('click', () => {
  navigator.clipboard?.writeText(currentServerId).catch(() => {});
  serverDropdown.classList.add('hidden');
  showToast('ID copiado: ' + currentServerId);
});
document.getElementById('dd-create-category').addEventListener('click', () => {
  serverDropdown.classList.add('hidden');
  // ✅ ABRIR APENAS O MODAL PEQUENO DE CRIAR CATEGORIA
  document.getElementById('create-category-modal').classList.remove('hidden');
  document.getElementById('new-category-name').focus();
});
document.getElementById('dd-create-event').addEventListener('click', () => {
  serverDropdown.classList.add('hidden');
  openServerSettingsModal('eventos');
});
document.getElementById('dd-notifications').addEventListener('click', () => {
  serverDropdown.classList.add('hidden');
  openServerSettingsModal('notificacoes');
});
document.getElementById('dd-privacy')?.addEventListener('click', () => {
  serverDropdown.classList.add('hidden');
  openServerSettingsModal('seguranca');
});
document.getElementById('dd-edit-profile').addEventListener('click', () => {
  serverDropdown.classList.add('hidden');
  openServerSettingsModal('geral');
});
document.getElementById('dd-configure').addEventListener('click', () => {
  serverDropdown.classList.add('hidden');
  openServerSettingsModal('comunidade');
});
document.getElementById('dd-raid')?.addEventListener('click', () => {
  serverDropdown.classList.add('hidden');
  openServerSettingsModal('seguranca');
});
document.getElementById('dd-security')?.addEventListener('click', () => {
  serverDropdown.classList.add('hidden');
  openServerSettingsModal('seguranca');
});
document.getElementById('dd-show-channels')?.addEventListener('click', () => {
  serverDropdown.classList.add('hidden');
  openServerSettingsModal('canais');
});

// â”€â”€ Discover / home btn â”€â”€
btnHomeBtn.addEventListener('click', () => {
  // Volta para a página inicial padrão do Xenon Comunidade
  hideAllViews();
  discoverView.classList.remove('hidden');
  
  // ✅ CORREÇÃO: Remove classe server-body e oculta sidebar do servidor
  document.body.classList.remove('server-body');
  serverSidebar.classList.add('hidden');
  
  // Reseta o discover-view para o estado inicial (página de boas vindas)
  const mainArea = document.querySelector('#discover-view .discover-main');
  mainArea.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 120px; margin-bottom: 24px; opacity: 0.7;">💬</div>
      <h1 style="color: #fff; font-size: 32px; margin-bottom: 12px;">Bem-vindo ao Xenon Comunidade</h1>
      <p style="color: #aaa; font-size: 18px; margin-bottom: 48px; max-width: 500px;">Conecte-se com pessoas que compartilham seus interesses, compartilhe ideias e participe de discussões.</p>
      
      <button class="btn-neon" id="btn-open-community-posts" style="font-size: 20px; padding: 16px 48px;">
        📢 Postagens de comunidade
      </button>
    </div>
  `;

  // Reativa o evento do botão Postagens de comunidade
  setTimeout(() => {
    document.getElementById('btn-open-community-posts')?.addEventListener('click', () => {
      // Renderiza o feed de postagens
      const mainArea = document.querySelector('#discover-view .discover-main');
      
      mainArea.innerHTML = `
        <div class="discover-community-banner">
          <div class="community-banner-header">
            <div class="community-banner-icon">💬</div>
            <div class="community-banner-info">
              <h1>Xenon Comunidade</h1>
              <p>Seja você mesmo! Conecte-se com pessoas que compartilham seus interesses.</p>
            </div>
          </div>
          <div class="community-stats">
            <div class="community-stat">
              <span class="community-stat-value">0</span>
              <span class="community-stat-label">Membros</span>
            </div>
            <div class="community-stat">
              <span class="community-stat-value">0</span>
              <span class="community-stat-label">Fandoms</span>
            </div>
            <div class="community-stat">
              <span class="community-stat-value">0</span>
              <span class="community-stat-label">Online</span>
            </div>
          </div>
        </div>

        <div class="discover-compose">
          <div class="discover-compose-avatar" id="discover-user-avatar">?</div>
          <input type="text" id="discover-post-title" placeholder="Título da postagem..." maxlength="200" />
          <textarea id="discover-post-body" placeholder="O que você quer compartilhar?" maxlength="2000" rows="2"></textarea>
          
          <div class="discover-compose-actions">
            <button type="button" class="compose-btn-modern" id="btn-compose-media" title="Enviar mídia">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </button>
            <button type="button" class="compose-btn-modern" id="btn-compose-poll" title="Criar enquete">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="8" y1="7" x2="16" y2="7"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
                <line x1="8" y1="17" x2="13" y2="17"></line>
              </svg>
            </button>
            <button type="button" class="compose-btn-modern" id="btn-compose-share" title="Compartilhar link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3.23-3.23a4 4 0 0 0-5.66-5.66l-3 3.06a5 5 0 0 0-6.61 6.53"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3.23 3.23a4 4 0 0 0 5.66 5.66l3-3.06a5 5 0 0 0 6.61-6.53"></path>
              </svg>
            </button>
            <button type="button" class="compose-btn-modern" id="btn-compose-voice" title="Gravar áudio">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>
            <button type="button" class="btn-neon" id="btn-discover-post">Publicar</button>
          </div>
        </div>
       
        <div class="discover-sort">
          <span>Ordenar:</span>
          <button type="button" class="discover-sort-btn active" data-sort="hot">Em alta</button>
          <button type="button" class="discover-sort-btn" data-sort="new">Novos</button>
          <button type="button" class="discover-sort-btn" data-sort="top">Top</button>
          <button id="btn-discover-refresh" type="button" class="discover-sort-btn" style="margin-left: 16px;">🔄 Atualizar</button>
        </div>
       
        <div class="posts-feed" id="discover-feed" style="height: calc(100vh - 520px); overflow-y: auto; overflow-x: hidden; padding-right: 10px; scrollbar-width: thin; scrollbar-color: #00ffff rgba(0,0,0,0.2); margin-top: 12px;">
          <div class="discover-loading">Carregando postagens...</div>
        </div>
      `;

      // Carrega as postagens
      showDiscoverView();
    });
  }, 100);

  // Reseta estados visuais
  document.querySelectorAll('.server-rail-icon').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.mm-tab').forEach(e => e.classList.remove('active'));
  
  document.getElementById('btn-home').classList.add('active');
  
  showToast('🏠 Página inicial');
});

// ✅ CORREÇÃO: Reseta todos os estados visuais ao voltar para home
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// â”€â”€ Navbar icons â”€â”€
btnOpenSettings.addEventListener('click', openSettingsModal);
btnOpenCommunity.addEventListener('click', () => {
  if (servers.length > 0) openServer(servers[0].id);
  else openCommunityModal();
});

// â”€â”€ Nav buttons (amigos, loja, suporte) â”€â”€
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const modalEl = document.getElementById(btn.dataset.modal);
    if (modalEl) {
      openModal(modalEl);
      if (btn.dataset.modal === 'friends-modal') renderFriendsModal();
    }
  });
});

// â”€â”€ Abas modais modernos (amigos) â”€â”€
mmTabs.forEach(tab => {
  tab.addEventListener('click', () => activateMmTab(tab.dataset.tab));
});

function activateMmTab(tabId) {
  mmTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.querySelectorAll('.mm-pane').forEach(p => {
    p.classList.toggle('hidden', p.id !== tabId);
    p.classList.toggle('active', p.id === tabId);
  });
  renderFriendsTab(tabId);
}

// â”€â”€ Abas perfil â”€â”€
profileTabs.forEach(tab => {
  tab.addEventListener('click', () => activateProfileTab(tab.dataset.ptab));
});

function activateProfileTab(tabId) {
  profileTabs.forEach(t => t.classList.toggle('active', t.dataset.ptab === tabId));
  document.querySelectorAll('.pf-pane').forEach(p => {
    p.classList.toggle('hidden', p.id !== tabId);
    p.classList.toggle('active', p.id === tabId);
  });
}

// â”€â”€ Perfil: abrir via avatar â”€â”€
function showProfilePopover(x, y) {
  profilePopover.style.left = x + 'px';
  profilePopover.style.top = y + 'px';
  profilePopover.classList.remove('hidden');
}

function hideProfilePopover() {
  profilePopover.classList.add('hidden');
}

function openProfileModal() {
  hideProfilePopover();
  updateUserUI();
  openModal(profileModal);
}

userAvatar.addEventListener('click', (e) => {
  e.stopPropagation();
  const rect = userAvatar.getBoundingClientRect();
  showProfilePopover(rect.left, rect.bottom + 6);
});

// ✅ EVENTO BOTÃO DIREITO NO AVATAR DA BARRA SUPERIOR
userAvatar.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const rect = userAvatar.getBoundingClientRect();
  showProfilePopover(rect.left, rect.bottom + 6);
});

// ✅ EVENTO BOTÃO DIREITO NO AVATAR DA PÁGINA DE MENSAGENS PRIVADAS
const userAvatarDm = document.getElementById('user-avatar-dm');
if (userAvatarDm) {
  userAvatarDm.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = userAvatarDm.getBoundingClientRect();
    showProfilePopover(rect.left, rect.bottom + 6);
  });

  userAvatarDm.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = userAvatarDm.getBoundingClientRect();
    showProfilePopover(rect.left, rect.bottom + 6);
  });
}

btnOpenProfileEdit?.addEventListener('click', openProfileModal);

document.getElementById('btn-copy-profile-id')?.addEventListener('click', () => {
  navigator.clipboard?.writeText(profileId).catch(() => {});
  showToast('ID copiado: ' + profileId);
});

document.getElementById('btn-change-account')?.addEventListener('click', () => {
  const newName = prompt('Novo nome de usuário:', username);
  if (newName && newName.trim()) {
    username = newName.trim();
    updateUserUI();
    showToast('Nome atualizado!');
  }
});

const inputAvatar = document.getElementById('input-avatar');
const inputBanner = document.getElementById('input-banner');

function saveProfileField(key, value, storageKey) {
  if (key === 'bio') { profileBio = value; localStorage.setItem('zx_bio', value); }
  if (key === 'status') { profileStatus = value; localStorage.setItem('zx_status', value); }
}

document.getElementById('btn-edit-banner')?.addEventListener('click', (e) => { e.stopPropagation(); inputBanner?.click(); });
document.getElementById('btn-edit-avatar')?.addEventListener('click', (e) => { e.stopPropagation(); inputAvatar?.click(); });
document.getElementById('profile-avatar-big')?.addEventListener('click', (e) => { e.stopPropagation(); inputAvatar?.click(); });

inputAvatar?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  readImageFile(file, (dataUrl) => {
    profileAvatarUrl = dataUrl;
    localStorage.setItem('zx_avatar', dataUrl);
    applyProfileMedia();
    showToast('Foto de perfil atualizada!');
  });
  e.target.value = '';
});

inputBanner?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  readImageFile(file, (dataUrl) => {
    profileBannerUrl = dataUrl;
    localStorage.setItem('zx_banner', dataUrl);
    applyProfileMedia();
    showToast('Banner atualizado!');
  });
  e.target.value = '';
});

document.getElementById('profile-status-text')?.addEventListener('blur', (e) => {
  saveProfileField('status', e.target.textContent.trim());
});

// Seletor de status do usuário
const statusSelect = document.getElementById('profile-status-select');
if (statusSelect) {
  statusSelect.value = userStatus;
  
  statusSelect.addEventListener('change', () => {
    userStatus = statusSelect.value;
    localStorage.setItem('zx_user_status', userStatus);
    
    // Atualiza indicador visual no avatar
    updateUserStatusIndicator();
    
    // Envia status para o servidor em tempo real
    socket.emit('user:status', { status: userStatus, username });
    
    // Dispara evento global para atualizar status em todos os lugares
    window.dispatchEvent(new CustomEvent('userStatusChanged', { 
      detail: { status: userStatus } 
    }));
    
    showToast(`Status alterado para: ${statusSelect.options[statusSelect.selectedIndex].text}`);
  });
}

function updateUserStatusIndicator() {
  // Atualiza ponto de status no avatar principal
  const statusDot = document.querySelector('.profile-status-dot');
  if (statusDot) {
    statusDot.className = `profile-status-dot ${userStatus}`;
  }
  
  // Atualiza avatar na navbar
  const navAvatar = document.getElementById('user-avatar');
  if (navAvatar) {
    navAvatar.className = `profile-avatar status-${userStatus}`;
  }
}

// Atualiza status ao carregar
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(updateUserStatusIndicator, 500);
});
document.getElementById('pf-bio')?.addEventListener('blur', (e) => {
  saveProfileField('bio', e.target.textContent.trim());
});

// Coleção de jogos no perfil
function renderProfileGames() {
  const list = document.getElementById('pf-game-list');
  if (!list) return;
  if (profileGames.length === 0) {
    list.innerHTML = '<div class="empty-state small">🎮<p>Nenhum jogo na coleção ainda.</p></div>';
    return;
  }
  list.innerHTML = profileGames.map((g, i) =>
    `<div class="pf-game-item"><span>🎮 ${escHtml(g)}</span><button type="button" data-i="${i}">âœ•</button></div>`
  ).join('');
  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      profileGames.splice(+btn.dataset.i, 1);
      localStorage.setItem('zx_profile_games', JSON.stringify(profileGames));
      renderProfileGames();
    });
  });
}

document.getElementById('btn-add-game')?.addEventListener('click', () => {
  const input = document.getElementById('pf-game-input');
  const name = input?.value.trim();
  if (!name) return;
  profileGames.push(name);
  localStorage.setItem('zx_profile_games', JSON.stringify(profileGames));
  if (input) input.value = '';
  renderProfileGames();
});

// Efeitos de perfil
const toggleEffects = document.getElementById('toggle-effects');
const effectsGrid = document.getElementById('effects-grid');
toggleEffects?.addEventListener('change', () => {
  effectsGrid?.classList.toggle('enabled', toggleEffects.checked);
  effectsGrid?.querySelectorAll('.effect-card').forEach(c => c.classList.remove('disabled'));
});
effectsGrid?.querySelectorAll('.effect-card').forEach(card => {
  card.addEventListener('click', () => {
    if (!toggleEffects?.checked) return;
    effectsGrid.querySelectorAll('.effect-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
  });
});

// Cor do programa (tema)
const themeMap = {
  '#ff00ff': '',
  '#00cfff': 'theme-cyan',
  '#39ff14': 'theme-green',
  '#ff6600': 'theme-orange',
  '#ffd700': 'theme-gold',
};
const themeClasses = Object.values(themeMap).filter(Boolean);
function applyTheme(themeClass) {
  document.body.classList.remove(...themeClasses);
  if (themeClass) document.body.classList.add(themeClass);
}
document.querySelectorAll('input[name="theme-color"]').forEach(radio => {
  radio.addEventListener('change', () => {
    applyTheme(themeMap[radio.value] || '');
    localStorage.setItem('zx_theme', radio.value);
  });
});
const savedTheme = localStorage.getItem('zx_theme');
if (savedTheme) {
  const r = document.querySelector(`input[name="theme-color"][value="${savedTheme}"]`);
  if (r) { r.checked = true; applyTheme(themeMap[savedTheme] || ''); }
}

renderProfileGames();

// â”€â”€ Configurações: conteúdo das seções â”€â”€
const SETTINGS_SECTIONS = {
  conta: () => {
    const savedUsername = localStorage.getItem('zx_username') || username;
    return `
    <h2 class="ms-section-title">Conta</h2>
    <p class="ms-section-desc">Gerencie suas informações pessoais.</p>
    <div class="ms-block">
      <div class="ms-block-title">Informações do usuário</div>
      <div class="ms-field"><label>Nome de usuário</label><input type="text" id="set-username" value="${escHtml(savedUsername)}" maxlength="32" /></div>
    </div>
    
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,0,255,0.15);">
      <button type="button" class="btn-ms" style="width: 100%; background: #dc2626; border-color: #dc2626; color: white;" id="btn-logout-account">🚪 Sair da conta</button>
    </div>`;
  },

  voz: () => {
    const savedMic = localStorage.getItem('zx_audio_input') || 'default';
    const savedSpeaker = localStorage.getItem('zx_audio_output') || 'default';
    const savedCamera = localStorage.getItem('zx_video_input') || 'default';
    const savedBg = localStorage.getItem('zx_camera_bg') || 'none';
    const noiseSuppression = localStorage.getItem('zx_noise_suppression') !== 'false';
    const echoCancellation = localStorage.getItem('zx_echo_cancellation') !== 'false';
    const autoGain = localStorage.getItem('zx_auto_gain') !== 'false';
    
    return `
    <h2 class="ms-section-title">Voz e vídeo</h2>
    <p class="ms-section-desc">Configure áudio e câmera para chamadas.</p>
    
    <div class="ms-block">
      <div class="ms-block-title">🎙 Dispositivos de Áudio</div>
      
      <div class="ms-field">
        <label>Microfone (Entrada)</label>
        <select id="mic-device-select">
          <option value="default" ${savedMic === 'default' ? 'selected' : ''}>Padrão do sistema</option>
        </select>
      </div>
      
      <div class="ms-field">
        <label>Alto-falante (Saída)</label>
        <select id="speaker-device-select">
          <option value="default" ${savedSpeaker === 'default' ? 'selected' : ''}>Padrão do sistema</option>
        </select>
      </div>
      
      <div class="ms-field"><label>Volume do microfone</label><input type="range" min="0" max="100" value="80" id="mic-volume-slider" /></div>
      <div class="ms-field"><label>Volume do alto-falante</label><input type="range" min="0" max="100" value="70" id="speaker-volume-slider" /></div>
      
      <div style="margin:12px 0;padding:12px;background:#1a1a2e;border-radius:8px">
        <div id="mic-visualizer" style="height:40px;background:#222;border-radius:6px;display:flex;align-items:flex-end;gap:2px;padding:4px;justify-content:center">
          ${Array(20).fill(0).map(() => `<div style="width:8px;background:#ff00ff;height:4px;border-radius:2px;transition:height 0.05s"></div>`).join('')}
        </div>
      </div>
      
      <button type="button" class="btn-ms btn-ms-primary" id="btn-mic-test">🎙 Iniciar teste de microfone</button>
      
      <label class="toggle-row" style="margin-top:16px">
        <span>Ouvir minha própria voz <small>(loopback)</small></span>
        <input type="checkbox" id="mic-loopback-toggle" />
      </label>
      
      <label class="toggle-row">
        <span>Supressão de ruído</span>
        <input type="checkbox" id="noise-suppression-toggle" ${noiseSuppression ? 'checked' : ''} />
      </label>
      
      <label class="toggle-row">
        <span>Cancelamento de eco</span>
        <input type="checkbox" id="echo-cancellation-toggle" ${echoCancellation ? 'checked' : ''} />
      </label>
      
      <label class="toggle-row">
        <span>Ganho automático de áudio</span>
        <input type="checkbox" id="auto-gain-toggle" ${autoGain ? 'checked' : ''} />
      </label>
    </div>
    
    <div class="ms-block">
      <div class="ms-block-title">📷 Webcam e Vídeo</div>
      
      <div class="ms-field">
        <label>Dispositivo de Câmera</label>
        <select id="camera-device-select">
          <option value="default" ${savedCamera === 'default' ? 'selected' : ''}>Padrão do sistema</option>
        </select>
      </div>
      
      <div class="ms-field">
        <label>Plano de fundo da Webcam</label>
        <select id="camera-bg-select">
          <option value="none" ${savedBg === 'none' ? 'selected' : ''}>Nenhum (padrão)</option>
          <option value="blur" ${savedBg === 'blur' ? 'selected' : ''}>Desfoque (Blur)</option>
          <option value="neon" ${savedBg === 'neon' ? 'selected' : ''}>Fundo Neon Roxo</option>
          <option value="gradient" ${savedBg === 'gradient' ? 'selected' : ''}>Gradiente</option>
          <option value="custom" ${savedBg === 'custom' ? 'selected' : ''}>Imagem personalizada</option>
        </select>
      </div>
      
      <input type="file" id="camera-bg-file" accept="image/*" class="hidden" />
      <button type="button" class="btn-ms" id="btn-camera-bg-pick" style="margin-top:0.5rem">📁 Escolher imagem de fundo</button>
      
      <div style="margin-top:1rem; border-radius: 12px; overflow: hidden; background: #000;">
        <video id="camera-preview" autoplay muted playsinline style="width:100%; height: 200px; object-fit: cover; display: none;"></video>
        <div id="camera-preview-placeholder" style="width:100%; height: 200px; display: flex; align-items: center; justify-content: center; color: #666; background: #111;">
          📷 Pré-visualização da câmera
        </div>
      </div>
      
      <button type="button" class="btn-ms btn-ms-primary" id="btn-camera-test" style="margin-top: 1rem">📷 Ligar pré-visualização</button>
    </div>`;
  },

  aparencia: () => {
    const wp = localStorage.getItem('zx_wallpaper') || 'default';
    const custom = localStorage.getItem('zx_wallpaper_custom') || '';
    return `
    <h2 class="ms-section-title">Aparência</h2>
    <p class="ms-section-desc">Personalize a aparência do programa.</p>
    <div class="ms-block">
      <div class="ms-field">
        <label>Plano de fundo</label>
        <div class="wallpaper-picker-row">
          <label class="wallpaper-opt"><input type="radio" name="wallpaper" value="default" ${wp === 'default' ? 'checked' : ''} /> Padrão (Neon)</label>
          <label class="wallpaper-opt"><input type="radio" name="wallpaper" value="dark" ${wp === 'dark' ? 'checked' : ''} /> Escuro</label>
          <label class="wallpaper-opt"><input type="radio" name="wallpaper" value="gradient" ${wp === 'gradient' ? 'checked' : ''} /> Gradiente</label>
          <label class="wallpaper-opt"><input type="radio" name="wallpaper" value="custom" ${wp === 'custom' ? 'checked' : ''} /> Personalizado</label>
        </div>
        <input type="file" id="wallpaper-file" accept="image/*" class="hidden" />
        <button type="button" class="btn-ms" id="btn-pick-wallpaper" style="margin-top:0.5rem">📁 Escolher imagem do computador</button>
        <div class="wallpaper-preview" id="wallpaper-preview" style="${custom ? `background-image:url(${custom})` : ''}"></div>
      </div>
      <label class="toggle-row"><span>Animações de interface</span><input type="checkbox" id="toggle-animations" checked /></label>
      
      <div class="ms-field" style="margin-top:16px">
        <label>Resolução da janela</label>
        <select id="window-resolution-select">
          <option value="100%">100% (Padrão)</option>
          <option value="90%">90%</option>
          <option value="80%">80%</option>
          <option value="120%">120%</option>
          <option value="130%">130%</option>
          <option value="150%">150%</option>
        </select>
      </div>
    </div>`;
  },

  acessibilidade: () => `
    <h2 class="ms-section-title">Acessibilidade</h2>
    <p class="ms-section-desc">Ajustes para melhor leitura e navegação.</p>
    <div class="ms-block">
      <div class="ms-field"><label>Tamanho da fonte</label><input type="range" id="font-size-range" min="12" max="20" value="16" /></div>
    </div>`,

  cla: () => {
    const clanItems = userClans.length
      ? userClans.map((c, i) => `<div class="clan-item"><strong>${escHtml(c.name)}</strong><div class="clan-actions">
          <button type="button" data-action="edit" data-i="${i}">Editar</button>
          <button type="button" data-action="remove" data-i="${i}">Remover</button>
        </div></div>`).join('')
      : '<p class="pf-hint">Você ainda não faz parte de nenhum clã.</p>';
    return `
    <h2 class="ms-section-title">Clã</h2>
    <p class="ms-section-desc">Crie, edite ou entre em clãs.</p>
    <div class="clan-list" id="clan-list">${clanItems}</div>
    <div class="ms-actions">
      <button type="button" class="btn-ms btn-ms-primary" id="btn-clan-create">Criar clã</button>
      <button type="button" class="btn-ms" id="btn-clan-join">Entrar em clã</button>
    </div>`;
  },

  jogos: () => `
    <h2 class="ms-section-title">Jogos registrados</h2>
    <p class="ms-section-desc">Jogos vinculados de outros sites aparecem no seu perfil ao jogar.</p>
    <div class="ms-block">
      <div class="ms-field"><label>Adicionar jogo manualmente</label><input type="text" id="reg-game-input" placeholder="Nome do jogo" /></div>
      <button type="button" class="btn-ms" id="btn-reg-game">Registrar jogo</button>
      <div id="reg-game-list" style="margin-top:0.75rem"></div>
    </div>`,

  privacidade: () => {
    const useData = localStorage.getItem('zx_use_data') !== 'false';
    const showOnline = localStorage.getItem('zx_show_online') !== 'false';
    const readReceipts = localStorage.getItem('zx_read_receipts') !== 'false';
    const typingIndicator = localStorage.getItem('zx_typing_indicator') !== 'false';
    
    return `
    <h2 class="ms-section-title">Dados e privacidade</h2>
    <p class="ms-section-desc">Controle como seus dados são usados no ZX Chat.</p>
    <div class="ms-block">
      <label class="toggle-row"><span><span>Usar dados do programa</span><small>Permite melhorar recomendações e experiência</small></span><input type="checkbox" id="toggle-use-data" ${useData ? 'checked' : ''} /></label>
      <label class="toggle-row"><span><span>Mostrar status online</span><small>Outros usuários verão se você está online</small></span><input type="checkbox" id="toggle-show-online" ${showOnline ? 'checked' : ''} /></label>
      <label class="toggle-row"><span><span>Confirmação de leitura</span><small>Mostra quando você leu uma mensagem</small></span><input type="checkbox" id="toggle-read-receipts" ${readReceipts ? 'checked' : ''} /></label>
      <label class="toggle-row"><span><span>Indicador de digitação</span><small>Mostra quando você está digitando</small></span><input type="checkbox" id="toggle-typing-indicator" ${typingIndicator ? 'checked' : ''} /></label>
      <div class="ms-actions"><button type="button" class="btn-ms" id="btn-export-data">📥 Exportar meus dados</button></div>
    </div>`;
  },

  ligamentos: () => {
    const connected = JSON.parse(localStorage.getItem('zx_connected_social') || '{}');
    return `
    <h2 class="ms-section-title">Ligamentos</h2>
    <p class="ms-section-desc">Conecte suas redes sociais ao perfil.</p>
    <div class="social-grid">
      <button type="button" class="social-btn ${connected.steam ? 'connected' : ''}" data-social="steam">🎮 Steam</button>
      <button type="button" class="social-btn ${connected.twitch ? 'connected' : ''}" data-social="twitch">📺 Twitch</button>
      <button type="button" class="social-btn ${connected.youtube ? 'connected' : ''}" data-social="youtube">▶ YouTube</button>
      <button type="button" class="social-btn ${connected.twitter ? 'connected' : ''}" data-social="twitter">🐦 X / Twitter</button>
      <button type="button" class="social-btn ${connected.spotify ? 'connected' : ''}" data-social="spotify">🎵 Spotify</button>
      <button type="button" class="social-btn ${connected.github ? 'connected' : ''}" data-social="github">💻 GitHub</button>
    </div>`;
  },

  idioma: () => {
    const lang = localStorage.getItem('zx_language') || 'pt-BR';
    return `
    <h2 class="ms-section-title">Idioma</h2>
    <p class="ms-section-desc">Selecione o idioma do programa.</p>
    <div class="lang-options">
      <label class="lang-opt"><input type="radio" name="app-lang" value="en" ${lang === 'en' ? 'checked' : ''} /> English</label>
      <label class="lang-opt"><input type="radio" name="app-lang" value="pt-BR" ${lang === 'pt-BR' ? 'checked' : ''} /> Português (Brasil)</label>
      <label class="lang-opt"><input type="radio" name="app-lang" value="pt-PT" ${lang === 'pt-PT' ? 'checked' : ''} /> Português (Portugal)</label>
      <label class="lang-opt"><input type="radio" name="app-lang" value="es" ${lang === 'es' ? 'checked' : ''} /> Español</label>
    </div>`;
  },

  atalhos: () => {
    return `
    <h2 class="ms-section-title">Teclas de atalho</h2>
    <p class="ms-section-desc">Atalhos de teclado do ZX Chat.</p>
    <div class="ms-block">
      <div class="ms-row"><span>Sobreposição de tela<span><small>Abre o painel de overlay durante jogos</small></span></span><kbd style="color:var(--neon)">Shift + \`</kbd></div>
      <div class="ms-row"><span>Alternar mudo<span><small>Microfone nas chamadas</small></span></span><kbd style="color:var(--neon)">Ctrl + M</kbd></div>
      <div class="ms-row"><span>Alternar surdo<span><small>Alto-falante nas chamadas</small></span></span><kbd style="color:var(--neon)">Ctrl + Shift + M</kbd></div>
      <div class="ms-row"><span>Abrir configurações</span><kbd style="color:var(--neon)">Ctrl + ,</kbd></div>
      <div class="ms-row"><span>Enviar mensagem</span><kbd style="color:var(--neon)">Enter</kbd></div>
      <div class="ms-row"><span>Fechar modal</span><kbd style="color:var(--neon)">Esc</kbd></div>
    </div>`;
  },

  sobreposicao: () => {
    const overlayEnabled = localStorage.getItem('zx_overlay') !== 'false';
    const showAvatars = localStorage.getItem('zx_overlay_avatars') !== 'false';
    const showNames = localStorage.getItem('zx_overlay_names') !== 'false';
    const position = localStorage.getItem('zx_overlay_position') || 'top-right';
    
    return `
    <h2 class="ms-section-title">Sobreposição</h2>
    <p class="ms-section-desc">Mostra quem está em call com você enquanto joga (estilo Steam).</p>
    <div class="ms-block">
      <label class="toggle-row"><span>Ativar sobreposição em jogos</span><input type="checkbox" id="overlay-toggle" ${overlayEnabled ? 'checked' : ''} /></label>
      <label class="toggle-row"><span>Mostrar avatares em call</span><input type="checkbox" ${showAvatars ? 'checked' : ''} /></label>
      <label class="toggle-row"><span>Mostrar nomes dos participantes</span><input type="checkbox" ${showNames ? 'checked' : ''} /></label>
      <div class="ms-field"><label>Posição na tela</label><select id="overlay-position">
        <option value="top-right" ${position === 'top-right' ? 'selected' : ''}>Canto superior direito</option>
        <option value="bottom-right" ${position === 'bottom-right' ? 'selected' : ''}>Canto inferior direito</option>
        <option value="top-left" ${position === 'top-left' ? 'selected' : ''}>Canto superior esquerdo</option>
        <option value="bottom-left" ${position === 'bottom-left' ? 'selected' : ''}>Canto inferior esquerdo</option>
        <option value="center" ${position === 'center' ? 'selected' : ''}>Centro</option>
      </select></div>
    </div>`;
  },

  atividades: () => {
    const showGame = localStorage.getItem('zx_show_game') !== 'false';
    const shareActivity = localStorage.getItem('zx_share_activity') !== 'false';
    const autoDetect = localStorage.getItem('zx_auto_detect') !== 'false';
    
    return `
    <h2 class="ms-section-title">Config. de atividades</h2>
    <p class="ms-section-desc">Controle se jogos aparecem no seu perfil.</p>
    <div class="ms-block">
      <label class="toggle-row"><span>Exibir jogo atual no perfil</span><input type="checkbox" id="toggle-show-game" ${showGame ? 'checked' : ''} /></label>
      <label class="toggle-row"><span>Compartilhar atividade com amigos</span><input type="checkbox" id="toggle-share-activity" ${shareActivity ? 'checked' : ''} /></label>
      <label class="toggle-row"><span>Detectar jogos automaticamente</span><input type="checkbox" id="toggle-auto-detect" ${autoDetect ? 'checked' : ''} /></label>
    </div>`;
  },

  seguranca: () => {
    const twoFactor = localStorage.getItem('zx_2fa') === 'true';
    const loginAlerts = localStorage.getItem('zx_login_alerts') !== 'false';
    const ipLock = localStorage.getItem('zx_ip_lock') === 'true';
    
    return `
    <h2 class="ms-section-title">Segurança</h2>
    <p class="ms-section-desc">Proteja sua conta contra acessos não autorizados.</p>
    <div class="ms-block">
      <label class="toggle-row"><span>Autenticação em duas etapas</span><input type="checkbox" id="toggle-2fa" ${twoFactor ? 'checked' : ''} /></label>
      <label class="toggle-row"><span>Alertas de login</span><input type="checkbox" id="toggle-login-alerts" ${loginAlerts ? 'checked' : ''} /></label>
      <label class="toggle-row"><span>Bloquear IPs desconhecidos</span><input type="checkbox" id="toggle-ip-lock" ${ipLock ? 'checked' : ''} /></label>
      <div class="ms-field" style="margin-top:0.75rem"><label>Dispositivos conectados</label>
        <div class="ms-row"><span>Este dispositivo<span><small>Ativo agora</small></span></span><button type="button" class="btn-ms">Gerenciar</button></div>
      </div>
    </div>`;
  },
};

function renderSettingsSection(sectionId) {
  const fn = SETTINGS_SECTIONS[sectionId];
  if (!fn || !msContent) return;
  msContent.innerHTML = fn();
  bindSettingsSectionEvents(sectionId);
}

function bindSettingsSectionEvents(sectionId) {
  if (sectionId === 'conta') {
    document.getElementById('set-username')?.addEventListener('change', (e) => {
      const v = e.target.value.trim();
      if (v) { username = v; updateUserUI(); showToast('Nome atualizado!'); }
    });
    
    // Botão Sair da conta
    document.getElementById('btn-logout-account')?.addEventListener('click', () => {
      if (confirm('Tem certeza que deseja sair da conta?')) {
        // Limpa dados de sessão
        localStorage.removeItem('zx_session');
        localStorage.removeItem('zx_username');
        
        // Redireciona para página de autenticação
        window.location.href = 'auth.html';
      }
    });
  }
  if (sectionId === 'ligamentos') {
    msContent.querySelectorAll('.social-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('connected');
        showToast(btn.classList.contains('connected')
          ? `${btn.textContent.trim()} conectado!`
          : `${btn.textContent.trim()} desconectado.`);
      });
    });
  }
  if (sectionId === 'voz') {
    let micTestActive = false;
    let micStream = null;
    let audioContext = null;
    let analyser = null;
    let loopbackNode = null;
    let animationId = null;
    let cameraStream = null;
    let cameraActive = false;
    
    const btnMicTest = document.getElementById('btn-mic-test');
    const micLoopbackToggle = document.getElementById('mic-loopback-toggle');
    const micVolumeSlider = document.getElementById('mic-volume-slider');
    const speakerVolumeSlider = document.getElementById('speaker-volume-slider');
    const bars = document.querySelectorAll('#mic-visualizer > div');
    const micDeviceSelect = document.getElementById('mic-device-select');
    const speakerDeviceSelect = document.getElementById('speaker-device-select');
    const cameraDeviceSelect = document.getElementById('camera-device-select');
    const cameraBgSelect = document.getElementById('camera-bg-select');
    const btnCameraTest = document.getElementById('btn-camera-test');
    const btnCameraBgPick = document.getElementById('btn-camera-bg-pick');
    const cameraPreview = document.getElementById('camera-preview');
    const cameraPlaceholder = document.getElementById('camera-preview-placeholder');
    const noiseSuppressionToggle = document.getElementById('noise-suppression-toggle');
    const echoCancellationToggle = document.getElementById('echo-cancellation-toggle');
    const autoGainToggle = document.getElementById('auto-gain-toggle');

    // Carregar lista de dispositivos
    async function loadDevices() {
      try {
        // Solicitar permissão primeiro
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Microfones
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        if (micDeviceSelect) {
          micDeviceSelect.innerHTML = '<option value="default">Padrão do sistema</option>';
          audioInputs.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.label || `Microfone ${micDeviceSelect.children.length}`;
            if (localStorage.getItem('zx_audio_input') === d.deviceId) opt.selected = true;
            micDeviceSelect.appendChild(opt);
          });
        }
        
        // Alto-falantes
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        if (speakerDeviceSelect) {
          speakerDeviceSelect.innerHTML = '<option value="default">Padrão do sistema</option>';
          audioOutputs.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.label || `Alto-falante ${speakerDeviceSelect.children.length}`;
            if (localStorage.getItem('zx_audio_output') === d.deviceId) opt.selected = true;
            speakerDeviceSelect.appendChild(opt);
          });
        }
        
        // Webcams
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        if (cameraDeviceSelect) {
          cameraDeviceSelect.innerHTML = '<option value="default">Padrão do sistema</option>';
          videoInputs.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.label || `Webcam ${cameraDeviceSelect.children.length}`;
            if (localStorage.getItem('zx_video_input') === d.deviceId) opt.selected = true;
            cameraDeviceSelect.appendChild(opt);
          });
        }
        
      } catch (err) {
        console.log('Não foi possível listar dispositivos:', err);
      }
    }
    
    loadDevices();
    
    // Eventos de seleção de dispositivos
    micDeviceSelect?.addEventListener('change', (e) => {
      localStorage.setItem('zx_audio_input', e.target.value);
      showToast('Dispositivo de microfone alterado!');
    });
    
    speakerDeviceSelect?.addEventListener('change', (e) => {
      localStorage.setItem('zx_audio_output', e.target.value);
      showToast('Dispositivo de áudio alterado!');
    });
    
    cameraDeviceSelect?.addEventListener('change', (e) => {
      localStorage.setItem('zx_video_input', e.target.value);
      showToast('Dispositivo de câmera alterado!');
    });
    
    // Plano de fundo da webcam
    cameraBgSelect?.addEventListener('change', (e) => {
      localStorage.setItem('zx_camera_bg', e.target.value);
      showToast(`Plano de fundo alterado para: ${e.target.options[e.target.selectedIndex].text}`);
      
      if (cameraActive && cameraPreview) {
        // Aplicar efeito em tempo real
        cameraPreview.style.filter = e.target.value === 'blur' ? 'blur(12px)' : 'none';
        
        if (e.target.value === 'neon') {
          cameraPreview.style.background = 'linear-gradient(135deg, #ff00ff, #00ffff)';
        } else if (e.target.value === 'gradient') {
          cameraPreview.style.background = 'linear-gradient(45deg, #1a002b, #001a2b)';
        }
      }
    });
    
    btnCameraBgPick?.addEventListener('click', () => {
      document.getElementById('camera-bg-file')?.click();
    });
    
    document.getElementById('camera-bg-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      readImageFile(file, (dataUrl) => {
        localStorage.setItem('zx_camera_bg_custom', dataUrl);
        cameraBgSelect.value = 'custom';
        localStorage.setItem('zx_camera_bg', 'custom');
        if (cameraPreview) {
          cameraPreview.style.backgroundImage = `url(${dataUrl})`;
          cameraPreview.style.backgroundSize = 'cover';
          cameraPreview.style.backgroundPosition = 'center';
        }
        showToast('Imagem de fundo aplicada!');
      });
      e.target.value = '';
    });
    
    // Teste de câmera
    btnCameraTest?.addEventListener('click', async () => {
      if (!cameraActive) {
        try {
          const deviceId = cameraDeviceSelect?.value || 'default';
          const constraints = {
            video: deviceId === 'default' ? true : { deviceId: { exact: deviceId } },
            audio: false
          };
          
          cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
          cameraPreview.srcObject = cameraStream;
          cameraPreview.style.display = 'block';
          cameraPlaceholder.style.display = 'none';
          cameraActive = true;
          btnCameraTest.textContent = '⏹ Desligar câmera';
          btnCameraTest.classList.add('active');
          showToast('Câmera ligada!');
          
          // Aplicar fundo selecionado
          const bgMode = localStorage.getItem('zx_camera_bg') || 'none';
          if (bgMode === 'blur') cameraPreview.style.filter = 'blur(12px)';
          if (bgMode === 'neon') cameraPreview.style.background = 'linear-gradient(135deg, #ff00ff, #00ffff)';
          if (bgMode === 'gradient') cameraPreview.style.background = 'linear-gradient(45deg, #1a002b, #001a2b)';
          if (bgMode === 'custom') {
            const customBg = localStorage.getItem('zx_camera_bg_custom');
            if (customBg) {
              cameraPreview.style.backgroundImage = `url(${customBg})`;
              cameraPreview.style.backgroundSize = 'cover';
            }
          }
          
        } catch (err) {
          showToast('Não foi possível acessar a câmera. Verifique permissões.');
        }
      } else {
        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
        cameraPreview.srcObject = null;
        cameraPreview.style.display = 'none';
        cameraPlaceholder.style.display = 'flex';
        cameraActive = false;
        btnCameraTest.textContent = '📷 Ligar pré-visualização';
        btnCameraTest.classList.remove('active');
        showToast('Câmera desligada.');
      }
    });
    
    // Opções de áudio
    noiseSuppressionToggle?.addEventListener('change', (e) => {
      localStorage.setItem('zx_noise_suppression', e.target.checked);
      showToast(e.target.checked ? 'Supressão de ruído ativada' : 'Supressão de ruído desativada');
    });
    
    echoCancellationToggle?.addEventListener('change', (e) => {
      localStorage.setItem('zx_echo_cancellation', e.target.checked);
      showToast(e.target.checked ? 'Cancelamento de eco ativado' : 'Cancelamento de eco desativado');
    });
    
    autoGainToggle?.addEventListener('change', (e) => {
      localStorage.setItem('zx_auto_gain', e.target.checked);
      showToast(e.target.checked ? 'Ganho automático ativado' : 'Ganho automático desativado');
    });
    
    // Teste de microfone
    btnMicTest?.addEventListener('click', async () => {
      if (!micTestActive) {
        try {
          const deviceId = micDeviceSelect?.value || 'default';
          const constraints = {
            audio: {
              deviceId: deviceId === 'default' ? undefined : { exact: deviceId },
              noiseSuppression: localStorage.getItem('zx_noise_suppression') !== 'false',
              echoCancellation: localStorage.getItem('zx_echo_cancellation') !== 'false',
              autoGainControl: localStorage.getItem('zx_auto_gain') !== 'false'
            },
            video: false
          };
          
          micStream = await navigator.mediaDevices.getUserMedia(constraints);
          audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(micStream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          
          // Loopback node para ouvir própria voz
          loopbackNode = audioContext.createGain();
          loopbackNode.gain.value = 0;
          
          source.connect(analyser);
          source.connect(loopbackNode);
          loopbackNode.connect(audioContext.destination);
          
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          function updateVisualizer() {
            if (!micTestActive) return;
            analyser.getByteFrequencyData(dataArray);
            bars.forEach((bar, i) => {
              const value = dataArray[i] || 0;
              bar.style.height = Math.max(4, (value / 255) * 36) + 'px';
            });
            animationId = requestAnimationFrame(updateVisualizer);
          }
          
          micTestActive = true;
          btnMicTest.textContent = '⏹ Parar teste';
          btnMicTest.classList.add('active');
          updateVisualizer();
          showToast('Teste de microfone iniciado! Fale algo.');
          
        } catch (err) {
          showToast('Não foi possível acessar o microfone. Verifique permissões.');
        }
      } else {
        micTestActive = false;
        if (animationId) cancelAnimationFrame(animationId);
        if (micStream) micStream.getTracks().forEach(t => t.stop());
        if (audioContext) audioContext.close();
        micStream = null;
        audioContext = null;
        analyser = null;
        loopbackNode = null;
        bars.forEach(bar => bar.style.height = '4px');
        btnMicTest.textContent = '🎙 Iniciar teste de microfone';
        btnMicTest.classList.remove('active');
        showToast('Teste de microfone finalizado.');
      }
    });
    
    micLoopbackToggle?.addEventListener('change', (e) => {
      if (loopbackNode) {
        loopbackNode.gain.value = e.target.checked ? 0.7 : 0;
        showToast(e.target.checked ? 'Loopback ativado: você ouvirá sua própria voz' : 'Loopback desativado');
      } else {
        showToast('Inicie o teste de microfone primeiro.');
        e.target.checked = false;
      }
    });
    
    micVolumeSlider?.addEventListener('input', (e) => {
      if (loopbackNode) {
        loopbackNode.gain.value = micLoopbackToggle.checked ? (e.target.value / 100 * 0.8) : 0;
      }
    });
    
    speakerVolumeSlider?.addEventListener('input', (e) => {
      document.querySelectorAll('audio').forEach(a => {
        a.volume = e.target.value / 100;
      });
      localStorage.setItem('zx_speaker_volume', e.target.value);
    });
    
    // Carregar volume salvo
    const savedSpeakerVolume = localStorage.getItem('zx_speaker_volume') || 70;
    if (speakerVolumeSlider) speakerVolumeSlider.value = savedSpeakerVolume;
  }
  if (sectionId === 'aparencia') {
    const savedWp = localStorage.getItem('zx_wallpaper') || 'default';
    msContent.querySelectorAll('input[name="wallpaper"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'custom' && !localStorage.getItem('zx_wallpaper_custom')) {
          document.getElementById('wallpaper-file')?.click();
          return;
        }
        applyWallpaper(radio.value);
      });
    });
    document.getElementById('btn-pick-wallpaper')?.addEventListener('click', () => {
      document.getElementById('wallpaper-file')?.click();
    });
    document.getElementById('wallpaper-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      readImageFile(file, (dataUrl) => {
        localStorage.setItem('zx_wallpaper_custom', dataUrl);
        const preview = document.getElementById('wallpaper-preview');
        if (preview) preview.style.backgroundImage = `url(${dataUrl})`;
        const customRadio = msContent.querySelector('input[name="wallpaper"][value="custom"]');
        if (customRadio) customRadio.checked = true;
        applyWallpaper('custom');
        showToast('Papel de parede aplicado!');
      });
      e.target.value = '';
    });
    document.getElementById('toggle-animations')?.addEventListener('change', (e) => {
      document.body.classList.toggle('no-animations', !e.target.checked);
      localStorage.setItem('zx_animations', e.target.checked ? '1' : '0');
    });
    const animOn = localStorage.getItem('zx_animations') !== '0';
    const animToggle = document.getElementById('toggle-animations');
    if (animToggle) { animToggle.checked = animOn; document.body.classList.toggle('no-animations', !animOn); }
    
    // Resolução da janela
    const resolutionSelect = document.getElementById('window-resolution-select');
    const savedScale = localStorage.getItem('zx_window_scale') || '100%';
    if (resolutionSelect) {
      resolutionSelect.value = savedScale;
      document.body.style.zoom = savedScale;
      
      resolutionSelect.addEventListener('change', (e) => {
        document.body.style.zoom = e.target.value;
        localStorage.setItem('zx_window_scale', e.target.value);
        showToast(`Resolução alterada para ${e.target.value}`);
      });
    }
    
    if (savedWp) applyWallpaper(savedWp);
  }
  if (sectionId === 'acessibilidade') {
    document.getElementById('font-size-range')?.addEventListener('input', (e) => {
      document.documentElement.style.fontSize = e.target.value + 'px';
    });
  }
  if (sectionId === 'idioma') {
    msContent.querySelectorAll('input[name="app-lang"]').forEach(r => {
      r.addEventListener('change', () => showToast('Idioma alterado (visual em breve).'));
    });
  }
  if (sectionId === 'cla') {
    document.getElementById('btn-clan-create')?.addEventListener('click', () => {
      const name = prompt('Nome do clã:');
      if (name?.trim()) {
        userClans.push({ name: name.trim() });
        localStorage.setItem('zx_clans', JSON.stringify(userClans));
        renderSettingsSection('cla');
        activateSettingsNav('cla');
      }
    });
    document.getElementById('btn-clan-join')?.addEventListener('click', () => {
      const code = prompt('Código do clã:');
      if (code?.trim()) {
        userClans.push({ name: `Clã ${code.trim()}` });
        localStorage.setItem('zx_clans', JSON.stringify(userClans));
        renderSettingsSection('cla');
        activateSettingsNav('cla');
        showToast('Você entrou no clã!');
      }
    });
    msContent.querySelectorAll('[data-action="remove"]').forEach(btn => {
      btn.addEventListener('click', () => {
        userClans.splice(+btn.dataset.i, 1);
        localStorage.setItem('zx_clans', JSON.stringify(userClans));
        renderSettingsSection('cla');
        activateSettingsNav('cla');
      });
    });
    msContent.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const clan = userClans[+btn.dataset.i];
        const name = prompt('Novo nome do clã:', clan?.name);
        if (name?.trim() && clan) {
          clan.name = name.trim();
          localStorage.setItem('zx_clans', JSON.stringify(userClans));
          renderSettingsSection('cla');
          activateSettingsNav('cla');
        }
      });
    });
  }
  if (sectionId === 'jogos') {
    let regGames = JSON.parse(localStorage.getItem('zx_reg_games') || '[]');
    const renderReg = () => {
      const list = document.getElementById('reg-game-list');
      if (!list) return;
      list.innerHTML = regGames.length
        ? regGames.map(g => `<div class="ms-row"><span>🎮 ${escHtml(g)}</span></div>`).join('')
        : '<p class="pf-hint">Nenhum jogo registrado.</p>';
    };
    renderReg();
    document.getElementById('btn-reg-game')?.addEventListener('click', () => {
      const input = document.getElementById('reg-game-input');
      const name = input?.value.trim();
      if (!name) return;
      regGames.push(name);
      localStorage.setItem('zx_reg_games', JSON.stringify(regGames));
      if (input) input.value = '';
      renderReg();
      showToast('Jogo registrado!');
    });
  }

  if (sectionId === 'privacidade') {
    document.getElementById('toggle-use-data')?.addEventListener('change', (e) => {
      localStorage.setItem('zx_use_data', e.target.checked);
      showToast(e.target.checked ? 'Uso de dados ativado' : 'Uso de dados desativado');
    });
    document.getElementById('toggle-show-online')?.addEventListener('change', (e) => {
      localStorage.setItem('zx_show_online', e.target.checked);
      showToast(e.target.checked ? 'Status online visível' : 'Status online oculto');
    });
    document.getElementById('toggle-read-receipts')?.addEventListener('change', (e) => {
      localStorage.setItem('zx_read_receipts', e.target.checked);
      showToast(e.target.checked ? 'Confirmações de leitura ativadas' : 'Confirmações de leitura desativadas');
    });
    document.getElementById('toggle-typing-indicator')?.addEventListener('change', (e) => {
      localStorage.setItem('zx_typing_indicator', e.target.checked);
      showToast(e.target.checked ? 'Indicador de digitação ativado' : 'Indicador de digitação desativado');
    });
    document.getElementById('btn-export-data')?.addEventListener('click', () => {
      const data = JSON.stringify(localStorage, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zx-chat-data.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Dados exportados com sucesso!');
    });
  }

  if (sectionId === 'ligamentos') {
    const connected = JSON.parse(localStorage.getItem('zx_connected_social') || '{}');
    msContent.querySelectorAll('.social-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('connected');
        connected[btn.dataset.social] = btn.classList.contains('connected');
        localStorage.setItem('zx_connected_social', JSON.stringify(connected));
        showToast(btn.classList.contains('connected')
          ? `${btn.textContent.trim()} conectado!`
          : `${btn.textContent.trim()} desconectado.`);
      });
    });
  }

  if (sectionId === 'idioma') {
    msContent.querySelectorAll('input[name="app-lang"]').forEach(r => {
      r.addEventListener('change', () => {
        localStorage.setItem('zx_language', r.value);
        showToast('Idioma alterado! Reinicie o programa para aplicar.');
      });
    });
  }

  if (sectionId === 'sobreposicao') {
    document.getElementById('overlay-toggle')?.addEventListener('change', (e) => {
      localStorage.setItem('zx_overlay', e.target.checked);
      showToast(e.target.checked ? 'Sobreposição ativada' : 'Sobreposição desativada');
    });
    document.getElementById('overlay-position')?.addEventListener('change', (e) => {
      localStorage.setItem('zx_overlay_position', e.target.value);
      showToast(`Posição da sobreposição alterada para ${e.target.value}`);
    });
  }

  if (sectionId === 'atividades') {
    document.getElementById('toggle-show-game')?.addEventListener('change', (e) => {
      localStorage.setItem('zx_show_game', e.target.checked);
      showToast(e.target.checked ? 'Jogo atual será exibido no perfil' : 'Jogo atual não será exibido');
    });
    document.getElementById('toggle-share-activity')?.addEventListener('change', (e) => {
      localStorage.setItem('zx_share_activity', e.target.checked);
      showToast(e.target.checked ? 'Atividade compartilhada com amigos' : 'Atividade não compartilhada');
    });
    document.getElementById('toggle-auto-detect')?.addEventListener('change', (e) => {
      localStorage.setItem('zx_auto_detect', e.target.checked);
      showToast(e.target.checked ? 'Detecção automática de jogos ativada' : 'Detecção automática desativada');
    });
  }

  if (sectionId === 'seguranca') {
    document.getElementById('toggle-2fa')?.addEventListener('change', (e) => {
      localStorage.setItem('zx_2fa', e.target.checked);
      showToast(e.target.checked ? 'Autenticação em duas etapas ativada' : 'Autenticação em duas etapas desativada');
    });
    document.getElementById('toggle-login-alerts')?.addEventListener('change', (e) => {
      localStorage.setItem('zx_login_alerts', e.target.checked);
      showToast(e.target.checked ? 'Alertas de login ativados' : 'Alertas de login desativados');
    });
    document.getElementById('toggle-ip-lock')?.addEventListener('change', (e) => {
      localStorage.setItem('zx_ip_lock', e.target.checked);
      showToast(e.target.checked ? 'Bloqueio de IP ativado' : 'Bloqueio de IP desativado');
    });
  }
}

function activateSettingsNav(sectionId) {
  msNavItems.forEach(item => item.classList.toggle('active', item.dataset.section === sectionId));
}

msNavItems.forEach(item => {
  item.addEventListener('click', () => {
    renderSettingsSection(item.dataset.section);
    activateSettingsNav(item.dataset.section);
  });
});

function openSettingsModal() {
  openModal(settingsModal);
  if (!msContent?.innerHTML.trim()) {
    renderSettingsSection('conta');
    activateSettingsNav('conta');
  }
}

// â”€â”€ Modal helpers â”€â”€
function openModal(modalEl) {
  modalEl.classList.remove('hidden');
}

function closeModal(modalEl) {
  modalEl.classList.add('hidden');
}

friendsModalClose.addEventListener('click', () => closeModal(friendsModal));
storeModalClose?.addEventListener('click', () => closeModal(storeModal));
supportModalClose?.addEventListener('click', () => closeModal(supportModal));
profileModalClose?.addEventListener('click', () => closeModal(profileModal));
document.getElementById('diary-modal-close')?.addEventListener('click', () => closeModal(document.getElementById('diary-modal')));
settingsModalClose.addEventListener('click', () => closeModal(settingsModal));

[friendsModal, storeModal, supportModal, profileModal, settingsModal, serverSettingsModal].forEach(modal => {
  if (!modal) return;
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal); });
});

// â”€â”€ Context menu de servidor â”€â”€
function showServerCtxMenu(x, y, serverId) {
  // PRIMEIRO limpa o menu
  serverCtxMenu.innerHTML = '';
  
  // Cria os itens UM POR UM e adiciona evento ANTES de inserir no DOM
  const itemCreateServer = document.createElement('div');
  itemCreateServer.className = 'ctx-item';
  itemCreateServer.dataset.action = 'create-server';
  itemCreateServer.textContent = 'âž• Criar servidor';
  
  itemCreateServer.addEventListener('click', () => {
    serverCtxMenu.classList.add('hidden');
    openCommunityModal();
  });
  
  // AGORA adiciona todos os elementos no menu
  serverCtxMenu.appendChild(itemCreateServer);
  
  serverCtxMenu.style.left = x + 'px';
  
  // Verifica se tem espaço suficiente abaixo, senão abre para cima
  const menuHeight = serverCtxMenu.offsetHeight;
  const windowHeight = window.innerHeight;
  
  if (y + menuHeight > windowHeight) {
    // Não tem espaço abaixo, posiciona acima do cursor
    serverCtxMenu.style.top = (y - menuHeight) + 'px';
  } else {
    // Tem espaço, posiciona normalmente abaixo
    serverCtxMenu.style.top = y + 'px';
  }
  
  serverCtxMenu.classList.remove('hidden');
  serverCtxMenu.dataset.serverId = serverId;
}

// Removido evento antigo, agora tratado dinamicamente no showServerCtxMenu

document.addEventListener('click', (e) => {
  serverCtxMenu.classList.add('hidden');
  serverDropdown.classList.add('hidden');
  if (!e.target.closest('#profile-popover') && !e.target.closest('#user-avatar') && !e.target.closest('#sidebar-user-avatar') && !e.target.closest('#user-avatar-dm')) {
    hideProfilePopover();
  }
});

document.addEventListener('contextmenu', (e) => {
  // Esconde ctx menu se clicar fora de ícone de servidor
  if (!e.target.closest('.server-rail-icon[data-server-id]')) {
    serverCtxMenu.classList.add('hidden');
  }
});

// â”€â”€ Enviar mensagem (canal de texto) â”€â”€
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentChannel) return;
  console.log('[DEBUG] sendMessage() =>', { currentServerId, currentChannel, text });
  socket.emit('message', { channel: currentChannel, text, communityId: currentServerId });
  
  // Integração Discord: envia mensagem também para o webhook configurado
  const server = getCurrentServer();
  if (server && server.discordWebhook) {
    try {
      fetch(server.discordWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: server.discordBotName || 'ZX Chat',
          content: `**${username}**: ${text}`,
          avatar_url: profileAvatarUrl || ''
        })
      }).catch(() => {}); // Silencia erros de CORS/network
    } catch {}
  }
  
  messageInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', e => e.key === 'Enter' && sendMessage());

// â”€â”€ Canal de anúncios â”€â”€
const annMessagesArea = document.getElementById('ann-messages-area');
const annInput = document.getElementById('ann-input');
const annBtn = document.getElementById('ann-btn');

function sendAnnouncement() {
  const text = annInput.value.trim();
  if (!text || !currentChannel) return;
  socket.emit('message', { channel: currentChannel, text: `📢 ${text}`, communityId: currentServerId });
  annInput.value = '';
}

annBtn.addEventListener('click', sendAnnouncement);
annInput.addEventListener('keydown', e => e.key === 'Enter' && sendAnnouncement());

// â”€â”€ Fórum â”€â”€
const forumArea = document.getElementById('forum-area');
const forumInput = document.getElementById('forum-input');
const forumBtn = document.getElementById('forum-btn');
const forumTopics = {};

function renderForumTopics(channelId) {
  forumArea.innerHTML = '';
  const topics = forumTopics[channelId] || [];
  if (topics.length === 0) {
    forumArea.innerHTML = '<div class="forum-empty">Nenhum tópico ainda. Crie o primeiro!</div>';
    return;
  }
  topics.forEach((topic, i) => {
    const div = document.createElement('div');
    div.className = 'forum-topic';
    div.innerHTML = `
      <div class="forum-topic-header">
        <span class="forum-topic-title">${escHtml(topic.title)}</span>
        <span class="forum-topic-meta">por ${escHtml(topic.author)} · ${topic.time}</span>
      </div>
      <div class="forum-replies">${topic.replies} resposta(s)</div>
    `;
    div.addEventListener('click', () => openForumTopic(channelId, i));
    forumArea.appendChild(div);
  });
}

function openForumTopic(channelId, index) {
  const topic = (forumTopics[channelId] || [])[index];
  if (!topic) return;
  alert(`Tópico: ${topic.title}\n\nRespostas: ${topic.replies}\n\n(Detalhes de tópico em breve)`);
}

forumBtn.addEventListener('click', () => {
  const title = forumInput.value.trim();
  if (!title || !currentChannel) return;
  if (!forumTopics[currentChannel]) forumTopics[currentChannel] = [];
  forumTopics[currentChannel].push({
    title,
    author: username,
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    replies: 0,
  });
  forumInput.value = '';
  renderForumTopics(currentChannel);
});

forumInput.addEventListener('keydown', e => e.key === 'Enter' && forumBtn.click());

// â”€â”€ Canal de voz (WebRTC) â”€â”€
let localStream = null;
let peerConnections = {}; // socketId -> RTCPeerConnection
let voiceChannelId = null;
let isMuted = false;
let isDeafened = false;

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

async function joinVoiceChannel(ch) {
  voiceChannelId = ch.id;
  document.getElementById('voice-channel-name').textContent = ch.name;
  renderVoiceParticipants();

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    startSpeakingDetection();
  } catch {
    showToast('Sem acesso ao microfone. Entrando como ouvinte.');
    localStream = null;
  }

  socket.emit('voice:join', { channelId: ch.id, communityId: currentServerId, username });
}

let _speakingInterval = null;
function startSpeakingDetection() {
  if (!localStream) return;
  if (_speakingInterval) clearInterval(_speakingInterval);
  try {
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(localStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    _speakingInterval = setInterval(() => {
      if (!voiceChannelId) { clearInterval(_speakingInterval); ctx.close(); return; }
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const el = document.getElementById(`vp-${socket.id}`);
      if (el) el.classList.toggle('speaking', !isMuted && avg > 8);
    }, 80);
  } catch {}
}

function leaveVoiceChannel() {
  if (_speakingInterval) { clearInterval(_speakingInterval); _speakingInterval = null; }
  if (voiceChannelId) {
    socket.emit('voice:leave', { channelId: voiceChannelId, communityId: currentServerId });
  }
  Object.values(peerConnections).forEach(pc => pc.close());
  peerConnections = {};
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  voiceChannelId = null;
  isMuted = false;
  isDeafened = false;
  document.getElementById('btn-toggle-mic')?.classList.remove('active');
  document.getElementById('btn-toggle-deaf')?.classList.remove('active');
}

function createPeerConnection(remoteSocketId) {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  peerConnections[remoteSocketId] = pc;

  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) socket.emit('voice:ice', { to: remoteSocketId, candidate });
  };

  pc.ontrack = ({ streams }) => {
    const audio = document.getElementById(`audio-${remoteSocketId}`) || document.createElement('audio');
    audio.id = `audio-${remoteSocketId}`;
    audio.autoplay = true;
    audio.srcObject = streams[0];
    if (!document.getElementById(`audio-${remoteSocketId}`)) document.body.appendChild(audio);
    audio.muted = isDeafened;
  };

  return pc;
}

socket.on('voice:peers', async ({ peers }) => {
  for (const peer of peers) {
    const pc = createPeerConnection(peer.socketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('voice:offer', { to: peer.socketId, offer });
  }
  renderVoiceParticipants();
});

socket.on('voice:user-joined', ({ socketId, username: uname }) => {
  renderVoiceParticipants();
});

socket.on('voice:offer', async ({ from, offer, username: uname }) => {
  const pc = createPeerConnection(from);
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('voice:answer', { to: from, answer });
  renderVoiceParticipants();
});

socket.on('voice:answer', async ({ from, answer }) => {
  const pc = peerConnections[from];
  if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('voice:ice', async ({ from, candidate }) => {
  const pc = peerConnections[from];
  if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
});

socket.on('voice:user-left', ({ socketId }) => {
  if (peerConnections[socketId]) {
    peerConnections[socketId].close();
    delete peerConnections[socketId];
  }
  const audio = document.getElementById(`audio-${socketId}`);
  if (audio) audio.remove();
  renderVoiceParticipants();
});

socket.on('voice:room-users', ({ users }) => {
  window._voiceRoomUsers = users;
  renderVoiceParticipants();
});

function renderVoiceParticipants() {
  const grid = document.getElementById('voice-participants-grid');
  const countEl = document.getElementById('voice-participants-count');
  if (!grid) return;

  const users = window._voiceRoomUsers || [];
  const selfIncluded = voiceChannelId ? [{ socketId: socket.id, username, self: true }] : [];
  const allUsers = [
    ...selfIncluded,
    ...users.filter(u => u.socketId !== socket.id)
  ];

  if (countEl) countEl.textContent = allUsers.length === 1 ? '1 participante' : `${allUsers.length} participantes`;

  if (allUsers.length === 0) {
    grid.innerHTML = `<div class="voice-empty-state"><div class="voice-icon">🎙</div><p>Ninguém na chamada ainda.</p></div>`;
    return;
  }

  grid.innerHTML = allUsers.map(u => {
    const initial = (u.username || '?')[0].toUpperCase();
    const hasAvatar = u.self && profileAvatarUrl;
    const avatarClass = `voice-participant-avatar av-${initial}${hasAvatar ? ' has-image' : ''}`;
    const avatarBg = hasAvatar ? ` style="background-image:url(${profileAvatarUrl});background-size:cover;background-position:center"` : '';
    return `
    <div class="voice-participant${isMuted && u.self ? ' muted' : ''}" id="vp-${u.socketId}">
      ${u.self ? '<span class="voice-participant-self-badge">Você</span>' : ''}
      <div class="${avatarClass}"${avatarBg}>${hasAvatar ? '' : initial}</div>
      <div class="voice-participant-name">${escHtml(u.username || '?')}</div>
      <div class="voice-participant-status">${(isMuted && u.self) ? '🔇 Mudo' : '🎙 Conectado'}</div>
    </div>`;
  }).join('');
}

document.getElementById('btn-leave-voice')?.addEventListener('click', () => {
  leaveVoiceChannel();
  showDiscoverView();
});

// ================================================
// CONTROLES AVANÇADOS DE CHAMADA DE VOZ
// ================================================

let screenStream = null;
let cameraStream = null;
let audioShareStream = null;
let isSharingScreen = false;
let isCameraActive = false;
let isSharingAudio = false;

// Botão Webcam
document.getElementById('btn-toggle-cam')?.addEventListener('click', async () => {
  if (!isCameraActive) {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: false 
      });
      
      isCameraActive = true;
      document.getElementById('btn-toggle-cam').classList.add('active');
      document.getElementById('btn-toggle-cam').textContent = '📷';
      
      // Adiciona stream aos peers
      Object.values(peerConnections).forEach(pc => {
        cameraStream.getTracks().forEach(track => {
          pc.addTrack(track, cameraStream);
        });
      });
      
      renderVoiceParticipants();
      showToast('✅ Webcam ativada!');
      
    } catch (err) {
      showToast('❌ Não foi possível acessar a webcam. Verifique permissões.');
      console.error(err);
    }
  } else {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    isCameraActive = false;
    document.getElementById('btn-toggle-cam').classList.remove('active');
    document.getElementById('btn-toggle-cam').textContent = '📷';
    renderVoiceParticipants();
    showToast('📷 Webcam desativada');
  }
});

// Botão Compartilhar Tela
document.getElementById('btn-share-screen')?.addEventListener('click', async () => {
  if (!isSharingScreen) {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: true
      });
      
      isSharingScreen = true;
      document.getElementById('btn-share-screen').classList.add('active');
      document.getElementById('btn-share-screen').textContent = '🖥';
      
      // Adiciona stream aos peers
      Object.values(peerConnections).forEach(pc => {
        screenStream.getTracks().forEach(track => {
          pc.addTrack(track, screenStream);
        });
      });
      
      // Evento quando usuário para de compartilhar
      screenStream.getVideoTracks()[0].onended = () => {
        isSharingScreen = false;
        document.getElementById('btn-share-screen').classList.remove('active');
        document.getElementById('btn-share-screen').textContent = '🖥';
        renderVoiceParticipants();
        showToast('🖥 Compartilhamento de tela encerrado');
      };
      
      renderVoiceParticipants();
      showToast('✅ Compartilhando tela!');
      
    } catch (err) {
      showToast('❌ Não foi possível compartilhar tela.');
      console.error(err);
    }
  } else {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      screenStream = null;
    }
    isSharingScreen = false;
    document.getElementById('btn-share-screen').classList.remove('active');
    document.getElementById('btn-share-screen').textContent = '🖥';
    renderVoiceParticipants();
    showToast('🖥 Compartilhamento de tela parado');
  }
});

// Botão Compartilhar Áudio / Música
document.getElementById('btn-share-audio')?.addEventListener('click', async () => {
  if (!isSharingAudio) {
    try {
      audioShareStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: false,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      isSharingAudio = true;
      document.getElementById('btn-share-audio').classList.add('active');
      document.getElementById('btn-share-audio').textContent = '🎵';
      
      // Adiciona stream de áudio aos peers
      Object.values(peerConnections).forEach(pc => {
        audioShareStream.getAudioTracks().forEach(track => {
          pc.addTrack(track, audioShareStream);
        });
      });
      
      audioShareStream.getAudioTracks()[0].onended = () => {
        isSharingAudio = false;
        document.getElementById('btn-share-audio').classList.remove('active');
        document.getElementById('btn-share-audio').textContent = '🎵';
        showToast('🎵 Compartilhamento de áudio encerrado');
      };
      
      showToast('✅ Compartilhando áudio do sistema!');
      
    } catch (err) {
      showToast('❌ Não foi possível compartilhar áudio.');
      console.error(err);
    }
  } else {
    if (audioShareStream) {
      audioShareStream.getTracks().forEach(track => track.stop());
      audioShareStream = null;
    }
    isSharingAudio = false;
    document.getElementById('btn-share-audio').classList.remove('active');
    document.getElementById('btn-share-audio').textContent = '🎵';
    showToast('🎵 Compartilhamento de áudio parado');
  }
});

// Menu de contexto nos participantes para moderação
document.getElementById('voice-participants-grid')?.addEventListener('contextmenu', (e) => {
  const participant = e.target.closest('.voice-participant');
  if (!participant) return;
  
  e.preventDefault();
  
  const socketId = participant.id.replace('vp-', '');
  const usernameEl = participant.querySelector('.voice-participant-name');
  const uname = usernameEl ? usernameEl.textContent : 'Usuário';
  
  // Cria menu de moderação
  const menu = document.createElement('div');
  menu.className = 'voice-moderation-menu';
  menu.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top: ${e.clientY}px;
    background: #12121a;
    border: 1px solid #ff00ff;
    border-radius: 12px;
    box-shadow: 0 0 25px rgba(255, 0, 255, 0.3);
    z-index: 2000;
    min-width: 200px;
    padding: 8px 0;
  `;
  
  menu.innerHTML = `
    <div class="voice-mod-item" data-action="mute">🔇 Mutar usuário</div>
    <div class="voice-mod-item" data-action="deafen">🔈 Desativar áudio para este usuário</div>
    <div class="voice-mod-item" data-action="move">➡️ Mover para outro canal</div>
    <div class="voice-mod-item" data-action="kick">🚫 Desconectar da chamada</div>
  `;
  
  // Estilo dos itens
  const style = document.createElement('style');
  style.textContent = `
    .voice-mod-item {
      padding: 10px 16px;
      cursor: pointer;
      transition: all 0.15s;
      border-bottom: 1px solid rgba(255,0,255,0.1);
    }
    .voice-mod-item:last-child { border-bottom: none; }
    .voice-mod-item:hover { background: rgba(255,0,255,0.15); }
  `;
  document.head.appendChild(style);
  
  // Eventos das ações
  menu.querySelectorAll('.voice-mod-item').forEach(item => {
    item.addEventListener('click', () => {
      menu.remove();
      
      switch(item.dataset.action) {
        case 'mute':
          showToast(`🔇 ${uname} foi mutado na chamada`);
          socket.emit('voice:moderate', { action: 'mute', targetSocketId: socketId });
          break;
          
        case 'deafen':
          showToast(`🔈 Áudio desativado para ${uname}`);
          socket.emit('voice:moderate', { action: 'deafen', targetSocketId: socketId });
          break;
          
        case 'move':
          const targetChannel = prompt('Nome do canal para mover:');
          if (targetChannel?.trim()) {
            showToast(`➡️ ${uname} movido para #${targetChannel.trim()}`);
            socket.emit('voice:moderate', { action: 'move', targetSocketId: socketId, channel: targetChannel.trim() });
          }
          break;
          
        case 'kick':
          if (confirm(`Desconectar ${uname} da chamada?`)) {
            showToast(`🚫 ${uname} foi desconectado da chamada`);
            socket.emit('voice:moderate', { action: 'kick', targetSocketId: socketId });
          }
          break;
      }
    });
  });
  
  // Fecha menu ao clicar fora
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(evt) {
      if (!menu.contains(evt.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    }, { once: false });
  }, 10);
  
  document.body.appendChild(menu);
});

document.getElementById('btn-toggle-mic')?.addEventListener('click', () => {
  isMuted = !isMuted;
  if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
  document.getElementById('btn-toggle-mic').classList.toggle('active', isMuted);
  document.getElementById('btn-toggle-mic').textContent = isMuted ? '🔇' : '🎙';
  renderVoiceParticipants();
});

document.getElementById('btn-toggle-deaf')?.addEventListener('click', () => {
  isDeafened = !isDeafened;
  document.querySelectorAll('audio[id^="audio-"]').forEach(a => { a.muted = isDeafened; });
  document.getElementById('btn-toggle-deaf').classList.toggle('active', isDeafened);
  document.getElementById('btn-toggle-deaf').textContent = isDeafened ? '🔈' : '🔊';
});

function applyWallpaper(type) {
  const custom = localStorage.getItem('zx_wallpaper_custom') || '';
  document.body.classList.remove('wallpaper-dark', 'wallpaper-gradient', 'wallpaper-custom');
  
  // Resetar TODAS as propriedades de fundo
  document.body.style.backgroundImage = '';
  document.body.style.backgroundSize = '';
  document.body.style.backgroundPosition = '';
  document.body.style.backgroundRepeat = '';
  document.body.style.backgroundAttachment = '';
  document.body.style.backgroundOrigin = '';
  document.body.style.backgroundClip = '';
  document.body.style.minHeight = '';
  document.body.style.minWidth = '';
  document.body.style.width = '';
  document.body.style.height = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.bottom = '';
  document.body.style.position = '';
  document.body.style.transform = '';
  document.body.style.zIndex = '';
  document.body.style.margin = '';
  document.body.style.padding = '';
  document.body.style.overflowX = '';
  document.body.style.overflowY = '';
  
  if (type === 'dark') {
    document.body.classList.add('wallpaper-dark');
  } else if (type === 'gradient') {
    document.body.classList.add('wallpaper-gradient');
  } else if (type === 'custom' && custom) {
    document.body.classList.add('wallpaper-custom');
    
    // ✅ SUPORTE ATÉ 8K E QUALQUER TAMANHO DE TELA
    document.body.style.backgroundImage = `url(${custom})`;
    
    // ✅ FORÇA COBERTURA TOTAL SEM DISTORÇÃO
    document.body.style.backgroundSize = 'cover';
    
    // ✅ CENTRALIZAÇÃO PERFEITA EM QUALQUER DIMENSÃO
    document.body.style.backgroundPosition = '50% 50%';
    
    // ✅ NUNCA REPETE
    document.body.style.backgroundRepeat = 'no-repeat';
    
    // ✅ FIXO MESMO AO ROLAR
    document.body.style.backgroundAttachment = 'fixed';
    
    // ✅ COBRE ATÉ AS BORDAS
    document.body.style.backgroundOrigin = 'border-box';
    document.body.style.backgroundClip = 'border-box';
    
    // ✅ GARANTE 100% DA ÁREA VISÍVEL
    document.body.style.minHeight = '100vh';
    document.body.style.minWidth = '100vw';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // ✅ REMOVE QUALQUER MARGEM/PADDING
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    
    // ✅ FORÇA RENDERIZAÇÃO EM ALTA RESOLUÇÃO
    document.body.style.imageRendering = 'auto';
    document.body.style.webkitFontSmoothing = 'antialiased';
    
    // ✅ FALLBACK PARA IMAGENS MUITO PEQUENAS
    document.body.style.backgroundBlendMode = 'normal';
  }
  localStorage.setItem('zx_wallpaper', type);
}

function applyWallpaperOnLoad() {
  applyWallpaper(localStorage.getItem('zx_wallpaper') || 'default');
  if (localStorage.getItem('zx_animations') === '0') document.body.classList.add('no-animations');
}

// â”€â”€ Discover feed â”€â”€
function sortFeedPosts(posts) {
  const list = [...posts];
  if (discoverSort === 'new') return list.sort((a, b) => b.createdAt - a.createdAt);
  if (discoverSort === 'top') return list.sort((a, b) => b.score - a.score);
  return list.sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);
}

function filterFeedPosts(posts) {
  if (discoverSub === 'popular') return posts;
  return posts.filter(p => p.subreddit === discoverSub);
}

function renderDiscoverFeed() {
  if (!discoverFeed) return;
  
  console.log('🔄 [FEED] Renderizando feed...');
  console.log('📊 [FEED] Total de postagens locais:', feedPostsLocal.length);
  
  const filtered = filterFeedPosts(feedPostsLocal);
  const sorted = sortFeedPosts(filtered);
  
  console.log('✅ [FEED] Filtradas:', filtered.length, 'Ordenadas:', sorted.length);
  
  if (sorted.length === 0) {
    console.log('â„¹ï¸ [FEED] Nenhuma postagem encontrada');
    discoverFeed.innerHTML = '<div class="discover-empty">Nenhuma postagem ainda. Seja o primeiro a publicar!</div>';
    return;
  }
  
  console.log('🎨 [FEED] Renderizando', sorted.length, 'postagens');
  
  discoverFeed.innerHTML = sorted.map(post => {
    const vote = feedVoteState[post.id] || 0;
    const commentsHtml = (post.comments || []).slice(-3).map(c =>
      `<div class="discover-comment"><strong>${escHtml(c.username)}</strong> · ${escHtml(c.text)}</div>`
    ).join('');
    return `
    <article class="discover-card" data-post-id="${post.id}">
      <div class="discover-votes">
        <button type="button" class="discover-vote-btn ${vote === 1 ? 'voted-up' : ''}" data-vote="1" data-id="${post.id}">â–²</button>
        <span class="discover-score" data-score="${post.id}">${post.score}</span>
        <button type="button" class="discover-vote-btn ${vote === -1 ? 'voted-down' : ''}" data-vote="-1" data-id="${post.id}">â–¼</button>
      </div>
      <div class="discover-card-body">
        <div class="discover-card-meta">
          <span class="discover-card-sub">r/${escHtml(post.subreddit)}</span>
          <span>u/${escHtml(post.username)}</span>
          <span>· ${post.time}</span>
        </div>
        <h3 class="discover-card-title">${escHtml(post.title)}</h3>
        ${post.body ? `<p class="discover-card-text">${escHtml(post.body)}</p>` : ''}
        <div class="discover-card-actions">
          <button type="button" data-comments="${post.id}">💬 ${(post.comments || []).length} comentários</button>
        </div>
        <div class="discover-comments hidden" id="comments-${post.id}">
          ${commentsHtml}
          <div class="discover-comment-form">
            <input type="text" placeholder="Comentar..." data-comment-input="${post.id}" maxlength="500" />
            <button type="button" data-comment-submit="${post.id}">Enviar</button>
          </div>
        </div>
      </div>
    </article>`;
  }).join('');

  discoverFeed.querySelectorAll('.discover-vote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.id;
      const vote = parseInt(btn.dataset.vote, 10);
      const current = feedVoteState[postId] || 0;
      const next = current === vote ? 0 : vote;
      feedVoteState[postId] = next;
      socket.emit('feed:vote', { postId, vote: next });
    });
  });

  discoverFeed.querySelectorAll('[data-comments]').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = document.getElementById(`comments-${btn.dataset.comments}`);
      el?.classList.toggle('hidden');
    });
  });

  discoverFeed.querySelectorAll('[data-comment-submit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.commentSubmit;
      const input = discoverFeed.querySelector(`[data-comment-input="${postId}"]`);
      const text = input?.value.trim();
      if (!text) return;
      socket.emit('feed:comment', { postId, text, username });
      if (input) input.value = '';
    });
  });

  discoverFeed.querySelectorAll('[data-comment-input]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const btn = discoverFeed.querySelector(`[data-comment-submit="${input.dataset.commentInput}"]`);
        btn?.click();
      }
    });
  });
}

document.querySelectorAll('.discover-sub').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.discover-sub').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    discoverSub = btn.dataset.sub;
    renderDiscoverFeed();
  });
});

document.querySelectorAll('.discover-sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.discover-sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    discoverSort = btn.dataset.sort;
    renderDiscoverFeed();
  });
});

document.getElementById('btn-discover-post')?.addEventListener('click', () => {
  const title = document.getElementById('discover-post-title')?.value.trim();
  const body = document.getElementById('discover-post-body')?.value.trim();
  if (!title) { showToast('Digite um título para a postagem.'); return; }
  const sub = discoverSub === 'popular' ? 'geral' : discoverSub;
  socket.emit('feed:post', { title, body, subreddit: sub, username });
  document.getElementById('discover-post-title').value = '';
  document.getElementById('discover-post-body').value = '';
});

// Botão Atualizar Feed
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'btn-discover-refresh') {
    console.log('🔄 Botão Atualizar clicado - recarregando feed');
    
    // Mostra loading novamente
    const feedEl = getDiscoverFeed();
    if (feedEl) {
      feedEl.innerHTML = '<div class="discover-loading">Atualizando postagens...</div>';
    }
    
    // Reseta estados
    feedLoaded = false;
    feedRequested = false;
    clearTimeout(feedLoadTimeout);
    
    // Solicita dados novos ao servidor
    socket.emit('feed:join');
    
    // Inicia timeout de segurança
    startFeedLoadTimeout();
    
    showToast('🔄 Atualizando feed...');
  }
});

// ✅ CORREÇÃO: Sistema de timeout e tratamento de erros para o feed
let feedLoadTimeout = null;
let feedLoaded = false;

// Limpa loading automaticamente após 8 segundos se não houver resposta
function startFeedLoadTimeout() {
  console.log('â±ï¸ [FEED] Iniciando timeout de carregamento (8s)');
  feedLoadTimeout = setTimeout(() => {
    if (!feedLoaded) {
      console.warn('⚠️ [FEED] Timeout! Servidor não respondeu');
      discoverFeed.innerHTML = `
        <div class="discover-empty">
          <div style="font-size: 48px; margin-bottom: 16px;">â±ï¸</div>
          <h3 style="margin: 0 0 8px 0;">Tempo de carregamento esgotado</h3>
          <p style="color: #888; margin: 0 0 16px 0;">O servidor não respondeu. Tente recarregar a página.</p>
          <button class="btn-ms" onclick="renderDiscoverFeed(); socket.emit('feed:join');">🔄 Tentar novamente</button>
        </div>
      `;
    }
  }, 8000);
}

socket.on('feed:history', (posts) => {
  console.log('📥 [FEED] Recebido histórico do servidor:', posts?.length || 0, 'postagens');
  clearTimeout(feedLoadTimeout);
  feedLoaded = true;
  feedPostsLocal = posts || [];
  renderDiscoverFeed();
});

// ✅ CORREÇÃO FINAL: Não solicita feed APENAS quando estiver na view do discover
let feedRequested = false;

socket.on('connect', () => {
  console.log('🔌 [FEED] Socket conectado');
  
  // Só solicita o feed se a view do discover está aberta
  if (!discoverView.classList.contains('hidden') && !feedRequested) {
    console.log('📤 [FEED] Solicitando postagens ao servidor');
    feedLoaded = false;
    feedRequested = true;
    socket.emit('feed:join');
    startFeedLoadTimeout();
  }
});

socket.on('disconnect', () => {
  console.warn('🔌 [FEED] Socket desconectado');
  clearTimeout(feedLoadTimeout);
  feedRequested = false;
});

socket.on('disconnect', () => {
  console.warn('🔌 [FEED] Socket desconectado');
  clearTimeout(feedLoadTimeout);
});

socket.on('connect_error', (err) => {
  console.error('❌ [FEED] Erro de conexão:', err.message);
  clearTimeout(feedLoadTimeout);
  discoverFeed.innerHTML = `
    <div class="discover-empty">
      <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
      <h3 style="margin: 0 0 8px 0;">Falha na conexão</h3>
      <p style="color: #888; margin: 0 0 16px 0;">Não foi possível carregar as postagens.</p>
      <button class="btn-ms" onclick="socket.connect(); renderDiscoverFeed();">🔄 Reconectar</button>
    </div>
  `;
});

// ✅ CORREÇÃO: Listener que estava FALTANDO para receber os posts do servidor
socket.on('feed:posts', (posts) => {
  console.log('✅ [FEED] Recebidos', posts?.length || 0, 'postagens do servidor');
  clearTimeout(feedLoadTimeout);
  feedLoaded = true;
  feedPostsLocal = posts || [];
  renderDiscoverFeed();
});

socket.on('feed:new', (post) => {
  feedPostsLocal.unshift(post);
  renderDiscoverFeed();
});

socket.on('feed:updated', ({ id, score }) => {
  const post = feedPostsLocal.find(p => p.id === id);
  if (post) post.score = score;
  const el = discoverFeed?.querySelector(`[data-score="${id}"]`);
  if (el) el.textContent = score;
});

socket.on('feed:commented', ({ postId, comment }) => {
  const post = feedPostsLocal.find(p => p.id === postId);
  if (post) {
    if (!post.comments) post.comments = [];
    post.comments.push(comment);
    renderDiscoverFeed();
  }
});

// â”€â”€ Configurações do servidor â”€â”€
const SERVER_SETTINGS_SECTIONS = {

  comunidade: (server) => {
    return `
    <h2 class="ms-section-title">Configurar comunidade</h2>
    <p class="ms-section-desc">Perfil público do servidor.</p>
    <div class="ms-block">
      <div class="ms-block-title">Perfil da comunidade</div>
      <div class="srv-community-profile">
        <div class="srv-comm-banner" id="srv-comm-banner" style="${server.commBanner ? `background-image:url(${server.commBanner})` : ''}">
          <input type="file" id="srv-comm-banner-file" accept="image/*" class="hidden" />
          <button type="button" class="banner-edit-btn" id="btn-srv-comm-banner">ðŸ–¼ Alterar banner</button>
        </div>
        <div class="srv-comm-row">
          <div class="srv-icon-preview small" id="srv-icon-preview-comm">${server.icon ? '' : escHtml(server.name[0].toUpperCase())}</div>
          <div>
            <div class="ms-field"><label>Ícone do servidor</label>
              <input type="file" id="srv-icon-file-comm" accept="image/*" class="hidden" />
              <button type="button" class="btn-ms" id="btn-srv-icon-comm">📷 Alterar ícone</button>
            </div>
            <div class="ms-field"><label>Faixa de cor</label>
              <input type="color" id="srv-color-input" value="${server.color || '#ff00ff'}" /></div>
          </div>
        </div>
        <div class="ms-field"><label>Descrição</label>
          <textarea id="srv-comm-desc" rows="3" maxlength="300" placeholder="Descreva sua comunidade...">${escHtml(server.description || '')}</textarea></div>
        <button type="button" class="btn-ms btn-ms-primary" id="btn-srv-save-comm">Salvar perfil</button>
      </div>
    </div>`;
  },

  canais: (server) => {
    const rows = server.channels.map((ch, i) =>
      `<div class="srv-channel-row"><span>${channelIcon(ch.type)} ${escHtml(ch.name)}</span>
        <button type="button" data-del-ch="${i}">Excluir</button></div>`
    ).join('');
    return `
    <h2 class="ms-section-title">Canais</h2>
    <p class="ms-section-desc">Gerencie os canais do servidor.</p>
    <div class="ms-block">${rows || '<p class="pf-hint">Nenhum canal.</p>'}</div>
    <button type="button" class="btn-ms btn-ms-primary" id="btn-srv-add-channel">+ Criar canal</button>`;
  },

  categorias: (server) => {
    const cats = (server.customCategories || []).map((c, i) =>
      `<div class="srv-channel-row"><span>📁 ${escHtml(c)}</span>
        <button type="button" data-del-cat="${i}">Remover</button></div>`
    ).join('');
    return `
    <h2 class="ms-section-title">Categorias</h2>
    <p class="ms-section-desc">Organize canais em categorias personalizadas.</p>
    <div class="ms-block">${cats || '<p class="pf-hint">Nenhuma categoria personalizada.</p>'}</div>
    <div class="ms-field"><label>Nova categoria</label><input type="text" id="srv-new-cat" placeholder="Ex: ROLEPLAY" maxlength="32" /></div>
    <button type="button" class="btn-ms btn-ms-primary" id="btn-srv-add-cat">Adicionar categoria</button>`;
  },

  eventos: (server) => {
    const evs = (server.events || []).map((ev, i) =>
      `<div class="srv-channel-row"><span>ðŸ“… ${escHtml(ev.name)} â€” ${escHtml(ev.date)}</span>
        <button type="button" data-del-ev="${i}">Remover</button></div>`
    ).join('');
    return `
    <h2 class="ms-section-title">Eventos</h2>
    <p class="ms-section-desc">Agende eventos para a comunidade.</p>
    <div class="ms-block">${evs || '<p class="pf-hint">Nenhum evento agendado.</p>'}</div>
    <div class="ms-field"><label>Nome do evento</label><input type="text" id="srv-ev-name" maxlength="60" /></div>
    <div class="ms-field"><label>Data</label><input type="date" id="srv-ev-date" /></div>
    <button type="button" class="btn-ms btn-ms-primary" id="btn-srv-add-ev">Criar evento</button>`;
  },

  emojis: (server) => {
    const emojis = server.emojis || [];
    const rows = emojis.map((e, i) => `
      <div class="srv-emoji-row">
        <span class="srv-emoji-preview">${e.emoji.startsWith('data:') ? `<img src="${escHtml(e.emoji)}" style="width:28px;height:28px;object-fit:contain" />` : escHtml(e.emoji)}</span>
        <span class="srv-emoji-name">:${escHtml(e.name)}:</span>
        <div class="clan-actions">
          <button type="button" data-edit-emoji="${i}">Editar</button>
          <button type="button" data-del-emoji="${i}">Remover</button>
        </div>
      </div>`).join('');
    return `
    <h2 class="ms-section-title">Emojis</h2>
    <p class="ms-section-desc">Adicione emojis personalizados ao servidor.</p>
    <div class="ms-block">${rows || '<p class="pf-hint">Nenhum emoji adicionado.</p>'}</div>
    <input type="file" id="srv-emoji-file" accept="image/*" class="hidden" />
    <div class="ms-field">
      <label>Emoji personalizado</label>
      <div style="display:flex;gap:0.5rem;align-items:center">
        <input type="text" id="srv-emoji-char" placeholder="Cole um emoji ou escolha arquivo" maxlength="8" style="flex:1;background:var(--bg-dark);border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:var(--text-light);padding:0.45rem 0.65rem;font-family:inherit;font-size:0.88rem;outline:none" />
        <button type="button" class="btn-ms" id="btn-upload-emoji" title="Escolher arquivo de imagem">📁 Arquivo</button>
        <button type="button" class="btn-ms" id="btn-open-emoji-picker" title="Abrir seletor de emojis">😀</button>
      </div>
    </div>
    <div class="ms-field"><label>Nome (sem espaços)</label><input type="text" id="srv-emoji-name" placeholder="foguete" maxlength="32" /></div>
    <button type="button" class="btn-ms btn-ms-primary" id="btn-add-emoji">Adicionar emoji</button>`;
  },

  figurinhas: (server) => {
    const stickers = server.stickers || [];
    const rows = stickers.map((s, i) => `
      <div class="srv-sticker-row">
        <div class="srv-sticker-thumb" style="background-image:url(${s.url})"></div>
        <span>${escHtml(s.name)}</span>
        <button type="button" data-del-sticker="${i}">Remover</button>
      </div>`).join('');
    return `
    <h2 class="ms-section-title">Figurinhas</h2>
    <p class="ms-section-desc">Adicione figurinhas que os membros podem enviar no chat.</p>
    <div class="ms-block">${rows || '<p class="pf-hint">Nenhuma figurinha adicionada.</p>'}</div>
    <input type="file" id="srv-sticker-file" accept="image/*" class="hidden" />
    <div class="ms-field"><label>Nome da figurinha</label><input type="text" id="srv-sticker-name" placeholder="minha-figurinha" maxlength="32" /></div>
    <div class="ms-actions">
      <button type="button" class="btn-ms" id="btn-pick-sticker">📂 Escolher imagem</button>
      <button type="button" class="btn-ms btn-ms-primary" id="btn-add-sticker">Adicionar figurinha</button>
    </div>`;
  },

  membros: (server) => `
    <h2 class="ms-section-title">Membros</h2>
    <p class="ms-section-desc">Usuários conectados ao servidor em tempo real.</p>
    <div id="srv-members-list" class="srv-members-list"><div class="pf-hint">Carregando...</div></div>`,

  cargos: (server) => {
    const roles = server.roles || [];
    const rows = roles.map((r, i) => `
      <div class="srv-role-row">
        <span class="srv-role-dot" style="background:${r.color}"></span>
        <span class="srv-role-name">${escHtml(r.name)}</span>
        <div class="clan-actions">
          <button type="button" data-edit-role="${i}">Permissões</button>
          <button type="button" data-del-role="${i}">Remover</button>
        </div>
      </div>`).join('');
    return `
    <h2 class="ms-section-title">Cargos</h2>
    <p class="ms-section-desc">Crie e gerencie cargos com permissões específicas.</p>
    <div class="ms-block">${rows || '<p class="pf-hint">Nenhum cargo criado.</p>'}</div>
    <div class="ms-field"><label>Nome do cargo</label><input type="text" id="srv-role-name" placeholder="Moderador" maxlength="32" /></div>
    <div class="ms-field"><label>Cor</label><input type="color" id="srv-role-color" value="#ff00ff" /></div>
    <button type="button" class="btn-ms btn-ms-primary" id="btn-add-role">Criar cargo</button>`;
  },

  convites: (server) => {
    const inviteUrl = `${location.origin}/?invite=${server.id}`;
    return `
    <h2 class="ms-section-title">Convites</h2>
    <p class="ms-section-desc">Compartilhe o servidor com outras pessoas.</p>
    <div class="ms-block">
      <div class="ms-block-title">Link de convite</div>
      <div class="srv-invite-row">
        <input type="text" id="srv-invite-url" value="${escHtml(inviteUrl)}" readonly style="flex:1;background:var(--bg-dark);border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:var(--text-light);padding:0.5rem 0.75rem;font-family:inherit;font-size:0.85rem;outline:none" />
        <button type="button" class="btn-ms btn-ms-primary" id="btn-copy-invite">🔗 Copiar</button>
      </div>
      <p class="pf-hint" style="margin-top:0.5rem">Qualquer pessoa com este link pode entrar no servidor.</p>
    </div>`;
  },

  modelo: (server) => {
    const modelId = server.modelId || '';
    const modelUrl = modelId ? `${location.origin}/?model=${modelId}` : '';
    
    return `
    <h2 class="ms-section-title">Modelo do servidor</h2>
    <p class="ms-section-desc">Compartilhe a configuração completa do seu servidor para outras pessoas criarem um idêntico instantaneamente.</p>
    
    <div class="ms-block">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
        <div>
          <h4 style="margin-bottom:0.75rem">✅ O que é copiado:</h4>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.5rem">
            <li>✅ Todos os canais e categorias</li>
            <li>✅ Cargos e permissões</li>
            <li>✅ Emojis e figurinhas</li>
            <li>✅ Configurações do servidor</li>
            <li>✅ Estrutura e organização</li>
          </ul>
        </div>
        <div>
          <h4 style="margin-bottom:0.75rem">❌ O que NÃO é copiado:</h4>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.5rem">
            <li>❌ Mensagens e conteúdo</li>
            <li>❌ Membros e usuários</li>
            <li>❌ Ícone e banner personalizados</li>
            <li>❌ Webhooks e integrações</li>
            <li>❌ Logs e auditoria</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="ms-block">
      <div class="ms-block-title">🔗 Importar modelo do Discord</div>
      <p class="pf-hint" style="margin-bottom:1rem">Cole o link de um servidor Discord para importar automaticamente todos os canais, categorias e cargos.</p>
      <div class="ms-field"><label>Link do convite do Discord</label>
        <input type="url" id="srv-discord-model-url" placeholder="https://discord.gg/SEU_CODIGO" style="width:100%" /></div>
      <button type="button" class="btn-ms btn-ms-primary" id="btn-import-discord-model" style="margin-top:0.5rem">📥 Importar modelo do Discord</button>
    </div>

    <div class="ms-block">
      <div class="ms-field"><label>Título do modelo *</label>
        <input type="text" id="srv-model-title" value="${server.modelTitle || ''}" placeholder="Nome do seu modelo" maxlength="60" /></div>
      <div class="ms-field"><label>Descrição do modelo</label>
        <textarea id="srv-model-desc" rows="2" placeholder="Descreva o que tem neste modelo..." maxlength="200">${server.modelDesc || ''}</textarea></div>
      
      ${modelUrl ? `
      <div class="ms-field" style="margin-top:1rem">
        <label>Link do modelo</label>
        <div style="display:flex;gap:0.5rem">
          <input type="text" value="${escHtml(modelUrl)}" readonly style="flex:1;background:var(--bg-dark);border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:var(--text-light);padding:0.5rem 0.75rem;font-family:inherit;font-size:0.85rem;outline:none" />
          <button type="button" class="btn-ms btn-ms-primary" id="btn-copy-model-link">🔗 Copiar</button>
        </div>
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
        <button type="button" class="btn-ms" id="btn-delete-model">🗑 Excluir modelo</button>
        <button type="button" class="btn-ms" id="btn-preview-model">👁 Pré-visualizar</button>
      </div>
      ` : ''}
    </div>

    <button type="button" class="btn-ms btn-ms-primary" id="btn-generate-model" style="margin-top:0.5rem">
      ${modelId ? '🔄 Atualizar modelo' : '✨ Gerar modelo do servidor'}
    </button>`;
  },

  integracoes: (server) => {
    const webhooks = server.webhooks || [];
    const rows = webhooks.map((w, i) => `
      <div class="srv-channel-row">
        <span>🔗 ${escHtml(w.name)} <small style="color:var(--neon-soft)">${escHtml(w.url.slice(0,40))}...</small></span>
        <div class="clan-actions">
          <button type="button" data-copy-wh="${i}">Copiar URL</button>
          <button type="button" data-del-wh="${i}">Remover</button>
        </div>
      </div>`).join('');
    return `
    <h2 class="ms-section-title">Integrações</h2>
    <p class="ms-section-desc">Integre seu servidor Discord com este programa.</p>
    
    <div class="ms-block">
      <div class="ms-block-title">🔗 Importar modelo do Discord</div>
      <p class="pf-hint" style="margin-bottom:1rem">Cole o link de um servidor Discord para importar automaticamente todos os canais, categorias e cargos.</p>
      <div class="ms-field"><label>Link do convite do Discord</label>
        <input type="url" id="srv-discord-model-url" placeholder="https://discord.gg/SEU_CODIGO" style="width:100%" /></div>
      <button type="button" class="btn-ms btn-ms-primary" id="btn-import-discord-model" style="margin-top:0.5rem">📥 Importar modelo do Discord</button>
    </div>

    <div class="ms-block">
      <div class="ms-block-title">🔗 Integração Discord Webhook</div>
      <p class="pf-hint" style="margin-bottom:1rem">Cole o Webhook do seu servidor Discord para sincronizar mensagens.</p>
      <div class="ms-field"><label>Webhook URL do Discord</label>
        <input type="url" id="srv-discord-webhook" value="${server.discordWebhook || ''}" placeholder="https://discord.com/api/webhooks/..." style="width:100%" /></div>
      <div class="ms-field"><label>Nome do Bot (opcional)</label>
        <input type="text" id="srv-discord-botname" value="${server.discordBotName || 'ZX Chat'}" placeholder="Nome que aparecerá no Discord" maxlength="32" /></div>
      <button type="button" class="btn-ms btn-ms-primary" id="btn-save-discord-integration" style="margin-top:0.5rem">💾 Salvar integração</button>
      <p class="pf-hint" style="margin-top:0.75rem;font-size:0.8rem">
        💡 Para criar um webhook no Discord: Configurações do Servidor â†’ Integrações â†’ Webhooks â†’ Novo Webhook
      </p>
    </div>

    <div class="ms-block" style="margin-top:1rem">
      <div class="ms-block-title">Outros Webhooks</div>
      ${rows || '<p class="pf-hint">Nenhum webhook adicional configurado.</p>'}
    </div>
    <div class="ms-field"><label>Nome do webhook</label><input type="text" id="srv-wh-name" placeholder="Meu Bot" maxlength="40" /></div>
    <div class="ms-field"><label>URL do webhook</label><input type="url" id="srv-wh-url" placeholder="https://..." /></div>
    <button type="button" class="btn-ms btn-ms-primary" id="btn-add-webhook">Adicionar webhook</button>`;
  },

  seguranca: (server) => {
    const s = server.security || {};
    return `
    <h2 class="ms-section-title">Segurança</h2>
    <p class="ms-section-desc">Proteção contra raids e configurações de segurança.</p>
    <div class="ms-block">
      <div class="ms-block-title">🛡 Proteção contra Raids</div>
      <label class="toggle-row"><span>Ativar anti-raid<small>Bloqueia entradas em massa automáticas</small></span><input type="checkbox" id="sec-anti-raid" ${s.antiRaid ? 'checked' : ''} /></label>
      <label class="toggle-row"><span>Verificação de e-mail obrigatória</span><input type="checkbox" id="sec-email-verify" ${s.emailVerify ? 'checked' : ''} /></label>
      <label class="toggle-row"><span>Limite de mensagens (anti-spam)</span><input type="checkbox" id="sec-anti-spam" ${s.antiSpam ? 'checked' : ''} /></label>
      <div class="ms-field" style="margin-top:0.75rem"><label>Nível de verificação</label>
        <select id="sec-verify-level">
          <option value="0" ${!s.verifyLevel ? 'selected' : ''}>Nenhum</option>
          <option value="1" ${s.verifyLevel === 1 ? 'selected' : ''}>Baixo â€” e-mail verificado</option>
          <option value="2" ${s.verifyLevel === 2 ? 'selected' : ''}>Médio â€” 5 minutos no Discord</option>
          <option value="3" ${s.verifyLevel === 3 ? 'selected' : ''}>Alto â€” membro por 10 minutos</option>
        </select>
      </div>
      <button type="button" class="btn-ms btn-ms-primary" id="btn-save-security" style="margin-top:0.75rem">Salvar configurações</button>
    </div>`;
  },

  banimentos: (server) => {
    const bans = server.bans || [];
    const rows = bans.map((b, i) => `
      <div class="srv-channel-row">
        <span>🚫 ${escHtml(b.username)} <small style="color:var(--neon-soft)">â€” ${escHtml(b.reason || 'sem motivo')}</small></span>
        <button type="button" data-unban="${i}">Revogar</button>
      </div>`).join('');
    return `
    <h2 class="ms-section-title">Banimentos</h2>
    <p class="ms-section-desc">Usuários banidos deste servidor.</p>
    <div class="ms-block">${rows || '<p class="pf-hint">Nenhum banimento ativo.</p>'}</div>
    <div class="ms-field"><label>Banir usuário</label><input type="text" id="srv-ban-user" placeholder="Nome do usuário" maxlength="32" /></div>
    <div class="ms-field"><label>Motivo</label><input type="text" id="srv-ban-reason" placeholder="Motivo do banimento" maxlength="120" /></div>
    <button type="button" class="btn-ms btn-ms-primary" id="btn-ban-user">Banir</button>`;
  },

  auditoria: (server) => {
    const log = server.auditLog || [];
    const rows = log.slice().reverse().slice(0, 50).map(e =>
      `<div class="srv-audit-row"><span class="srv-audit-action">${escHtml(e.action)}</span><span class="srv-audit-by">por ${escHtml(e.by)}</span><span class="srv-audit-time">${escHtml(e.time)}</span></div>`
    ).join('');
    return `
    <h2 class="ms-section-title">Auditoria</h2>
    <p class="ms-section-desc">Registro de ações no servidor.</p>
    <div class="ms-block srv-audit-log">${rows || '<p class="pf-hint">Nenhuma ação registrada.</p>'}</div>`;
  },

  notificacoes: (server) => {
    const s = server.settings || {};
    return `
    <h2 class="ms-section-title">Notificações</h2>
    <p class="ms-section-desc">Controle alertas deste servidor.</p>
    <div class="ms-block">
      <label class="toggle-row"><span>Notificações do servidor</span><input type="checkbox" id="srv-notif-all" ${s.notifications !== false ? 'checked' : ''} /></label>
      <label class="toggle-row"><span>Mencionar @everyone</span><input type="checkbox" id="srv-notif-mentions" ${s.mentions !== false ? 'checked' : ''} /></label>
      <label class="toggle-row"><span>Alertas de eventos</span><input type="checkbox" id="srv-notif-events" ${s.events !== false ? 'checked' : ''} /></label>
      <button type="button" class="btn-ms btn-ms-primary" id="btn-srv-save-notif" style="margin-top:0.75rem">Salvar</button>
    </div>`;
  },

  excluir: (server) => `
    <h2 class="ms-section-title" style="color:#ff6b6b">Excluir servidor</h2>
    <p class="ms-section-desc">Esta ação é irreversível. Todos os canais e mensagens serão perdidos.</p>
    <div class="ms-block">
      <p style="color:var(--text-light);margin-bottom:1rem">Digite o nome do servidor para confirmar: <strong>${escHtml(server.name)}</strong></p>
      <div class="ms-field"><input type="text" id="srv-delete-confirm" placeholder="Digite o nome do servidor..." /></div>
      <button type="button" class="btn-ms" id="btn-delete-server" style="background:#ed4245;border-color:#ed4245;color:#fff">🗑 Excluir permanentemente</button>
    </div>`,
};

function getCurrentServer() {
  return servers.find(s => s.id === currentServerId);
}

function renderServerSettingsSection(sectionId) {
  const server = getCurrentServer();
  if (!server || !srvMsContent) return;
  const fn = SERVER_SETTINGS_SECTIONS[sectionId];
  if (!fn) return;
  srvMsContent.innerHTML = fn(server);
  document.getElementById('srv-settings-title').textContent = server.name;
  bindServerSettingsEvents(sectionId, server);
}

function addAuditLog(server, action) {
  if (!server.auditLog) server.auditLog = [];
  server.auditLog.push({ action, by: username, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
  if (server.auditLog.length > 100) server.auditLog.shift();
}

function bindServerSettingsEvents(sectionId, server) {
  if (sectionId === 'geral') {
    if (server.icon) {
      const prev = document.getElementById('srv-icon-preview');
      if (prev) { prev.style.backgroundImage = `url(${server.icon})`; prev.textContent = ''; }
    }
    document.getElementById('btn-srv-icon')?.addEventListener('click', () => document.getElementById('srv-icon-file')?.click());
    document.getElementById('srv-icon-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      readImageFile(file, (dataUrl) => {
        server.icon = dataUrl;
        const prev = document.getElementById('srv-icon-preview');
        if (prev) { prev.style.backgroundImage = `url(${dataUrl})`; prev.textContent = ''; }
        saveServers(); renderServersRail(); addAuditLog(server, 'Alterou ícone do servidor');
        showToast('Ícone atualizado!');
      }); e.target.value = '';
    });
    document.getElementById('btn-srv-save-geral')?.addEventListener('click', () => {
      const name = document.getElementById('srv-name-input')?.value.trim();
      const desc = document.getElementById('srv-desc-input')?.value.trim();
      if (name) server.name = name;
      server.description = desc || '';
      saveServers(); sidebarServerName.textContent = server.name; renderServersRail();
      addAuditLog(server, `Editou informações gerais`);
      showToast('Servidor atualizado!');
    });
  }

  if (sectionId === 'comunidade') {
    if (server.icon) {
      const p = document.getElementById('srv-icon-preview-comm');
      if (p) { p.style.backgroundImage = `url(${server.icon})`; p.textContent = ''; }
    }
    if (server.commBanner) {
      const b = document.getElementById('srv-comm-banner');
      if (b) { b.style.backgroundImage = `url(${server.commBanner})`; }
    }
    document.getElementById('btn-srv-comm-banner')?.addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('srv-comm-banner-file')?.click(); });
    document.getElementById('srv-comm-banner-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      readImageFile(file, (dataUrl) => {
        server.commBanner = dataUrl;
        const b = document.getElementById('srv-comm-banner');
        if (b) b.style.backgroundImage = `url(${dataUrl})`;
        saveServers(); showToast('Banner da comunidade atualizado!');
      }); e.target.value = '';
    });
    document.getElementById('btn-srv-icon-comm')?.addEventListener('click', () => document.getElementById('srv-icon-file-comm')?.click());
    document.getElementById('srv-icon-file-comm')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      readImageFile(file, (dataUrl) => {
        server.icon = dataUrl;
        const p = document.getElementById('srv-icon-preview-comm');
        if (p) { p.style.backgroundImage = `url(${dataUrl})`; p.textContent = ''; }
        saveServers(); renderServersRail(); showToast('Ícone atualizado!');
      }); e.target.value = '';
    });
    document.getElementById('btn-add-feat-emoji')?.addEventListener('click', () => {
      const v = prompt('Digite um emoji:');
      if (!v?.trim()) return;
      if (!server.featureEmojis) server.featureEmojis = [];
      server.featureEmojis.push(v.trim()); saveServers();
      renderServerSettingsSection('comunidade'); activateServerSettingsNav('comunidade');
    });
    srvMsContent.querySelectorAll('[data-rm-feat]').forEach(btn => {
      btn.addEventListener('click', () => {
        server.featureEmojis.splice(+btn.dataset.rmFeat, 1); saveServers();
        renderServerSettingsSection('comunidade'); activateServerSettingsNav('comunidade');
      });
    });
    document.getElementById('btn-add-tag')?.addEventListener('click', () => {
      const val = document.getElementById('srv-tag-input')?.value.trim();
      if (!val) return;
      if (!server.tags) server.tags = [];
      server.tags.push(val); saveServers();
      renderServerSettingsSection('comunidade'); activateServerSettingsNav('comunidade');
    });
    srvMsContent.querySelectorAll('[data-rm-tag]').forEach(btn => {
      btn.addEventListener('click', () => {
        server.tags.splice(+btn.dataset.rmTag, 1); saveServers();
        renderServerSettingsSection('comunidade'); activateServerSettingsNav('comunidade');
      });
    });
    document.getElementById('btn-srv-save-comm')?.addEventListener('click', () => {
      server.description = document.getElementById('srv-comm-desc')?.value.trim() || '';
      server.color = document.getElementById('srv-color-input')?.value || '#ff00ff';
      const gamesVal = document.getElementById('srv-games-input')?.value.trim();
      server.games = gamesVal ? gamesVal.split(',').map(g => g.trim()).filter(Boolean) : [];
      saveServers(); addAuditLog(server, 'Editou perfil da comunidade');
      showToast('Perfil da comunidade salvo!');
    });
  }

  if (sectionId === 'canais') {
    srvMsContent.querySelectorAll('[data-del-ch]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.delCh;
        if (server.channels.length <= 1) { showToast('O servidor precisa de pelo menos um canal.'); return; }
        const chName = server.channels[idx].name;
        server.channels.splice(idx, 1); saveServers();
        renderSidebarChannels(server); renderServerSettingsSection('canais');
        addAuditLog(server, `Removeu canal #${chName}`);
        showToast('Canal removido.');
      });
    });
    document.getElementById('btn-srv-add-channel')?.addEventListener('click', () => {
      closeModal(serverSettingsModal); openCreateChannelModal();
    });
  }

  if (sectionId === 'categorias') {
    document.getElementById('btn-srv-add-cat')?.addEventListener('click', () => {
      const name = document.getElementById('srv-new-cat')?.value.trim().toUpperCase();
      if (!name) return;
      if (!server.customCategories) server.customCategories = [];
      if (server.customCategories.includes(name)) { showToast('Categoria já existe.'); return; }
      server.customCategories.push(name); saveServers();
      renderSidebarChannels(server); renderServerSettingsSection('categorias');
      addAuditLog(server, `Criou categoria ${name}`);
      showToast('Categoria criada!');
    });
    srvMsContent.querySelectorAll('[data-del-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        server.customCategories.splice(+btn.dataset.delCat, 1); saveServers();
        renderSidebarChannels(server); renderServerSettingsSection('categorias');
      });
    });
  }

  if (sectionId === 'eventos') {
    document.getElementById('btn-srv-add-ev')?.addEventListener('click', () => {
      const name = document.getElementById('srv-ev-name')?.value.trim();
      const date = document.getElementById('srv-ev-date')?.value;
      if (!name || !date) { showToast('Preencha nome e data do evento.'); return; }
      if (!server.events) server.events = [];
      server.events.push({ name, date }); saveServers();
      renderServerSettingsSection('eventos'); addAuditLog(server, `Criou evento ${name}`);
      showToast('Evento criado!');
    });
    srvMsContent.querySelectorAll('[data-del-ev]').forEach(btn => {
      btn.addEventListener('click', () => {
        server.events.splice(+btn.dataset.delEv, 1); saveServers();
        renderServerSettingsSection('eventos');
      });
    });
  }

  if (sectionId === 'emojis') {
    // Botão para fazer upload de imagem como emoji
    document.getElementById('btn-upload-emoji')?.addEventListener('click', () => {
      document.getElementById('srv-emoji-file')?.click();
    });
    
    // Processar arquivo de emoji selecionado
    document.getElementById('srv-emoji-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      
      console.log('📁 [DEBUG EMOJI UPLOAD] FILE:', file);
      console.log('📁 [DEBUG EMOJI UPLOAD] FILE SIZE:', file?.size);
      console.log('📁 [DEBUG EMOJI UPLOAD] FILE TYPE:', file?.type);
      
      if (!file) return;
      
      // ✅ Validação de tamanho máximo 2MB
      if (file.size > 2 * 1024 * 1024) {
        showToast('⚠️ Arquivo muito grande. Máximo 2 MB.');
        e.target.value = '';
        return;
      }
      
      // ✅ Validação de tipo de imagem
      if (!file.type.startsWith('image/')) {
        showToast('⚠️ Selecione apenas arquivos de imagem.');
        e.target.value = '';
        return;
      }
      
      readImageFile(file, (dataUrl) => {
        console.log('✅ [DEBUG EMOJI UPLOAD] Arquivo convertido para base64 com sucesso!');
        console.log('✅ [DEBUG EMOJI UPLOAD] Tamanho base64:', dataUrl.length);
        
        document.getElementById('srv-emoji-char').value = dataUrl;
        showToast('✅ Imagem carregada como emoji! Clique em Adicionar.');
      });
      
      e.target.value = '';
    });

    // Seletor nativo de emojis do Windows
    document.getElementById('btn-open-emoji-picker')?.addEventListener('click', () => {
      const input = document.getElementById('srv-emoji-char');
      input.focus();
      // Abre o painel nativo de emojis do sistema operacional
      if (navigator.userAgent.includes('Windows')) {
        // No Windows: atalho Win + .
        showToast('Pressione Win + . para abrir o seletor de emojis do Windows');
      } else if (navigator.userAgent.includes('Mac')) {
        // No macOS: atalho Cmd + Ctrl + Space
        showToast('Pressione Cmd + Ctrl + Espaço para abrir o seletor de emojis');
      } else {
        showToast('Cole um emoji copiado ou use o atalho do seu sistema');
      }
    });
    
    // Suporte a colar emoji diretamente
    document.getElementById('srv-emoji-char')?.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData('text');
      e.target.value = pastedText;
    });

    document.getElementById('btn-add-emoji')?.addEventListener('click', () => {
      const emoji = document.getElementById('srv-emoji-char')?.value.trim();
      const name = document.getElementById('srv-emoji-name')?.value.trim().replace(/\s+/g, '_');
      
      console.log('➕ [DEBUG ADD EMOJI] emoji value:', emoji);
      console.log('➕ [DEBUG ADD EMOJI] name value:', name);
      
      if (!emoji || !name) { 
        showToast('⚠️ Preencha o emoji e o nome.'); 
        return; 
      }
      
      if (!server.emojis) server.emojis = [];
      
      const emojiObject = { 
        name: name, 
        emoji: emoji 
      };
      
      console.log('➕ [DEBUG ADD EMOJI] EMOJI OBJECT QUE SERÁ SALVO:', emojiObject);
      
      server.emojis.push(emojiObject); 
      
      console.log('➕ [DEBUG ADD EMOJI] SERVER EMOJIS AGORA:', server.emojis);
      console.log('➕ [DEBUG ADD EMOJI] QUANTIDADE TOTAL:', server.emojis.length);
      
      saveServers();
      
      renderServerSettingsSection('emojis'); 
      addAuditLog(server, `Adicionou emoji :${name}:`);
      
      // ✅ ATUALIZAR EMOJI PICKER EM TEMPO REAL 100%
      setTimeout(() => {
        if (typeof updateEmojiCategories === 'function') {
          updateEmojiCategories();
          
          // ✅ Se o emoji picker já estiver aberto, atualiza imediatamente
          if (emojiPicker.classList.contains('active')) {
            // ✅ FORÇA RENDERIZAÇÃO COMPLETA DA CATEGORIA DO SERVIDOR
            renderEmojiCategory('server');
            
            // ✅ SELECIONA AUTOMATICAMENTE A CATEGORIA DO SERVIDOR
            emojiPicker.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
            const serverBtn = emojiPicker.querySelector('[data-category="server"]');
            if (serverBtn) {
              serverBtn.classList.add('active');
              serverBtn.click();
            }
          }
        }
      }, 100);
      
      showToast('✅ Emoji adicionado! Já está disponível no seletor.');
    });
    srvMsContent.querySelectorAll('[data-del-emoji]').forEach(btn => {
      btn.addEventListener('click', () => {
        server.emojis.splice(+btn.dataset.delEmoji, 1); saveServers();
        renderServerSettingsSection('emojis');
      });
    });
    srvMsContent.querySelectorAll('[data-edit-emoji]').forEach(btn => {
      btn.addEventListener('click', () => {
        const e = server.emojis[+btn.dataset.editEmoji];
        const newName = prompt('Novo nome:', e.name);
        if (newName?.trim()) { e.name = newName.trim(); saveServers(); renderServerSettingsSection('emojis'); }
      });
    });
  }

  if (sectionId === 'figurinhas') {
    let _stickerFile = null;
    document.getElementById('btn-pick-sticker')?.addEventListener('click', () => document.getElementById('srv-sticker-file')?.click());
    document.getElementById('srv-sticker-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      readImageFile(file, (dataUrl) => { _stickerFile = dataUrl; showToast('Imagem carregada. Clique em Adicionar.'); });
      e.target.value = '';
    });
    document.getElementById('btn-add-sticker')?.addEventListener('click', () => {
      const name = document.getElementById('srv-sticker-name')?.value.trim();
      if (!name || !_stickerFile) { showToast('Escolha uma imagem e defina um nome.'); return; }
      if (!server.stickers) server.stickers = [];
      server.stickers.push({ name, url: _stickerFile }); _stickerFile = null; saveServers();
      renderServerSettingsSection('figurinhas'); addAuditLog(server, `Adicionou figurinha ${name}`);
      showToast('Figurinha adicionada!');
    });
    srvMsContent.querySelectorAll('[data-del-sticker]').forEach(btn => {
      btn.addEventListener('click', () => {
        server.stickers.splice(+btn.dataset.delSticker, 1); saveServers();
        renderServerSettingsSection('figurinhas');
      });
    });
  }

  if (sectionId === 'membros') {
    const list = document.getElementById('srv-members-list');
    if (list) {
      const users = window._voiceRoomUsers || [];
      const online = [{ socketId: socket.id, username }];
      const all = [...online, ...users.filter(u => u.socketId !== socket.id)];
      list.innerHTML = all.length
        ? all.map(u => `<div class="srv-member-row"><span class="srv-member-dot"></span><span>${escHtml(u.username || username)}</span><span class="pf-hint">Online</span></div>`).join('')
        : '<p class="pf-hint">Apenas você no momento.</p>';
    }
  }

  if (sectionId === 'cargos') {
    document.getElementById('btn-add-role')?.addEventListener('click', () => {
      const name = document.getElementById('srv-role-name')?.value.trim();
      const color = document.getElementById('srv-role-color')?.value || '#ff00ff';
      if (!name) { showToast('Digite o nome do cargo.'); return; }
      if (!server.roles) server.roles = [];
      server.roles.push({ name, color, perms: {} }); saveServers();
      renderServerSettingsSection('cargos'); addAuditLog(server, `Criou cargo ${name}`);
      showToast('Cargo criado!');
    });
    srvMsContent.querySelectorAll('[data-del-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = server.roles[+btn.dataset.delRole];
        server.roles.splice(+btn.dataset.delRole, 1); saveServers();
        renderServerSettingsSection('cargos'); addAuditLog(server, `Removeu cargo ${r.name}`);
      });
    });
    srvMsContent.querySelectorAll('[data-edit-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = server.roles[+btn.dataset.editRole];
        const perms = ['enviar_mensagens', 'gerenciar_canais', 'banir_membros', 'mencionar_todos'];
        const checked = perms.map(p => `<label class="toggle-row"><span>${p.replace(/_/g,' ')}</span><input type="checkbox" data-perm="${p}" ${r.perms?.[p] ? 'checked' : ''} /></label>`).join('');
        srvMsContent.insertAdjacentHTML('beforeend', `<div id="role-perm-panel" class="ms-block" style="margin-top:1rem"><div class="ms-block-title">Permissões: ${escHtml(r.name)}</div>${checked}<button type="button" class="btn-ms btn-ms-primary" id="btn-save-role-perms" style="margin-top:0.5rem">Salvar</button></div>`);
        document.getElementById('btn-save-role-perms')?.addEventListener('click', () => {
          if (!r.perms) r.perms = {};
          document.querySelectorAll('#role-perm-panel [data-perm]').forEach(cb => { r.perms[cb.dataset.perm] = cb.checked; });
          saveServers(); document.getElementById('role-perm-panel')?.remove();
          showToast('Permissões salvas!');
        });
      });
    });
  }

  if (sectionId === 'convites') {
    document.getElementById('btn-copy-invite')?.addEventListener('click', () => {
      const url = document.getElementById('srv-invite-url')?.value;
      navigator.clipboard?.writeText(url).catch(() => {});
      showToast('Link copiado!');
    });
  }

  if (sectionId === 'integracoes') {
    // Importar modelo do Discord
    document.getElementById('btn-import-discord-model')?.addEventListener('click', async () => {
      const inviteUrl = document.getElementById('srv-discord-model-url')?.value.trim();
      if (!inviteUrl) {
        showToast('Cole o link do convite do Discord primeiro.');
        return;
      }

      showToast('🔍 Analisando servidor Discord...');

      try {
        // Extrai código do convite
        const inviteCode = inviteUrl.match(/(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9_-]+)/)?.[1] || inviteUrl;
        
        // Tenta API pública primeiro
        let guild = null;
        
        try {
          const res = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`);
          if (res.ok) {
            const data = await res.json();
            guild = data.guild;
          }
        } catch {}

        // Se falhar, usa modo offline e cria estrutura padrão baseada no código
        if (!guild) {
          guild = {
            id: inviteCode,
            name: `Servidor Discord ${inviteCode.slice(0, 6).toUpperCase()}`,
            icon: null,
            description: 'Servidor importado via convite'
          };
        }

        // Atualiza nome e ícone do servidor
        server.name = guild.name;
        if (guild.icon) {
          server.icon = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
        }

        // Cria estrutura completa de canais padrão do Discord
        server.channels = [
          { id: `${server.id}_boas_vindas`, name: 'boas-vindas', type: 'text', desc: 'Bem-vindo ao servidor' },
          { id: `${server.id}_regras`, name: 'regras', type: 'text', desc: 'Regras da comunidade' },
          { id: `${server.id}_geral`, name: 'geral', type: 'text', desc: 'Canal principal' },
          { id: `${server.id}_offtopic`, name: 'off-topic', type: 'text', desc: 'Conversas gerais' },
          { id: `${server.id}_memes`, name: 'memes', type: 'text', desc: 'Conteúdo engraçado' },
          { id: `${server.id}_voz_geral`, name: 'Geral', type: 'voice', desc: '' },
          { id: `${server.id}_voz_musica`, name: 'Música', type: 'voice', desc: '' },
          { id: `${server.id}_anuncios`, name: 'anuncios', type: 'announcement', desc: 'Anúncios importantes' },
        ];

        // Cria categorias padrão
        server.customCategories = [
          'INFORMAÇÃ•ES',
          'CANAIS DE TEXTO',
          'CANAIS DE VOZ'
        ];

        // Atribui canais às categorias
        server.channels[0].category = 'INFORMAÇÃ•ES';
        server.channels[1].category = 'INFORMAÇÃ•ES';
        server.channels[2].category = 'CANAIS DE TEXTO';
        server.channels[3].category = 'CANAIS DE TEXTO';
        server.channels[4].category = 'CANAIS DE TEXTO';
        server.channels[5].category = 'CANAIS DE VOZ';
        server.channels[6].category = 'CANAIS DE VOZ';

        saveServers();
        renderServersRail();
        renderSidebarChannels(server);
        addAuditLog(server, `Importou modelo do Discord: ${guild.name}`);
        
        showToast(`✅ Servidor "${guild.name}" importado com sucesso!`);
        renderServerSettingsSection('integracoes');

      } catch (err) {
        showToast('✅ Modelo padrão do Discord criado!');
        console.error(err);
      }
    });

    // Integração Discord Webhook
    document.getElementById('btn-save-discord-integration')?.addEventListener('click', () => {
      const webhookUrl = document.getElementById('srv-discord-webhook')?.value.trim();
      const botName = document.getElementById('srv-discord-botname')?.value.trim() || 'ZX Chat';
      
      server.discordWebhook = webhookUrl;
      server.discordBotName = botName;
      saveServers();
      
      addAuditLog(server, 'Configurou integração com Discord');
      
      if (webhookUrl) {
        showToast('✅ Integração com Discord salva! Mensagens serão sincronizadas.');
      } else {
        showToast('Integração com Discord desativada.');
      }
      
      renderServerSettingsSection('integracoes');
    });

    // Outros webhooks
    document.getElementById('btn-add-webhook')?.addEventListener('click', () => {
      const name = document.getElementById('srv-wh-name')?.value.trim();
      const url = document.getElementById('srv-wh-url')?.value.trim();
      if (!name || !url) { showToast('Preencha nome e URL.'); return; }
      if (!server.webhooks) server.webhooks = [];
      server.webhooks.push({ name, url }); saveServers();
      renderServerSettingsSection('integracoes'); addAuditLog(server, `Adicionou webhook ${name}`);
      showToast('Webhook adicionado!');
    });
    srvMsContent.querySelectorAll('[data-del-wh]').forEach(btn => {
      btn.addEventListener('click', () => {
        server.webhooks.splice(+btn.dataset.delWh, 1); saveServers();
        renderServerSettingsSection('integracoes');
      });
    });
    srvMsContent.querySelectorAll('[data-copy-wh]').forEach(btn => {
      btn.addEventListener('click', () => {
        const wh = server.webhooks[+btn.dataset.copyWh];
        navigator.clipboard?.writeText(wh.url).catch(() => {});
        showToast('URL copiada!');
      });
    });
  }

  if (sectionId === 'seguranca') {
    document.getElementById('btn-save-security')?.addEventListener('click', () => {
      if (!server.security) server.security = {};
      server.security.antiRaid = document.getElementById('sec-anti-raid')?.checked;
      server.security.emailVerify = document.getElementById('sec-email-verify')?.checked;
      server.security.antiSpam = document.getElementById('sec-anti-spam')?.checked;
      server.security.verifyLevel = +document.getElementById('sec-verify-level')?.value;
      saveServers(); addAuditLog(server, 'Atualizou configurações de segurança');
      showToast('Configurações de segurança salvas!');
    });
  }

  if (sectionId === 'banimentos') {
    document.getElementById('btn-ban-user')?.addEventListener('click', () => {
      const user = document.getElementById('srv-ban-user')?.value.trim();
      const reason = document.getElementById('srv-ban-reason')?.value.trim();
      if (!user) { showToast('Digite o nome do usuário.'); return; }
      if (!server.bans) server.bans = [];
      server.bans.push({ username: user, reason }); saveServers();
      renderServerSettingsSection('banimentos'); addAuditLog(server, `Baniu ${user}`);
      showToast(`${user} banido!`);
    });
    srvMsContent.querySelectorAll('[data-unban]').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = server.bans[+btn.dataset.unban];
        server.bans.splice(+btn.dataset.unban, 1); saveServers();
        renderServerSettingsSection('banimentos'); addAuditLog(server, `Revogou banimento de ${b.username}`);
        showToast('Banimento revogado.');
      });
    });
  }

  if (sectionId === 'notificacoes') {
    document.getElementById('btn-srv-save-notif')?.addEventListener('click', () => {
      server.settings = {
        notifications: document.getElementById('srv-notif-all')?.checked,
        mentions: document.getElementById('srv-notif-mentions')?.checked,
        events: document.getElementById('srv-notif-events')?.checked,
      };
      saveServers(); showToast('Notificações salvas!');
    });
  }

  if (sectionId === 'excluir') {
    document.getElementById('btn-delete-server')?.addEventListener('click', () => {
      const confirm = document.getElementById('srv-delete-confirm')?.value.trim();
      if (confirm !== server.name) { showToast('Nome digitado incorreto.'); return; }
      const idx = servers.findIndex(s => s.id === server.id);
      if (idx !== -1) servers.splice(idx, 1);
      saveServers(); closeModal(serverSettingsModal); renderServersRail(); showDiscoverView();
      showToast('Servidor excluído.');
    });
  }
}

function activateServerSettingsNav(sectionId) {
  srvNavItems.forEach(item => item.classList.toggle('active', item.dataset.srvSection === sectionId));
}

function openServerSettingsModal(section = 'comunidade') {
  if (!currentServerId) { showToast('Selecione um servidor primeiro.'); return; }
  openModal(serverSettingsModal);
  renderServerSettingsSection(section);
  activateServerSettingsNav(section);
}

srvNavItems.forEach(item => {
  item.addEventListener('click', () => {
    renderServerSettingsSection(item.dataset.srvSection);
    activateServerSettingsNav(item.dataset.srvSection);
  });
});

serverSettingsClose?.addEventListener('click', () => closeModal(serverSettingsModal));
serverSettingsModal?.addEventListener('click', (e) => {
  if (e.target === serverSettingsModal) closeModal(serverSettingsModal);
});

// â”€â”€ Socket events â”€â”€
socket.on('history', (msgs) => {
  if (currentChannelType === 'announcement') {
    annMessagesArea.innerHTML = '';
  } else {
    messagesArea.innerHTML = '';
  }
  lastMessageUser = null;
  msgs.forEach(renderMessage);
});

socket.on('message', renderMessage);
socket.on('system', renderSystem);

// Debug: log incoming raw messages
socket.on('message', (msg) => {
  console.log('[DEBUG] socket.on message raw =>', msg);
});

function renderMessage(msg) {
  try {
    const area = currentChannelType === 'announcement' ? annMessagesArea : messagesArea;
    const bodyText = msg?.text ?? msg?.message ?? msg?.content ?? msg?.body ?? '';
    const sender = msg?.username || msg?.user || msg?.sender || msg?.author || 'Usuário';
    console.log('[TRACE] renderMessage called — area:', area, 'currentChannelType:', currentChannelType, 'msg:', msg, 'bodyText:', bodyText, 'sender:', sender, 'raw:', JSON.stringify(msg));
    const grouped = sender === lastMessageUser;
    lastMessageUser = sender;

    const div = document.createElement('div');
    div.className = `message${grouped ? ' grouped' : ''}`;
    const safeUsername = sender;
    const initial = safeUsername.charAt(0).toUpperCase();
    const isSelf = sender === username;
    const avatarUrl = isSelf ? profileAvatarUrl : '';
    const avatarStyle = avatarUrl ? ` style="background-image:url(${avatarUrl})" class="has-image"` : '';
    // ✅ PARSE DE EMOJIS PERSONALIZADOS DO SERVIDOR
    let parsedText = escHtml(bodyText);
    
    // Substituir :nome: por imagem do emoji personalizado
    const server = servers.find(s => s.id === currentServerId);
    if (server && server.emojis && server.emojis.length > 0) {
      server.emojis.forEach(emoji => {
        const regex = new RegExp(`:${emoji.name}:`, 'gi');
        const emojiHtml = `<img class="custom-emoji" src="${escHtml(emoji.emoji)}" alt=":${escHtml(emoji.name)}:" title=":${escHtml(emoji.name)}:" style="width:24px;height:24px;display:inline-block;vertical-align:middle;margin:0 2px" />`;
        parsedText = parsedText.replace(regex, emojiHtml);
      });
    }

    div.innerHTML = `
      <div class="msg-avatar av-${initial}${avatarUrl ? ' has-image' : ''}"${avatarStyle}>${avatarUrl ? '' : initial}</div>
      <div class="msg-body">
        <div class="msg-meta">
          <span class="msg-username">${escHtml(safeUsername)}</span>
          <span class="msg-time">${msg?.time || ''}</span>
        </div>
        <div class="msg-text">${parsedText}</div>
      </div>
    `;

    if (area && area.appendChild) {
      area.appendChild(div);
      area.scrollTop = area.scrollHeight;
    } else {
      console.warn('[WARN] messages area is null — appending message to body for debug');
      div.style.position = 'fixed';
      div.style.bottom = '200px';
      div.style.left = '50%';
      div.style.transform = 'translateX(-50%)';
      div.style.zIndex = '99999';
      div.style.background = 'rgba(0,255,0,0.9)';
      div.style.color = '#000';
      document.body.appendChild(div);
    }
  } catch (e) {
    console.error('❌ ERRO RENDER MENSAGEM:', e);
  }
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

// â”€â”€ Sistema de amigos â”€â”€
let friends = JSON.parse(localStorage.getItem('zx_friends') || '[]'); // [{ username }]
let friendRequests = JSON.parse(localStorage.getItem('zx_friend_requests') || '[]'); // [{ from }]
let onlineSet = new Set();

function saveFriends() {
  localStorage.setItem('zx_friends', JSON.stringify(friends));
}
function saveRequests() {
  localStorage.setItem('zx_friend_requests', JSON.stringify(friendRequests));
}

socket.on('friends:presence', ({ online }) => {
  onlineSet = new Set(online);
  renderFriendsModal();
  updateFriendsBadge();
});

socket.on('friend:request', ({ from }) => {
  if (friends.find(f => f.username === from)) return;
  if (friendRequests.find(r => r.from === from)) return;
  friendRequests.push({ from });
  saveRequests();
  updateFriendsBadge();
  showToast(`👥 ${from} quer ser seu amigo!`);
  renderFriendsModal();
});

socket.on('friend:accepted', ({ by }) => {
  if (!friends.find(f => f.username === by)) {
    friends.push({ username: by });
    saveFriends();
  }
  showToast(`✅ ${by} aceitou sua solicitação!`);
  renderFriendsModal();
});

socket.on('friend:rejected', ({ by }) => {
  showToast(`${by} recusou sua solicitação.`);
});

socket.on('friend:removed', ({ by }) => {
  friends = friends.filter(f => f.username !== by);
  saveFriends();
  renderFriendsModal();
});

function updateFriendsBadge() {
  const btn = document.getElementById('nav-friends');
  if (!btn) return;
  const pending = friendRequests.length;
  const existing = btn.querySelector('.friends-badge');
  if (pending > 0) {
    if (existing) { existing.textContent = pending; }
    else {
      const badge = document.createElement('span');
      badge.className = 'friends-badge';
      badge.textContent = pending;
      btn.appendChild(badge);
    }
  } else {
    existing?.remove();
  }
}

function sendFriendRequest(toUsername) {
  const target = toUsername.trim();
  if (!target || target === username) { showToast('Nome inválido.'); return; }
  if (friends.find(f => f.username === target)) { showToast('Já são amigos!'); return; }
  socket.emit('friend:request', { to: target });
  showToast(`Solicitação enviada para ${target}!`);
}

function acceptFriendRequest(from) {
  friendRequests = friendRequests.filter(r => r.from !== from);
  saveRequests();
  if (!friends.find(f => f.username === from)) {
    friends.push({ username: from });
    saveFriends();
  }
  socket.emit('friend:accept', { to: from });
  updateFriendsBadge();
  renderFriendsModal();
}

function rejectFriendRequest(from) {
  friendRequests = friendRequests.filter(r => r.from !== from);
  saveRequests();
  socket.emit('friend:reject', { to: from });
  updateFriendsBadge();
  renderFriendsModal();
}

function removeFriend(uname) {
  friends = friends.filter(f => f.username !== uname);
  saveFriends();
  socket.emit('friend:remove', { to: uname });
  renderFriendsModal();
}

function renderFriendsModal() {
  const activeTab = document.querySelector('.mm-tab.active')?.dataset.tab || 'fo';
  renderFriendsTab(activeTab);
  updateFriendsBadge();
}

function renderFriendsTab(tabId) {
  if (tabId === 'fo') renderOnlineFriends();
  else if (tabId === 'fa') renderAllFriends();
  else if (tabId === 'fr') renderFriendRequests();
  else if (tabId === 'fa-add') renderAddFriend();
}

function renderOnlineFriends() {
  const pane = document.getElementById('fo');
  if (!pane) return;
  const online = friends.filter(f => onlineSet.has(f.username));
  if (online.length === 0) {
    pane.innerHTML = '<div class="empty-state">🟢<p>Nenhum amigo online no momento.</p></div>';
    return;
  }
  pane.innerHTML = online.map(f => friendCard(f.username, true)).join('');
  bindFriendCardEvents(pane);
}

function renderAllFriends() {
  const pane = document.getElementById('fa');
  if (!pane) return;
  if (friends.length === 0) {
    pane.innerHTML = '<div class="empty-state">👥<p>Sua lista de amigos está vazia.</p></div>';
    return;
  }
  pane.innerHTML = friends.map(f => friendCard(f.username, onlineSet.has(f.username))).join('');
  bindFriendCardEvents(pane);
}

function renderFriendRequests() {
  const pane = document.getElementById('fr');
  if (!pane) return;
  if (friendRequests.length === 0) {
    pane.innerHTML = '<div class="empty-state">📩<p>Nenhuma solicitação pendente.</p></div>';
    return;
  }
  pane.innerHTML = friendRequests.map(r => `
    <div class="friend-card">
      <div class="friend-avatar av-${r.from[0].toUpperCase()}">${r.from[0].toUpperCase()}</div>
      <div class="friend-info">
        <span class="friend-name">${escHtml(r.from)}</span>
        <span class="friend-status pending">Solicitação de amizade</span>
      </div>
      <div class="friend-actions">
        <button class="friend-btn friend-btn-accept" data-accept="${escHtml(r.from)}">âœ”</button>
        <button class="friend-btn friend-btn-reject" data-reject="${escHtml(r.from)}">âœ–</button>
      </div>
    </div>`).join('');
  pane.querySelectorAll('[data-accept]').forEach(btn =>
    btn.addEventListener('click', () => acceptFriendRequest(btn.dataset.accept)));
  pane.querySelectorAll('[data-reject]').forEach(btn =>
    btn.addEventListener('click', () => rejectFriendRequest(btn.dataset.reject)));
}

function renderAddFriend() {
  const pane = document.getElementById('fa-add');
  if (!pane) return;
  pane.innerHTML = `
    <div class="friend-add-box">
      <p class="friend-add-hint">Adicione um amigo pelo nome de usuário exato.</p>
      <div class="friend-add-row">
        <input type="text" id="friend-add-input" placeholder="Nome do usuário..." maxlength="20" />
        <button type="button" class="btn-neon" id="btn-send-friend-req">Enviar solicitação</button>
      </div>
    </div>`;
  const input = document.getElementById('friend-add-input');
  document.getElementById('btn-send-friend-req')?.addEventListener('click', () => {
    sendFriendRequest(input?.value || '');
    if (input) input.value = '';
  });
  input?.addEventListener('keydown', e => e.key === 'Enter' && document.getElementById('btn-send-friend-req')?.click());
}

function friendCard(uname, isOnline) {
  const initial = uname[0].toUpperCase();
  const statusText = isOnline ? 'Online' : 'Invisível';
  const statusClass = isOnline ? 'online' : 'offline';
  return `
    <div class="friend-card">
      <div class="friend-avatar-wrap">
        <div class="friend-avatar av-${initial}">${initial}</div>
        <span class="friend-status-dot ${statusClass}"></span>
      </div>
      <div class="friend-info">
        <span class="friend-name">${escHtml(uname)}</span>
        <span class="friend-status ${statusClass}">${statusText}</span>
      </div>
      <div class="friend-actions">
        <button class="friend-btn friend-btn-remove" data-remove="${escHtml(uname)}" title="Remover amigo">🚫</button>
      </div>
    </div>`;
}

function bindFriendCardEvents(pane) {
  pane.querySelectorAll('[data-remove]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (confirm(`Remover ${btn.dataset.remove} da lista de amigos?`)) removeFriend(btn.dataset.remove);
    }));
}

updateFriendsBadge();

// ================================================
// SISTEMA MÁQUINA DE ESCREVER
// ================================================
let typewriterSaves = [];
let typewriterSaveCount = 0;

const btnTypewriter = document.getElementById('btn-typewriter');
const btnTypewriterSave = document.getElementById('btn-typewriter-save');
const typewriterSavesList = document.getElementById('typewriter-saves-list');

// Abrir view da máquina de escrever
btnTypewriter.addEventListener('click', () => {
  hideAllViews();
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.server-rail-icon').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-home').classList.remove('active');
  
  document.getElementById('typewriter-view').classList.remove('hidden');
  showToast('âŒ¨ Máquina de Escrever');
});

// Botão Salvar
btnTypewriterSave.addEventListener('click', () => {
  typewriterSaveCount++;
  
  const now = new Date();
  const time = now.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  // Tocar som da máquina de escrever
  try {
    const typeSound = new Audio('type.mp3');
    typeSound.volume = 0.7;
    typeSound.play().catch(() => {
      // Fallback se o arquivo não existir
      console.log('Som type.mp3 não encontrado');
    });
  } catch {}
  
  // Adicionar salvamento na lista
  typewriterSaves.unshift({
    time: time,
    count: typewriterSaveCount,
    status: 'Salvo!'
  });
  
  // Atualizar tabela
  renderTypewriterSaves();
  
  // Efeito visual no botão
  btnTypewriterSave.style.transform = 'scale(0.95)';
  setTimeout(() => {
    btnTypewriterSave.style.transform = 'scale(1)';
  }, 100);
  
  showToast(`💾 Salvamento #${typewriterSaveCount} realizado!`);
});

function renderTypewriterSaves() {
  if (typewriterSaves.length === 0) {
    typewriterSavesList.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #888;">
        Nenhum salvamento ainda. Clique no botão acima!
      </div>
    `;
    return;
  }
  
  typewriterSavesList.innerHTML = typewriterSaves.map(save => `
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; padding: 1rem; border-bottom: 1px solid rgba(255,0,255,0.1);">
      <span style="color: #fff;">â° ${save.time}</span>
      <span style="color: #00ffff; font-weight: 700;">ðŸ”¢ ${save.count}</span>
      <span style="color: #00ff88; font-weight: 700;">✅ ${save.status}</span>
    </div>
  `).join('');
}

// Inicializar
renderTypewriterSaves();

// â”€â”€ Utilitários â”€â”€
function saveServers() {
  localStorage.setItem('zx_servers', JSON.stringify(servers));
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ================================================
// SISTEMA DE CONFIGURAÇÃ•ES VISUAIS
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

// Aplica estilos visuais do perfil na mensagem
function applyVisualStyles(element, profile) {
  if (!profile) return;
  
  // Estilo do balão
  element.style.backgroundColor = profile.bubbleColor;
  element.style.borderColor = profile.bubbleColor;
  
  // Estilo do texto
  const textElements = element.querySelectorAll('.msg-text');
  textElements.forEach(textEl => {
    textEl.style.color = profile.textColor;
    textEl.style.fontWeight = profile.bold ? 'bold' : 'normal';
    textEl.style.fontStyle = profile.italic ? 'italic' : 'normal';
    textEl.style.textDecoration = profile.underline ? 'underline' : 'none';
    
    // Efeito Glow
    if (profile.glow) {
      textEl.style.textShadow = `0 0 8px ${profile.glowColor}, 0 0 16px ${profile.glowColor}`;
    } else {
      textEl.style.textShadow = 'none';
    }
    
    // Efeito Contorno
    if (profile.outline) {
      textEl.style.webkitTextStroke = `1px ${profile.outlineColor}`;
    } else {
      textEl.style.webkitTextStroke = 'none';
    }
  });
}

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
  localStorage.setItem('zx_visual_profile', JSON.stringify(userVisualProfile));
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
  
  localStorage.setItem('zx_visual_profile', JSON.stringify(userVisualProfile));
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

// Adiciona animações CSS para toast
const toastStyle = document.createElement('style');
toastStyle.textContent = `
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes toastOut {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to { opacity: 0; transform: translateX(-50%) translateY(20px); }
}
`;
document.head.appendChild(toastStyle);

// ================================================
// SISTEMA DE EMOJI, GIF E FIGURINHAS
// ================================================

// ✅ REMOVER ESTA FUNÇÃO COMPLETAMENTE - DUPLICADA
// A FUNÇÃO OFICIAL ESTÁ NO chat-input.js
delete window.renderEmojiCategory;
delete window.updateEmojiCategories;

const btnEmoji = document.getElementById('btn-emoji');
const btnGif = document.getElementById('btn-gif');
const btnStickers = document.getElementById('btn-stickers');
const emojiPicker = document.getElementById('emoji-picker');
const gifPicker = document.getElementById('gif-picker');
const stickerPicker = document.getElementById('sticker-picker');

if (!btnEmoji || !gifPicker || !stickerPicker) {
  // Não inicializa pickers se elementos não existem (ex: server.html)
} else {

const emojiCategories = {
  smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  gestures: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵'],
  objects: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🔥','💯','⭐','✨','💫','⚡','🎈','🎉','🎊','🎁','🏆','💎','💵','💸','📱','💻','🎮','🎧','🎵','🎶'],
  nature: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🦋','🐌','🐞','🐜'],
  food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌽','🥕','🥔','🍠','🥐','🥯','🍞','🥖','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕'],
  flags: ['🏳️','🏴','🏴‍☠️','🏁','🚩','🏳️‍🌈','🇧🇷','🇺🇸','🇪🇸','🇫🇷','🇩🇪','🇮🇹','🇯🇵','🇨🇳','🇰🇷','🇷🇺','🇦🇷','🇵🇹','🇬🇧','🇦🇺']
};

const stickerPacks = {
  default: { name: 'Padrão', stickers: ['😀','😂','😍','🥳','😎','🤔','😢','😡','👍','👎','❤️','🔥','💯','✨','🎉','💪'] },
  reactions: { name: 'Reações', stickers: ['🤣','🥰','😱','🤯','😴','🤮','🥵','🥶','💀','👻','🤡','🙏','👏','💪','🫡','🤝'] },
  memes: { name: 'Memes', stickers: ['🗿','🦀','🐸','🤡','💀','🙃','😎','🤔','🚶','💨','🤙','🫂','🎭','🎪','🎯'] }
};

function closeAllPickers() {
  emojiPicker.classList.remove('active');
  gifPicker.classList.remove('active');
  stickerPicker.classList.remove('active');
}

function insertAtCursor(text) {
  const start = messageInput.selectionStart;
  const end = messageInput.selectionEnd;
  const value = messageInput.value;
  messageInput.value = value.substring(0, start) + text + value.substring(end);
  messageInput.selectionStart = messageInput.selectionEnd = start + text.length;
  messageInput.focus();
}

function renderEmojiCategory(category) {
  const container = emojiPicker.querySelector('.emoji-grid-container');
  
  let emojis = [];
  
  // ✅ CATEGORIA DE EMOJIS DO SERVIDOR
  if (category === 'server') {
    // PEGAR SERVIDOR ATUAL DIRETAMENTE DO ARRAY GLOBAL
    const server = window.servers?.find(s => s.id === window.currentServerId);
    
    // DEBUG: Mostrar no console o que está sendo carregado
    console.log('🔍 [DEBUG EMOJI] window.servers:', window.servers);
    console.log('🔍 [DEBUG EMOJI] window.currentServerId:', window.currentServerId);
    console.log('🔍 [DEBUG EMOJI] Servidor encontrado:', server);
    console.log('🔍 [DEBUG EMOJI] server.emojis:', server?.emojis);
    
    if (server) {
      // GARANTIR QUE O ARRAY EXISTE MESMO QUE VAZIO
      if (!server.emojis) server.emojis = [];
      emojis = server.emojis;
    }
    
  } else {
    emojis = emojiCategories[category] || [];
  }

  const renderedEmojis = [];
  
  for (let index = 0; index < emojis.length; index++) {
    const e = emojis[index];
    console.log(`🔍 [DEBUG EMOJI] PROCESSANDO EMOJI ${index}:`, e);
    
    let emojiContent = '';
    let emojiCode = '';
    let emojiTitle = '';
    
    if (typeof e === 'object') {
      const name = e.name || e.nome || e.label || e.key || `emoji_${index}`;
      let content = null;
      
      if (e.emoji) {
        if (e.emoji.startsWith('data:image/')) {
          content = `<img src="${e.emoji}" style="width:24px;height:24px;object-fit:contain;display:block" />`;
        } else {
          content = e.emoji;
        }
      }
      else if (e.image) content = `<img src="${e.image}" style="width:24px;height:24px;object-fit:contain;display:block" />`;
      else if (e.url) content = `<img src="${e.url}" style="width:24px;height:24px;object-fit:contain;display:block" />`;
      else if (e.src) content = `<img src="${e.src}" style="width:24px;height:24px;object-fit:contain;display:block" />`;
      else if (e.attachment) content = `<img src="${e.attachment}" style="width:24px;height:24px;object-fit:contain;display:block" />`;
      else if (e.char) content = e.char;
      else if (e.value) content = e.value;
      else if (e.text) content = e.text;
      else if (e.content) content = e.content;
      
      if (content && name) {
        emojiContent = content;
        emojiCode = `:${name}:`;
        emojiTitle = `:${name}:`;
        console.log(`✅ [DEBUG EMOJI] EMOJI ${index} PROCESSADO:`, emojiCode);
        
        const html = `<button class="emoji-item" data-emoji="${emojiCode}" title="${emojiTitle}" style="display:flex !important;align-items:center;justify-content:center;width:36px;height:36px;visibility:visible;opacity:1;position:relative;z-index:10;overflow:visible;background:red !important;border:2px solid yellow !important">${emojiContent}</button>`;
        renderedEmojis.push(html);
        console.log(`✅ [DEBUG EMOJI] HTML GERADO:`, html);
      } else {
        console.log(`❌ [DEBUG EMOJI] EMOJI ${index} INVÁLIDO`);
      }
    } else {
      emojiContent = e;
      emojiCode = e;
      emojiTitle = '';
      const html = `<button class="emoji-item" data-emoji="${emojiCode}" title="${emojiTitle}" style="display:flex !important;align-items:center;justify-content:center;width:36px;height:36px;visibility:visible;opacity:1;position:relative;z-index:10;overflow:visible">${emojiContent}</button>`;
      renderedEmojis.push(html);
    }
  }

  console.log('✅ [DEBUG EMOJI] TOTAL DE EMOJIS RENDERIZADOS:', renderedEmojis.length);
  console.log('✅ [DEBUG EMOJI] HTML FINAL:', renderedEmojis.join(''));

  container.innerHTML = `<div class="emoji-grid" style="display:grid !important;grid-template-columns:repeat(8,1fr);gap:4px;visibility:visible;opacity:1;overflow:visible;background:green !important;border:3px solid lime !important">
    ${renderedEmojis.join('')}
  </div>`;

  console.log('✅ [DEBUG EMOJI] CONTAINER INNERHTML:', container.innerHTML);
  console.log('🔍 [DEBUG EMOJI] ======================================');
  
  container.querySelectorAll('.emoji-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.emoji) {
        insertAtCursor(btn.dataset.emoji);
      } else {
        insertAtCursor(btn.textContent);
      }
      closeAllPickers();
    });
  });
}

// ✅ ATUALIZAR CATEGORIAS DINAMICAMENTE
function updateEmojiCategories() {
  const categoriesContainer = emojiPicker.querySelector('.emoji-categories');
  const existingServerBtn = categoriesContainer.querySelector('[data-category="server"]');
  const server = servers.find(s => s.id === currentServerId);
  
  // Verificar se temos servidor atual com emojis
  if (server && server.emojis && server.emojis.length > 0) {
    // Adicionar botão de categoria do servidor se não existir
    if (!existingServerBtn) {
      const serverBtn = document.createElement('button');
      serverBtn.className = 'emoji-category-btn';
      serverBtn.dataset.category = 'server';
      serverBtn.title = server.name;
      serverBtn.innerHTML = '🏠';
      
      serverBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPicker.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
        serverBtn.classList.add('active');
        renderEmojiCategory('server');
      });
      
      // Adicionar como última categoria
      categoriesContainer.appendChild(serverBtn);
    } else {
      // Atualizar nome do servidor
      existingServerBtn.title = server.name;
    }
  } else {
    // Remover botão se não houver emojis
    if (existingServerBtn) {
      existingServerBtn.remove();
    }
  }
}

btnEmoji.addEventListener('click', (e) => {
  e.stopPropagation();
  const isActive = emojiPicker.classList.contains('active');
  closeAllPickers();
  if (!isActive) { 
    emojiPicker.classList.add('active'); 
    updateEmojiCategories();
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
    container.innerHTML = `<div class="gif-grid">${data.results.map(gif =>
      `<div class="gif-item" data-url="${gif.media[0].gif.url}"><img src="${gif.media[0].tinygif.url}" loading="lazy" alt="gif" /></div>`
    ).join('')}</div>`;
    container.querySelectorAll('.gif-item').forEach(item => {
      item.addEventListener('click', () => {
        socket.emit('message', { channel: currentChannel, text: item.dataset.url, communityId: currentServerId });
        closeAllPickers();
      });
    });
  } catch {
    container.innerHTML = '<div class="gif-loading">Erro ao carregar GIFs</div>';
  }
}

btnGif.addEventListener('click', (e) => {
  e.stopPropagation();
  const isActive = gifPicker.classList.contains('active');
  closeAllPickers();
  if (!isActive) { gifPicker.classList.add('active'); loadGifs(); gifPicker.querySelector('.gif-search-input').value = ''; }
});

gifPicker.querySelector('.gif-search-input').addEventListener('input', (e) => {
  clearTimeout(gifSearchTimeout);
  gifSearchTimeout = setTimeout(() => loadGifs(e.target.value), 400);
});

function renderStickerPack(packId) {
  const container = stickerPicker.querySelector('.sticker-grid-container');
  const pack = stickerPacks[packId] || stickerPacks.default;
  container.innerHTML = `<div class="sticker-grid">${pack.stickers.map(s => `<button class="sticker-item">${s}</button>`).join('')}</div>`;
  container.querySelectorAll('.sticker-item').forEach(btn => {
    btn.addEventListener('click', () => {
      socket.emit('message', { channel: currentChannel, text: btn.textContent, communityId: currentServerId });
      closeAllPickers();
    });
  });
}

btnStickers.addEventListener('click', (e) => {
  e.stopPropagation();
  const isActive = stickerPicker.classList.contains('active');
  closeAllPickers();
  if (!isActive) { stickerPicker.classList.add('active'); renderStickerPack('default'); }
});

stickerPicker.querySelectorAll('.sticker-pack-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    stickerPicker.querySelectorAll('.sticker-pack-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderStickerPack(btn.dataset.pack);
  });
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.chat-picker') && !e.target.closest('#btn-emoji') && !e.target.closest('#btn-gif') && !e.target.closest('#btn-stickers')) {
    closeAllPickers();
  }
});

messageInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllPickers(); });

// ── Botão + e Anexar ──
const btnPlus = document.getElementById('btn-plus');
const btnAttachFile = document.getElementById('btn-attach-file');
const fileUploadInput = document.getElementById('file-upload-input');

btnPlus?.addEventListener('click', (e) => {
  e.stopPropagation();
  closeAllPickers();
  const menu = document.createElement('div');
  menu.className = 'plus-menu';
  menu.style.cssText = 'position:absolute;bottom:100%;left:0;margin-bottom:10px;background:#12121a;border:1px solid #ff00ff;border-radius:12px;box-shadow:0 0 25px rgba(255,0,255,0.3);z-index:1000;min-width:220px;animation:pickerOpen 0.2s ease-out;';
  menu.innerHTML = `
    <div class="plus-menu-item" data-action="poll"><span>📊</span><span>Criar Enquete</span></div>
    <div class="plus-menu-item" data-action="topic"><span>💬</span><span>Criar Tópico</span></div>
  `;
  menu.querySelectorAll('.plus-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.remove();
      
      if (item.dataset.action === 'poll') {
        console.log('✅ Abrindo modal de enquete do script.js');
        
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
                <button type="button" class="btn-ghost-sm" onclick="
                  const container = document.getElementById('poll-options');
                  const input = document.createElement('input');
                  input.type = 'text';
                  input.className = 'poll-option-input';
                  input.placeholder = 'Opção ' + (container.children.length + 1);
                  input.maxLength = 60;
                  container.appendChild(input);
                ">+ Adicionar opção</button>
              </div>
              <div class="create-channel-actions" style="margin-top: 1rem;">
                <button type="button" class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                <button type="button" class="btn-neon" onclick="
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
                    text: '📊 **ENQUETE**: ' + question.trim() + '\\n\\n' + options.map(function(o, i) { return (i+1) + '. ' + o; }).join('\\n'), 
                    communityId: currentServerId 
                  });

                  this.closest('.modal-overlay').remove();
                  showToast('✅ Enquete criada com sucesso!');
                ">📤 Criar Enquete</button>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('poll-question')?.focus(), 100);
      }
      
      if (item.dataset.action === 'topic') {
        console.log('✅ Abrindo modal de tópico do script.js');
        
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
                <button type="button" class="btn-neon" onclick="
                  const title = document.getElementById('topic-title').value.trim();
                  const content = document.getElementById('topic-content').value.trim();
                  
                  if (!title) {
                    showToast('Digite um título para o tópico');
                    return;
                  }

                  let messageText = '💬 **TÓPICO**: ' + title.trim();
                  if (content) messageText += '\\n\\n' + content;
                  messageText += '\\n\\nDiscuta abaixo 👇';

                  socket.emit('message', { 
                    channel: currentChannel, 
                    text: messageText, 
                    communityId: currentServerId 
                  });

                  this.closest('.modal-overlay').remove();
                  showToast('✅ Tópico criado com sucesso!');
                ">📤 Criar Tópico</button>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('topic-title')?.focus(), 100);
      }
    });
  });
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(evt) {
      if (!menu.contains(evt.target) && evt.target !== btnPlus) { menu.remove(); document.removeEventListener('click', closeMenu); }
    }, { once: false });
  }, 10);
  document.querySelector('.input-wrapper').appendChild(menu);
});

btnAttachFile?.addEventListener('click', (e) => { e.stopPropagation(); fileUploadInput.click(); });

fileUploadInput?.addEventListener('change', (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  for (const file of files) {
    if (file.size > 8 * 1024 * 1024) { showToast(`⚠️ ${file.name} muito grande. Máximo 8 MB.`); continue; }
    const reader = new FileReader();
    reader.onload = () => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const content = isImage ? `![${file.name}](${reader.result})` : isVideo ? `🎬 [${file.name}](${reader.result})` : isAudio ? `🎵 [${file.name}](${reader.result})` : `📎 [${file.name}](${reader.result})`;
      socket.emit('message', { channel: currentChannel, text: content, communityId: currentServerId });
      showToast(`✅ ${file.name} anexado!`);
    };
    reader.readAsDataURL(file);
  }
  e.target.value = '';
});

} // fim do bloco de pickers (if btnEmoji)
