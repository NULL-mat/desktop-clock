(function () {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  var palette = [accent, accent2, '#A9AEFF', '#1DC981', '#EFAA17'];
  var baseText = { color: muted, fontSize: 12 };

  // ===== Chart 1: 六维能力雷达 =====
  var radarEl = document.getElementById('chart-radar');
  if (radarEl) {
    var radar = echarts.init(radarEl, null, { renderer: 'svg' });
    radar.setOption({
      animation: false,
      tooltip: { appendToBody: true },
      legend: {
        bottom: 0,
        textStyle: { color: muted, fontSize: 12 },
        itemWidth: 14,
        itemHeight: 8
      },
      radar: {
        center: ['50%', '48%'],
        radius: '62%',
        indicator: [
          { name: '显示自定义', max: 5 },
          { name: '主题美观', max: 5 },
          { name: '窗口管理', max: 5 },
          { name: '计时提醒', max: 5 },
          { name: '系统集成', max: 5 },
          { name: '分发工程', max: 5 }
        ],
        axisName: { color: ink, fontSize: 12, fontWeight: 600 },
        splitLine: { lineStyle: { color: rule } },
        splitArea: { areaStyle: { color: ['transparent', 'rgba(75,63,227,0.03)'] } },
        axisLine: { lineStyle: { color: rule } }
      },
      series: [{
        type: 'radar',
        symbolSize: 4,
        data: [
          { value: [5, 5, 5, 4, 4, 4], name: '本项目 (v1.3.0)', itemStyle: { color: accent }, lineStyle: { width: 3, color: accent }, areaStyle: { opacity: 0.25, color: accent } },
          { value: [5, 5, 4, 4, 4, 5], name: 'DesktopClock (danielchalmers)', itemStyle: { color: accent2 }, lineStyle: { width: 2 } },
          { value: [4, 5, 4, 3, 3, 3], name: '悬浮时钟 (微软商店)', itemStyle: { color: '#A9AEFF' }, lineStyle: { width: 2 } },
          { value: [4, 3, 3, 1, 4, 4], name: 'ElevenClock', itemStyle: { color: '#1DC981' }, lineStyle: { width: 2 } },
          { value: [1, 4, 1, 1, 3, 4], name: 'Fliqlo', itemStyle: { color: '#EFAA17' }, lineStyle: { width: 2 } }
        ]
      }]
    });
    window.addEventListener('resize', function () { radar.resize(); });
  }

  // ===== Chart 2: 改进项优先级矩阵 =====
  var scatterEl = document.getElementById('chart-scatter');
  if (scatterEl) {
    var items = [
      // name, cost(1-5), value(1-5), tier: p0/p1/p2
      ['12/24 小时制', 1, 4.2, 'p0'],
      ['秒/日期显隐', 1, 4.0, 'p0'],
      ['右键快捷菜单', 1, 4.0, 'p0'],
      ['位置锁定', 1, 3.0, 'p0'],
      ['字号调节', 1.5, 4.0, 'p0'],
      ['透明度控制', 1.5, 4.0, 'p0'],
      ['玻璃拟态', 2, 3.2, 'p1'],
      ['窗口缩放', 2.5, 4.0, 'p1'],
      ['翻页时钟动效', 3, 4.8, 'p1'],
      ['设置面板', 3, 4.5, 'p1'],
      ['主题预设系统', 3, 5.0, 'p1'],
      ['整点报时', 2, 3.0, 'p2'],
      ['OLED 防烧屏', 2, 2.2, 'p2'],
      ['世界时钟', 3, 3.2, 'p2'],
      ['点击穿透', 3, 2.8, 'p2'],
      ['自定义格式编辑器', 4, 3.4, 'p2'],
      ['专注倒计时', 4, 4.3, 'p2'],
      ['JSON 主题系统', 5, 3.0, 'p2']
    ];
    var tierColor = { p0: accent, p1: accent2, p2: muted };
    var seriesMap = {};
    items.forEach(function (it) {
      var t = it[3];
      if (!seriesMap[t]) seriesMap[t] = [];
      seriesMap[t].push({ name: it[0], value: [it[1], it[2]] });
    });
    var tierName = { p0: 'P0 追赶（v1.1.0）', p1: 'P1 美观跃迁（v1.2.0/v1.3.0）', p2: 'P2 差异化（v1.2.0/v1.3.0）' };

    var scatter = echarts.init(scatterEl, null, { renderer: 'svg' });
    scatter.setOption({
      animation: false,
      color: [accent, accent2, muted],
      tooltip: {
        appendToBody: true,
        formatter: function (p) {
          return p.data.name + '<br/>成本: ' + p.data.value[0] + ' / 5　价值: ' + p.data.value[1] + ' / 5';
        }
      },
      legend: { bottom: 0, textStyle: { color: muted, fontSize: 12 }, itemWidth: 12, itemHeight: 8 },
      grid: { left: 56, right: 30, top: 36, bottom: 60 },
      xAxis: {
        name: '开发成本 →',
        nameLocation: 'end',
        nameTextStyle: { color: muted, fontSize: 11 },
        min: 0.5, max: 5.5,
        splitLine: { lineStyle: { color: rule, type: 'dashed' } },
        axisLabel: baseText,
        axisLine: { lineStyle: { color: rule } }
      },
      yAxis: {
        name: '用户价值 →',
        nameLocation: 'end',
        nameTextStyle: { color: muted, fontSize: 11 },
        min: 1.5, max: 5.5,
        splitLine: { lineStyle: { color: rule, type: 'dashed' } },
        axisLabel: baseText,
        axisLine: { lineStyle: { color: rule } }
      },
      series: Object.keys(seriesMap).map(function (t) {
        return {
          name: tierName[t],
          type: 'scatter',
          symbolSize: 14,
          itemStyle: {
            color: tierColor[t],
            opacity: 0.88,
            borderColor: bg2,
            borderWidth: 1.5
          },
          label: {
            show: true,
            position: 'top',
            distance: 6,
            color: ink,
            fontSize: 11,
            formatter: function (p) { return p.data.name; }
          },
          labelLayout: { hideOverlap: true },
          data: seriesMap[t]
        };
      })
    });
    window.addEventListener('resize', function () { scatter.resize(); });
  }
})();
