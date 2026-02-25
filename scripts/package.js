/**
 * InvestManage Windows 打包脚本
 *
 * 用法: node scripts/package.js
 *
 * 流程:
 * 1. 执行 next build (standalone 模式)
 * 2. 组装分发目录
 * 3. 嵌入 node.exe
 * 4. 打包为 zip
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

function clean() {
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }
  fs.mkdirSync(OUT, { recursive: true });
}

function build() {
  log("Running next build...");
  execSync("npm run build", { cwd: ROOT, stdio: "inherit" });
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

function assembleStandalone() {
  const standaloneDir = path.join(ROOT, ".next", "standalone");
  if (!fs.existsSync(standaloneDir)) {
    throw new Error(".next/standalone not found. Did next build run with output: 'standalone'?");
  }

  log("Copying standalone output...");
  copyDir(standaloneDir, OUT);

  // Copy static assets — standalone doesn't include these
  const staticSrc = path.join(ROOT, ".next", "static");
  if (fs.existsSync(staticSrc)) {
    log("Copying .next/static...");
    copyDir(staticSrc, path.join(OUT, ".next", "static"));
  }

  const publicSrc = path.join(ROOT, "public");
  if (fs.existsSync(publicSrc)) {
    log("Copying public/...");
    copyDir(publicSrc, path.join(OUT, "public"));
  }
}

function copyDrizzleMigrations() {
  const drizzleSrc = path.join(ROOT, "drizzle");
  if (fs.existsSync(drizzleSrc)) {
    log("Copying drizzle/ migrations...");
    copyDir(drizzleSrc, path.join(OUT, "drizzle"));
  }
}

function copyServerAndBat() {
  log("Copying server.js and 启动.bat...");
  fs.copyFileSync(path.join(ROOT, "server.js"), path.join(OUT, "server.js"));

  // Write 启动.bat into output (always fresh)
  const batContent = `@echo off\r\nchcp 65001 >nul\r\ncd /d "%~dp0"\r\necho Starting InvestManage...\r\nnode.exe server.js\r\npause\r\n`;
  fs.writeFileSync(path.join(OUT, "启动.bat"), batContent);
}

function embedNodeExe() {
  // Try to copy from local Node installation first
  const localNode = process.execPath;
  if (localNode && fs.existsSync(localNode)) {
    log(`Copying node.exe from local installation: ${localNode}`);
    fs.copyFileSync(localNode, path.join(OUT, "node.exe"));
    return;
  }

  throw new Error(
    "Could not find node.exe. Please manually place node.exe (Windows x64) into the dist/InvestManage/ directory."
  );
}

function createZip() {
  const zipPath = path.join(DIST, PKG_NAME);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  log("Creating zip archive...");
  // Use PowerShell Compress-Archive (built-in on Windows)
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
