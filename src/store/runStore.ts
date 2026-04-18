import { create } from "zustand";

interface RunState {
  lastRunLog: string;
  setLastRunLog: (log: string) => void;
  appendLastRunLog: (chunk: string) => void;
  clearLastRunLog: () => void;
}

export const useRunStore = create<RunState>((set) => ({
  lastRunLog: "",
  setLastRunLog: (lastRunLog) => set({ lastRunLog }),
  appendLastRunLog: (chunk) =>
    set((s) => ({ lastRunLog: s.lastRunLog.length ? s.lastRunLog + chunk : chunk })),
  clearLastRunLog: () => set({ lastRunLog: "" }),
}));

