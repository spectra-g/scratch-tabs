import { create } from "zustand";
import * as monaco from "monaco-editor";

interface ActiveEditorState {
  activeLeftEditor: monaco.editor.IStandaloneCodeEditor | null;
  activeRightEditor: monaco.editor.IStandaloneCodeEditor | null;
  setActiveEditor: (side: 'left' | 'right', editor: monaco.editor.IStandaloneCodeEditor | null) => void;
}

export const useActiveEditorStore = create<ActiveEditorState>((set) => ({
  activeLeftEditor: null,
  activeRightEditor: null,
  setActiveEditor: (side, editor) => {
    if (side === 'left') {
      set({ activeLeftEditor: editor });
    } else {
      set({ activeRightEditor: editor });
    }
  },
}));