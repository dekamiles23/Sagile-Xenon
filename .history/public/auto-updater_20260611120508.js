// ================================================
// SISTEMA DE ATUALIZAÇÃO AUTOMÁTICA GITHUB
// Verifica novas versões e avisa o usuário
// ================================================

const AutoUpdater = {
  currentVersion: null,
  latestVersion: null,
  updateAvailable: false,
  checkInterval: 5 * 1000, // 5 segundos
  githubRepo: 'dekamiles23/Sagile-Xenon',
  
  async checkForUpdates() {
    try {
      const response = await fetch(`https://api.github.com/repos/${this.githubRepo}/releases/latest`, {
        cache: 'no-cache',
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      
      if (!response.ok) return false;
      
      const release = await response.json();
      this.latestVersion = release.tag_name?.replace(/v/gi, '') || release.name;
      
      // Comparar versões
      this.updateAvailable = this.compareVersions(this.latestVersion, this.currentVersion) > 0;
      
      if (this.updateAvailable) {
        this.showUpdateNotification(release);
        return true;
      }
      
      return false;
    } catch (e) {
      console.log('[AutoUpdater] Não foi possível verificar atualizações:', e.message);
      return false;
    }
  },
  
  compareVersions(v1, v2) {
    const v1Parts = v1.split('.').map(Number);
    const v2Parts = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const a = v1Parts[i] || 0;
      const b = v2Parts[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  },
  
  showUpdateNotification(release) {
    // Criar banner de atualização
    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = `
      <div class="update-banner-content">
        <span class="update-icon">🔄</span>
        <div class="update-info">
          <div class="update-title">NOVA VERSÃO DISPONÍVEL!</div>
          <div class="update-version">Versão ${this.latestVersion} • Você está na ${this.currentVersion}</div>
        </div>
        <button class="update-btn" onclick="AutoUpdater.openDownloadPage()">BAIXAR ATUALIZAÇÃO</button>
        <button class="update-close-btn" onclick="AutoUpdater.closeBanner()">✕</button>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      #update-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(90deg, #7c3aed, #5865f2);
        color: white;
        z-index: 999999;
        padding: 10px 16px;
        box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
        animation: slideDown 0.3s ease-out;
      }
      
      .update-banner-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .update-icon {
        font-size: 22px;
        animation: pulse 1.5s infinite;
      }
      
      .update-info {
        flex: 1;
      }
      
      .update-title {
        font-weight: 700;
        font-size: 14px;
      }
      
      .update-version {
        font-size: 12px;
        opacity: 0.9;
      }
      
      .update-btn {
        background: white;
        color: #5865f2;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .update-btn:hover {
        transform: scale(1.05);
      }
      
      .update-close-btn {
        background: transparent;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        opacity: 0.8;
      }
      
      .update-close-btn:hover {
        opacity: 1;
      }
      
      @keyframes slideDown {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(banner);
    
    showToast(`🔄 Nova versão ${this.latestVersion} disponível!`);
  },
  
  openDownloadPage() {
    window.open(`https://github.com/${this.githubRepo}/releases/latest`, '_blank');
  },
  
  closeBanner() {
    const banner = document.getElementById('update-banner');
    if (banner) banner.remove();
  },
  
  async init() {
    // Carregar versão real do package.json
    try {
      const response = await fetch('/package.json');
      if (response.ok) {
        const pkg = await response.json();
        this.currentVersion = pkg.version;
      } else {
        // Fallback caso não consiga carregar
        this.currentVersion = '1.0.0';
      }
    } catch (e) {
      this.currentVersion = '1.0.0';
    }

    // Verificar na inicialização
    setTimeout(() => this.checkForUpdates(), 5000);
    
    // Verificar periodicamente
    setInterval(() => this.checkForUpdates(), this.checkInterval);
    
    console.log(`✅ AutoUpdater inicializado. Versão atual: ${this.currentVersion}`);
  }
};

// Inicializar quando o documento carregar
document.addEventListener('DOMContentLoaded', () => {
  AutoUpdater.init();
});

window.AutoUpdater = AutoUpdater;