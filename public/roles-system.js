// ================================================
// SISTEMA COMPLETO DE CARGOS E PERMISSÕES
// + @todos especial + Modal avançado de criação
// ================================================

window.roles = {
  list: [
    {
      id: 'role_admin', name: 'Administrador', color: '#ff4757', icon: '👑',
      highlight: true, mentionable: true, separate: true, position: 1,
      permissions: { administrator:true, viewChannels:true, manageChannels:true, manageServer:true,
        viewAuditLog:true, createInvite:true, kickMembers:true, banMembers:true,
        changeNickname:true, manageNicknames:true, manageRoles:true, sendMessages:true,
        sendMessagesInThreads:true, createPublicThreads:true, createPrivateThreads:true,
        sendTTS:true, manageMessages:true, embedLinks:true, attachFiles:true,
        readMessageHistory:true, mentionEveryone:true, addReactions:true, connect:true,
        speak:true, muteMembers:true, deafenMembers:true, useVAD:true,
        prioritySpeaker:true, createEvents:true, manageEvents:true },
      members: ['demid', 'admin']
    },
    {
      id: 'role_mod', name: 'Moderador', color: '#3742fa', icon: '\u{1F6E1}\uFE0F',
      highlight: true, mentionable: true, separate: true, position: 2,
      permissions: { administrator:false, viewChannels:true, manageChannels:false, manageServer:false,
        viewAuditLog:true, createInvite:true, kickMembers:true, banMembers:true,
        changeNickname:true, manageNicknames:true, manageRoles:false, sendMessages:true,
        sendMessagesInThreads:true, createPublicThreads:true, createPrivateThreads:true,
        sendTTS:false, manageMessages:true, embedLinks:true, attachFiles:true,
        readMessageHistory:true, mentionEveryone:false, addReactions:true, connect:true,
        speak:true, muteMembers:true, deafenMembers:false, useVAD:true,
        prioritySpeaker:false, createEvents:true, manageEvents:false },
      members: ['mod1', 'mod2']
    },
    {
      id: 'role_vip', name: 'VIP', color: '#ffa502', icon: '⭐',
      highlight: true, mentionable: true, separate: false, position: 3,
      permissions: { administrator:false, viewChannels:true, manageChannels:false, manageServer:false,
        viewAuditLog:false, createInvite:true, kickMembers:false, banMembers:false,
        changeNickname:true, manageNicknames:false, manageRoles:false, sendMessages:true,
        sendMessagesInThreads:true, createPublicThreads:true, createPrivateThreads:true,
        sendTTS:false, manageMessages:false, embedLinks:true, attachFiles:true,
        readMessageHistory:true, mentionEveryone:false, addReactions:true, connect:true,
        speak:true, muteMembers:false, deafenMembers:false, useVAD:true,
        prioritySpeaker:true, createEvents:true, manageEvents:false },
      members: ['usuario1', 'usuario2']
    },
    {
      id: 'role_member', name: 'Membro', color: '#ffffff', icon: '',
      highlight: false, mentionable: false, separate: false, position: 10,
      permissions: { administrator:false, viewChannels:true, manageChannels:false, manageServer:false,
        viewAuditLog:false, createInvite:true, kickMembers:false, banMembers:false,
        changeNickname:true, manageNicknames:false, manageRoles:false, sendMessages:true,
        sendMessagesInThreads:true, createPublicThreads:false, createPrivateThreads:false,
        sendTTS:false, manageMessages:false, embedLinks:true, attachFiles:true,
        readMessageHistory:true, mentionEveryone:false, addReactions:true, connect:true,
        speak:true, muteMembers:false, deafenMembers:false, useVAD:true,
        prioritySpeaker:false, createEvents:false, manageEvents:false },
      members: []
    }
  ],
  selectedRole: null, advancedOpen: false, permissionsOpen: true
};

