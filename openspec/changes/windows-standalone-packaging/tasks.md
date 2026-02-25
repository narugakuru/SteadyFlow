## 1. Next.js standalone 构建配置

- [x] 1.1 修改 `next.config.ts`，添加 `output: 'standalone'` 配置

## 2. 启动脚本

- [x] 2.1 创建 `server.js` 启动脚本：加载 standalone 服务端、监听端口（支持端口冲突自动递增）、启动后自动打开默认浏览器
- [x] 2.2 创建 `启动.bat` 批处理文件：设置工作目录、调用内嵌 node.exe 执行 server.js

## 3. 打包脚本

- [x] 3.1 创建 `scripts/package.js`：执行 `next build`、组装 standalone 产物到输出目录、复制 `public/` 和 `.next/static/` 静态资源、复制 `drizzle/` 迁移文件、嵌入 node.exe（从本地 Node 安装复制或从网络下载）、生成 `server.js` 和 `启动.bat` 到输出目录、打包为 zip

## 4. 验证

- [ ] 4.1 执行 `npm run build` 确认 standalone 产物正常生成
- [ ] 4.2 在输出目录中手动测试 `node server.js` 能否正常启动并打开浏览器
