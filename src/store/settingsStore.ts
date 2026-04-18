import { create } from "zustand";

export interface AppSettings {
  llm_backend: "ollama" | "llamacpp";
  model_name: string;
  model_path: string;
  max_tokens: number;
  temperature: number;
  xgrammar_enabled: boolean;
  execution_timeout_sec: number;
  gpu_required: boolean;
  font_size_px: number;
  line_height: number;
  project_folder: string;
  project_root: string;
}

interface SettingsState extends AppSettings {
  loaded: boolean;
  modelLoadedHint: boolean;
  setFromServer: (s: Partial<AppSettings>) => void;
  setLocal: (s: Partial<AppSettings>) => void;
}

const defaults: AppSettings = {
  llm_backend: "ollama",
  model_name: "codellama:13b-instruct",
  model_path: "./models/codellama-13b.gguf",
  max_tokens: 2048,
  temperature: 0.2,
  xgrammar_enabled: true,
  execution_timeout_sec: 120,
  gpu_required: true,
  font_size_px: 14,
  line_height: 1.5,
  project_folder: "",
  project_root: "",
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...defaults,
  loaded: false,
  modelLoadedHint: true,
  setFromServer: (s) =>
    set((prev) => ({
      ...prev,
      ...s,
      loaded: true,
    })),
  setLocal: (s) => set((prev) => ({ ...prev, ...s })),
}));
