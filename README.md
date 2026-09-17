# dsh-update-radar

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）更新雷达插件：自动检测 GitHub 新版本并在**侧边栏顶部**显示蓝色更新提示。

- **零依赖、零构建**：浏览器半侧是手写的 lazy-CJS bundle，只 `require('react')`，不需要构建工具。
- **不改宿主源码**：不碰 DSH 的 `src/`，一切通过 profile 插件机制注册。
- **MIT**，无任何凭据、账号或本机路径硬编码。

> 已验证环境：DSH **v0.1.6-alpha.1**（Windows 源码构建）+ Chrome `--app`。其他版本/内核未验证。

---

## 功能

| 功能 | 说明 |
|---|---|
| 版本检测 | 自动请求 GitHub API 获取 `deepseek-ai/deepseek-harness` 的最新 tag |
| 蓝色提示 | 有新版本时在侧边栏顶部显示蓝色 badge，如 `🔄 v0.1.7-alpha.1` |
| 一键跳转 | 点击蓝色提示直接跳转到 GitHub tags 页面下载新版本 |
| 定时检查 | 每 30 分钟自动检查一次（带本地缓存，减少 API 调用） |
| 零干扰 | 无更新时不显示任何内容 |

### 截图

```
无更新时：侧边栏保持原样
有更新时：🔄 v0.1.7-alpha.1  （蓝色文字，点击跳转 GitHub）
```

---

## 安装

### 方式一：使用安装脚本（推荐）

```powershell
cd "E:\Deepseek harness制作内容\dsh-update-radar"
node tools/install.cjs
```

### 方式二：使用 DSH CLI

```powershell
cd E:\DSH-OneClick
dsh.cmd plugin --profile web add link:"E:\Deepseek harness制作内容\dsh-update-radar"
```

### 方式三：从 GitHub 装

```powershell
dsh plugin --profile web add github:GIN0076/dsh-update-radar
```

安装后需要：

1. **重启 DSH 服务**（托盘图标右键 → 重新启动服务，或双击桌面图标）
2. **刷新浏览器页面**（Ctrl+Shift+R）

---

## 卸载

```powershell
cd "E:\Deepseek harness制作内容\dsh-update-radar"
node tools/install.cjs --uninstall
```

或手动：

1. 在 `~/.dsh/profiles/web/package.json` 的 `dependencies` 中删除 `dsh-update-radar`
2. 在 `~/.dsh/profiles/web/cordis.patch.yml` 中删除 `dsh-update-radar` 相关的 insert 条目
3. 在 profile 目录运行 `pnpm install`
4. 重启 DSH 服务

---

## 技术细节

### 架构

- **纯 Client 端实现**：所有逻辑在浏览器中运行，无需 Host 端代码
- **使用 `sidebar.panellist` 槽口**注册 UI 到侧边栏顶部
- **使用 `window.__ModuleLoader__.load()`** 格式加载（DSH 静态插件要求）

### 版本比较

- 解析 GitHub tag 名称（如 `dsh-v0.1.7-alpha.1`）为 semver 格式
- 与本地版本（硬编码在 client.js 中）比较
- 支持预发布版本（alpha/beta/rc）

### 缓存

- 使用 `localStorage` 缓存检查结果（30 分钟 TTL）
- 减少 GitHub API 调用（未认证限制 60 次/小时）

### 错误处理

- GitHub API 请求失败时静默降级（不显示错误）
- 支持 15 秒超时
- 网络不可用时不影响 DSH 正常使用

---

## 已知限制

- 需要网络连接才能检查更新
- GitHub API 有速率限制（未认证 60 次/小时）
- 如果本机有 SSL 问题（schannel），可能无法连接 GitHub（可通过配置 openssl 后端解决）
- 版本号目前硬编码在 client.js 中，需要手动更新

---

## 开发

### 文件结构

```
dsh-update-radar/
├── package.json          # 包配置，声明 dsh.client
├── LICENSE               # MIT 许可证
├── README.md             # 本文档
├── .gitignore            # Git 忽略规则
├── lib/
│   ├── index.js          # Host 端（空，所有逻辑在客户端）
│   └── client.js         # Client 端（版本检测 + UI）
└── tools/
    └── install.cjs       # 安装/卸载脚本
```

### 关键文件说明

- **`lib/client.js`**：使用 `window.__ModuleLoader__.load()` 格式的 lazy-CJS bundle，包含：
  - semver 版本解析与比较
  - GitHub API 请求（XMLHttpRequest）
  - localStorage 缓存
  - React 组件（蓝色 badge）
  - Cordis 插件注册（`sidebar.panellist`）

- **`package.json`**：必须包含：
  - `"type": "module"`：ESM 支持
  - `"dsh.client": { "platform": "web" }`：声明客户端平台
  - `"exports": { "./client": "./lib/client.js" }`：客户端入口

### 踩坑记录

| 坑 | 现象 | 解法 |
|---|---|---|
| `cordis.patch.yml` insert 格式 | 启动崩溃 `TypeError: forEach is not a function` | insert 必须是**数组**，不是字符串 |
| 静态 client.js 模块格式 | 日志报 `failed to import` | 必须用 `window.__ModuleLoader__.load()` 包裹 |
| pnpm link 含空格路径 | 路径被截断 | 手动编辑 package.json 修正路径 |

---

## 版本历史

- **0.1.0** (2026-09-20): 初始版本
  - GitHub 版本检测
  - 蓝色 badge 显示
  - 30 分钟定时检查
  - localStorage 缓存

---

## 许可证

[MIT](LICENSE)
