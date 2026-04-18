interface DiffViewerProps {
  before: string;
  after: string;
}

export function DiffViewer({ before, after }: DiffViewerProps) {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const rows = Math.max(beforeLines.length, afterLines.length);

  return (
    <div className="mt-2 grid max-h-64 grid-cols-2 gap-0 overflow-auto border border-tf-border bg-tf-base font-mono text-[11px]">
      <div className="border-r border-tf-border">
        <div className="bg-tf-elevated px-2 py-1 text-tf-error">before</div>
        {Array.from({ length: rows }).map((_, i) => (
          <pre key={`b-${i}`} className="whitespace-pre-wrap border-b border-tf-border px-2 py-0.5 text-tf-muted">
            {beforeLines[i] ?? ""}
          </pre>
        ))}
      </div>
      <div>
        <div className="bg-tf-elevated px-2 py-1 text-tf-success">after</div>
        {Array.from({ length: rows }).map((_, i) => (
          <pre key={`a-${i}`} className="whitespace-pre-wrap border-b border-tf-border px-2 py-0.5 text-tf-text">
            {afterLines[i] ?? ""}
          </pre>
        ))}
      </div>
    </div>
  );
}
