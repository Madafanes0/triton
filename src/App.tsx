import { useCallback, useEffect, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import { AgentPanel } from "./components/Agent/AgentPanel";
import { EditorPane } from "./components/Editor/EditorPane";
import { SettingsModal } from "./components/Settings/SettingsModal";
import { FileTree } from "./components/Sidebar/FileTree";
import { GPUStatus } from "./components/Sidebar/GPUStatus";
import { TerminalPane } from "./components/Terminal/TerminalPane";
import { Toolbar } from "./components/Toolbar/Toolbar";
import axios from "axios";
import { api, getErrorPayload } from "./hooks/useBackend";
import { useGpuStatus } from "./hooks/useGPUDetect";
import { useEditorStore } from "./store/editorStore";
import { useSettingsStore } from "./store/settingsStore";
import { API_BASE } from "./config";

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [running, setRunning] = useState(false);
  const [gpuModal, setGpuModal] = useState(false);
  const [execError, setExecError] = useState<string | null>(null);

  const termRef = useRef<Terminal | null>(null);
  const abortRunRef = useRef<AbortController | null>(null);

  const filepath = useEditorStore((s) => s.filepath);
  const content = useEditorStore((s) => s.content);
  const setContent = useEditorStore((s) => s.setContent);
  const bumpRemote = useEditorStore((s) => s.bumpRemote);
  const line = useEditorStore((s) => s.line);
  const col = useEditorStore((s) => s.col);

  const llm_backend = useSettingsStore((s) => s.llm_backend);
  const model_name = useSettingsStore((s) => s.model_name);
  const model_path = useSettingsStore((s) => s.model_path);
  const setFromServer = useSettingsStore((s) => s.setFromServer);

  const gpu = useGpuStatus(3000);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await api.get<{ settings: Record<string, unknown> }>("/settings");
        setFromServer(data.settings as never);
      } catch {
        /* offline */
      }
    })();
  }, [setFromServer]);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await api.get<{ content: string }>("/files/read", {
          params: { path: "main.py" },
        });
        setContent(data.content, { markDirty: false });
        bumpRemote();
      } catch {
        /* use starter */
      }
    })();
  }, [bumpRemote, setContent]);

  const modelLabel =
    llm_backend === "ollama" ? `Ollama · ${model_name}` : `llama.cpp · ${model_path}`;

  const onTermReady = useCallback((t: Terminal) => {
    termRef.current = t;
    t.writeln("TorchForge terminal — run output streams here.");
  }, []);

  async function parseSseStream(
    body: ReadableStream<Uint8Array> | null,
    onData: (obj: Record<string, unknown>) => void,
  ) {
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
      for (let line of lines) {
        line = line.replace(/\r$/, "");
        if (!line.startsWith("data:")) {
          continue;
        }
        const payloadText = line.replace(/^data:\s*/, "").trim();
        if (!payloadText) {
          continue;
        }
        try {
          const obj = JSON.parse(payloadText) as Record<string, unknown>;
          onData(obj);
        } catch {
          /* ignore */
        }
      }
    }
    const tail = buffer.trim();
    if (tail.startsWith("data:")) {
      const payloadText = tail.replace(/^data:\s*/, "").trim();
      if (payloadText) {
        try {
          const obj = JSON.parse(payloadText) as Record<string, unknown>;
          onData(obj);
        } catch {
          /* ignore */
        }
      }
    }
  }

  async function runExecution() {
    setExecError(null);
    setRunning(true);
    abortRunRef.current = new AbortController();
    const term = termRef.current;
    term?.reset();
    term?.writeln(`\r\n\x1b[36m[run]\x1b[0m ${filepath}`);

    try {
      const { data } = await api.post<{ run_id: string }>(
        "/execute",
        { filepath, content },
        { signal: abortRunRef.current.signal },
      );
      const res = await fetch(`${API_BASE}/execute/stream/${data.run_id}`, {
        signal: abortRunRef.current.signal,
      });
      await parseSseStream(res.body, (ev) => {
        const t = ev.type as string;
        if (t === "output" && typeof ev.text === "string") {
          const stream = ev.stream === "stderr" ? "\x1b[31m" : "";
          term?.write(stream + ev.text + "\x1b[0m");
        } else if (t === "exit") {
          const rc = ev.returncode as number;
          term?.writeln(`\r\n\x1b[33m[exit code ${rc}]\x1b[0m`);
          if (rc !== 0) {
            setExecError((prev) =>
              prev === "Execution timed out." ? prev : `Execution failed (exit code ${rc})`,
            );
          }
        } else if (t === "error") {
          const code = String(ev.error ?? "");
          const msg = String(ev.message ?? "");
          if (code === "EXECUTION_TIMEOUT") {
            setExecError("Execution timed out.");
          } else if (code === "EXECUTION_FAILED") {
            setExecError(`Run failed: ${msg}`);
          }
          term?.writeln(`\r\n\x1b[31m${code}: ${msg}\x1b[0m`);
        }
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        term?.writeln("\r\n[aborted]");
      } else if (axios.isAxiosError(e)) {
        const data = e.response?.data as { error?: string; message?: string } | undefined;
        if (data?.error === "GPU_NOT_AVAILABLE") {
          setGpuModal(true);
        }
        const msg = data?.message ?? e.message;
        setExecError(msg);
        term?.writeln(`\r\n\x1b[31m${msg}\x1b[0m`);
      } else {
        const msg = getErrorPayload(e).message;
        setExecError(msg);
        term?.writeln(`\r\n\x1b[31m${msg}\x1b[0m`);
      }
    } finally {
      setRunning(false);
      abortRunRef.current = null;
    }
  }

  function stopExecution() {
    abortRunRef.current?.abort();
  }

  function formatCode() {
    const cur = useEditorStore.getState().content;
    const lines = cur.split("\n").map((l) => l.trimEnd());
    setContent(lines.join("\n"), { markDirty: true });
    bumpRemote();
  }

  return (
    <div className="flex h-screen flex-col bg-tf-base text-tf-text">
      <Toolbar
        onRun={() => void runExecution()}
        onStop={stopExecution}
        onFormat={formatCode}
        onOpenSettings={() => setSettingsOpen(true)}
        running={running}
        modelLabel={modelLabel}
      />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-tf-border bg-tf-panel">
          <div className="min-h-0 flex-1">
            <FileTree onOpenProject={() => void window.torchforge.openFolder()} />
          </div>
          <GPUStatus />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <EditorPane />
          </div>
          {terminalOpen ? (
            <div className="h-[200px] shrink-0">
              <TerminalPane onReady={onTermReady} />
            </div>
          ) : null}
          <button
            type="button"
            className="h-6 border-t border-tf-border bg-tf-panel text-[10px] text-tf-muted hover:text-tf-text"
            onClick={() => setTerminalOpen((v) => !v)}
          >
            {terminalOpen ? "Hide terminal" : "Show terminal"}
          </button>
        </main>
        <aside className="w-[380px] shrink-0">
          <AgentPanel
            onRunAfterAgent={() => {
              void runExecution();
            }}
          />
        </aside>
      </div>
      <footer className="flex h-6 items-center justify-between border-t border-tf-border bg-tf-panel px-3 text-[11px] text-tf-muted">
        <span>
          {filepath} | Ln {line}, Col {col}
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span
              className={`h-2 w-2 rounded-full ${gpu?.cuda_available ? "bg-tf-success" : "bg-tf-error"}`}
            />
            {gpu?.cuda_available ? "GPU" : "No GPU"}
          </span>
          <span className="flex items-center gap-1">
            <span
              className={`h-2 w-2 rounded-full ${
                modelLabel.includes("Not") ? "bg-tf-muted" : "bg-tf-success"
              }`}
            />
            Model
          </span>
          {execError ? <span className="text-tf-error">{execError}</span> : null}
        </span>
      </footer>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {gpuModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="max-w-lg border border-tf-border bg-tf-panel p-6 text-sm">
            <div className="mb-2 text-lg font-semibold text-tf-error">GPU required</div>
            <p className="mb-4 text-tf-muted">
              Triton execution needs a CUDA-capable GPU with PyTorch CUDA installed. Install NVIDIA
              drivers, CUDA toolkit, and ensure <code className="text-tf-accentBlue">torch.cuda.is_available()</code>{" "}
              returns true in the same Python environment as the backend.
            </p>
            <button
              type="button"
              className="border border-tf-border px-4 py-1 text-xs"
              onClick={() => setGpuModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
