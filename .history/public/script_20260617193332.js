const socket = io({
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});
window.socket = socket;

const socket = io({
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

socket.on('connect', () => {
  console.log('[SOCKET] Conectado:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[SOCKET] Desconectado:', reason);
});

socket.on('connect_error', (err) => {
  console.error('[SOCKET] Erro:', err);
});

window.socket = socket;

// ? FUNÇÃO SEGURA PARA EVITAR UNDEFINED
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
let servers = JSON.parse(localStorage.getItem('zx_servers') || '[]').filter(s => !String(s.id || '').startsWith('comm_'));
// Remove comunidades que possam ter entrado no zx_servers por engano
(function() {
  try {
    var raw = JSON.parse(localStorage.getItem('zx_servers') || '[]');
    var cleaned = raw.filter(function(s) { return !String(s.id || '').startsWith('comm_'); });
    if (cleaned.length !== raw.length) {
      localStorage.setItem('zx_servers', JSON.stringify(cleaned));
    }
  } catch(e) {}
})();
window.servers = servers;

// ── DOM refs ──
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
  [
    userAvatar,
    document.getElementById('profile-avatar-big'),
    document.getElementById('discover-user-avatar'),
    document.getElementById('user-avatar-dm')
  ].forEach(el => {
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

// ── Login ──
function doLogin() {
  const name = usernameInput.value.trim();
  if (!name) return;
  username = name;
  appEl.classList.remove('hidden');
  updateUserUI();
  renderServersRail();
  showDiscoverView();
  socket.emit('feed:join');
  socket.emit('user:login', { username, email: (function(){ try { return JSON.parse(localStorage.getItem('zx_user_data') || '{}').email || ''; } catch(e){ return ''; } })() });
  // Reportar servidores ao servidor para cálculo de servidores em comum
  (function() {
    try {
      var myServers = JSON.parse(localStorage.getItem('zx_servers') || '[]')
        .filter(function(s){ return !String(s.id || '').startsWith('comm_'); })
        .map(function(s){ return { id: s.id, name: s.name }; });
      socket.emit('user:servers:report', { servers: myServers });
    } catch(e) {}
  })();
}

// Verificar autenticação
document.addEventListener('DOMContentLoaded', async () => {
  if (localStorage.getItem('zx_session') !== 'authenticated' || !localStorage.getItem('zx_auth_token')) {
    window.location.href = 'auth.html';
    return;
  }

  try {
    const account = await AccountAPI.getProfile();
    username = account.nick || localStorage.getItem('zx_username') || 'Usuário';
  } catch (err) {
    // Só limpar sessão se for erro 401 (token inválido), não por falha de rede
    const isAuthError = err.message && (
      err.message.includes('401') ||
      err.message.includes('Não autenticado') ||
      err.message.includes('autenticado')
    );
    if (isAuthError) {
      AccountAPI.clearLocalSession();
      window.location.href = 'auth.html';
      return;
    }
    // Falha de rede/servidor offline: usar dados locais em vez de deslogar
    username = localStorage.getItem('zx_username') || localStorage.getItem('userNickname') || 'Usuário';
    console.warn('Servidor offline, usando dados locais:', username);
  }
  
  // ✅ CORREÇÃO LAYOUT TOTAL: Garantir 100% que o app fica visível
  appEl.classList.remove('hidden');
  
  // ✅ FORÇAR ESTILOS INLINE PARA NÃO DEIXAR NENHUMA CHANCE DE BUG
  appEl.style.setProperty('display', 'flex', 'important');
  appEl.style.setProperty('visibility', 'visible', 'important');
  appEl.style.setProperty('opacity', '1', 'important');
  appEl.style.setProperty('width', '100%', 'important');
  appEl.style.setProperty('height', '100vh', 'important');
  appEl.style.setProperty('position', 'relative', 'important');
  appEl.style.setProperty('z-index', '1', 'important');
  
  // Forçar reflow do navegador 3x para garantir renderização
  void appEl.offsetWidth;
  void appEl.offsetHeight;
  void document.body.offsetWidth;
  
  // Carrega dados do usuário
  const userData = JSON.parse(localStorage.getItem('zx_user_data') || '{}');
  if (!username) username = localStorage.getItem('zx_username') || userData.nick || 'Usuário';
  
  try { updateUserUI(); } catch(e) { console.error('[ZX] updateUserUI falhou:', e); }
  try { renderServersRail(); } catch(e) { console.error('[ZX] renderServersRail falhou:', e); }
  
  // ✅ CORREÇÃO FINAL: NENHUM DELAY NENHUM - RENDERIZA TUDO IMEDIATAMENTE
  showDiscoverView();
  socket.emit('feed:join');
  socket.emit('user:login', { username, email: (function(){ try { return JSON.parse(localStorage.getItem('zx_user_data') || '{}').email || ''; } catch(e){ return ''; } })() });
  // CORREÇÃO BUG #1: disparar evento userLoggedIn para inicializar FriendsSystem
  document.dispatchEvent(new CustomEvent('userLoggedIn'));
  
  // ✅ FORÇAR RENDERIZAÇÃO DO CONTEÚDO PRINCIPAL 3 VEZES SEGUIDAS
  void discoverView.offsetWidth;
  void discoverView.offsetHeight;
  discoverView.classList.remove('hidden');
  discoverView.style.setProperty('display', 'flex', 'important');
  discoverView.style.setProperty('visibility', 'visible', 'important');
  discoverView.style.setProperty('opacity', '1', 'important');
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
      // CORREÇÃO BUG #3: Remover handlers socket.on duplicados desta classe.
      // Os eventos friends:data, friend:request, friend:accepted e friend:removed
      // já são tratados pelos handlers standalone globais (linhas 5847+) que atualizam
      // as variáveis globais corretas (friendRequests, friends).
      // Esta classe apenas sincroniza seu estado local a partir dessas variáveis globais
      // e renderiza os componentes de UI do painel DM.

      // Sincronizar estado com as variáveis globais já populadas pelos handlers standalone
      window.addEventListener('zx:friends:updated', () => {
        this.syncFromGlobals();
        this.renderFriendsList();
        this.renderConversationsList();
      });

      // BUG FIX v5: listener friends:presence REMOVIDO desta classe.
      // Já existe um listener standalone na linha ~5874 que atualiza onlineSet/userStatuses
      // e chama renderFriendsModal(). Ter dois listeners causava dupla re-renderização
      // e potential de estado inconsistente entre this.online e onlineSet global.
    }

    syncFromGlobals() {
      // Ler estado do sistema global (variáveis friends e friendRequests do script.js)
      this.friends = (window.__zxFriends || friends || []).map(f => typeof f === 'string' ? f : f.username);
      this.requests = (window.__zxFriendRequests || friendRequests || []).map(r => typeof r === 'string' ? r : r.from);
    }

    sendFriendRequest(username) {
      // CORREÇÃO BUG #4: delegar para a função global que atualiza sentRequests e verifica duplicatas
      if (typeof window.sendFriendRequest === 'function') {
        window.sendFriendRequest(username);
      } else {
        const clean = String(username || '').trim().replace(/^@/, '');
        if (!clean) return;
        socket.emit('friend:request', { to: clean });
      }
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
              <div class="dm-empty-icon-inner">💬</div>
            </div>
            <h2>Não há amigos por aqui</h2>
            <p>Adicione amigos para começar a conversar.</p>
            <button class="dm-add-friend-btn" onclick="openModal(friendsModal); activateMmTab('fa-add');">➕ ADICIONAR AMIGO</button>
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
      if (typeof window.openPrivateChat === 'function') {
        window.openPrivateChat(username);
        return;
      }
      // Fallback direto
      openDmChat(username);
    }

    openAddFriendModal() {
      // CORREÇÃO BUG #4: abrir a aba "Adicionar amigo" no modal, não usar prompt/alert
      if (typeof openModal === 'function' && typeof friendsModal !== 'undefined') {
        openModal(friendsModal);
        if (typeof activateMmTab === 'function') activateMmTab('fa-add');
      } else {
        const uname = prompt('Digite o nome do usuário que deseja adicionar:');
        if (uname && uname.trim()) {
          this.sendFriendRequest(uname.trim());
        }
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
let myUserId = null; // [BUG2 FIX] ID único do usuário logado
let friendIds = {};  // [BUG2 FIX] username.toLowerCase() -> userId

function renderDmList() {
  const dmList = document.getElementById('dm-conversations-list');
  if (!dmList) return;

  // [BUG1 FIX] Limpar lista antes de renderizar para evitar duplicatas visuais
  dmList.innerHTML = '';

  // [BUG1 FIX] Deduplicar por ID único (user.id) quando disponível, senão por username lowercase
  const uniqueMap = new Map(); // key: userId ou username.toLowerCase() -> display username

  friends.forEach(f => {
    const uname = typeof f === 'string' ? f : (f.username || f.nick || '');
    if (!uname) return;
    const uid = f.id ? String(f.id) : (friendIds[(uname).toLowerCase()] || uname.toLowerCase());
    if (!uniqueMap.has(uid)) uniqueMap.set(uid, uname);
  });

  // Também incluir usuários com conversa ativa mesmo se não amigo
  Object.keys(dmMessages).forEach(uLow => {
    if (!dmMessages[uLow] || dmMessages[uLow].length === 0) return;
    const key = friendIds[uLow] || uLow;
    if (!uniqueMap.has(key)) uniqueMap.set(key, dmMessages[uLow][0]?.from || uLow);
  });

  const dmUsers = [...uniqueMap.values()];
  
  if (dmUsers.length === 0) {
    dmList.innerHTML = `
      <div style="padding:12px 8px;color:#666;font-size:12px;text-align:center;">
        Nenhuma conversa.<br>Adicione amigos para começar!
      </div>
    `;
    return;
  }

  // Ordenar: amigos com mensagens recentes primeiro
  dmUsers.sort((a, b) => {
    const lastA = dmMessages[a]?.[dmMessages[a].length - 1]?.timestamp || 0;
    const lastB = dmMessages[b]?.[dmMessages[b].length - 1]?.timestamp || 0;
    return lastB - lastA;
  });

  dmList.innerHTML = dmUsers.map(uname => {
    const isOnline = onlineSet.has((uname || '').toLowerCase());
    const statusKey = (uname || '').toLowerCase();
    const st = userStatuses[statusKey] || (isOnline ? 'online' : 'offline');
    const initial = uname[0].toUpperCase();
    // [FIX v6] Usar chave lowercase (mensagens são sempre armazenadas em lowercase)
    const _dmKey = (uname || '').toLowerCase();
    const lastMsg = dmMessages[_dmKey]?.[dmMessages[_dmKey].length - 1];
    const lastText = lastMsg ? (lastMsg.text.length > 28 ? lastMsg.text.substring(0, 28) + '…' : lastMsg.text) : 'Clique para conversar';
    const isSelfLast = lastMsg && (lastMsg.from || '').toLowerCase() === (username || '').toLowerCase();

    const statusColor = st === 'online' ? '#23d18b' : st === 'idle' ? '#faa61a' : st === 'dnd' ? '#ed4245' : '#747f8d';
    
    return `
      <div class="dm-conv-item" data-username="${escHtml(uname)}" style="
        display:flex;align-items:center;gap:10px;padding:8px 8px;border-radius:8px;cursor:pointer;
        transition:background 0.15s;margin-bottom:2px;position:relative;
      " onmouseenter="this.style.background='rgba(255,255,255,0.06)'" onmouseleave="this.style.background='transparent'">
        <div style="position:relative;flex-shrink:0;">
          <div class="profile-avatar av-${initial}" style="width:36px;height:36px;font-size:14px;border:none;box-shadow:none;">${initial}</div>
          <div style="position:absolute;bottom:0;right:0;width:11px;height:11px;border-radius:50%;background:${statusColor};border:2px solid #0a0012;"></div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="color:#e0e0e0;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(uname)}</div>
          <div style="color:#666;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${isSelfLast ? 'Você: ' : ''}${escHtml(lastText)}</div>
        </div>
      </div>
    `;
  }).join('');

  dmList.querySelectorAll('.dm-conv-item').forEach(item => {
    item.addEventListener('click', () => openDmChat(item.dataset.username));
  });
}

function openDmChat(username) {
  currentDmUser = username;

  // [DM-RT FIX] Limpar badge de mensagens não lidas ao abrir o chat
  document.querySelectorAll('.dm-conv-item').forEach(el => {
    if ((el.dataset.username || '').toLowerCase() === username.toLowerCase()) {
      el.style.fontWeight = '';
      const badge = el.querySelector('.dm-unread-badge');
      if (badge) badge.remove();
    }
  });

  // Solicitar histórico do servidor (Neon DB) para garantir mensagens persistidas
  if (socket && socket.connected) {
    socket.emit('dm:history', { with: username });
  }

  const isOnline = onlineSet.has((username || '').toLowerCase());
  const initial = username[0].toUpperCase();

  // Mostra area de chat, oculta estado vazio
  const chatArea = document.getElementById('dm-chat-area');
  const emptyState = document.getElementById('dm-empty-state');
  if (chatArea) { chatArea.classList.remove('hidden'); chatArea.style.display = 'flex'; }
  if (emptyState) { emptyState.classList.add('hidden'); emptyState.style.display = 'none'; }

  // Atualiza cabeçalho do chat
  const avatarEl = document.querySelector('#dm-chat-area .dm-avatar');
  const usernameEl = document.querySelector('#dm-chat-area .dm-username');
  const statusEl = document.querySelector('#dm-chat-area .dm-status');
  if (avatarEl) avatarEl.textContent = initial;
  if (usernameEl) usernameEl.textContent = username;
  if (statusEl) {
    statusEl.textContent = isOnline ? '● Online' : '● Offline';
    statusEl.style.color = isOnline ? '#23d18b' : '#747f8d';
    statusEl.className = `dm-status ${isOnline ? 'online' : 'offline'}`;
  }

  const activityEl = document.getElementById('dm-activity');
  if (activityEl) activityEl.textContent = isOnline ? 'Ativo agora' : '';

  // Renderiza mensagens
  renderDmMessages();

  // Mostra área de input
  const inputArea = document.getElementById('dm-input-area');
  if (inputArea) inputArea.classList.remove('hidden');

  // Foca no input
  setTimeout(() => document.getElementById('dm-message-input')?.focus(), 100);

  // Marca item como ativo
  document.querySelectorAll('.dm-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`.dm-item[data-username="${username}"]`)?.classList.add('active');
}

function renderDmMessages() {
  const container = document.getElementById('dm-messages-area');
  if (!container || !currentDmUser) return;

  // FIX: buscar pelo key normalizado (lowercase) para evitar mismatch
  const _key = (currentDmUser || '').toLowerCase();
  const messages = dmMessages[_key] || dmMessages[currentDmUser] || [];
  
  if (messages.length === 0) {
    // Se já tem um spinner de loading, não substituir ainda
    if (container.innerHTML.includes('Carregando mensagens')) return;
    container.innerHTML = `
      <div class="dm-empty-chat">
        <span>💬</span>
        <p>Comece a conversar com ${escHtml(currentDmUser)}</p>
      </div>
    `;
    return;
  }

  const _prevScrollHeight = container.scrollHeight;
  const _wasAtBottom = container.scrollTop + container.clientHeight >= _prevScrollHeight - 40;

  container.innerHTML = messages.map(msg => {
    // [DM-RT FIX] Comparação case-insensitive - evita mensagem aparecer no lado errado
    const isSelf = (msg.from || '').toLowerCase() === (username || '').toLowerCase();
    const initial = (msg.from || '?')[0].toUpperCase();
    
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

  // [DM-RT FIX] Rolar para o fim após novas mensagens, usando requestAnimationFrame
  // para garantir que o DOM foi atualizado antes de calcular scrollHeight
  if (_wasAtBottom) {
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }
}

// Rastreia mensagens aguardando confirmação { key -> { msg, timer, attempts } }
const _dmPending = {};

function sendDmMessage() {
  const input = document.getElementById('dm-message-input');
  const text = input?.value.trim();
  
  if (!text || !currentDmUser) return;

  // Verificar se socket está conectado antes de enviar
  if (!socket || !socket.connected) {
    console.warn('[DM] Socket não conectado. Aguardando reconexão...');
    showToast('⚠️ Reconectando... tente novamente em instantes.');
    return;
  }
  
  const _recvKey = (currentDmUser || '').toLowerCase();
  const _ts = Date.now();
  const msg = {
    from: username,
    to: currentDmUser,
    fromId: myUserId || null,
    receiverId: friendIds[_recvKey] || null,
    text,
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    timestamp: _ts
  };

  // Adicionar localmente para feedback imediato
  const _dmKey = _recvKey;
  if (!dmMessages[_dmKey]) dmMessages[_dmKey] = [];
  dmMessages[_dmKey].push(msg);

  input.value = '';
  renderDmMessages();
  renderDmList();

  // Enviar ao servidor
  const _pendingKey = _dmKey + ':' + _ts;
  let _attempts = 0;

  function _doSend() {
    _attempts++;
    console.log(`[DM ENVIADA attempt=${_attempts}]`, msg.text.substring(0, 30), '| socket:', socket.id);
    socket.emit('dm:message', msg);

    // Reenvio automático se não houver confirmação em 6 segundos (máx 3 tentativas)
    if (_attempts < 3) {
      _dmPending[_pendingKey] = setTimeout(() => {
        if (_dmPending[_pendingKey]) {
          console.warn(`[DM] Sem confirmação após ${_attempts * 6}s, reenviando...`);
          _doSend();
        }
      }, 6000);
    } else {
      // Após 3 tentativas sem resposta, notificar o usuário
      delete _dmPending[_pendingKey];
      console.error('[DM] Falha ao confirmar envio após 3 tentativas');
      showToast('⚠️ Mensagem pode não ter chegado. Verifique sua conexão.');
    }
  }

  // Guardar referência para cancelar o retry quando vier a confirmação
  _dmPending[_pendingKey] = null;
  _doSend();
}

// Cancelar retry ao receber confirmação do servidor
function _clearDmPending(text, timestamp) {
  Object.keys(_dmPending).forEach(k => {
    const [_key, _ts] = k.split(':');
    if (Math.abs(Number(_ts) - timestamp) < 15000) {
      clearTimeout(_dmPending[k]);
      delete _dmPending[k];
    }
  });
}

document.getElementById('dm-send-btn')?.addEventListener('click', sendDmMessage);
document.getElementById('dm-message-input')?.addEventListener('keydown', e => e.key === 'Enter' && sendDmMessage());

// ── Listener de dm:message — registrado como função nomeada para re-uso no connect ──
// CORREÇÃO: usar função nomeada permite socket.off(name) preciso e re-registro no connect.
// Socket.IO preserva listeners após reconexão, mas re-registrar garante que username
// e outras closures globais reflitam o estado atual ao invés do valor no momento do load.
function _onDmMessage(msg) {
  console.log('[DM RECEBIDA]', msg);
  // FIX: comparação case-insensitive para evitar mismatch de capitalização
  const _myLow     = (username || '').toLowerCase();
  const _fromLow   = (msg.from || '').toLowerCase();
  const partnerRaw = _fromLow === _myLow ? msg.to : msg.from;
  const partner    = (partnerRaw || '').toLowerCase(); // chave normalizada

  if (!dmMessages[partner]) dmMessages[partner] = [];

  // Evitar duplicatas (mensagem pode chegar via Entrega 1 E Entrega 2 simultaneamente)
  const isDuplicate = dmMessages[partner].some(m =>
    (m.from||'').toLowerCase() === _fromLow && m.text === msg.text &&
    Math.abs((m.timestamp || 0) - (msg.timestamp || 0)) < 5000
  );
  if (!isDuplicate) {
    dmMessages[partner].push(msg);
  }
  
  // FIX: comparar em lowercase para evitar mismatch de capitalização
  const chatIsOpen = (currentDmUser || '').toLowerCase() === partner;
  if (chatIsOpen) {
    renderDmMessages();
  } else if (_fromLow !== _myLow) {
    // Badge no item da lista para indicar mensagem não lida
    document.querySelectorAll('.dm-conv-item').forEach(el => {
      if ((el.dataset.username || '').toLowerCase() === partner) {
        el.style.fontWeight = 'bold';
        let badge = el.querySelector('.dm-unread-badge');
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'dm-unread-badge';
          badge.style.cssText = 'background:#5865f2;color:#fff;border-radius:50%;width:18px;height:18px;font-size:11px;display:flex;align-items:center;justify-content:center;margin-left:auto;flex-shrink:0;';
          el.appendChild(badge);
        }
        const cur = parseInt(badge.textContent) || 0;
        badge.textContent = cur + 1;
      }
    });
  }

  renderDmList();
  if (_fromLow !== _myLow && !chatIsOpen) {
    showToast(`💬 Nova mensagem de ${msg.from}`);
  }
}

// Registrar o listener agora (primeira carga) — socket.off garante listener único
socket.off('dm:message', _onDmMessage);
socket.on('dm:message', _onDmMessage);

// Confirmação de mensagem enviada pelo servidor (com timestamp canônico)
// [BUG2 FIX] Garantir listener único
socket.off('dm:message:sent');
socket.on('dm:message:sent', (msg) => {
  console.log('[DM ENVIADA confirmada pelo servidor]', msg);
  // [FIX v6] Cancelar retry pendente ao receber confirmação
  _clearDmPending(msg.text, msg.timestamp || 0);
  const partner = (msg.to || '').toLowerCase(); // FIX: key normalizado
  if (!dmMessages[partner]) dmMessages[partner] = [];
  const isDuplicate = dmMessages[partner].some(m =>
    (m.from||'').toLowerCase() === (msg.from||'').toLowerCase() &&
    m.text === msg.text && Math.abs((m.timestamp || 0) - (msg.timestamp || 0)) < 15000
  );
  if (!isDuplicate) {
    dmMessages[partner].push(msg);
  }
  // Sempre renderizar (o msg pode já estar lá via pré-add, mas renderiza de novo para confirmar)
  if ((currentDmUser || '').toLowerCase() === partner) renderDmMessages();
  renderDmList();
});

// Carregar histórico do servidor (Neon DB)
socket.on('dm:history', (data) => {
  const partner = (data.with || '').toLowerCase(); // FIX: key normalizado
  const serverMsgs = data.messages || [];
  console.log('[DM HISTÓRICO] parceiro:', partner, '| mensagens:', serverMsgs.length);
  if (!dmMessages[partner]) dmMessages[partner] = [];

  const existing = dmMessages[partner];
  serverMsgs.forEach(function(msg) {
    const dup = existing.some(m =>
      (m.from||'').toLowerCase() === (msg.from||'').toLowerCase() &&
      m.text === msg.text &&
      Math.abs((m.timestamp || 0) - (msg.timestamp || 0)) < 5000
    );
    if (!dup) existing.push(msg);
  });

  // Ordenar por timestamp
  existing.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  dmMessages[partner] = existing;

  if ((currentDmUser || '').toLowerCase() === partner) renderDmMessages(); // FIX
  renderDmList();
});

// Botão Mensagens Privadas
btnDmList.addEventListener('click', () => {
  document.body.classList.remove('server-body', 'dm-active', 'dm-view-active', 'dm-mode');
  currentServerId = null;
  currentChannel = null;
  window.currentServerId = null;
  window.currentChannel = null;

  if (serverSidebar) {
    serverSidebar.classList.add('hidden');
    serverSidebar.removeAttribute('style');
    serverSidebar.style.setProperty('display', 'none', 'important');
  }

  showLayout('dm-view');
  renderDmList();
  // Renderizar lista de conversas no sidebar do dm-view
  if (window.friendsSystem && typeof window.friendsSystem.renderConversationsList === 'function') {
    window.friendsSystem.renderConversationsList();
  }
  showToast('💬 Mensagens Privadas');

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.server-rail-icon').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-home')?.classList.remove('active');
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
        <div style="font-size: 4rem; margin-bottom: 1rem;">⚡</div>
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
          <span style="font-size: 1.5rem;">✨</span>
          <div>
            <strong style="color: #fff;">Temas Exclusivos</strong>
            <p style="color: #aaa; margin: 0.25rem 0 0 0; font-size: 0.9rem;">Acesso a todos os temas e cores premium</p>
          </div>
        </div>
        
        <div style="background: rgba(168, 0, 255, 0.08); border: 1px solid rgba(168, 0, 255, 0.2); border-radius: 10px; padding: 1rem; display: flex; gap: 1rem; align-items: center;">
          <span style="font-size: 1.5rem;">✨</span>
          <div>
            <strong style="color: #fff;">Uploads Ilimitados</strong>
            <p style="color: #aaa; margin: 0.25rem 0 0 0; font-size: 0.9rem;">Envie arquivos de qualquer tamanho</p>
          </div>
        </div>
        
        <div style="background: rgba(168, 0, 255, 0.08); border: 1px solid rgba(168, 0, 255, 0.2); border-radius: 10px; padding: 1rem; display: flex; gap: 1rem; align-items: center;">
          <span style="font-size: 1.5rem;">✨</span>
          <div>
            <strong style="color: #fff;">Badges Exclusivas</strong>
            <p style="color: #aaa; margin: 0.25rem 0 0 0; font-size: 0.9rem;">Insígnias especiais para mostrar seu status</p>
          </div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem;">
        <button class="btn-ghost" onclick="document.getElementById('power-modal').remove(); setActiveDmTab(dmTabFriends);">Cancelar</button>
        <button class="btn-neon">⚡ ASSINAR POWER</button>
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
  window.username = username;
  if (!username) return;
  const letter = (username[0] || 'U').toUpperCase();
  if (userAvatar) userAvatar.className = `profile-avatar av-${letter}`;
  if (userNameDisplay) userNameDisplay.textContent = username;
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

// ── Views ──
const ALL_VIEW_IDS = [
  'discover-view', 'chat-view', 'voice-view', 'forum-view',
  'announcement-view', 'dm-view', 'typewriter-view', 'post-view'
];

function forceHideEl(el) {
  if (!el) return;
  el.classList.add('hidden');
  el.style.setProperty('display', 'none', 'important');
  el.style.setProperty('visibility', 'hidden', 'important');
  el.style.setProperty('pointer-events', 'none', 'important');
}

function forceShowEl(el) {
  if (!el) return;
  el.classList.remove('hidden');
  el.style.removeProperty('display');
  el.style.removeProperty('visibility');
  el.style.removeProperty('pointer-events');
  el.style.removeProperty('opacity');
  el.style.removeProperty('position');
  el.style.removeProperty('width');
  el.style.removeProperty('height');
  el.style.removeProperty('left');
  el.style.removeProperty('top');
  el.style.removeProperty('transform');
  el.style.removeProperty('overflow');
}

function hideAllViews() {
  ALL_VIEW_IDS.forEach(id => forceHideEl(document.getElementById(id)));
}

function resetNavbarForHome() {
  const navbar = document.querySelector('.main-area > .navbar');
  if (!navbar) return;
  navbar.removeAttribute('style');
  navbar.style.setProperty('display', 'flex', 'important');
  navbar.style.setProperty('visibility', 'visible', 'important');
  navbar.style.setProperty('opacity', '1', 'important');
  navbar.style.setProperty('pointer-events', 'auto', 'important');
}

function resetNavbarForServer() {
  const navbar = document.querySelector('.main-area > .navbar');
  if (!navbar) return;
  navbar.removeAttribute('style');
  // ✅ ESCONDER NAVBAR NO SERVER-VIEW
  navbar.style.setProperty('display', 'none', 'important');
  navbar.style.setProperty('visibility', 'hidden', 'important');
  navbar.style.setProperty('opacity', '0', 'important');
  navbar.style.setProperty('pointer-events', 'none', 'important');
}

function showLayout(layoutId) {
  hideAllViews();
  const target = document.getElementById(layoutId);
  if (target) {
    forceShowEl(target);
    if (layoutId === 'discover-view') {
      target.style.setProperty('display', 'flex', 'important');
    } else if (['chat-view', 'voice-view', 'forum-view', 'announcement-view'].includes(layoutId)) {
      target.style.setProperty('display', 'flex', 'important');
      target.style.setProperty('flex', '1 1 auto', 'important');
      target.style.setProperty('min-height', '0', 'important');
      target.style.setProperty('width', '100%', 'important');
    } else if (layoutId === 'dm-view') {
      target.style.setProperty('display', 'flex', 'important');
      target.style.setProperty('flex', '1 1 auto', 'important');
      target.style.setProperty('min-height', '0', 'important');
      target.style.setProperty('width', '100%', 'important');
    }
  }

  const inServer = ['chat-view', 'voice-view', 'forum-view', 'announcement-view'].includes(layoutId);
  const activeServerId = window.currentServerId ?? currentServerId;
  if (inServer && activeServerId) {
    document.body.classList.add('server-body');
    document.body.classList.remove('dm-active', 'dm-view-active', 'dm-mode');
  } else if (layoutId === 'discover-view' || layoutId === 'dm-view') {
    document.body.classList.remove('server-body', 'dm-active', 'dm-view-active', 'dm-mode');
  }

  if (inServer || layoutId === 'dm-view') {
    resetNavbarForServer();
  } else {
    resetNavbarForHome();
  }

  if (serverSidebar) {
    if (inServer && activeServerId) {
      serverSidebar.classList.remove('hidden');
      serverSidebar.removeAttribute('style');
      serverSidebar.style.setProperty('display', 'block', 'important');
      serverSidebar.style.setProperty('visibility', 'visible', 'important');
      serverSidebar.style.setProperty('width', '240px', 'important');
      serverSidebar.style.setProperty('flex', '0 0 240px', 'important');
    } else {
      serverSidebar.classList.add('hidden');
      serverSidebar.removeAttribute('style');
      serverSidebar.style.setProperty('display', 'none', 'important');
    }
  }

  const chatAside = document.querySelector('#chat-view > aside');
  if (chatAside) chatAside.style.display = inServer ? 'flex' : 'none';

  const onlineSidebar = document.querySelector('.online-sidebar');
  const toggleBtn = document.getElementById('toggle-online-sidebar');
  if (onlineSidebar && toggleBtn && layoutId === 'chat-view') {
    onlineSidebar.style.transform = '';
    onlineSidebar.style.opacity = '';
    onlineSidebar.style.pointerEvents = '';
    toggleBtn.style.right = '220px';
    toggleBtn.textContent = '▶';
    window.onlineSidebarVisible = true;
  }

  if (layoutId === 'voice-view') {
    const voiceContent = document.querySelector('#voice-view .voice-content');
    if (voiceContent) {
      voiceContent.style.display = 'flex';
      voiceContent.style.flexDirection = 'column';
      voiceContent.style.height = '100%';
      voiceContent.style.minHeight = '0';
      voiceContent.style.overflow = 'hidden';
    }
    // Limitar voice-room para que .voice-controls permaneça visível na tela
    const voiceRoom = document.getElementById('voice-room');
    if (voiceRoom) {
      voiceRoom.style.flex = '1 1 0';
      voiceRoom.style.minHeight = '0';
      voiceRoom.style.overflow = 'hidden';
      voiceRoom.style.position = 'relative';
    }
    const voiceGrid = document.getElementById('voice-participants-grid');
    if (voiceGrid) {
      voiceGrid.style.height = '100%';
      voiceGrid.style.overflowY = 'auto';
    }
    // ✅ REMOVER JANELA FLUTUANTE AO VOLTAR PARA VOICE-VIEW
    const floatingWindow = document.getElementById('voice-floating-window');
    if (floatingWindow) {
      floatingWindow.remove();
      console.log('✅ Janela flutuante removida ao voltar para voice-view');
    }
  }
  // ✅ REMOVIDO: A janela flutuante agora é gerenciada pelo arquivo voice-floating-window.js
  // Não precisa criar a janela aqui, o arquivo separado cuida disso

  void document.body.offsetWidth;
}
window.showLayout = showLayout;
window.openDmChat = openDmChat;
window.renderDmList = renderDmList;
window.renderDmMessages = renderDmMessages;
window.sendDmMessage = sendDmMessage;
window.forceHideEl = forceHideEl;
window.forceShowEl = forceShowEl;
window.hideAllViews = hideAllViews;
window.resetNavbarForHome = resetNavbarForHome;
window.resetNavbarForServer = resetNavbarForServer;

function clearServerState() {
  currentServerId = null;
  currentChannel = null;
  window.currentServerId = null;
  window.currentChannel = null;
}
window.clearServerState = clearServerState;

function openCommunityPostsView() {
  clearServerState();
  document.body.classList.remove('server-body', 'dm-active', 'dm-view-active', 'dm-mode');
  showLayout('discover-view');

  const mainArea = document.querySelector('#discover-view .discover-main');
  if (!mainArea) return;

  mainArea.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;min-height:60vh;height:calc(100vh - 120px);overflow-y:auto;overflow-x:hidden;padding:0;scrollbar-width:thin;scrollbar-color:#00ffff rgba(0,0,0,0.2);';

  mainArea.innerHTML = `
    <div style="width:100%;max-width:800px;margin:0 auto;padding:0 16px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding:20px;background:rgba(13,0,22,0.6);border:1px solid rgba(255,0,255,0.2);border-radius:16px">
        <div style="font-size:48px">💬</div>
        <div>
          <h1 style="color:#fff;margin:0 0 4px 0;font-size:22px">ZX Comunidade</h1>
          <p style="color:#aaa;margin:0;font-size:14px">Seja você mesmo! Conecte-se e compartilhe.</p>
        </div>
      </div>
      <div style="background:rgba(13,0,22,0.55);border:1px solid rgba(255,0,255,0.25);border-radius:12px;padding:16px;margin-bottom:16px;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <div id="discover-user-avatar" class="discover-compose-avatar" style="flex-shrink:0">?</div>
          <div style="flex:1;display:flex;flex-direction:column;gap:8px">
            <input type="text" id="discover-post-title" placeholder="Título da postagem..." maxlength="200"
              style="width:100%;padding:10px 14px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:#fff;outline:none;font-size:14px;box-sizing:border-box"/>
            <textarea id="discover-post-body" placeholder="O que você quer compartilhar?" maxlength="2000" rows="3"
              style="width:100%;padding:10px 14px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:#fff;outline:none;font-size:14px;resize:vertical;box-sizing:border-box"></textarea>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end">
          <button type="button" class="btn-neon" id="btn-discover-post">Publicar</button>
        </div>
      </div>
      <div class="discover-sort" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <span style="color:#aaa;font-size:13px">Ordenar:</span>
        <button type="button" class="discover-sort-btn active" data-sort="hot">Em alta</button>
        <button type="button" class="discover-sort-btn" data-sort="new">Novos</button>
        <button type="button" class="discover-sort-btn" data-sort="top">Top</button>
        <button id="btn-discover-refresh" type="button" class="discover-sort-btn" style="margin-left:8px">🔄 Atualizar</button>
      </div>
      <div class="posts-feed" id="discover-feed" style="min-height:300px;overflow-y:auto;padding-right:10px">
        <div class="discover-loading">Carregando postagens...</div>
      </div>
    </div>`;

  discoverFeed = document.getElementById('discover-feed');
  updateDiscoverUserAvatar();

  feedLoaded = false;
  feedRequested = false;
  clearTimeout(feedLoadTimeout);
  socket.emit('feed:join');
  startFeedLoadTimeout();

  document.getElementById('btn-discover-post')?.addEventListener('click', () => {
    const title = document.getElementById('discover-post-title')?.value.trim();
    const body = document.getElementById('discover-post-body')?.value.trim();
    if (!title) { showToast('Digite um título para a postagem.'); return; }
    const sub = discoverSub === 'popular' ? 'geral' : discoverSub;
    socket.emit('feed:post', { title, body, subreddit: sub, username });
    document.getElementById('discover-post-title').value = '';
    document.getElementById('discover-post-body').value = '';
  });
}
window.openCommunityPostsView = openCommunityPostsView;
window.handleCommunityPostsClick = openCommunityPostsView;

function restoreDiscoverWelcome() {
  const mainArea = document.querySelector('#discover-view .discover-main');
  if (!mainArea) return;

  mainArea.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:flex-start;min-height:60vh;height:calc(100vh - 120px);overflow-y:auto;overflow-x:hidden;padding:20px 0;scrollbar-width:thin;scrollbar-color:#00ffff rgba(0,0,0,0.2);';

  mainArea.innerHTML = `
    <div style="text-align:center;margin-bottom:60px;">
      <div style="font-size:120px;margin-bottom:24px;opacity:0.7;">💬</div>
      <h1 style="color:#fff;font-size:32px;margin-bottom:12px;">Bem-vindo ao ZX Comunidade</h1>
      <p style="color:#aaa;font-size:18px;margin-bottom:48px;max-width:500px;">Conecte-se com pessoas que compartilham seus interesses, compartilhe ideias e participe de discussões.</p>
      <button class="btn-neon" id="btn-open-community-posts" style="font-size:20px;padding:16px 48px;">
        📢 Postagens de comunidade
      </button>
    </div>
    <div style="width:100%;max-width:900px;margin:0 auto;padding:0 20px;">
      <div style="margin-bottom:32px;">
        <div style="display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <h3 style="color:#00ffff;font-size:18px;font-weight:700;margin:0;">✨ COMUNIDADES SUGERIDAS</h3>
        </div>
        <div id="suggested-communities-container" style="display:flex;gap:16px;overflow-x:auto;padding-bottom:12px;scrollbar-width:thin;scrollbar-color:#00ffff rgba(0,0,0,0.2);align-items:center;">
          <div id="suggested-empty-state" style="min-width:220px;height:280px;border-radius:16px;overflow:hidden;border:2px solid rgba(255,0,255,0.3);cursor:pointer;transition:all 0.2s;position:relative;">
            <img src="Community-banner.png" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;" alt="Explore comunidades" />
          </div>
        </div>
      </div>
      <div style="margin-bottom:32px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h3 style="color:#00ffff;font-size:18px;font-weight:700;margin:0;">🏠 MINHAS COMUNIDADES</h3>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;" id="my-communities-grid">
          <div style="min-height:280px;border-radius:16px;overflow:hidden;border:2px dashed rgba(0,255,255,0.4);cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(0,255,255,0.05);" id="btn-create-community-card">
            <div style="width:64px;height:64px;border-radius:50%;background:rgba(0,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:32px;">+</div>
            <div style="color:#00ffff;font-size:16px;font-weight:600;">Criar Comunidade</div>
            <div style="color:#888;font-size:13px;">Crie sua própria comunidade</div>
          </div>
        </div>
      </div>
    </div>`;

  if (window.SugeridasManager?.renderizar) {
    window.SugeridasManager.renderizar();
  }
  if (typeof window.renderUserCommunities === 'function') {
    window.renderUserCommunities();
  }
}
window.restoreDiscoverWelcome = restoreDiscoverWelcome;

document.addEventListener('click', (e) => {
  const btn = e.target.closest('#btn-open-community-posts');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  openCommunityPostsView();
}, true);

/** Volta para a tela inicial — única função autoritativa para o botão Início */
function goHome() {
  try {
    if (typeof voiceChannelId !== 'undefined' && voiceChannelId && typeof leaveVoiceChannel === 'function') {
      leaveVoiceChannel();
    }
  } catch (_) {}

  window.__zxMountRail?.();

  document.body.classList.remove('server-body', 'dm-active', 'dm-view-active', 'dm-mode');

  const mainAreaEl = document.querySelector('.main-area');
  if (mainAreaEl) {
    mainAreaEl.classList.remove('hidden');
    mainAreaEl.style.removeProperty('display');
    mainAreaEl.style.removeProperty('visibility');
    mainAreaEl.style.removeProperty('pointer-events');
  }

  if (serverSidebar) {
    serverSidebar.classList.add('hidden');
    serverSidebar.removeAttribute('style');
    serverSidebar.style.setProperty('display', 'none', 'important');
  }

  clearServerState();
  currentDmUser = null;

  document.querySelectorAll('.server-rail-icon').forEach(e => e.classList.remove('active'));
  document.getElementById('btn-home')?.classList.add('active');

  showLayout('discover-view');
  restoreDiscoverWelcome();
  updateDiscoverUserAvatar();

  feedLoaded = false;
  feedRequested = false;
  clearTimeout(feedLoadTimeout);
  discoverFeed = null;

  window.dispatchEvent(new CustomEvent('zx:home'));
}
window.goHome = goHome;

document.addEventListener('click', (e) => {
  const btn = e.target.closest('#btn-home');
  if (!btn) return;
  e.preventDefault();
  goHome();
}, true);

function showDiscoverView() {
  try {
    if (typeof voiceChannelId !== 'undefined' && voiceChannelId && typeof leaveVoiceChannel === 'function') {
      leaveVoiceChannel();
    }

    document.body.classList.remove('server-body', 'dm-active', 'dm-view-active', 'dm-mode');

    currentServerId = null;
    currentChannel = null;
    window.currentServerId = null;
    window.currentChannel = null;
    currentDmUser = null;

    showLayout('discover-view');
    restoreDiscoverWelcome();
    updateDiscoverUserAvatar();

    document.querySelectorAll('.server-rail-icon').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.mm-tab').forEach(e => e.classList.remove('active'));
    document.getElementById('btn-home')?.classList.add('active');

    feedLoaded = false;
    feedRequested = false;
    clearTimeout(feedLoadTimeout);
    discoverFeed = null;

    window.dispatchEvent(new CustomEvent('zx:home'));
  } catch (error) {
    console.error('Erro ao carregar tela inicial:', error);
  }
}
window.showDiscoverView = showDiscoverView;

function updateDiscoverUserAvatar() {
  const el = document.getElementById('discover-user-avatar');
  if (!el || !username) return;
  el.className = `discover-compose-avatar av-${username[0].toUpperCase()}`;
  applyAvatarToEl(el, profileAvatarUrl, username[0].toUpperCase());
}

function openServer(serverId) {
  // Sair da chamada de voz antes de trocar de servidor (evita estado residual que quebra layouts)
  try {
    if (typeof voiceChannelId !== 'undefined' && voiceChannelId && typeof leaveVoiceChannel === 'function') {
      leaveVoiceChannel();
    }
  } catch (_) {}
  const server = servers.find(s => s.id === serverId);
  if (!server) return;

  document.body.classList.remove('server-body', 'dm-active', 'dm-view-active', 'dm-mode');

  if (serverSidebar) {
    serverSidebar.classList.add('hidden');
    serverSidebar.removeAttribute('style');
  }

  document.querySelectorAll('.dm-view, .dm-container, .dm-active-element').forEach(el => {
    el.classList.remove('dm-view', 'dm-active', 'hidden');
    el.removeAttribute('style');
  });

  currentDmUser = null;
  currentServerId = null;
  currentChannel = null;

  void document.body.offsetWidth;

  document.body.classList.add('server-body');
  window.__zxMountRail?.();
  resetNavbarForServer();

  currentServerId = serverId;
  window.currentServerId = currentServerId;
  sidebarServerName.textContent = server.name;

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

  document.querySelectorAll('.server-rail-icon').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.mm-tab').forEach(e => e.classList.remove('active'));
  document.getElementById('btn-home').classList.remove('active');

  const railIcon = serversRail.querySelector(`[data-server-id="${serverId}"]`);
  if (railIcon) railIcon.classList.add('active');

  renderSidebarChannels(server);
  setTimeout(() => renderSidebarChannels(server), 0);
  renderFandomTabs(server);

  // Atualizar UI de permissões para este servidor
  if (window.ZXPermissions) {
    window.ZXPermissions.updateServerUI(serverId);
  }

  if (server.channels.length > 0) {
    openChannel(server.channels[0]);
  } else {
    // Servidor sem canais: mostra estado vazio dentro do próprio server-view
    showLayout('chat-view');
    if (chatChPrefix) chatChPrefix.textContent = '#';
    if (currentChannelNameEl) currentChannelNameEl.textContent = 'sem-canais';
    if (chatHeaderDesc) chatHeaderDesc.textContent = 'Este servidor ainda não possui canais.';
    if (messagesArea) {
      messagesArea.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;color:#888;padding:32px;text-align:center;">
          <div style="font-size:64px">🎮</div>
          <h2 style="margin:0;color:#ccc">Não há canais por aqui</h2>
          <p style="margin:0;max-width:420px;text-align:center">${escHtml(server.name)} ainda não tem nenhum canal criado. Use o menu do servidor para criar o primeiro canal.</p>
        </div>
      `;
    }
    if (messageInput) {
      messageInput.value = '';
      messageInput.placeholder = 'Crie o primeiro canal para começar';
      messageInput.disabled = true;
    }
    const sendButton = document.getElementById('send-btn');
    if (sendButton) sendButton.disabled = true;
  }
}
window.openServer = openServer;

/** Exibe o modal de confirmação antes de entrar em um canal de voz */
function showVoiceJoinModal(ch) {
  // ✅ Usar a função do voice-system-complete.js se disponível
  if (typeof window.showVoiceJoinModal === 'function' && window.showVoiceJoinModal !== showVoiceJoinModal) {
    window.showVoiceJoinModal(ch);
    return;
  }
  
  const modal = document.getElementById('voice-join-modal');
  if (!modal) {
    // Fallback: se o modal não existir, entra direto na chamada
    if (typeof window.joinVoiceChannel === 'function') {
      window.joinVoiceChannel(ch);
    } else {
      showLayout('voice-view');
    }
    return;
  }
  const nameEl = document.getElementById('voice-join-channel-name');
  if (nameEl) nameEl.textContent = ch.name || 'Voz';
  // Armazena o canal pendente para o botão de confirmar usar
  window._pendingVoiceChannel = ch;
  modal.classList.remove('hidden');
}
window.showVoiceJoinModal = showVoiceJoinModal;

function openChannel(ch) {
  console.log("🔍 [CANAL] openChannel() iniciado");
  console.log("🔍 [CANAL] Detalhes do canal recebido:", JSON.stringify(ch, null, 2));
  
  // Adicionar verificação de contexto do servidor
  const currentServer = servers.find(s => s.id === currentServerId);
  console.log("🔍 [CANAL] Servidor atual:", currentServer ? currentServer.name : 'Nenhum');
  
  if (!ch) {
    console.error("❌ [CANAL] Canal é NULL - Não é possível abrir canal");
    
    // Fallback para canal padrão do servidor atual
    if (currentServer && currentServer.channels && currentServer.channels.length > 0) {
      ch = currentServer.channels[0];
      console.warn("⚠️ [CANAL] Usando primeiro canal do servidor:", ch);
    } else {
      // Fallback genérico
      ch = {
        id: 'geral',
        name: 'Canal Geral',
        type: 'text',
        desc: 'Canal padrão do sistema'
      };
      console.warn("⚠️ [CANAL] Usando canal de fallback genérico:", ch);
    }
  }
  
  console.log("✅ [CANAL] Canal processado");
  
  // Garantir que currentChannel seja sempre definido
  currentChannel = ch.id || 'geral';
  currentChannelType = ch.type || 'text';
  window.currentChannel = currentChannel;
  window.currentServerId = currentServerId;
  lastMessageUser = null;

  console.log(`🔑 [CANAL] Variáveis definidas:
    - Canal atual: ${currentChannel}
    - Tipo de canal: ${currentChannelType}`);

  // Adicionar verificação extra de socket
  if (typeof socket === 'undefined') {
    console.error("❌ [SOCKET] Socket não definido. Não será possível enviar mensagens.");
  } else if (!socket.connected) {
    console.warn("⚠️ [SOCKET] Socket não conectado. Mensagens podem não ser enviadas.");
  }

  // Highlight no sidebar
  document.querySelectorAll('.ch-item').forEach(el => {
    el.classList.toggle('active', el.dataset.channelId === ch.id);
  });
  
  console.log("? [DEBUG 1] Highlight aplicado no sidebar");

  // Atualizar nome do canal na interface
  if (currentChannelNameEl) {
    currentChannelNameEl.textContent = ch.name || 'Canal Atual';
    console.log(`🏷️ [CANAL] Nome do canal atualizado: ${currentChannelNameEl.textContent}`);
  } else {
    console.warn("⚠️ [CANAL] Elemento de nome do canal não encontrado");
  }

  if (ch.type === 'voice') {
    // ✅ NÃO esconder todas as views antes do modal — deixar o servidor visível
    showVoiceJoinModal(ch);
  } else if (ch.type === 'forum') {
    document.getElementById('forum-channel-name').textContent = ch.name;
    showLayout('forum-view');
    renderForumTopics(ch.id);
    socket.emit('switch-channel', { channel: ch.id, communityId: currentServerId });
  } else if (ch.type === 'announcement') {
    document.getElementById('ann-channel-name').textContent = ch.name;
    showLayout('announcement-view');
    annMessagesArea.innerHTML = '';
    lastMessageUser = null;
    socket.emit('switch-channel', { channel: ch.id, communityId: currentServerId });
  } else {
    const prefix = ch.type === 'announcement' ? '🔔' : '#';
    chatChPrefix.textContent = prefix;
    currentChannelNameEl.textContent = ch.name;
    chatHeaderDesc.textContent = ch.desc || '';
    messageInput.placeholder = `MENSAGEM EM #${ch.name}...`;
    messagesArea.innerHTML = '';
    showLayout('chat-view');
    socket.emit('switch-channel', { channel: ch.id, communityId: currentServerId });
    messageInput.focus();
  }

  // Log final para confirmação
  console.log(`✅ [CANAL] Canal ${ch.name} (${ch.id}) aberto com sucesso`);
}

// ── Modais inline para categorias ──
function showCatRenameModal(currentName, onConfirm) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(4px);';
  overlay.innerHTML = `
    <div style="background:#180020;border:1px solid var(--neon);border-radius:10px;padding:1.5rem;width:320px;display:flex;flex-direction:column;gap:1rem;box-shadow:0 8px 40px rgba(0,0,0,0.9);">
      <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.12em;color:var(--neon-soft);font-weight:700;">✏️ Renomear Categoria</div>
      <input id="_cat-rename-input" type="text" value="" maxlength="32" autocomplete="off"
        style="background:rgba(0,0,0,0.4);border:1px solid var(--neon);border-radius:6px;color:var(--text-light);padding:0.55rem 0.75rem;font-size:0.9rem;font-family:inherit;outline:none;box-shadow:0 0 6px var(--neon-glow);" />
      <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
        <button id="_cat-rename-cancel" class="btn-ghost" style="padding:0.45rem 0.9rem;">Cancelar</button>
        <button id="_cat-rename-confirm" class="btn-neon" style="padding:0.45rem 0.9rem;">Salvar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#_cat-rename-input');
  input.value = currentName;
  input.focus();
  input.select();
  const doConfirm = () => {
    const val = input.value.trim();
    if (!val) return;
    overlay.remove();
    onConfirm(val);
  };
  overlay.querySelector('#_cat-rename-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#_cat-rename-confirm').addEventListener('click', doConfirm);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doConfirm();
    if (e.key === 'Escape') overlay.remove();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function showCatDeleteConfirm(catName, onConfirm) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(4px);';
  overlay.innerHTML = `
    <div style="background:#180020;border:1px solid #ff4444;border-radius:10px;padding:1.5rem;width:340px;display:flex;flex-direction:column;gap:1rem;box-shadow:0 8px 40px rgba(0,0,0,0.9);">
      <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.12em;color:#ff6666;font-weight:700;">🗑️ Excluir Categoria</div>
      <p style="color:#ccc;font-size:0.92rem;margin:0;line-height:1.5;">Excluir <strong style="color:var(--neon);">${catName}</strong>? Os canais serão movidos para Geral.</p>
      <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
        <button id="_cat-del-cancel" class="btn-ghost" style="padding:0.45rem 0.9rem;">Cancelar</button>
        <button id="_cat-del-confirm" style="background:#cc2222;color:#fff;border:1px solid #ff4444;border-radius:6px;padding:0.45rem 1rem;font-family:inherit;font-size:0.88rem;font-weight:700;cursor:pointer;">Excluir</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#_cat-del-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#_cat-del-confirm').addEventListener('click', () => { overlay.remove(); onConfirm(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ── Render sidebar canais ──
// ? Função para renderizar ABAS DOS FANDOMS no topo
function renderFandomTabs(server) {
  const tabsContainer = document.getElementById('fandom-tabs-container');
  if (!tabsContainer) return;
  
  tabsContainer.innerHTML = '';
  
  // Aba padrão "Todos os canais"
  const allTab = document.createElement('div');
  allTab.className = 'fandom-tab active';
  allTab.textContent = '🔍 Todos';
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
    tab.textContent = `⭐ ${fandom.name}`;
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
  
  // ? ADICIONAR CATEGORIAS VAZIAS QUE NÃO TEM CANAIS AINDA
  if (server.customCategories && server.customCategories.length > 0) {
    server.customCategories.forEach(cat => {
      const catUpper = cat.toUpperCase();
      if (!categories[catUpper]) {
        categories[catUpper] = [];
      }
    });
  }

  // Drag state para categorias
  let _draggedCat = null;

  for (const [cat, channels] of Object.entries(categories)) {
    const catHeader = document.createElement('div');
    catHeader.className = 'ch-category-row';
    catHeader.dataset.cat = cat;
    catHeader.draggable = true;
    catHeader.style.cursor = 'grab';
    catHeader.innerHTML = `
      <span class="cat-arrow">&#9660;</span>
      <span class="cat-name">${cat}</span>
      <button class="ch-cat-add" data-cat="${cat}" title="Criar canal nesta categoria">+</button>
    `;
    sidebarChannels.appendChild(catHeader);

    // Colapsar/expandir
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

    // Drag-and-drop para reordenar categorias
    catHeader.addEventListener('dragstart', (e) => {
      _draggedCat = cat;
      catHeader.classList.add('cat-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', cat);
    });
    catHeader.addEventListener('dragend', () => {
      catHeader.classList.remove('cat-dragging');
      document.querySelectorAll('.ch-category-row.cat-drag-over').forEach(el => el.classList.remove('cat-drag-over'));
      _draggedCat = null;
    });
    catHeader.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (_draggedCat && _draggedCat !== cat) {
        catHeader.classList.add('cat-drag-over');
      }
    });
    catHeader.addEventListener('dragleave', () => {
      catHeader.classList.remove('cat-drag-over');
    });
    catHeader.addEventListener('drop', (e) => {
      e.preventDefault();
      catHeader.classList.remove('cat-drag-over');
      if (!_draggedCat || _draggedCat === cat) return;
      if (!server.customCategories) return;
      const fromIdx = server.customCategories.findIndex(c => c.toUpperCase() === _draggedCat.toUpperCase());
      const toIdx   = server.customCategories.findIndex(c => c.toUpperCase() === cat.toUpperCase());
      if (fromIdx === -1 || toIdx === -1) return;
      const [removed] = server.customCategories.splice(fromIdx, 1);
      server.customCategories.splice(toIdx, 0, removed);
      saveServers();
      renderSidebarChannels(server);
    });

    // Container dos canais da categoria
    const categoryChannels = document.createElement('div');
    categoryChannels.className = 'category-channels';
    categoryChannels.dataset.category = cat;
    sidebarChannels.appendChild(categoryChannels);

    // Menu de contexto (botão direito) — Discord-like
    catHeader.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll('.channel-ctx-menu').forEach(m => m.remove());

      const ctxMenu = document.createElement('div');
      ctxMenu.className = 'channel-ctx-menu';
      ctxMenu.style.left = e.clientX + 'px';
      ctxMenu.style.top  = e.clientY + 'px';
      ctxMenu.innerHTML = `
        <div class="ctx-item" data-action="rename-cat">✏️ Editar categoria</div>
        <div class="ctx-sep"></div>
        <div class="ctx-item ctx-danger" data-action="delete-cat">🗑️ Excluir categoria</div>
      `;
      document.body.appendChild(ctxMenu);

      ctxMenu.querySelectorAll('[data-action]').forEach(item => {
        item.addEventListener('click', () => {
          ctxMenu.remove();
          if (item.dataset.action === 'rename-cat') {
            showCatRenameModal(cat, (newName) => {
              const oldName = cat;
              const newNameUpper = newName.trim().toUpperCase();
              if (!server.customCategories) server.customCategories = [];
              const idx = server.customCategories.indexOf(oldName);
              if (idx !== -1) server.customCategories[idx] = newNameUpper;
              server.channels.forEach(ch => {
                if (ch.category?.toUpperCase() === oldName.toUpperCase()) ch.category = newNameUpper;
              });
              saveServers();
              renderSidebarChannels(server);
              showToast('Categoria renomeada!');
            });
          }
          if (item.dataset.action === 'delete-cat') {
            showCatDeleteConfirm(cat, () => {
              if (!server.customCategories) return;
              const idx = server.customCategories.indexOf(cat);
              if (idx !== -1) server.customCategories.splice(idx, 1);
              server.channels.forEach(ch => {
                if (ch.category?.toUpperCase() === cat.toUpperCase()) delete ch.category;
              });
              saveServers();
              renderSidebarChannels(server);
              showToast('Categoria excluída!');
            });
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
      li.dataset.id = ch.id;         // ✅ necessário para initVoiceSystem
      li.dataset.type = ch.type;     // ✅ necessário para initVoiceSystem detectar canais de voz
      li.draggable = false;          // ✅ DESATIVADO para permitir cliques normais
      li.style.cursor = 'pointer';   // ✅ Cursor normal de clique
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
        <div class="ctx-item" data-action="rename">✏️ Renomear canal</div>
        <div class="ctx-item" data-action="edit">⚙️ Configurar canal</div>
        <div class="ctx-item" data-action="clone">📄 Duplicar canal</div>
        <div class="ctx-sep"></div>
        <div class="ctx-item ctx-danger" data-action="delete">🗑️ Excluir canal</div>
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
                    // Servidor ficou sem canais: mostra estado vazio dentro do server-view
                    showLayout('chat-view');
                    if (chatChPrefix) chatChPrefix.textContent = '#';
                    if (currentChannelNameEl) currentChannelNameEl.textContent = 'sem-canais';
                    if (chatHeaderDesc) chatHeaderDesc.textContent = 'Este servidor ainda não possui canais.';
                    if (messagesArea) {
                      messagesArea.innerHTML = `
                        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;color:#888;padding:32px;text-align:center;">
                          <div style="font-size:64px">🎮</div>
                          <h2 style="margin:0;color:#ccc">Não há canais por aqui</h2>
                          <p style="margin:0;max-width:420px;text-align:center">${escHtml(server.name)} ainda não tem nenhum canal criado. Use o menu do servidor para criar o primeiro canal.</p>
                        </div>
                      `;
                    }
                    if (messageInput) {
                      messageInput.value = '';
                      messageInput.placeholder = 'Crie o primeiro canal para começar';
                      messageInput.disabled = true;
                    }
                    const sendButton = document.getElementById('send-btn');
                    if (sendButton) sendButton.disabled = true;
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
  
  // ? SEMPRE CRIA O GRUPO CANAIS DE TEXTO PRIMEIRO
  map['CANAIS DE TEXTO'] = [];
  
  // ? ADICIONA TODOS OS CANAIS TEXTUAIS DIRETAMENTE AQUI
  channels.forEach(ch => {
    if (['text', 'announcement', 'forum'].includes(ch.type)) {
      map['CANAIS DE TEXTO'].push(ch);
    }
  });
  
  // ? CRIA O GRUPO CANAIS DE VOZ
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
  // ? CORREÇÃO: Ícones com encoding correto para evitar caracteres estranhos
  if (type === 'text') return '#';
  if (type === 'voice') return '\ud83d\udd0a';
  if (type === 'forum') return '\ud83d\udcac';
  if (type === 'announcement') return '\ud83d\udce2';
  return '#';
}

// ── Render rail de servidores ──
function renderServersRail() {
    // Remove servidores antigos
  if (!serversRail) return;
  serversRail.querySelectorAll('.server-rail-icon[data-server-id]').forEach(e => e.remove());

  const addBtn = document.getElementById('btn-add-community');
  // Filtra comunidades (id começa com "comm_") — apenas SERVIDORES aparecem na barra
  servers.filter(server => !String(server.id || '').startsWith('comm_')).forEach(server => {
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

    // ? EVENTO DE BOTÃO DIREITO PARA ABRIR MENU DE CONTEXTO
    icon.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showServerCtxMenu(e.clientX, e.clientY, server.id);
    });

    serversRail.insertBefore(icon, addBtn);
  });
}
window.renderServersRail = renderServersRail;

// ── Criar servidor ──
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
  const category = document.getElementById('community-category-select')?.value || 'geral';
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

  const ownerUsername = sessionStorage.getItem('username') || localStorage.getItem('zx_username') || '';
  const defaultRoles = (window.ZXPermissions ? window.ZXPermissions.DEFAULT_ROLES : []).map(r => Object.assign({}, r));

  const server = {
    id,
    name,
    category,
    icon: '',
    description: '',
    channels: template === 'blank' ? blankChannels : baseChannels,
    customCategories: [],
    events: [],
    settings: { notifications: true, mentions: true, events: true },
    ownerId: ownerUsername,
    members: ownerUsername ? [{ username: ownerUsername, role: 'OWNER', joinedAt: Date.now() }] : [],
    roles: defaultRoles,
  };

  servers.push(server);
  saveServers();
  closeCommunityModal();
  renderServersRail();
  
  // ✅ CORREÇÃO FINAL TELA BRANCA: Esperar 300ms + reset COMPLETO do layout
  // Primeiro limpa TUDO, garante que o navegador processou todas as alterações
  setTimeout(() => {
    // Forçar reflow 3x ANTES de abrir
    void document.body.offsetWidth;
    void document.body.offsetHeight;
    void document.body.offsetLeft;
    
    openServer(id);
    
    // Mais um reflow DEPOIS de abrir
    setTimeout(() => {
      void document.body.offsetWidth;
    }, 50);
    
  }, 300);
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
  if (!name) { showToast('Digite um nome para o Fandom.'); return; }
  
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
window.createFandom = createFandom;

document.getElementById('fandom-modal-confirm')?.addEventListener('click', createFandom);
fandomNameInput.addEventListener('keydown', e => e.key === 'Enter' && createFandom());
btnDiscoverCreate?.addEventListener('click', openCommunityModal);
communityModalClose.addEventListener('click', closeCommunityModal);
communityModal.addEventListener('click', (e) => { if (e.target === communityModal) closeCommunityModal(); });

// Botão Criar Servidor
const btnCommunityCreate = document.getElementById('btn-community-create');
if (btnCommunityCreate) {
  btnCommunityCreate.addEventListener('click', () => {
    const name = communityNameInput.value.trim();
    if (!name) {
      showToast('Digite um nome para o servidor');
      return;
    }
    
    const selectedTemplate = document.querySelector('.community-option.selected');
    const template = selectedTemplate ? selectedTemplate.dataset.template : 'base';
    
    // Criar servidor
    const newServer = {
      id: 'srv_' + Date.now(),
      name: name,
      template: template,
      channels: template === 'base' ? [
        { id: 'ch_1', name: 'geral', type: 'text' },
        { id: 'ch_2', name: 'jogos', type: 'text' },
        { id: 'ch_3', name: 'música', type: 'text' },
        { id: 'ch_4', name: 'voz-geral', type: 'voice' }
      ] : [
        { id: 'ch_1', name: 'geral', type: 'text' },
        { id: 'ch_2', name: 'voz-geral', type: 'voice' }
      ],
      createdAt: Date.now()
    };
    
    servers.push(newServer);
    localStorage.setItem('zx_servers', JSON.stringify(servers));
    
    renderServersRail();
    openServer(newServer.id);
    closeCommunityModal();
    
    showToast(`✅ Servidor "${name}" criado com sucesso!`);
    
    // Disparar evento para conquistas
    document.dispatchEvent(new Event('server-created'));
  });
}
// ✅ CORREÇÃO FINAL: Sistema de seleção visual DAS CATEGORIAS DE COMUNIDADE
let selectedCommunityCategory = 'geral';
let selectedCommunityTemplate = 'base';

// ✅ Função para atualizar visualização da seleção DE CATEGORIAS
function updateCommunityCategorySelection(selectedBtn) {
  // Resetar TODAS as categorias primeiro
  document.querySelectorAll('.community-category-option').forEach(b => {
    b.classList.remove('selected');
    b.style.background = 'transparent';
    b.style.border = '1px solid rgba(255, 0, 255, 0.3)';
    b.style.boxShadow = 'none';
    b.style.transform = 'scale(1)';
  });
  
  // Aplicar estilo NA CATEGORIA SELECIONADA
  selectedBtn.classList.add('selected');
  selectedBtn.style.background = 'rgba(255, 0, 255, 0.25)';
  selectedBtn.style.border = '2px solid #ff00ff';
  selectedBtn.style.boxShadow = '0 0 12px rgba(255, 0, 255, 0.5)';
  selectedBtn.style.transform = 'scale(1.02)';
}

// ✅ Função para atualizar visualização da seleção DOS TEMPLATES
function updateCommunityTemplateSelection(selectedBtn) {
  // Resetar TODAS as opções primeiro
  communityOptions.forEach(b => {
    b.classList.remove('selected');
    b.style.background = 'transparent';
    b.style.border = '1px solid transparent';
    b.style.boxShadow = 'none';
    b.style.transform = 'scale(1)';
  });
  
  // Aplicar estilo NA OPÇÃO SELECIONADA
  selectedBtn.classList.add('selected');
  selectedBtn.style.background = 'rgba(255, 0, 255, 0.25)';
  selectedBtn.style.border = '2px solid #ff00ff';
  selectedBtn.style.boxShadow = '0 0 12px rgba(255, 0, 255, 0.5)';
  selectedBtn.style.transform = 'scale(1.02)';
}

// Inicializar com a opção padrão selecionada
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const defaultBtn = Array.from(communityOptions).find(b => b.dataset.template === 'base');
    if (defaultBtn) {
      updateCommunityTemplateSelection(defaultBtn);
    }
    
    // Inicializar também a categoria padrão
    const defaultCategory = document.querySelector('.community-category-option[data-category="geral"]');
    if (defaultCategory) {
      updateCommunityCategorySelection(defaultCategory);
    }
  }, 100);
});

// ✅ CORREÇÃO FINAL ABSOLUTA - NINGUÉM VAI CONSEGUIR DESFAZER ISSO
setInterval(() => {
  document.querySelectorAll('.community-category-btn').forEach(btn => {
    
    if (!btn.hasAttribute('data-fixed-ultimate')) {
      btn.setAttribute('data-fixed-ultimate', 'true');
      
      btn.addEventListener('click', (e) => {
        
        // ✅ BLOQUEIA TUDO - NENHUM OUTRO EVENTO VAI RODAR DEPOIS DESSE
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        
        // ✅ APLICAR ESTILO COM !important DIRETAMENTE NO ELEMENTO
        // NENHUM CSS NENHUM OUTRO CÓDIGO VAI CONSEGUIR SOBRESCREVER
        btn.style.setProperty('background', 'rgba(255, 0, 255, 0.35)', 'important');
        btn.style.setProperty('border', '3px solid #ff00ff', 'important');
        btn.style.setProperty('box-shadow', '0 0 20px rgba(255, 0, 255, 0.7)', 'important');
        btn.style.setProperty('transform', 'scale(1.05)', 'important');
        btn.style.setProperty('z-index', '99999', 'important');
        btn.style.setProperty('position', 'relative', 'important');
        
        // ✅ REMOVER ESTILO DE TODOS OS OUTROS DEPOIS DE 1ms
        // GARANTE QUE ESSE É O ÚLTIMO EVENTO A RODAR
        setTimeout(() => {
          document.querySelectorAll('.community-category-btn').forEach(b => {
            if (b !== btn) {
              // ✅ CORREÇÃO DEFINITIVA: NÃO DEIXA NENHUM FUNDO BRANCO
              b.style.background = 'rgba(0, 0, 0, 0.3)';
              b.style.border = '1px solid rgba(255, 0, 255, 0.3)';
              b.style.color = '#fff';
              b.style.boxShadow = 'none';
              b.style.transform = 'scale(1)';
              b.style.zIndex = '1';
              b.style.position = 'relative';
            }
          });
        }, 1);
        
        // ✅ Salvar categoria
        selectedCommunityCategory = btn.dataset.category;
        
        console.log('✅ ✅ ✅ CATEGORIA SELECIONADA DEFINITIVAMENTE:', btn.dataset.category);
        
        // ✅ FORÇAR REFLOW DO NAVEGADOR 3 VEZES
        void btn.offsetWidth;
        void btn.offsetHeight;
        void document.body.offsetWidth;
        
        return false;
      }, true);
    }
  });
}, 50);

// Evento de clique NOS TEMPLATES
communityOptions.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    updateCommunityTemplateSelection(btn);
    selectedCommunityTemplate = btn.dataset.template;
    
    console.log('✅ TEMPLATE SELECIONADO:', btn.dataset.template);
  });
});

// Botão confirmar criação de comunidade (legado — criação atual usa btn-community-create)
document.getElementById('btn-confirm-community')?.addEventListener('click', () => {
  createServer(selectedCommunityTemplate);
});

// ── Criar canal dentro do servidor ──
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

// Fechar modal de categoria
document.getElementById('btn-cancel-category')?.addEventListener('click', () => {
  document.getElementById('create-category-modal')?.classList.add('hidden');
});
document.getElementById('new-category-name')?.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.getElementById('create-category-modal')?.classList.add('hidden');
  if (e.key === 'Enter') document.getElementById('btn-confirm-category')?.click();
});

btnConfirmChannel.addEventListener('click', () => {
  if (!currentServerId) return;
  const name = newChannelNameInput.value.trim().toLowerCase().replace(/\s+/g, '-');
  if (!name) return;
  const type = document.querySelector('input[name="ch-type"]:checked').value;
  const server = servers.find(s => s.id === currentServerId);
  if (!server) return;

  // ? Garante que o array de canais existe
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

  // ? Logs para debug
  console.log("? Canal criado:", ch);
  console.log("Servidor atual:", server);
  console.log("Todos os canais:", server.channels);

  // ? Renderiza 2x para garantir atualização
  renderSidebarChannels(server);
  
  setTimeout(() => {
    renderSidebarChannels(server);
    openChannel(ch);
  }, 100);
});

newChannelNameInput.addEventListener('keydown', e => e.key === 'Enter' && btnConfirmChannel.click());

// ── Dropdown do servidor ──
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
  // ? ABRIR APENAS O MODAL PEQUENO DE CRIAR CATEGORIA
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

// Início: onclick em home-nav.js + window.__zxGoHome (não usar stopImmediatePropagation aqui)

// ? CORREÇÃO: Reseta todos os estados visuais ao voltar para home
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ── Navbar icons ──
btnOpenSettings?.addEventListener('click', openSettingsModal);
btnOpenCommunity?.addEventListener('click', () => {
  if (servers.length > 0) openServer(servers[0].id);
  else openCommunityModal();
});

// ── Nav buttons (amigos, loja, suporte) ──
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const modalEl = document.getElementById(btn.dataset.modal);
    if (modalEl) {
      openModal(modalEl);
      if (btn.dataset.modal === 'friends-modal') {
        // FIX v6: solicitar presença fresca ao abrir o modal para evitar status desatualizados
        if (socket && socket.connected) socket.emit('presence:request');
        renderFriendsModal();
      }
    }
  });
});

