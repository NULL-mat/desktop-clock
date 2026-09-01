const { app, BrowserWindow, Tray, Menu, ipcMain, screen, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./settings');

let win = null;
let tray = null;
let settingsWin = null;
let oledTimer = null;
let oledStep = 0;

const THEMES = [
  { key: 'auto', label: '跟随系统' },
  { key: 'dark', label: '暗夜黑' },
  { key: 'light', label: '极简白' },
  { key: 'flip', label: '翻页钟' },
  { key: 'neon', label: '霓虹' },
  { key: 'terminal', label: '终端绿' },
  { key: 'glass', label: '玻璃拟态' }
];
const FONTS = [
  { key: 'system', label: '系统' },
  { key: 'mono', label: '等宽' },
  { key: 'serif', label: '优雅衬线' },
  { key: 'geo', label: '几何' }
];
const COLORS = [
  { key: '', label: '跟随主题' },
  { key: '#ffffff', label: '白' },
  { key: '#1d1d1f', label: '黑' },
  { key: '#ff5f56', label: '红' },
  { key: '#ff9f0a', label: '橙' },
  { key: '#4af626', label: '绿' },
  { key: '#3b82f6', label: '蓝' },
  { key: '#a78bfa', label: '紫' },
  { key: '#22d3ee', label: '青' }
];
const SCALES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const COUNTDOWNS = [5, 10, 25, 45, 60];
const CHIMES = [
  { key: 0, label: '关闭' },
  { key: 15, label: '每 15 分钟' },
  { key: 30, label: '每 30 分钟' },
  { key: 60, label: '每小时' }
];
const FORMATS = [
  { key: '', label: '默认' },
  { key: 'HH:mm:ss', label: 'HH:mm:ss' },
  { key: 'hh:mm:ss tt', label: 'hh:mm:ss tt' },
  { key: 'yyyy-MM-dd HH:mm', label: 'yyyy-MM-dd HH:mm' },
  { key: 'MM-dd ddd HH:mm', label: 'MM-dd ddd HH:mm' },
  { key: 'HH:mm', label: 'HH:mm（仅时分）' }
];

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
  const s = store.data;
  applyAcrylic();
  applyOledShift();
  if (win && !win.isDestroyed()) win.webContents.send('settings-changed', s);
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('settings-changed', s);
  refreshTray();
}

function setFontSize(v) {
  store.set({ fontSize: v });
  broadcast();
}

function applyClickThrough() {
  if (win && !win.isDestroyed()) {
    win.setIgnoreMouseEvents(store.data.clickThrough);
  }
}

const OLED_STEPS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

function applyAcrylic() {
  if (!win || win.isDestroyed()) return;
  try {
    win.setBackgroundMaterial(store.data.acrylic ? 'acrylic' : 'none');
  } catch {
    // 透明窗口或非 Win11 不支持原生亚克力，视觉由 CSS .acrylic 兜底
  }
}

function applyOledShift() {
  if (oledTimer) { clearInterval(oledTimer); oledTimer = null; }
  oledStep = 0;
  if (!store.data.oledShift || !win || win.isDestroyed()) return;
  oledTimer = setInterval(() => {
    if (!win || win.isDestroyed() || !store.data.oledShift) return;
    oledStep = (oledStep + 1) % OLED_STEPS.length;
    const [dx, dy] = OLED_STEPS[oledStep];
    const [x, y] = win.getPosition();
    win.setPosition(x + dx, y + dy);
  }, 60000);
}

function pickJsonTheme() {
  if (!win || win.isDestroyed()) return;
  dialog.showOpenDialog(win, {
    title: '导入主题 JSON',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  }).then((r) => {
    if (r.canceled || !r.filePaths[0]) return;
    try {
      const obj = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8'));
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        store.set({ customTheme: obj });
        broadcast();
      }
    } catch {
      // 非法 JSON 静默忽略
    }
  });
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 440,
    height: 700,
    resizable: false,
    autoHideMenuBar: true,
    title: '桌面时钟 · 设置',
    backgroundColor: '#1e1e26',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  settingsWin.loadFile('settings.html');
  settingsWin.on('closed', () => { settingsWin = null; });
}

function startCountdown(minutes) {
  store.set({ countdownEnd: Date.now() + minutes * 60000 });
  broadcast();
}

function stopCountdown() {
  store.set({ countdownEnd: null });
  broadcast();
}

function pickBackground() {
  if (!win || win.isDestroyed()) return;
  dialog.showOpenDialog(win, {
    title: '选择背景图片',
    properties: ['openFile'],
    filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
  }).then((r) => {
    if (!r.canceled && r.filePaths[0]) {
      store.set({ bgImage: r.filePaths[0] });
      broadcast();
    }
  });
}

