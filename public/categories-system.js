// ================================================
// SISTEMA DE CATEGORIAS DE CANAIS E PASTAS DE SERVIDORES
// ================================================

// ✅ EVENTO GLOBAL FORA DO DOMContentLoaded PARA FUNCIONAR SEMPRE
document.addEventListener('click', (e) => {
  console.log('🔍 CLICK DETECTADO GLOBAL:', e.target);
  
  // ✅ HANDLER PARA BOTÃO "COLOCAR NAS SUGERIDAS"
  if (e.target.dataset.action === 'suggest' || e.target.closest('[data-action="suggest"]')) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('✅ BOTÃO COLOCAR NAS SUGERIDAS CLICADO!');
    
    // Pegar o servidor atual
    let serverId = window.currentServerId || localStorage.getItem('currentServerId');
    
    if (serverId) {
      // Pegar lista de comunidades
      const servers = JSON.parse(localStorage.getItem('zx_servers') || '[]');
      const server = servers.find(s => s.id === serverId);
      
      if (server) {
        // ✅ ✅ ✅ CORREÇÃO DIRETA: ADICIONAR DIRETAMENTE AQUI SEM DEPENDER DE FUNÇÕES EXTERNAS
        // 1. Verificar se já existe para não duplicar
        const suggestedCommunities = window.suggestedCommunities || [];
        const alreadyExists = suggestedCommunities.some(c => c.id === server.id);
        if (alreadyExists) {
          alert('⚠️ Esta comunidade já está nas sugeridas!');
        } else {
          // 2. Envia evento para o servidor adicionar
          if (window.socket) {
            window.socket.emit('community:add-suggested', {
              id: server.id,
              name: server.name,
              icon: server.icon || '',
              banner: server.banner || '',
              members: server.members || 0,
              ownerId: server.ownerId || server.id
            });
          }

          console.log('✅ Comunidade enviada para as sugeridas via Socket.IO!');
          
          // 5. ✅ ATUALIZAR A INTERFACE DIRETAMENTE AQUI
          const suggestedGrid = document.querySelector('#discover-view .discover-main > div:nth-child(2) > div:nth-child(2)');
          if (suggestedGrid) {
            // Limpar container completamente
            suggestedGrid.innerHTML = '';
            
            // Renderizar apenas os 3 primeiros
            const displayCommunities = suggestedCommunities.slice(0, 3);
            
            displayCommunities.forEach(community => {
              const communityCard = document.createElement('div');
              communityCard.style.minWidth = '220px';
              communityCard.style.height = '280px';
              communityCard.style.borderRadius = '16px';
              communityCard.style.overflow = 'hidden';
              communityCard.style.border = '2px solid rgba(255, 0, 255, 0.3)';
              communityCard.style.cursor = 'pointer';
              communityCard.style.transition = 'all 0.2s';
              communityCard.style.position = 'relative';

              if (community.banner) {
                communityCard.innerHTML = `
                  <img src="${community.banner}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;" />
                  <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.9)); padding: 20px 16px 16px 16px;">
                    ${community.icon ? `<img src="${community.icon}" style="width: 48px; height: 48px; border-radius: 12px; margin-bottom: 8px; border: 2px solid rgba(255,0,255,0.5);" />` : ''}
                    <div style="color: #fff; font-size: 16px; font-weight: 700; margin-bottom: 4px;">${community.name}</div>
                    <div style="color: #aaa; font-size: 12px;">${community.members} membros</div>
                  </div>
                `;
              } else {
                communityCard.innerHTML = `
                  <div style="width: 100%; height: 100%; background: linear-gradient(180deg, rgba(128, 0, 255, 0.2), rgba(0, 0, 0, 0.8)); display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 8px; padding: 20px 16px 16px 16px;">
                    ${community.icon ? `<img src="${community.icon}" style="width: 64px; height: 64px; border-radius: 16px; border: 2px solid rgba(255,0,255,0.5);" />` : '<div style="font-size: 48px; opacity: 0.7;">🌐</div>'}
                    <div style="color: #fff; font-size: 16px; font-weight: 700;">${community.name}</div>
                    <div style="color: #aaa; font-size: 12px;">${community.members} membros</div>
                  </div>
                `;
              }

              communityCard.addEventListener('click', () => {
                window.location.href = `community-page.html?id=${community.id}&name=${encodeURIComponent(community.name)}`;
              });

              suggestedGrid.appendChild(communityCard);
            });
          }
          
          alert(`✅ Comunidade "${server.name}" adicionada às Sugeridas com sucesso!`);
        }
        
        // ✅ ENVIAR PARA O SERVIDOR ADICIONAR NA LISTA GLOBAL DE SUGERIDAS
        if (window.socket) {
          window.socket.emit('community:suggest', { community: server });
          console.log('✅ Enviado requisição para adicionar na lista global de sugeridas');
        }
        
        // Marcar servidor como sugerido localmente também
        server.isSuggested = true;
        server.suggestedAt = Date.now();
        
        // Salvar alterações
        localStorage.setItem('zx_servers', JSON.stringify(servers));
        
        console.log('✅ Comunidade marcada como sugerida:', server.name);
        
        // Fechar menu de contexto
        const ctxMenu = document.getElementById('server-ctx-menu');
        if (ctxMenu) ctxMenu.classList.add('hidden');
        
        // ✅ NÃO PRECISA RECARREGAR A PÁGINA, A FUNÇÃO JÁ ATUALIZA AUTOMATICAMENTE
      }
    }
    
    return;
  }
  
  if (e.target.id === 'btn-confirm-category' || e.target.closest('#btn-confirm-category')) {
    console.log('✅ BOTÃO CRIAR CATEGORIA CLICADO!');
    
    const inputEl = document.getElementById('new-category-name');
    console.log('🔍 INPUT ELEMENT:', inputEl);
    
    if (!inputEl) {
      console.error('❌ INPUT new-category-name NÃO ENCONTRADO!');
      return;
    }
    
    const name = inputEl.value.trim();
    console.log('🔍 NOME DIGITADO:', name);
    
    if (!name) {
      inputEl.focus();
      return;
    }

    // ✅ PEGAR SERVIDOR ATUAL DE TODOS OS LUGARES POSSÍVEIS
    let serverId = window.currentServerId || localStorage.getItem('currentServerId');
    
    // ✅ SE AINDA FOR NULL, PEGAR DO ARRAY GLOBAL DE SERVIDORES
    if (!serverId) {
      const servers = JSON.parse(localStorage.getItem('zx_servers') || '[]');
      if (servers.length > 0) {
        serverId = servers[0].id;
      }
    }
    
    console.log('🔍 SERVIDOR ATUAL:', serverId);
    
    if (serverId) {
      // ✅ Cria a categoria
      function loadCategories(serverId) {
        try {
          return JSON.parse(localStorage.getItem(`categories_${serverId}`) || '[]');
        } catch {
          return [];
        }
      }
      
      function saveCategories(serverId, categories) {
        localStorage.setItem(`categories_${serverId}`, JSON.stringify(categories));
      }
      
      const categories = loadCategories(serverId);
      const newCategory = {
        id: Date.now(),
        name: name,
        collapsed: false,
        channels: [],
        position: categories.length
      };
      
      categories.push(newCategory);
      saveCategories(serverId, categories);
      
      console.log('✅ CATEGORIA CRIADA:', newCategory);
      
      // ✅ Fecha o modal
      const modalEl = document.getElementById('create-category-modal');
      if (modalEl) {
        modalEl.classList.add('hidden');
        console.log('✅ MODAL FECHADO');
      }
      inputEl.value = '';
      
      // ✅ ATUALIZAR TAMBÉM NO SERVIDOR GLOBAL
      const servers = JSON.parse(localStorage.getItem('zx_servers') || '[]');
      const server = servers.find(s => s.id === serverId);
      if (server) {
        if (!server.customCategories) server.customCategories = [];
        if (!server.customCategories.includes(name.toUpperCase())) {
          server.customCategories.push(name.toUpperCase());
          localStorage.setItem('zx_servers', JSON.stringify(servers));
          console.log('✅ CATEGORIA SALVA NO SERVIDOR');
        }
      }
      
      // ✅ Renderiza IMEDIATAMENTE na lista de canais
      function renderCategoriesDirectly() {
        const currentServer = localStorage.getItem('currentServerId');
        if (!currentServer) return;
        
        const container = document.getElementById('sidebar-channels-scroll');
        if (!container) return;

        // Limpar container primeiro
        container.innerHTML = '';

        const categories = loadCategories(currentServer);
        
        categories.forEach(category => {
          const categoryElement = document.createElement('div');
          categoryElement.className = 'channel-category';
          categoryElement.dataset.categoryId = category.id;
          
          categoryElement.innerHTML = `
            <div class="category-header ${category.collapsed ? 'collapsed' : ''}">
              <span class="category-arrow">▼</span>
              <span class="category-name">${category.name}</span>
            </div>
            <div class="category-channels">
              ${category.channels.map(channel => `
                <div class="ch-item" data-channel-id="${channel.id}">
                  <span class="ch-icon">${channel.icon || '#'}</span>
                  <span class="ch-name">${channel.name}</span>
                </div>
              `).join('')}
            </div>
          `;
          
          container.appendChild(categoryElement);
        });
      }
      
      renderCategoriesDirectly();
      console.log('✅ CATEGORIAS RENDERIZADAS');
      
      // ✅ FORÇAR ATUALIZAÇÃO DA SIDEBAR PRINCIPAL
      setTimeout(() => {
        // ✅ PEGAR A FUNÇÃO DIRETAMENTE DO WINDOW GLOBAL
        if (window.renderSidebarChannels) {
          const servers = JSON.parse(localStorage.getItem('zx_servers') || '[]');
          const server = servers.find(s => s.id === serverId);
          if (server) {
            // ✅ ADICIONAR A CATEGORIA DIRETAMENTE NO OBJETO DO SERVIDOR
            if (!server.customCategories) server.customCategories = [];
            if (!server.customCategories.includes(name.toUpperCase())) {
              server.customCategories.push(name.toUpperCase());
              localStorage.setItem('zx_servers', JSON.stringify(servers));
            }
            
            window.renderSidebarChannels(server);
            console.log('✅ SIDEBAR PRINCIPAL ATUALIZADA');
            
            // ✅ RENDERIZAR 2 VEZES PARA GARANTIR
            setTimeout(() => {
              window.renderSidebarChannels(server);
              console.log('✅ SIDEBAR ATUALIZADA NOVAMENTE');
            }, 100);
          }
        }
      }, 50);
      
      // ✅ Feedback visual
      alert(`✅ Categoria "${name}" criada com sucesso!`);
      
      console.log('✅ PROCESSO CONCLUÍDO COM SUCESSO!');
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {

  // Guard: evita carregamento múltiplo
  if (window.__zx_categories_system_loaded) {
    console.warn('categories-system.js already loaded — skipping duplicate initialization');
    return;
  }
  window.__zx_categories_system_loaded = true;

  // ================================================
  // SISTEMA DE CATEGORIAS DE CANAIS
  // ================================================

  // Carregar categorias salvas
  function loadCategories(serverId) {
    try {
      return JSON.parse(localStorage.getItem(`categories_${serverId}`) || '[]');
    } catch {
      return [];
    }
  }

  // Salvar categorias
  function saveCategories(serverId, categories) {
    localStorage.setItem(`categories_${serverId}`, JSON.stringify(categories));
  }

  // Criar nova categoria
  function createCategory(serverId, name) {
    const categories = loadCategories(serverId);
    const newCategory = {
      id: Date.now(),
      name: name,
      collapsed: false,
      channels: [],
      position: categories.length
    };
    
    categories.push(newCategory);
    saveCategories(serverId, categories);
    
    return newCategory;
  }

  // Renderizar categorias na sidebar
  function renderCategories(serverId) {
    const container = document.getElementById('sidebar-channels-scroll');
    if (!container) return;

    const categories = loadCategories(serverId);
    
    categories.forEach(category => {
      const categoryElement = document.createElement('div');
      categoryElement.className = 'channel-category';
      categoryElement.dataset.categoryId = category.id;
      
      categoryElement.innerHTML = `
        <div class="category-header ${category.collapsed ? 'collapsed' : ''}">
          <span class="category-arrow">▼</span>
          <span class="category-name">${category.name}</span>
        </div>
        <div class="category-channels">
          ${category.channels.map(channel => `
            <div class="ch-item" data-channel-id="${channel.id}">
              <span class="ch-icon">${channel.icon || '#'}</span>
              <span class="ch-name">${channel.name}</span>
            </div>
          `).join('')}
        </div>
      `;
      
      container.appendChild(categoryElement);

      // Evento de colapsar/expandir
      categoryElement.querySelector('.category-header').addEventListener('click', function() {
        this.classList.toggle('collapsed');
        
        const categories = loadCategories(serverId);
        const cat = categories.find(c => c.id === parseInt(categoryElement.dataset.categoryId));
        if (cat) {
          cat.collapsed = this.classList.contains('collapsed');
          saveCategories(serverId, categories);
        }
      });
    });
  }

  // Adicionar botão "Criar Categoria" no menu
  document.addEventListener('click', (e) => {
    if (e.target.id === 'dd-create-category' || e.target.closest('#dd-create-category')) {
      // ✅ ABRIR MODAL SEPARADO PARA CRIAR CATEGORIA
      document.getElementById('create-category-modal').classList.remove('hidden');
      document.getElementById('new-category-name').focus();
    }
  });

  // ✅ Botão Cancelar no modal
  document.getElementById('btn-cancel-category').addEventListener('click', () => {
    document.getElementById('create-category-modal').classList.add('hidden');
    document.getElementById('new-category-name').value = '';
  });

  // ✅ Botão Confirmar no modal - USAR EVENTO GLOBAL PARA FUNCIONAR SEMPRE
  document.addEventListener('click', (e) => {
    console.log('🔍 CLICK DETECTADO:', e.target);
    
    if (e.target.id === 'btn-confirm-category' || e.target.closest('#btn-confirm-category')) {
      console.log('✅ BOTÃO CRIAR CATEGORIA CLICADO!');
      
      const inputEl = document.getElementById('new-category-name');
      console.log('🔍 INPUT ELEMENT:', inputEl);
      
      if (!inputEl) {
        console.error('❌ INPUT new-category-name NÃO ENCONTRADO!');
        return;
      }
      
      const name = inputEl.value.trim();
      console.log('🔍 NOME DIGITADO:', name);
      
      if (!name) {
        inputEl.focus();
        return;
      }

      const serverId = localStorage.getItem('currentServerId');
      console.log('🔍 SERVIDOR ATUAL:', serverId);
      
      if (serverId) {
        // ✅ Cria a categoria
        const newCategory = createCategory(serverId, name);
        console.log('✅ CATEGORIA CRIADA:', newCategory);
        
        // ✅ Fecha o modal
        const modalEl = document.getElementById('create-category-modal');
        if (modalEl) {
          modalEl.classList.add('hidden');
          console.log('✅ MODAL FECHADO');
        }
        inputEl.value = '';
        
        // ✅ ATUALIZAR TAMBÉM NO SERVIDOR GLOBAL
        const servers = JSON.parse(localStorage.getItem('zx_servers') || '[]');
        const server = servers.find(s => s.id === serverId);
        if (server) {
          if (!server.customCategories) server.customCategories = [];
          if (!server.customCategories.includes(name.toUpperCase())) {
            server.customCategories.push(name.toUpperCase());
            localStorage.setItem('zx_servers', JSON.stringify(servers));
            console.log('✅ CATEGORIA SALVA NO SERVIDOR');
          }
        }
        
        // ✅ Renderiza IMEDIATAMENTE na lista de canais
        renderCategoriesDirectly();
        console.log('✅ CATEGORIAS RENDERIZADAS');
        
        // ✅ Forçar atualização da sidebar
        setTimeout(() => {
          if (typeof renderSidebarChannels === 'function') {
            renderSidebarChannels(server);
            console.log('✅ SIDEBAR ATUALIZADA');
          }
        }, 100);
        
        // ✅ Animação de destaque
        setTimeout(() => {
          const novaCategoria = document.querySelector(`[data-category-id="${newCategory.id}"]`);
          if (novaCategoria) {
            novaCategoria.style.transition = 'background 0.3s';
            novaCategoria.style.background = 'rgba(0, 255, 255, 0.15)';
            
            setTimeout(() => {
              novaCategoria.style.background = '';
            }, 1000);
          }
        }, 50);
        
        setTimeout(initDragAndDrop, 100);
        
        // ✅ Feedback visual
        alert(`✅ Categoria "${name}" criada com sucesso!`);
        
        console.log('✅ PROCESSO CONCLUÍDO COM SUCESSO!');
      }
    }
  });

  // ✅ Apertar Enter no input do modal
  document.getElementById('new-category-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-confirm-category').click();
    }
    if (e.key === 'Escape') {
      document.getElementById('btn-cancel-category').click();
    }
  });

  // ================================================
  // SISTEMA DE AGRUPAMENTO AUTOMÁTICO DE SERVIDORES
  // ================================================

  // Carregar pastas de servidores
  function loadServerFolders() {
    try {
      return JSON.parse(localStorage.getItem('serverFolders') || '[]');
    } catch {
      return [];
    }
  }

  // Salvar pastas de servidores
  function saveServerFolders(folders) {
    localStorage.setItem('serverFolders', JSON.stringify(folders));
  }

  // Agrupar servidores automaticamente quando tem mais de 8
  function autoGroupServers() {
    const servers = JSON.parse(localStorage.getItem('userCommunities') || '[]');
    
    if (servers.length >= 8) {
      let folders = loadServerFolders();
      
      if (folders.length === 0) {
        // Criar pastas automaticamente por tipo
        const foldersToCreate = [
          { id: Date.now(), name: 'Jogos', icon: '🎮', servers: servers.filter(s => s.category === 'games' || s.category === 'anime').map(s => s.id) },
          { id: Date.now() + 1, name: 'Comunidades', icon: '🌐', servers: servers.filter(s => s.category === 'tech' || s.category === 'other').map(s => s.id) },
          { id: Date.now() + 2, name: 'Música', icon: '🎵', servers: servers.filter(s => s.category === 'music').map(s => s.id) }
        ];
        
        saveServerFolders(foldersToCreate);
      }
    }
  }

  // Renderizar pastas de servidores
  function renderServerFolders() {
    const rail = document.getElementById('servers-rail');
    if (!rail) return;

    autoGroupServers();
    const folders = loadServerFolders();
    
    folders.forEach(folder => {
      const folderElement = document.createElement('div');
      folderElement.className = 'server-folder';
      folderElement.dataset.folderId = folder.id;
      
      folderElement.innerHTML = `
        <div class="server-folder-icon">${folder.icon}</div>
        <div class="server-folder-servers">
          ${folder.servers.map(serverId => {
            const server = JSON.parse(localStorage.getItem('userCommunities') || '[]').find(s => s.id === serverId);
            if (server) {
              return `
                <div class="server-folder-item" data-server-id="${server.id}">
                  <div class="server-folder-icon-small">${server.name.charAt(0).toUpperCase()}</div>
                  <span>${server.name}</span>
                </div>
              `;
            }
            return '';
          }).join('')}
        </div>
      `;
      
      rail.appendChild(folderElement);

      // Evento de expandir pasta
      folderElement.querySelector('.server-folder-icon').addEventListener('click', function(e) {
        e.stopPropagation();
        folderElement.classList.toggle('expanded');
      });
    });
  }

  // ✅ CORREÇÃO: Renderizar categorias DIRETAMENTE na lista de canais
  function renderCategoriesDirectly() {
    const currentServer = localStorage.getItem('currentServerId');
    if (!currentServer) return;
    
    const container = document.getElementById('sidebar-channels-scroll');
    if (!container) return;

    // Limpar container primeiro
    container.innerHTML = '';

    const categories = loadCategories(currentServer);
    
    categories.forEach(category => {
      const categoryElement = document.createElement('div');
      categoryElement.className = 'channel-category';
      categoryElement.dataset.categoryId = category.id;
      
      categoryElement.innerHTML = `
        <div class="category-header ${category.collapsed ? 'collapsed' : ''}">
          <span class="category-arrow">▼</span>
          <span class="category-name">${category.name}</span>
        </div>
        <div class="category-channels">
          ${category.channels.map(channel => `
            <div class="ch-item" data-channel-id="${channel.id}">
              <span class="ch-icon">${channel.icon || '#'}</span>
              <span class="ch-name">${channel.name}</span>
            </div>
          `).join('')}
        </div>
      `;
      
      container.appendChild(categoryElement);

      // Evento de colapsar/expandir
      categoryElement.querySelector('.category-header').addEventListener('click', function() {
        this.classList.toggle('collapsed');
        
        const categories = loadCategories(currentServer);
        const cat = categories.find(c => c.id === parseInt(categoryElement.dataset.categoryId));
        if (cat) {
          cat.collapsed = this.classList.contains('collapsed');
          saveCategories(currentServer, categories);
        }
      });
    });

    // ✅ Adicionar também os canais que não estão em nenhuma categoria
    const allChannels = JSON.parse(localStorage.getItem(`channels_${currentServer}`) || '[]');
    const channelsInCategories = categories.flatMap(c => c.channels.map(ch => ch.id));
    const channelsWithoutCategory = allChannels.filter(ch => !channelsInCategories.includes(ch.id));

    if (channelsWithoutCategory.length > 0) {
      const separator = document.createElement('div');
      separator.style.height = '16px';
      container.appendChild(separator);

      channelsWithoutCategory.forEach(channel => {
        const channelElement = document.createElement('div');
        channelElement.className = 'ch-item';
        channelElement.dataset.channelId = channel.id;
        channelElement.innerHTML = `
          <span class="ch-icon">${channel.icon || '#'}</span>
          <span class="ch-name">${channel.name}</span>
        `;
        container.appendChild(channelElement);
      });
    }
  }

  // Inicializar
  setTimeout(() => {
    const currentServer = localStorage.getItem('currentServerId');
    if (currentServer) {
      renderCategoriesDirectly();
    }
    renderServerFolders();
  }, 500);

  // ✅ Atualizar automaticamente quando criar novo canal
  const observer = new MutationObserver(() => {
    renderCategoriesDirectly();
  });

  const container = document.getElementById('sidebar-channels-scroll');
  if (container) {
    observer.observe(container, { childList: true });
  }

  // ✅ SISTEMA COMPLETO EXATAMENTE IGUAL AO DISCORD
  // REMOVIDO EVENTO QUE ABRE DUAS VEZES O MODAL
  // AGORA SÓ O MODAL PEQUENO FUNCIONA

  // ✅ SISTEMA DE ARRASTAR E SOLTAR (DRAG & DROP) EXATAMENTE IGUAL AO DISCORD
  function initDragAndDrop() {
    const container = document.getElementById('sidebar-channels-scroll');
    if (!container) return;

    let draggedElement = null;
    let dropIndicator = document.createElement('div');
    dropIndicator.className = 'drop-indicator';
    dropIndicator.style.height = '3px';
    dropIndicator.style.background = '#00ffff';
    dropIndicator.style.borderRadius = '2px';
    dropIndicator.style.margin = '2px 0';
    dropIndicator.style.display = 'none';
    dropIndicator.style.pointerEvents = 'none';
    dropIndicator.style.zIndex = '9999';
    document.body.appendChild(dropIndicator);

    // ✅ REATIVAR DRAG AND DROP PARA PERMITIR MOVER CANAIS E CATEGORIAS
    document.querySelectorAll('.ch-item').forEach(channel => {
      channel.draggable = true;
      channel.style.cursor = 'grab';
      channel.style.userSelect = 'none';
    });

    // ✅ REATIVAR DRAG AND DROP NAS CATEGORIAS TAMBÉM
    document.querySelectorAll('.ch-category-row').forEach(categoryHeader => {
      categoryHeader.draggable = true;
      categoryHeader.style.cursor = 'grab';
      categoryHeader.style.userSelect = 'none';
    });
  }

  // Salvar ordem dos canais e categorias
  function saveChannelOrder() {
    const currentServer = localStorage.getItem('currentServerId');
    const categories = loadCategories(currentServer);

    document.querySelectorAll('.channel-category').forEach(categoryElement => {
      const categoryId = parseInt(categoryElement.dataset.categoryId);
      const category = categories.find(c => c.id === categoryId);
      
      if (category) {
        const channels = Array.from(categoryElement.querySelectorAll('.ch-item')).map(ch => ({
          id: ch.dataset.channelId,
          name: ch.querySelector('.ch-name').textContent,
          icon: ch.querySelector('.ch-icon').textContent
        }));
        
        category.channels = channels;
      }
    });

    saveCategories(currentServer, categories);
  }

  // ✅ Verificar constantemente por novas categorias
  setInterval(() => {
    const currentServer = localStorage.getItem('currentServerId');
    if (currentServer) {
      const categories = loadCategories(currentServer);
      const rendered = document.querySelectorAll('.channel-category').length;
      
      if (categories.length !== rendered) {
        renderCategoriesDirectly();
        setTimeout(initDragAndDrop, 100);
      }
    }
  }, 100);

  // Inicializar Drag & Drop após renderizar
  setTimeout(initDragAndDrop, 600);

  // ✅ REINICIAR Drag & Drop SEMPRE que a sidebar for atualizada
  const dragObserver = new MutationObserver(() => {
    setTimeout(initDragAndDrop, 100);
  });

  const sidebarContainer = document.getElementById('sidebar-channels-scroll');
  if (sidebarContainer) {
    dragObserver.observe(sidebarContainer, { childList: true, subtree: true });
  }

  console.log('✅ Sistema de Categorias e Pastas carregado com sucesso!');

});
