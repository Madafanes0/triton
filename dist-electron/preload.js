"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("torchforge", {
    openFile: () => electron_1.ipcRenderer.invoke("torchforge:open-file"),
    openFolder: () => electron_1.ipcRenderer.invoke("torchforge:open-folder"),
    getAppVersion: () => electron_1.ipcRenderer.invoke("torchforge:get-app-version"),
});
//# sourceMappingURL=preload.js.map