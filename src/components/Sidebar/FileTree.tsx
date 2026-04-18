import { useState } from "react";
import { api } from "../../hooks/useBackend";
import { useEditorStore } from "../../store/editorStore";

interface FileTreeProps {
  onOpenProject?: () => void;
}

export function FileTree({ onOpenProject }: FileTreeProps) {
  const filepath = useEditorStore((s) => s.filepath);
  const setFilepath = useEditorStore((s) => s.setFilepath);
  const setContent = useEditorStore((s) => s.setContent);
  const bumpRemote = useEditorStore((s) => s.bumpRemote);

  const [files] = useState<string[]>(["main.py"]);

  async function openFile(name: string) {
    try {
      const { data } = await api.get<{ path: string; content: string }>("/files/read", {
        params: { path: name },
      });
      setFilepath(data.path);
      setContent(data.content, { markDirty: false });
      bumpRemote();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-full flex-col border-r border-tf-border bg-tf-panel">
      <div className="flex items-center justify-between border-b border-tf-border px-2 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-tf-muted">Project</span>
        {onOpenProject ? (
          <button
            type="button"
            className="text-[10px] text-tf-accent hover:underline"
            onClick={onOpenProject}
          >
            Open…
          </button>
        ) : null}
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-xs">
        {files.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => void openFile(f)}
            className={`mb-1 block w-full truncate rounded-none px-2 py-1 text-left ${
              filepath === f ? "bg-tf-elevated text-tf-accentBlue" : "text-tf-text hover:bg-tf-elevated"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
