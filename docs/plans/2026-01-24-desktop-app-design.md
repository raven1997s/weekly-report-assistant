# 桌面应用打包设计文档（v2.0）

**日期**: 2026-01-28
**版本**: 2.0（统一代码方案）
**项目**: 智能周报助手
**GitHub**: https://github.com/raven1997s/weekly-report-assistant

---

## 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 2.0 | 2026-01-28 | **重大调整**：采用统一代码方案，Docker 和桌面应用共用同一套代码 |
| 1.0 | 2026-01-24 | 初始设计（独立 bundle/ 目录方案，已废弃） |

---

## 1. 概述

### 1.1 目标

**一套代码，两种部署方式**：
- **Docker 部署**：作者生产环境使用
- **桌面应用**：非技术用户双击运行

### 1.2 核心原则

**代码统一性优先**：不维护两套代码，确保长期维护成本最低。

### 1.3 技术方案

使用 `pkg` 工具将 Node.js 后端打包为可执行文件，前端 Vue 代码打包为静态文件，整体分发为桌面应用。

---

## 2. 整体架构

### 2.1 统一代码架构

```
weekly-report-assistant/
├── server/           # 后端代码（统一）
│   ├── db.js         # 数据库层（better-sqlite3）
│   ├── api.js        # API 路由
│   └── cron.js       # 定时任务
├── src/              # 前端代码（统一）
├── dist/             # 前端构建产物
├── data/             # Docker 版本数据目录
├── scripts/          # 桌面应用打包脚本（新增）
│   └── build-desktop.js
└── package.json      # 统一依赖配置
```

### 2.2 两种部署方式对比

| 方面 | Docker 部署 | 桌面应用 |
|------|------------|----------|
| 代码 | ✅ 完全相同 | ✅ 完全相同 |
| 数据库 | `data/app.db` | `~/.weekly-report-assistant/app.db` |
| 启动方式 | `docker-compose up` | 双击可执行文件 |
| 访问方式 | 浏览器访问 localhost | 自动打开浏览器 |
| 数据库库 | `better-sqlite3` | `better-sqlite3`（内嵌） |
| 用户 | 作者（生产环境） | 非技术用户 |

### 2.3 桌面应用打包结构

```
weekly-report-assistant.exe (或 .app)
│
├── Node.js 运行时（内嵌）
├── Express 后端代码（server/）
├── better-sqlite3（内嵌）
├── Vue 前端静态文件（dist/）
└── 启动脚本
```

### 2.4 运行流程

1. **用户双击图标** → 启动应用
2. **后台启动 Express 服务**（监听 localhost:3000）
3. **自动打开浏览器** → 访问 http://localhost:3000
4. **Vue 前端与后端通信** → 正常使用
5. **关闭浏览器窗口** → 后台服务继续运行
6. **通过托盘图标退出** → 真正关闭服务

### 2.5 数据存储

| 部署方式 | 数据库位置 |
|----------|------------|
| Docker | `./data/app.db`（项目目录下） |
| 桌面应用 | `~/.weekly-report-assistant/app.db`（用户目录下） |

**重要**：数据文件格式完全兼容，都是标准 SQLite 格式。

---

## 3. 技术实现

### 3.1 核心工具

- **pkg** - 打包 Node.js 应用为可执行文件
- **better-sqlite3** - SQLite 数据库库（统一使用）
- **vite** - 前端构建（现有）

### 3.2 关键技术决策

#### 3.2.1 数据库库统一：`sqlite3` → `better-sqlite3`

**原因：**
- `pkg` 对 `better-sqlite3` 的支持更好（原生模块兼容性）
- API 更简洁（同步 vs 异步回调）
- 性能更优

**数据兼容性：**
- ✅ 两个库都操作标准 SQLite 数据库文件
- ✅ 现有 `data/app.db` **完全兼容**，无需迁移
- ✅ 替换库不影响数据文件

**改动范围：**
- 仅需修改 `server/db.js`（约 380 行）
- `server/api.js` 和其他文件**无需改动**（API 封装层隔离了变化）

