/**
 * Espera a Vite en 5173 y arranca Electron (Windows / macOS / Linux).
 */
const waitOn = require("wait-on");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const mainJs = path.join(root, "dist-electron", "main.js");

process.env.NODE_ENV = process.env.NODE_ENV || "development";

if (!fs.existsSync(mainJs)) {
  console.error("[TorchForge] Falta dist-electron/main.js. Ejecuta: npm run predev");
  process.exit(1);
}

let electronPath;
try {
  electronPath = require(path.join(root, "node_modules", "electron"));
} catch {
  console.error("[TorchForge] Falta electron en node_modules. Ejecuta: npm install");
  process.exit(1);
}

console.log("[TorchForge] Esperando a Vite en tcp:127.0.0.1:5173 …");
waitOn({
  resources: ["tcp:127.0.0.1:5173"],
  timeout: 120000,
  verbose: true,
})
  .then(() => {
    console.log("[TorchForge] Iniciando Electron…");
    const child = spawn(electronPath, ["."], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "development" },
    });
    child.on("exit", (code) => process.exit(code ?? 0));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
