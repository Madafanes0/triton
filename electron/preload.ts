import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("torchforge", {
  openFile: (): Promise<string | null> => ipcRenderer.invoke("torchforge:open-file"),
  openFolder: (): Promise<string | null> => ipcRenderer.invoke("torchforge:open-folder"),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke("torchforge:get-app-version"),
});
