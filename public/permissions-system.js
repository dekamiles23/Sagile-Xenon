// ================================================
// SISTEMA DE PERMISSÕES POR SERVIDOR — ZX Chat
// Baseado em cargos por servidor, sem depender de e-mail ou username fixo
// ================================================

window.ZXPermissions = (function () {

  const ROLE_HIERARCHY = { OWNER: 5, ADMIN: 4, STAFF: 3, MODERADOR: 2, MEMBRO: 1 };

  const ROLE_PERMISSIONS = {
    OWNER: [
      'MANAGE_SERVER', 'MANAGE_CHANNELS', 'MANAGE_CATEGORIES', 'MANAGE_MEMBERS',
      'MANAGE_ROLES', 'MANAGE_EVENTS', 'DELETE_SERVER', 'KICK_MEMBERS', 'BAN_MEMBERS',
      'MUTE_MEMBERS', 'MODERATE_MESSAGES', 'CREATE_CHANNELS', 'CREATE_CATEGORIES', 'CREATE_EVENTS'
    ],
    ADMIN: [
      'MANAGE_SERVER', 'MANAGE_CHANNELS', 'MANAGE_CATEGORIES', 'MANAGE_ROLES',
      'MANAGE_MEMBERS', 'KICK_MEMBERS', 'BAN_MEMBERS', 'MUTE_MEMBERS',
      'MODERATE_MESSAGES', 'CREATE_CHANNELS', 'CREATE_CATEGORIES', 'CREATE_EVENTS'
    ],
    STAFF: [
      'MODERATE_MESSAGES', 'KICK_MEMBERS', 'MUTE_MEMBERS',
      'CREATE_CHANNELS', 'CREATE_CATEGORIES', 'CREATE_EVENTS'
    ],
    MODERADOR: ['MODERATE_MESSAGES', 'MUTE_MEMBERS'],
    MEMBRO: []
  };

  const DEFAULT_ROLES = [
    { id: 'role_owner',   name: 'Dono',           color: '#ffd700', icon: '👑',  position: 0,  type: 'OWNER'    },
    { id: 'role_admin',   name: 'Administrador',   color: '#ff4757', icon: '🛡️', position: 1,  type: 'ADMIN'    },
    { id: 'role_staff',   name: 'Staff',           color: '#2ed573', icon: '⚡',  position: 2,  type: 'STAFF'    },
    { id: 'role_mod',     name: 'Moderador',       color: '#3742fa', icon: '🛡',  position: 3,  type: 'MODERADOR'},
    { id: 'role_member',  name: 'Membro',          color: '#ffffff', icon: '',    position: 10, type: 'MEMBRO'   }
  ];

  function _getUsername() {
    return sessionStorage.getItem('username') ||
           localStorage.getItem('zx_username') || '';
  }

  function _getServers() {
    return JSON.parse(localStorage.getItem('zx_servers') || '[]');
  }

  function _saveServers(list) {
    localStorage.setItem('zx_servers', JSON.stringify(list));
    if (window.servers) {
      window.servers.length = 0;
      list.forEach(s => window.servers.push(s));
    }
  }

  // ── Consultas ──────────────────────────────────────────────────

  function getUserServerRole(username, serverId) {
    const server = _getServers().find(s => s.id === serverId);
    if (!server) return null;
    if (server.ownerId === username) return 'OWNER';
    const member = (server.members || []).find(m => m.username === username);
    return member ? member.role : 'MEMBRO';
  }

  function hasServerPermission(username, serverId, permission) {
    const role = getUserServerRole(username, serverId);
    if (!role) return false;
    if (role === 'OWNER') return true;
    return (ROLE_PERMISSIONS[role] || []).includes(permission);
  }

  // ── Migração de servidores antigos ─────────────────────────────

  function migrateOldServers() {
    const username = _getUsername();
    const servers = _getServers();
    let changed = false;

    servers.forEach(server => {
      if (!server.ownerId) {
        server.ownerId = username;
        console.log('[ZX Permissions] Migrando servidor sem ownerId:', server.id, 'para dono:', username);
        changed = true;
      }
      if (!server.members) {
        server.members = [];
        changed = true;
      }
      if (!server.roles) {
        server.roles = JSON.parse(JSON.stringify(DEFAULT_ROLES));
        changed = true;
      }
      const ownerInMembers = server.members.find(m => m.username === server.ownerId);
      if (!ownerInMembers && server.ownerId) {
        server.members.push({ username: server.ownerId, role: 'OWNER', joinedAt: Date.now() });
        console.log('[ZX Permissions] Adicionando dono aos members:', server.ownerId);
        changed = true;
      }
    });

    if (changed) {
      _saveServers(servers);
      console.log('[ZX Permissions] Migração de servidores concluída');
    }
  }

  // ── Atualização de UI ──────────────────────────────────────────

  function updateServerUI(serverId) {
    const username = _getUsername();
    if (!username || !serverId) return;

    const role = getUserServerRole(username, serverId);
    const isOwner    = role === 'OWNER';
    const isAdmin    = role === 'ADMIN';
    const isStaff    = role === 'STAFF';
    const canPanel   = isOwner || isAdmin || isStaff;

    console.log('[ZX Permissions] updateServerUI - serverId:', serverId, 'username:', username, 'role:', role, 'isOwner:', isOwner);

    // Botão painel de administração
    const adminBtn = document.getElementById('btn-admin-panel');
    if (adminBtn) adminBtn.classList.toggle('hidden', !canPanel);

    // Dropdown — Config do servidor
    _toggleDropdownItem('dd-configure', hasServerPermission(username, serverId, 'MANAGE_SERVER'));
    // Dropdown — Criar canal
    _toggleDropdownItem('dd-create-channel', hasServerPermission(username, serverId, 'CREATE_CHANNELS'));
    // Dropdown — Criar categoria
    _toggleDropdownItem('dd-create-category', hasServerPermission(username, serverId, 'CREATE_CATEGORIES'));
    // Dropdown — Criar evento
    _toggleDropdownItem('dd-create-event', hasServerPermission(username, serverId, 'CREATE_EVENTS'));
    // Dropdown — Proteção e segurança (só owner/admin)
    _toggleDropdownItem('dd-raid',     isOwner || isAdmin);
    _toggleDropdownItem('dd-security', isOwner || isAdmin);
    // Dropdown — Sair do servidor (dono não pode sair, só deletar)
    _toggleDropdownItem('dd-leave-server', !isOwner);

    // Botão deletar servidor (apenas para o dono)
    _ensureDeleteButton(isOwner, serverId);

    // Badge de cargo na sidebar
    _updateRoleBadge(role);
  }

  function _toggleDropdownItem(id, visible) {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? '' : 'none';
  }

  function _ensureDeleteButton(isOwner, serverId) {
    const dropdown = document.getElementById('server-dropdown');
    if (!dropdown) return;

    let ddDelete = document.getElementById('dd-delete-server');

    if (isOwner) {
      if (!ddDelete) {
        ddDelete = document.createElement('button');
        ddDelete.className = 'dropdown-item';
        ddDelete.id = 'dd-delete-server';
        ddDelete.style.color = '#ff4757';
        ddDelete.textContent = '🗑️ Deletar servidor';
        ddDelete.addEventListener('click', () => {
          dropdown.classList.add('hidden');
          const name = document.getElementById('sidebar-server-name')?.textContent || 'este servidor';
          if (confirm(`Tem certeza que deseja deletar "${name}"?\nEsta ação não pode ser desfeita.`)) {
            if (typeof window.deleteCurrentServer === 'function') window.deleteCurrentServer();
          }
        });
        dropdown.appendChild(ddDelete);
      }
      ddDelete.style.display = '';
    } else if (ddDelete) {
      ddDelete.style.display = 'none';
    }
  }

  function _updateRoleBadge(role) {
    let badge = document.getElementById('zx-role-badge');
    const sidebar = document.getElementById('server-sidebar');
    if (!sidebar) return;

    if (!role || role === 'MEMBRO') {
      if (badge) badge.remove();
      return;
    }

    const info = {
      OWNER:    { label: '👑 Dono',   color: '#ffd700' },
      ADMIN:    { label: '🛡️ Admin', color: '#ff4757' },
      STAFF:    { label: '⚡ Staff',  color: '#2ed573' },
      MODERADOR:{ label: '🛡 Mod',    color: '#3742fa' }
    }[role];

    if (!info) return;

    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'zx-role-badge';
      badge.style.cssText = [
        'position:absolute', 'bottom:60px', 'left:0', 'right:0',
        'padding:5px 10px', 'font-size:11px', 'font-weight:700',
        'text-align:center', 'z-index:100', 'letter-spacing:0.5px',
        'pointer-events:none', 'opacity:0.85'
      ].join(';');
      sidebar.style.position = 'relative';
      sidebar.appendChild(badge);
    }

    badge.style.color = info.color;
    badge.textContent = info.label;
  }

  // ── Gerenciamento de cargos ────────────────────────────────────

  function setMemberRole(serverId, memberUsername, role) {
    const me = _getUsername();
    if (!hasServerPermission(me, serverId, 'MANAGE_ROLES')) {
      console.warn('[ZX Permissions] Sem permissão para gerenciar cargos');
      return false;
    }

    const servers = _getServers();
    const server = servers.find(s => s.id === serverId);
    if (!server) return false;

    if (server.ownerId === memberUsername) {
      console.warn('[ZX Permissions] Não é possível alterar o cargo do Dono');
      return false;
    }

    if (!server.members) server.members = [];
    const existing = server.members.find(m => m.username === memberUsername);
    if (existing) {
      existing.role = role;
    } else {
      server.members.push({ username: memberUsername, role, joinedAt: Date.now() });
    }

    _saveServers(servers);
    return true;
  }

  function getServerMembers(serverId) {
    return (_getServers().find(s => s.id === serverId)?.members) || [];
  }

  function getServerOwner(serverId) {
    return _getServers().find(s => s.id === serverId)?.ownerId || null;
  }

  // ── API pública ────────────────────────────────────────────────

  return {
    getUserServerRole,
    hasServerPermission,
    migrateOldServers,
    updateServerUI,
    setMemberRole,
    getServerMembers,
    getServerOwner,
    DEFAULT_ROLES,
    ROLE_HIERARCHY,
    ROLE_PERMISSIONS
  };

})();

