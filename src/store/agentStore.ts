import { create } from "zustand";
import type { AgentMessage } from "../types/agent";

interface AgentState {
  messages: AgentMessage[];
  streaming: boolean;
  attachFile: boolean;
  appendMessage: (m: AgentMessage) => void;
  updateLastAssistant: (partial: Partial<AgentMessage>) => void;
  clear: () => void;
  setStreaming: (v: boolean) => void;
  setAttachFile: (v: boolean) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  messages: [],
  streaming: false,
  attachFile: true,
  appendMessage: (m) => set({ messages: [...get().messages, m] }),
  updateLastAssistant: (partial) => {
    const msgs = [...get().messages];
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      if (msgs[i].role === "assistant") {
        msgs[i] = { ...msgs[i], ...partial };
        set({ messages: msgs });
        return;
      }
    }
  },
  clear: () => set({ messages: [] }),
  setStreaming: (streaming) => set({ streaming }),
  setAttachFile: (attachFile) => set({ attachFile }),
}));
