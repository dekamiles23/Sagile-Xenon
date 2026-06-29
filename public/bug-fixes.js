// ================================================
// BUG FIXES v2 - Correções consolidadas
// ================================================
(function () {
  'use strict';

  // ── Utilitário ────────────────────────────────────────────────────────────
  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  // ── 1. showLayout: versão única definitiva ────────────────────────────────
  function _showLayout(layoutId) {
    const all = ['discover-view','chat-view','voice-view','forum-view',
                 'announcement-view','dm-view','typewriter-view','post-view'];
    all.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(layoutId);
    if (target) {
      target.classList.remove('hidden');
      // Garantir display correto para views do servidor
      const inServerView = ['chat-view','voice-view','forum-view','announcement-view'].includes(layoutId);
      if (inServerView || layoutId === 'dm-view') {
        target.style.setProperty('display', 'flex', 'important');
        target.style.setProperty('flex', '1 1 auto', 'important');
        target.style.setProperty('min-height', '0', 'important');
        target.style.setProperty('width', '100%', 'important');
      } else if (layoutId === 'discover-view') {
        target.style.setProperty('display', 'flex', 'important');
      }
    }

    const serverSidebar = document.getElementById('server-sidebar');
    const sidebarNavbar = document.querySelector('#chat-view > aside');
    const onlineSidebar = document.querySelector('.online-sidebar');
    const toggleBtn    = document.getElementById('toggle-online-sidebar');
    const inServer     = ['chat-view','voice-view','forum-view','announcement-view'].includes(layoutId);

    // Gerenciar classe server-body no body
    if (inServer && window.currentServerId) {
      document.body.classList.add('server-body');
      document.body.classList.remove('dm-active', 'dm-view-active', 'dm-mode');
    } else if (layoutId === 'discover-view' || layoutId === 'dm-view') {
      document.body.classList.remove('server-body', 'dm-active', 'dm-view-active', 'dm-mode');
    }

    if (serverSidebar) {
      if (inServer && window.currentServerId) {
        serverSidebar.classList.remove('hidden');
        serverSidebar.style.cssText = 'display:block!important;visibility:visible!important;opacity:1!important;width:240px!important;flex:0 0 240px!important;';
      } else {
        serverSidebar.classList.add('hidden');
        serverSidebar.style.cssText = 'display:none!important;';
      }
    }

    // Controlar visibilidade da navbar principal
    // dm-view tem sua própria navbar interna; esconder a externa para evitar barra duplicada
    const navbar = document.querySelector('.main-area > .navbar');
    if (navbar) {
      if (layoutId === 'dm-view') {
        navbar.style.setProperty('display', 'none', 'important');
        navbar.style.setProperty('visibility', 'hidden', 'important');
        navbar.style.setProperty('pointer-events', 'none', 'important');
      } else {
        navbar.style.setProperty('display', 'flex', 'important');
        navbar.style.setProperty('visibility', 'visible', 'important');
        navbar.style.setProperty('opacity', '1', 'important');
        navbar.style.setProperty('pointer-events', 'auto', 'important');
      }
    }
    // Também esconder o navbar-divider quando estiver no dm-view
    const navbarDivider = document.querySelector('.main-area > .navbar-divider');
    if (navbarDivider) {
      navbarDivider.style.setProperty('display', layoutId === 'dm-view' ? 'none' : '', 'important');
    }

    if (sidebarNavbar) sidebarNavbar.style.display = inServer ? 'flex' : 'none';
    if (onlineSidebar && toggleBtn && layoutId === 'chat-view') {
      onlineSidebar.style.transform = '';
      onlineSidebar.style.opacity   = '';
      onlineSidebar.style.pointerEvents = '';
      toggleBtn.style.right = '220px';
      toggleBtn.textContent = '▶';
      window.onlineSidebarVisible = true;
    }
  }
  // window.showLayout is intentionally NOT overridden here — the full version in script.js handles navbar, sidebar, voice-room cleanup, and body classes correctly

  // ── 2. Chat: enviar com Enter + botão Enviar ──────────────────────────────
  function fixMessageInput() {
    const input = document.getElementById('message-input');
    const btn   = document.getElementById('send-btn');
    
    console.log('🔍 [CHAT] Inicializando fixMessageInput');
    console.log('🔍 [CHAT] Input encontrado:', input);
    console.log('🔍 [CHAT] Botão encontrado:', btn);
    
    if (!input || input._fixAttached) {
      console.warn('⚠️ [CHAT] Input já configurado ou não encontrado');
      return;
    }
    input._fixAttached = true;

    function doSend() {
      console.log('🚀 [CHAT] Tentando enviar mensagem');
      const text = input.value.trim();
      console.log('📝 [CHAT] Texto da mensagem:', text);
      
      if (!text) {
        console.warn('⚠️ [CHAT] Texto vazio - não será enviado');
        return;
      }

      // LIMITE DE 4000 CARACTERES (MESMA LÓGICA DO DM)
      if (input.value.length > 4000) {
        if (typeof showToast === 'function') {
          showToast('⚠️ O limite máximo é de 4.000 caracteres.');
        } else {
          alert('⚠️ O limite máximo é de 4.000 caracteres.');
        }
        return;
      }
      
      // Adicionar fallback para canal com múltiplas camadas de segurança
      let currentChannel = window.currentChannel;
      
      // Se currentChannel não estiver definido, tenta recuperar do servidor atual
      if (!currentChannel && window.currentServerId) {
        const server = window.servers?.find(s => s.id === window.currentServerId);
        if (server && server.channels && server.channels.length > 0) {
          currentChannel = server.channels[0].id;
          console.warn(`🚨 [CHAT] Canal recuperado do primeiro canal do servidor: ${currentChannel}`);
        }
      }
      
      // Se ainda não tiver canal, usa fallback genérico
      currentChannel = currentChannel || 'geral';
      
      console.log(`🔑 [CHAT] Canal atual: ${currentChannel}`);
      
      const sock = window.socket;
      if (!sock) {
        console.error('❌ [SOCKET] Socket não configurado');
        return;
      }
      
      try {
        sock.emit('message', {
          channel: currentChannel,
          text,
          communityId: window.currentServerId || null
        });
        console.log('✅ [CHAT] Mensagem enviada com sucesso');
        input.value = '';
        input.style.height = '48px';
        input.style.overflowY = 'hidden';
        const counter = document.getElementById('char-counter');
        if (counter) {
          counter.textContent = '0/4000';
          counter.style.color = '#888';
        }
      } catch (error) {
        console.error('❌ [CHAT] Erro ao enviar mensagem:', error);
      }
    }

    input.addEventListener('keydown', function (e) {
      console.log('Tecla pressionada:', e.key);
      if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        doSend(); 
      }
    });
    
    if (btn && !btn._fixAttached) {
      btn._fixAttached = true;
      btn.addEventListener('click', doSend);
      console.log('Evento de clique adicionado ao botão de enviar');
    }
    
    console.log('fixMessageInput concluído');
  }

  // ── 3. Chat: renderizar mensagens recebidas + histórico ───────────────────
  function fixMessageRendering() {
    if (window._fixMsgRenderAttached) return;
    window._fixMsgRenderAttached = true;

    function appendMsg(area, msg) {
      const time    = msg.time || new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      const initial = (msg.username || '?')[0].toUpperCase();
      const el = document.createElement('div');
      el.className = 'message';
      el.innerHTML = `
        <div class="msg-avatar av-${initial}">${initial}</div>
        <div class="msg-body">
          <div class="msg-meta">
            <span class="msg-username">${escHtml(msg.username||'?')}</span>
            <span class="msg-time">${escHtml(time)}</span>
          </div>
          <div class="msg-text">${escHtml(msg.text||'')}</div>
        </div>`;
      area.appendChild(el);
      area.scrollTop = area.scrollHeight;
    }

    function waitForSocket(cb) {
      if (window.socket) { cb(); return; }
      const t = setInterval(() => { if (window.socket) { clearInterval(t); cb(); } }, 100);
    }

    waitForSocket(() => {
      // ✅ REMOVIDO: listeners duplicados de socket.on('message') e socket.on('message:sent')
      // Esses listeners já existem em script.js e server-chat.js, causando duplicação
      console.log('✅ bug-fixes.js: listeners de mensagem removidos para evitar duplicação');

      // Listener de histórico REMOVIDO - duplicado com o listener em script.js (linha 6695)
      // O listener principal usa renderMessage() que suporta avatares e agrupamento
      console.log('✅ bug-fixes.js: listener de history removido para evitar duplicação');
    });
  }

  // ── 4. Barra inferior de navegação ────────────────────────────────────────
  function fixBottomNav() {
    // btn-home → volta para discover-view (estado inicial completo)
    // Início: delegado em script.js via window.goHome — não registrar listener duplicado

    // btn-add-community → abre modal de criar servidor
    const addComm = document.getElementById('btn-add-community');
    if (addComm && !addComm._fixAttached) {
      addComm._fixAttached = true;
      addComm.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const modal = document.getElementById('community-modal');
        if (modal) {
          modal.classList.remove('hidden');
          console.log('✅ Modal community aberto pelo botão +');
        } else {
          console.log('❌ Modal community não encontrado');
        }
      }, true);
    }

    // btn-add-fandom → abre modal de criar fandom
    const addFandom = document.getElementById('btn-add-fandom');
    if (addFandom && !addFandom._fixAttached) {
      addFandom._fixAttached = true;
      addFandom.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const modal = document.getElementById('fandom-modal');
        if (modal) {
          modal.classList.remove('hidden');
          console.log('✅ Modal fandom aberto pelo botão +');
        } else {
          console.log('❌ Modal fandom não encontrado');
        }
      }, true);
    }

    // btn-create-community-card → abre modal de criar comunidade detalhado
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('#btn-create-community-card');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const modal = document.getElementById('create-community-modal');
      if (modal) {
        modal.classList.remove('hidden');
        console.log('✅ Modal create-community aberto pelo card');
      } else {
        console.log('❌ Modal create-community não encontrado');
      }
    }, true);
  }

  // ── 5. Botão "Postagens de comunidade" ───────────────────────────────────
  function fixCommunityPostsBtn() {
    if (window._fixCommunityPostsBtnAttached) return;
    window._fixCommunityPostsBtnAttached = true;

    document.addEventListener('click', function(e) {
      if (!e.target.closest('#btn-open-community-posts')) return;
      e.preventDefault();
      e.stopPropagation();
      renderFeedView();
    });
  }

  // ── 5.1. Botão fechar modal comunidades sugeridas ─────────────────────────
  function fixSuggestedModalClose() {
    if (window._fixSuggestedModalCloseAttached) return;
    window._fixSuggestedModalCloseAttached = true;

    // Event listener direto no botão - usando capture phase para garantir prioridade
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('#suggested-communities-modal-close');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const modal = document.getElementById('suggested-communities-modal');
      if (modal) {
        modal.classList.add('hidden');
        console.log('✅ Modal fechado pelo botão X');
      }
    }, true);

    // Fechar ao clicar fora do modal
    document.addEventListener('click', function (e) {
      const modal = document.getElementById('suggested-communities-modal');
      if (!modal || modal.classList.contains('hidden')) return;
      if (e.target === modal) {
        modal.classList.add('hidden');
        console.log('✅ Modal fechado ao clicar fora');
      }
    });
    
    // Adicionar listener direto ao elemento quando disponível
    function attachDirectListener() {
      const closeBtn = document.getElementById('suggested-communities-modal-close');
      if (closeBtn && !closeBtn._directAttached) {
        closeBtn._directAttached = true;
        closeBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          const modal = document.getElementById('suggested-communities-modal');
          if (modal) {
            modal.classList.add('hidden');
            console.log('✅ Modal fechado pelo listener direto');
          }
        });
      }
    }
    
    // Tenta anexar imediatamente
    attachDirectListener();
    
    // Tenta novamente após o DOM carregar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachDirectListener);
    } else {
      setTimeout(attachDirectListener, 100);
    }
  }

  // ── 5.2. Botão fechar modal criar comunidade ───────────────────────────────
  function fixCommunityModalClose() {
    if (window._fixCommunityModalCloseAttached) return;
    window._fixCommunityModalCloseAttached = true;

    // Botão Cancelar do modal community-modal
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('#community-modal-close');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const modal = document.getElementById('community-modal');
      if (modal) {
        modal.classList.add('hidden');
        console.log('✅ Modal community fechado pelo botão Cancelar');
      }
    }, true);

    // Botão Cancelar do modal create-community-modal
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('#btn-cancel-community');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const modal = document.getElementById('create-community-modal');
      if (modal) {
        modal.classList.add('hidden');
        console.log('✅ Modal create-community fechado pelo botão Cancelar');
      }
    }, true);

    // Botão X do modal create-community-modal
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('#create-community-modal-close-x');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const modal = document.getElementById('create-community-modal');
      if (modal) {
        modal.classList.add('hidden');
        console.log('✅ Modal create-community fechado pelo botão X');
      }
    }, true);

    // Fechar ao clicar fora dos modais
    document.addEventListener('click', function (e) {
      const communityModal = document.getElementById('community-modal');
      const createModal = document.getElementById('create-community-modal');
      
      [communityModal, createModal].forEach(modal => {
        if (!modal || modal.classList.contains('hidden')) return;
        if (e.target === modal) {
          modal.classList.add('hidden');
          console.log('✅ Modal fechado ao clicar fora');
        }
      });
    });
  }

  // ── 5.3. Funcionalidade completa do modal criar comunidade ─────────────────────
  function fixCreateCommunityModal() {
    if (window._fixCreateCommunityModalAttached) return;
    window._fixCreateCommunityModalAttached = true;

    // Variáveis globais para armazenar dados
    window.communityIconData = null;
    window.communityBannerData = null;
    window.selectedCommunityCategory = null;

    // Upload de banner (com guard contra duplo clique)
    document.addEventListener('click', function (e) {
      const bannerPreview = e.target.closest('#community-banner-preview');
      if (!bannerPreview) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const input = document.getElementById('community-banner-input');
      if (input && !input._clicking) { input._clicking = true; setTimeout(() => { input._clicking = false; }, 500); input.click(); }
    }, true);

    // Upload de ícone (com guard contra duplo clique)
    document.addEventListener('click', function (e) {
      const iconPreview = e.target.closest('#community-icon-preview');
      if (!iconPreview) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const input = document.getElementById('community-icon-input');
      if (input && !input._clicking) { input._clicking = true; setTimeout(() => { input._clicking = false; }, 500); input.click(); }
    }, true);

    // Processar upload de banner
    document.getElementById('community-banner-input')?.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (event) {
        window.communityBannerData = event.target.result;
        const preview = document.getElementById('community-banner-preview');
        preview.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;" />`;
      };
      reader.readAsDataURL(file);
    });

    // Processar upload de ícone
    document.getElementById('community-icon-input')?.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (event) {
        window.communityIconData = event.target.result;
        const preview = document.getElementById('community-icon-preview');
        preview.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px;" />`;
      };
      reader.readAsDataURL(file);
    });

    // Seleção de categoria
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.community-category-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      
      // Remove seleção anterior
      document.querySelectorAll('.community-category-btn').forEach(b => {
        b.style.background = 'rgba(255,0,255,0.05)';
        b.style.borderColor = 'rgba(255,0,255,0.2)';
      });
      
      // Adiciona seleção atual
      btn.style.background = 'rgba(255,0,255,0.2)';
      btn.style.borderColor = 'rgba(255,0,255,0.6)';
      window.selectedCommunityCategory = btn.dataset.category;
      console.log('✅ Categoria selecionada:', window.selectedCommunityCategory);
    }, true);

    // Botão criar comunidade
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('#btn-create-community-confirm');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const name = document.getElementById('community-name').value.trim();
      const description = document.getElementById('community-description').value.trim();

      if (!name) {
        alert('Digite um nome para a comunidade');
        return;
      }

      const newCommunity = {
        id: 'comm_' + Date.now(),
        name: name,
        description: description,
        category: window.selectedCommunityCategory || 'other',
        icon: window.communityIconData,
        banner: window.communityBannerData,
        createdAt: Date.now(),
        members: 1,
        online: 1
      };

      let userCommunities = JSON.parse(localStorage.getItem('userCommunities') || '[]');
      // ✅ Deduplicação: remove comunidade com mesmo nome (case-insensitive)
      const normalizedName = (newCommunity.name || '').trim().toLowerCase();
      userCommunities = userCommunities.filter(c => (c.name || '').trim().toLowerCase() !== normalizedName);
      userCommunities.push(newCommunity);
      localStorage.setItem('userCommunities', JSON.stringify(userCommunities));

      console.log('✅ Comunidade salva no localStorage:', newCommunity);
      console.log('✅ Total de comunidades:', userCommunities.length);

      const modal = document.getElementById('create-community-modal');
      if (modal) { modal.removeAttribute('style'); modal.classList.add('hidden'); }

      // Reseta campos
      document.getElementById('community-name').value = '';
      document.getElementById('community-description').value = '';
      document.getElementById('community-icon-input').value = '';
      document.getElementById('community-banner-input').value = '';
      window.communityIconData = null;
      window.communityBannerData = null;
      window.selectedCommunityCategory = null;

      // Reseta previews
      document.getElementById('community-icon-preview').innerHTML = `
        <div style="text-align: center; color: #888;">
          <div style="font-size: 36px;">🌐</div>
          <div style="font-size: 11px;">Ícone</div>
        </div>
      `;
      document.getElementById('community-banner-preview').innerHTML = `
        <div style="text-align: center; color: #888;">
          <div style="font-size: 32px; margin-bottom: 4px;">🖼</div>
          <div style="font-size: 12px;">Clique para adicionar imagem de capa</div>
        </div>
      `;

      // Reseta seleção de categoria
      document.querySelectorAll('.community-category-btn').forEach(b => {
        b.style.background = 'rgba(255,0,255,0.05)';
        b.style.borderColor = 'rgba(255,0,255,0.2)';
      });

      alert(`✅ Comunidade "${name}" criada com sucesso!`);
      console.log('✅ Comunidade criada:', newCommunity);

      // Renderiza as comunidades imediatamente sem recarregar
      if (window.renderUserCommunities) {
        window.renderUserCommunities();
        console.log('✅ Comunidades renderizadas após criação');
      }
    }, true);
  }

  function renderFeedView() {
    const mainArea = document.querySelector('#discover-view .discover-main');
    if (!mainArea) return;

    mainArea.innerHTML = `
      <div style="width:100%;max-width:800px;margin:0 auto;padding:0 16px">

        <!-- Cabeçalho comunidade -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding:20px;background:rgba(13,0,22,0.6);border:1px solid rgba(255,0,255,0.2);border-radius:16px">
          <div style="font-size:48px">💬</div>
          <div>
            <h1 style="color:#fff;margin:0 0 4px 0;font-size:22px">ZX Comunidade</h1>
            <p style="color:#aaa;margin:0;font-size:14px">Seja você mesmo! Conecte-se e compartilhe.</p>
          </div>
          <div style="margin-left:auto;display:flex;gap:16px">
            <div style="text-align:center"><div id="feed-stat-members" style="color:#00ffff;font-size:20px;font-weight:700">0</div><div style="color:#888;font-size:12px">Membros</div></div>
            <div style="text-align:center"><div id="feed-stat-online" style="color:#00ff88;font-size:20px;font-weight:700">0</div><div style="color:#888;font-size:12px">Online</div></div>
          </div>
        </div>

        <!-- Caixa de composição -->
        <div style="background:rgba(13,0,22,0.55);border:1px solid rgba(255,0,255,0.25);border-radius:12px;padding:16px;margin-bottom:16px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;gap:10px;align-items:flex-start">
            <div id="feed-compose-avatar" class="discover-compose-avatar" style="flex-shrink:0">?</div>
            <div style="flex:1;display:flex;flex-direction:column;gap:8px">
              <input type="text" id="discover-post-title" placeholder="Título da postagem..." maxlength="200"
                style="width:100%;padding:10px 14px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:#fff;outline:none;font-size:14px;box-sizing:border-box"/>
              <textarea id="discover-post-body" placeholder="O que você quer compartilhar?" maxlength="2000" rows="2"
                style="width:100%;padding:10px 14px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:#fff;outline:none;font-size:14px;resize:vertical;box-sizing:border-box"></textarea>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px">
            <button type="button" class="btn-neon" id="btn-discover-post" style="padding:8px 24px">📤 Publicar</button>
          </div>
        </div>

        <!-- Barra de ordenação + atualizar -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <span style="color:#888;font-size:13px">Ordenar:</span>
          <button type="button" class="discover-sort-btn active" data-sort="hot" style="background:rgba(255,0,255,0.15);border:1px solid rgba(255,0,255,0.4);border-radius:6px;padding:5px 12px;color:#fff;cursor:pointer;font-size:13px">🔥 Em alta</button>
          <button type="button" class="discover-sort-btn" data-sort="new" style="background:transparent;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:5px 12px;color:#aaa;cursor:pointer;font-size:13px">🆕 Novos</button>
          <button type="button" class="discover-sort-btn" data-sort="top" style="background:transparent;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:5px 12px;color:#aaa;cursor:pointer;font-size:13px">⭐ Top</button>
          <button type="button" id="btn-discover-refresh" style="margin-left:auto;background:rgba(0,255,255,0.1);border:1px solid rgba(0,255,255,0.3);border-radius:6px;padding:5px 12px;color:#00ffff;cursor:pointer;font-size:13px">🔄 Atualizar</button>
        </div>

        <!-- Feed -->
        <div id="discover-feed" style="display:flex;flex-direction:column;gap:12px;padding-bottom:24px">
          <div style="text-align:center;padding:40px;color:#888">⏳ Carregando postagens...</div>
        </div>
      </div>`;

    // Sincronizar avatar
    const avatarEl = document.getElementById('feed-compose-avatar');
    const mainAvatar = document.getElementById('user-avatar');
    if (avatarEl && mainAvatar) {
      avatarEl.textContent      = mainAvatar.textContent;
      avatarEl.style.background = mainAvatar.style.background;
    }

    // Solicitar feed ao servidor
    if (window.socket) window.socket.emit('feed:join');

    // Receber histórico e renderizar
    function onHistory(posts) {
      window._feedPosts = posts || [];
      renderFeedPosts(window._feedPosts);
      updateFeedStats();
    }
    // Evitar registrar listener duplicado
    window.socket.off('feed:history', window._onFeedHistory);
    window._onFeedHistory = onHistory;
    window.socket.on('feed:history', window._onFeedHistory);

    // Nova postagem em tempo real
    window.socket.off('feed:new', window._onFeedNew);
    window._onFeedNew = function(post) {
      if (!window._feedPosts) window._feedPosts = [];
      window._feedPosts.unshift(post);
      renderFeedPosts(window._feedPosts);
    };
    window.socket.on('feed:new', window._onFeedNew);

    bindFeedActions();
  }

  function updateFeedStats() {
    const posts = window._feedPosts || [];
    const members = document.getElementById('feed-stat-members');
    const online  = document.getElementById('feed-stat-online');
    if (members) members.textContent = posts.length;
    // online users count from socket if available
    if (online && window._onlineCount !== undefined) online.textContent = window._onlineCount;
  }

  let _currentSort = 'hot';

  function renderFeedPosts(posts) {
    const feed = document.getElementById('discover-feed');
    if (!feed) return;

    let sorted = [...(posts || [])];
    if (_currentSort === 'new') sorted.sort((a,b) => b.createdAt - a.createdAt);
    else if (_currentSort === 'top') sorted.sort((a,b) => b.score - a.score);
    else sorted.sort((a,b) => b.score - a.score || b.createdAt - a.createdAt);

    if (!sorted.length) {
      feed.innerHTML = `<div style="text-align:center;padding:60px;color:#888">
        <div style="font-size:48px;margin-bottom:12px">📭</div>
        <p>Nenhuma postagem ainda. Seja o primeiro a publicar!</p>
      </div>`;
      return;
    }

    feed.innerHTML = sorted.map(post => {
      const vote = (window._feedVotes || {})[post.id] || 0;
      return `
        <article class="discover-card" data-post-id="${post.id}" style="background:rgba(13,0,22,0.55);border:1px solid rgba(255,0,255,0.2);border-radius:12px;padding:16px;display:flex;gap:12px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:40px">
            <button class="feed-vote-btn" data-vote="1" data-id="${post.id}" style="background:none;border:none;color:${vote===1?'#ff00ff':'#666'};cursor:pointer;font-size:18px;padding:2px">▲</button>
            <span style="color:#fff;font-weight:700;font-size:14px" data-score="${post.id}">${post.score}</span>
            <button class="feed-vote-btn" data-vote="-1" data-id="${post.id}" style="background:none;border:none;color:${vote===-1?'#00ffff':'#666'};cursor:pointer;font-size:18px;padding:2px">▼</button>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;color:#888;margin-bottom:6px">
              <span style="color:#ff00ff">r/${escHtml(post.subreddit||'geral')}</span>
              · por <span style="color:#00ffff">${escHtml(post.username)}</span>
              · ${escHtml(post.time||'')}
            </div>
            <h3 style="color:#fff;margin:0 0 6px 0;font-size:15px;font-weight:600">${escHtml(post.title)}</h3>
            ${post.body ? `<p style="color:#ccc;margin:0 0 10px 0;font-size:14px;line-height:1.5">${escHtml(post.body)}</p>` : ''}
            <button class="feed-toggle-comments" data-id="${post.id}" style="background:none;border:none;color:#888;cursor:pointer;font-size:13px">
              💬 ${(post.comments||[]).length} comentário(s)
            </button>
            <div id="feed-comments-${post.id}" style="display:none;margin-top:10px;border-top:1px solid rgba(255,0,255,0.1);padding-top:10px">
              <div class="feed-comments-list">
                ${(post.comments||[]).map(c=>`
                  <div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
                    <span style="color:#00ffff;font-size:12px;font-weight:600">${escHtml(c.username)}</span>
                    <span style="color:#888;font-size:11px;margin-left:6px">${c.time||''}</span>
                    <p style="color:#ddd;font-size:13px;margin:3px 0 0 0">${escHtml(c.text)}</p>
                  </div>`).join('')}
              </div>
              <div style="display:flex;gap:8px;margin-top:8px">
                <input type="text" class="feed-comment-input" data-id="${post.id}" placeholder="Comentar..."
                  style="flex:1;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,0,255,0.2);border-radius:6px;color:#fff;outline:none;font-size:13px"/>
                <button class="feed-comment-send" data-id="${post.id}"
                  style="background:rgba(255,0,255,0.2);border:1px solid rgba(255,0,255,0.4);border-radius:6px;padding:0 14px;color:#fff;cursor:pointer;font-size:13px">Enviar</button>
              </div>
            </div>
          </div>
        </article>`;
    }).join('');

    // Bind interações do feed
    feed.querySelectorAll('.feed-vote-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const id   = this.dataset.id;
        const vote = parseInt(this.dataset.vote);
        if (!window._feedVotes) window._feedVotes = {};
        const current = window._feedVotes[id] || 0;
        const next = current === vote ? 0 : vote;
        window._feedVotes[id] = next;
        if (window.socket) window.socket.emit('feed:vote', { postId: id, vote: next });
      });
    });

    feed.querySelectorAll('.feed-toggle-comments').forEach(btn => {
      btn.addEventListener('click', function() {
        const box = document.getElementById(`feed-comments-${this.dataset.id}`);
        if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
      });
    });

    feed.querySelectorAll('.feed-comment-send').forEach(btn => {
      btn.addEventListener('click', function() {
        const id    = this.dataset.id;
        const input = feed.querySelector(`.feed-comment-input[data-id="${id}"]`);
        const text  = input?.value.trim();
        if (!text) return;
        if (window.socket) window.socket.emit('feed:comment', { postId: id, text, username: window.username || '' });
        input.value = '';
      });
    });

    feed.querySelectorAll('.feed-comment-input').forEach(input => {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          const btn = feed.querySelector(`.feed-comment-send[data-id="${this.dataset.id}"]`);
          btn?.click();
        }
      });
    });
  }

  function bindFeedActions() {
    // Publicar
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#btn-discover-post')) return;
      const title = document.getElementById('discover-post-title')?.value.trim();
      const body  = document.getElementById('discover-post-body')?.value.trim();
      if (!title) { if (typeof showToast === 'function') showToast('Digite um título.'); return; }
      if (window.socket) window.socket.emit('feed:post', { title, body, subreddit: 'geral', username: window.username || '' });
      const t = document.getElementById('discover-post-title');
      const b = document.getElementById('discover-post-body');
      if (t) t.value = '';
      if (b) b.value = '';
    });

    // Atualizar feed
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#btn-discover-refresh')) return;
      const feed = document.getElementById('discover-feed');
      if (feed) feed.innerHTML = `<div style="text-align:center;padding:40px;color:#888">⏳ Atualizando...</div>`;
      if (window.socket) window.socket.emit('feed:join');
    });

    // Ordenação
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('.discover-sort-btn');
      if (!btn || !btn.dataset.sort) return;
      _currentSort = btn.dataset.sort;
      document.querySelectorAll('.discover-sort-btn').forEach(b => {
        b.style.background = 'transparent';
        b.style.borderColor = 'rgba(255,255,255,0.15)';
        b.style.color = '#aaa';
        b.classList.remove('active');
      });
      btn.style.background   = 'rgba(255,0,255,0.15)';
      btn.style.borderColor  = 'rgba(255,0,255,0.4)';
      btn.style.color        = '#fff';
      btn.classList.add('active');
      if (window._feedPosts) renderFeedPosts(window._feedPosts);
    });
  }

  // ── 6. Voz: call dock (janela flutuante) + controles ─────────────────────
  function fixVoice() {
    // Patch em joinVoiceChannel para garantir que o dock seja criado
    function waitForVoice(cb) {
      if (typeof window.joinVoiceChannel === 'function') { cb(); return; }
      const t = setInterval(() => {
        if (typeof window.joinVoiceChannel === 'function') { clearInterval(t); cb(); }
      }, 200);
    }

    waitForVoice(function() {
      const original = window.joinVoiceChannel;
      if (original._dockPatched) return;
      window.joinVoiceChannel = async function(channel) {
        await original.call(this, channel);
        // Garantir que o dock aparece após entrar
        setTimeout(() => ensureVoiceDock(channel), 300);
      };
      window.joinVoiceChannel._dockPatched = true;
    });

    // btn-voice-join-confirm (modal HTML estático)
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('#btn-voice-join-confirm');
      if (!btn) return;
      e.stopImmediatePropagation();
      const modal = document.getElementById('voice-join-modal');
      const chName = document.getElementById('voice-join-channel-name')?.textContent || 'Voz';
      if (modal) modal.classList.add('hidden');
      // Usa o canal pendente definido por showVoiceJoinModal, com fallback
      const ch = window._pendingVoiceChannel || { id: window.currentChannel || 'voice', name: chName, type: 'voice' };
      window._pendingVoiceChannel = null;
      if (typeof window.joinVoiceChannel === 'function') {
        window.joinVoiceChannel(ch);
      } else {
        (window.showLayout || _showLayout)('voice-view');
        ensureVoiceDock(ch);
      }
    }, true);

    // btn-toggle-mic
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#btn-toggle-mic')) return;
      e.stopImmediatePropagation();
      if (typeof window.toggleMicrophone === 'function') window.toggleMicrophone();
      else {
        const btn = document.getElementById('btn-toggle-mic');
        btn?.classList.toggle('active');
      }
    }, true);

    // btn-leave-voice
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#btn-leave-voice')) return;
      e.stopImmediatePropagation();
      if (typeof window.leaveVoiceChannel === 'function') window.leaveVoiceChannel();
      document.getElementById('voice-floating-window')?.remove();
      // Volta para o servidor atual em vez de ir para a tela inicial
      const _sid = window.currentServerId;
      if (_sid && window.servers) {
        const _srv = window.servers.find(function(s) { return s.id === _sid; });
        if (_srv) {
          const _ch = (_srv.channels || []).find(function(c) { return c.type !== 'voice'; }) || (_srv.channels || [])[0];
          if (_ch && typeof window.openChannel === 'function') {
            window.openChannel(_ch);
            return;
          }
        }
      }
      (window.showLayout || _showLayout)('discover-view');
    }, true);
  }

  function ensureVoiceDock(channel) {
    if (document.getElementById('voice-floating-window')) return; // já existe
    if (typeof window.createFloatingWindow === 'function') {
      // VoiceSystem precisa ter o canal setado
      if (window.VoiceSystem && !window.VoiceSystem.currentVoiceChannel) {
        window.VoiceSystem.currentVoiceChannel = channel;
      }
      window.createFloatingWindow();
    } else {
      // Dock simples de fallback
      const dock = document.createElement('div');
      dock.id = 'voice-floating-window';
      dock.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(18,18,26,0.97);border:1px solid #ff00ff;border-radius:12px;padding:10px 18px;z-index:99999;display:flex;align-items:center;gap:12px;box-shadow:0 0 25px rgba(255,0,255,0.3)`;
      dock.innerHTML = `
        <span style="color:#fff;font-size:13px;font-weight:600">🔊 ${escHtml(channel?.name||'Voz')}</span>
        <button id="float-btn-mic" style="background:rgba(0,255,255,0.15);border:1px solid rgba(0,255,255,0.4);border-radius:6px;padding:6px 10px;color:#fff;cursor:pointer">🎙</button>
        <button id="float-btn-leave" style="background:rgba(255,50,50,0.2);border:1px solid rgba(255,50,50,0.5);border-radius:6px;padding:6px 10px;color:#ff6b6b;cursor:pointer">📵 Sair</button>`;
      document.body.appendChild(dock);

      dock.querySelector('#float-btn-mic').addEventListener('click', function() {
        if (typeof window.toggleMicrophone === 'function') window.toggleMicrophone();
        this.classList.toggle('active');
      });
      dock.querySelector('#float-btn-leave').addEventListener('click', function() {
        if (typeof window.leaveVoiceChannel === 'function') window.leaveVoiceChannel();
        dock.remove();
        (window.showLayout || _showLayout)('discover-view');
      });
    }
  }

  // ── 7. Modal Fandom: adicionar botão "Criar Fandom" ───────────────────────
  function fixFandomModal() {
    const modal = document.getElementById('fandom-modal');
    if (!modal || modal._fixFandomAttached) return;
    modal._fixFandomAttached = true;

    // Verifica se já tem botão de confirmar
    if (modal.querySelector('#fandom-modal-confirm')) return;

    const closeBtn = modal.querySelector('#fandom-modal-close');
    if (!closeBtn) return;

    // Insere botão Criar antes do botão Cancelar
    const confirmBtn = document.createElement('button');
    confirmBtn.type      = 'button';
    confirmBtn.id        = 'fandom-modal-confirm';
    confirmBtn.className = 'btn-neon';
    confirmBtn.style.cssText = 'width:100%;margin-bottom:8px';
    confirmBtn.textContent   = '✅ Criar Fandom';

    closeBtn.parentNode.insertBefore(confirmBtn, closeBtn);

    confirmBtn.addEventListener('click', function() {
      const name  = document.getElementById('fandom-name-input')?.value.trim();
      const topic = document.getElementById('fandom-topic-input')?.value.trim();
      if (!name) { if (typeof showToast === 'function') showToast('Digite um nome para o Fandom.'); return; }
      if (typeof window.createFandom === 'function') {
        window.createFandom();
      } else {
        // Fallback manual
        const fandomId = 'fandom_' + Date.now().toString(36);
        const newFandom = {
          id: fandomId, name, topic: topic || '', type: 'other',
          channels: [
            { id: fandomId + '_geral', name: 'geral', type: 'text', desc: 'Canal principal do fandom' }
          ],
          createdAt: Date.now()
        };
        if (window.currentServerId && window.servers) {
          const server = window.servers.find(s => s.id === window.currentServerId);
          if (server) {
            if (!server.fandoms) server.fandoms = [];
            server.fandoms.push(newFandom);
            if (typeof window.saveServers === 'function') window.saveServers();
            if (typeof window.renderSidebarChannels === 'function') window.renderSidebarChannels(server);
          }
        }
        if (typeof showToast === 'function') showToast(`✅ Fandom "${name}" criado!`);
      }
      modal.classList.add('hidden');
    });
  }


  // ── XP System + @username no perfil ──────────────────────────────────────────
  function fixXpSystem() {
    if (window._fixXpAttached) return;
    window._fixXpAttached = true;

    function getXp() { return parseInt(localStorage.getItem('zx_xp') || '0', 10); }
    function addXp(amount) {
      const xp = getXp() + amount;
      localStorage.setItem('zx_xp', String(xp));
      updateXpDisplay();
      return xp;
    }
    function updateXpDisplay() {
      const xp = getXp();
      const fmt = xp.toLocaleString('pt-BR');
      const v1 = document.getElementById('xp-value');
      const v2 = document.getElementById('xp-value-sidebar');
      if (v1) v1.textContent = fmt;
      if (v2) v2.textContent = fmt;
    }
    window.addXp = addXp;
    window.updateXpDisplay = updateXpDisplay;

    // Atualiza display imediatamente e a cada 2s para manter sincronizado
    updateXpDisplay();
    setInterval(updateXpDisplay, 2000);

    // Ganha XP ao enviar mensagem
    function waitForSocket(cb) {
      if (window.socket) { cb(); return; }
      const t = setInterval(() => { if (window.socket) { clearInterval(t); cb(); } }, 150);
    }
    waitForSocket(function() {
      // Usa 'message' pois 'message:sent' foi removido do servidor para evitar duplicação
      // XP é adicionado apenas quando o próprio usuário envia (sender === username)
      window.socket.on('message', function(msg) {
        const currentUser = window.username || localStorage.getItem('zx_username') || '';
        if (msg && msg.username && currentUser && msg.username.toLowerCase() === currentUser.toLowerCase()) {
          addXp(10);
        }
      });
    });
  }

  // ── Atualizar @username no modal perfil ──────────────────────────────────────
  function fixProfileAt() {
    if (window._fixProfileAtAttached) return;
    window._fixProfileAtAttached = true;

    function updateAt() {
      const atEl = document.getElementById('profile-username-at');
      if (!atEl) return;
      const u = window.username || localStorage.getItem('zx_username') || '';
      atEl.textContent = u ? '@' + u : '@';
    }
    // Atualiza imediatamente e com polling leve
    updateAt();
    setInterval(updateAt, 1000);
  }

  // ── Inicialização ─────────────────────────────────────────────────────────
  function init() {
    fixBottomNav();
    fixCommunityPostsBtn();
    fixXpSystem();
    fixProfileAt();
    fixSuggestedModalClose();
    fixCommunityModalClose();
    fixCreateCommunityModal();
    fixMessageInput();
    fixMessageRendering();
    fixVoice();
    fixFandomModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', function() {
    fixBottomNav();
    fixMessageInput();
    fixFandomModal();
    fixVoice();
  });

})();