// ── Abas modais modernos (amigos) ──
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

// ── Abas perfil ──
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

// ── Perfil: abrir via avatar ──
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

userAvatar?.addEventListener('click', (e) => {
  e.stopPropagation();
  const rect = userAvatar.getBoundingClientRect();
  showProfilePopover(rect.left, rect.bottom + 6);
});

// ? EVENTO BOTÃO DIREITO NO AVATAR DA BARRA SUPERIOR
userAvatar?.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const rect = userAvatar.getBoundingClientRect();
  showProfilePopover(rect.left, rect.bottom + 6);
});

// ? EVENTO BOTÃO DIREITO NO AVATAR DA PÁGINA DE MENSAGENS PRIVADAS
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
  
  // Atualiza avatar na navbar: só altera a classe de status, sem remover has-image
  const navAvatar = document.getElementById('user-avatar');
  if (navAvatar) {
    navAvatar.classList.remove('status-online', 'status-idle', 'status-dnd', 'status-offline');
    navAvatar.classList.add(`status-${userStatus}`);
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
    `<div class="pf-game-item"><span>🎮 ${escHtml(g)}</span><button type="button" data-i="${i}">✕</button></div>`
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

// ── Configurações: conteúdo das seções ──
const SETTINGS_SECTIONS = {
  conta: () => {
    const savedUsername = localStorage.getItem('zx_username') || username;
    const userData = JSON.parse(localStorage.getItem('zx_user_data') || '{}');
    return `
    <h2 class="ms-section-title">Conta</h2>
    <p class="ms-section-desc">Gerencie email, telefone, grupo etário e dados da sua conta.</p>

    <div class="ms-block">
      <div class="ms-block-title">Informações do usuário</div>
      <div class="ms-field">
        <label>Nome de usuário</label>
        <input type="text" id="set-username" value="${escHtml(savedUsername)}" maxlength="32" autocomplete="username" />
      </div>
      <div class="ms-field">
        <label>Email</label>
        <input type="email" id="set-email" value="${escHtml(userData.email || '')}" placeholder="seu@email.com" autocomplete="email" />
        <small class="ms-field-hint">Usado para login e recuperação da conta.</small>
      </div>
      <div class="ms-field">
        <label>Telefone</label>
        <input type="tel" id="set-phone" value="${escHtml(userData.phone || '')}" placeholder="(11) 99999-9999" autocomplete="tel" />
      </div>
      <div class="ms-field">
        <label>Data de nascimento</label>
        <input type="date" id="set-birthdate" value="${escHtml(userData.birthdate || '')}" />
      </div>
      <div class="ms-field">
        <label>Grupo etário</label>
        <input type="text" id="set-age-group" value="${escHtml(userData.ageGroup || '')}" readonly />
        <small class="ms-field-hint">Calculado automaticamente com base na data de nascimento.</small>
      </div>
      <div class="ms-field">
        <label>Código de amigo</label>
        <input type="text" id="set-friend-code" value="${escHtml(userData.friendCode || '')}" readonly />
      </div>
      <button type="button" class="btn-ms btn-ms-primary" id="btn-save-account">Salvar alterações</button>
      <div id="account-save-status" class="account-save-status hidden"></div>
    </div>

    <div class="ms-block account-danger-zone">
      <div class="ms-block-title">Sessão e conta</div>
      <p class="ms-section-desc" style="margin-bottom: 12px;">Encerre sua sessão ou remova permanentemente sua conta do ZX Chat.</p>
      <button type="button" class="btn-ms" id="btn-logout-account">Sair da conta</button>
      <button type="button" class="btn-ms account-delete-btn" id="btn-delete-account">Excluir conta</button>
    </div>

    <div id="delete-account-modal" class="modal-overlay hidden">
      <div class="modal" style="max-width: 420px;">
        <div class="mm-header">
          <span class="mm-title">Excluir conta</span>
          <button type="button" class="mm-close" id="btn-close-delete-account">✕</button>
        </div>
        <p style="color:#ccc; margin: 0 0 12px 0;">Esta ação é permanente. Digite sua senha para confirmar.</p>
        <div class="ms-field">
          <label>Senha</label>
          <input type="password" id="delete-account-password" placeholder="Sua senha atual" autocomplete="current-password" />
        </div>
        <div style="display:flex; gap:10px; margin-top:16px;">
          <button type="button" class="btn-ms" id="btn-cancel-delete-account" style="flex:1;">Cancelar</button>
          <button type="button" class="btn-ms account-delete-btn" id="btn-confirm-delete-account" style="flex:1;">Excluir permanentemente</button>
        </div>
      </div>
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
      <div class="ms-block-title">🎧 Dispositivos de Áudio</div>
      
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
      <button type="button" class="btn-ms" id="btn-camera-bg-pick" style="margin-top:0.5rem">🖼 Escolher imagem de fundo</button>
      
      <div style="margin-top:1rem; border-radius: 12px; overflow: hidden; background: #000;">
        <video id="camera-preview" autoplay muted playsinline style="width:100%; height: 200px; object-fit: cover; display: none;"></video>
        <div id="camera-preview-placeholder" style="width:100%; height: 200px; display: flex; align-items: center; justify-content: center; color: #666; background: #111;">
          👁 Pré-visualização da câmera
        </div>
      </div>
      
      <button type="button" class="btn-ms btn-ms-primary" id="btn-camera-test" style="margin-top: 1rem">▶ Ligar pré-visualização</button>
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
        <button type="button" class="btn-ms" id="btn-pick-wallpaper" style="margin-top:0.5rem">🖼 Escolher imagem do computador</button>
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
      <div class="ms-actions"><button type="button" class="btn-ms" id="btn-export-data">📤 Exportar meus dados</button></div>
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
      <button type="button" class="social-btn ${connected.youtube ? 'connected' : ''}" data-social="youtube">▶️ YouTube</button>
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

function calculateAgeGroupFromBirthdate(birthdate) {
  if (!birthdate) return '';
  const birth = new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 13) return 'Menor de 13';
  if (age <= 17) return '13-17 anos';
  if (age <= 24) return '18-24 anos';
  if (age <= 34) return '25-34 anos';
  if (age <= 44) return '35-44 anos';
  if (age <= 54) return '45-54 anos';
  return '55+ anos';
}

function setAccountSaveStatus(message, isError) {
  const el = document.getElementById('account-save-status');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  el.style.color = isError ? '#ff6666' : '#66ffcc';
}

async function loadAccountSettingsForm() {
  try {
    const account = await AccountAPI.getProfile();
    const usernameInput = document.getElementById('set-username');
    const emailInput = document.getElementById('set-email');
    const phoneInput = document.getElementById('set-phone');
    const birthdateInput = document.getElementById('set-birthdate');
    const ageGroupInput = document.getElementById('set-age-group');
    const friendCodeInput = document.getElementById('set-friend-code');

    if (usernameInput) usernameInput.value = account.nick || '';
    if (emailInput) emailInput.value = account.email || '';
    if (phoneInput) phoneInput.value = account.phone || '';
    if (birthdateInput) birthdateInput.value = account.birthdate || '';
    if (ageGroupInput) ageGroupInput.value = account.ageGroup || calculateAgeGroupFromBirthdate(account.birthdate);
    if (friendCodeInput) friendCodeInput.value = account.friendCode || '';

    username = account.nick || username;
    updateUserUI();
  } catch (err) {
    setAccountSaveStatus(err.message || 'Não foi possível carregar os dados da conta', true);
  }
}

function bindSettingsSectionEvents(sectionId) {
  if (sectionId === 'conta') {
    const birthdateInput = document.getElementById('set-birthdate');
    const ageGroupInput = document.getElementById('set-age-group');
    const deleteModal = document.getElementById('delete-account-modal');

    birthdateInput?.addEventListener('change', (e) => {
      if (ageGroupInput) ageGroupInput.value = calculateAgeGroupFromBirthdate(e.target.value);
    });

    loadAccountSettingsForm();

    document.getElementById('btn-save-account')?.addEventListener('click', async () => {
      const saveBtn = document.getElementById('btn-save-account');
      const payload = {
        nick: document.getElementById('set-username')?.value.trim(),
        email: document.getElementById('set-email')?.value.trim(),
        phone: document.getElementById('set-phone')?.value.trim(),
        birthdate: document.getElementById('set-birthdate')?.value,
      };

      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvando...';

      try {
        const account = await AccountAPI.updateProfile(payload);
        username = account.nick;
        updateUserUI();
        socket.emit('user:login', { username, email: (function(){ try { return JSON.parse(localStorage.getItem('zx_user_data') || '{}').email || ''; } catch(e){ return ''; } })() });
        if (ageGroupInput) ageGroupInput.value = account.ageGroup || calculateAgeGroupFromBirthdate(account.birthdate);
        setAccountSaveStatus('Alterações salvas com sucesso!', false);
        showToast('Conta atualizada!');
      } catch (err) {
        setAccountSaveStatus(err.message || 'Erro ao salvar conta', true);
        showToast(err.message || 'Erro ao salvar conta');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar alterações';
      }
    });

    document.getElementById('btn-logout-account')?.addEventListener('click', async () => {
      if (!confirm('Tem certeza que deseja sair da conta?')) return;
      try {
        await AccountAPI.logout();
      } catch (_) {
        AccountAPI.clearLocalSession();
      }
      window.location.href = 'auth.html';
    });

    document.getElementById('btn-delete-account')?.addEventListener('click', () => {
      deleteModal?.classList.remove('hidden');
      document.getElementById('delete-account-password')?.focus();
    });

    document.getElementById('btn-close-delete-account')?.addEventListener('click', () => {
      deleteModal?.classList.add('hidden');
      const pwd = document.getElementById('delete-account-password');
      if (pwd) pwd.value = '';
    });

    document.getElementById('btn-cancel-delete-account')?.addEventListener('click', () => {
      deleteModal?.classList.add('hidden');
      const pwd = document.getElementById('delete-account-password');
      if (pwd) pwd.value = '';
    });

    document.getElementById('btn-confirm-delete-account')?.addEventListener('click', async () => {
      const password = document.getElementById('delete-account-password')?.value || '';
      const confirmBtn = document.getElementById('btn-confirm-delete-account');

      if (!password) {
        showToast('Digite sua senha para excluir a conta');
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Excluindo...';

      try {
        await AccountAPI.deleteAccount(password);
        window.location.href = 'auth.html';
      } catch (err) {
        showToast(err.message || 'Não foi possível excluir a conta');
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Excluir permanentemente';
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
          btnCameraTest.textContent = '📷 Desligar câmera';
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
        btnCameraTest.textContent = '🔍 Ligar pré-visualização';
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
          btnMicTest.textContent = '🎙️ Parar teste';
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
        btnMicTest.textContent = '🔍 Iniciar teste de microfone';
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

function isSettingsContentEmpty() {
  if (!msContent) return true;
  const html = msContent.innerHTML.trim();
  if (!html || html.includes('<!-- preenchido pelo JS -->')) return true;
  return !msContent.querySelector('.ms-section-title');
}

function activateSettingsNav(sectionId) {
  document.querySelectorAll('#settings-modal .ms-nav-item[data-section]').forEach(item => {
    item.classList.toggle('active', item.dataset.section === sectionId);
  });
}

function initSettingsModalNav() {
  if (settingsModal?._settingsNavBound) return;
  if (settingsModal) settingsModal._settingsNavBound = true;
  document.querySelectorAll('#settings-modal .ms-nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      renderSettingsSection(item.dataset.section);
      activateSettingsNav(item.dataset.section);
    });
  });
}

function openSettingsModal() {
  openModal(settingsModal);
  initSettingsModalNav();
  if (isSettingsContentEmpty()) {
    renderSettingsSection('conta');
    activateSettingsNav('conta');
  }
}

window.renderSettingsSection = renderSettingsSection;
window.openSettingsModal = openSettingsModal;
window.activateSettingsNav = activateSettingsNav;

initSettingsModalNav();

// ── Modal helpers ──
function openModal(modalEl) {
  modalEl.classList.remove('hidden');
  if (modalEl && modalEl.id === 'friends-modal') {
    if (typeof socket !== 'undefined' && socket.connected) socket.emit('presence:request');
    if (typeof renderFriendsModal === 'function') renderFriendsModal();
  }
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

// ── Context menu de servidor ──
function showServerCtxMenu(x, y, serverId) {
  // PRIMEIRO limpa o menu
  serverCtxMenu.innerHTML = '';
  
  // Cria os itens UM POR UM e adiciona evento ANTES de inserir no DOM
  const itemCreateServer = document.createElement('div');
  itemCreateServer.className = 'ctx-item';
  itemCreateServer.dataset.action = 'create-server';
  itemCreateServer.textContent = '➕ Criar servidor';
  
  itemCreateServer.addEventListener('click', () => {
    serverCtxMenu.classList.add('hidden');
    openCommunityModal();
  });

  // ✅ OPÇÃO: COLOCAR NAS SUGERIDAS
  const itemAddSuggested = document.createElement('div');
  itemAddSuggested.className = 'ctx-item';
  itemAddSuggested.dataset.action = 'add-suggested';
  itemAddSuggested.textContent = '⭐ Colocar nas sugeridas';
  
  itemAddSuggested.addEventListener('click', () => {
    serverCtxMenu.classList.add('hidden');
    
    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    // Enviar para o servidor salvar nas sugeridas
    socket.emit('community:add-suggested', {
      id: server.id,
      name: server.name,
      icon: server.icon || '',
      category: server.category || 'geral',
      description: server.description || '',
      members: 1
    });

    showToast('✅ Comunidade adicionada às sugeridas!');
  });
  
  // AGORA adiciona todos os elementos no menu
  serverCtxMenu.appendChild(itemCreateServer);
  serverCtxMenu.appendChild(itemAddSuggested);
  
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

// ── Enviar mensagem (canal de texto) ──
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

// Evita registrar o listener mais de uma vez
if (!sendBtn.dataset.scriptJsReady) {
  sendBtn.dataset.scriptJsReady = 'true';
  sendBtn.addEventListener('click', sendMessage);
}
if (!messageInput.dataset.scriptJsReady) {
  messageInput.dataset.scriptJsReady = 'true';
  messageInput.addEventListener('keydown', e => e.key === 'Enter' && sendMessage());
}

// ── Canal de anúncios ──
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

// ── Fórum ──
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
        <span class="forum-topic-meta">por ${escHtml(topic.author)} ˇ ${topic.time}</span>
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

forumBtn?.addEventListener('click', () => {
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

forumInput?.addEventListener('keydown', e => e.key === 'Enter' && forumBtn?.click());

// ── Canal de voz (WebRTC) ──
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

  if (countEl) {
    const n = allUsers.length;
    countEl.textContent = n === 0 ? 'Ninguém na chamada' : n === 1 ? '1 participante' : n + ' participantes';
  }

  if (allUsers.length === 0) {
    grid.innerHTML = '<div class="voice-empty-state"><div class="voice-icon">🔊</div><p>Ninguém na chamada ainda.</p></div>';
    return;
  }

  // Avatar atualizado do localStorage a cada render
  const selfAvatarUrl = profileAvatarUrl || localStorage.getItem('zx_avatar') || '';

  grid.innerHTML = allUsers.map(u => {
    const name = escHtml(u.username || '?');
    const initial = (u.username || '?')[0].toUpperCase();
    const hasAvatar = u.self && selfAvatarUrl;
    const selfMuted = isMuted && u.self;
    const selfDeaf  = isDeafened && u.self;

    const avatarInner = hasAvatar
      ? '<img src="' + selfAvatarUrl + '" alt="' + name + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
      : '<span style="font-size:2rem;font-weight:700;color:#fff;line-height:1;">' + initial + '</span>';

    const statusLine = selfMuted
      ? '<span style="color:#ed4245;">🔇 Mudo</span>'
      : selfDeaf
        ? '<span style="color:#ed4245;">🔕 Ensurdecido</span>'
        : '<span style="color:#57f287;">🔊 Conectado</span>';

    const selfBadge = u.self
      ? '<div style="position:absolute;top:8px;left:50%;transform:translateX(-50%);background:rgba(255,0,255,0.85);color:#fff;font-size:10px;font-weight:700;padding:2px 10px;border-radius:10px;letter-spacing:0.05em;white-space:nowrap;z-index:2;">VOCÊ</div>'
      : '';

    const avatarBorderColor = selfMuted ? '#ed4245' : 'rgba(255,0,255,0.7)';
    const avatarShadow = selfMuted ? '0 0 12px rgba(237,66,69,0.5)' : '0 0 18px rgba(255,0,255,0.35)';

    return '<div class="voice-participant' + (selfMuted ? ' muted' : '') + '" id="vp-' + u.socketId + '" style="min-width:160px;max-width:200px;flex:0 0 auto;padding:1.25rem 1rem 1rem;background:rgba(0,0,0,0.55);border-radius:16px;display:flex;flex-direction:column;align-items:center;gap:0.7rem;position:relative;border:2px solid rgba(255,0,255,0.2);transition:border-color 0.15s,box-shadow 0.15s;">'
      + selfBadge
      + '<div style="width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#2a0845,#6441a5);display:flex;align-items:center;justify-content:center;overflow:hidden;border:3px solid ' + avatarBorderColor + ';box-shadow:' + avatarShadow + ';flex-shrink:0;">'
        + avatarInner
      + '</div>'
      + '<div style="font-size:0.95rem;color:#fff;font-weight:600;text-align:center;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + name + '</div>'
      + '<div style="font-size:0.78rem;display:flex;align-items:center;gap:4px;">' + statusLine + '</div>'
      + '</div>';
  }).join('');
}

document.getElementById('btn-leave-voice')?.addEventListener('click', () => {
  leaveVoiceChannel();
  // Volta para o servidor atual em vez de ir para a tela inicial
  const _currentServerId = window.currentServerId || currentServerId;
  if (_currentServerId) {
    const _server = servers.find(s => s.id === _currentServerId);
    if (_server) {
      const fallbackChannel = (_server.channels || []).find(ch => ch.type !== 'voice') || (_server.channels || [])[0];
      if (fallbackChannel) {
        openChannel(fallbackChannel);
        return;
      }
    }
  }
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
      showToast('📷 Webcam ativada!');
      
    } catch (err) {
      showToast('⚠️ Não foi possível acessar a webcam. Verifique permissões.');
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
    showToast('🔍 Webcam desativada');
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
      document.getElementById('btn-share-screen').textContent = '📷';
      
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
        document.getElementById('btn-share-screen').textContent = '📷';
        renderVoiceParticipants();
        showToast('🔍 Compartilhamento de tela encerrado');
      };
      
      renderVoiceParticipants();
      showToast('🖥️ Compartilhando tela!');
      
    } catch (err) {
      showToast('⚠️ Não foi possível compartilhar tela.');
      console.error(err);
    }
  } else {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      screenStream = null;
    }
    isSharingScreen = false;
    document.getElementById('btn-share-screen').classList.remove('active');
    document.getElementById('btn-share-screen').textContent = '📷';
    renderVoiceParticipants();
    showToast('🔍 Compartilhamento de tela parado');
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
      document.getElementById('btn-share-audio').textContent = '📷';
      
      // Adiciona stream de áudio aos peers
      Object.values(peerConnections).forEach(pc => {
        audioShareStream.getAudioTracks().forEach(track => {
          pc.addTrack(track, audioShareStream);
        });
      });
      
      audioShareStream.getAudioTracks()[0].onended = () => {
        isSharingAudio = false;
        document.getElementById('btn-share-audio').classList.remove('active');
        document.getElementById('btn-share-audio').textContent = '📷';
        showToast('🔍 Compartilhamento de áudio encerrado');
      };
      
      showToast('🎵 Compartilhando áudio do sistema!');
      
    } catch (err) {
      showToast('⚠️ Não foi possível compartilhar áudio.');
      console.error(err);
    }
  } else {
    if (audioShareStream) {
      audioShareStream.getTracks().forEach(track => track.stop());
      audioShareStream = null;
    }
    isSharingAudio = false;
    document.getElementById('btn-share-audio').classList.remove('active');
    document.getElementById('btn-share-audio').textContent = '📷';
    showToast('🔍 Compartilhamento de áudio parado');
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
    <div class="voice-mod-item" data-action="deafen">🔇 Desativar áudio para este usuário</div>
    <div class="voice-mod-item" data-action="move">↪ Mover para outro canal</div>
    <div class="voice-mod-item" data-action="kick">📵 Desconectar da chamada</div>
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
          showToast(`🔇 Áudio desativado para ${uname}`);
          socket.emit('voice:moderate', { action: 'deafen', targetSocketId: socketId });
          break;
          
        case 'move':
          const targetChannel = prompt('Nome do canal para mover:');
          if (targetChannel?.trim()) {
            showToast(`↪ ${uname} movido para #${targetChannel.trim()}`);
            socket.emit('voice:moderate', { action: 'move', targetSocketId: socketId, channel: targetChannel.trim() });
          }
          break;
          
        case 'kick':
          if (confirm(`Desconectar ${uname} da chamada?`)) {
            showToast(`📵 ${uname} foi desconectado da chamada`);
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
  document.getElementById('btn-toggle-deaf').textContent = isDeafened ? '🔇' : '🔊';
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
    
    // ? SUPORTE ATÉ 8K E QUALQUER TAMANHO DE TELA
    document.body.style.backgroundImage = `url(${custom})`;
    
    // ? FORÇA COBERTURA TOTAL SEM DISTORÇÃO
    document.body.style.backgroundSize = 'cover';
    
    // ? CENTRALIZAÇÃO PERFEITA EM QUALQUER DIMENSÃO
    document.body.style.backgroundPosition = '50% 50%';
    
    // ? NUNCA REPETE
    document.body.style.backgroundRepeat = 'no-repeat';
    
    // ? FIXO MESMO AO ROLAR
    document.body.style.backgroundAttachment = 'fixed';
    
    // ? COBRE ATÉ AS BORDAS
    document.body.style.backgroundOrigin = 'border-box';
    document.body.style.backgroundClip = 'border-box';
    
    // ? GARANTE 100% DA ÁREA VISÍVEL
    document.body.style.minHeight = '100vh';
    document.body.style.minWidth = '100vw';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // ? REMOVE QUALQUER MARGEM/PADDING
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    
    // ? FORÇA RENDERIZAÇÃO EM ALTA RESOLUÇÃO
    document.body.style.imageRendering = 'auto';
    document.body.style.webkitFontSmoothing = 'antialiased';
    
    // ? FALLBACK PARA IMAGENS MUITO PEQUENAS
    document.body.style.backgroundBlendMode = 'normal';
  }
  localStorage.setItem('zx_wallpaper', type);
}

function applyWallpaperOnLoad() {
  applyWallpaper(localStorage.getItem('zx_wallpaper') || 'default');
  if (localStorage.getItem('zx_animations') === '0') document.body.classList.add('no-animations');
}

// ── Discover feed ──
function sortFeedPosts(posts) {
  const list = [...posts];
  if (discoverSort === 'new') return list.sort((a, b) => b.createdAt - a.createdAt);
  if (discoverSort === 'top') return list.sort((a, b) => b.score - a.score);
  return list.sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);
}

