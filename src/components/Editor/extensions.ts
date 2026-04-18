import { autocompletion, CompletionContext } from "@codemirror/autocomplete";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { python } from "@codemirror/lang-python";
import { tags } from "@lezer/highlight";
import { Decoration, EditorView, MatchDecorator, ViewPlugin, ViewUpdate } from "@codemirror/view";

const COMBINED = new RegExp(
  [
    "(\\b(?:torch|nn|Tensor|autograd|optim|DataLoader|Module|forward|backward)\\b)",
    "(@torch\\.jit\\.script)",
    "(\\.cuda\\(\\)|\\.to\\(device\\))",
    "(@triton\\.jit)",
    "(\\b(?:triton|tl|tl\\.load|tl\\.store|tl\\.dot|tl\\.constexpr|tl\\.program_id|tl\\.cdiv|tl\\.arange|tl\\.zeros|BLOCK_SIZE)\\b)",
  ].join("|"),
  "g",
);

const combinedDecorator = new MatchDecorator({
  regexp: COMBINED,
  decoration: (match) => {
    const w = match[0];
    if (
      w.startsWith("@triton") ||
      w.startsWith("tl") ||
      w === "triton" ||
      w === "BLOCK_SIZE"
    ) {
      return Decoration.mark({ class: "cm-tf-triton" });
    }
    if (w.startsWith("@torch")) {
      return Decoration.mark({ class: "cm-tf-jit" });
    }
    if (w.startsWith(".")) {
      return Decoration.mark({ class: "cm-tf-torch-method" });
    }
    return Decoration.mark({ class: "cm-tf-torch" });
  },
});

class TorchForgeHighlightPlugin {
  decorations: ReturnType<MatchDecorator["createDeco"]>;

  constructor(view: EditorView) {
    this.decorations = combinedDecorator.createDeco(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = combinedDecorator.createDeco(update.view);
    }
  }
}

export const torchForgeHighlight = ViewPlugin.fromClass(TorchForgeHighlightPlugin, {
  decorations: (v) => v.decorations,
});

const torchForgeHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#c792ea" },
  { tag: tags.string, color: "#c3e88d" },
  { tag: tags.comment, color: "#546e7a" },
  { tag: tags.variableName, color: "#82aaff" },
  { tag: tags.function(tags.variableName), color: "#82aaff" },
  { tag: tags.className, color: "#ffcb6b" },
  { tag: tags.number, color: "#f78c6c" },
  { tag: tags.operator, color: "#89ddff" },
  { tag: tags.meta, color: "#89ddff" },
]);

const TORCH_PREFIXES = [
  "torch.",
  "torch.nn",
  "torch.nn.functional",
  "torch.cuda",
  "torch.autograd",
  "torch.optim",
];

const TL_PREFIXES = ["tl.", "triton"];

function patternCompletions(context: CompletionContext) {
  const before = context.matchBefore(/[\w.]*/);
  if (!before || (before.from === before.to && !context.explicit)) {
    return null;
  }
  const word = before.text;
  if (!word.startsWith("torch") && !word.startsWith("tl") && !word.startsWith("triton")) {
    return null;
  }
  const options: { label: string; type: string }[] = [];
  if (word.startsWith("torch")) {
    for (const p of TORCH_PREFIXES) {
      options.push({ label: `${p}`, type: "namespace" });
    }
    options.push({ label: "torch.Tensor", type: "class" });
    options.push({ label: "torch.nn.Module", type: "class" });
  }
  if (word.startsWith("tl") || word.startsWith("triton")) {
    for (const p of TL_PREFIXES) {
      options.push({ label: p, type: "namespace" });
    }
    options.push({ label: "tl.load", type: "function" });
    options.push({ label: "tl.store", type: "function" });
    options.push({ label: "tl.dot", type: "function" });
    options.push({ label: "tl.program_id", type: "function" });
    options.push({ label: "tl.cdiv", type: "function" });
    options.push({ label: "tl.arange", type: "function" });
    options.push({ label: "tl.zeros", type: "function" });
    options.push({ label: "tl.constexpr", type: "type" });
  }
  return {
    from: before.from,
    options,
    validFor: /^[\w.]*$/,
  };
}

export const torchForgeAutocomplete = autocompletion({
  override: [patternCompletions],
});

export const torchForgePythonBase = [
  python(),
  syntaxHighlighting(torchForgeHighlightStyle),
  torchForgeHighlight,
  torchForgeAutocomplete,
];

export const torchForgeEditorTheme = EditorView.theme(
  {
    "&": {
      color: "#e2e8f0",
      backgroundColor: "#131619",
      fontFamily: "JetBrains Mono, ui-monospace, monospace",
      fontSize: "13px",
    },
    ".cm-content": { caretColor: "#f97316" },
    ".cm-cursor": { borderLeftColor: "#f97316" },
    ".cm-selectionBackground": { background: "rgba(249, 115, 22, 0.15) !important" },
    ".cm-activeLine": { background: "rgba(56, 189, 248, 0.06)" },
    ".cm-gutters": {
      backgroundColor: "#0d0f12",
      color: "#64748b",
      borderRight: "1px solid #252b34",
    },
    ".cm-tf-torch": { color: "#f97316", fontWeight: "500" },
    ".cm-tf-torch-method": { color: "#fb923c" },
    ".cm-tf-jit": { color: "#fdba74" },
    ".cm-tf-triton": { color: "#38bdf8", fontWeight: "500" },
  },
  { dark: true },
);