// ✅ FIX: Botão "+ CRIAR" dos Shorts/Reels
// O handler original está num bloco <script> com SyntaxError que impede sua execução.
// Este handler em bug-fixes.js garante que o modal abra corretamente.
document.addEventListener('click', function(e) {
  const btn = e.target.closest('#btn-create-short');
  if (!btn) return;
  e.stopPropagation();
  const modal = document.getElementById('create-short-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.setAttribute('style',
      'display:flex !important; position:fixed !important; top:0 !important; ' +
      'left:0 !important; width:100vw !important; height:100vh !important; ' +
      'z-index:99999 !important; background:rgba(0,0,0,0.85) !important; ' +
      'align-items:center !important; justify-content:center !important;'
    );
  }
}, true);

console.log('✅ Fix Shorts/Reels: handler do botão "+ CRIAR" registrado!');


// ===== AUTO FIXES: shorts modal =====
(function(){
document.addEventListener('click',function(e){
 const cancel=e.target.closest('#btn-cancel-short');
 if(cancel){
   const m=document.getElementById('create-short-modal');
   if(m){m.classList.add('hidden');m.removeAttribute('style');}
 }
 // ✅ BUG CORRIGIDO: handler falso de #btn-publish-short removido.
 // O handler real (que faz upload + socket.emit) está em index.html.
},true);

window.addEventListener('load',()=>{
 const rail=document.getElementById('servers-rail');
 if(rail){
   rail.querySelectorAll('[data-community-card]').forEach(e=>e.remove());
 }
 // ✅ REMOVER COMUNIDADES IMEDIATAMENTE AO CARREGAR
 const communities=JSON.parse(localStorage.getItem('userCommunities')||'[]');
 if(rail){
   rail.querySelectorAll('*').forEach(el=>{
     const t=(el.title||'')+' '+(el.textContent||'');
     if(communities.some(c=>c.name && t.includes(c.name))) el.remove();
   });
 }
});
})();


