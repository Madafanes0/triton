import { create } from "zustand";

interface EditorState {
  filepath: string;
  content: string;
  dirty: boolean;
  line: number;
  col: number;
  remoteRevision: number;
  setFilepath: (path: string) => void;
  setContent: (content: string, opts?: { markDirty?: boolean }) => void;
  setDirty: (dirty: boolean) => void;
  setCursor: (line: number, col: number) => void;
  bumpRemote: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  filepath: "main.py",
  content: "",
  dirty: false,
  line: 1,
  col: 1,
  remoteRevision: 0,
  setFilepath: (filepath) => set({ filepath }),
  setContent: (content, opts) =>
    set(() => ({
      content,
      dirty: opts?.markDirty === false ? false : true,
    })),
  setDirty: (dirty) => set({ dirty }),
  setCursor: (line, col) => set({ line, col }),
  bumpRemote: () => set((s) => ({ remoteRevision: s.remoteRevision + 1 })),
}));
