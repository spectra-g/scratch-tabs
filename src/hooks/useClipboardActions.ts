import { useEffect, useRef } from "react";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";

export const useClipboardActions = (
  editor: Monaco.editor.IStandaloneCodeEditor | null,
): void => {
  const copyDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const pasteDisposableRef = useRef<Monaco.IDisposable | null>(null);

  useEffect(() => {
    if (!editor) return;

    if (copyDisposableRef.current) {
      copyDisposableRef.current.dispose();
    }
    if (pasteDisposableRef.current) {
      pasteDisposableRef.current.dispose();
    }

    copyDisposableRef.current = editor.addAction({
      id: "editor.action.clipboardCopy",
      label: "Copy",
      contextMenuGroupId: "9_cutcopypaste",
      contextMenuOrder: 1,
      run: async (ed) => {
        try {
          const model = ed.getModel();
          const selection = ed.getSelection();
          if (!model || model.isDisposed() || !selection || selection.isEmpty()) {
            return;
          }

          const selectedText = model.getValueInRange(selection);
          await navigator.clipboard.writeText(selectedText);
        } catch (error) {
          console.warn("[useClipboardActions] Failed to copy text:", error);
        }
      },
    });

    pasteDisposableRef.current = editor.addAction({
      id: "editor.action.clipboardPaste",
      label: "Paste",
      contextMenuGroupId: "9_cutcopypaste",
      contextMenuOrder: 2,
      run: async (ed) => {
        try {
          const model = ed.getModel();
          const selection = ed.getSelection();
          if (!model || model.isDisposed() || !selection) {
            return;
          }

          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText == null) {
            return;
          }

          ed.executeEdits("clipboard-paste", [
            {
              range: selection,
              text: clipboardText,
              forceMoveMarkers: true,
            },
          ]);

          const lines = clipboardText.split(/\r\n|\r|\n/);
          const endLineNumber = selection.startLineNumber + lines.length - 1;
          const endColumn =
            lines.length === 1
              ? selection.startColumn + lines[0].length
              : lines[lines.length - 1].length + 1;

          ed.setSelection({
            startLineNumber: endLineNumber,
            startColumn: endColumn,
            endLineNumber,
            endColumn,
          });
        } catch (error) {
          console.warn("[useClipboardActions] Failed to paste text:", error);
        }
      },
    });

    return () => {
      if (copyDisposableRef.current) {
        copyDisposableRef.current.dispose();
        copyDisposableRef.current = null;
      }
      if (pasteDisposableRef.current) {
        pasteDisposableRef.current.dispose();
        pasteDisposableRef.current = null;
      }
    };
  }, [editor]);
};