#### 3.2.2 数据路径动态配置

根据部署方式自动选择数据目录：

```javascript
// server/db.js
import os from 'os'
import path from 'path'

// 桌面应用：用户目录
// Docker：项目目录
const isDesktop = process.env.DESKTOP_APP === 'true'
const DATA_DIR = isDesktop
  ? path.join(os.homedir(), '.weekly-report-assistant')
  : path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'app.db')
```

### 3.3 关键改动

#### 3.3.1 数据库路径动态配置

```javascript
// server/db.js
import os from 'os'
import path from 'path'
import fs from 'fs'

// 根据环境变量选择数据目录
const isDesktop = process.env.DESKTOP_APP === 'true'
const DATA_DIR = isDesktop
  ? path.join(os.homedir(), '.weekly-report-assistant')
  : path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'app.db')

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  console.log(`[DB] 创建数据目录: ${DATA_DIR}`)
}
```

#### 3.3.2 数据库 API 改造（sqlite3 → better-sqlite3）

**改动前（sqlite3）：**
```javascript
import sqlite3 from 'sqlite3'

export function createDbConnection() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err)
      else resolve(db)
    })
  })
}

export function queryAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}
```

**改动后（better-sqlite3）：**
```javascript
import Database from 'better-sqlite3'

export function createDbConnection() {
  // better-sqlite3 同步 API，更简洁
  const db = new Database(DB_PATH)
  console.log(`[DB] 已连接: ${DB_PATH}`)
  return db
}

export function queryAll(db, sql, params = []) {
  // 直接返回结果，无需回调
  return db.prepare(sql).all(...params)
}
```

**代码量减少约 30%，且更易读！**

#### 3.3.3 package.json 配置

```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run vite\"",
    "server": "node server/api.js",
    "vite": "vite",
    "build": "vite build",
    "build:desktop": "node scripts/build-desktop.js"
  },
  "dependencies": {
    "better-sqlite3": "^9.0.0",
    "express": "^5.2.1",
    "node-schedule": "^2.1.1"
  },
  "devDependencies": {
    "pkg": "^5.8.1"
  },
  "pkg": {
    "scripts": [
      "server/**/*.js"
    ],
    "assets": [
      "dist/**/*",
      "node_modules/better-sqlite3/**/*"
    ],
    "targets": [
      "node18-win-x64",
      "node18-macos-x64",
      "node18-linux-x64"
    ],
    "outputPath": "release"
  }
}
```

**关键点：**
- 移除 `sqlite3`，使用 `better-sqlite3`
- 添加 `build:desktop` 脚本
- pkg 配置直接打包 `server/` 目录（无需 bundle/）

---

## 4. 打包构建流程

### 4.1 打包脚本

```javascript
// scripts/build-desktop.js
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('📦 开始打包桌面应用...\n')

// 1. 清理旧文件
console.log('1️⃣ 清理旧文件...')
fs.rmSync('release', { recursive: true, force: true })

// 2. 构建前端
console.log('2️⃣ 构建前端...')
execSync('npm run build', { stdio: 'inherit' })

// 3. 执行 pkg 打包
console.log('3️⃣ 打包可执行文件...')
execSync('npx pkg .', { stdio: 'inherit' })

console.log('\n✅ 打包完成！')
console.log('📂 输出目录：release/')
console.log('🚀 可以在 release/ 目录找到可执行文件')
```

### 4.2 打包命令

```bash
npm run build
```

---

## 5. 安装与分发

### 5.1 分发方式

**直接分发可执行文件**（第一阶段）

```
release/
├── weekly-report-assistant-win.exe    # Windows
├── weekly-report-assistant-macos      # macOS
└── weekly-report-assistant-linux      # Linux
```

用户操作：
1. 从 GitHub Releases 下载对应系统的文件
2. 双击运行即可
3. 首次运行自动创建数据库

### 5.2 GitHub Releases

创建 Release 并上传打包好的文件：

```
Releases → Create new release
标签：v1.0.0
标题：智能周报助手 v1.0.0
描述：更新内容...

上传文件：
☑️ weekly-report-assistant-win.exe
☑️ weekly-report-assistant-macos
☑️ weekly-report-assistant-linux
```

