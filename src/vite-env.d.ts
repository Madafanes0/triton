/// <reference types="vite/client" />

interface TorchForgeBridge {
  openFile: () => Promise<string | null>;
  openFolder: () => Promise<string | null>;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    torchforge: TorchForgeBridge;
  }
}

export {};
