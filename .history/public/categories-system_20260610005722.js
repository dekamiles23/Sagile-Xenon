// ================================================
// SISTEMA DE CATEGORIAS DE CANAIS E PASTAS DE SERVIDORES
// ================================================

// ✅ EVENTO GLOBAL FORA DO DOMContentLoaded PARA FUNCIONAR SEMPRE
document.addEventListener('click', (e) => {
  console.log('🔍 CLICK DETECTADO GLOBAL:', e.target);
  
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

    // ✅ TORNAR TODOS OS CANAIS ARRASTÁVEIS
    document.querySelectorAll('.ch-item').forEach(channel => {
      channel.draggable = true;
      channel.style.userSelect = 'none';
      channel.style.cursor = 'grab';

      channel.addEventListener('dragstart', (e) => {
        draggedElement = channel;
        channel.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', channel.dataset.channelId);
        e.dataTransfer.setDragImage(channel, 20, 20);
      });

      channel.addEventListener('dragend', () => {
        channel.style.opacity = '1';
        dropIndicator.style.display = 'none';
        draggedElement = null;
      });

      channel.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const rect = channel.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        dropIndicator.style.position = 'absolute';
        dropIndicator.style.left = rect.left + 'px';
        dropIndicator.style.width = rect.width + 'px';
        dropIndicator.style.top = (e.clientY < midY ? rect.top : rect.bottom) + 'px';
        dropIndicator.style.display = 'block';
      });

      channel.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!draggedElement || draggedElement === channel) return;

        const rect = channel.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        if (e.clientY < midY) {
          channel.parentNode.insertBefore(draggedElement, channel);
        } else {
          channel.parentNode.insertBefore(draggedElement, channel.nextSibling);
        }

        saveChannelOrder();
        dropIndicator.style.display = 'none';
      });
    });

    // ✅ PERMITIR SOLTAR DENTRO DAS CATEGORIAS
    document.querySelectorAll('.category-channels').forEach(categoryContainer => {
      categoryContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (categoryContainer.children.length === 0) {
          const rect = categoryContainer.getBoundingClientRect();
          dropIndicator.style.position = 'absolute';
          dropIndicator.style.left = rect.left + 'px';
          dropIndicator.style.width = rect.width + 'px';
          dropIndicator.style.top = rect.top + 10 + 'px';
          dropIndicator.style.display = 'block';
        }
      });

      categoryContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (draggedElement && draggedElement.classList.contains('ch-item')) {
          categoryContainer.appendChild(draggedElement);
          saveChannelOrder();
        }
        dropIndicator.style.display = 'none';
      });
    });

    // ✅ PERMITIR MOVER CATEGORIAS INTEIRAS
    document.querySelectorAll('.ch-category-row').forEach(categoryHeader => {
      // ✅ DONO/STAFF PODE ARRASTAR EM TODA A BARRA DA CATEGORIA
      categoryHeader.draggable = true;
      categoryHeader.style.cursor = 'grab';
      categoryHeader.style.userSelect = 'none';

      categoryHeader.addEventListener('dragstart', (e) => {
        draggedElement = categoryHeader;
        categoryHeader.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'category');
        e.dataTransfer.setDragImage(categoryHeader, 20, 10);
      });

      categoryHeader.addEventListener('dragend', () => {
        categoryHeader.style.opacity = '1';
        categoryHeader.style.cursor = 'grab';
        dropIndicator.style.display = 'none';
        draggedElement = null;
      });

      categoryHeader.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const rect = categoryHeader.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        dropIndicator.style.position = 'absolute';
        dropIndicator.style.left = rect.left + 'px';
        dropIndicator.style.width = rect.width + 'px';
        dropIndicator.style.top = (e.clientY < midY ? rect.top : rect.bottom) + 'px';
        dropIndicator.style.display = 'block';
      });

      categoryHeader.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!draggedElement) return;

        const isCategory = draggedElement.classList.contains('ch-category-row');
        const isChannel = draggedElement.classList.contains('ch-item');

        if (draggedElement === categoryHeader) return;

        const rect = categoryHeader.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        if (isCategory) {
          const categoryToMove = draggedElement;
          const channelsContainer = categoryToMove.nextElementSibling;

          if (e.clientY < midY) {
            sidebarChannels.insertBefore(channelsContainer, categoryHeader);
            sidebarChannels.insertBefore(categoryToMove, channelsContainer);
          } else {
            sidebarChannels.insertBefore(categoryToMove, categoryHeader.nextSibling);
            sidebarChannels.insertBefore(channelsContainer, categoryToMove.nextSibling);
          }
        }

        if (isChannel) {
          const channelsContainer = categoryHeader.nextElementSibling;
          if (channelsContainer && channelsContainer.classList.contains('category-channels')) {
            channelsContainer.appendChild(draggedElement);
          }
        }

        saveChannelOrder();
        dropIndicator.style.display = 'none';
      });
    });

    // ✅ EVENTO GLOBAL PARA ESCONDER INDICADOR
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('dragend', () => {
      dropIndicator.style.display = 'none';
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

  console.log('✅ Sistema de Categorias e Pastas carregado com sucesso!');

});