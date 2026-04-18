"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const isDev = process.env.NODE_ENV === "development";
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 960,
        minHeight: 600,
        backgroundColor: "#0d0f12",
        title: "TorchForge IDE",
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });
    const devUrl = "http://127.0.0.1:5173";
    if (isDev) {
        void win.loadURL(devUrl).catch(() => {
            const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>TorchForge — Vite no disponible</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 28px; background: #0d0f12; color: #e2e8f0; line-height: 1.5; max-width: 560px; }
    h1 { color: #f97316; font-size: 1.25rem; }
    code, pre { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    pre { background: #131619; border: 1px solid #252b34; padding: 14px; overflow: auto; }
    button { margin-top: 16px; padding: 8px 16px; background: #f97316; color: #0d0f12; border: none; cursor: pointer; font-weight: 600; }
  </style>
</head>
<body>
  <h1>No hay servidor Vite en el puerto 5173</h1>
  <p>En modo desarrollo, Electron carga la interfaz desde Vite. Tiene que estar en marcha <strong>antes</strong> de abrir esta ventana (o usa el comando que arranca todo junto).</p>
  <p><strong>Otra terminal</strong>, en la carpeta del proyecto:</p>
  <pre>npm run dev</pre>
  <p>Cuando veas <code>Local: http://localhost:5173/</code>, pulsa reintentar o ⌘R / Ctrl+R.</p>
  <p>O en una sola terminal: <code>./start.sh</code> (backend + Vite + Electron).</p>
  <button type="button" onclick="location.reload()">Reintentar</button>
</body>
</html>`;
            void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        });
    }
    else {
        void win.loadFile(path_1.default.join(__dirname, "../dist/index.html"));
    }
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.ipcMain.handle("torchforge:open-file", async () => {
        const r = await electron_1.dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [{ name: "Python", extensions: ["py"] }],
        });
        if (r.canceled || r.filePaths.length === 0) {
            return null;
        }
        return r.filePaths[0];
    });
    electron_1.ipcMain.handle("torchforge:open-folder", async () => {
        const r = await electron_1.dialog.showOpenDialog({
            properties: ["openDirectory"],
        });
        if (r.canceled || r.filePaths.length === 0) {
            return null;
        }
        return r.filePaths[0];
    });
    electron_1.ipcMain.handle("torchforge:get-app-version", () => electron_1.app.getVersion());
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=main.js.map