const permissionCategories = [
  { name: 'Geral', icon: '⚙️', permissions: [
    { id: 'administrator', name: 'Administrador', description: 'Acesso total a todas as permissões' },
    { id: 'viewChannels', name: 'Ver canais', description: 'Permite visualizar canais do servidor' },
    { id: 'manageChannels', name: 'Gerenciar canais', description: 'Permite criar, editar e excluir canais' },
    { id: 'manageServer', name: 'Gerenciar servidor', description: 'Permite alterar configurações do servidor' },
    { id: 'viewAuditLog', name: 'Ver logs do servidor', description: 'Permite visualizar o histórico de ações' },
    { id: 'createInvite', name: 'Criar convite', description: 'Permite gerar convites para o servidor' }
  ]},
  { name: 'Membros', icon: '👥', permissions: [
    { id: 'kickMembers', name: 'Expulsar membros', description: 'Permite remover membros do servidor' },
    { id: 'banMembers', name: 'Banir membros', description: 'Permite banir permanentemente membros' },
    { id: 'changeNickname', name: 'Alterar nickname', description: 'Permite alterar o próprio apelido' },
    { id: 'manageNicknames', name: 'Gerenciar nicknames', description: 'Permite alterar apelidos de outros membros' },
    { id: 'manageRoles', name: 'Gerenciar cargos', description: 'Permite criar e editar cargos' }
  ]},
  { name: 'Texto', icon: '💬', permissions: [
    { id: 'sendMessages', name: 'Enviar mensagens', description: 'Permite enviar mensagens nos canais' },
    { id: 'sendMessagesInThreads', name: 'Enviar em tópicos', description: 'Permite enviar mensagens em tópicos' },
    { id: 'createPublicThreads', name: 'Criar posts públicos', description: 'Permite criar tópicos públicos' },
    { id: 'createPrivateThreads', name: 'Criar posts privados', description: 'Permite criar tópicos privados' },
    { id: 'sendTTS', name: 'Enviar TTS', description: 'Permite enviar mensagens com texto para fala' },
    { id: 'manageMessages', name: 'Gerenciar mensagens', description: 'Permite apagar e fixar mensagens' },
    { id: 'embedLinks', name: 'Incorporar links', description: 'Permite que links enviados gerem preview' },
    { id: 'attachFiles', name: 'Anexar arquivos', description: 'Permite enviar arquivos e imagens' },
    { id: 'readMessageHistory', name: 'Ler histórico', description: 'Permite ver mensagens antigas' },
    { id: 'mentionEveryone', name: 'Mencionar @todos, @here e @cargos', description: 'Permite mencionar todos os membros' },
    { id: 'addReactions', name: 'Adicionar reações', description: 'Permite adicionar reações às mensagens' }
  ]},
  { name: 'Voz', icon: '🔊', permissions: [
    { id: 'connect', name: 'Conectar', description: 'Permite entrar em canais de voz' },
    { id: 'speak', name: 'Falar', description: 'Permite falar nos canais de voz' },
    { id: 'muteMembers', name: 'Mutar membros', description: 'Permite mutar microfone de outros membros' },
    { id: 'deafenMembers', name: 'Ensurdecer membros', description: 'Permite desativar áudio para outros membros' },
    { id: 'useVAD', name: 'Usar VAD', description: 'Permite usar detecção de atividade de voz' },
    { id: 'prioritySpeaker', name: 'Prioridade de fala', description: 'Reduz volume de outros quando este fala' }
  ]},
  { name: 'Eventos', icon: '📅', permissions: [
    { id: 'createEvents', name: 'Criar eventos', description: 'Permite criar eventos no servidor' },
    { id: 'manageEvents', name: 'Gerenciar eventos', description: 'Permite editar e cancelar eventos' }
  ]}
];

// ================================================
// CARGO ESPECIAL @todos
// ================================================
function renderTodosRole() {
  return `
    <div class="role-list-item role-todos-item" onclick="selectTodosRole()" style="border-left:3px solid #ffaa00;">
      <div class="role-list-info">
        <span class="role-icon">📢</span>
        <span class="role-name" style="color:#ffaa00;">@todos</span>
      </div>
      <div class="role-members-count" style="color:#ffaa00;font-size:11px;">Especial</div>
    </div>`;
}

