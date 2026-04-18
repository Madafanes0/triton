import { linter, type Diagnostic } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { api } from "../../hooks/useBackend";

interface LintResponse {
  diagnostics: Array<{
    line: number;
    column: number;
    message: string;
    severity: string;
  }>;
}

export function torchForgeLint() {
  return linter(
    async (view: EditorView): Promise<Diagnostic[]> => {
      const text = view.state.doc.toString();
      try {
        const { data } = await api.post<LintResponse>("/lint/analyze", { content: text });
        return data.diagnostics.map((d) => {
          const line = Math.max(1, d.line) - 1;
          const lineInfo = view.state.doc.line(line + 1);
          const from = lineInfo.from + Math.min(d.column, lineInfo.length);
          return {
            from,
            to: from + 1,
            severity: d.severity === "error" ? "error" : "warning",
            message: d.message,
          };
        });
      } catch {
        return [];
      }
    },
    { delay: 600 },
  );
}