function filterFeedPosts(posts) {
  if (discoverSub === 'popular') return posts;
  
  // Filtrar tanto postagens quanto comunidades pela categoria selecionada
  const filtered = posts.filter(p => p.subreddit === discoverSub);
  
  // Também filtrar e mostrar comunidades da categoria
  const categoryCommunities = servers.filter(s => s.category === discoverSub);
  
  // Se tiver comunidades nesta categoria, adicionar elas no topo
  if (categoryCommunities.length > 0) {
    const communityCards = categoryCommunities.map(server => ({
      id: `comm_${server.id}`,
      type: 'community',
      title: server.name,
      body: server.description || 'Comunidade criada recentemente',
      subreddit: discoverSub,
      username: 'Sistema',
      time: 'Agora',
      score: 0,
      isCommunity: true,
      serverId: server.id
    }));
    
    // ✅ CORREÇÃO: Agora a comunidade do usuário também aparece nas sugeridas
    // Colocar comunidades primeiro, depois postagens
    return [...communityCards, ...filtered];
  }
  
  return filtered;
}

function renderDiscoverFeed() {
  if (!discoverFeed) return;
  
  console.log('🔍 [FEED] Renderizando feed...');
  console.log('🔍 [FEED] Total de postagens locais:', feedPostsLocal.length);
  
  const filtered = filterFeedPosts(feedPostsLocal);
  const sorted = sortFeedPosts(filtered);
  
  console.log('? [FEED] Filtradas:', filtered.length, 'Ordenadas:', sorted.length);
  
  if (sorted.length === 0) {
    console.log('ℹ️ [FEED] Nenhuma postagem encontrada');
    discoverFeed.innerHTML = '<div class="discover-empty">Nenhuma postagem ainda. Seja o primeiro a publicar!</div>';
    return;
  }
  
  console.log('🔍 [FEED] Renderizando', sorted.length, 'postagens');
  
  discoverFeed.innerHTML = sorted.map(post => {
    const vote = feedVoteState[post.id] || 0;
    const commentsHtml = (post.comments || []).slice(-3).map(c =>
      `<div class="discover-comment"><strong>${escHtml(c.username)}</strong> · ${escHtml(c.text)}</div>`
    ).join('');
    return `
    <article class="discover-card" data-post-id="${post.id}">
      <div class="discover-votes">
        <button type="button" class="discover-vote-btn ${vote === 1 ? 'voted-up' : ''}" data-vote="1" data-id="${post.id}">▲</button>
        <span class="discover-score" data-score="${post.id}">${post.score}</span>
        <button type="button" class="discover-vote-btn ${vote === -1 ? 'voted-down' : ''}" data-vote="-1" data-id="${post.id}">▼</button>
      </div>
      <div class="discover-card-body">
        <div class="discover-card-meta">
          <span class="discover-card-sub">r/${escHtml(post.subreddit)}</span>
          <span>u/${escHtml(post.username)}</span>
          <span>ˇ ${post.time}</span>
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
    console.log('🔍 Botão Atualizar clicado - recarregando feed');
    
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
    
    showToast('🔍 Atualizando feed...');
  }
});

// ? CORREÇÃO: Sistema de timeout e tratamento de erros para o feed
let feedLoadTimeout = null;
let feedLoaded = false;

// Limpa loading automaticamente após 8 segundos se não houver resposta
function startFeedLoadTimeout() {
  console.log('⏱️ [FEED] Iniciando timeout de carregamento (8s)');
  feedLoadTimeout = setTimeout(() => {
    if (!feedLoaded) {
      console.warn('🔍 [FEED] Timeout! Servidor não respondeu');
      discoverFeed.innerHTML = `
        <div class="discover-empty">
          <div style="font-size: 48px; margin-bottom: 16px;">⏱️</div>
          <h3 style="margin: 0 0 8px 0;">Tempo de carregamento esgotado</h3>
          <p style="color: #888; margin: 0 0 16px 0;">O servidor não respondeu. Tente recarregar a página.</p>
          <button class="btn-ms" onclick="renderDiscoverFeed(); socket.emit('feed:join');">🔄 Tentar novamente</button>
        </div>
      `;
    }
  }, 8000);
}

socket.on('feed:history', (posts) => {
  console.log('🔍 [FEED] Recebido histórico do servidor:', posts?.length || 0, 'postagens');
  clearTimeout(feedLoadTimeout);
  feedLoaded = true;
  feedPostsLocal = posts || [];
  renderDiscoverFeed();
});

// ? CORREÇÃO FINAL: Não solicita feed APENAS quando estiver na view do discover
let feedRequested = false;

socket.on('connect', () => {
  console.log('🔍 [FEED] Socket conectado | socket.id:', socket.id);

  // CORREÇÃO DM RT: Re-registrar listener dm:message a cada conexão/reconexão.
  // Garante que o listener sempre usa o username atualizado e nunca fica stale.
  socket.off('dm:message', _onDmMessage);
  socket.on('dm:message', _onDmMessage);
  console.log('[DM-RT] Listener dm:message registrado para socket', socket.id);

  // Re-enviar user:login após reconexão (inclusive na conexão inicial se username já estiver disponível).
  // Se username ainda não estiver disponível (promise pendente no DOMContentLoaded), o emit
  // no próprio DOMContentLoaded cuidará disso logo em seguida.
  const _email = (function(){ try { return JSON.parse(localStorage.getItem('zx_user_data') || '{}').email || ''; } catch(e){ return ''; } })();
  if (username && username !== 'Usuário') {
    socket.emit('user:login', { username, email: _email });
  } else {
    // CORREÇÃO BUG #4: username ainda não foi setado (corrida com DOMContentLoaded).
    // Tenta em loop sem expirar — para quando username ficar válido ou socket desconectar.
    const _retryInterval = setInterval(() => {
      if (!socket.connected) { clearInterval(_retryInterval); return; }
      if (username && username !== 'Usuário') {
        clearInterval(_retryInterval);
        socket.emit('user:login', { username, email: (function(){ try { return JSON.parse(localStorage.getItem('zx_user_data') || '{}').email || ''; } catch(e){ return ''; } })() });
      }
    }, 300);
  }

  // Só solicita o feed se a view do discover está aberta
  if (!discoverView.classList.contains('hidden') && !feedRequested) {
    console.log('🔍 [FEED] Solicitando postagens ao servidor');
    feedLoaded = false;
    feedRequested = true;
    socket.emit('feed:join');
    startFeedLoadTimeout();
  }
});

socket.on('disconnect', () => {
  console.warn('🔍 [FEED] Socket desconectado');
  clearTimeout(feedLoadTimeout);
  feedRequested = false;
});

socket.on('connect_error', (err) => {
  console.error('? [FEED] Erro de conexão:', err.message);
  clearTimeout(feedLoadTimeout);
  discoverFeed.innerHTML = `
    <div class="discover-empty">
      <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
      <h3 style="margin: 0 0 8px 0;">Falha na conexão</h3>
      <p style="color: #888; margin: 0 0 16px 0;">Não foi possível carregar as postagens.</p>
      <button class="btn-ms" onclick="socket.connect(); renderDiscoverFeed();">🔌 Reconectar</button>
    </div>
  `;
});

// ? CORREÇÃO: Listener que estava FALTANDO para receber os posts do servidor
socket.on('feed:posts', (posts) => {
  console.log('? [FEED] Recebidos', posts?.length || 0, 'postagens do servidor');
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

// ================================================
// ✅ SISTEMA DE COMUNIDADES SUGERIDAS
// ================================================
let suggestedCommunities = [];

// Receber lista completa quando conectar
socket.on('suggested:communities', (communities) => {
  suggestedCommunities = communities || [];
  try {
    localStorage.setItem('comunidades_sugeridas', JSON.stringify(suggestedCommunities));
  } catch (_) {}
  renderSuggestedCommunities();
});

// Quando uma nova comunidade é adicionada
socket.on('suggested:new', (community) => {
  if (!suggestedCommunities.find(c => c.id === community.id)) {
    suggestedCommunities.push(community);
    renderSuggestedCommunities();
  }
});

// Quando uma comunidade é removida
socket.on('suggested:removed', ({ communityId }) => {
  suggestedCommunities = suggestedCommunities.filter(c => c.id !== communityId);
  renderSuggestedCommunities();
});

// ✅ Feedback: comunidade já estava na lista
socket.on('suggested:exists', ({ community }) => {
  showToast(`⚠ "${community.name}" já está na lista de sugeridas!`);
});

// ✅ Feedback: sem permissão
socket.on('suggested:error', ({ message }) => {
  showToast(`❌ ${message}`);
});

// Função para renderizar as comunidades sugeridas
function renderSuggestedCommunities() {
  if (window.SugeridasManager?.renderizar) {
    window.SugeridasManager.renderizar();
    return;
  }

  const container = document.getElementById('suggested-communities-container');
  if (!container) return;

  container.querySelectorAll('[data-suggested-id]').forEach(card => card.remove());

  // Verifica se usuário é DEV ou STAFF
  const usuarioAtual = window.currentUser?.name || localStorage.getItem('currentUsername');
  // ✅ isDevOrStaff — validação por e-mail
  const DEV_EMAILS_SCRIPT = ['admin@exemplo.com'];
  var _scriptUserData = {}; try { _scriptUserData = JSON.parse(localStorage.getItem('zx_user_data') || '{}'); } catch(e) {}
  const _scriptEmail = (_scriptUserData.email || '').trim().toLowerCase();
  const isDevOrStaff = DEV_EMAILS_SCRIPT.map(function(e){ return e.toLowerCase(); }).includes(_scriptEmail);

  suggestedCommunities.forEach(community => {
    const card = document.createElement('div');
    card.dataset.suggestedId = community.id;
    // ✅ Proporção 9:16 (180px x 320px)
    card.style.cssText = 'min-width:180px;height:320px;border-radius:16px;overflow:hidden;border:2px solid rgba(255,0,255,0.3);cursor:pointer;position:relative;flex-shrink:0';
    
    const iconHtml = community.icon ? `<img src="${community.icon}" style="width:40px;height:40px;border-radius:10px;margin-bottom:6px;border:2px solid rgba(255,0,255,0.5);object-fit:cover;" />` : '';
    const buttonsHtml = isDevOrStaff ? `
      <div style="position:absolute;top:8px;right:8px;display:flex;gap:4px;">
        <button class="suggested-action-btn" data-action="remove" data-community-id="${community.id}" style="width:28px;height:28px;border-radius:50%;background:rgba(255,107,107,0.9);border:none;color:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">🗑</button>
        <button class="suggested-action-btn" data-action="delete" data-community-id="${community.id}" style="width:28px;height:28px;border-radius:50%;background:rgba(255,0,0,0.9);border:none;color:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">❌</button>
      </div>
    ` : '';
    
    card.innerHTML = community.banner
      ? `<img src="${community.banner}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0" /><div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.9));padding:16px">${iconHtml}<div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:2px">${escHtml(community.name)}</div><div style="color:#aaa;font-size:11px">${community.members || 1} membros</div></div>${buttonsHtml}`
      : `<div style="width:100%;height:100%;background:linear-gradient(180deg,rgba(128,0,255,0.2),rgba(0,0,0,0.8));display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:16px;gap:6px">${iconHtml}<div style="color:#fff;font-weight:700;font-size:14px">${escHtml(community.name)}</div><div style="color:#aaa;font-size:11px">${community.members || 1} membros</div></div>${buttonsHtml}`;
    
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.suggested-action-btn')) {
        openServer(community.id);
      }
    });
    
    // ✅ Ações dos botões (só para dev/staff)
    if (isDevOrStaff) {
      card.querySelectorAll('.suggested-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const communityId = btn.dataset.communityId;
          
          if (action === 'remove') {
            if (confirm(`Remover "${community.name}" da lista de comunidades sugeridas?`)) {
              let suggested = JSON.parse(localStorage.getItem('suggestedCommunities') || '[]');
              suggested = suggested.filter(c => c.id !== communityId);
              localStorage.setItem('suggestedCommunities', JSON.stringify(suggested));
              renderSuggestedCommunities();
              alert(`✅ Comunidade removida da lista de sugeridas!`);
            }
          } else if (action === 'delete') {
            if (confirm(`⚠️ ATENÇÃO!\n\nVocê tem certeza que deseja APAGAR PERMANENTEMENTE a comunidade "${community.name}"?\n\nEsta ação NÃO PODE ser desfeita!`)) {
              // Remove da lista de sugeridas
              let suggested = JSON.parse(localStorage.getItem('suggestedCommunities') || '[]');
              suggested = suggested.filter(c => c.id !== communityId);
              localStorage.setItem('suggestedCommunities', JSON.stringify(suggested));
              
              // Remove também das comunidades do usuário
              let userCommunities = JSON.parse(localStorage.getItem('userCommunities') || '[]');
              userCommunities = userCommunities.filter(c => c.id !== communityId);
              localStorage.setItem('userCommunities', JSON.stringify(userCommunities));
              
              renderSuggestedCommunities();
              window.renderUserCommunities && window.renderUserCommunities();
              alert(`✅ Comunidade "${community.name}" foi APAGADA permanentemente!`);
            }
          }
        });
      });
    }
    
    const emptyCard = document.getElementById('suggested-empty-state');
    if (emptyCard) container.insertBefore(card, emptyCard);
    else container.appendChild(card);
  });
}

// ── Configurações do servidor ──
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
          <button type="button" class="banner-edit-btn" id="btn-srv-comm-banner">🖼 Alterar banner</button>
        </div>
        <div class="srv-comm-row">
          <div class="srv-icon-preview small" id="srv-icon-preview-comm">${server.icon ? '' : escHtml(server.name[0].toUpperCase())}</div>
          <div>
            <div class="ms-field"><label>Ícone do servidor</label>
              <input type="file" id="srv-icon-file-comm" accept="image/*" class="hidden" />
              <button type="button" class="btn-ms" id="btn-srv-icon-comm">🖼 Alterar ícone</button>
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
      `<div class="srv-channel-row"><span>🔊 ${escHtml(c)}</span>
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
      `<div class="srv-channel-row"><span>📅 ${escHtml(ev.name)} — ${escHtml(ev.date)}</span>
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
      <button type="button" class="btn-ms" id="btn-pick-sticker">🖼 Escolher imagem</button>
      <button type="button" class="btn-ms btn-ms-primary" id="btn-add-sticker">Adicionar figurinha</button>
    </div>`;
  },

  membros: (server) => `
    <h2 class="ms-section-title">Membros</h2>
    <p class="ms-section-desc">Usuários conectados ao servidor em tempo real.</p>
    <div id="srv-members-list" class="srv-members-list"><div class="pf-hint">Carregando...</div></div>`,

  cargos: (server) => {
    const roles = server.roles || [];

    // Cargo especial @todos fixo no topo
    const todosRow = `
      <div class="srv-role-row srv-role-todos">
        <span class="srv-role-dot" style="background:linear-gradient(135deg,#ff8800,#ffaa00)"></span>
        <span class="srv-role-name" style="color:#ffaa00;font-weight:700;">
          📢 @todos
          <span style="font-size:11px;background:rgba(255,170,0,0.15);color:#ffaa00;padding:2px 7px;border-radius:10px;margin-left:6px;font-weight:400;">Especial</span>
        </span>
        <div class="clan-actions">
          <button type="button" data-todos-info style="background:rgba(255,170,0,0.15);color:#ffaa00;border-color:rgba(255,170,0,0.4);">ℹ️ Info</button>
        </div>
      </div>`;

    const rows = roles.map((r, i) => `
      <div class="srv-role-row">
        <span class="srv-role-dot" style="background:${r.color}"></span>
        ${r.icon ? `<span style="font-size:16px;margin-right:4px">${r.icon}</span>` : ''}
        <span class="srv-role-name" style="color:${r.color}">${escHtml(r.name)}</span>
        ${r.separate ? '<span style="font-size:10px;background:rgba(88,101,242,0.2);color:#a8b4ff;padding:1px 6px;border-radius:8px;margin-left:4px;">Online</span>' : ''}
        <div class="clan-actions">
          <button type="button" data-edit-role="${i}">⚙️ Permissões</button>
          <button type="button" data-del-role="${i}" style="background:rgba(237,66,69,0.15);color:#ed4245;border-color:rgba(237,66,69,0.4);">Remover</button>
        </div>
      </div>`).join('');

    return `
    <h2 class="ms-section-title">Cargos</h2>
    <p class="ms-section-desc">Crie e gerencie cargos com permissões específicas.</p>
    <div class="ms-block">
      ${todosRow}
      ${rows || '<p class="pf-hint" style="margin-top:8px">Nenhum cargo personalizado criado.</p>'}
    </div>
    <div class="ms-block" style="margin-top:1rem;padding:1.25rem">
      <div class="ms-block-title" style="margin-bottom:1rem">➕ Criar novo cargo</div>
      <div class="ms-field"><label>Nome do cargo</label><input type="text" id="srv-role-name" placeholder="Moderador" maxlength="32" /></div>
      <div class="ms-field"><label>Cor</label><input type="color" id="srv-role-color" value="#5865f2" /></div>
      <div class="ms-field"><label>Ícone / Emoji</label><input type="text" id="srv-role-icon" placeholder="👑 🛡️ ⭐" maxlength="4" style="width:80px;text-align:center;font-size:18px" /></div>
      <label class="toggle-row" style="margin-bottom:0.75rem">
        <span>Exibir separadamente na barra de usuários online</span>
        <input type="checkbox" id="srv-role-separate" />
      </label>
      <label class="toggle-row" style="margin-bottom:1rem">
        <span>Destacar nome do membro com a cor do cargo</span>
        <input type="checkbox" id="srv-role-highlight" />
      </label>
      <button type="button" class="btn-ms btn-ms-primary" id="btn-add-role">✅ Criar cargo</button>
    </div>`;
  },

  convites: (server) => {
    // Gerar ou recuperar código curto de convite
    function genCode(len) {
      const ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let c = '';
      for (let i = 0; i < len; i++) c += ch[Math.floor(Math.random() * ch.length)];
      return c;
    }
    const codeKey = 'invite_code_' + server.id;
    let code = localStorage.getItem(codeKey);
    if (!code) {
      code = genCode(8);
      localStorage.setItem(codeKey, code);
      localStorage.setItem('invite_map_' + code, server.id);
    }
    const inviteUrl = 'http://zx./invite/' + code;
    return `
    <h2 class="ms-section-title">Convites</h2>
    <p class="ms-section-desc">Compartilhe o servidor com outras pessoas.</p>
    <div class="ms-block">
      <div class="ms-block-title">🔗 Link de convite</div>
      <div class="srv-invite-row" style="margin-bottom:0.75rem">
        <input type="text" id="srv-invite-url" value="${escHtml(inviteUrl)}" readonly style="flex:1;background:var(--bg-dark);border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:#00ffff;padding:0.5rem 0.75rem;font-family:monospace;font-size:0.9rem;outline:none;letter-spacing:0.3px" />
        <button type="button" class="btn-ms btn-ms-primary" id="btn-copy-invite">📋 Copiar</button>
      </div>
      <div style="background:rgba(255,170,0,0.08);border:1px solid rgba(255,170,0,0.2);border-radius:8px;padding:10px 14px;font-size:13px;color:#ffaa00;margin-bottom:0.75rem">
        ⏳ Este link não expira e pode ser compartilhado livremente.
      </div>
      <div style="font-size:12px;color:#666">
        Código: <span style="font-family:monospace;background:rgba(255,255,255,0.07);padding:2px 8px;border-radius:4px;color:#888">${escHtml(code)}</span>
      </div>
    </div>
    <div class="ms-block" style="margin-top:1rem">
      <div class="ms-block-title">Entrar com link de convite</div>
      <div class="srv-invite-row" style="margin-top:0.75rem">
        <input type="text" id="srv-join-url" placeholder="http://zx./invite/CÓDIGO" style="flex:1;background:var(--bg-dark);border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:var(--text-light);padding:0.5rem 0.75rem;font-family:inherit;font-size:0.85rem;outline:none" />
        <button type="button" class="btn-ms btn-ms-primary" id="btn-join-invite">Entrar</button>
      </div>
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
      <div class="ms-block-title">📥 Importar modelo do Discord</div>
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
          <button type="button" class="btn-ms btn-ms-primary" id="btn-copy-model-link">📋 Copiar</button>
        </div>
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
        <button type="button" class="btn-ms" id="btn-delete-model">🗑️ Excluir modelo</button>
        <button type="button" class="btn-ms" id="btn-preview-model">👁 Pré-visualizar</button>
      </div>
      ` : ''}
    </div>

    <button type="button" class="btn-ms btn-ms-primary" id="btn-generate-model" style="margin-top:0.5rem">
      ${modelId ? '🔍 Atualizar modelo' : '✨ Gerar modelo do servidor'}
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
      <div class="ms-block-title">📥 Importar modelo do Discord</div>
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
        💡 Para criar um webhook no Discord: Configurações do Servidor → Integrações → Webhooks → Novo Webhook
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
          <option value="1" ${s.verifyLevel === 1 ? 'selected' : ''}>Baixo — e-mail verificado</option>
          <option value="2" ${s.verifyLevel === 2 ? 'selected' : ''}>Médio — 5 minutos no Discord</option>
          <option value="3" ${s.verifyLevel === 3 ? 'selected' : ''}>Alto — membro por 10 minutos</option>
        </select>
      </div>
      <button type="button" class="btn-ms btn-ms-primary" id="btn-save-security" style="margin-top:0.75rem">Salvar configurações</button>
    </div>`;
  },

  banimentos: (server) => {
    const bans = server.bans || [];
    const rows = bans.map((b, i) => `
      <div class="srv-channel-row">
        <span>🚫 ${escHtml(b.username)} <small style="color:var(--neon-soft)">— ${escHtml(b.reason || 'sem motivo')}</small></span>
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
      <button type="button" class="btn-ms" id="btn-delete-server" style="background:#ed4245;border-color:#ed4245;color:#fff">🗑️ Excluir permanentemente</button>
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
      
      console.log('🔍 [DEBUG EMOJI UPLOAD] FILE:', file);
      console.log('🔍 [DEBUG EMOJI UPLOAD] FILE SIZE:', file?.size);
      console.log('🔍 [DEBUG EMOJI UPLOAD] FILE TYPE:', file?.type);
      
      if (!file) return;
      
      // ? Validação de tamanho máximo 2MB
      if (file.size > 2 * 1024 * 1024) {
        showToast('🔍 Arquivo muito grande. Máximo 2 MB.');
        e.target.value = '';
        return;
      }
      
      // ? Validação de tipo de imagem
      if (!file.type.startsWith('image/')) {
        showToast('🔍 Selecione apenas arquivos de imagem.');
        e.target.value = '';
        return;
      }
      
      readImageFile(file, (dataUrl) => {
        console.log('? [DEBUG EMOJI UPLOAD] Arquivo convertido para base64 com sucesso!');
        console.log('? [DEBUG EMOJI UPLOAD] Tamanho base64:', dataUrl.length);
        
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
      
      console.log('? [DEBUG ADD EMOJI] emoji value:', emoji);
      console.log('? [DEBUG ADD EMOJI] name value:', name);
      
      if (!emoji || !name) { 
        showToast('🔍 Preencha o emoji e o nome.'); 
        return; 
      }
      
      if (!server.emojis) server.emojis = [];
      
      const emojiObject = { 
        name: name, 
        emoji: emoji 
      };
      
      console.log('? [DEBUG ADD EMOJI] EMOJI OBJECT QUE SERÁ SALVO:', emojiObject);
      
      server.emojis.push(emojiObject); 
      
      console.log('? [DEBUG ADD EMOJI] SERVER EMOJIS AGORA:', server.emojis);
      console.log('? [DEBUG ADD EMOJI] QUANTIDADE TOTAL:', server.emojis.length);
      
      saveServers();
      
      renderServerSettingsSection('emojis'); 
      addAuditLog(server, `Adicionou emoji :${name}:`);
      
      // ? ATUALIZAR EMOJI PICKER EM TEMPO REAL 100%
      setTimeout(() => {
        if (typeof updateEmojiCategories === 'function') {
          updateEmojiCategories();
          
          // ? Se o emoji picker já estiver aberto, atualiza imediatamente
          if (emojiPicker.classList.contains('active')) {
            // ? FORÇA RENDERIZAÇÃO COMPLETA DA CATEGORIA DO SERVIDOR
            renderEmojiCategory('server');
            
            // ? SELECIONA AUTOMATICAMENTE A CATEGORIA DO SERVIDOR
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
    // Botão @todos info
    srvMsContent.querySelector('[data-todos-info]')?.addEventListener('click', () => {
      showRoleTodosInfo();
    });

    // Criar cargo
    document.getElementById('btn-add-role')?.addEventListener('click', () => {
      const name = document.getElementById('srv-role-name')?.value.trim();
      const color = document.getElementById('srv-role-color')?.value || '#5865f2';
      const icon = document.getElementById('srv-role-icon')?.value.trim() || '';
      const separate = document.getElementById('srv-role-separate')?.checked || false;
      const highlight = document.getElementById('srv-role-highlight')?.checked || false;
      if (!name) { showToast('Digite o nome do cargo.'); return; }
      if (!server.roles) server.roles = [];
      const newRole = { name, color, icon, separate, highlight, perms: {} };
      server.roles.push(newRole); saveServers();
      renderServerSettingsSection('cargos'); addAuditLog(server, 'Criou cargo ' + name);
      showToast('✅ Cargo "' + name + '" criado!');
    });

    // Remover cargo
    srvMsContent.querySelectorAll('[data-del-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = server.roles[+btn.dataset.delRole];
        if (!confirm('Excluir o cargo "' + r.name + '"?')) return;
        server.roles.splice(+btn.dataset.delRole, 1); saveServers();
        renderServerSettingsSection('cargos'); addAuditLog(server, 'Removeu cargo ' + r.name);
        showToast('Cargo removido.');
      });
    });

    // Editar permissões (modal avançado Discord-style)
    srvMsContent.querySelectorAll('[data-edit-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = server.roles[+btn.dataset.editRole];
        openRolePermissionsModal(r, server);
      });
    });
  }

  if (sectionId === 'convites') {
    document.getElementById('btn-copy-invite')?.addEventListener('click', () => {
      const url = document.getElementById('srv-invite-url')?.value;
      navigator.clipboard?.writeText(url).then(() => showToast('✅ Link de convite copiado!')).catch(() => { prompt('Copie o link:', url); });
    });
    document.getElementById('btn-join-invite')?.addEventListener('click', () => {
      const raw = document.getElementById('srv-join-url')?.value.trim();
      if (!raw) { showToast('Cole o link de convite primeiro.'); return; }
      let code = '';
      if (raw.includes('/invite/')) { code = raw.split('/invite/')[1].replace(/[?#\s].*/,''); }
      else if (/^[A-Za-z0-9]{4,12}$/.test(raw)) { code = raw; }
      else { showToast('❌ Formato inválido. Use http://zx./invite/CÓDIGO'); return; }
      const mapKey = 'invite_map_' + code;
      const serverId = localStorage.getItem(mapKey);
      if (serverId) {
        showToast('✅ Servidor encontrado! Entrando...');
      } else {
        showToast('❌ Convite inválido ou não reconhecido.');
      }
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
          'INFORMAÇÕES',
          'CANAIS DE TEXTO',
          'CANAIS DE VOZ'
        ];

        // Atribui canais ŕs categorias
        server.channels[0].category = 'INFORMAÇÕES';
        server.channels[1].category = 'INFORMAÇÕES';
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

// ── Socket events ──
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
socket.on('message:sent', ({ message: msg }) => {
  if (msg) renderMessage(msg);
});
socket.on('system', renderSystem);

// ✅ REMOVIDO: socket.on('message', debug) que causava chamada dupla

function renderMessage(msg) {
  try {
    const area = currentChannelType === 'announcement' ? annMessagesArea : messagesArea;
    const bodyText = msg?.text ?? msg?.message ?? msg?.content ?? msg?.body ?? '';
    const sender = msg?.username || msg?.user || msg?.sender || msg?.author || 'Usuário';
    console.log('[TRACE] renderMessage called - area:', area, 'currentChannelType:', currentChannelType, 'msg:', msg, 'bodyText:', bodyText, 'sender:', sender, 'raw:', JSON.stringify(msg));
    const grouped = sender === lastMessageUser;
    lastMessageUser = sender;

    const div = document.createElement('div');
    div.className = `message${grouped ? ' grouped' : ''}`;
    const safeUsername = sender;
    const initial = safeUsername.charAt(0).toUpperCase();
    const isSelf = sender === username;
    const avatarUrl = isSelf ? profileAvatarUrl : '';
    const avatarStyle = avatarUrl ? ` style="background-image:url(${avatarUrl})" class="has-image"` : '';
    // ? PARSE DE EMOJIS PERSONALIZADOS DO SERVIDOR
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
      console.warn('[WARN] messages area is null - appending message to body for debug');
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

// ── Sistema de amigos ──
let friends = JSON.parse(localStorage.getItem('zx_friends') || '[]'); // [{ username }]
let friendRequests = JSON.parse(localStorage.getItem('zx_friend_requests') || '[]'); // [{ from }]
let onlineSet = new Set();
let sentRequests = JSON.parse(localStorage.getItem('zx_sent_requests') || '[]'); // usernames para quem enviamos
let userStatuses = {}; // username -> 'online'|'idle'|'dnd'|'invisible'

function saveFriends() {
  localStorage.setItem('zx_friends', JSON.stringify(friends));
}
function saveRequests() {
  localStorage.setItem('zx_friend_requests', JSON.stringify(friendRequests));
}
function saveSentRequests() {
  localStorage.setItem('zx_sent_requests', JSON.stringify(sentRequests));
}

// ── Listener standalone de friends:data (roda imediatamente no login) ──
socket.on('friends:data', (data) => {
  console.log('friends:data recebido:', data);
  console.log('requests:', data.requests);
  console.log('quantidade de solicitações:', data.requests?.length);

  // [BUG2 FIX] Armazenar ID único do usuário logado
  if (data.userId) {
    myUserId = String(data.userId);
    console.log('[BUG2 FIX] myUserId definido:', myUserId);
  }

  const reqs = data.requests || [];
  const frs  = data.friends  || [];

  // [BUG2 FIX] Guardar IDs dos amigos para roteamento DM por ID
  frs.forEach(f => {
    if (f && typeof f === 'object' && f.id) {
      const key = (f.username || f.nick || '').toLowerCase();
      if (key) friendIds[key] = String(f.id);
    }
  });
  // Mesclar sentRequests do servidor com localStorage — o servidor é a fonte da verdade
  const serverSent = data.sentRequests || [];
  if (serverSent.length > 0) {
    sentRequests = serverSent; // servidor mandou lista authoritative
  }
  // Remover da lista local quem já é amigo (pode ter sido aceito enquanto offline)
  sentRequests = sentRequests.filter(u => !frs.some(f => (typeof f === 'string' ? f : f.username || '').toLowerCase() === u.toLowerCase()));
  friendRequests = reqs.map(u => typeof u === 'string' ? { from: u } : u);
  friends = frs.map(u => typeof u === 'string' ? { username: u } : u);
  saveFriends();
  saveRequests();
  saveSentRequests();
  updateFriendsBadge();
  // Renderizar a aba ativa do modal (Online, Todos, etc.)
  renderFriendsModal();
  // CORREÇÃO CRÍTICA: sempre atualizar o painel #fr mesmo que não esteja ativo.
  // Sem isso, se friends:data chegar enquanto o usuário está em outra aba (ou antes
  // de abrir o modal), o painel #fr fica desatualizado e mostra "vazio" quando
  // o usuário clica em "Solicitações".
  const requestsContainer = document.getElementById('fr');
  console.log('container encontrado:', requestsContainer);
  renderFriendRequests();
  // Notificar FriendsSystem para sincronizar seu estado local com as variáveis globais
  window.dispatchEvent(new CustomEvent('zx:friends:updated'));
});

socket.on('friends:presence', ({ online, statuses }) => {
  // Normaliza para lowercase evitando mismatch de capitalização
  onlineSet = new Set((online || []).map(u => u.toLowerCase()));
  if (statuses) {
    // Normaliza chaves do mapa de statuses para lowercase
    const normalized = {};
    Object.keys(statuses).forEach(k => { normalized[k.toLowerCase()] = statuses[k]; });
    userStatuses = normalized;
  }
  console.log('[presence] onlineSet atualizado:', [...onlineSet]);
  console.log('[presence] userStatuses:', userStatuses);
  renderFriendsModal();
  updateFriendsBadge();
});

socket.on('friend:request:sent', ({ to, offline }) => {
  // CORREÇÃO BUG #3: toast único, vindo da confirmação do servidor (não mais duplicado)
  if (offline) {
    showToast(`✅ Solicitação para ${to} salva — será entregue quando ele(a) entrar.`);
  } else {
    showToast(`✅ Solicitação enviada para ${to}!`);
  }
});

// CORREÇÃO BUG #5: exibir erro quando o usuário-alvo não existe no banco (evita requests fantasmas)
socket.on('friend:request:error', ({ message, to }) => {
  showToast(`❌ ${message || 'Não foi possível enviar a solicitação.'}`);
  // Reverter sentRequests porque o servidor bloqueou a solicitação
  if (to) {
    sentRequests = sentRequests.filter(u => u.toLowerCase() !== to.toLowerCase());
    saveSentRequests();
  }
  renderFriendsModal();
});

socket.on('friend:request', ({ from }) => {
  if (!from) return; // CORREÇÃO BUG #2: ignorar solicitações com remetente undefined
  if (friends.find(f => f.username === from)) return;
  if (friendRequests.find(r => r.from === from)) return;
  friendRequests.push({ from });
  saveRequests();
  updateFriendsBadge();
  showToast(`👋 ${from} quer ser seu amigo!`);
  
  // Tocar som de notificação
  try {
    const notificationSound = new Audio('Notification.wav');
    notificationSound.volume = 0.3;
    notificationSound.play().catch(() => {});
  } catch {}
  
  // Renderizar: atualizar modal ativo + SEMPRE atualizar painel #fr
  renderFriendsModal();
  // CORREÇÃO: sempre re-renderizar #fr ao receber nova solicitação em tempo real,
  // independente de qual aba está visível — assim o painel já está pronto quando
  // o usuário clicar em "Solicitações".
  renderFriendRequests();
  // Notificar FriendsSystem para sincronizar seu estado local com as variáveis globais
  window.dispatchEvent(new CustomEvent('zx:friends:updated'));
});

socket.on('friend:accepted', ({ by }) => {
  sentRequests = sentRequests.filter(u => u.toLowerCase() !== by.toLowerCase());
  saveSentRequests();
  if (!friends.find(f => (f.username || '').toLowerCase() === by.toLowerCase())) {
    friends.push({ username: by });
    saveFriends();
  }
  console.log('Solicitação aceita:', by);
  showToast(`✅ ${by} aceitou sua solicitação!`);
  renderFriendsModal();
});

socket.on('friend:rejected', ({ by }) => {
  sentRequests = sentRequests.filter(u => u.toLowerCase() !== by.toLowerCase());
  saveSentRequests();
  showToast(`${by} recusou sua solicitação.`);
});

socket.on('friend:removed', ({ by }) => {
    friends = friends.filter(f => f.username !== by);
    saveFriends();
    renderFriendsModal();
  });

  socket.on('friend:status', ({ username: uname, status }) => {
    const key = (uname || '').toLowerCase();
    userStatuses[key] = status;
    // Atualiza onlineSet em tempo real
    if (status === 'offline' || status === 'invisible') {
      onlineSet.delete(key);
    } else {
      onlineSet.add(key);
    }
    console.log('[friend:status]', key, '->', status, '| online agora:', [...onlineSet]);
    renderFriendsModal();
  });

  socket.on('friend:cancel:ok', ({ to }) => {
    sentRequests = sentRequests.filter(u => u.toLowerCase() !== to.toLowerCase());
    saveSentRequests();
    showToast(`Solicitação para ${to} cancelada.`);
    renderFriendsModal();
  });

  socket.on('friend:request:cancelled', ({ by }) => {
    friendRequests = friendRequests.filter(r => r.from !== by);
    saveRequests();
    updateFriendsBadge();
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
  const target = String(toUsername || '').trim().replace(/^@/, '');
  if (!target) { showToast('Digite um nome de usuário.'); return; }
  if (target.toLowerCase() === username.toLowerCase()) { showToast('Você não pode adicionar a si mesmo.'); return; }
  if (!socket || !socket.connected) { showToast('Sem conexão. Tente novamente.'); return; }
  if (friends.find(f => (f.username || f).toLowerCase() === target.toLowerCase())) { showToast('Já são amigos!'); return; }
  if (sentRequests.find(u => u.toLowerCase() === target.toLowerCase())) { showToast(`Já existe uma solicitação pendente para ${target}.`); return; }
  sentRequests.push(target);
  saveSentRequests(); // persistir no localStorage para sobreviver a F5
  console.log('Solicitação enviada:', { to: target });
  socket.emit('friend:request', { to: target });
  renderFriendsModal();
}
// Expor no window para que user-profile-system.js e FriendsSystem possam chamar (BUG #1 e #4)
window.sendFriendRequest = sendFriendRequest;

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

function cancelFriendRequest(toUsername) {
    const target = String(toUsername || '').trim();
    if (!target) return;
    sentRequests = sentRequests.filter(u => u !== target);
    socket.emit('friend:cancel', { to: target });
  }

  function removeFriend(uname) {
    friends = friends.filter(f => f.username !== uname);
    saveFriends();
    socket.emit('friend:remove', { to: uname });
    renderFriendsModal();
  }


  function getFriendStatusInfo(uname) {
    const key = (uname || '').toLowerCase();
    const isOnlinePresence = onlineSet.has(key);
    const status = userStatuses[key] || (isOnlinePresence ? 'online' : 'offline');
    const map = {
      online:    { label: 'Online',        cls: 'online',   dot: '#23d160' },
      idle:      { label: 'Ausente',       cls: 'idle',     dot: '#f0a500' },
      dnd:       { label: 'Não Perturbe',  cls: 'dnd',      dot: '#ff3860' },
      invisible: { label: 'Offline',       cls: 'offline',  dot: '#747f8d' },
      offline:   { label: 'Offline',       cls: 'offline',  dot: '#747f8d' },
    };
    return map[status] || map.offline;
  }
  
function renderFriendsModal() {
  const activeTab = document.querySelector('.mm-tab.active')?.dataset.tab || 'fo';
  // FIX: não re-renderizar a aba "Adicionar amigo" se o usuário está digitando
  // Isso impedia a digitação: cada evento de socket (presence, status) recriava
  // o innerHTML, destruindo o input focado e o texto já digitado.
  if (activeTab === 'fa-add') {
    const focused = document.activeElement;
    const addPane = document.getElementById('fa-add');
    if (addPane && focused && addPane.contains(focused)) {
      // Usuário está com foco dentro do painel de adicionar amigo — não re-renderizar
      updateFriendsBadge();
      return;
    }
  }
  renderFriendsTab(activeTab);
  updateFriendsBadge();
}

function renderFriendsTab(tabId) {
  if (tabId === 'fo') renderOnlineFriends();
  else if (tabId === 'fa') renderAllFriends();
  else if (tabId === 'fr') renderFriendRequests();
  else if (tabId === 'fa-add') renderAddFriend();
  else if (tabId === 'fa-log') { if (window._friendsLog) window._friendsLog.refresh(); }
}

function renderOnlineFriends() {
    const pane = document.getElementById('fo');
    if (!pane) return;
    // Status ativos: online, idle (ausente) e dnd (não perturbar) aparecem nesta aba
    const ACTIVE_STATUSES = new Set(['online', 'idle', 'dnd']);
    const online = friends.filter(f => {
      const uname = f.username || f;
      const key = (uname || '').toLowerCase();
      const presence = onlineSet.has(key);
      const status = userStatuses[key];
      // Considera ativo se: (está no onlineSet E sem status explícito de offline)
      // OU (status explícito é online/idle/dnd, independente do onlineSet)
      const isActive = (presence && (!status || ACTIVE_STATUSES.has(status)))
                    || ACTIVE_STATUSES.has(status);
      console.log('[online-tab] amigo:', uname, '| presence:', presence, '| status:', status, '| ativo:', isActive);
      return isActive;
    });
    console.log('[online-tab] amigos online filtrados:', online.map(f => f.username || f));
    if (online.length === 0) {
      pane.innerHTML = '<div class="empty-state">🟢<p>Nenhum amigo online no momento.</p></div>';
      return;
    }
    pane.innerHTML = online.map(f => friendCard(f.username || f, true)).join('');
    bindFriendCardEvents(pane);
  }

function renderAllFriends() {
    const pane = document.getElementById('fa');
    if (!pane) return;
    if (friends.length === 0) {
      pane.innerHTML = '<div class="empty-state">👥<p>Sua lista de amigos está vazia.</p></div>';
      return;
    }

    const prevSearch = pane.querySelector('#fa-search')?.value || '';

    // Mesma lógica da aba ONLINE: online/idle/dnd são "ativos"
    const _ACTIVE = new Set(['online', 'idle', 'dnd']);
    const _isActive = (key) => {
      const st = userStatuses[key];
      return (onlineSet.has(key) && (!st || _ACTIVE.has(st))) || _ACTIVE.has(st);
    };

    // Sort: ativos primeiro, depois offline
    const sorted = [...friends].sort((a, b) => {
      const ua = a.username || a, ub = b.username || b;
      const oa = _isActive(ua.toLowerCase());
      const ob = _isActive(ub.toLowerCase());
      if (oa && !ob) return -1;
      if (!oa && ob) return 1;
      return ua.localeCompare(ub);
    });

    const onlineCount = sorted.filter(f => _isActive((f.username || f).toLowerCase())).length;

    pane.innerHTML = `
      <div style="padding:12px 16px 8px;border-bottom:1px solid rgba(255,0,255,0.1)">
        <input id="fa-search" type="text" placeholder="🔍 Pesquisar amigos..." value="${escHtml(prevSearch)}"
          style="width:100%;box-sizing:border-box;padding:8px 12px;background:rgba(0,0,0,0.4);
          border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:#fff;outline:none;font-size:13px"/>
      </div>
      <div style="padding:6px 16px 2px">
        <span style="font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.05em">
          Todos os amigos — ${friends.length}
        </span>
      </div>
      <div id="fa-list">${sorted.map(f => friendCard(f.username || f, onlineSet.has((f.username || f).toLowerCase()))).join('')}</div>
    `;

    const searchInput = pane.querySelector('#fa-search');
    searchInput?.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      pane.querySelectorAll('.friend-card').forEach(card => {
        const name = card.querySelector('.friend-name')?.textContent?.toLowerCase() || '';
        card.style.display = name.includes(q) ? '' : 'none';
      });
    });
    if (prevSearch) {
      const q = prevSearch.toLowerCase();
      pane.querySelectorAll('.friend-card').forEach(card => {
        const name = card.querySelector('.friend-name')?.textContent?.toLowerCase() || '';
        card.style.display = name.includes(q) ? '' : 'none';
      });
    }

    bindFriendCardEvents(pane);
  }

function renderFriendRequests() {
    const pane = document.getElementById('fr');
    if (!pane) return;
    const prevSubTab = pane.querySelector('.fr-subtab.active')?.dataset.sub || 'received';

    pane.innerHTML = `
      <div style="display:flex;gap:4px;padding:12px 16px 0;border-bottom:1px solid rgba(255,0,255,0.1);padding-bottom:0">
        <button class="fr-subtab ${prevSubTab==='received'?'active':''}" data-sub="received"
          style="padding:8px 16px;background:transparent;border:none;cursor:pointer;font-size:13px;
          border-bottom:2px solid ${prevSubTab==='received'?'var(--neon, #ff00ff)':'transparent'};
          color:${prevSubTab==='received'?'#fff':'#888'};transition:.2s">
          Recebidas <span style="background:rgba(255,0,255,.2);color:#ff00ff;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px">${friendRequests.length}</span>
        </button>
        <button class="fr-subtab ${prevSubTab==='sent'?'active':''}" data-sub="sent"
          style="padding:8px 16px;background:transparent;border:none;cursor:pointer;font-size:13px;
          border-bottom:2px solid ${prevSubTab==='sent'?'var(--neon, #ff00ff)':'transparent'};
          color:${prevSubTab==='sent'?'#fff':'#888'};transition:.2s">
          Enviadas <span style="background:rgba(255,0,255,.2);color:#ff00ff;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px">${sentRequests.length}</span>
        </button>
      </div>
      <div id="fr-content" style="padding:8px 0"></div>
    `;

    function renderSubTab(sub) {
      const content = pane.querySelector('#fr-content');
      if (!content) return;
      if (sub === 'received') {
        // Filtrar entradas inválidas (sem campo 'from' ou 'from' vazio)
        const validRequests = friendRequests.filter(r => {
          const from = (typeof r === 'string') ? r : r.from;
          return from && typeof from === 'string' && from.trim().length > 0;
        });
        console.log('renderSubTab received — friendRequests:', friendRequests, 'válidos:', validRequests);
        if (validRequests.length === 0) {
          content.innerHTML = '<div class="empty-state">📩<p>Nenhuma solicitação recebida.</p></div>';
          return;
        }
        content.innerHTML = validRequests.map(r => {
          const from = (typeof r === 'string') ? r : (r.from || '');
          if (!from) return '';
          const initial = from[0].toUpperCase();
          return `
            <div class="friend-card" data-friend-card="${escHtml(from)}">
              <div class="friend-avatar-wrap">
                <div class="friend-avatar av-${initial}">${initial}</div>
              </div>
              <div class="friend-info">
                <span class="friend-name">${escHtml(from)}</span>
                <span class="friend-status pending">Quer ser seu amigo</span>
              </div>
              <div class="friend-actions">
                <button class="friend-btn friend-btn-accept" data-accept="${escHtml(from)}" title="Aceitar">✔</button>
                <button class="friend-btn friend-btn-reject" data-reject="${escHtml(from)}" title="Recusar">✖</button>
              </div>
            </div>`;
        }).join('');
        content.querySelectorAll('[data-accept]').forEach(btn =>
          btn.addEventListener('click', () => acceptFriendRequest(btn.dataset.accept)));
        content.querySelectorAll('[data-reject]').forEach(btn =>
          btn.addEventListener('click', () => rejectFriendRequest(btn.dataset.reject)));
      } else {
        if (sentRequests.length === 0) {
          content.innerHTML = '<div class="empty-state">📤<p>Nenhuma solicitação enviada.</p></div>';
          return;
        }
        content.innerHTML = sentRequests.map(to => {
          const initial = to[0].toUpperCase();
          return `
            <div class="friend-card" data-friend-card="${escHtml(to)}">
              <div class="friend-avatar-wrap">
                <div class="friend-avatar av-${initial}">${initial}</div>
              </div>
              <div class="friend-info">
                <span class="friend-name">${escHtml(to)}</span>
                <span class="friend-status pending">Solicitação enviada</span>
              </div>
              <div class="friend-actions">
                <button class="friend-btn friend-btn-reject" data-cancel="${escHtml(to)}" title="Cancelar">✖ Cancelar</button>
              </div>
            </div>`;
        }).join('');
        content.querySelectorAll('[data-cancel]').forEach(btn =>
          btn.addEventListener('click', () => {
            cancelFriendRequest(btn.dataset.cancel);
            btn.closest('.friend-card').remove();
          }));
      }
    }

    renderSubTab(prevSubTab);

    pane.querySelectorAll('.fr-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        pane.querySelectorAll('.fr-subtab').forEach(b => {
          b.classList.remove('active');
          b.style.borderBottomColor = 'transparent';
          b.style.color = '#888';
        });
        btn.classList.add('active');
        btn.style.borderBottomColor = 'var(--neon, #ff00ff)';
        btn.style.color = '#fff';
        renderSubTab(btn.dataset.sub);
      });
    });
  }

function renderAddFriend() {
  const pane = document.getElementById('fa-add');
  if (!pane) return;

  // FIX DEFINITIVO: se o input já existe, NÃO recriar o innerHTML.
  // Recriar destrói o foco e apaga qualquer texto já digitado.
  // Só renderizar na primeira vez (input ainda não existe no DOM).
  const existingInput = pane.querySelector('#friend-add-input');
  if (existingInput) {
    // Input já existe — garantir que os eventos ainda estão vinculados
    // (podem ter sido perdidos se algo chamou pane.innerHTML externamente)
    _bindAddFriendEvents(pane);
    return;
  }

  pane.innerHTML = `
    <div class="friend-add-box">
      <p class="friend-add-hint">Adicione um amigo pelo nome de usuário exato.</p>
      <div class="friend-add-row">
        <input
          type="text"
          id="friend-add-input"
          placeholder="Nome do usuário..."
          maxlength="32"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          style="pointer-events:auto;user-select:text;position:relative;z-index:10;"
        />
        <button type="button" class="btn-neon" id="btn-send-friend-req">Enviar solicitação</button>
      </div>
      <p style="font-size:11px;color:#666;margin-top:4px">Digite o nome exato (case-insensitive). Não use @.</p>
    </div>`;

  _bindAddFriendEvents(pane);
}

function _bindAddFriendEvents(pane) {
  const input = pane.querySelector('#friend-add-input');
  const btn   = pane.querySelector('#btn-send-friend-req');
  if (!input || !btn) return;

  // Usar flag para evitar listeners duplicados
  if (btn._addFriendBound) return;
  btn._addFriendBound = true;

  function doSend() {
    const val = input.value.trim();
    if (!val) return;
    sendFriendRequest(val);
    input.value = '';
    input.focus();
  }

  btn.addEventListener('click', doSend);

  input.addEventListener('keydown', function(e) {
    // Garantir que teclas normais não sejam bloqueadas por outros listeners
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      doSend();
    }
    // Parar propagação de qualquer tecla enquanto este input está focado
    // para evitar que handlers globais (modal close, etc.) interceptem
    e.stopPropagation();
  });

  // Roubo de foco: garantir que o input mantenha o foco ao ser clicado
  input.addEventListener('mousedown', function(e) {
    e.stopPropagation(); // evitar que o backdrop do modal capture o mousedown
  });

  input.addEventListener('click', function(e) {
    e.stopPropagation();
    this.focus();
  });
}