// DEFINITIVE COMMUNITY/SERVER SEPARATION FIX
(function(){
function fixCommunityCards(){
 const grid=document.getElementById('my-communities-grid'); if(!grid) return;
 grid.querySelectorAll('.zx-user-community-card').forEach(e=>e.remove());
 const list=JSON.parse(localStorage.getItem('userCommunities')||'[]');
 list.forEach(c=>{
  const card=document.createElement('div');
  card.className='zx-user-community-card';
  const banner=c.banner||'Community-banner.png';
  const icon=c.icon||'Community-banner.png';
  card.innerHTML=`<div style="overflow:hidden;border-radius:16px;background:rgba(255,0,255,.08);border:1px solid rgba(255,0,255,.25)"><div style="height:120px;background:url('${banner}') center/cover"></div><div style="padding:12px"><img src="${icon}" style="width:64px;height:64px;border-radius:14px;margin-top:-44px;border:3px solid #111;object-fit:cover"><div style="font-weight:700;color:#fff;margin-top:8px">${c.name||'Comunidade'}</div><div style="color:#aaa">${c.description||''}</div></div></div>`;
  grid.appendChild(card);
 });
}
function purgeCommunityFromRail(){
 const rail=document.getElementById('servers-rail')||document.querySelector('.servers-rail');
 if(!rail) return;
 const communities=JSON.parse(localStorage.getItem('userCommunities')||'[]');
 rail.querySelectorAll('*').forEach(el=>{
   const t=(el.title||'')+' '+(el.textContent||'');
   if(communities.some(c=>c.name && t.includes(c.name))) el.remove();
 });
 console.log('✅ Comunidades removidas da barra de servidores');
}
window.addEventListener('load',()=>{setTimeout(fixCommunityCards,500);setTimeout(purgeCommunityFromRail,0);setTimeout(purgeCommunityFromRail,1000);setTimeout(purgeCommunityFromRail,2000);});
})();


