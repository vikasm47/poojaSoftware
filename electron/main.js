const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

const PORT = 3847;
const APP_TITLE = 'VIMMS — Vidhi Inventory and Marketing Management Software';
const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
let backendProcess = null;

function getLogPath() {
  return path.join(app.getPath('userData'), 'vimms-startup.log');
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(getLogPath(), line);
  } catch {
    // ignore logging errors
  }
  console.log(message);
}

function getBackendDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }
  return path.join(__dirname, '..', 'backend');
}

function getBackendPath() {
  return path.join(getBackendDir(), 'src', 'index.js');
}

function getFrontendDist() {
  if (isDev) {
    return path.join(__dirname, '..', 'frontend', 'dist');
  }
  return path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend', 'dist');
}

function getDataDir() {
  return path.join(app.getPath('userData'), 'data');
}

function probeBackendHealth() {
  return new Promise((resolve) => {
    http.get(`http://localhost:${PORT}/api/health`, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const ok = res.statusCode === 200
            && json.status === 'ok'
            && Array.isArray(json.capabilities)
            && json.capabilities.includes('admin');
          resolve(ok);
        } catch {
          resolve(false);
        }
      });
    }).on('error', () => resolve(false));
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const backendScript = getBackendPath();
    const frontendDist = getFrontendDist();

    if (!fs.existsSync(backendScript)) {
      return reject(new Error(`Backend not found at ${backendScript}`));
    }
    if (!isDev && !fs.existsSync(path.join(frontendDist, 'index.html'))) {
      return reject(new Error(`Frontend not found at ${frontendDist}`));
    }

    const env = {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: getDataDir(),
      UPLOADS_DIR: path.join(getDataDir(), 'uploads'),
      FRONTEND_DIST: frontendDist,
      ELECTRON_RUN_AS_NODE: '1',
    };

    log(`Starting backend: ${backendScript}`);
    log(`Frontend dist: ${frontendDist}`);

    let backendReady = false;
    let backendExited = false;
    let exitCode = null;

    backendProcess = spawn(process.execPath, [backendScript], {
      env,
      cwd: getBackendDir(),
      stdio: 'pipe',
      windowsHide: true,
    });

    backendProcess.stdout.on('data', (data) => log(`[backend] ${data}`.trim()));
    backendProcess.stderr.on('data', (data) => log(`[backend err] ${data}`.trim()));
    backendProcess.on('exit', (code) => {
      exitCode = code;
      backendExited = true;
      log(`Backend exited with code ${code}`);
    });

    let attempts = 0;
    const check = setInterval(async () => {
      attempts++;

      if (backendExited && !backendReady) {
        clearInterval(check);
        const portBusy = exitCode === 1;
        return reject(new Error(
          portBusy
            ? `Port ${PORT} is already in use. Close any running "npm run dev:backend" terminal or other VIMMS windows, then start VIMMS again.`
            : `Backend exited before it was ready (code ${exitCode}). Check vimms-startup.log in AppData.`
        ));
      }

      const healthy = await probeBackendHealth();
      if (healthy && !backendExited) {
        backendReady = true;
        clearInterval(check);
        return resolve();
      }

      if (attempts > 60) {
        clearInterval(check);
        reject(new Error(
          `Backend failed to start within 30 seconds. If you run "npm run dev:backend" for development, stop it before opening the installed VIMMS app. Log: ${getLogPath()}`
        ));
      }
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
    show: false,
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

  mainWindow.once('ready-to-show', () => mainWindow.show());

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
    log(`Failed to start app: ${err.message}`);
    dialog.showErrorBox(
      'VIMMS could not start',
      `${err.message}\n\nLog file:\n${getLogPath()}`
    );
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