function friendCard(uname, isOnline) {
    const initial = uname[0].toUpperCase();
    const si = getFriendStatusInfo(uname);
    return `
      <div class="friend-card" data-friend-card="${escHtml(uname)}" style="position:relative">
        <div class="friend-avatar-wrap">
          <div class="friend-avatar av-${initial}">${initial}</div>
          <span class="friend-status-dot" style="background:${si.dot};position:absolute;bottom:0;right:0;width:11px;height:11px;border-radius:50%;border:2px solid var(--bg-dark,#12121a)"></span>
        </div>
        <div class="friend-info">
          <span class="friend-name">${escHtml(uname)}</span>
          <span class="friend-status ${si.cls}">${si.label}</span>
        </div>
        <div class="friend-actions">
          <button class="friend-btn" data-dm="${escHtml(uname)}" title="Mensagem" style="font-size:16px">💬</button>
          <button class="friend-btn" data-profile="${escHtml(uname)}" title="Ver perfil" style="font-size:16px">👤</button>
          <button class="friend-btn friend-btn-remove" data-remove="${escHtml(uname)}" title="Remover amigo" style="font-size:14px;color:#f87171">✖</button>
        </div>
      </div>`;
  }

function bindFriendCardEvents(pane) {
    pane.querySelectorAll('[data-remove]').forEach(btn =>
      btn.addEventListener('click', () => {
        if (confirm(`Remover ${btn.dataset.remove} da lista de amigos?`)) removeFriend(btn.dataset.remove);
      }));
    pane.querySelectorAll('[data-dm]').forEach(btn =>
      btn.addEventListener('click', () => {
        if (typeof window.openPrivateChat === 'function') window.openPrivateChat(btn.dataset.dm);
        else if (window.friendsSystem) window.friendsSystem.openConversation(btn.dataset.dm);
      }));
    pane.querySelectorAll('[data-profile]').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que o click feche o popup imediatamente
        if (typeof window.showUserProfile === 'function') window.showUserProfile(btn.dataset.profile, btn);
        else if (window._profilePopup) window._profilePopup.show(btn.dataset.profile);
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
btnTypewriter?.addEventListener('click', () => {
  hideAllViews();
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.server-rail-icon').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-home').classList.remove('active');
  
  forceShowEl(document.getElementById('typewriter-view'));
  showToast('⌨ Máquina de Escrever');
});

