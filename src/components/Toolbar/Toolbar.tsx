import { useEffect, useState } from "react";
import { useEditorStore } from "../../store/editorStore";

interface ToolbarProps {
  onRun: () => void;
  onStop: () => void;
  onFormat: () => void;
  onOpenSettings: () => void;
  running: boolean;
  modelLabel: string;
}

export function Toolbar({
  onRun,
  onStop,
  onFormat,
  onOpenSettings,
  running,
  modelLabel,
}: ToolbarProps) {
  const filepath = useEditorStore((s) => s.filepath);
  const [version, setVersion] = useState("");

  useEffect(() => {
    void window.torchforge.getAppVersion().then(setVersion);
  }, []);

  return (
    <header className="flex h-10 items-center justify-between border-b border-tf-border bg-tf-panel px-3">
      <div className="flex items-center gap-3">
        <div className="font-semibold tracking-tight text-tf-accent">TorchForge</div>
        <span className="text-xs text-tf-muted">IDE</span>
        {version ? (
          <span className="font-mono text-[10px] text-tf-muted">v{version}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden max-w-[200px] truncate font-mono text-xs text-tf-muted sm:inline">
          {filepath}
        </span>
        <select
          className="max-w-[180px] border border-tf-border bg-tf-elevated px-2 py-1 font-mono text-xs text-tf-text"
          value={modelLabel}
          disabled
          title="Change model in Settings"
        >
          <option value={modelLabel}>{modelLabel}</option>
        </select>
        <button
          type="button"
          className="border border-tf-border bg-tf-elevated px-3 py-1 text-xs text-tf-text hover:border-tf-accent"
          onClick={onFormat}
        >
          Format
        </button>
        <button
          type="button"
          className={`border px-3 py-1 text-xs ${
            running
              ? "border-tf-error text-tf-error"
              : "border-tf-accent bg-tf-elevated text-tf-accent hover:bg-tf-border"
          }`}
          onClick={running ? onStop : onRun}
        >
          {running ? "Stop" : "Run"}
        </button>
        <button
          type="button"
          className="border border-tf-border bg-tf-elevated px-2 py-1 text-tf-muted hover:text-tf-text"
          onClick={onOpenSettings}
          aria-label="Settings"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
