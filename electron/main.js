const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const PORT = 3847;
const APP_TITLE = 'VIMMS — Vidhi Inventory and Marketing Management Software';
const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
let backendProcess = null;

function getBackendDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }
  return path.join(__dirname, '..', 'backend');
}

function getBackendPath() {
  return path.join(getBackendDir(), 'src', 'index.js');
}

function getDataDir() {
  return path.join(app.getPath('userData'), 'data');
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const backendScript = getBackendPath();
    const env = {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: getDataDir(),
      UPLOADS_DIR: path.join(getDataDir(), 'uploads'),
      ELECTRON_RUN_AS_NODE: '1',
    };

    backendProcess = spawn(process.execPath, [backendScript], {
      env,
      cwd: getBackendDir(),
      stdio: 'pipe',
      windowsHide: true,
    });

    backendProcess.stdout.on('data', (data) => console.log(`[backend] ${data}`));
    backendProcess.stderr.on('data', (data) => console.error(`[backend] ${data}`));

    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      http.get(`http://localhost:${PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(check);
          resolve();
        }
      }).on('error', () => {
        if (attempts > 30) {
          clearInterval(check);
          reject(new Error('Backend failed to start'));
        }
      });
    }, 500);
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: APP_TITLE,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadURL(`http://localhost:${PORT}`);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  try {
    if (!isDev) {
      await startBackend();
    }
    createWindow();
  } catch (err) {
    console.error('Failed to start app:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});