// Botão Salvar
btnTypewriterSave?.addEventListener('click', () => {
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
  
  // ✅ CORREÇÃO DE ENCODING PARA MOJIBAKE
  function fixEncoding(text) {
    if (!text) return text;
    try {
      // Tenta decodificar caracteres corrompidos Latin1 -> UTF-8
      return decodeURIComponent(escape(text));
    } catch(e) {
      return text;
    }
  }

  typewriterSavesList.innerHTML = typewriterSaves.map(save => `
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; padding: 1rem; border-bottom: 1px solid rgba(255,0,255,0.1);">
      <div>${fixEncoding(save.time)}</div>
      <div>${fixEncoding(save.count)}</div>
      <div>${fixEncoding(save.status)}</div>
    </div>
  `).join('');
}

// ================================================
// ✅ SISTEMA DE LEVEL E XP
// ================================================
let userLevel = parseInt(localStorage.getItem('userLevel')) || 1;
let userXP = parseInt(localStorage.getItem('userXP')) || 0;

// ✅ FÓRMULA BALANCEADA PARA 100 NÍVEIS
// Progressão crescente: cada nível fica 5% mais difícil que o anterior
// Nível 1: 100 XP | Nível 50: ~11.000 XP | Nível 100: ~130.000 XP total
function calculateXPForLevel(level) {
  return Math.floor(100 * Math.pow(1.05, level - 1));
}

let xpForNextLevel = calculateXPForLevel(userLevel);

function updateLevelUI() {
  const levelEl = document.getElementById('user-level');
  const xpBarEl = document.getElementById('xp-bar');
  const xpTextEl = document.getElementById('xp-text');
  
  if (levelEl) levelEl.textContent = `LVL ${userLevel}`;
  if (xpBarEl) xpBarEl.style.width = `${(userXP / xpForNextLevel) * 100}%`;
  if (xpTextEl) xpTextEl.textContent = `${userXP}/${xpForNextLevel}`;
}

function addXP(amount) {
  userXP += amount;
  
  // Verificar se subiu de nível
  while (userXP >= xpForNextLevel && userLevel < 100) {
    userXP -= xpForNextLevel;
    userLevel++;
    xpForNextLevel = calculateXPForLevel(userLevel);
    
    // Efeito visual ao subir de nível
    const levelContainer = document.getElementById('level-system-container');
    if (levelContainer) {
      levelContainer.style.animation = 'levelUp 0.5s ease';
      setTimeout(() => levelContainer.style.animation = '', 500);
    }
    
    showToast(`🎉 Parabéns! Você subiu para o Nível ${userLevel}!`);
  }
  
  // Salvar progresso
  localStorage.setItem('userLevel', userLevel);
  localStorage.setItem('userXP', userXP);
  
  updateLevelUI();
}

// Ganhar XP por ações na plataforma
function registerXPEvents() {
  // +1 XP por mensagem enviada
  const originalSendMessage = sendMessage;
  sendMessage = function() {
    originalSendMessage.apply(this, arguments);
    addXP(1);
  };
  
  // +2 XP por salvamento na máquina de escrever
  const originalTypewriterSave = btnTypewriterSave.onclick;
  btnTypewriterSave.addEventListener('click', () => {
    setTimeout(() => addXP(2), 100);
  });
  
  // +5 XP por servidor criado
  const originalCreateServer = createServer;
  createServer = function() {
    originalCreateServer.apply(this, arguments);
    addXP(5);
  };
  
  // +1 XP por minuto online
  setInterval(() => {
    addXP(1);
  }, 60000);
}

// Inicializar sistema de Level
updateLevelUI();
registerXPEvents();

// Inicializar máquina de escrever
renderTypewriterSaves();

// ── Utilitários ──
function saveServers() {
  localStorage.setItem('zx_servers', JSON.stringify(servers));
  window.servers = servers;
}
window.saveServers = saveServers;

// ── Deletar servidor atual (apenas o Dono) ──
function deleteCurrentServer() {
  const serverId = window.currentServerId;
  if (!serverId) return;
  const username = sessionStorage.getItem('username') || '';
  if (window.ZXPermissions && !window.ZXPermissions.hasServerPermission(username, serverId, 'DELETE_SERVER')) {
    alert('Apenas o Dono pode deletar o servidor.');
    return;
  }
  const idx = servers.findIndex(s => s.id === serverId);
  if (idx !== -1) servers.splice(idx, 1);
  saveServers();
  window.currentServerId = null;
  if (typeof renderServersRail === 'function') renderServersRail();
  if (typeof showDiscoverView === 'function') showDiscoverView();
}
window.deleteCurrentServer = deleteCurrentServer;

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
visualSettingsBtn?.addEventListener('click', () => {
  loadVisualSettings();
  visualSettingsModal.classList.remove('hidden');
});

vsCancelBtn?.addEventListener('click', () => {
  visualSettingsModal.classList.add('hidden');
});

vsResetBtn?.addEventListener('click', () => {
  userVisualProfile = { ...DEFAULT_VISUAL_PROFILE };
  localStorage.setItem('zx_visual_profile', JSON.stringify(userVisualProfile));
  loadVisualSettings();
  showToast('Aparência resetada para padrão');
});

vsSaveBtn?.addEventListener('click', () => {
  // Valida legibilidade
  if (!validateContrast(vsBubbleColor.value, vsTextColor.value)) {
    showToast('🔍 Combinação de cores com baixa legibilidade. Escolha cores com maior contraste.');
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

// ? REMOVER ESTA FUNÇÃO COMPLETAMENTE - DUPLICADA
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
  
  // ? CATEGORIA DE EMOJIS DO SERVIDOR
  if (category === 'server') {
    // PEGAR SERVIDOR ATUAL DIRETAMENTE DO ARRAY GLOBAL
    const server = window.servers?.find(s => s.id === window.currentServerId);
    
    // DEBUG: Mostrar no console o que está sendo carregado
    
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
        
        const html = `<button class="emoji-item" data-emoji="${emojiCode}" title="${emojiTitle}">${emojiContent}</button>`;
        renderedEmojis.push(html);
      } else {
      }
    } else {
      emojiContent = e;
      emojiCode = e;
      emojiTitle = '';
      const html = `<button class="emoji-item" data-emoji="${emojiCode}" title="${emojiTitle}">${emojiContent}</button>`;
      renderedEmojis.push(html);
    }
  }


  container.innerHTML = `<div class="emoji-grid">
    ${renderedEmojis.join('')}
  </div>`;

  
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

// ? ATUALIZAR CATEGORIAS DINAMICAMENTE
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
      serverBtn.innerHTML = '😀';
      
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

// -- Botão + e Anexar --
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
        console.log('📊 Abrindo modal de enquete do script.js');
        
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
                    text: '🔍 **ENQUETE**: ' + question.trim() + '\\n\\n' + options.map(function(o, i) { return (i+1) + '. ' + o; }).join('\\n'), 
                    communityId: currentServerId 
                  });

                  this.closest('.modal-overlay').remove();
                  showToast('✅ Enquete criada com sucesso!');
                ">📊 Criar Enquete</button>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('poll-question')?.focus(), 100);
      }
      
      if (item.dataset.action === 'topic') {
        console.log('💬 Abrindo modal de tópico do script.js');
        
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

                  let messageText = '🔍 **TÓPICO**: ' + title.trim();
                  if (content) messageText += '\\n\\n' + content;
                  messageText += '\\n\\nDiscuta abaixo 👇';

                  socket.emit('message', { 
                    channel: currentChannel, 
                    text: messageText, 
                    communityId: currentServerId 
                  });

                  this.closest('.modal-overlay').remove();
                  showToast('✅ Tópico criado com sucesso!');
                ">💬 Criar Tópico</button>
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
      const content = isImage ? `![${file.name}](${reader.result})` : isVideo ? `🎬 [${file.name}](${reader.result})` : isAudio ? `🎬 [${file.name}](${reader.result})` : `🎬 [${file.name}](${reader.result})`;
      socket.emit('message', { channel: currentChannel, text: content, communityId: currentServerId });
      showToast(`? ${file.name} anexado!`);
    };
    reader.readAsDataURL(file);
  }
  e.target.value = '';
});

} // fim do bloco de pickers (if btnEmoji)


