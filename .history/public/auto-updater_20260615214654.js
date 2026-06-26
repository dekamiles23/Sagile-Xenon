// ================================================
// SISTEMA DE ATUALIZAÇÃO AUTOMÁTICA GITHUB
// Verifica novas versões e avisa o usuário
// ================================================

const AutoUpdater = {
  currentVersion: null,
  latestVersion: null,
  updateAvailable: false,
 checkInterval: 5 * 1000,
  githubRepo: 'dekamiles23/Sagile-Xenon',

  showUpdateModal(message, type, data = null) {
    this.closeUpdateModal();

    let modalContent = '';

    switch (type) {
      case 'loading':
        modalContent = `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🔄</div>
            <div style="color: #fff; font-size: 18px; margin-bottom: 8px;">${message}</div>
            <div style="color: #888; font-size: 14px;">Buscando informações no GitHub...</div>
          </div>`;
        break;

      case 'update':
        modalContent = `
          <div style="padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="font-size: 48px; margin-bottom: 8px;">🎉</div>
              <div style="color: #00ff88; font-size: 20px; font-weight: bold;">Nova Atualização!</div>
            </div>
            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #888;">Versão atual:</span>
                <span style="color: #fff;">v${data.currentVersion}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #888;">Nova versão:</span>
                <span style="color: #00ff88; font-weight: bold;">v${data.latestVersion}</span>
              </div>
            </div>
            <div style="margin-bottom: 20px;">
              <div style="color: #00ffff; font-size: 14px; margin-bottom: 8px;">📝 Notas da atualização:</div>
              <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; color: #ddd; font-size: 13px; max-height: 200px; overflow-y: auto;">
                ${(data.notes || '').replace(/\n/g, '<br>')}
              </div>
            </div>
            <div style="display: flex; gap: 12px;">
              <button type="button" onclick="AutoUpdater.closeUpdateModal()" class="btn-ghost" style="flex: 1;">Agora não</button>
              <button type="button" onclick="window.open('${data.downloadUrl}', '_blank')" class="btn-neon" style="flex: 1;">⬇ Baixar Atualização</button>
            </div>
          </div>`;
        break;

      case 'latest':
        modalContent = `
          <div style="text-align: center; padding: 30px 20px;">
            <div style="font-size: 64px; margin-bottom: 16px;">📦</div>
            <div style="color: #00ff88; font-size: 18px; font-weight: bold; margin-bottom: 8px;">${message}</div>
            <div style="color: #888; font-size: 14px; margin-bottom: 20px;">Versão v${data.currentVersion}</div>
            <button type="button" onclick="AutoUpdater.closeUpdateModal()" class="btn-neon" style="padding: 10px 30px;">OK</button>
          </div>`;
        break;

      case 'error':
        modalContent = `
          <div style="text-align: center; padding: 30px 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <div style="color: #ff4444; font-size: 16px; margin-bottom: 8px;">${message}</div>
            <div style="color: #888; font-size: 13px; margin-bottom: 20px;">Verifique sua conexão com a internet</div>
            <button type="button" onclick="AutoUpdater.checkForUpdatesWithModal()" class="btn-neon" style="padding: 10px 30px;">Tentar novamente</button>
          </div>`;
        break;
    }

    const modalHTML = `
      <div id="update-modal" class="modal-overlay" style="display: flex; z-index: 9999999;">
        <div class="modal-modern" style="width: min(500px, 92vw);">
          <div class="mm-header">
            <span class="mm-title">🔄 Atualizações</span>
            <button type="button" class="mm-close" onclick="AutoUpdater.closeUpdateModal()">✕</button>
          </div>
          <div class="mm-body">${modalContent}</div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('update-modal');
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.closeUpdateModal();
    });
  },

  closeUpdateModal() {
    document.getElementById('update-modal')?.remove();
  },

  async checkForUpdatesWithModal() {
    this.showUpdateModal('🔄 Verificando atualizações...', 'loading');

    try {
      if (!this.currentVersion) {
        await this.loadCurrentVersion();
      }

      const response = await fetch(`https://api.github.com/repos/${this.githubRepo}/releases/latest`, {
        cache: 'no-cache',
        headers: { Accept: 'application/vnd.github.v3+json' }
      });

      if (!response.ok) {
        throw new Error('Não foi possível conectar ao GitHub');
      }

      const release = await response.json();
      this.latestVersion = release.tag_name?.replace(/^v/i, '') || release.name;
      const updateNotes = release.body || 'Sem notas de atualização.';
      const downloadUrl = release.html_url;
      this.updateAvailable = this.compareVersions(this.latestVersion, this.currentVersion) > 0;

      if (this.updateAvailable) {
        this.showUpdateNotification(release);
        this.showUpdateModal('✅ Nova versão disponível!', 'update', {
          currentVersion: this.currentVersion,
          latestVersion: this.latestVersion,
          notes: updateNotes,
          downloadUrl
        });
        return true;
      }

      this.showUpdateModal('📦 Você está usando a versão mais recente!', 'latest', {
        currentVersion: this.currentVersion
      });
      return false;
    } catch (e) {
      console.log('[AutoUpdater] Não foi possível verificar atualizações:', e.message);
      this.showUpdateModal(`❌ Erro ao verificar atualizações: ${e.message}`, 'error');
      return false;
    }
  },

  async checkForUpdates() {
    try {
      if (!this.currentVersion) {
        await this.loadCurrentVersion();
      }

      const response = await fetch(`https://api.github.com/repos/${this.githubRepo}/releases/latest`, {
        cache: 'no-cache',
        headers: { Accept: 'application/vnd.github.v3+json' }
      });

      if (!response.ok) return false;

      const release = await response.json();
      this.latestVersion = release.tag_name?.replace(/^v/i, '') || release.name;
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
    const v1Parts = String(v1).split('.').map(Number);
    const v2Parts = String(v2).split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const a = v1Parts[i] || 0;
      const b = v2Parts[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  },

  showUpdateNotification(release) {
    if (document.getElementById('update-banner')) return;

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
      </div>`;

    if (!document.getElementById('update-banner-styles')) {
      const style = document.createElement('style');
      style.id = 'update-banner-styles';
      style.textContent = `
        #update-banner {
          position: fixed; top: 0; left: 0; right: 0;
          background: linear-gradient(90deg, #7c3aed, #5865f2);
          color: white; z-index: 999999; padding: 10px 16px;
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
          animation: slideDown 0.3s ease-out;
        }
        .update-banner-content { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 12px; }
        .update-icon { font-size: 22px; animation: pulse 1.5s infinite; }
        .update-info { flex: 1; }
        .update-title { font-weight: 700; font-size: 14px; }
        .update-version { font-size: 12px; opacity: 0.9; }
        .update-btn { background: white; color: #5865f2; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .update-close-btn { background: transparent; border: none; color: white; font-size: 18px; cursor: pointer; opacity: 0.8; }
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`;
      document.head.appendChild(style);
    }

    document.body.appendChild(banner);

    if (typeof showToast === 'function') {
      showToast(`🔄 Nova versão ${this.latestVersion} disponível!`);
    }
  },

  openDownloadPage() {
    window.open(`https://github.com/${this.githubRepo}/releases/latest`, '_blank');
  },

  closeBanner() {
    document.getElementById('update-banner')?.remove();
  },

  async loadCurrentVersion() {
    try {
      const response = await fetch('/version');
      if (response.ok) {
        const data = await response.json();
        this.currentVersion = data.version;
      } else {
        this.currentVersion = '1.0.0';
      }
    } catch (e) {
      this.currentVersion = '1.0.0';
    }
  },

  bindUpdateButtons() {
    ['btn-update-check', 'btn-update-check-sidebar', 'btn-update-check-dm'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn && !btn._updateBound) {
        btn._updateBound = true;
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.checkForUpdatesWithModal();
        });
      }
    });
  },

  async init() {
    await this.loadCurrentVersion();
    this.bindUpdateButtons();
    setTimeout(() => this.checkForUpdates(), 5000);
    setInterval(() => this.checkForUpdates(), this.checkInterval);
    console.log(`✅ AutoUpdater inicializado. Versão atual: ${this.currentVersion}`);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AutoUpdater.init();
});

window.AutoUpdater = AutoUpdater;
