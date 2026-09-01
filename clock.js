(function () {
  const timeEl = document.getElementById('time');
  const ampmEl = document.getElementById('ampm');
  const dateEl = document.getElementById('date');
  const wrapEl = document.getElementById('wrap');

  const pad = (n) => String(n).padStart(2, '0');
  const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  let settings = {
    hour12: false,
    showSeconds: true,
    showDate: false,
    fontSize: 64,
    opacity: 0.8,
    locked: false
  };

  function render() {
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
  }

  // 秒数隐藏时按整分对齐刷新，减少无谓渲染
  function nextDelay() {
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
    const clockEl = document.getElementById('clock');
    clockEl.style.setProperty('--fs', s.fontSize + 'px');
    clockEl.style.setProperty('--bg-alpha', s.opacity);
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
  const clockEl = document.getElementById('clock');
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
