// ================================================
// SELETOR DE GIFS MODERNO - TENOR API
// ================================================

class GifPicker {
  constructor() {
    this.apiKey = 'LIVDSRZULELA';
    this.isOpen = false;
    this.currentCategory = 'trending';
    this.nextPos = 0;
    this.isLoading = false;
    this.hasMore = true;
    this.container = null;
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.createContainer();
    this.loadGifs('trending');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.container) {
      this.container.classList.add('closing');
      setTimeout(() => {
        this.container?.remove();
        this.container = null;
      }, 200);
    }
    document.removeEventListener('click', this.outsideClickListener);
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'gif-picker-modern';
    this.container.innerHTML = `
      <div class="gif-picker-header">
        <input type="text" class="gif-search-input" placeholder="🔍 Buscar GIFs..." autocomplete="off" />
      </div>
      
      <div class="gif-categories">
        <button class="gif-cat-btn active" data-cat="trending">🔥 Trending</button>
        <button class="gif-cat-btn" data-cat="reactions">😆 Reações</button>
        <button class="gif-cat-btn" data-cat="games">🎮 Games</button>
        <button class="gif-cat-btn" data-cat="memes">😂 Memes</button>
        <button class="gif-cat-btn" data-cat="anime">🎌 Anime</button>
        <button class="gif-cat-btn" data-cat="movies">🎬 Filmes</button>
      </div>

      <div class="gif-grid-container">
        <div class="gif-loading" id="gif-loading">Carregando GIFs...</div>
        <div class="gif-grid" id="gif-grid"></div>
        <div class="gif-end" id="gif-end" style="display:none">✓ Todos os GIFs carregados</div>
      </div>
    `;

    const btnGif = document.getElementById('btn-gif');
    const rect = btnGif.getBoundingClientRect();
    
    this.container.style.right = Math.max(10, window.innerWidth - rect.right - 150) + 'px';
    this.container.style.bottom = (window.innerHeight - rect.top + 12) + 'px';
    
    document.body.appendChild(this.container);

    // Eventos
    this.container.querySelector('.gif-search-input').addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => this.searchGifs(e.target.value), 400);
    });

    this.container.querySelectorAll('.gif-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.gif-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCategory = btn.dataset.cat;
        this.loadGifs(btn.dataset.cat);
      });
    });

    const gridContainer = this.container.querySelector('.gif-grid-container');
    gridContainer.addEventListener('scroll', () => {
      if (gridContainer.scrollTop + gridContainer.clientHeight >= gridContainer.scrollHeight - 100) {
        this.loadMore();
      }
    });

    // Fechar ao clicar fora
    this.outsideClickListener = (e) => {
      if (!e.target.closest('.gif-picker-modern') && !e.target.closest('#btn-gif')) {
        this.close();
      }
    };
    setTimeout(() => document.addEventListener('click', this.outsideClickListener), 10);

    // Focar no campo de busca
    setTimeout(() => this.container.querySelector('.gif-search-input').focus(), 100);
  }

  async loadGifs(query) {
    if (this.isLoading) return;
    this.isLoading = true;
    this.nextPos = 0;
    this.hasMore = true;

    const grid = this.container.querySelector('#gif-grid');
    const loading = this.container.querySelector('#gif-loading');
    const end = this.container.querySelector('#gif-end');

    grid.innerHTML = '';
    loading.style.display = 'block';
    end.style.display = 'none';

    try {
      const url = `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${this.apiKey}&limit=24&media_filter=minimal&pos=${this.nextPos}`;
      const res = await fetch(url);
      const data = await res.json();

      loading.style.display = 'none';
      this.nextPos = data.next || 0;
      this.hasMore = data.results && data.results.length > 0;

      this.renderGifs(data.results || []);

    } catch {
      loading.textContent = '❌ Erro ao carregar GIFs';
    }

    this.isLoading = false;
  }

  async loadMore() {
    if (this.isLoading || !this.hasMore) return;
    this.isLoading = true;

    try {
      const url = `https://g.tenor.com/v1/search?q=${encodeURIComponent(this.currentCategory)}&key=${this.apiKey}&limit=24&media_filter=minimal&pos=${this.nextPos}`;
      const res = await fetch(url);
      const data = await res.json();

      this.nextPos = data.next || 0;
      this.hasMore = data.results && data.results.length > 0;
      this.renderGifs(data.results || [], true);

      if (!this.hasMore) {
        this.container.querySelector('#gif-end').style.display = 'block';
      }

    } catch {}

    this.isLoading = false;
  }

  renderGifs(results, append = false) {
    const grid = this.container.querySelector('#gif-grid');
    if (!append) grid.innerHTML = '';

    results.forEach(gif => {
      const item = document.createElement('div');
      item.className = 'gif-item-modern';
      item.innerHTML = `<img src="${gif.media[0].tinygif.url}" loading="lazy" alt="GIF" />`;
      
      item.addEventListener('click', () => {
        socket.emit('message', {
          channel: currentChannel,
          type: 'gif',
          url: gif.media[0].gif.url,
          preview: gif.media[0].tinygif.url,
          communityId: currentServerId
        });
        this.close();
        showToast('✅ GIF enviado!');
      });

      grid.appendChild(item);
    });
  }

  async searchGifs(term) {
    if (!term.trim()) {
      this.loadGifs('trending');
      return;
    }
    this.currentCategory = term;
    this.loadGifs(term);
  }
}

// Instância global
window.gifPicker = new GifPicker();

// Substituir função antiga
window.openGifPicker = () => window.gifPicker.open();