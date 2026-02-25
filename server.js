/**
 * InvestManage 启动脚本
 * 包装 Next.js standalone server，添加端口检测和自动打开浏览器功能
 *
 * 打包后此文件位于分发包根目录，与 Next.js 原生 server.js 同级
 * 原生 server.js 被重命名为 _next_server.js
 */

const { execSync } = require("child_process");
const net = require("net");
const path = require("path");

process.chdir(__dirname);

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await checkPort(port)) return port;
  }
  throw new Error("No available port found");
}

function openBrowser(url) {
  try {
    execSync(`start "" "${url}"`, { stdio: "ignore" });
  } catch {
    console.log(`Please open ${url} in your browser.`);
  }
}

async function main() {
  const port = await findAvailablePort(3000);

  process.env.PORT = String(port);
  process.env.HOSTNAME = "localhost";

  // Intercept server start to know when it's ready, then open browser
  const originalListen = net.Server.prototype.listen;
  let opened = false;
  net.Server.prototype.listen = function (...args) {
    const result = originalListen.apply(this, args);
    this.once("listening", () => {
      if (!opened) {
        opened = true;
        const url = `http://localhost:${port}`;
        console.log(`> InvestManage running at ${url}`);
        openBrowser(url);
      }
    });
    return result;
  };

  // Load the Next.js standalone server
  require(path.join(__dirname, "_next_server.js"));
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
