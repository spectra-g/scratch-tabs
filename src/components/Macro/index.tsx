import React from "react";
import * as monaco from "monaco-editor";
import { useMacroEngine } from "./useMacroEngine";
import { MacroUI } from "./MacroUI";

// Props Interface
interface MacroProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
}

export const Macro: React.FC<MacroProps> = ({ editor }) => {
  const engine = useMacroEngine(editor);

  return <MacroUI editor={editor} engine={engine} />;
};
