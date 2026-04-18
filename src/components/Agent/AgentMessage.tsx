import type { AgentMessage as Msg } from "../../types/agent";
import { DiffViewer } from "./DiffViewer";

interface AgentMessageProps {
  message: Msg;
  onApply?: (code: string) => void;
}

export function AgentMessageBubble({ message, onApply }: AgentMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`mb-3 flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[98%] border px-3 py-2 text-sm ${
          isUser
            ? "border-tf-accent bg-tf-elevated text-tf-text"
            : "border-tf-border bg-tf-panel text-tf-text"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.text}</div>
        {message.rawFallback ? (
          <div className="mt-2 border border-tf-warning bg-tf-base p-2 font-mono text-[11px] text-tf-warning">
            Raw model output (parse failed):
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap">{message.rawFallback}</pre>
          </div>
        ) : null}
        {message.structured?.modified_code && message.structured.modified_code.trim().length > 0 ? (
          <div className="mt-2">
            <DiffViewer
              before={message.diffBefore ?? ""}
              after={message.structured.modified_code}
            />
            {onApply ? (
              <button
                type="button"
                className="mt-2 border border-tf-accent bg-tf-accent px-3 py-1 text-xs font-medium text-tf-base"
                onClick={() => onApply(message.structured!.modified_code!)}
              >
                APPLY
              </button>
            ) : null}
          </div>
        ) : null}
        {message.structured?.analysis ? (
          <div className="mt-2 border border-tf-border bg-tf-base p-2 text-xs text-tf-muted">
            <div className="mb-1 font-mono text-tf-accentBlue">
              Complexity: {message.structured.analysis.estimated_complexity}
            </div>
            {message.structured.analysis.errors.length ? (
              <div className="text-tf-error">
                Errors: {message.structured.analysis.errors.join("; ")}
              </div>
            ) : null}
            {message.structured.analysis.warnings.length ? (
              <div className="text-tf-warning">
                Warnings: {message.structured.analysis.warnings.join("; ")}
              </div>
            ) : null}
            {message.structured.analysis.suggestions.length ? (
              <div>Suggestions: {message.structured.analysis.suggestions.join("; ")}</div>
            ) : null}
            {message.structured.analysis.triton_kernels_found.length ? (
              <div className="text-tf-accentBlue">
                Kernels: {message.structured.analysis.triton_kernels_found.join(", ")}
              </div>
            ) : null}
          </div>
        ) : null}
        {message.pending ? (
          <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-tf-accent" />
        ) : null}
      </div>
    </div>
  );
}
