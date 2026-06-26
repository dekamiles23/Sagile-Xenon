const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const { fork } = require('child_process');
const path = require('path');

const SERVER_URL = 'http://localhost:3002';
let serverProcess;

function startServer() {
  return new Promise((resolve) => {
    serverProcess = fork(path.join(__dirname, 'server.js'));
    serverProcess.on('message', (msg) => {
      if (msg === 'ready') resolve();
    });
    // fallback: aguarda 1.5s caso o server.js não envie mensagem
    setTimeout(resolve, 1500);
  });
}

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.join(__dirname, 'logo-icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
  });

  win.loadURL(url || SERVER_URL);
  return win;
}

app.setName('Mega ZX');

app.whenReady().then(async () => {
  // ✅ FLAGS PARA CORRIGIR ERRO GPU STATE INVALID
  app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');
  app.commandLine.appendSwitch('disable-accelerated-video-decode');
  app.commandLine.appendSwitch('disable-accelerated-video-encode');
  app.commandLine.appendSwitch('enable-features', 'DesktopCaptureWgc');
  app.commandLine.appendSwitch('disable-features', 'VaapiVideoDecoder');
  
  await startServer();
  createWindow();

  app.on('web-contents-created', (_, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith(SERVER_URL) || url.startsWith('http://localhost:')) {
        createWindow(url);
      }
      return { action: 'deny' };
    });
  });

  // ✅ IPC HANDLERS PARA COMPARTILHAMENTO DE TELA
  ipcMain.handle('get-screen-sources', async (event, types) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: types || ['screen', 'window'],
        // ✅ DESATIVAR COMPLETAMENTE GERAÇÃO DE MINIATURAS
        thumbnailSize: { width: 0, height: 0 },
        fetchWindowIcons: false
      });

      // ✅ FILTRAR JANELAS QUE NÃO PODEM SER CAPTURADAS
      const sourcesValidas = sources.filter(source => {
        if (source.name.includes('Electron') || 
            source.name.includes('DevTools') || 
            source.name.includes('Chrome') ||
            source.name === 'Program Manager' ||
            source.name === 'Windows Shell Experience Host' ||
            source.name === 'Microsoft Text Input Application') {
          return false;
        }
        return true;
      });

      // ✅ RETORNAR APENAS ID E NOME - SEM MINIATURAS
      return sourcesValidas.map(source => ({
        id: source.id,
        name: source.name
      }));

    } catch (err) {
      console.error('❌ Erro ao obter fontes de tela:', err);
      return [];
    }
  });

  // ✅ REMOVIDO: navigator NÃO EXISTE no processo MAIN!
  // ✅ Stream é criado APENAS no processo RENDERER
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

