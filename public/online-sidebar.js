// ================================================
// SIDEBAR DIREITA - PESSOAS ONLINE
// Dados de exemplo e renderização
// ================================================

// Usuários online em tempo real (atualizados via Socket.IO)
let onlineUsers = [];

// Destaques da comunidade (dados dinâmicos)
let communityHighlights = [];

function renderOnlineSidebar() {
  renderUsersList();
  renderActivities();
  renderHighlights();
}

function renderUsersList() {
  const container = document.getElementById('online-users-list');
  if (!container) return;

  // ✅ LIMPA USUÁRIOS INVÁLIDOS ANTES DE RENDERIZAR
  onlineUsers = onlineUsers.filter(user => {
    return user && 
           user.id && 
           user.name && 
           typeof user.name === 'string' && 
           user.name.trim() !== '' &&
           user.name !== 'undefined' &&
           user.name !== 'null';
  });

  container.innerHTML = onlineUsers.map(user => {
    const avUrl = (typeof getFriendAvatar === 'function' ? getFriendAvatar(user.name) : null)
               || (user.avatar && user.avatar !== 'undefined' && (user.avatar.startsWith('data:image') || user.avatar.startsWith('http')) ? user.avatar : null);
    if (!avUrl && user.name && typeof requestUserAvatar === 'function') requestUserAvatar(user.name);
    const avatarContent = avUrl ? '' : (user.name ? user.name[0].toUpperCase() : '?');
    const avatarStyle = avUrl ? `background-image:url(${avUrl});background-size:cover;background-position:center;` : '';
    const statusText = user.status || '';
    const level = user.level || 1;
    const badges = user.badges || [];
    const gameActivity = user.activity && user.activity.text ? user.activity : null;
    
    return `
    <div class="user-item" data-user-id="${user.id}" data-username="${user.name}" style="cursor:pointer;">
      <div class="user-avatar-online" style="${avatarStyle}">
        ${avatarContent}
        <div class="status-dot ${user.statusType || 'online'}"></div>
      </div>
      <div class="user-name" title="Clique para ver perfil | Botão direito para opções">
        ${user.name || '?'}
        ${badges.map(badge => `<span class="badge ${badge}"></span>`).join('')}
      </div>
      ${gameActivity ? `
      <div class="user-game-activity">
        <span class="game-icon">${gameActivity.icon || '🎮'}</span>
        <span class="game-text">${gameActivity.text}</span>
      </div>
      ` : `
      <div class="user-status">${statusText}</div>
      `}
      <div class="user-level">⭐ ${level}</div>
    </div>
  `;
  }).join('');

  // Atualiza contador de membros online EM TEMPO REAL - DEPOIS de renderizar
  const countEl = document.getElementById('online-count');
  if (countEl) {
    const totalRenderizados = container.querySelectorAll('.user-item').length;
    countEl.textContent = totalRenderizados;
  }

  // ✅ CLIQUE E CONTEXTMENU delegados via user-profile-system.js
  // Mas adicionamos também handlers diretos para garantir compatibilidade
  container.querySelectorAll('.user-item').forEach((item) => {
    const username = item.dataset.username;
    if (!username) return;

    // Click → abre perfil (via user-profile-system.js se disponível)
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      if (username === window.currentUserNick) return;
      const nameEl = item.querySelector('.user-name');
      if (typeof window.showUserProfile === 'function') {
        window.showUserProfile(username, nameEl || item);
      } else {
        if (typeof showToast === 'function') showToast('👤 ' + username);
      }
    });

    // Botão direito → menu de contexto (via user-profile-system.js se disponível)
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.showUserContextMenu === 'function') {
        window.showUserContextMenu(username, e.clientX, e.clientY);
      }
    });
  });
}

function renderActivities() {
  const container = document.getElementById('activities-list');
  if (!container) return;

  const activeUsers = onlineUsers.filter(u => u.activity);
  
  container.innerHTML = activeUsers.map(user => `
    <div class="activity-card">
      <div class="activity-avatar">${user.avatar}</div>
      <div class="activity-info">
        <div class="activity-user">${user.name}</div>
        <div class="activity-desc">${user.activity.text}</div>
      </div>
      <div class="activity-icon">${user.activity.icon}</div>
    </div>
  `).join('');
}

