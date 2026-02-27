## ADDED Requirements

### Requirement: Next.js standalone 构建配置
应用 SHALL 在 `next.config.ts` 中配置 `output: 'standalone'`，使 `next build` 生成自包含的服务端产物到 `.next/standalone/` 目录。

#### Scenario: standalone 构建产物生成
- **WHEN** 开发者执行 `npm run build`
- **THEN** `.next/standalone/` 目录包含可独立运行的 Next.js 服务端代码

### Requirement: 启动脚本自动启动服务并打开浏览器
分发包 SHALL 包含 `server.js` 启动脚本，负责启动 Next.js HTTP 服务并自动在默认浏览器中打开应用页面。

#### Scenario: 正常启动
- **WHEN** 用户通过 node.exe 执行 server.js
- **THEN** Next.js 服务在 localhost 上启动，并自动打开默认浏览器访问应用首页

#### Scenario: 默认端口被占用
- **WHEN** 3000 端口已被其他程序占用
- **THEN** 服务 SHALL 自动尝试递增端口（3001、3002...），在可用端口上启动，并用该端口打开浏览器

### Requirement: 批处理文件作为用户入口
分发包 SHALL 包含 `启动.bat` 文件，用户双击即可启动应用，无需任何命令行操作。

#### Scenario: 用户双击启动
- **WHEN** 用户在 Windows 资源管理器中双击 `启动.bat`
- **THEN** 批处理文件调用内嵌的 node.exe 执行 server.js，应用正常启动

### Requirement: 嵌入 Node.js 运行时
分发包 SHALL 包含 Windows x64 版本的 node.exe，用户无需自行安装 Node.js。

#### Scenario: 无 Node.js 环境的电脑上运行
- **WHEN** 用户电脑未安装 Node.js
- **THEN** 应用使用分发包内嵌的 node.exe 正常运行

### Requirement: 打包脚本生成可分发 zip
项目 SHALL 提供 `scripts/package.js` 打包脚本，自动完成构建、组装、压缩为可分发的 zip 文件。

#### Scenario: 执行打包流程
- **WHEN** 开发者执行 `node scripts/package.js`
- **THEN** 脚本依次执行：Next.js 构建 → 复制 standalone 产物 → 复制静态资源（public/、.next/static/）→ 复制 drizzle 迁移文件 → 嵌入 node.exe → 生成启动脚本 → 打包为 zip 文件

#### Scenario: 打包产物结构完整
- **WHEN** 打包完成后解压 zip 文件
- **THEN** 解压目录 SHALL 包含：node.exe、server.js、启动.bat、.next/standalone/ 产物、public/ 静态资源、.next/static/ 静态资源、drizzle/ 迁移文件，且 data/ 目录在首次启动时自动创建

### Requirement: 本地数据持久化
应用数据 SHALL 存储在程序目录下的 `data/invest.db`，与开发环境行为一致。

#### Scenario: 首次启动自动初始化数据库
- **WHEN** 用户首次启动应用且 data/ 目录不存在
- **THEN** 应用自动创建 data/ 目录、执行数据库迁移、写入种子数据

#### Scenario: 后续启动保留数据
- **WHEN** 用户关闭后再次启动应用
- **THEN** 之前录入的账户、持仓、净值等数据完整保留
