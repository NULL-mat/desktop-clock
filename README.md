# 桌面时钟 DesktopClock

一个简洁的置顶桌面数字时钟，基于 Electron 构建。

## 功能

- 时:分:秒 大字显示，等宽数字不抖动
- 12/24 小时制切换（12 小时制带 AM/PM 角标）
- 秒数、日期（n月n日 周x）显隐可开关；秒数隐藏后按整分刷新更省电
- 字号调节（24–200px），窗口随字号自适应缩放并保持居中
- 滚轮缩放（50%–250%），内容与窗口等比联动
- 背景透明度调节（20%–100%），文字始终清晰
- 主题预设：跟随系统 / 暗夜黑 / 极简白 / 翻页钟 / 霓虹 / 终端绿
- 字体选择：系统 / 等宽 / 优雅衬线 / 几何
- 文字与背景颜色自定义（8 色预设，可跟随主题）
- 背景图片自定义（本地图片铺满圆角卡片）
- 专注倒计时（5/10/25/45/60 分钟，结束时提示音提醒）
- 整点/间隔报时（关闭 / 每 15 / 30 / 60 分钟轻音提示）
- 点击穿透：时钟贴在壁纸层不挡操作（Ctrl+Alt+D 或托盘切回）
- 右键快捷菜单：全部设置直达，托盘菜单一并同步
- 位置锁定：锁定后时钟不可拖动，防止误碰
- 窗口置顶，重启后记住位置（自动迁移 v1.0 旧状态）
- 开机自启（支持便携版 exe 路径）
- 单实例：重复启动只会唤起已有窗口
- 防时间漂移：对齐系统时间整秒/整分触发，长时间挂机不偏移

## 使用

从 [Releases](../../releases) 下载 `DesktopClock-x.x.x.exe`，双击即可运行，无需安装。

运行后时钟贴在桌面最上层；右键时钟打开快捷菜单，退出也可通过托盘图标。

## 设置持久化

所有显示与窗口设置保存在 `%APPDATA%\desktop-clock\settings.json`（便携版运行时位于 exe 同目录旁的 `DesktopClock` 数据目录）。

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

若本机安全软件（如腾讯电脑管家）的实时扫描在打包瞬间锁定新建的 exe，导致 rcedit 报 `Unable to commit changes`，可分两步完成：先 `npm run build`（在 rcedit 处失败但 `dist/win-unpacked` 已完整），等待数秒后手动对 `dist/win-unpacked/DesktopClock.exe` 重跑 rcedit 命令，再执行 `npx electron-builder --win portable --prepackaged dist/win-unpacked` 生成便携版。

## 目录结构

| 文件 | 职责 |
|---|---|
| main.js | 主进程：窗口、托盘/右键菜单、置顶、位置记忆、开机自启、窗口自适应 |
| settings.js | 设置存储：默认值、读写与校验 |
| preload.js | IPC 桥：渲染进程与主进程的设置同步 |
| index.html / style.css / clock.js | 渲染进程：界面、走时与样式应用 |