// ── Auto-inicialização ─────────────────────────────────────────

(function () {
  function init() { 
    console.log('[ZX Permissions] Iniciando migração de servidores antigos...');
    ZXPermissions.migrateOldServers(); 
    
    // Forçar atualização de UI para o servidor atual
    setTimeout(() => {
      if (window.currentServerId) {
        console.log('[ZX Permissions] Forçando atualização de UI para servidor atual:', window.currentServerId);
        ZXPermissions.updateServerUI(window.currentServerId);
      }
    }, 1000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Função para correção manual via console
window.__fixServerPermissions = function() {
  console.log('[ZX Permissions] Iniciando correção manual...');
  const servers = JSON.parse(localStorage.getItem('zx_servers') || '[]');
  const username = sessionStorage.getItem('username') || localStorage.getItem('zx_username') || '';
  
  console.log('[ZX Permissions] Username:', username);
  console.log('[ZX Permissions] Servidores:', servers);
  
  let changed = false;
  servers.forEach(server => {
    if (!server.ownerId) {
      server.ownerId = username;
      console.log('[ZX Permissions] Corrigindo ownerId do servidor:', server.id, 'para:', username);
      changed = true;
    }
    if (!server.members) {
      server.members = [];
      changed = true;
    }
    const ownerInMembers = server.members.find(m => m.username === server.ownerId);
    if (!ownerInMembers && server.ownerId) {
      server.members.push({ username: server.ownerId, role: 'OWNER', joinedAt: Date.now() });
      console.log('[ZX Permissions] Adicionando dono aos members:', server.ownerId);
      changed = true;
    }
  });
  
  if (changed) {
    localStorage.setItem('zx_servers', JSON.stringify(servers));
    console.log('[ZX Permissions] Servidores corrigidos e salvos!');
    if (window.servers) {
      window.servers.length = 0;
      servers.forEach(s => window.servers.push(s));
    }
    location.reload();
  } else {
    console.log('[ZX Permissions] Nenhuma correção necessária.');
  }
  
  return { changed, servers, username };
};

// Função de diagnóstico para verificar o estado do sistema de permissões
window.__checkPermissions = function() {
  const username = sessionStorage.getItem('username') || localStorage.getItem('zx_username') || '';
  const servers = JSON.parse(localStorage.getItem('zx_servers') || '[]');
  const currentServerId = window.currentServerId;
  
  console.log('=== DIAGNÓSTICO DE PERMISSÕES ===');
  console.log('Username (sessionStorage):', sessionStorage.getItem('username'));
  console.log('Username (localStorage):', localStorage.getItem('zx_username'));
  console.log('Username usado:', username);
  console.log('Servidor atual:', currentServerId);
  
  if (currentServerId) {
    const server = servers.find(s => s.id === currentServerId);
    if (server) {
      console.log('Servidor encontrado:', server.name);
      console.log('Owner ID do servidor:', server.ownerId);
      console.log('Members do servidor:', server.members);
      
      const role = window.ZXPermissions ? window.ZXPermissions.getUserServerRole(username, currentServerId) : 'N/A';
      console.log('Seu cargo:', role);
      
      const canConfigure = window.ZXPermissions ? window.ZXPermissions.hasServerPermission(username, currentServerId, 'MANAGE_SERVER') : false;
      const canCreateChannel = window.ZXPermissions ? window.ZXPermissions.hasServerPermission(username, currentServerId, 'CREATE_CHANNELS') : false;
      const canCreateCategory = window.ZXPermissions ? window.ZXPermissions.hasServerPermission(username, currentServerId, 'CREATE_CATEGORIES') : false;
      const canCreateEvent = window.ZXPermissions ? window.ZXPermissions.hasServerPermission(username, currentServerId, 'CREATE_EVENTS') : false;
      
      console.log('Permissão MANAGE_SERVER:', canConfigure);
      console.log('Permissão CREATE_CHANNELS:', canCreateChannel);
      console.log('Permissão CREATE_CATEGORIES:', canCreateCategory);
      console.log('Permissão CREATE_EVENTS:', canCreateEvent);
      
      // Verificar elementos do dropdown
      const ddConfigure = document.getElementById('dd-configure');
      const ddCreateChannel = document.getElementById('dd-create-channel');
      const ddCreateCategory = document.getElementById('dd-create-category');
      const ddCreateEvent = document.getElementById('dd-create-event');
      
      console.log('Elemento dd-configure existe:', !!ddConfigure);
      console.log('Elemento dd-configure display:', ddConfigure ? ddConfigure.style.display : 'N/A');
      console.log('Elemento dd-create-channel existe:', !!ddCreateChannel);
      console.log('Elemento dd-create-channel display:', ddCreateChannel ? ddCreateChannel.style.display : 'N/A');
      console.log('Elemento dd-create-category existe:', !!ddCreateCategory);
      console.log('Elemento dd-create-category display:', ddCreateCategory ? ddCreateCategory.style.display : 'N/A');
      console.log('Elemento dd-create-event existe:', !!ddCreateEvent);
      console.log('Elemento dd-create-event display:', ddCreateEvent ? ddCreateEvent.style.display : 'N/A');
    } else {
      console.log('Servidor não encontrado na lista!');
    }
  } else {
    console.log('Nenhum servidor selecionado!');
  }
  
  console.log('===================================');
  return { username, servers, currentServerId };
};
