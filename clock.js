(function () {
  const timeEl = document.getElementById('time');
  const ampmEl = document.getElementById('ampm');
  const dateEl = document.getElementById('date');
  const tzEl = document.getElementById('tz');
  const wrapEl = document.getElementById('wrap');
  const clockEl = document.getElementById('clock');
  const bgEl = document.getElementById('bg');

  const pad = (n) => String(n).padStart(2, '0');
  const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  let settings = {
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
    locked: false,
    chimeInterval: 0,
    countdownEnd: null,
    flipAnimation: false,
    acrylic: false,
    timezone2: '',
    timeFormat: '',
    customTheme: null
  };

  let lastChimeKey = Math.floor(Date.now() / 60000);
  let finishedNotified = false;
  let audioCtx = null;

  // ===== 提示音 =====
  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(ctx, freq, start, dur, vol) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime + start);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime + start);
    o.stop(ctx.currentTime + start + dur + 0.05);
  }

  function playChime() {
    const ctx = ensureAudio();
    if (!ctx) return;
    tone(ctx, 880, 0, 0.35, 0.25);
    tone(ctx, 1174.66, 0.18, 0.4, 0.25);
  }

  function playAlarm() {
    const ctx = ensureAudio();
    if (!ctx) return;
    for (let i = 0; i < 3; i++) {
      tone(ctx, 880, i * 0.6, 0.4, 0.3);
      tone(ctx, 660, i * 0.6 + 0.12, 0.4, 0.3);
    }
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  }

  function formatCountdown(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return pad(h) + ':' + pad(m) + ':' + pad(s);
    return pad(m) + ':' + pad(s);
  }

  // ===== 自定义时间格式 =====
  function formatToken(fmt, d) {
    const w = ['日', '一', '二', '三', '四', '五', '六'];
    const h24 = d.getHours();
    const h12 = h24 % 12 || 12;
    const tok = {
      HH: pad(h24), H: String(h24),
      hh: pad(h12), h: String(h12),
      mm: pad(d.getMinutes()), m: String(d.getMinutes()),
      ss: pad(d.getSeconds()), s: String(d.getSeconds()),
      tt: h24 < 12 ? 'AM' : 'PM', t: h24 < 12 ? 'A' : 'P',
      yyyy: String(d.getFullYear()), yy: String(d.getFullYear()).slice(-2),
      MM: pad(d.getMonth() + 1), M: String(d.getMonth() + 1),
      dd: pad(d.getDate()), d: String(d.getDate()),
      ddd: '周' + w[d.getDay()]
    };
    return String(fmt).replace(/HH|hh|mm|ss|tt|yyyy|yy|ddd|MM|dd|H|h|m|s|M|d|t/g, (k) => (k in tok ? tok[k] : k));
  }

  // ===== 翻页渲染 =====
  function useTextMode() {
    if (timeEl.dataset.mode === 'flip') {
      delete timeEl.dataset.mode;
      timeEl.classList.remove('flip-digits');
      timeEl.textContent = '';
    }
  }

  function setFlipDigits(text) {
    if (timeEl.dataset.mode !== 'flip') {
      timeEl.dataset.mode = 'flip';
      timeEl.classList.add('flip-digits');
      timeEl.textContent = '';
    }
    const chars = Array.from(String(text));
    while (timeEl.childElementCount < chars.length) {
      timeEl.appendChild(document.createElement('span'));
    }
    while (timeEl.childElementCount > chars.length) {
      timeEl.removeChild(timeEl.lastChild);
    }
    chars.forEach((ch, i) => {
      const el = timeEl.children[i];
      const isSep = ch === ':';
      el.className = isSep ? 'sep' : 'd';
      if (el.textContent !== ch) {
        el.textContent = ch;
        if (!isSep) {
          el.classList.remove('flip');
          void el.offsetWidth;
          el.classList.add('flip');
        }
      }
    });
  }

  function renderDate(now) {
    if (settings.showDate) {
      dateEl.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + WEEK[now.getDay()];
      dateEl.classList.remove('hidden');
    } else {
      dateEl.classList.add('hidden');
    }
  }

  function renderTimeString() {
    const now = new Date();
    let h = now.getHours();
    let ampm = '';
    if (settings.hour12) {
      ampm = h < 12 ? 'AM' : 'PM';
      h = h % 12 || 12;
      return { text: h + ':' + pad(now.getMinutes()) + (settings.showSeconds ? ':' + pad(now.getSeconds()) : ''), ampm, now };
    }
    return { text: pad(h) + ':' + pad(now.getMinutes()) + (settings.showSeconds ? ':' + pad(now.getSeconds()) : ''), ampm, now };
  }

  function renderClock() {
    const { text, ampm, now } = renderTimeString();
    useTextMode();
    timeEl.textContent = text;
    ampmEl.textContent = ampm;
    renderDate(now);
  }

  function renderFlip() {
    const { text, ampm, now } = renderTimeString();
    setFlipDigits(text);
    ampmEl.textContent = ampm;
    renderDate(now);
  }

  function renderFormat() {
    const now = new Date();
    useTextMode();
    timeEl.textContent = formatToken(settings.timeFormat, now);
    ampmEl.textContent = '';
    dateEl.classList.add('hidden');
  }

  function renderTimezone() {
    if (!settings.timezone2) {
      tzEl.classList.add('hidden');
      return;
    }
    try {
      const s = new Intl.DateTimeFormat('zh-CN', {
        timeZone: settings.timezone2, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(new Date());
      const name = settings.timezone2 === 'UTC' ? 'UTC' : settings.timezone2.split('/').pop();
      tzEl.textContent = name + ' ' + s;
      tzEl.classList.remove('hidden');
    } catch {
      tzEl.classList.add('hidden');
    }
  }

  function chimeIfDue() {
    if (settings.chimeInterval > 0) {
      const minute = Math.floor(Date.now() / 60000);
      if (minute % settings.chimeInterval === 0 && minute !== lastChimeKey) {
        lastChimeKey = minute;
        playChime();
      }
    }
  }

  function renderCountdown(cd) {
    const rem = cd - Date.now();
    if (rem <= 0) {
      useTextMode();
      timeEl.textContent = '00:00';
      ampmEl.textContent = '';
      dateEl.textContent = '专注完成';
      dateEl.classList.remove('hidden');
      if (!finishedNotified) {
        finishedNotified = true;
        playAlarm();
        window.clock.countdownDone();
      }
      return;
    }
    useTextMode();
    timeEl.textContent = formatCountdown(rem);
    ampmEl.textContent = '';
    dateEl.textContent = '专注倒计时';
    dateEl.classList.remove('hidden');
  }

  function render() {
    if (settings.countdownEnd) {
      tzEl.classList.add('hidden');
      renderCountdown(settings.countdownEnd);
      return;
    }
    chimeIfDue();
    if (settings.timeFormat) renderFormat();
    else if (settings.flipAnimation) renderFlip();
    else renderClock();
    renderTimezone();
  }

  // 秒数隐藏时按整分对齐刷新；倒计时状态下高频刷新保证流畅
  function nextDelay() {
    if (settings.countdownEnd) return 250;
    const secMode = settings.showSeconds || settings.flipAnimation || /s/i.test(settings.timeFormat || '');
    const interval = secMode ? 1000 : 60000;
    return interval - (Date.now() % interval) + 12;
  }

  function requestResize() {
    requestAnimationFrame(() => {
      const w = Math.ceil(wrapEl.offsetWidth) + 48;
      const h = Math.ceil(wrapEl.offsetHeight) + 36;
      window.clock.resize(w, h);
    });
  }

  function apply(s) {
    settings = s;
    if (!settings.countdownEnd) finishedNotified = false;
    const eff = Math.round((s.fontSize || 64) * (s.scale || 1));
    clockEl.style.setProperty('--fs', eff + 'px');
    clockEl.style.setProperty('--bg-alpha', s.opacity);
    clockEl.dataset.theme = settings.theme || 'auto';
    clockEl.dataset.font = settings.font || 'system';

    if (s.textColor) clockEl.style.setProperty('--text-c', s.textColor);
    else clockEl.style.removeProperty('--text-c');

    if (s.bgColor === 'none') {
      clockEl.style.setProperty('--bg-alpha', '0');
      clockEl.style.removeProperty('--bg-rgb');
    } else if (s.bgColor) {
      const rgb = hexToRgb(s.bgColor);
      if (rgb) clockEl.style.setProperty('--bg-rgb', rgb);
      else clockEl.style.removeProperty('--bg-rgb');
    } else {
      clockEl.style.removeProperty('--bg-rgb');
    }

    if (s.bgImage) {
      const uri = 'file:///' + encodeURI(String(s.bgImage).replace(/\\/g, '/'));
      bgEl.style.backgroundImage = "url('" + uri + "')";
      clockEl.classList.add('has-bg');
    } else {
      bgEl.style.backgroundImage = '';
      clockEl.classList.remove('has-bg');
    }

    // JSON 自定义主题：覆盖层，优先级高于文字/背景色与主题
    if (s.customTheme) {
      if (s.customTheme.bgRgb) clockEl.style.setProperty('--bg-rgb', s.customTheme.bgRgb);
      if (s.customTheme.textColor) clockEl.style.setProperty('--text-c', s.customTheme.textColor);
      if (s.customTheme.glow) clockEl.style.setProperty('--glow', s.customTheme.glow);
      if (s.customTheme.font) clockEl.dataset.font = s.customTheme.font;
    } else {
      clockEl.style.removeProperty('--glow');
    }

    clockEl.classList.toggle('acrylic', !!s.acrylic);
    document.body.classList.toggle('locked', !!s.locked);
    render();
    requestResize();
  }

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    window.clock.contextMenu();
  });

  // 手动拖动：pointer capture 保证移出窗口也能收到 pointerup；
  // 窗口移动由主进程按光标位置轮询完成（DIP 坐标一致）
  let dragging = false;
  clockEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || settings.locked) return;
    dragging = true;
    clockEl.setPointerCapture(e.pointerId);
    window.clock.dragStart();
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    if (clockEl.hasPointerCapture(e.pointerId)) clockEl.releasePointerCapture(e.pointerId);
    window.clock.dragEnd();
  };
  clockEl.addEventListener('pointerup', endDrag);
  clockEl.addEventListener('pointercancel', endDrag);

  // 滚轮缩放：内容与窗口等比联动
  clockEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (settings.locked) return;
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const ns = Math.min(2.5, Math.max(0.5, Math.round((settings.scale + delta) * 10) / 10));
    if (ns === settings.scale) return;
    settings.scale = ns;
    window.clock.setSetting({ scale: ns });
    apply(settings);
  }, { passive: false });

  window.clock.onSettings(apply);

  render();
  (function tick() {
    setTimeout(() => {
      render();
      tick();
    }, nextDelay());
  })();

  window.clock.ready();
})();