// FINAL COMMUNITY FIX
(function(){
window.renderUserCommunities=function(){
 const grid=document.getElementById('my-communities-grid'); if(!grid) return;
 grid.querySelectorAll('.zx-user-community-card').forEach(e=>e.remove());
 let list=[]; try{list=JSON.parse(localStorage.getItem('userCommunities')||'[]')}catch(e){}
 // ✅ Deduplicação por nome (case-insensitive)
 const originalLength=list.length;
 const seenNames=new Set();
 const deduplicated=[];
 for(const c of list){
   const normalizedName=(c.name||'').trim().toLowerCase();
   if(!seenNames.has(normalizedName)){
     seenNames.add(normalizedName);
     deduplicated.push(c);
   }
 }
 list=deduplicated;
 // Salva a versão deduplicada
 if(deduplicated.length!==originalLength){
   localStorage.setItem('userCommunities',JSON.stringify(deduplicated));
   console.log('✅ Removidas',originalLength-deduplicated.length,'comunidades duplicadas');
 }
 const seen=new Set();
 list.forEach(c=>{
   const key=(c.id||'')+'|'+(c.name||'').toLowerCase();
   if(seen.has(key)) return; seen.add(key);
   const card=document.createElement('div');
   card.className='zx-user-community-card';
   card.style.cursor='pointer';
   const banner=c.banner||c.bannerUrl||'Community-banner.png';
   const icon=c.icon||c.iconUrl||banner;
   card.innerHTML=`<div style="overflow:hidden;border-radius:16px;background:rgba(255,0,255,.08);border:1px solid rgba(255,0,255,.25);height:100%">
   <div style="height:120px;background:url('${banner}') center/cover"></div>
   <div style="padding:12px"><img src="${icon}" style="width:64px;height:64px;border-radius:14px;margin-top:-44px;border:3px solid #111;object-fit:cover">
   <div style="font-weight:700;color:#fff;margin-top:8px">${c.name||'Comunidade'}</div>
   <div style="color:#aaa">${c.description||''}</div></div></div>`;
   card.addEventListener('click',()=> {
      const id=c.id||Date.now();
      localStorage.setItem('currentCommunityId',id);
      location.href=`community-page.html?id=${encodeURIComponent(id)}&name=${encodeURIComponent(c.name||'Comunidade')}`;
   });
   grid.appendChild(card);
 });
};
function purge(){
 const names=new Set();
 try{JSON.parse(localStorage.getItem('userCommunities')||'[]').forEach(c=>names.add((c.name||'').trim()));}catch(e){}
 document.querySelectorAll('#servers-rail *,.servers-rail *').forEach(el=>{
   const t=((el.title||'')+' '+(el.textContent||'')).trim();
   if([...names].some(n=>n && t===n)) el.remove();
 });
 console.log('✅ Comunidades removidas da barra de servidores (purge)');
}
window.addEventListener('load',()=>{window.renderUserCommunities(); purge(); setTimeout(purge,50); setTimeout(purge,500);setTimeout(purge,1000);setTimeout(purge,2000);});
})();