function renderHighlights() {
  const container = document.getElementById('highlights-list');
  if (!container) return;

  container.innerHTML = communityHighlights.map(highlight => `
    <div class="highlight-item">
      <span class="highlight-icon">${highlight.icon}</span>
      <div class="highlight-info">
        <span class="highlight-label">${highlight.label}</span>
        <span class="highlight-user">${highlight.user}</span>
      </div>
    </div>
  `).join('');
}

// Função para pegar o nome real do usuário
function getRealUserName() {
  const nameEl = document.getElementById('user-name-display');
  if (nameEl && nameEl.textContent && nameEl.textContent.trim()) {
    return nameEl.textContent.trim();
  }
  return null;
}

// ✅ ATUALIZA CONTADOR EM TEMPO REAL A CADA 500ms
setInterval(() => {
  const countEl = document.getElementById('online-count');
  const container = document.getElementById('online-users-list');
  if (countEl && container) {
    const realCount = container.querySelectorAll('.user-item').length;
    countEl.textContent = realCount;
  }
}, 500);

// ✅ CRIA BOTÃO DE TOGGLE DA SIDEBAR
function createToggleButton() {
  if (document.getElementById('toggle-online-sidebar')) return;
  
  // ✅ SOMENTE CRIA O BOTÃO NA PÁGINA PRINCIPAL, NÃO NAS COMUNIDADES
  const isCommunityPage = window.location.pathname.includes('community') || window.location.search.includes('id=');
  if (isCommunityPage) return;
  
  const btn = document.createElement('button');
  btn.id = 'toggle-online-sidebar';
  btn.innerHTML = '◀';
  
  btn.onclick = function() {
    const sidebar = document.querySelector('.online-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
      btn.innerHTML = sidebar.classList.contains('collapsed') ? '▶' : '◀';
    }
  };
  
  document.body.appendChild(btn);
  console.log('✅ Botão toggle criado com sucesso');
}

// Tenta criar o botão constantemente
setInterval(createToggleButton, 500);


// Inicializar quando o documento carregar
document.addEventListener('DOMContentLoaded', () => {
  
  // Verificar repetidamente até que o nome do usuário esteja carregado
  const checkInterval = setInterval(() => {
    const userName = getRealUserName();
    
    if (userName) {
      clearInterval(checkInterval);
      
      // Adicionar o próprio usuário automaticamente na lista
      const currentUser = {
        id: 'self',
        name: userName,
        avatar: '',
        status: 'Online',
        statusType: 'online',
        level: 1,
        badges: []
      };
      
      // Verificar se já não está na lista
      const exists = onlineUsers.find(u => u.id === 'self');
      if (!exists) {
        onlineUsers.unshift(currentUser);
      }
      
      renderOnlineSidebar();
    }
  }, 100);
  
  // Parar de verificar depois de 10 segundos no pior caso
  setTimeout(() => clearInterval(checkInterval), 10000);
  
});

// Atualizar status do usuário sempre que for alterado
window.addEventListener('userStatusChanged', (e) => {
  const selfUser = onlineUsers.find(u => u.id === 'self');
  if (selfUser) {
    selfUser.statusType = e.detail.status;
    renderOnlineSidebar();
  }
});

// Exportar para uso global
window.renderOnlineSidebar = renderOnlineSidebar;
window.onlineUsers = onlineUsers;

// ✅ Função para testar atividade de jogo (exemplo Discord Rich Presence)
window.setUserGameActivity = function(gameName, icon = '🎮') {
  const selfUser = onlineUsers.find(u => u.id === 'self');
  if (selfUser) {
    selfUser.activity = {
      text: gameName,
      icon: icon
    };
    renderOnlineSidebar();
    showToast(`✅ Status de jogo definido: ${gameName}`);
  }
};

// ✅ Função para remover atividade de jogo
window.clearUserGameActivity = function() {
  const selfUser = onlineUsers.find(u => u.id === 'self');
  if (selfUser) {
    delete selfUser.activity;
    renderOnlineSidebar();
    showToast(`✅ Status de jogo removido`);
  }
};
