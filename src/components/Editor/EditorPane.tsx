import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, foldGutter, indentOnInput } from "@codemirror/language";
import { lintKeymap } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { useEffect, useRef } from "react";
import { api } from "../../hooks/useBackend";
import { useEditorStore } from "../../store/editorStore";
import { useSettingsStore } from "../../store/settingsStore";
import { torchForgeEditorTheme, torchForgePythonBase } from "./extensions";
import { torchForgeLint } from "./lintPlugin";

const SAVE_DEBOUNCE_MS = 800;

export function EditorPane() {
  const parent = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const saveTimer = useRef<number | null>(null);
  const suppressChange = useRef(false);

  const filepath = useEditorStore((s) => s.filepath);
  const remoteRevision = useEditorStore((s) => s.remoteRevision);
  const setContent = useEditorStore((s) => s.setContent);
  const setDirty = useEditorStore((s) => s.setDirty);
  const setCursor = useEditorStore((s) => s.setCursor);

  const fontSize = useSettingsStore((s) => s.font_size_px);
  const lineHeight = useSettingsStore((s) => s.line_height);

  useEffect(() => {
    if (!parent.current) {
      return;
    }

    const initial = useEditorStore.getState().content;

    const startState = EditorState.create({
      doc: initial,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        foldGutter(),
        history(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab, ...lintKeymap]),
        ...torchForgePythonBase,
        torchForgeLint(),
        torchForgeEditorTheme,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !suppressChange.current) {
            const text = update.state.doc.toString();
            setContent(text);
            if (saveTimer.current) {
              window.clearTimeout(saveTimer.current);
            }
            saveTimer.current = window.setTimeout(() => {
              void api
                .post("/files/save", { path: filepath, content: text })
                .then(() => {
                  setDirty(false);
                })
                .catch(() => {
                  /* keep dirty */
                });
            }, SAVE_DEBOUNCE_MS);
          }
          if (update.selectionSet) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            const col = pos - line.from + 1;
            const lineNo = line.number;
            setCursor(lineNo, col);
          }
        }),
        EditorView.theme({
          "&": {
            fontSize: `${fontSize}px`,
            lineHeight: String(lineHeight),
          },
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: parent.current,
    });
    viewRef.current = view;

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
      view.destroy();
      viewRef.current = null;
    };
  }, [filepath, fontSize, lineHeight, setContent, setCursor, setDirty]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const next = useEditorStore.getState().content;
    const cur = view.state.doc.toString();
    if (cur !== next) {
      suppressChange.current = true;
      view.dispatch({
        changes: { from: 0, to: cur.length, insert: next },
      });
      suppressChange.current = false;
      setDirty(false);
    }
  }, [remoteRevision, setDirty]);

  return <div ref={parent} className="h-full min-h-0 w-full overflow-hidden border-l border-tf-border" />;
}