// COMMUNITY CLICK/CONTEXT FIX
(function(){
function openCommunityContextMenu(community,x,y){
 document.getElementById('community-context-menu-fix')?.remove();
 console.log('Menu aberto:', community.id);
 const m=document.createElement('div');
 m.id='community-context-menu-fix';
 m.style.cssText=`position:fixed;left:${x}px;top:${y}px;z-index:999999;background:#12121a;border:1px solid rgba(255,0,255,.3);border-radius:8px;padding:6px;min-width:180px`;
 const items=['Entrar','Editar Comunidade','✨ Colocar nas Sugeridas','Copiar Link','Excluir Comunidade'];
 items.forEach(label=>{
   const b=document.createElement('div');
   b.textContent=label;
   b.style.cssText='padding:8px;cursor:pointer;color:#fff';
   if(label==='Entrar'){
      b.onclick=()=>{localStorage.setItem('currentCommunityId',community.id);location.href=`community-page.html?id=${encodeURIComponent(community.id)}`;}
   }
   if(label==='Editar Comunidade'){
      b.onclick=()=>{openEditCommunityModal(community);m.remove();}
   }
   if(label==='✨ Colocar nas Sugeridas'){
      b.onclick=()=>{
        // ✅ CORREÇÃO: Removido handler duplicado - usar o handler do index.html
        // O index.html já gerencia "Colocar nas Sugeridas" via socket events
        console.log('⚠️ Handler do bug-fixes.js desabilitado - usando handler do index.html');
        m.remove();
      };
   }
   if(label==='Copiar Link'){
      b.onclick=()=>{navigator.clipboard.writeText(window.location.origin+`/community-page.html?id=${community.id}`).then(()=>alert('✅ Link copiado!'));}
   }
   if(label==='Excluir Comunidade'){
      b.onclick=()=>{
        let userCommunities=JSON.parse(localStorage.getItem('userCommunities')||'[]');
        userCommunities=userCommunities.filter(c=>c.id!==community.id);
        localStorage.setItem('userCommunities',JSON.stringify(userCommunities));
        window.renderUserCommunities&&window.renderUserCommunities();
        alert(`✅ Comunidade "${community.name}" foi APAGADA!`);
        m.remove();
      };
   }
   m.appendChild(b);
 });
 document.body.appendChild(m);
 setTimeout(()=>document.addEventListener('click',()=>m.remove(),{once:true}),0);
}

function openEditCommunityModal(community){
 const modal=document.createElement('div');
 modal.id='edit-community-modal';
 modal.style.cssText=`position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:999999`;
 modal.innerHTML=`
  <div style="background:#12121a;border:1px solid rgba(255,0,255,0.3);border-radius:16px;padding:24px;width:90%;max-width:500px;max-height:90vh;overflow-y:auto;">
   <h2 style="color:#fff;margin:0 0 20px 0;font-size:24px;">✏ Editar Comunidade</h2>
   <div style="margin-bottom:16px;">
    <label style="color:#fff;display:block;margin-bottom:8px;">Nome</label>
    <input type="text" id="edit-community-name" value="${community.name||''}" style="width:100%;padding:12px;background:#1a1a2e;border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:#fff;">
   </div>
   <div style="margin-bottom:16px;">
    <label style="color:#fff;display:block;margin-bottom:8px;">Descrição</label>
    <textarea id="edit-community-description" style="width:100%;padding:12px;background:#1a1a2e;border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:#fff;min-height:80px;">${community.description||''}</textarea>
   </div>
   <div style="margin-bottom:16px;">
    <label style="color:#fff;display:block;margin-bottom:8px;">Banner</label>
    <input type="file" id="edit-community-banner" accept="image/*" style="width:100%;padding:8px;background:#1a1a2e;border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:#fff;">
    <div id="edit-banner-preview" style="margin-top:8px;width:100%;height:120px;background:#1a1a2e;border-radius:8px;overflow:hidden;">
     ${community.banner?`<img src="${community.banner}" style="width:100%;height:100%;object-fit:cover;">`:''}
    </div>
   </div>
   <div style="margin-bottom:20px;">
    <label style="color:#fff;display:block;margin-bottom:8px;">Icon</label>
    <input type="file" id="edit-community-icon" accept="image/*" style="width:100%;padding:8px;background:#1a1a2e;border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:#fff;">
    <div id="edit-icon-preview" style="margin-top:8px;width:64px;height:64px;background:#1a1a2e;border-radius:12px;overflow:hidden;">
     ${community.icon?`<img src="${community.icon}" style="width:100%;height:100%;object-fit:cover;">`:''}
    </div>
   </div>
   <div style="display:flex;gap:12px;justify-content:flex-end;">
    <button id="cancel-edit-community" style="padding:12px 24px;background:rgba(255,0,255,0.2);border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:#fff;cursor:pointer;">Cancelar</button>
    <button id="save-edit-community" style="padding:12px 24px;background:rgba(255,0,255,0.3);border:1px solid rgba(255,0,255,0.5);border-radius:8px;color:#fff;cursor:pointer;">Salvar</button>
   </div>
  </div>
 `;
 document.body.appendChild(modal);
 
 let bannerData=community.banner||null;
 let iconData=community.icon||null;
 
 document.getElementById('edit-community-banner').addEventListener('change',function(e){
  const file=e.target.files[0];
  if(file){
   const reader=new FileReader();
   reader.onload=function(ev){
    bannerData=ev.target.result;
    document.getElementById('edit-banner-preview').innerHTML=`<img src="${bannerData}" style="width:100%;height:100%;object-fit:cover;">`;
   };
   reader.readAsDataURL(file);
  }
 });
 
 document.getElementById('edit-community-icon').addEventListener('change',function(e){
  const file=e.target.files[0];
  if(file){
   const reader=new FileReader();
   reader.onload=function(ev){
    iconData=ev.target.result;
    document.getElementById('edit-icon-preview').innerHTML=`<img src="${iconData}" style="width:100%;height:100%;object-fit:cover;">`;
   };
   reader.readAsDataURL(file);
  }
 });
 
 document.getElementById('cancel-edit-community').addEventListener('click',function(){
  modal.remove();
 });
 
 document.getElementById('save-edit-community').addEventListener('click',function(){
  const name=document.getElementById('edit-community-name').value;
  const description=document.getElementById('edit-community-description').value;
  
  let userCommunities=JSON.parse(localStorage.getItem('userCommunities')||'[]');
  const index=userCommunities.findIndex(c=>c.id===community.id);
  if(index!==-1){
   userCommunities[index].name=name;
   userCommunities[index].description=description;
   userCommunities[index].banner=bannerData;
   userCommunities[index].icon=iconData;
   localStorage.setItem('userCommunities',JSON.stringify(userCommunities));
   window.renderUserCommunities&&window.renderUserCommunities();
   alert(`✅ Comunidade "${name}" atualizada com sucesso!`);
  }
  modal.remove();
 });
}
window.openCommunityContextMenu=openCommunityContextMenu;

function bindCard(card,community){
 if(card.dataset.communityBound) return;
 card.dataset.communityBound='1';
 card.dataset.communityId=community.id;
 card.dataset.id=community.id;
 card.addEventListener('click',function(e){
   console.log('Comunidade clicada:',community.id);
   localStorage.setItem('currentCommunityId',community.id);
   location.href=`community-page.html?id=${encodeURIComponent(community.id)}`;
 });
 card.addEventListener('contextmenu',function(e){
   e.preventDefault();
   openCommunityContextMenu(community,e.clientX,e.clientY);
 });
}

const old=window.renderUserCommunities;
window.renderUserCommunities=function(){
 if(old) old();
 // ✅ Deduplicação antes de renderizar
 let list=[]; try{list=JSON.parse(localStorage.getItem('userCommunities')||'[]')}catch(e){}
 const seenNames=new Set();
 const deduplicated=[];
 for(const c of list){
   const normalizedName=(c.name||'').trim().toLowerCase();
   if(!seenNames.has(normalizedName)){
     seenNames.add(normalizedName);
     deduplicated.push(c);
   }
 }
 if(deduplicated.length!==list.length){
   localStorage.setItem('userCommunities',JSON.stringify(deduplicated));
   console.log('✅ Removidas',list.length-deduplicated.length,'comunidades duplicadas');
 }
 list=deduplicated;
 document.querySelectorAll('.zx-user-community-card').forEach((card,i)=>{
   const c=list[i];
   if(c && c.id){
     bindCard(card,c);
   }
 });
};

window.rebindCommunityEvents=function(){
 document.querySelectorAll('[data-community-id],.zx-user-community-card').forEach((card,i)=>{
  const id=card.dataset.communityId||card.dataset.id||('community-'+i);
  bindCard(card,{id:id});
 });
};

window.addEventListener('load',()=>setTimeout(window.rebindCommunityEvents,1000));
})();


