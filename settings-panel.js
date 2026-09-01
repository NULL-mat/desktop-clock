(function () {
  const $ = (id) => document.getElementById(id);
  let updating = false;

  function set(key, value) {
    const patch = {};
    patch[key] = value;
    window.clock.setSetting(patch);
  }

  function apply(s) {
    updating = true;

    $('hour12').checked = !!s.hour12;
    $('showSeconds').checked = !!s.showSeconds;
    $('showDate').checked = !!s.showDate;
    $('timeFormat').value = s.timeFormat || '';

    $('fontSize').value = String(s.fontSize || 64);
    $('fontSizeVal').textContent = (s.fontSize || 64) + 'px';

    $('theme').value = s.theme || 'auto';
    $('font').value = s.font || 'system';
    $('textColor').value = s.textColor || '';
    $('bgColor').value = s.bgColor || '';
    $('bgImageName').textContent = s.bgImage ? String(s.bgImage).split(/[\\/]/).pop() : '未设置';

    $('flipAnimation').checked = !!s.flipAnimation;
    $('acrylic').checked = !!s.acrylic;
    $('customThemeName').textContent = s.customTheme ? '已导入（覆盖主题与颜色）' : '未导入';

    $('scale').value = String(s.scale || 1);
    $('opacity').value = String(s.opacity || 0.8);
    $('alwaysOnTop').checked = s.alwaysOnTop !== false;
    $('locked').checked = !!s.locked;
    $('clickThrough').checked = !!s.clickThrough;
    $('oledShift').checked = !!s.oledShift;

    const cdMin = s.countdownEnd ? Math.max(1, Math.round((s.countdownEnd - Date.now()) / 60000)) : 0;
    $('countdown').value = String(cdMin);
    $('chimeInterval').value = String(s.chimeInterval || 0);
    $('timezone2').value = s.timezone2 || '';

    updating = false;
  }

  function bindCheck(id, key) {
    $(id).addEventListener('change', () => {
      if (updating) return;
      set(key, $(id).checked);
    });
  }

  function bindSelect(id, key, map) {
    $(id).addEventListener('change', () => {
      if (updating) return;
      const raw = $(id).value;
      set(key, map ? map(raw) : raw);
    });
  }

  bindCheck('hour12', 'hour12');
  bindCheck('showSeconds', 'showSeconds');
  bindCheck('showDate', 'showDate');
  bindSelect('timeFormat', 'timeFormat');

  $('fontSize').addEventListener('change', () => {
    if (updating) return;
    const v = parseInt($('fontSize').value, 10);
    $('fontSizeVal').textContent = v + 'px';
    set('fontSize', v);
  });

  bindSelect('theme', 'theme');
  bindSelect('font', 'font');
  bindSelect('textColor', 'textColor');
  bindSelect('bgColor', 'bgColor');

  $('#pickBg').addEventListener('click', () => window.clock.pickBackground());
  $('#clearBg').addEventListener('click', () => set('bgImage', ''));

  bindCheck('flipAnimation', 'flipAnimation');
  bindCheck('acrylic', 'acrylic');

  $('#pickJson').addEventListener('click', () => window.clock.pickJsonTheme());
  $('#clearJson').addEventListener('click', () => set('customTheme', null));

  bindSelect('scale', 'scale', (v) => parseFloat(v));
  bindSelect('opacity', 'opacity', (v) => parseFloat(v));
  bindCheck('alwaysOnTop', 'alwaysOnTop');
  bindCheck('locked', 'locked');
  bindCheck('clickThrough', 'clickThrough');
  bindCheck('oledShift', 'oledShift');

  bindSelect('countdown', 'countdownEnd', (v) => {
    const m = parseInt(v, 10);
    return m > 0 ? Date.now() + m * 60000 : null;
  });
  bindSelect('chimeInterval', 'chimeInterval', (v) => parseInt(v, 10));
  bindSelect('timezone2', 'timezone2');

  window.clock.onSettings(apply);
  window.clock.ready();
})();