function buildMenu() {
  const s = store.data;
  return [
    { label: '24 小时制', type: 'radio', checked: !s.hour12, click: () => { store.set({ hour12: false }); broadcast(); } },
    { label: '12 小时制', type: 'radio', checked: s.hour12, click: () => { store.set({ hour12: true }); broadcast(); } },
    { type: 'separator' },
    { label: '显示秒', type: 'checkbox', checked: s.showSeconds, click: (item) => { store.set({ showSeconds: item.checked }); broadcast(); } },
    { label: '显示日期', type: 'checkbox', checked: s.showDate, click: (item) => { store.set({ showDate: item.checked }); broadcast(); } },
    {
      label: '时间格式',
      submenu: FORMATS.map((f) => ({
        label: f.label,
        type: 'radio',
        checked: s.timeFormat === f.key,
        click: () => { store.set({ timeFormat: f.key }); broadcast(); }
      }))
    },
    { type: 'separator' },
    {
      label: '主题',
      submenu: THEMES.map((t) => ({
        label: t.label,
        type: 'radio',
        checked: s.theme === t.key,
        click: () => { store.set({ theme: t.key }); broadcast(); }
      }))
    },
    {
      label: '字体',
      submenu: FONTS.map((f) => ({
        label: f.label,
        type: 'radio',
        checked: s.font === f.key,
        click: () => { store.set({ font: f.key }); broadcast(); }
      }))
    },
    {
      label: '文字颜色',
      submenu: COLORS.map((c) => ({
        label: c.label,
        type: 'radio',
        checked: s.textColor === c.key,
        click: () => { store.set({ textColor: c.key }); broadcast(); }
      }))
    },
    {
      label: '背景颜色',
      submenu: [
        { label: '无（透明）', type: 'radio', checked: s.bgColor === 'none', click: () => { store.set({ bgColor: 'none' }); broadcast(); } },
        ...COLORS.map((c) => ({
          label: c.label,
          type: 'radio',
          checked: s.bgColor === c.key,
          click: () => { store.set({ bgColor: c.key }); broadcast(); }
        }))
      ]
    },
    {
      label: '背景图片',
      submenu: [
        { label: '选择图片…', click: pickBackground },
        ...(s.bgImage ? [{ label: '清除背景图', click: () => { store.set({ bgImage: '' }); broadcast(); } }] : [])
      ]
    },
    { type: 'separator' },
    { label: '翻页动画', type: 'checkbox', checked: s.flipAnimation, click: (item) => { store.set({ flipAnimation: item.checked }); broadcast(); } },
    { label: '玻璃拟态', type: 'checkbox', checked: s.acrylic, click: (item) => { store.set({ acrylic: item.checked }); broadcast(); } },
    { label: 'OLED 防烧屏', type: 'checkbox', checked: s.oledShift, click: (item) => { store.set({ oledShift: item.checked }); broadcast(); } },
    {
      label: '第二时区',
      submenu: store.TIMEZONES.map((tz) => ({
        label: tz.label,
        type: 'radio',
        checked: s.timezone2 === tz.key,
        click: () => { store.set({ timezone2: tz.key }); broadcast(); }
      }))
    },
    { label: '导入主题 JSON…', click: pickJsonTheme },
    { label: '打开设置面板…', click: openSettings },
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
      label: '缩放',
      submenu: SCALES.map((v) => ({
        label: Math.round(v * 100) + '%',
        type: 'radio',
        checked: Math.abs(s.scale - v) < 0.01,
        click: () => { store.set({ scale: v }); broadcast(); }
      }))
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
    {
      label: '专注倒计时',
      submenu: [
        ...(s.countdownEnd ? [{ label: '停止倒计时', click: stopCountdown }, { type: 'separator' }] : []),
        ...COUNTDOWNS.map((m) => ({ label: m + ' 分钟', click: () => startCountdown(m) }))
      ]
    },
    {
      label: '整点报时',
      submenu: CHIMES.map((c) => ({
        label: c.label,
        type: 'radio',
        checked: s.chimeInterval === c.key,
        click: () => { store.set({ chimeInterval: c.key }); broadcast(); }
      }))
    },
    { type: 'separator' },
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
    { label: '锁定位置', type: 'checkbox', checked: s.locked, click: (item) => { if (item.checked) persistWindow(); store.set({ locked: item.checked }); broadcast(); } },
    {
      label: '点击穿透',
      type: 'checkbox',
      checked: s.clickThrough,
      click: (item) => { store.set({ clickThrough: item.checked }); applyClickThrough(); broadcast(); }
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
  const f = s.fontSize * (s.scale || 1);
  const chars = s.showSeconds ? 8 : 5;
  const w = Math.round(f * 0.62 * chars + (s.hour12 ? f * 1.2 : 0)) + 48;
  const h = Math.round(f * 1.25 + (s.showDate ? f * 0.55 : 0)) + 36;
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
  if (s.clickThrough) win.setIgnoreMouseEvents(true);
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
    // 点击穿透的兜底开关：Ctrl+Alt+D 随时切回可交互状态
    globalShortcut.register('CommandOrControl+Alt+D', () => {
      store.set({ clickThrough: !store.data.clickThrough });
      applyClickThrough();
      broadcast();
    });
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());

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

ipcMain.on('setting-set', (_e, patch) => {
  store.set(patch);
  broadcast();
});

ipcMain.on('pick-background', () => pickBackground());

ipcMain.on('pick-json-theme', () => pickJsonTheme());

ipcMain.on('open-settings', () => openSettings());

ipcMain.on('countdown-finished', () => {
  store.set({ countdownEnd: null });
  broadcast();
});

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