// AUTO FIX 2026 - communities persistence and visibility
(function(){
function ensureCommunityVisibility(){
 if(location.pathname.includes('community-page.html')){
   document.querySelectorAll('.my-communities-section,.communities-section,#my-communities,.user-communities').forEach(el=>{
      el.style.display='none';
   });
 }
}
function preventCommunityLoss(){
 try{
   const raw=localStorage.getItem('userCommunities');
   if(raw && raw!=='[]'){
      localStorage.setItem('userCommunities_backup', raw);
   }
   // Restauração automática removida para não sobrescrever deleções intencionais
 }catch(e){console.warn(e);}
}
window.addEventListener('resize', ()=>{
 setTimeout(()=>{
   if(typeof window.renderUserCommunities==='function'){
      try{ window.renderUserCommunities(); }catch(e){}
   }
 },100);
});
document.addEventListener('DOMContentLoaded', ()=>{
 preventCommunityLoss();
 ensureCommunityVisibility();
});
})();

// COMMUNITY PERSIST FIX
// Nota: restauração automática desabilitada para não sobrescrever exclusões intencionais.
// Use window.zxRestoreCommunities() para restaurar manualmente se precisar.
(function(){
 function restore(){
  try{
   // Se o usuário acabou de excluir intencionalmente, não restaura
   const noRestore=localStorage.getItem('zx_no_restore');
   if(noRestore && (Date.now()-parseInt(noRestore,10))<10000) return;
   const key='userCommunities';
   const data=localStorage.getItem(key);
   if(data && data!=='[]') localStorage.setItem('userCommunities_backup',data);
   // Restauração automática por resize/visibilitychange removida para evitar conflito com delete intencional
  }catch(e){}
 }
 // Expõe restore manual caso seja necessário
 window.zxRestoreCommunities=function(){
  try{
   const backup=localStorage.getItem('userCommunities_backup');
   if(backup && backup!=='[]'){
    localStorage.setItem('userCommunities',backup);
    if(window.renderUserCommunities) window.renderUserCommunities();
   }
  }catch(e){}
 };
 window.addEventListener('resize', ()=>setTimeout(restore,50));
 document.addEventListener('visibilitychange', restore);
 // setInterval removido — impedia deleção intencional de comunidades
 restore();
})();

