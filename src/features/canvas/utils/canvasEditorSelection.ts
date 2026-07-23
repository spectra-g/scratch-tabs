interface CanvasSelectionModel {
  getValueInRange(range: unknown): string;
}

interface CanvasSelectionEditor {
  getSelection(): unknown | null;
  getModel(): CanvasSelectionModel | null;
}

export const getCanvasEditorSelection = (
  editor: CanvasSelectionEditor | null,
): string | null => {
  const selection = editor?.getSelection();
  const model = editor?.getModel();
  if (!selection || !model) return null;
  const text = model.getValueInRange(selection);
  return text.length > 0 ? text : null;
};
