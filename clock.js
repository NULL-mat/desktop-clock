(function () {
  const timeEl = document.getElementById('time');
  const ampmEl = document.getElementById('ampm');
  const dateEl = document.getElementById('date');
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
    countdownEnd: null
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

  function renderCountdown(cd) {
    const rem = cd - Date.now();
    if (rem <= 0) {
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
    timeEl.textContent = formatCountdown(rem);
    ampmEl.textContent = '';
    dateEl.textContent = '专注倒计时';
    dateEl.classList.remove('hidden');
  }

  function renderClock() {
    const now = new Date();
    let h = now.getHours();
    let ampm = '';

    if (settings.hour12) {
      ampm = h < 12 ? 'AM' : 'PM';
      h = h % 12 || 12;
    } else {
      h = pad(h);
    }

    let t = h + ':' + pad(now.getMinutes());
    if (settings.showSeconds) t += ':' + pad(now.getSeconds());

    timeEl.textContent = t;
    ampmEl.textContent = ampm;

    if (settings.showDate) {
      dateEl.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + WEEK[now.getDay()];
      dateEl.classList.remove('hidden');
    } else {
      dateEl.classList.add('hidden');
    }

    // 整点/间隔报时
    if (settings.chimeInterval > 0) {
      const minute = Math.floor(Date.now() / 60000);
      if (minute % settings.chimeInterval === 0 && minute !== lastChimeKey) {
        lastChimeKey = minute;
        playChime();
      }
    }
  }

  function render() {
    if (settings.countdownEnd) {
      renderCountdown(settings.countdownEnd);
    } else {
      renderClock();
    }
  }

  // 秒数隐藏时按整分对齐刷新；倒计时状态下高频刷新保证流畅
  function nextDelay() {
    if (settings.countdownEnd) return 250;
    const interval = settings.showSeconds ? 1000 : 60000;
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

    if (s.bgColor) {
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