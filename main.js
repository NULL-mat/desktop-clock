const { app, BrowserWindow, Tray, Menu, ipcMain, screen } = require('electron');
const path = require('path');
const store = require('./settings');

let win = null;
let tray = null;

function isOnScreen(x, y) {
  return screen.getAllDisplays().some((d) => {
    const b = d.workArea;
    return x >= b.x - 100 && x <= b.x + b.width - 100 && y >= b.y - 20 && y <= b.y + b.height - 20;
  });
}

let saveTimer = null;

function persistWindow() {
  if (!win || win.isDestroyed()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    const [x, y] = win.getPosition();
    if (isOnScreen(x, y)) store.set({ x, y });
  }, 500);
}

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

function broadcast() {
  if (win && !win.isDestroyed()) win.webContents.send('settings-changed', store.data);
  refreshTray();
}

function setFontSize(v) {
  store.set({ fontSize: v });
  broadcast();
}

function buildMenu() {
  const s = store.data;
  return [
    { label: '24 小时制', type: 'radio', checked: !s.hour12, click: () => { store.set({ hour12: false }); broadcast(); } },
    { label: '12 小时制', type: 'radio', checked: s.hour12, click: () => { store.set({ hour12: true }); broadcast(); } },
    { type: 'separator' },
    { label: '显示秒', type: 'checkbox', checked: s.showSeconds, click: (item) => { store.set({ showSeconds: item.checked }); broadcast(); } },
    { label: '显示日期', type: 'checkbox', checked: s.showDate, click: (item) => { store.set({ showDate: item.checked }); broadcast(); } },
    { type: 'separator' },
    {
      label: '字号',
      submenu: [
        { label: '增大', click: () => setFontSize(store.data.fontSize + 12) },
        { label: '减小', click: () => setFontSize(store.data.fontSize - 12) },
        { label: '重置', click: () => setFontSize(64) }
      ]
    },
    {
      label: '透明度',
      submenu: [20, 40, 60, 80, 100].map((v) => ({
        label: v + '%',
        type: 'radio',
        checked: Math.abs(s.opacity - v / 100) < 0.01,
        click: () => { store.set({ opacity: v / 100 }); broadcast(); }
      }))
    },
    { type: 'separator' },
    { label: '锁定位置', type: 'checkbox', checked: s.locked, click: (item) => { if (item.checked) persistWindow(); store.set({ locked: item.checked }); broadcast(); } },
    {
      label: '窗口置顶',
      type: 'checkbox',
      checked: s.alwaysOnTop,
      click: (item) => {
        store.set({ alwaysOnTop: item.checked });
        if (win && !win.isDestroyed()) win.setAlwaysOnTop(item.checked, 'pop-up-menu');
        broadcast();
      }
    },
    { type: 'separator' },
    {
      label: '开机自启',
      type: 'checkbox',
      checked: isAutoLaunchEnabled(),
      click: (item) => setAutoLaunch(item.checked)
    },
    { label: '退出', role: 'quit' }
  ];
}

function estimateBounds(s) {
  const chars = s.showSeconds ? 8 : 5;
  const w = Math.round(s.fontSize * 0.62 * chars + (s.hour12 ? s.fontSize * 1.2 : 0)) + 48;
  const h = Math.round(s.fontSize * 1.25 + (s.showDate ? s.fontSize * 0.55 : 0)) + 36;
  return { width: Math.max(w, 200), height: Math.max(h, 80) };
}

function createWindow() {
  const s = store.data;
  const b = estimateBounds(s);
  const onScreen = typeof s.x === 'number' && typeof s.y === 'number' && isOnScreen(s.x, s.y);

  win = new BrowserWindow({
    width: b.width,
    height: b.height,
    x: onScreen ? s.x : undefined,
    y: onScreen ? s.y : undefined,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: s.alwaysOnTop !== false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.setAlwaysOnTop(s.alwaysOnTop !== false, 'pop-up-menu');
  win.loadFile('index.html');
  win.on('moved', persistWindow);
  win.on('closed', () => { win = null; });
}

function refreshTray() {
  if (tray) tray.setContextMenu(Menu.buildFromTemplate(buildMenu()));
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.jpg'));
  tray.setToolTip('桌面时钟');
  refreshTray();
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
    store.load();
    createWindow();
    createTray();
  });

  app.on('before-quit', () => {
    if (win && !win.isDestroyed()) {
      const [x, y] = win.getPosition();
      if (isOnScreen(x, y)) store.set({ x, y });
    }
  });
}

let lastPopupAt = 0;

function showContextMenu() {
  if (!win || win.isDestroyed()) return;
  const now = Date.now();
  if (now - lastPopupAt < 300) return;
  lastPopupAt = now;
  const menu = Menu.buildFromTemplate(buildMenu());
  setTimeout(() => {
    // 不传 x/y：popup 会自动定位到当前光标处。
    // 传全局坐标会被当作窗口相对坐标，导致菜单弹到屏幕右下角。
    menu.popup({ window: win });
  }, 50);
}

ipcMain.on('renderer-ready', () => broadcast());

ipcMain.on('show-context-menu', () => showContextMenu());

let dragOffset = null;
let dragTimer = null;

ipcMain.on('drag-start', () => {
  if (!win || win.isDestroyed() || store.data.locked) return;
  const p = screen.getCursorScreenPoint();
  const [x, y] = win.getPosition();
  dragOffset = { dx: p.x - x, dy: p.y - y };
  if (!dragTimer) {
    dragTimer = setInterval(() => {
      if (!dragOffset || !win || win.isDestroyed()) return;
      const p2 = screen.getCursorScreenPoint();
      win.setPosition(p2.x - dragOffset.dx, p2.y - dragOffset.dy);
    }, 16);
  }
});

ipcMain.on('drag-end', () => {
  dragOffset = null;
  clearInterval(dragTimer);
  dragTimer = null;
  persistWindow();
});

ipcMain.on('resize-window', (_e, { w, h }) => {
  if (!win || win.isDestroyed()) return;
  const cur = win.getBounds();
  const width = Math.max(200, Math.round(w));
  const height = Math.max(60, Math.round(h));
  if (Math.abs(cur.width - width) < 3 && Math.abs(cur.height - height) < 3) return;
  const cx = cur.x + cur.width / 2;
  const cy = cur.y + cur.height / 2;
  const wa = screen.getDisplayNearestPoint({ x: Math.round(cx), y: Math.round(cy) }).workArea;
  const x = Math.min(Math.max(Math.round(cx - width / 2), wa.x), wa.x + wa.width - width);
  const y = Math.min(Math.max(Math.round(cy - height / 2), wa.y), wa.y + wa.height - height);
  win.setBounds({ x, y, width, height });
});

app.on('window-all-closed', () => {
  app.quit();
});
