# XMind Reader Pro

> 一个轻量、快速的 XMind 文件阅读器。

> **English** | [中文](#xmind-reader-pro-中文)

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Turbo](https://img.shields.io/badge/monorepo-turbo-ff69b4.svg)](https://turbo.build/)
[![Electron](https://img.shields.io/badge/electron-30-9feaf9.svg)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/vite-5-646cff.svg)](https://vitejs.dev/)

支持 **XMind 2020+ / XMind Zen** (`.xmind`) 格式，三种使用方式：

- **桌面应用 (Electron)** - Windows / macOS / Linux
- **浏览器扩展 (WXT)** - Chrome / Edge / Firefox，侧边栏直接查看
- **纯网页版 (Vite)** - 浏览器打开即可使用，拖拽文件预览

---

## ✨ 特性

- 🚀 **零依赖安装** — 网页版打开即用，无账号、无登录
- 🧠 **完整内容解析** — 节点、层级、备注、标签、链接、标记、概要、边界、关系线
- 🖼️ **图片支持** — 节点内嵌图片、摘要图片均可查看，支持点击放大
- ✏️ **文本可选中复制** — 任意节点文本可直接选择复制到剪贴板
- 🌓 **深色模式** — 一键切换亮色/暗色主题
- 🔍 **全文搜索** — 高亮匹配节点
- 📐 **多种布局** — 思维导图、逻辑图、鱼骨图、组织结构图、树状图
- 📦 **导出 Markdown** — 一键把整个思维导图转为结构化 Markdown
- 🏗️ **Monorepo 架构** — core / renderer / ui-components / exporter 清晰分层，便于二次开发
- 🧪 **内置测试** — 核心解析层全量覆盖测试

---

## 📦 安装与使用

### 方式 1：网页版（推荐快速试用）

```bash
# 需要 pnpm
pnpm install
pnpm dev:web
```

浏览器打开 `http://localhost:5173`，把 `.xmind` 文件拖进页面即可。

构建生产版本：

```bash
pnpm build:web
# 产物在 apps/web/dist
```

### 方式 2：桌面应用 (Electron)

```bash
pnpm install
pnpm dev:electron
```

打包发布：

```bash
cd apps/electron
pnpm run dist
```

### 方式 3：浏览器扩展 (WXT)

```bash
cd apps/extension
pnpm run dev     # 开发模式，加载到浏览器
pnpm run build   # 打包
pnpm run zip     # 生成 .zip 用于发布到 Chrome Web Store
```

安装：`chrome://extensions` → 开启开发者模式 → 加载已解压的扩展，选择 `apps/extension/.output/chrome-mv3/`

---

## 🏗️ 项目结构

```
xmind-reader-pro/
├── apps/
│   ├── electron/           # Electron 桌面应用
│   ├── extension/          # 浏览器扩展 (WXT)
│   └── web/                # 纯网页版 (Vite)
└── packages/
    ├── core/               # 核心：ZIP 解析 + 布局引擎（无 UI 依赖）
    ├── renderer/           # SVG 渲染层（d3）
    ├── ui-components/      # React 组件 + zustand store
    └── exporter/           # 导出 Markdown / SVG / PNG / PDF
```

### 核心包简介

| 包 | 作用 |
|----|------|
| `@xmind-reader/core` | 解析 XMind 的 ZIP 内容（JSON/XML），提取节点、层级、附件、样式、主题；提供 `computeLayout()` 计算坐标 |
| `@xmind-reader/renderer` | 将布局结果转为 SVG DOM，支持缩放/平移/选中/高亮 |
| `@xmind-reader/ui-components` | React 组件：工具栏、搜索栏、Tab 切换、备注面板、图片预览灯箱 |
| `@xmind-reader/exporter` | 多格式导出 |

### 核心 API

```typescript
import { parseXMind, computeLayout, StructureClass } from '@xmind-reader/core';

// 1. 解析 XMind 文件
const data = await parseXMind(fileArrayBuffer);

// 2. 读取某个 Sheet
const sheet = data.sheets[0];

// 3. 计算布局（自动适配节点文本宽度）
const layout = computeLayout(
  sheet.rootTopic,
  sheet.structureClass,         // 'org.xmind.ui.mindmap' / 'logic.right' 等
  undefined,                    // 实测尺寸（可选）
  new Set(),                    // 折叠节点（可选）
  sheet.summaries || [],
  sheet.boundaries || [],
  sheet.theme                   // 主题（可选）
);

// 4. 渲染
// 使用 MindMapRenderer 类
```

---

## ⚡ 脚本速查

| 命令 | 作用 |
|------|------|
| `pnpm install` | 安装全部依赖 |
| `pnpm dev:web` | 启动网页版 |
| `pnpm dev:electron` | 启动 Electron 桌面版 |
| `pnpm build` | 构建全部包与应用 |
| `pnpm test` | 运行全部测试 |
| `pnpm clean` | 清理构建产物 |

---

## 🛠️ 开发

### 环境要求

- **Node.js** ≥ 18
- **pnpm** ≥ 9.10（已通过 `packageManager` 字段锁定）
- **操作系统**：Windows / macOS / Linux

### 工作流

```bash
# 1. 安装依赖
pnpm install

# 2. 开发 - 任选一种入口
pnpm dev:web
pnpm dev:electron

# 3. 运行测试（核心包）
pnpm test
```

### 支持的 XMind 版本

- ✅ XMind 2020 / XMind Zen（`.xmind` ZIP 格式，内含 `content.json`）
- ✅ XMind 8（`.xmind` ZIP 格式，内含 `content.xml`）
- ❌ XMind Legacy 旧版文件格式未完全覆盖

### 已知限制

1. 目前是**只读预览**，不含编辑功能
2. PDF 导出依赖 canvas，某些 PDF 复杂样式不完整
3. 极复杂的自定义主题（非 XMind 内置主题）样式可能有细微差异

---

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. **Fork** 本仓库
2. 创建特性分支：`git checkout -b feat/my-feature`
3. 提交改动：`git commit -am 'feat: add my feature'`
4. 推送分支：`git push origin feat/my-feature`
5. 发起 **Pull Request**

### 开发约定

- 使用 **pnpm workspace + Turborepo**
- TypeScript 严格模式 (`strict: true`)
- 遵循 Conventional Commits（`feat:` / `fix:` / `docs:` 等）
- 改动核心包时，建议补充测试

### 代码风格

- 2 空格缩进，LF 行尾
- 中文注释/文档优先，方便社区沟通

---

## 📄 License

MIT © 2026 XMind Reader Pro Contributors

详见 [LICENSE](LICENSE)

---

## 🙏 致谢

- [XMind](https://xmind.cn) — 优秀的思维导图工具（本项目为第三方阅读器，与 XMind 官方无关联）
- [electron-vite](https://electron-vite.org/) · [Vite](https://vitejs.dev/) · [WXT](https://wxt.dev/)
- [d3](https://d3js.org/) · [jszip](https://stuk.github.io/jszip/) · [zustand](https://github.com/pmndrs/zustand)

---

---

## 🇨🇳 中文说明

### 为什么做这个项目？

很多团队和个人使用 XMind 作为思考与笔记工具，但并非每个人都安装了软件。**XMind Reader Pro** 让你在不安装 XMind 的情况下，也能：

1. **在浏览器中查看** — 无需安装
2. **把内容转为 Markdown** — 方便导入到 Notion / Obsidian / VuePress 等工具
3. **在桌面应用中快速查阅** — 拖拽打开，键盘快捷键友好

### 功能速览

| 功能 | 网页版 | 桌面版 | 浏览器扩展 |
|------|--------|--------|-----------|
| 打开 .xmind 文件 | ✅ | ✅ | ✅ |
| 节点内容查看 | ✅ | ✅ | ✅ |
| 文本选中复制 | ✅ | ✅ | ✅ |
| 节点图片预览 | ✅ | ✅ | ✅ |
| 备注 / 标签 / 链接 | ✅ | ✅ | ✅ |
| 概要 / 边界 / 关系线 | ✅ | ✅ | ✅ |
| 搜索 / 高亮 | ✅ | ✅ | ✅ |
| 折叠 / 展开 | ✅ | ✅ | ✅ |
| 深色模式 | ✅ | ✅ | ✅ |
| 导出 Markdown | ✅ | ✅ | ✅ |
| 多 Sheet 切换 | ✅ | ✅ | ✅ |

### 键盘快捷键

- `Cmd/Ctrl + F` — 搜索
- `Cmd/Ctrl + 滚轮` — 缩放
- `Esc` — 取消选中 / 关闭灯箱

---

<p align="center">
Made with ❤️ — Happy reading, happy thinking!
</p>