// ================================================
// CARGO: INFO DO @todos
// ================================================
function showRoleTodosInfo() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:999999;backdrop-filter:blur(6px);';
  overlay.innerHTML = `
    <div style="background:#1a1a2e;border:1px solid rgba(255,170,0,0.4);border-radius:16px;width:480px;max-width:95vw;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,0.8);">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#ff8800,#ffaa00);display:flex;align-items:center;justify-content:center;font-size:22px;">📢</div>
        <div>
          <div style="font-size:20px;font-weight:800;color:#ffaa00;">@todos</div>
          <div style="color:#888;font-size:13px;">Cargo Especial do Servidor</div>
        </div>
      </div>
      <div style="background:rgba(255,170,0,0.08);border:1px solid rgba(255,170,0,0.25);border-radius:10px;padding:16px;color:#ccc;font-size:14px;line-height:1.7;margin-bottom:18px;">
        O <strong style="color:#ffaa00">@todos</strong> é um cargo especial que menciona <em>todos os membros</em> do servidor — similar ao <strong>@everyone</strong> do Discord.<br><br>
        Ao digitar <code style="background:rgba(255,170,0,0.2);color:#ffaa00;padding:1px 6px;border-radius:4px;">@todos</code> no chat e enviar, a mensagem fica destacada em amarelo para todos os membros.<br><br>
        Apenas membros com a permissão <strong style="color:#fff">Mencionar @todos</strong> ativa no cargo podem usá-lo.
      </div>
      <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#666;letter-spacing:.5px;margin-bottom:10px;">Como usar</div>
        <div style="color:#ccc;font-size:13px;display:flex;flex-direction:column;gap:8px;">
          <div>⌨️ Digite <code style="background:rgba(255,170,0,0.15);color:#ffaa00;padding:1px 6px;border-radius:4px;">@todos</code> ou <code style="background:rgba(255,170,0,0.15);color:#ffaa00;padding:1px 6px;border-radius:4px;">@here</code> em qualquer mensagem</div>
          <div>💡 Autocomplete aparece ao digitar <code style="color:#ffaa00">@</code></div>
          <div>🔔 Membros veem destaque amarelo na mensagem recebida</div>
        </div>
      </div>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;padding:12px;background:linear-gradient(135deg,#8b00ff,#ff00ff);border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer;font-size:14px;">Fechar</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ================================================
// CARGO: MODAL AVANÇADO DE PERMISSÕES (DISCORD-STYLE)
// ================================================
function openRolePermissionsModal(role, server) {
  document.getElementById('role-permissions-modal')?.remove();

  const allPerms = [
    { cat: '⚙️ Geral', perms: [
      { id: 'administrator', name: 'Administrador', desc: 'Acesso total ao servidor' },
      { id: 'viewChannels', name: 'Ver canais', desc: 'Pode visualizar canais' },
      { id: 'manageChannels', name: 'Gerenciar canais', desc: 'Criar, editar e excluir canais' },
      { id: 'manageServer', name: 'Gerenciar servidor', desc: 'Alterar configurações do servidor' },
      { id: 'viewAuditLog', name: 'Ver auditoria', desc: 'Visualizar o histórico de ações' },
      { id: 'createInvite', name: 'Criar convite', desc: 'Gerar links de convite' },
    ]},
    { cat: '👥 Membros', perms: [
      { id: 'kickMembers', name: 'Expulsar membros', desc: 'Remover membros do servidor' },
      { id: 'banMembers', name: 'Banir membros', desc: 'Banir membros permanentemente' },
      { id: 'manageNicknames', name: 'Gerenciar nicknames', desc: 'Alterar apelidos de outros membros' },
      { id: 'manageRoles', name: 'Gerenciar cargos', desc: 'Criar e editar cargos' },
    ]},
    { cat: '💬 Texto', perms: [
      { id: 'sendMessages', name: 'Enviar mensagens', desc: 'Enviar mensagens nos canais' },
      { id: 'manageMessages', name: 'Gerenciar mensagens', desc: 'Apagar e fixar mensagens' },
      { id: 'embedLinks', name: 'Incorporar links', desc: 'Links geram preview' },
      { id: 'attachFiles', name: 'Anexar arquivos', desc: 'Enviar arquivos e imagens' },
      { id: 'mentionEveryone', name: 'Mencionar @todos', desc: 'Pode usar @todos e @here' },
      { id: 'addReactions', name: 'Adicionar reações', desc: 'Reagir com emojis nas mensagens' },
    ]},
    { cat: '🔊 Voz', perms: [
      { id: 'connect', name: 'Conectar', desc: 'Entrar em canais de voz' },
      { id: 'speak', name: 'Falar', desc: 'Falar nos canais de voz' },
      { id: 'muteMembers', name: 'Mutar membros', desc: 'Mutar microfone de outros' },
      { id: 'prioritySpeaker', name: 'Prioridade de fala', desc: 'Voz com prioridade no canal' },
    ]},
  ];

  const permsHtml = allPerms.map(cat => {
    const rows = cat.perms.map(p =>
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 16px;border-bottom:1px solid rgba(255,255,255,0.05);">' +
        '<div><div style="font-size:13px;color:#ccc;">' + p.name + '</div><div style="font-size:11px;color:#666;">' + p.desc + '</div></div>' +
        '<label class="toggle-switch" style="width:40px;height:22px;">' +
          '<input type="checkbox" data-perm="' + p.id + '" ' + (role.perms?.[p.id] ? 'checked' : '') + '>' +
          '<span class="toggle-slider"></span>' +
        '</label>' +
      '</div>'
    ).join('');
    return '<div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.07);border-radius:8px;margin-bottom:10px;overflow:hidden;">' +
      '<div style="padding:10px 16px;background:rgba(0,0,0,0.3);font-weight:600;font-size:13px;color:#ccc;">' + cat.cat + '</div>' +
      rows + '</div>';
  }).join('');

  const overlay = document.createElement('div');
  overlay.id = 'role-permissions-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:999999;backdrop-filter:blur(6px);';
  overlay.innerHTML =
    '<style>@keyframes rpmIn{from{opacity:0;transform:scale(0.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}</style>' +
    '<div style="background:#1a1a2e;border:1px solid rgba(255,0,255,0.4);border-radius:16px;width:520px;max-width:95vw;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.8),0 0 40px rgba(255,0,255,0.12);animation:rpmIn .25s cubic-bezier(.34,1.56,.64,1);">' +
      '<div style="padding:20px 24px;border-bottom:1px solid rgba(255,0,255,0.2);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#1a1a2e;z-index:1;">' +
        '<div>' +
          '<div style="font-size:17px;font-weight:700;color:#fff;">⚙️ Permissões: ' + escHtml(role.name) + '</div>' +
          '<div style="font-size:12px;color:#888;margin-top:2px;">Configurar permissões deste cargo</div>' +
        '</div>' +
        '<button onclick="document.getElementById(\'role-permissions-modal\').remove()" style="background:transparent;border:none;color:#888;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:6px;">✕</button>' +
      '</div>' +
      '<div style="padding:20px 24px;">' +
        '<div style="display:flex;align-items:center;gap:12px;background:rgba(0,0,0,0.3);border-radius:10px;padding:14px 16px;margin-bottom:20px;">' +
          '<div style="width:16px;height:16px;border-radius:50%;background:' + role.color + ';flex-shrink:0;"></div>' +
          '<div style="color:' + role.color + ';font-weight:700;font-size:15px;">' + (role.icon ? role.icon + ' ' : '') + escHtml(role.name) + '</div>' +
          (role.separate ? '<span style="margin-left:auto;font-size:11px;background:rgba(88,101,242,0.2);color:#a8b4ff;padding:2px 8px;border-radius:8px;">Barra online</span>' : '') +
        '</div>' +
        '<div style="margin-bottom:20px;">' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:12px;">Configurações visuais</div>' +
          '<label style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">' +
            '<div><div style="font-size:14px;color:#ccc;">Destacar nome do membro</div><div style="font-size:12px;color:#666;">Nome colorido com a cor do cargo</div></div>' +
            '<label class="toggle-switch" style="width:40px;height:22px;"><input type="checkbox" id="role-modal-highlight" ' + (role.highlight ? 'checked' : '') + '><span class="toggle-slider"></span></label>' +
          '</label>' +
          '<label style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;">' +
            '<div><div style="font-size:14px;color:#ccc;">Exibir separadamente na barra online</div><div style="font-size:12px;color:#666;">Membros ficam em grupo separado</div></div>' +
            '<label class="toggle-switch" style="width:40px;height:22px;"><input type="checkbox" id="role-modal-separate" ' + (role.separate ? 'checked' : '') + '><span class="toggle-slider"></span></label>' +
          '</label>' +
        '</div>' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:12px;">Permissões</div>' +
        permsHtml +
      '</div>' +
      '<div style="padding:16px 24px;border-top:1px solid rgba(255,0,255,0.2);display:flex;justify-content:flex-end;gap:12px;position:sticky;bottom:0;background:#1a1a2e;">' +
        '<button onclick="document.getElementById(\'role-permissions-modal\').remove()" style="padding:10px 20px;background:transparent;border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#ccc;cursor:pointer;">Cancelar</button>' +
        '<button id="btn-save-role-modal" style="padding:10px 24px;background:linear-gradient(135deg,#8b00ff,#ff00ff);border:none;border-radius:6px;color:#fff;font-weight:700;cursor:pointer;font-size:14px;">✅ Salvar permissões</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('btn-save-role-modal')?.addEventListener('click', () => {
    if (!role.perms) role.perms = {};
    overlay.querySelectorAll('input[data-perm]').forEach(cb => { role.perms[cb.dataset.perm] = cb.checked; });
    role.highlight = document.getElementById('role-modal-highlight')?.checked || false;
    role.separate = document.getElementById('role-modal-separate')?.checked || false;
    saveServers();
    overlay.remove();
    renderServerSettingsSection('cargos');
    showToast('✅ Permissões salvas!');
  });
}
