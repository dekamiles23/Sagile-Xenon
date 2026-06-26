// private-rooms-ui.js

function injectPrivateRoomsUI() {
  if (document.getElementById('pr-modal')) return;

  var style = document.createElement('style');
  style.textContent = [
    '#pr-modal{display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);align-items:center;justify-content:center;}',
    '#pr-modal.open{display:flex;}',
    '#pr-box{background:#0f0f1a;border:1px solid #8b00ff;border-radius:14px;width:400px;max-width:94vw;padding:24px;display:flex;flex-direction:column;gap:14px;}',
    '#pr-box h2{color:#fff;margin:0;font-size:16px;}',
    '#pr-name-input{background:rgba(255,255,255,0.06);border:1px solid rgba(139,0,255,0.4);border-radius:8px;color:#fff;font-size:14px;padding:10px 14px;outline:none;width:100%;box-sizing:border-box;}',
    '#pr-name-input:focus{border-color:#ff00ff;}',
    '#pr-rooms-list{display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto;}',
    '.pr-room-item{background:rgba(255,255,255,0.04);border:1px solid rgba(139,0,255,0.2);border-radius:8px;padding:10px 14px;cursor:pointer;color:#ccc;font-size:13px;}',
    '.pr-room-item:hover,.pr-room-item.active{background:rgba(139,0,255,0.15);border-color:#8b00ff;color:#fff;}',
    '.pr-room-meta{font-size:11px;color:#666;margin-top:2px;}',
    '.pr-btn-row{display:flex;gap:8px;}',
    '.pr-btn{flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600;}',
    '.pr-btn-create{background:linear-gradient(135deg,#8b00ff,#ff00ff);color:#fff;}',
    '.pr-btn-close{background:rgba(255,255,255,0.06);color:#aaa;border:1px solid rgba(255,255,255,0.1);}',
    '.pr-btn-close:hover{background:rgba(237,66,69,0.15);color:#ed4245;}',

    /* Modal de convite */
    '#pr-invite-modal{display:none;position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.7);align-items:center;justify-content:center;}',
    '#pr-invite-modal.open{display:flex;}',
    '#pr-invite-box{background:#0f0f1a;border:1px solid #ff00ff;border-radius:14px;width:360px;max-width:94vw;padding:24px;text-align:center;display:flex;flex-direction:column;gap:14px;}',
    '#pr-invite-box h3{color:#fff;margin:0;font-size:15px;}',
    '#pr-invite-box p{color:#aaa;font-size:13px;margin:0;}',
    '.pr-invite-btn-row{display:flex;gap:10px;}',
    '.pr-invite-accept{flex:1;padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,#8b00ff,#ff00ff);color:#fff;font-size:13px;font-weight:600;cursor:pointer;}',
    '.pr-invite-reject{flex:1;padding:10px;border-radius:8px;border:none;background:rgba(237,66,69,0.15);color:#ed4245;border:1px solid rgba(237,66,69,0.3);font-size:13px;cursor:pointer;}'
  ].join('');
  document.head.appendChild(style);

  // Modal principal
  var modal = document.createElement('div');
  modal.id = 'pr-modal';
  modal.innerHTML = [
    '<div id="pr-box">',
      '<h2>🏠 Salas Privadas</h2>',
      '<input id="pr-name-input" placeholder="Nome da nova sala..." maxlength="40">',
      '<div class="pr-btn-row">',
        '<button class="pr-btn pr-btn-create" id="pr-btn-create">+ Criar Sala</button>',
        '<button class="pr-btn pr-btn-close" id="pr-btn-close">Fechar</button>',
      '</div>',
      '<div id="pr-rooms-list"></div>',
    '</div>'
  ].join('');
  document.body.appendChild(modal);

  // Modal de convite
  var inviteModal = document.createElement('div');
  inviteModal.id = 'pr-invite-modal';
  inviteModal.innerHTML = [
    '<div id="pr-invite-box">',
      '<h3 id="pr-invite-title">Convite para Sala</h3>',
      '<p id="pr-invite-msg"></p>',
      '<div class="pr-invite-btn-row">',
        '<button class="pr-invite-accept" id="pr-invite-accept">Entrar</button>',
        '<button class="pr-invite-reject" id="pr-invite-reject">Recusar</button>',
      '</div>',
    '</div>'
  ].join('');
  document.body.appendChild(inviteModal);

  // Eventos
  document.getElementById('pr-btn-close').addEventListener('click', closePrivateRoomsModal);
  modal.addEventListener('click', function(e) { if (e.target === modal) closePrivateRoomsModal(); });

  document.getElementById('pr-btn-create').addEventListener('click', function() {
    var name = document.getElementById('pr-name-input').value.trim() || 'Sala Privada';
    window.createPrivateRoom(name);
    document.getElementById('pr-name-input').value = '';
  });

  document.getElementById('pr-name-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('pr-btn-create').click();
  });

  document.getElementById('pr-invite-reject').addEventListener('click', function() {
    inviteModal.classList.remove('open');
  });
}

function openPrivateRoomsModal() {
  injectPrivateRoomsUI();
  document.getElementById('pr-modal').classList.add('open');
  window.listPrivateRooms && window.listPrivateRooms();
}

function closePrivateRoomsModal() {
  var m = document.getElementById('pr-modal');
  if (m) m.classList.remove('open');
}

window.openPrivateRoomsModal = openPrivateRoomsModal;
window.closePrivateRoomsModal = closePrivateRoomsModal;

// Atualiza lista de salas na UI
document.addEventListener('private-rooms-updated', function(e) {
  var listEl = document.getElementById('pr-rooms-list');
  if (!listEl) return;
  var rooms = e.detail;
  if (!rooms || rooms.length === 0) {
    listEl.innerHTML = '<div style="color:#555;font-size:12px;text-align:center;padding:10px;">Nenhuma sala ainda.</div>';
    return;
  }
  listEl.innerHTML = rooms.map(function(room) {
    return '<div class="pr-room-item' + (window.privateRoomsState && window.privateRoomsState.currentRoom === room.id ? ' active' : '') + '" onclick="window.joinPrivateRoom(\'' + room.id + '\');closePrivateRoomsModal();">' +
      '<div>' + room.name + '</div>' +
      '<div class="pr-room-meta">' + (room.members ? room.members.length : 0) + ' membros &bull; ' + (room.createdBy || '') + '</div>' +
    '</div>';
  }).join('');
});

// Convite recebido — modal ao invés de confirm()
document.addEventListener('private-room-invite-received', function(e) {
  injectPrivateRoomsUI();
  var data = e.detail;
  var inviteModal = document.getElementById('pr-invite-modal');
  document.getElementById('pr-invite-title').textContent = '📩 Convite de ' + data.invitedBy;
  document.getElementById('pr-invite-msg').textContent = 'Você foi convidado para entrar na sala "' + data.roomName + '"';

  var acceptBtn = document.getElementById('pr-invite-accept');
  var newAccept = acceptBtn.cloneNode(true);
  acceptBtn.parentNode.replaceChild(newAccept, acceptBtn);
  newAccept.addEventListener('click', function() {
    inviteModal.classList.remove('open');
    window.joinPrivateRoom && window.joinPrivateRoom(data.roomId);
  });

  inviteModal.classList.add('open');
});

// Mostra painel de chat ao entrar em sala
document.addEventListener('private-room-joined', function(e) {
  window.openPrivateRoomChat && window.openPrivateRoomChat(e.detail.name);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectPrivateRoomsUI);
} else {
  injectPrivateRoomsUI();
}
