## Context

InvestManage 是一个基于 Next.js 16 + SQLite 的个人投资组合管理工具，当前只能通过命令行启动。目标用户是不懂技术的 Windows 投资者，需要"双击即用"的分发方式。

当前技术约束：
- better-sqlite3 是 native addon，需要对应平台的编译产物
- Next.js 16 支持 `output: 'standalone'` 模式，可生成自包含服务端
- 数据库文件 `data/invest.db` 需要在运行时可读写
- 应用启动时自动执行 drizzle 迁移和种子数据

## Goals / Non-Goals

**Goals:**
- 生成可在 Windows 上双击运行的分发包（zip）
- 用户无需安装 Node.js、npm 或任何开发工具
- 启动后自动打开浏览器访问应用
- 保持现有开发流程不变（`npm run dev` 照常工作）
- 业务代码零改动

**Non-Goals:**
- 不做 Electron/Tauri 桌面应用壳
- 不做自动更新机制
- 不做安装程序（.msi/.exe installer），直接 zip 解压即用
- 不做 Mac/Linux 支持（Windows 优先）
- 不做多用户/认证系统

## Decisions

### 1. 使用 Next.js standalone 模式而非 Electron

**选择**: Next.js `output: 'standalone'` + 嵌入 node.exe

**理由**:
- Electron 需要引入整个 Chromium（~150MB），包体积大
- Electron 需要编写主进程代码、preload 脚本，改动量中等
- standalone 模式是 Next.js 原生支持，只需一行配置
- 用户在浏览器中操作投资工具是自然的交互方式

**替代方案**: Electron（包大、改动多）、Tauri（需要 Rust 工具链、前后端适配改动大）

### 2. 嵌入 Node.js 二进制而非要求用户安装

**选择**: 将 Windows x64 版 node.exe 打入分发包

**理由**:
- 目标用户不懂技术，不能要求安装 Node.js
- node.exe 单文件约 40-50MB，可接受
- 版本可控，避免用户环境差异

### 3. 使用 .bat 批处理作为启动入口

**选择**: `启动.bat` 双击启动

**理由**:
- Windows 用户最熟悉的启动方式
- 无需额外依赖
- 可以设置工作目录、环境变量

### 4. 打包脚本使用 Node.js 编写

**选择**: `scripts/package.js` 用 Node.js 编写打包逻辑

**理由**:
- 开发者已有 Node.js 环境
- 可以用 fs 模块操作文件，无需额外工具
- 负责：构建 → 复制 standalone 产物 → 下载/复制 node.exe → 复制静态资源和迁移文件 → 生成 zip

### 5. 数据目录放在程序根目录下

**选择**: `data/invest.db` 位于分发包根目录

**理由**:
- 与开发环境一致（`process.cwd()/data/`）
- standalone 模式下 `process.cwd()` 就是启动目录
- 用户可以直接看到和备份自己的数据文件

## Risks / Trade-offs

- **[包体积较大 ~60-80MB]** → 可接受，一次性下载；后续可考虑压缩优化
- **[better-sqlite3 native addon 兼容性]** → standalone 模式会自动包含正确平台的 .node 文件，需在 Windows 上构建
- **[端口冲突]** → server.js 中检测 3000 端口是否被占用，若占用则自动递增端口
- **[用户误删文件]** → 数据库在 data/ 子目录，与程序文件分离，降低误删风险
- **[Windows Defender 可能拦截 .bat]** → 常见问题，可在 README 中说明
