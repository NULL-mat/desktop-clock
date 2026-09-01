# 桌面时钟 DesktopClock

一个简洁的置顶桌面数字时钟，基于 Electron 构建。

## 功能

- 时:分:秒 大字显示，等宽数字不抖动
- 无边框半透明圆角卡片，跟随系统深浅色主题
- 窗口置顶，按住即可拖动到任意位置，重启后记住位置
- 托盘菜单：开机自启、窗口置顶开关、退出
- 单实例：重复启动只会唤起已有窗口
- 防时间漂移：每秒对齐系统时间，长时间挂机不偏移

## 使用

从 [Releases](../../releases) 下载 `DesktopClock-x.x.x.exe`，双击即可运行，无需安装。

运行后时钟贴在桌面最上层；退出请右键系统托盘图标 → 退出。

## 从源码运行

```bash
npm install
npm start
```

## 从源码打包

```bash
npm run build
```

产物为 `dist/DesktopClock-x.x.x.exe`（Windows 便携版）。

## 目录结构

| 文件 | 职责 |
|---|---|
| main.js | 主进程：窗口、托盘、置顶、位置记忆、开机自启 |
| index.html / style.css / clock.js | 渲染进程：界面与走时逻辑 |
