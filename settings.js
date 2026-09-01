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
  opacity: 0.8
};

let data = { ...DEFAULTS };

function sanitize(s) {
  s.fontSize = Math.round(Math.min(200, Math.max(24, Number(s.fontSize) || 64)));
  s.opacity = Math.min(1, Math.max(0.2, Number(s.opacity) || 0.8));
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

module.exports = { load, save, set, get data() { return data; } };
