const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');

// Porta configurável via variável de ambiente (compatível com Replit e outros deploys)
const SERVER_PORT = parseInt(process.env.PORT || '3002', 10);
const SERVER_URL = 'http://localhost:' + SERVER_PORT;
let serverProcess;
let mainWindow = null;

app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');
app.commandLine.appendSwitch('disable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-accelerated-video-encode');
app.commandLine.appendSwitch('enable-features', 'DesktopCaptureWgc');
app.commandLine.appendSwitch('disable-features', 'VaapiVideoDecoder');

function getServerPath() {
  const base = __dirname.includes('app.asar')
    ? __dirname.replace('app.asar', 'app.asar.unpacked')
    : __dirname;
  return path.join(base, 'server.js');
}

function startServer() {
  const serverPath = getServerPath();

  const appDir = __dirname.includes('app.asar')
    ? __dirname.replace('app.asar', 'app.asar.unpacked')
    : __dirname;

  // Pasta de dados do usuario (persistente entre atualizacoes)
  const userDataDir = app.getPath('userData');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  // Arquivo de log do servidor
  const logFile = path.join(userDataDir, 'server.log');
  const logStream = fs.createWriteStream(logFile, { flags: 'w' });
  logStream.write('[main] Iniciando servidor: ' + serverPath + '\n');
  logStream.write('[main] APP_DIR: ' + appDir + '\n');
  logStream.write('[main] USER_DATA_DIR: ' + userDataDir + '\n');
  logStream.write('[main] Data/Hora: ' + new Date().toISOString() + '\n\n');

  // Migra data.json antigo para pasta do usuario
  const oldData = path.join(appDir, 'data.json');
  const newData = path.join(userDataDir, 'data.json');
  if (fs.existsSync(oldData) && !fs.existsSync(newData)) {
    try { fs.copyFileSync(oldData, newData); logStream.write('[main] data.json migrado\n'); } catch(e) {}
  }

  // Migra uploads antigos
  const oldUploads = path.join(appDir, 'uploads');
  const newUploads = path.join(userDataDir, 'uploads');
  if (fs.existsSync(oldUploads) && !fs.existsSync(newUploads)) {
    try { fs.cpSync(oldUploads, newUploads, { recursive: true }); logStream.write('[main] uploads migrados\n'); } catch(e) {}
  }

  serverProcess = fork(serverPath, [], {
    env: Object.assign({}, process.env, {
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(SERVER_PORT), // garante que servidor e janela usam a mesma porta
      APP_DIR: appDir,
      USER_DATA_DIR: userDataDir,
      LOG_FILE: logFile,
    }),
    silent: true,
  });

  // Captura saida do servidor no log
  serverProcess.stdout.on('data', (data) => {
    logStream.write(data);
    process.stdout.write(data);
  });
  serverProcess.stderr.on('data', (data) => {
    logStream.write('[ERRO] ' + data);
    process.stderr.write(data);
  });

  serverProcess.on('error', (err) => {
    const msg = '[main] ERRO FATAL ao iniciar servidor: ' + err.message + '\n';
    logStream.write(msg);
    console.error(msg);
  });
  serverProcess.on('message', (msg) => {
    if (msg && msg.error) {
      logStream.write('[main] Servidor reportou erro: ' + msg.error + '\n');
    }
    // porta real tratada em app.whenReady
  });
  serverProcess.on('exit', (code, signal) => {
    const msg = '[main] Servidor encerrado, codigo: ' + code + ' sinal: ' + signal + '\n';
    logStream.write(msg);
    console.warn(msg);
  });
}

function createWindow(targetUrl) {
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
    backgroundColor: '#0f0f0f',
  });

  const url = targetUrl || SERVER_URL;
  let retries = 0;
  const MAX_RETRIES = 30;

  win.webContents.on('did-fail-load', (event, errorCode, errorDesc, validatedURL) => {
    if (!validatedURL || validatedURL.startsWith('file://')) return;
    if ((errorCode === -102 || errorCode === -324) && retries < MAX_RETRIES) {
      retries++;
      setTimeout(function() { if (!win.isDestroyed()) win.loadURL(url); }, 800);
    }
  });

  win.loadURL(url);
  return win;
}

function createMainWindow() {
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
    backgroundColor: '#0f0f0f',
  });

  win.loadFile(path.join(__dirname, 'loading.html')).catch(function(err) {
    console.error('[main] Falha ao carregar loading.html:', err.message);
  });

  return win;
}

function loadAuthWhenReady(win, port) {
  const http = require('http');
  const authURL = 'http://localhost:' + port + '/auth.html';
  let retries = 0;
  const MAX = 40; // 20 segundos

  function tryLoad() {
    if (!win || win.isDestroyed()) return;
    if (retries >= MAX) {
      // Mostra erro na tela de loading
      win.webContents.executeJavaScript(
        'document.getElementById("msg").textContent="Erro: servidor nao respondeu";' +
        'document.getElementById("errorBox").style.display="block";'
      ).catch(function() {});
      return;
    }
    const req = http.request({ hostname: 'localhost', port: port, path: '/auth.html', method: 'HEAD' }, function() {
      if (!win.isDestroyed()) win.loadURL(authURL);
    });
    req.setTimeout(400, function() { req.destroy(); });
    req.on('error', function() {
      retries++;
      setTimeout(tryLoad, 500);
    });
    req.end();
  }

  tryLoad();
}

app.setName('Mega ZX');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', function() {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(function() {
  startServer();
  mainWindow = createMainWindow();

  // Escuta porta real do servidor (caso mude por EADDRINUSE)
  var actualPort = SERVER_PORT;
  serverProcess.on('message', function(msg) {
    if (msg && msg.type === 'ready') {
      actualPort = msg.port;
      loadAuthWhenReady(mainWindow, actualPort);
    }
  });

  // Fallback: se process.send não disparar (ex: erro no fork), tenta mesmo assim
  setTimeout(function() {
    if (mainWindow && !mainWindow.isDestroyed()) {
      var url = mainWindow.webContents.getURL();
      if (url && url.startsWith('file://')) {
        loadAuthWhenReady(mainWindow, actualPort);
      }
    }
  }, 3000);

  app.on('web-contents-created', function(_, contents) {
    contents.setWindowOpenHandler(function(details) {
      var url = details.url;
      if (url.startsWith(SERVER_URL) || url.startsWith('http://localhost:')) {
        createWindow(url);
      }
      return { action: 'deny' };
    });
  });

  ipcMain.handle('get-screen-sources', async function(event, types) {
    try {
      var sources = await desktopCapturer.getSources({
        types: types || ['screen', 'window'],
        thumbnailSize: { width: 0, height: 0 },
        fetchWindowIcons: false
      });
      return sources.filter(function(source) {
        return !['Electron', 'DevTools', 'Chrome', 'Program Manager',
          'Windows Shell Experience Host', 'Microsoft Text Input Application']
          .some(function(n) { return source.name.includes(n); });
      }).map(function(source) { return { id: source.id, name: source.name }; });
    } catch (err) {
      console.error('Erro ao obter fontes de tela:', err);
      return [];
    }
  });

  ipcMain.handle('get-log-path', function() {
    return path.join(app.getPath('userData'), 'server.log');
  });

  ipcMain.handle('open-log', function() {
    const logPath = path.join(app.getPath('userData'), 'server.log');
    require('electron').shell.openPath(logPath);
  });
});

app.on('window-all-closed', function() {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function() {
  if (BrowserWindow.getAllWindows().length === 0) {
    startServer();
    createMainWindow();
  }
});