// ================================================
// AUTO-LOADER: dm-realtime-fix.js + dm-call-system.js
// Garante que os scripts de DM sejam carregados em
// QUALQUER página do app, mesmo sem index.html modificado.
// ================================================
(function _autoDmFixLoader() {
  function _loadScript(src, onLoad) {
    if (document.querySelector('script[src="' + src + '"]')) { if (onLoad) onLoad(); return; }
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    if (onLoad) s.onload = onLoad;
    document.head.appendChild(s);
  }

  function _doLoad() {
    // Carregar dm-realtime-fix.js se ainda não estiver carregado
    _loadScript('dm-realtime-fix.js');
    // dm-call-system.js já deve estar na página, mas garantir
    if (!window._dmCallSocketBound) {
      _loadScript('dm-call-system.js');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doLoad);
  } else {
    setTimeout(_doLoad, 0);
  }
})();

// Listener para evento suggested:updated (sincronização em tempo real)
function setupSuggestedUpdatedListener(){
  if(typeof window.socket!=='undefined'&&window.socket){
    window.socket.on('suggested:updated',(community)=>{
      if(window.SugeridasManager?.adicionar){
        window.SugeridasManager.adicionar(community);
        console.log('✅ [bug-fixes] Comunidade sugerida sincronizada via suggested:updated:',community.name);
      }
    });
    console.log('✅ [bug-fixes] Listener suggested:updated configurado');
  }else{
    setTimeout(setupSuggestedUpdatedListener,500);
  }
}
setupSuggestedUpdatedListener();