用户下载地址：
```
https://github.com/raven1997s/weekly-report-assistant/releases
```

---

## 6. 托盘图标与用户体验

### 6.1 系统托盘图标

应用运行时在系统托盘显示图标，提供右键菜单：

```
📊 智能周报助手
├── 打开应用
├── 服务状态：运行中 (端口 3000)
├── ─────────────
├── 数据目录
├── 设置端口
├── ─────────────
└── 退出应用
```

### 6.2 端口冲突处理

```javascript
import net from 'net'

async function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(port, () => {
      server.once('close', () => resolve(true))
      server.close()
    })
    server.on('error', () => resolve(false))
  })
}

// 如果 3000 被占用，尝试其他端口
let port = 3000
while (!(await checkPort(port))) {
  port++
}
```

### 6.3 错误处理

- 首次启动失败 → 显示友好错误提示
- 数据库损坏 → 自动备份并重建
- 端口占用 → 自动切换端口

---

## 7. GitHub 自动化

### 7.1 GitHub Actions 自动发布

创建 `.github/workflows/release.yml`：

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'  # 当推送 v1.0.0 这样的标签时触发

jobs:
  release:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
        include:
          - os: windows-latest
            target: node18-win-x64
            output: weekly-report-assistant-win.exe
          - os: macos-latest
            target: node18-macos-x64
            output: weekly-report-assistant-macos
          - os: ubuntu-latest
            target: node18-linux-x64
            output: weekly-report-assistant-linux

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Upload to Release
        uses: softprops/action-gh-release@v1
        with:
          files: release/${{ matrix.output }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 7.2 发布流程

您只需执行：

```bash
# 打标签并推送
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 自动：
- 检出代码
- 安装依赖
- 执行打包（三个平台并行）
- 创建 Release
- 上传可执行文件

### 7.3 更新检查

#### 7.3.1 应用启动时检查更新

```javascript
const CURRENT_VERSION = require('./package.json').version

async function checkUpdate() {
  try {
    const response = await fetch('https://api.github.com/repos/raven1997s/weekly-report-assistant/releases/latest')
    const latest = await response.json()

    const latestVersion = latest.tag_name.replace('v', '')

    if (latestVersion > CURRENT_VERSION) {
      console.log(`🔔 发现新版本：${latest.tag_name}`)
      console.log(`📥 下载地址：${latest.html_url}`)

      // Windows 弹窗通知
      if (process.platform === 'win32') {
        exec(`mshta vbscript:msgbox("智能周报助手有新版本 ${latest.tag_name}，请前往 GitHub 下载更新。",0,"更新通知")(window.close)`)
      }
    }
  } catch (error) {
    console.log('检查更新失败，忽略')
  }
}

// 启动时检查
checkUpdate()
```

#### 7.3.2 手动更新流程

1. 应用启动时检查 GitHub API
2. 发现有新版本 → 弹出通知
3. 用户点击下载链接 → 跳转到 GitHub Releases
4. 下载新版 → 覆盖旧版即可

---

## 8. 实施步骤

### 8.1 第一阶段：基础打包

1. 创建 `bundle/server.js` 后端入口
2. 调整数据库路径配置
3. 编写 `build.js` 打包脚本
4. 本地测试打包

### 8.2 第二阶段：GitHub Actions

1. 创建 `.github/workflows/release.yml`
2. 测试自动发布流程
3. 发布第一个版本

### 8.3 第三阶段：用户体验优化

1. 添加系统托盘图标
2. 完善错误处理
3. 添加更新检查

---

## 9. 注意事项

### 9.1 SQLite 兼容性

pkg 打包 better-sqlite3 时需要额外配置，确保原生模块正确打包。

### 9.2 跨平台测试

每个平台的可执行文件都需要在对应系统上测试。

### 9.3 数据迁移

如果用户从旧版本（Docker）迁移到新版本（桌面应用），需要提供数据迁移方案。

---

## 10. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | - | 初始设计 |
