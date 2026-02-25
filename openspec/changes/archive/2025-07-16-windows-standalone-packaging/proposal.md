## Why

当前应用只能通过 `npm run dev` 或 `npm run build && npm start` 启动，目标用户是不懂技术的投资者，无法操作命令行。需要将应用打包为 Windows 可分发的独立程序，用户双击即可启动使用。

## What Changes

- 启用 Next.js `output: 'standalone'` 模式，生成自包含的服务端产物
- 新增 `server.js` 启动脚本，负责启动 Next.js 服务并自动打开浏览器
- 新增 `启动.bat` 批处理文件作为用户双击入口
- 新增 `scripts/package.js` 打包脚本，将 standalone 产物 + 嵌入式 Node.js + 静态资源 + drizzle 迁移文件打成可分发的 zip 包
- 数据库文件 `data/invest.db` 存储在程序目录下，随用户本地使用

## Capabilities

### New Capabilities
- `standalone-packaging`: Windows 独立打包与分发能力，包括 standalone 构建配置、启动脚本、打包脚本

### Modified Capabilities

（无，本次变更不涉及任何业务功能的需求变更）

## Impact

- `next.config.ts`：新增 `output: 'standalone'` 配置（一行改动）
- 新增文件：`server.js`、`启动.bat`、`scripts/package.js`
- 构建产物结构变化：`.next/standalone/` 目录包含自包含服务端代码
- 依赖：需要下载 Windows 版 Node.js 二进制文件（node.exe）嵌入分发包
- 不影响现有开发流程（`npm run dev` 照常使用）
- 不改动任何业务代码
