const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { STEPS, runInstall, openIDE, checkVersion } = require('./installer');

let win = null;
let installing = false;

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 860,
    minHeight: 560,
    title: 'AI CLI Auto Installer',
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

// 단계 목록 조회
ipcMain.handle('get-steps', () =>
  STEPS.map(({ id, title, description, optional }) => ({ id, title, description, optional }))
);

// 시작 시 각 도구의 현재 설치 상태를 미리 조회
ipcMain.handle('scan', async () => {
  const result = {};
  for (const step of STEPS) {
    result[step.id] = await checkVersion(step.checkCommand);
  }
  return result;
});

// 순차 설치 실행
ipcMain.handle('start-install', async (_event, selectedIds) => {
  if (installing) return { ok: false, reason: 'already-running' };
  installing = true;
  try {
    const results = await runInstall({
      selectedIds,
      emit: (update) => send('step-update', update),
      onLog: (text) => send('log', text),
    });
    send('install-finished', results);
    return { ok: true, results };
  } finally {
    installing = false;
  }
});

// IDE(VS Code) 열기
ipcMain.handle('open-ide', async () => {
  const ok = await openIDE((text) => send('log', text));
  return { ok };
});
