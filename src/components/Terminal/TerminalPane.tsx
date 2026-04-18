import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef } from "react";

interface TerminalPaneProps {
  onReady?: (term: Terminal) => void;
}

export function TerminalPane({ onReady }: TerminalPaneProps) {
  const root = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!root.current) {
      return;
    }
    const term = new Terminal({
      convertEol: true,
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 12,
      theme: {
        background: "#0d0f12",
        foreground: "#e2e8f0",
        cursor: "#f97316",
        black: "#0d0f12",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#38bdf8",
        cyan: "#38bdf8",
        magenta: "#c792ea",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(root.current);
    fit.fit();
    termRef.current = term;
    onReady?.(term);

    const ro = new ResizeObserver(() => {
      fit.fit();
    });
    ro.observe(root.current);

    return () => {
      ro.disconnect();
      term.dispose();
      termRef.current = null;
    };
  }, [onReady]);

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-tf-border bg-tf-base">
      <div className="border-b border-tf-border px-2 py-1 text-[10px] uppercase tracking-wide text-tf-muted">
        Terminal
      </div>
      <div ref={root} className="min-h-0 flex-1 p-1" />
    </div>
  );
}