function selectTodosRole() {
  document.querySelectorAll('.role-list-item').forEach(el => el.classList.remove('active'));
  document.querySelector('.role-todos-item')?.classList.add('active');
  roles.selectedRole = null;
  const container = document.getElementById('roles-settings-container');
  if (!container) return;
  container.innerHTML = `
    <div class="role-editor">
      <div class="role-editor-header">
        <div class="role-color-preview" style="background:linear-gradient(135deg,#ff8800,#ffaa00)"></div>
        <div class="role-info">
          <h2 style="color:#ffaa00">📢 @todos</h2>
          <span class="role-position">Cargo Especial</span>
        </div>
      </div>
      <div class="settings-section">
        <h3 class="section-title" style="color:#ffaa00">📢 O que é @todos?</h3>
        <div style="background:rgba(255,170,0,0.08);border:1px solid rgba(255,170,0,0.3);border-radius:10px;padding:16px;color:#ccc;font-size:14px;line-height:1.6;margin-bottom:16px;">
          <p style="margin:0 0 10px">O <strong style="color:#ffaa00">@todos</strong> menciona <em>todos os membros</em> do servidor — similar ao @everyone do Discord.</p>
          <p style="margin:0 0 10px">Quando enviado no chat, a mensagem é destacada visualmente para todos os membros.</p>
          <p style="margin:0">Apenas membros com a permissão <strong>Mencionar @todos, @here e @cargos</strong> podem usar esta menção.</p>
        </div>
      </div>
      <div class="settings-section">
        <h3 class="section-title">⚙️ Como usar no chat</h3>
        <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:16px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
            <span style="font-size:22px;">💬</span>
            <div>
              <div style="color:#fff;font-weight:600;margin-bottom:3px;">Digitar @todos</div>
              <div style="color:#aaa;font-size:13px;">Escreva <code style="background:rgba(255,170,0,0.2);color:#ffaa00;padding:1px 6px;border-radius:4px;">@todos</code> em qualquer mensagem do servidor</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
            <span style="font-size:22px;">⌨️</span>
            <div>
              <div style="color:#fff;font-weight:600;margin-bottom:3px;">Autocomplete</div>
              <div style="color:#aaa;font-size:13px;">Ao digitar <code style="background:rgba(255,170,0,0.2);color:#ffaa00;padding:1px 6px;border-radius:4px;">@</code> aparece o menu de menções automático</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:22px;">🔔</span>
            <div>
              <div style="color:#fff;font-weight:600;margin-bottom:3px;">Notificação visual</div>
              <div style="color:#aaa;font-size:13px;">A mensagem fica destacada em amarelo para todos os membros online</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// ================================================
// RENDERIZAR CONFIGURAÇÕES DO CARGO SELECIONADO
// ================================================
function renderRolesSettings() {
  const container = document.getElementById('roles-settings-container');
  if (!container) return;
  const role = roles.selectedRole;
  if (!role) {
    container.innerHTML = `
      <div class="roles-empty-state">
        <div class="roles-empty-icon">🏷️</div>
        <h3>Selecione um cargo</h3>
        <p>Escolha um cargo da lista para editar suas configurações</p>
      </div>`;
    return;
  }
  container.innerHTML = `
    <div class="role-editor">
      <div class="role-editor-header">
        <div class="role-color-preview" style="background:${role.color}"></div>
        <div class="role-info">
          <h2>${role.icon ? role.icon + ' ' : ''}${role.name}</h2>
          <span class="role-position">Posição ${role.position}</span>
        </div>
      </div>
      <div class="settings-section">
        <h3 class="section-title">📁 Informações básicas</h3>
        <div class="setting-row">
          <label class="setting-label">Nome do cargo</label>
          <input type="text" class="setting-input" id="role-name-input" value="${role.name}" placeholder="Nome do cargo">
        </div>
        <div class="setting-row">
          <label class="setting-label">Cor do cargo</label>
          <div class="color-picker-container">
            <input type="color" id="role-color-input" value="${role.color}">
            <span class="color-hex">${role.color}</span>
          </div>
        </div>
        <div class="setting-row">
          <div>
            <label class="setting-label">🏷️ Ícone do cargo</label>
            <div style="color:#888;font-size:12px;margin-top:2px;">Emoji exibido ao lado do nome do cargo</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="text" class="setting-input icon-input" id="role-icon-input" value="${role.icon}" placeholder="👑">
            <button onclick="openIconUpload()" style="padding:8px 12px;background:rgba(255,0,255,0.15);border:1px solid rgba(255,0,255,0.4);border-radius:6px;color:#fff;cursor:pointer;font-size:12px;">🖼️ Upload</button>
          </div>
        </div>
        <div class="setting-row checkbox-row">
          <div>
            <label class="setting-label">Exibir separadamente na barra de usuários online</label>
            <div style="color:#888;font-size:12px;margin-top:2px;">Membros com este cargo aparecem em grupo separado</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="role-separate-toggle" ${role.separate ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div class="settings-section">
        <div class="section-toggle" onclick="toggleAdvancedSettings()">
          <span class="toggle-arrow ${roles.advancedOpen ? 'open' : ''}">▶</span>
          <h3 class="section-title">⚙️ Configuração avançada</h3>
        </div>
        <div class="advanced-content" style="display:${roles.advancedOpen ? 'block' : 'none'}">
          <div class="setting-row">
            <label class="setting-label">Adicionar membro ao cargo</label>
            <div class="member-search-container">
              <input type="text" class="setting-input" id="member-search-input" placeholder="Buscar membro...">
              <div class="member-search-results" id="member-search-results"></div>
            </div>
          </div>
          <div class="setting-row">
            <label class="setting-label">Membros neste cargo</label>
            <div class="role-members-list" id="role-members-list">
              ${role.members.length === 0
                ? '<div class="empty-members">Nenhum membro neste cargo</div>'
                : role.members.map(m => {
                    const mAv = (typeof getFriendAvatar === 'function' ? getFriendAvatar(m) : null);
                    if (!mAv && typeof requestUserAvatar === 'function') requestUserAvatar(m);
                    const mStyle = mAv ? `background-image:url(${mAv});background-size:cover;background-position:center;` : '';
                    const mContent = mAv ? '' : m.charAt(0).toUpperCase();
                    return `
                    <div class="role-member-item">
                      <div class="member-avatar" style="${mStyle}">${mContent}</div>
                      <span class="member-name">${m}</span>
                      <button class="remove-member-btn" onclick="removeMemberFromRole('${m}')">✕</button>
                    </div>`;
                  }).join('')}
            </div>
          </div>
          <div class="setting-row checkbox-row">
            <div>
              <label class="setting-label">⭐ Destacar nome do membro</label>
              <div style="color:#888;font-size:12px;margin-top:2px;">Nome aparece colorido com a cor do cargo</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="role-highlight-toggle" ${role.highlight ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-row checkbox-row">
            <div>
              <label class="setting-label">@ Permitir menção ao cargo</label>
              <div style="color:#888;font-size:12px;margin-top:2px;">Membros podem usar @NomeCargo no chat</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="role-mention-toggle" ${role.mentionable ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
      <div class="settings-section">
        <div class="section-toggle" onclick="togglePermissions()">
          <span class="toggle-arrow ${roles.permissionsOpen ? 'open' : ''}">▶</span>
          <h3 class="section-title">🔐 Permissões</h3>
        </div>
        <div class="permissions-content" style="display:${roles.permissionsOpen ? 'block' : 'none'}">
          ${permissionCategories.map(cat => renderPermissionCategory(cat, role)).join('')}
        </div>
      </div>
      <div class="role-actions" style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,0,255,0.15);">
        <button class="btn btn-ghost" onclick="cancelRoleEdit()">Cancelar</button>
        <button class="btn btn-danger" onclick="deleteCurrentRole()">Excluir cargo</button>
        <button class="btn btn-primary" onclick="saveCurrentRole()">✅ Salvar alterações</button>
      </div>
    </div>`;
  setupRoleEditorEvents();
}

function openIconUpload() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const el = document.getElementById('role-icon-input');
      if (el && roles.selectedRole) { roles.selectedRole.iconImage = ev.target.result; el.value = '🖼️'; }
      if (typeof showToast === 'function') showToast('✅ Ícone de imagem adicionado!');
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}

function renderPermissionCategory(category, role) {
  return `
    <div class="permission-category">
      <div class="permission-category-header">
        <span class="category-icon">${category.icon}</span>
        <span class="category-name">${category.name}</span>
      </div>
      <div class="permission-list">
        ${category.permissions.map(perm => `
          <div class="permission-row">
            <div class="permission-info">
              <div class="permission-name">${perm.name}</div>
              <div class="permission-desc">${perm.description}</div>
            </div>
            <label class="toggle-switch permission-toggle">
              <input type="checkbox" data-permission="${perm.id}" ${role.permissions[perm.id] ? 'checked' : ''}
                onchange="updateRolePermission('${perm.id}', this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>`).join('')}
      </div>
    </div>`;
}

function toggleAdvancedSettings() { roles.advancedOpen = !roles.advancedOpen; renderRolesSettings(); }
function togglePermissions() { roles.permissionsOpen = !roles.permissionsOpen; renderRolesSettings(); }
function updateRolePermission(id, val) { if (roles.selectedRole) roles.selectedRole.permissions[id] = val; }

function setupRoleEditorEvents() {
  document.getElementById('role-name-input')?.addEventListener('input', e => { if (roles.selectedRole) roles.selectedRole.name = e.target.value; });
  document.getElementById('role-color-input')?.addEventListener('input', e => {
    if (roles.selectedRole) { roles.selectedRole.color = e.target.value; document.querySelector('.role-color-preview').style.background = e.target.value; document.querySelector('.color-hex').textContent = e.target.value; }
  });
  document.getElementById('role-separate-toggle')?.addEventListener('change', e => { if (roles.selectedRole) roles.selectedRole.separate = e.target.checked; });
  document.getElementById('role-highlight-toggle')?.addEventListener('change', e => { if (roles.selectedRole) roles.selectedRole.highlight = e.target.checked; if (typeof renderUsersList === 'function') renderUsersList(); });
  document.getElementById('role-icon-input')?.addEventListener('input', e => { if (roles.selectedRole) roles.selectedRole.icon = e.target.value; });
  document.getElementById('role-mention-toggle')?.addEventListener('change', e => { if (roles.selectedRole) roles.selectedRole.mentionable = e.target.checked; });
}

function saveCurrentRole() { if (typeof showToast === 'function') showToast('✅ Cargo salvo com sucesso!'); renderRolesList(); renderRolesSettings(); }
function cancelRoleEdit() { roles.selectedRole = null; renderRolesList(); renderRolesSettings(); if (typeof showToast === 'function') showToast('Alterações descartadas'); }
function deleteCurrentRole() {
  if (!roles.selectedRole) return;
  if (confirm('Excluir o cargo "' + roles.selectedRole.name + '"?')) {
    roles.list = roles.list.filter(r => r.id !== roles.selectedRole.id);
    roles.selectedRole = null; renderRolesList(); renderRolesSettings();
    if (typeof showToast === 'function') showToast('✅ Cargo excluído');
  }
}
function removeMemberFromRole(m) {
  if (roles.selectedRole) { roles.selectedRole.members = roles.selectedRole.members.filter(x => x !== m); renderRolesSettings(); }
}

// ================================================
// LISTA DE CARGOS
// ================================================
function renderRolesList() {
  const container = document.getElementById('roles-list');
  if (!container) return;
  const sorted = [...roles.list].sort((a,b) => a.position - b.position);
  container.innerHTML = renderTodosRole();
  container.innerHTML += sorted.map(role => `
    <div class="role-list-item ${roles.selectedRole?.id === role.id ? 'active' : ''}"
         onclick="selectRole('${role.id}')"
         style="border-left:3px solid ${role.color}">
      <div class="role-list-info">
        ${role.icon ? '<span class="role-icon">' + role.icon + '</span>' : ''}
        <span class="role-name" style="color:${role.color}">${role.name}</span>
      </div>
      <div class="role-members-count">${role.members.length} membros</div>
    </div>`).join('');
  container.innerHTML += `
    <div class="role-list-item add-role" onclick="createNewRole()">
      <span class="add-icon">+</span>
      <span>Criar novo cargo</span>
    </div>`;
}

function selectRole(roleId) { roles.selectedRole = roles.list.find(r => r.id === roleId); renderRolesList(); renderRolesSettings(); }

// ================================================
// MODAL AVANÇADO CRIAR CARGO
// ================================================
function createNewRole() {
  document.getElementById('create-role-modal')?.remove();
  const defaultPerms = {};
  permissionCategories.forEach(cat => cat.permissions.forEach(p => { defaultPerms[p.id] = false; }));
  Object.assign(defaultPerms, { viewChannels:true, sendMessages:true, readMessageHistory:true, addReactions:true, attachFiles:true, embedLinks:true, changeNickname:true, connect:true, speak:true, useVAD:true, createInvite:true });

  const permsHtml = permissionCategories.map(cat => {
    const rows = cat.permissions.map(p =>
      '<div class="cr-prow">' +
        '<div><div class="cr-pname-s">' + p.name + '</div><div class="cr-pdesc">' + p.description + '</div></div>' +
        '<label class="toggle-switch" style="width:40px;height:22px;">' +
          '<input type="checkbox" data-perm="' + p.id + '" ' + (defaultPerms[p.id] ? 'checked' : '') + '>' +
          '<span class="toggle-slider"></span>' +
        '</label>' +
      '</div>'
    ).join('');
    return '<div class="cr-pcat"><div class="cr-pcat-hdr" onclick="this.nextElementSibling.classList.toggle(\'open\')">' + cat.icon + ' ' + cat.name + ' <span style="margin-left:auto;color:#666;font-size:12px;">▼</span></div><div class="cr-pcat-body">' + rows + '</div></div>';
  }).join('');

  const modal = document.createElement('div');
  modal.id = 'create-role-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:999999;backdrop-filter:blur(6px);';
  modal.innerHTML = `
    <style>
      @keyframes crModalIn{from{opacity:0;transform:scale(0.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
      #create-role-modal .cr-box{background:#1a1a2e;border:1px solid rgba(255,0,255,0.4);border-radius:16px;width:560px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.8),0 0 40px rgba(255,0,255,0.15);animation:crModalIn .25s cubic-bezier(.34,1.56,.64,1)}
      #create-role-modal .cr-hdr{padding:20px 24px;border-bottom:1px solid rgba(255,0,255,0.2);display:flex;align-items:center;justify-content:space-between}
      #create-role-modal .cr-title{font-size:18px;font-weight:700;color:#fff}
      #create-role-modal .cr-x{background:transparent;border:none;color:#888;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:6px;transition:.15s}
      #create-role-modal .cr-x:hover{background:rgba(255,0,255,0.15);color:#fff}
      #create-role-modal .cr-body{padding:24px}
      #create-role-modal .cr-ftr{padding:16px 24px;border-top:1px solid rgba(255,0,255,0.2);display:flex;justify-content:flex-end;gap:12px}
      #create-role-modal .cr-section{margin-bottom:24px}
      #create-role-modal .cr-stitle{font-size:11px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:12px}
      #create-role-modal .cr-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)}
      #create-role-modal .cr-row:last-child{border-bottom:none}
      #create-role-modal .cr-lbl{font-size:14px;color:#ccc}
      #create-role-modal .cr-desc{font-size:12px;color:#666;margin-top:2px}
      #create-role-modal .cr-inp{background:#0e0e1a;border:1px solid rgba(255,0,255,.3);border-radius:6px;padding:8px 12px;color:#fff;font-size:14px;outline:none;width:200px;transition:border .15s}
      #create-role-modal .cr-inp:focus{border-color:#ff00ff}
      #create-role-modal .cr-preview{background:rgba(0,0,0,.3);border:1px solid rgba(255,0,255,.15);border-radius:10px;padding:14px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px}
      #create-role-modal .cr-pdot{width:14px;height:14px;border-radius:50%;background:#5865f2;flex-shrink:0}
      #create-role-modal .cr-pname{font-weight:600;font-size:15px;color:#5865f2}
      #create-role-modal .cr-pcat{background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.07);border-radius:8px;margin-bottom:8px;overflow:hidden}
      #create-role-modal .cr-pcat-hdr{padding:10px 14px;background:rgba(0,0,0,.3);font-weight:600;font-size:13px;color:#ccc;cursor:pointer;display:flex;align-items:center;gap:8px;user-select:none}
      #create-role-modal .cr-pcat-body{padding:8px 0;display:none}
      #create-role-modal .cr-pcat-body.open{display:block}
      #create-role-modal .cr-prow{display:flex;align-items:center;justify-content:space-between;padding:8px 14px}
      #create-role-modal .cr-pname-s{font-size:13px;color:#ccc}
      #create-role-modal .cr-pdesc{font-size:11px;color:#666}
    </style>
    <div class="cr-box">
      <div class="cr-hdr">
        <div class="cr-title">➕ Criar Novo Cargo</div>
        <button class="cr-x" onclick="document.getElementById('create-role-modal').remove()">✕</button>
      </div>
      <div class="cr-body">
        <div class="cr-preview"><div class="cr-pdot" id="cr-pdot"></div><div class="cr-pname" id="cr-pname">Novo Cargo</div></div>
        <div class="cr-section">
          <div class="cr-stitle">📁 Informações do cargo</div>
          <div class="cr-row"><div class="cr-lbl">Nome</div><input class="cr-inp" type="text" id="cr-name" value="Novo Cargo" placeholder="Nome do cargo"></div>
          <div class="cr-row">
            <div class="cr-lbl">Cor</div>
            <div style="display:flex;align-items:center;gap:10px;">
              <input type="color" id="cr-color" value="#5865f2" style="width:40px;height:34px;border:none;border-radius:6px;cursor:pointer;background:transparent;">
              <span id="cr-color-hex" style="font-family:monospace;font-size:13px;color:#888;">#5865f2</span>
            </div>
          </div>
          <div class="cr-row">
            <div><div class="cr-lbl">🏷️ Ícone / Emoji</div><div class="cr-desc">Exibido ao lado do nome</div></div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input class="cr-inp" type="text" id="cr-icon" value="" placeholder="👑" style="width:80px;text-align:center;">
              <button onclick="openCrIconUpload()" style="padding:7px 10px;background:rgba(255,0,255,.15);border:1px solid rgba(255,0,255,.3);border-radius:6px;color:#ccc;cursor:pointer;font-size:12px;">🖼️</button>
            </div>
          </div>
        </div>
        <div class="cr-section">
          <div class="cr-stitle">⚙️ Configurações avançadas</div>
          <div class="cr-row">
            <div><div class="cr-lbl">Exibir separadamente na barra online</div><div class="cr-desc">Membros ficam em seção própria</div></div>
            <label class="toggle-switch"><input type="checkbox" id="cr-separate"><span class="toggle-slider"></span></label>
          </div>
          <div class="cr-row">
            <div><div class="cr-lbl">⭐ Destacar nome do membro</div><div class="cr-desc">Nome colorido com a cor do cargo</div></div>
            <label class="toggle-switch"><input type="checkbox" id="cr-highlight"><span class="toggle-slider"></span></label>
          </div>
          <div class="cr-row">
            <div><div class="cr-lbl">@ Permitir menção</div><div class="cr-desc">Membros podem usar @NomeCargo</div></div>
            <label class="toggle-switch"><input type="checkbox" id="cr-mentionable" checked><span class="toggle-slider"></span></label>
          </div>
        </div>
        <div class="cr-section">
          <div class="cr-stitle">🔐 Permissões iniciais</div>
          <div id="cr-perms-accordion">` + permsHtml + `</div>
        </div>
      </div>
      <div class="cr-ftr">
        <button onclick="document.getElementById('create-role-modal').remove()" style="padding:10px 20px;background:transparent;border:1px solid rgba(255,255,255,.2);border-radius:6px;color:#ccc;cursor:pointer;">Cancelar</button>
        <button onclick="confirmCreateRole()" style="padding:10px 24px;background:linear-gradient(135deg,#8b00ff,#ff00ff);border:none;border-radius:6px;color:#fff;font-weight:700;cursor:pointer;font-size:14px;">✅ Criar Cargo</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  // Live preview
  const nameEl = document.getElementById('cr-name');
  const colorEl = document.getElementById('cr-color');
  nameEl?.addEventListener('input', () => { const n = document.getElementById('cr-pname'); if(n){n.textContent = nameEl.value||'Novo Cargo'; n.style.color=colorEl.value;} });
  colorEl?.addEventListener('input', () => {
    const dot = document.getElementById('cr-pdot'); const nm = document.getElementById('cr-pname'); const hex = document.getElementById('cr-color-hex');
    if(dot) dot.style.background = colorEl.value;
    if(nm) nm.style.color = colorEl.value;
    if(hex) hex.textContent = colorEl.value;
  });
}

function openCrIconUpload() {
  const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.onchange = e => {
    const file=e.target.files[0]; if(!file) return;
    const r=new FileReader(); r.onload=ev=>{const el=document.getElementById('cr-icon');if(el){el.value='🖼️';el.dataset.imageData=ev.target.result;}if(typeof showToast==='function')showToast('✅ Ícone selecionado!');};r.readAsDataURL(file);
  };
  inp.click();
}

function confirmCreateRole() {
  const name = document.getElementById('cr-name')?.value?.trim() || 'Novo Cargo';
  const color = document.getElementById('cr-color')?.value || '#5865f2';
  const icon = document.getElementById('cr-icon')?.value?.trim() || '';
  const separate = !!document.getElementById('cr-separate')?.checked;
  const highlight = !!document.getElementById('cr-highlight')?.checked;
  const mentionable = !!document.getElementById('cr-mentionable')?.checked;
  const perms = {};
  document.querySelectorAll('#cr-perms-accordion input[data-perm]').forEach(inp => { perms[inp.dataset.perm] = inp.checked; });
  const newRole = { id:'role_'+Date.now(), name, color, icon, separate, highlight, mentionable, position:roles.list.length+1, permissions:perms, members:[] };
  roles.list.push(newRole);
  roles.selectedRole = newRole;
  document.getElementById('create-role-modal')?.remove();
  renderRolesList(); renderRolesSettings();
  if (typeof showToast === 'function') showToast('✅ Cargo "' + name + '" criado com sucesso!');
}

// ================================================
// INTEGRAÇÃO COM BARRA LATERAL DE USUÁRIOS ONLINE
// ================================================
const _origRenderUsersList = window.renderUsersList;
window.renderUsersList = function() {
  const container = document.getElementById('online-users-list');
  if (!container) return;
  const highlighted = [], normal = [];
  (window.onlineUsers || []).forEach(user => {
    const userRoles = (roles.list || []).filter(role => role.members && role.members.includes(user.name));
    const hasH = userRoles.some(role => role.highlight);
    if (hasH) { user.highestRole = userRoles.sort((a,b)=>a.position-b.position)[0]; highlighted.push(user); }
    else normal.push(user);
  });
  const sorted = [...highlighted, ...normal];
  container.innerHTML = sorted.map(user => {
    const avUrl = (typeof getFriendAvatar === 'function' ? getFriendAvatar(user.name) : null)
               || (user.avatar && user.avatar !== 'undefined' && (user.avatar.startsWith('data:image') || user.avatar.startsWith('http')) ? user.avatar : null);
    if (!avUrl && user.name && typeof requestUserAvatar === 'function') requestUserAvatar(user.name);
    const av = avUrl ? '' : (user.name ? user.name[0].toUpperCase() : '?');
    const avStyle = avUrl ? `background-image:url(${avUrl});background-size:cover;background-position:center;` : '';
    const isH = user.highestRole;
    return `<div class="user-item ${isH?'user-highlighted':''}" data-user-id="${user.id}" ${isH?'style="background:'+user.highestRole.color+'10"':''}>
      <div class="user-avatar-online" style="${avStyle}">${av}<div class="status-dot ${user.statusType||'online'}"></div></div>
      <div class="user-name">
        ${isH ? '<strong style="color:'+user.highestRole.color+'">'+user.name+'</strong>' : user.name}
        ${isH && user.highestRole.icon ? '<span class="role-badge">'+user.highestRole.icon+'</span>' : ''}
      </div>
      <div class="user-status">${user.status||''}</div>
      <div class="user-level">⭐ ${user.level||1}</div>
    </div>`;
  }).join('');
};
