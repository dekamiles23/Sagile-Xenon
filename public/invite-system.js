// ✅ SISTEMA DE ENTRAR EM SERVIDOR VIA LINK DE CONVITE
// Formato estilo Discord: http://zx./invite/XXXXXX

document.addEventListener('DOMContentLoaded', function() {
  const btnJoinServer = document.getElementById('btn-join-server');
  const joinServerSection = document.getElementById('join-server-section');
  const inviteLinkInput = document.getElementById('invite-link-input');
  const btnConfirmJoin = document.getElementById('btn-confirm-join');

  // ──────────────────────────────────────────
  // Gerar código curto estilo Discord
  // ──────────────────────────────────────────
  function generateShortCode(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < (length || 8); i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Recuperar ou criar código de convite salvo para o servidor
  function getOrCreateInviteCode(serverId) {
    const key = `invite_code_${serverId}`;
    let code = localStorage.getItem(key);
    if (!code) {
      code = generateShortCode(8);
      localStorage.setItem(key, code);
      // Mapear código → serverId
      const mapKey = `invite_map_${code}`;
      localStorage.setItem(mapKey, serverId);
    }
    return code;
  }

  // Toggle para mostrar/ocultar campo de entrada
  if (btnJoinServer) {
    btnJoinServer.addEventListener('click', function() {
      joinServerSection.classList.toggle('hidden');
      if (!joinServerSection.classList.contains('hidden')) {
        inviteLinkInput.focus();
      }
    });
  }

  // ──────────────────────────────────────────
  // Gerar link de convite ao clicar em "Convidar amigos"
  // ──────────────────────────────────────────
  const ddInvite = document.getElementById('dd-invite');
  if (ddInvite) {
    ddInvite.addEventListener('click', function() {
      const serverId = window.currentServerId || localStorage.getItem('currentServerId');
      if (!serverId) {
        if (typeof showToast === 'function') showToast('⚠ Abra um servidor primeiro!');
        return;
      }

      const code = getOrCreateInviteCode(serverId);
      const inviteLink = `http://zx./invite/${code}`;

      // Mostrar modal de convite estilizado
      showInviteModal(inviteLink, code);
    });
  }

  // ──────────────────────────────────────────
  // Modal de convite estilizado
  // ──────────────────────────────────────────
  function showInviteModal(link, code) {
    document.getElementById('zx-invite-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'zx-invite-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 999999; backdrop-filter: blur(6px);
      animation: inviteOverlayIn 0.2s ease;
    `;

    const serverName = (window.currentServer && window.currentServer.name)
      || localStorage.getItem('currentServerName')
      || 'Servidor';

    modal.innerHTML = `
      <style>
        @keyframes inviteOverlayIn { from{opacity:0} to{opacity:1} }
        @keyframes inviteBoxIn { from{opacity:0;transform:scale(0.9) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        #zx-invite-modal .inv-box {
          background: #1a1a2e;
          border: 1px solid rgba(255,0,255,0.4);
          border-radius: 16px;
          width: 460px;
          max-width: 95vw;
          padding: 28px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.8), 0 0 40px rgba(255,0,255,0.12);
          animation: inviteBoxIn 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        #zx-invite-modal .inv-title {
          font-size: 20px; font-weight: 800; color: #fff; margin: 0 0 6px;
        }
        #zx-invite-modal .inv-subtitle {
          font-size: 13px; color: #888; margin: 0 0 24px;
        }
        #zx-invite-modal .inv-server-name {
          font-size: 14px; font-weight: 600; color: #ff00ff; margin-bottom: 4px;
        }
        #zx-invite-modal .inv-link-box {
          display: flex; gap: 8px; align-items: center;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,0,255,0.3);
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 20px;
        }
        #zx-invite-modal .inv-link-text {
          flex: 1; color: #00ffff; font-family: monospace; font-size: 15px;
          word-break: break-all; user-select: all;
        }
        #zx-invite-modal .inv-copy-btn {
          background: linear-gradient(135deg,#8b00ff,#ff00ff);
          border: none; border-radius: 8px; color: #fff;
          font-weight: 700; font-size: 13px; padding: 8px 16px;
          cursor: pointer; flex-shrink: 0; transition: opacity 0.15s;
          white-space: nowrap;
        }
        #zx-invite-modal .inv-copy-btn:hover { opacity: 0.85; }
        #zx-invite-modal .inv-code-label {
          text-align: center; color: #555; font-size: 12px; margin-bottom: 20px;
        }
        #zx-invite-modal .inv-code-label span {
          color: #888; font-family: monospace; font-size: 14px;
          background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 4px;
        }
        #zx-invite-modal .inv-expiry {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,170,0,0.08);
          border: 1px solid rgba(255,170,0,0.2);
          border-radius: 8px; padding: 10px 14px;
          color: #ffaa00; font-size: 13px; margin-bottom: 20px;
        }
        #zx-invite-modal .inv-actions {
          display: flex; justify-content: flex-end; gap: 10px;
        }
        #zx-invite-modal .inv-btn-close {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px; color: #ccc;
          padding: 9px 20px; cursor: pointer; font-size: 14px;
          transition: background 0.15s;
        }
        #zx-invite-modal .inv-btn-close:hover { background: rgba(255,255,255,0.14); }
        #zx-invite-modal .inv-btn-share {
          background: rgba(0,255,136,0.15);
          border: 1px solid rgba(0,255,136,0.3);
          border-radius: 8px; color: #00ff88;
          padding: 9px 20px; cursor: pointer; font-size: 14px; font-weight: 600;
          transition: background 0.15s;
        }
        #zx-invite-modal .inv-btn-share:hover { background: rgba(0,255,136,0.25); }
      </style>

      <div class="inv-box">
        <div class="inv-title">🔗 Convite para o Servidor</div>
        <div class="inv-subtitle">Compartilhe este link para convidar pessoas</div>

        <div class="inv-server-name">📡 ${serverName}</div>

        <div class="inv-link-box">
          <div class="inv-link-text" id="inv-link-display">${link}</div>
          <button class="inv-copy-btn" id="inv-copy-btn">📋 Copiar</button>
        </div>

        <div class="inv-code-label">
          Código de convite: <span>${code}</span>
        </div>

        <div class="inv-expiry">
          ⏳ Este link não expira — compartilhe com segurança
        </div>

        <div class="inv-actions">
          <button class="inv-btn-close" onclick="document.getElementById('zx-invite-modal').remove()">Fechar</button>
          <button class="inv-btn-share" onclick="shareInviteLink('${link}')">📤 Compartilhar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Botão copiar
    document.getElementById('inv-copy-btn')?.addEventListener('click', function() {
      navigator.clipboard.writeText(link).then(() => {
        this.textContent = '✅ Copiado!';
        this.style.background = 'linear-gradient(135deg,#00aa55,#00ff88)';
        setTimeout(() => {
          this.textContent = '📋 Copiar';
          this.style.background = '';
        }, 2000);
        if (typeof showToast === 'function') showToast('✅ Link de convite copiado!');
      }).catch(() => {
        prompt('Copie o link manualmente:', link);
      });
    });
  }

  // Função global para compartilhar
  window.shareInviteLink = function(link) {
    if (navigator.share) {
      navigator.share({ title: 'Convite para servidor ZX', text: 'Entre no meu servidor!', url: link });
    } else {
      navigator.clipboard.writeText(link).then(() => {
        if (typeof showToast === 'function') showToast('✅ Link copiado!');
      });
    }
  };

  // ──────────────────────────────────────────
  // Entrar no servidor via link
  // ──────────────────────────────────────────
  if (btnConfirmJoin) {
    btnConfirmJoin.addEventListener('click', function() {
      const link = inviteLinkInput.value.trim();
      if (!link) {
        if (typeof showToast === 'function') showToast('⚠ Por favor, cole o link de convite.');
        return;
      }

      let code = '';

      // Suportar formato: http://zx./invite/CODE ou apenas o código
      if (link.includes('/invite/')) {
        code = link.split('/invite/')[1].split(/[?#\s]/)[0];
      } else if (/^[A-Za-z0-9]{6,12}$/.test(link)) {
        code = link;
      } else {
        if (typeof showToast === 'function') showToast('❌ Formato de link inválido. Use http://zx./invite/CÓDIGO');
        return;
      }

      // Buscar servidor pelo mapa de convites
      const mapKey = `invite_map_${code}`;
      const serverId = localStorage.getItem(mapKey);

      if (serverId) {
        const server = (window.servers || []).find(s => s.id === serverId);
        if (server) {
          if (typeof showToast === 'function') showToast(`✅ Você já está no servidor "${server.name}"`);
          if (typeof closeCommunityModal === 'function') closeCommunityModal();
          setTimeout(() => { if (typeof openServer === 'function') openServer(server); }, 500);
        } else {
          // Servidor existe no mapa mas não na lista local — adicionar
          const newServer = {
            id: serverId,
            name: `Servidor`,
            channels: [
              { id: 'geral', name: 'geral', type: 'text', desc: 'Canal geral' },
              { id: 'voz', name: 'voz', type: 'voice', desc: 'Canal de voz' }
            ],
            joinedAt: Date.now(),
            inviteCode: code
          };
          if (!window.servers) window.servers = [];
          window.servers.push(newServer);
          localStorage.setItem('zx_servers', JSON.stringify(window.servers));
          if (typeof renderServerList === 'function') renderServerList();
          if (typeof showToast === 'function') showToast('✅ Você entrou no servidor com sucesso!');
          if (typeof closeCommunityModal === 'function') closeCommunityModal();
          setTimeout(() => { if (typeof openServer === 'function') openServer(newServer); }, 500);
        }
      } else {
        // Código não encontrado localmente — tentar join genérico
        if (typeof showToast === 'function') showToast('❌ Convite inválido ou expirado.');
      }

      inviteLinkInput.value = '';
      if (joinServerSection) joinServerSection.classList.add('hidden');
    });
  }

  // Enter no campo de convite
  if (inviteLinkInput) {
    inviteLinkInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && btnConfirmJoin) btnConfirmJoin.click();
    });
  }

  console.log('✅ Sistema de convites ZX carregado — formato: http://zx./invite/CÓDIGO');
});
