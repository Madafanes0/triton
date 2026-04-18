import { useEffect, useRef, useState } from "react";
import type { AgentStructuredResponse } from "../../types/agent";
import { useAgentStore } from "../../store/agentStore";
import { useEditorStore } from "../../store/editorStore";
import { useRunStore } from "../../store/runStore";
import { AgentMessageBubble } from "./AgentMessage";
import { API_BASE } from "../../config";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function consumeSse(
  body: ReadableStream<Uint8Array> | null,
  onEvent: (payload: Record<string, unknown>) => void,
): Promise<void> {
  if (!body) {
    return;
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }
      const payloadText = line.replace(/^data:\s*/, "").trim();
      if (!payloadText) {
        continue;
      }
      try {
        const payload = JSON.parse(payloadText) as Record<string, unknown>;
        onEvent(payload);
      } catch {
        /* ignore */
      }
    }
  }
}

interface AgentPanelProps {
  onRunAfterAgent?: () => void;
}

export function AgentPanel({ onRunAfterAgent }: AgentPanelProps) {
  const messages = useAgentStore((s) => s.messages);
  const appendMessage = useAgentStore((s) => s.appendMessage);
  const updateLastAssistant = useAgentStore((s) => s.updateLastAssistant);
  const streaming = useAgentStore((s) => s.streaming);
  const setStreaming = useAgentStore((s) => s.setStreaming);
  const attachFile = useAgentStore((s) => s.attachFile);
  const setAttachFile = useAgentStore((s) => s.setAttachFile);

  const content = useEditorStore((s) => s.content);
  const setContent = useEditorStore((s) => s.setContent);
  const bumpRemote = useEditorStore((s) => s.bumpRemote);

  const [input, setInput] = useState("");
  const lastRunLog = useRunStore((s) => s.lastRunLog);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    updateLastAssistant({ pending: false });
  }

  async function streamRequest(userMessage: string, runAfter: boolean) {
    const snapshot = content;
    appendMessage({
      id: randomId(),
      role: "user",
      text: userMessage,
    });
    appendMessage({
      id: randomId(),
      role: "assistant",
      text: "",
      pending: true,
      diffBefore: snapshot,
    });

    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let assembled = "";

    try {
      const res = await fetch(`${API_BASE}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          code_context: content,
          attach_file: attachFile,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text();
        updateLastAssistant({
          text: `Request failed: ${res.status} ${errText}`,
          pending: false,
        });
        setStreaming(false);
        return;
      }

      await consumeSse(res.body, (payload) => {
        const type = String(payload.type ?? "");
        if (type === "chunk" && typeof payload.text === "string") {
          assembled += payload.text;
          updateLastAssistant({
            text: assembled,
            pending: true,
          });
        } else if (type === "retry") {
          assembled = "";
          updateLastAssistant({
            text: "Retrying with stricter JSON instructions…",
            pending: true,
          });
        } else if (type === "complete" && payload.response) {
          const resp = payload.response as AgentStructuredResponse;
          updateLastAssistant({
            text: resp.explanation,
            structured: resp,
            pending: false,
            diffBefore: snapshot,
          });
          if (runAfter) {
            onRunAfterAgent?.();
          }
        } else if (type === "error") {
          const code = String(payload.error ?? "ERROR");
          const detail = payload.detail as { raw?: string } | undefined;
          const raw = typeof detail?.raw === "string" ? detail.raw : assembled;
          updateLastAssistant({
            text: String(payload.message ?? "Agent error"),
            rawFallback: code === "XGRAMMAR_PARSE_FAIL" ? raw : undefined,
            pending: false,
          });
        }
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        updateLastAssistant({ text: "Stopped.", pending: false });
      } else {
        updateLastAssistant({ text: `Error: ${String(e)}`, pending: false });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function send() {
    const text = input.trim();
    if (!text || streaming) {
      return;
    }
    setInput("");
    void streamRequest(text, false);
  }

  function analyze() {
    const text =
      "Analyze the attached PyTorch/Triton code only. Do not modify code unless you find critical issues; return structured JSON with analysis, modified_code null if no changes.";
    if (streaming) {
      return;
    }
    void streamRequest(text, false);
  }

  function sendAndRun() {
    const text = input.trim();
    if (!text || streaming) {
      return;
    }
    setInput("");
    void streamRequest(text, true);
  }

  function pasteLastRun() {
    const trimmed = lastRunLog.trim();
    if (!trimmed || streaming) {
      return;
    }
    setInput(
      `Please fix the following execution error/output. Return corrected code.\n\n--- RUN LOG ---\n${trimmed}\n--- END RUN LOG ---\n`,
    );
  }

  async function applyCode(code: string) {
    setContent(code, { markDirty: false });
    bumpRemote();
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-tf-border bg-tf-panel">
      <div className="border-b border-tf-border px-3 py-2">
        <div className="font-medium text-tf-accent">Agent</div>
        <div className="text-[11px] text-tf-muted">Local LLM · structured JSON</div>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {messages.map((m) => (
          <AgentMessageBubble
            key={m.id}
            message={m}
            onApply={m.role === "assistant" ? applyCode : undefined}
          />
        ))}
      </div>
      <div className="border-t border-tf-border p-2">
        <div className="mb-2 flex items-center justify-between text-[11px] text-tf-muted">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={attachFile}
              onChange={(e) => setAttachFile(e.target.checked)}
            />
            Attach current file
          </label>
          <span>~{estimateTokens(content)} tok</span>
        </div>
        <textarea
          className="mb-2 h-24 w-full resize-none border border-tf-border bg-tf-base px-2 py-1 font-mono text-xs text-tf-text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask TorchForge about PyTorch / Triton…"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border border-tf-border bg-tf-elevated px-3 py-1 text-xs text-tf-text disabled:opacity-50"
            disabled={streaming || !lastRunLog.trim()}
            onClick={pasteLastRun}
            title="Paste last Run output into the agent input"
          >
            Paste last Run log
          </button>
          <button
            type="button"
            className="border border-tf-accent bg-tf-accent px-3 py-1 text-xs font-medium text-tf-base disabled:opacity-50"
            disabled={streaming}
            onClick={send}
          >
            Send
          </button>
          <button
            type="button"
            className="border border-tf-border bg-tf-elevated px-3 py-1 text-xs text-tf-text disabled:opacity-50"
            disabled={streaming}
            onClick={analyze}
          >
            Analyze
          </button>
          <button
            type="button"
            className="border border-tf-accentBlue bg-tf-elevated px-3 py-1 text-xs text-tf-accentBlue disabled:opacity-50"
            disabled={streaming}
            onClick={sendAndRun}
          >
            Send + Run
          </button>
          <button
            type="button"
            className="border border-tf-error px-3 py-1 text-xs text-tf-error disabled:opacity-50"
            disabled={!streaming}
            onClick={stop}
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}
