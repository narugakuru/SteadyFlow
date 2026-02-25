/**
 * InvestManage Windows 打包脚本
 *
 * 用法: node scripts/package.js
 *
 * 分发包结构 (standalone 内容平铺为根):
 *   InvestManage/
 *   ├── node.exe              (嵌入的 Node.js 运行时)
 *   ├── server.js             (我们的 wrapper 启动脚本)
 *   ├── _next_server.js       (Next.js 原生 server.js，重命名)
 *   ├── 启动.bat              (用户双击入口)
 *   ├── package.json          (standalone 生成的)
 *   ├── .next/                (standalone 的 .next + static)
 *   │   ├── server/
 *   │   ├── node_modules/     (native addons like better-sqlite3)
 *   │   └── static/           (额外复制)
 *   ├── node_modules/         (standalone 精简的依赖)
 *   ├── drizzle/              (standalone 已包含)
 *   ├── public/               (额外复制)
 *   └── data/                 (运行时自动创建)
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

/**
 * Use robocopy for reliable copying on Windows.
 * robocopy returns 0-7 for success, 8+ for errors.
 */
function robocopy(src, dest, options = "") {
  try {
    execSync(`robocopy "${src}" "${dest}" /E /NFL /NDL /NJH /NJS /NC /NS /NP ${options}`, {
      stdio: "pipe",
    });
  } catch (err) {
    // robocopy exit codes 0-7 are success/info, 8+ are errors
    if (err.status >= 8) {
      throw new Error(`robocopy failed (exit ${err.status}): ${src} -> ${dest}`);
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

  // Copy entire standalone content as the root of the dist package
  log("Copying standalone output as root...");
  robocopy(standaloneDir, OUT);

  // Rename the Next.js server.js to _next_server.js (our wrapper will load it)
  const nextServerSrc = path.join(OUT, "server.js");
  const nextServerDest = path.join(OUT, "_next_server.js");
  if (fs.existsSync(nextServerSrc)) {
    fs.renameSync(nextServerSrc, nextServerDest);
  }

  // Copy .next/static/ (standalone doesn't include frontend static assets)
  const staticSrc = path.join(ROOT, ".next", "static");
  if (fs.existsSync(staticSrc)) {
    log("Copying .next/static/...");
    robocopy(staticSrc, path.join(OUT, ".next", "static"));
  }

  // Copy public/ (standalone doesn't include it)
  const publicSrc = path.join(ROOT, "public");
  if (fs.existsSync(publicSrc)) {
    log("Copying public/...");
    robocopy(publicSrc, path.join(OUT, "public"));
  }
}

function removeDevData() {
  // Remove data/ dir copied from standalone (it's dev database)
  // Users will get a fresh db on first launch
  const dataDir = path.join(OUT, "data");
  if (fs.existsSync(dataDir)) {
    log("Removing dev data/ directory...");
    fs.rmSync(dataDir, { recursive: true });
  }
}

function copyServerAndBat() {
  log("Copying server.js wrapper...");
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
  removeDevData();
  copyServerAndBat();
  embedNodeExe();
  createZip();
  log("Packaging complete!");
}

main().catch((err) => {
  console.error("[package] Error:", err.message);
  process.exit(1);
});