// Mostrar botão "Adicionar ID" apenas para devs/staffs
function showAddManualButtonForDevStaff(){
  const btn=document.getElementById('suggested-communities-add-manual');
  if(!btn)return;
  
  // Verificar se o usuário é dev ou staff
  const isDevOrStaff=window.isDev||window.isStaff||false;
  if(isDevOrStaff){
    btn.style.display='block';
    console.log('✅ [bug-fixes] Botão Adicionar ID visível para dev/staff');
  }
}

// Botão para adicionar comunidade manualmente por ID
document.addEventListener('click',function(e){
  const btn=e.target.closest('#suggested-communities-add-manual');
  if(!btn)return;
  e.preventDefault();
  e.stopPropagation();
  const communityId=prompt('Digite o ID da comunidade para adicionar às sugeridas:');
  if(!communityId)return;
  if(typeof window.socket!=='undefined'&&window.socket){
    // Buscar dados da comunidade pelo ID
    window.socket.emit('community:get-by-id',{id:communityId});
  }
});

// Listener para receber dados da comunidade por ID
function setupCommunityGetByIdListener(){
  if(typeof window.socket!=='undefined'&&window.socket){
    window.socket.on('community:by-id-response',(community)=>{
      if(community){
        const communityData={
          id:community.id,
          name:community.name,
          description:community.description,
          banner:community.banner||community.bannerUrl||null,
          icon:community.icon||community.iconUrl||null,
          members:community.members||1,
          category:community.category||'other',
          createdAt:community.createdAt||Date.now()
        };
        window.socket.emit('community:add-suggested',communityData);
        console.log('✅ [bug-fixes] Comunidade adicionada via ID manual:',communityData.name);
        alert(`✅ Comunidade "${communityData.name}" adicionada às sugeridas!`);
      }else{
        alert('❌ Comunidade não encontrada com este ID.');
      }
    });
  }else{
    setTimeout(setupCommunityGetByIdListener,500);
  }
}
setupCommunityGetByIdListener();

// Verificar se usuário é dev/staff e mostrar botão
setTimeout(showAddManualButtonForDevStaff,1000);

// Fix: re-render suggested communities when returning to home/layout changes
(function(){
 async function refreshSuggested(){
  try{
   if(window.sugeridasManager && window.sugeridasManager.renderSuggestedCommunities){window.sugeridasManager.renderSuggestedCommunities();}
   if(window.renderSuggestedCommunities){window.renderSuggestedCommunities();}
   if(window.socket){ window.socket.emit('community:get-suggested'); }
  }catch(e){console.error('Suggested refresh error',e);}
 }
 document.addEventListener('visibilitychange',()=>{ if(!document.hidden) setTimeout(refreshSuggested,300);});
 window.addEventListener('focus',()=>setTimeout(refreshSuggested,300));
 window.refreshSuggestedCommunitiesAfterLayout = refreshSuggested;
})();


// ===== PATCH: Recarregar Comunidades Sugeridas ao voltar para Início =====
(function(){
  function reloadSuggested() {
    setTimeout(() => {
      try {
        if (window.socket && window.socket.connected) {
          window.socket.emit('community:get-suggested');
        }

        if (window.loadSuggestedCommunities) {
          window.loadSuggestedCommunities();
        }

        if (window.renderSuggestedCommunities) {
          window.renderSuggestedCommunities();
        }

        const container = document.getElementById('suggested-communities-grid') ||
                          document.querySelector('.suggested-communities-grid');

        if (container && container.children.length <= 1 && window.socket) {
          window.socket.emit('community:get-suggested');
        }
      } catch(e) {
        console.error('Erro ao recarregar sugeridas:', e);
      }
    }, 250);
  }

  document.addEventListener('click', (e) => {
    const homeBtn = e.target.closest('[data-view="discover-view"], .home-btn, #home-btn');
    if (homeBtn) reloadSuggested();
  });

  const originalShowLayout = window.showLayout;
  if (typeof originalShowLayout === 'function') {
    window.showLayout = function(layoutId) {
      const result = originalShowLayout.apply(this, arguments);
      if (layoutId === 'discover-view') reloadSuggested();
      return result;
    };
  }
})();
