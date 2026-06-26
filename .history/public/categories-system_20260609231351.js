// ================================================
// SISTEMA DE CATEGORIAS DE CANAIS E PASTAS DE SERVIDORES
// ================================================

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
      const name = prompt('Nome da categoria:');
      if (name && name.trim()) {
        const serverId = localStorage.getItem('currentServerId');
        if (serverId) {
          createCategory(serverId, name.trim());
          renderCategories(serverId);
        }
      }
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

  // ✅ CORREÇÃO: Atualizar automaticamente quando adicionar categoria pelo MODAL
  document.addEventListener('click', (e) => {
    if (e.target.textContent === 'Adicionar categoria' || e.target.closest('[onclick*="addCategory"]')) {
      setTimeout(() => {
        renderCategoriesDirectly();
      }, 100);
    }
  });

  // ✅ SISTEMA DE ARRASTAR E SOLTAR (DRAG & DROP) EXATAMENTE IGUAL AO DISCORD
  function initDragAndDrop() {
    const container = document.getElementById('sidebar-channels-scroll');
    if (!container) return;

    let draggedElement = null;
    let dropIndicator = document.createElement('div');
    dropIndicator.style.height = '3px';
    dropIndicator.style.background = '#00ffff';
    dropIndicator.style.borderRadius = '2px';
    dropIndicator.style.margin = '2px 0';
    dropIndicator.style.display = 'none';

    // Tornar todos os canais arrastáveis
    document.querySelectorAll('.ch-item').forEach(channel => {
      channel.draggable = true;

      channel.addEventListener('dragstart', (e) => {
        draggedElement = channel;
        channel.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
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

        if (e.clientY < midY) {
          channel.parentNode.insertBefore(dropIndicator, channel);
        } else {
          channel.parentNode.insertBefore(dropIndicator, channel.nextSibling);
        }

        dropIndicator.style.display = 'block';
      });

      channel.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedElement || draggedElement === channel) return;

        const rect = channel.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        if (e.clientY < midY) {
          channel.parentNode.insertBefore(draggedElement, channel);
        } else {
          channel.parentNode.insertBefore(draggedElement, channel.nextSibling);
        }

        saveChannelOrder();
      });
    });

    // Permitir soltar nas categorias
    document.querySelectorAll('.category-channels').forEach(categoryContainer => {
      categoryContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        categoryContainer.appendChild(dropIndicator);
        dropIndicator.style.display = 'block';
      });

      categoryContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedElement) {
          categoryContainer.appendChild(draggedElement);
          saveChannelOrder();
        }
      });
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