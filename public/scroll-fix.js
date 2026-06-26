// ✅ CORREÇÃO DEFINITIVA DE SCROLL E ELEMENTOS NÃO APARECENDO
(function() {
  console.log('🔧 Aplicando correções de scroll e visibilidade...');
  
  // ✅ 1. FORÇA TODOS OS ELEMENTOS A APARECEREM
  function forceElementsVisible() {
    // Elementos que podem estar ocultos
    const selectors = [
      '.posts-feed',
      '#discover-feed',
      '#shorts-container',
      '.discover-main',
      '.discover-right-panel',
      '#discover-right-content',
      '.online-sidebar',
      '.messages-area',
      '.voice-participants-grid'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Não interferir com elementos dentro do #dm-view (usa flex layout próprio)
        if (el && el.closest && el.closest('#dm-view')) return;
        if (el && el.id === 'dm-messages-area') return;
        if (el) {
          el.style.display = el.style.display === 'none' ? 'block' : el.style.display || 'block';
          el.style.visibility = 'visible';
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
          el.style.position = 'relative';
          el.classList.remove('hidden');
          
          // Se é container de scroll, força propriedades
          if (selector.includes('feed') || selector.includes('container')) {
            el.style.overflowY = 'auto';
            el.style.height = el.style.height || 'calc(100vh - 300px)';
          }
        }
      });
    });
  }
  
  // ✅ 2. CORRIGE SCROLL EM TODOS OS CONTAINERS
  function fixScrollContainers() {
    const scrollContainers = document.querySelectorAll(`
      .posts-feed,
      #discover-feed,
      #shorts-container,
      .discover-main,
      .messages-area,
      .voice-participants-grid,
      .emoji-grid-container,
      .gif-grid-container,
      .sticker-grid-container,
      .online-users-list,
      .activities-list
    `);
    
    scrollContainers.forEach(container => {
      // Não interferir com elementos dentro do #dm-view (usa flex layout próprio)
      if (container && container.closest && container.closest('#dm-view')) return;
      if (container && container.id === 'dm-messages-area') return;
      if (container) {
        // Remove qualquer CSS que possa estar bloqueando
        container.style.overflow = '';
        container.style.overflowY = 'auto';
        container.style.overflowX = 'hidden';
        container.style.height = container.style.height || 'auto';
        container.style.maxHeight = container.style.maxHeight || '100%';
        
        // Força scrollbar customizada
        container.style.scrollbarWidth = 'thin';
        container.style.scrollbarColor = '#00ffff rgba(0,0,0,0.2)';
        
        // Teste de scroll - adiciona conteúdo temporário se vazio
        if (container.children.length === 0 || container.scrollHeight <= container.clientHeight) {
          const testDiv = document.createElement('div');
          testDiv.style.height = '1000px';
          testDiv.style.opacity = '0.01';
          testDiv.style.pointerEvents = 'none';
          testDiv.className = 'scroll-test-element';
          container.appendChild(testDiv);
          
          // Remove após 100ms
          setTimeout(() => {
            if (testDiv.parentNode) {
              testDiv.remove();
            }
          }, 100);
        }
      }
    });
  }
  
  // ✅ 3. CORRIGE ALTURA DOS CONTAINERS PRINCIPAIS
  // NOTA: #dm-messages-area é excluído intencionalmente — usa flex layout
  // e altura fixa via JS quebraria o scroll do DM.
  function fixContainerHeights() {
    const containers = {
      '.discover-main': 'calc(100vh - 120px)',
      '.posts-feed': 'calc(100vh - 520px)',
      '#shorts-container': 'calc(100vh - 200px)',
      '.voice-participants-grid': 'calc(100vh - 160px)'
    };
    
    Object.entries(containers).forEach(([selector, height]) => {
      // Nunca aplicar em #dm-messages-area ou dentro do #dm-view
      const el = document.querySelector(selector);
      if (el && !el.closest('#dm-view') && el.id !== 'dm-messages-area') {
        el.style.height = height;
        el.style.minHeight = '300px';
        el.style.maxHeight = height;
      }
    });
  }
  
  // ✅ 4. REMOVE CLASSES E ESTILOS PROBLEMÁTICOS
  function removeProblematicStyles() {
    // Remove classes hidden de elementos importantes
    const importantSelectors = [
      '.discover-main',
      '.discover-right-panel',
      '#discover-right-content',
      '.posts-feed',
      '#shorts-container'
    ];
    
    importantSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.classList.remove('hidden');
        
        // Remove estilos inline problemáticos
        ['display: none', 'visibility: hidden', 'opacity: 0'].forEach(style => {
          if (el.style.cssText.includes(style)) {
            el.style.display = '';
            el.style.visibility = '';
            el.style.opacity = '';
          }
        });
      });
    });
  }
  
  // ✅ 5. APLICA CORREÇÕES IMEDIATAMENTE
  function applyFixes() {
    forceElementsVisible();
    fixScrollContainers();
    fixContainerHeights();
    removeProblematicStyles();
    
    console.log('✅ Correções de scroll aplicadas!');
  }
  
  // ✅ 6. EXECUTA AS CORREÇÕES
  // Imediatamente
  applyFixes();
  
  // Após DOM carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFixes);
  }
  
  // Após página carregar completamente
  window.addEventListener('load', applyFixes);
  
  // A cada 500ms por 5 segundos para garantir
  let attempts = 0;
  const fixInterval = setInterval(() => {
    attempts++;
    applyFixes();
    
    if (attempts >= 10) {
      clearInterval(fixInterval);
      console.log('✅ Correções finalizadas após 10 tentativas');
    }
  }, 500);
  
  // ✅ 7. OBSERVADOR DE MUTAÇÕES PARA ELEMENTOS DINÂMICOS
  const observer = new MutationObserver((mutations) => {
    let needsReset = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const isScrollContainer = node.matches && (
              node.matches('.posts-feed') ||
              node.matches('#discover-feed') ||
              node.matches('#shorts-container') ||
              node.matches('.messages-area')
            );
            
            if (isScrollContainer) {
              needsReset = true;
            }
          }
        });
      }
    });
    
    if (needsReset) {
      setTimeout(applyFixes, 100);
    }
  });
  
  // Inicia observação
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // ✅ 8. FORÇA SCROLL EM ELEMENTOS ESPECÍFICOS QUANDO CLICADOS
  document.addEventListener('click', (e) => {
    const scrollableParent = e.target.closest('.posts-feed, #discover-feed, #shorts-container, .messages-area');
    if (scrollableParent) {
      setTimeout(() => {
        scrollableParent.style.overflowY = 'auto';
      }, 10);
    }
  });
  
  console.log('✅ Sistema de correção de scroll carregado!');
})();