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
    const avatarContent = (user.avatar && user.avatar !== 'undefined') ? user.avatar : (user.name ? user.name[0].toUpperCase() : '?');
    const statusText = user.status || '';
    const level = user.level || 1;
    const badges = user.badges || [];
    return `
    <div class="user-item" data-user-id="${user.id}">
      <div class="user-avatar-online">
        ${avatarContent}
        <div class="status-dot ${user.statusType || 'online'}"></div>
      </div>
      <div class="user-name">
        ${user.name || '?'}
        ${badges.map(badge => `<span class="badge ${badge}"></span>`).join('')}
      </div>
      <div class="user-status">${statusText}</div>
      <div class="user-level">⭐ ${level}</div>
    </div>
  `;
  }).join('');

  // Adiciona evento de botão direito em cada usuário
  // Atualiza contador de membros online EM TEMPO REAL - DEPOIS de renderizar
  const countEl = document.getElementById('online-count');
  if (countEl) {
    // Conta EXATAMENTE quantos usuários estão visíveis na tela AGORA
    const totalRenderizados = container.querySelectorAll('.user-item').length;
    countEl.textContent = totalRenderizados;
  }

  container.querySelectorAll('.user-item').forEach((item, index) => {
    const user = onlineUsers[index];
    
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Remove menus existentes
      document.querySelectorAll('.user-ctx-menu').forEach(m => m.remove());

      // Cria novo menu
      const menu = document.createElement('div');
      menu.className = 'user-ctx-menu';
      menu.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        background: #12121a;
        border: 1px solid #ff00ff;
        border-radius: 12px;
        box-shadow: 0 0 25px rgba(255, 0, 255, 0.3);
        z-index: 10000;
        min-width: 200px;
        animation: pickerOpen 0.2s ease-out;
        overflow: hidden;
      `;

      menu.innerHTML = `
        <div class="user-ctx-item" data-action="profile">👤 Ver Perfil</div>
        <div class="user-ctx-item" data-action="mention">💬 Mencionar</div>
        <div class="user-ctx-item" data-action="dm">✉️ Mensagem Direta</div>
        <div class="user-ctx-divider"></div>
        <div class="user-ctx-item" data-action="nickname">✏️ Alterar Apelido</div>
        <div class="user-ctx-item" data-action="invite">📨 Convidar para Servidor</div>
        <div class="user-ctx-divider"></div>
        <div class="user-ctx-item" data-action="roles">🏷 Cargos</div>
        <div class="user-ctx-item" data-action="timeout">⏱ Castigar Membro</div>
        <div class="user-ctx-item" data-action="kick">🚪 Expulsar Membro</div>
        <div class="user-ctx-item user-ctx-danger" data-action="ban">🚫 Banir Membro</div>
        <div class="user-ctx-divider"></div>
        <div class="user-ctx-item" data-action="block">⛔ Bloquear</div>
        <div class="user-ctx-item" data-action="copyid">🔗 Copiar ID</div>
      `;

      // Adiciona estilos
      const style = document.createElement('style');
      style.textContent = `
        .user-ctx-item {
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.15s;
          font-size: 14px;
        }
        .user-ctx-item:hover {
          background: rgba(255,0,255,0.15);
        }
        .user-ctx-danger {
          color: #ff6b6b;
        }
        .user-ctx-danger:hover {
          background: rgba(255, 107, 107, 0.15);
        }
        .user-ctx-divider {
          height: 1px;
          background: rgba(255,0,255,0.2);
          margin: 4px 0;
        }
      `;
      document.head.appendChild(style);

      // Eventos das opções
      menu.querySelectorAll('.user-ctx-item').forEach(item => {
        item.addEventListener('click', () => {
          menu.remove();

          switch(item.dataset.action) {
            case 'profile':
              showToast(`👤 Abrindo perfil de ${user.name}`);
              break;
            case 'mention':
              const messageInput = document.getElementById('message-input');
              if (messageInput) {
                messageInput.value += `@${user.name} `;
                messageInput.focus();
              }
              break;
            case 'dm':
              showToast(`✉️ Abrindo chat privado com ${user.name}`);
              break;
            case 'nickname':
              const newNick = prompt(`Novo apelido para ${user.name}:`, user.name);
              if (newNick?.trim()) {
                // Atualiza apelido real no array de usuários
                user.nickname = newNick.trim();
                user.displayName = newNick.trim();
                // Atualiza na lista
                const userIndex = onlineUsers.findIndex(u => u.id === user.id);
                if (userIndex !== -1) {
                  onlineUsers[userIndex].name = newNick.trim();
                }
                // Re-renderiza a lista
                renderUsersList();
                showToast(`✅ Apelido de ${user.name} alterado para ${newNick.trim()}`);
              }
              break;
            case 'invite':
              showToast(`📨 Convite enviado para ${user.name}`);
              break;
            case 'roles':
              showToast(`🏷 Gerenciando cargos de ${user.name}`);
              break;
            case 'timeout':
              const time = prompt(`Tempo de castigo para ${user.name} (minutos):`, '10');
              if (time && !isNaN(time)) {
                showToast(`⏱ ${user.name} castigado por ${time} minutos`);
              }
              break;
            case 'kick':
              if (confirm(`Expulsar ${user.name} do servidor?`)) {
                showToast(`🚪 ${user.name} foi expulso do servidor`);
              }
              break;
            case 'ban':
              if (confirm(`BANIR PERMANENTEMENTE ${user.name}?\n\nEsta ação não pode ser desfeita.`)) {
                showToast(`🚫 ${user.name} foi BANIDO do servidor`);
              }
              break;
            case 'block':
              showToast(`⛔ ${user.name} foi bloqueado`);
              break;
            case 'copyid':
              navigator.clipboard?.writeText(user.id || user.name).catch(() => {});
              showToast(`✅ ID de ${user.name} copiado!`);
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
