const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const path = require("path");
const { exec } = require("child_process");

const dir = __dirname;
process.chdir(dir);

const app = next({ dir, dev: false });
const handle = app.getRequestHandler();

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = require("net").createServer();
    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
    server.on("error", () => {
      if (startPort < 65535) {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(new Error("No available port found"));
      }
    });
  });
}

function openBrowser(url) {
  exec(`start "" "${url}"`);
}

async function main() {
  const port = await findAvailablePort(3000);

  await app.prepare();

  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`> InvestManage running at ${url}`);
    openBrowser(url);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
