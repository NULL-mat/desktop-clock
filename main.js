const { app, BrowserWindow, Tray, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let win = null;
let tray = null;

const stateFile = path.join(app.getPath('userData'), 'window-state.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return {};
  }
}

function isOnScreen(x, y) {
  return screen.getAllDisplays().some((d) => {
    const b = d.workArea;
    return x >= b.x - 100 && x <= b.x + b.width - 100 && y >= b.y - 20 && y <= b.y + b.height - 20;
  });
}

let saveTimer = null;

function getAutoLaunchPath() {
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
}

function setAutoLaunch(enabled) {
  const settings = {
    openAtLogin: enabled,
    path: getAutoLaunchPath()
  };
  if (process.defaultApp) {
    settings.args = [path.resolve(process.argv[1])];
  }
  app.setLoginItemSettings(settings);
}

function isAutoLaunchEnabled() {
  const exePath = getAutoLaunchPath();
  const settings = app.getLoginItemSettings({ path: exePath });
  return settings.openAtLogin;
}

function saveState() {
  if (!win || win.isDestroyed()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    const [x, y] = win.getPosition();
    if (isOnScreen(x, y)) {
      fs.writeFileSync(stateFile, JSON.stringify({ x, y, alwaysOnTop: win.isAlwaysOnTop() }));
    }
  }, 500);
}

function createWindow() {
  const state = loadState();
  const onScreen = typeof state.x === 'number' && typeof state.y === 'number' && isOnScreen(state.x, state.y);

  win = new BrowserWindow({
    width: 380,
    height: 170,
    x: onScreen ? state.x : undefined,
    y: onScreen ? state.y : undefined,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setAlwaysOnTop(state.alwaysOnTop !== false, 'screen-saver');
  win.loadFile('index.html');
  win.on('moved', saveState);
  win.on('closed', () => { win = null; });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.jpg'));
  tray.setToolTip('桌面时钟');
  const state = loadState();
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '开机自启',
      type: 'checkbox',
      checked: isAutoLaunchEnabled(),
      click(item) {
        setAutoLaunch(item.checked);
      }
    },
    {
      label: '窗口置顶',
      type: 'checkbox',
      checked: state.alwaysOnTop !== false,
      click(item) {
        if (win) {
          win.setAlwaysOnTop(item.checked, 'screen-saver');
          saveState();
        }
      }
    },
    { type: 'separator' },
    { label: '退出', role: 'quit' }
  ]));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      win.show();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();
  });
}

app.on('window-all-closed', () => {
  app.quit();
});
