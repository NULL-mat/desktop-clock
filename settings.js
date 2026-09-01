const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const DEFAULTS = {
  x: null,
  y: null,
  alwaysOnTop: true,
  locked: false,
  hour12: false,
  showSeconds: true,
  showDate: false,
  fontSize: 64,
  opacity: 0.8,
  scale: 1,
  theme: 'auto',
  font: 'system',
  textColor: '',
  bgColor: '',
  bgImage: '',
  clickThrough: false,
  chimeInterval: 0,
  countdownEnd: null,
  flipAnimation: false,
  acrylic: false,
  oledShift: false,
  timezone2: '',
  timeFormat: '',
  customTheme: null
};

const THEMES = ['auto', 'dark', 'light', 'flip', 'neon', 'terminal', 'glass'];
const FONTS = ['system', 'mono', 'serif', 'geo'];
const CHIMES = [0, 15, 30, 60];
const TIMEZONES = [
  { key: '', label: '关闭' },
  { key: 'Asia/Shanghai', label: '北京 (GMT+8)' },
  { key: 'Asia/Tokyo', label: '东京 (GMT+9)' },
  { key: 'Europe/London', label: '伦敦 (GMT+0)' },
  { key: 'America/New_York', label: '纽约 (GMT-5)' },
  { key: 'America/Los_Angeles', label: '洛杉矶 (GMT-8)' },
  { key: 'UTC', label: 'UTC' }
];

let data = { ...DEFAULTS };

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v)));
}

function sanitize(s) {
  s.fontSize = Math.round(clamp(s.fontSize || 64, 24, 200));
  s.opacity = clamp(s.opacity || 0.8, 0.2, 1);
  s.scale = clamp(s.scale || 1, 0.5, 2.5);
  if (!THEMES.includes(s.theme)) s.theme = 'auto';
  if (!FONTS.includes(s.font)) s.font = 'system';
  s.textColor = typeof s.textColor === 'string' ? s.textColor : '';
  s.bgColor = typeof s.bgColor === 'string' ? s.bgColor : '';
  s.bgImage = typeof s.bgImage === 'string' ? s.bgImage : '';
  s.clickThrough = !!s.clickThrough;
  s.chimeInterval = CHIMES.includes(s.chimeInterval) ? s.chimeInterval : 0;
  s.flipAnimation = !!s.flipAnimation;
  s.acrylic = !!s.acrylic;
  s.oledShift = !!s.oledShift;
  s.timezone2 = typeof s.timezone2 === 'string' ? s.timezone2 : '';
  if (s.timezone2 && !TIMEZONES.some((t) => t.key === s.timezone2)) s.timezone2 = '';
  s.timeFormat = typeof s.timeFormat === 'string' ? s.timeFormat.slice(0, 80) : '';
  if (s.customTheme && typeof s.customTheme === 'object') {
    const ct = {};
    ['bgRgb', 'textColor', 'glow', 'font'].forEach((k) => {
      if (typeof s.customTheme[k] === 'string') ct[k] = s.customTheme[k];
    });
    s.customTheme = Object.keys(ct).length ? ct : null;
  } else {
    s.customTheme = null;
  }
  // 过期倒计时在加载/保存时自动清空
  if (typeof s.countdownEnd === 'number' && s.countdownEnd <= Date.now()) s.countdownEnd = null;
  if (s.countdownEnd != null && typeof s.countdownEnd !== 'number') s.countdownEnd = null;
  return s;
}

function load() {
  const dir = app.getPath('userData');
  try {
    data = sanitize({ ...DEFAULTS, ...JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8')) });
  } catch {
    try {
      // v1.0 的旧状态文件，迁移位置与置顶设置
      const old = JSON.parse(fs.readFileSync(path.join(dir, 'window-state.json'), 'utf8'));
      data = sanitize({ ...DEFAULTS, x: old.x, y: old.y, alwaysOnTop: old.alwaysOnTop });
    } catch {
      data = { ...DEFAULTS };
    }
  }
  return data;
}

function save() {
  fs.writeFileSync(path.join(app.getPath('userData'), 'settings.json'), JSON.stringify(data, null, 2));
}

function set(patch) {
  data = sanitize({ ...data, ...patch });
  save();
  return data;
}

module.exports = { load, save, set, get data() { return data; }, TIMEZONES };