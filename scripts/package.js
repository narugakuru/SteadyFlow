/**
 * InvestManage Windows 打包脚本
 *
 * 用法: node scripts/package.js
 *
 * 分发包结构:
 *   InvestManage/
 *   ├── node.exe              (嵌入的 Node.js 运行时)
 *   ├── server.js             (启动脚本 wrapper)
 *   ├── 启动.bat              (用户双击入口)
 *   └── .next/
 *       ├── standalone/       (Next.js standalone 产物)
 *       │   ├── server.js     (Next.js 原生服务端)
 *       │   ├── drizzle/      (数据库迁移文件)
 *       │   ├── data/         (运行时创建)
 *       │   └── ...
 *       └── static/           (前端静态资源)
 *
 * 关键路径说明:
 *   wrapper server.js 将 cwd 设为 .next/standalone/
 *   db/index.ts 用 process.cwd() 定位 data/ 和 drizzle/
 *   因此 drizzle/ 必须放在 .next/standalone/ 下
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(DIST, "InvestManage");
const PKG_NAME = "InvestManage.zip";

function log(msg) {
  console.log(`[package] ${msg}`);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function clean() {
  log("Cleaning dist/...");
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }
  fs.mkdirSync(OUT, { recursive: true });
}

function build() {
  log("Running next build...");
  execSync("npm run build", { cwd: ROOT, stdio: "inherit" });
}

function assembleStandalone() {
  const standaloneDir = path.join(ROOT, ".next", "standalone");
  if (!fs.existsSync(standaloneDir)) {
    throw new Error(".next/standalone not found. Did next build run with output: 'standalone'?");
  }

  // Copy standalone output into OUT/.next/standalone/
  log("Copying standalone output...");
  copyDir(standaloneDir, path.join(OUT, ".next", "standalone"));

  // Copy .next/static/ into OUT/.next/static/ (standalone doesn't include these)
  const staticSrc = path.join(ROOT, ".next", "static");
  if (fs.existsSync(staticSrc)) {
    log("Copying .next/static/...");
    copyDir(staticSrc, path.join(OUT, ".next", "static"));
  }

  // Copy public/ into OUT/.next/standalone/public/ (Next.js expects it relative to standalone)
  const publicSrc = path.join(ROOT, "public");
  if (fs.existsSync(publicSrc)) {
    log("Copying public/...");
    copyDir(publicSrc, path.join(OUT, ".next", "standalone", "public"));
  }
}

function copyDrizzleMigrations() {
  // drizzle/ goes inside standalone dir because process.cwd() will be there
  const drizzleSrc = path.join(ROOT, "drizzle");
  if (fs.existsSync(drizzleSrc)) {
    log("Copying drizzle/ migrations...");
    copyDir(drizzleSrc, path.join(OUT, ".next", "standalone", "drizzle"));
  }
}

function copyServerAndBat() {
  log("Copying server.js...");
  fs.copyFileSync(path.join(ROOT, "server.js"), path.join(OUT, "server.js"));

  log("Creating 启动.bat...");
  const batContent = `@echo off\r\nchcp 65001 >nul\r\ncd /d "%~dp0"\r\necho Starting InvestManage...\r\nnode.exe server.js\r\npause\r\n`;
  fs.writeFileSync(path.join(OUT, "\u542F\u52A8.bat"), batContent);
}

function embedNodeExe() {
  const localNode = process.execPath;
  if (localNode && fs.existsSync(localNode)) {
    log(`Copying node.exe from: ${localNode}`);
    fs.copyFileSync(localNode, path.join(OUT, "node.exe"));
    return;
  }
  throw new Error("Could not find node.exe. Please place node.exe (Windows x64) into dist/InvestManage/.");
}

function createZip() {
  const zipPath = path.join(DIST, PKG_NAME);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  log("Creating zip archive...");
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${OUT}' -DestinationPath '${zipPath}'"`,
    { stdio: "inherit" }
  );

  const sizeMB = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
  log(`Done! ${PKG_NAME} (${sizeMB} MB) created at: ${zipPath}`);
}

async function main() {
  log("Starting packaging...");
  clean();
  build();
  assembleStandalone();
  copyDrizzleMigrations();
  copyServerAndBat();
  embedNodeExe();
  createZip();
  log("Packaging complete!");
}

main().catch((err) => {
  console.error("[package] Error:", err.message);
  process.exit(1);
});
