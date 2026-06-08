// ================================================
// ✅ PRELOAD.JS - Electron Context Bridge
// ✅ Comunicação segura entre Main e Renderer
// ================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ✅ Obter fontes de tela e janela
  getScreenSources: (types) => ipcRenderer.invoke('get-screen-sources', types)
});

console.log('✅ Preload.js carregado com sucesso!');