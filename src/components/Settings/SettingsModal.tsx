import { useEffect, useState } from "react";
import { api, getErrorPayload } from "../../hooks/useBackend";
import { useSettingsStore } from "../../store/settingsStore";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "model" | "execution" | "appearance";

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const setFromServer = useSettingsStore((s) => s.setFromServer);
  const [tab, setTab] = useState<Tab>("model");
  const [error, setError] = useState<string | null>(null);

  const llm_backend = useSettingsStore((s) => s.llm_backend);
  const model_name = useSettingsStore((s) => s.model_name);
  const model_path = useSettingsStore((s) => s.model_path);
  const max_tokens = useSettingsStore((s) => s.max_tokens);
  const temperature = useSettingsStore((s) => s.temperature);
  const xgrammar_enabled = useSettingsStore((s) => s.xgrammar_enabled);
  const execution_timeout_sec = useSettingsStore((s) => s.execution_timeout_sec);
  const gpu_required = useSettingsStore((s) => s.gpu_required);
  const font_size_px = useSettingsStore((s) => s.font_size_px);
  const line_height = useSettingsStore((s) => s.line_height);

  const setLocal = useSettingsStore((s) => s.setLocal);

  useEffect(() => {
    if (!open) {
      return;
    }
    void (async () => {
      try {
        const { data } = await api.get<{ settings: Record<string, unknown> }>("/settings");
        setFromServer(data.settings as never);
      } catch (e) {
        setError(getErrorPayload(e).message);
      }
    })();
  }, [open, setFromServer]);

  if (!open) {
    return null;
  }

  async function save() {
    setError(null);
    try {
      const { data } = await api.post<{ settings: Record<string, unknown> }>("/settings", {
        llm_backend,
        model_name,
        model_path,
        max_tokens,
        temperature,
        xgrammar_enabled,
        execution_timeout_sec,
        gpu_required,
        font_size_px,
        line_height,
      });
      setFromServer(data.settings as never);
      onClose();
    } catch (e) {
      setError(getErrorPayload(e).message);
    }
  }

  async function pickModelFile() {
    const p = await window.torchforge.openFile();
    if (p) {
      setLocal({ model_path: p });
    }
  }

  async function pickProjectFolder() {
    const p = await window.torchforge.openFolder();
    if (p) {
      try {
        await api.post("/settings", { project_folder: p });
        const { data } = await api.get<{ settings: Record<string, unknown> }>("/settings");
        setFromServer(data.settings as never);
      } catch (e) {
        setError(getErrorPayload(e).message);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-[640px] max-h-[90vh] overflow-auto border border-tf-border bg-tf-panel shadow-lg">
        <div className="flex items-center justify-between border-b border-tf-border px-4 py-3">
          <div className="text-sm font-semibold text-tf-text">Settings</div>
          <button type="button" className="text-tf-muted hover:text-tf-text" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="flex border-b border-tf-border px-2">
          {(
            [
              ["model", "Model"],
              ["execution", "Execution"],
              ["appearance", "Appearance"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`px-3 py-2 text-xs uppercase ${
                tab === id ? "border-b-2 border-tf-accent text-tf-accent" : "text-tf-muted"
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-3 p-4 text-sm">
          {error ? <div className="border border-tf-error p-2 text-xs text-tf-error">{error}</div> : null}
          {tab === "model" ? (
            <div className="space-y-3">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name="backend"
                    checked={llm_backend === "ollama"}
                    onChange={() => setLocal({ llm_backend: "ollama" })}
                  />
                  Ollama
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name="backend"
                    checked={llm_backend === "llamacpp"}
                    onChange={() => setLocal({ llm_backend: "llamacpp" })}
                  />
                  llama.cpp
                </label>
              </div>
              <label className="block text-xs text-tf-muted">
                Ollama model name
                <input
                  className="mt-1 w-full border border-tf-border bg-tf-base px-2 py-1 font-mono text-xs"
                  value={model_name}
                  onChange={(e) => setLocal({ model_name: e.target.value })}
                />
              </label>
              <label className="block text-xs text-tf-muted">
                llama.cpp GGUF path
                <div className="mt-1 flex gap-2">
                  <input
                    className="w-full border border-tf-border bg-tf-base px-2 py-1 font-mono text-xs"
                    value={model_path}
                    onChange={(e) => setLocal({ model_path: e.target.value })}
                  />
                  <button
                    type="button"
                    className="border border-tf-border px-2 text-xs"
                    onClick={() => void pickModelFile()}
                  >
                    Browse
                  </button>
                </div>
              </label>
              <label className="block text-xs text-tf-muted">
                Max tokens
                <input
                  type="number"
                  className="mt-1 w-full border border-tf-border bg-tf-base px-2 py-1 font-mono text-xs"
                  value={max_tokens}
                  onChange={(e) => setLocal({ max_tokens: Number(e.target.value) })}
                />
              </label>
              <label className="block text-xs text-tf-muted">
                Temperature {temperature.toFixed(2)}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  className="mt-1 w-full"
                  value={temperature}
                  onChange={(e) => setLocal({ temperature: Number(e.target.value) })}
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={xgrammar_enabled}
                  onChange={(e) => setLocal({ xgrammar_enabled: e.target.checked })}
                />
                xGrammar enabled (structured JSON validation)
              </label>
            </div>
          ) : null}
          {tab === "execution" ? (
            <div className="space-y-3">
              <button
                type="button"
                className="border border-tf-border px-3 py-1 text-xs"
                onClick={() => void pickProjectFolder()}
              >
                Choose project folder…
              </button>
              <label className="block text-xs text-tf-muted">
                Execution timeout (seconds)
                <input
                  type="number"
                  className="mt-1 w-full border border-tf-border bg-tf-base px-2 py-1 font-mono text-xs"
                  value={execution_timeout_sec}
                  onChange={(e) => setLocal({ execution_timeout_sec: Number(e.target.value) })}
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={gpu_required}
                  disabled
                  readOnly
                />
                GPU required (always on — Triton execution)
              </label>
            </div>
          ) : null}
          {tab === "appearance" ? (
            <div className="space-y-3">
              <label className="block text-xs text-tf-muted">
                Font size (px)
                <input
                  type="range"
                  min={12}
                  max={20}
                  className="mt-1 w-full"
                  value={font_size_px}
                  onChange={(e) => setLocal({ font_size_px: Number(e.target.value) })}
                />
              </label>
              <label className="block text-xs text-tf-muted">
                Line height
                <input
                  type="range"
                  min={1.2}
                  max={2}
                  step={0.05}
                  className="mt-1 w-full"
                  value={line_height}
                  onChange={(e) => setLocal({ line_height: Number(e.target.value) })}
                />
              </label>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-tf-border px-4 py-3">
          <button
            type="button"
            className="border border-tf-border px-4 py-1 text-xs"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="border border-tf-accent bg-tf-accent px-4 py-1 text-xs font-medium text-tf-base"
            onClick={() => void save()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
