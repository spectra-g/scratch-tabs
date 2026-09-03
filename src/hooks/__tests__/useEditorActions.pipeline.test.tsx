import { renderHook } from "@testing-library/react";
import {
  useEditorActions,
  buildTransformationsModalArgs,
} from "../useEditorActions";
import { usePipelineStore } from "../../stores/pipelineStore";

jest.mock("../../stores/pipelineStore", () => ({
  usePipelineStore: jest.fn(),
}));

jest.mock("../../stores/aiStore", () => ({
  useAIStore: () => ({
    summarizeTextWithModal: jest.fn(),
    runCodegen: jest.fn(),
  }),
}));

jest.mock("../../stores/quickTransformStore", () => ({
  useQuickTransformStore: {
    getState: () => ({ openModal: jest.fn() }),
  },
}));

const openModal = jest.fn();

const createSelection = (empty: boolean, extra = {}) => ({
  isEmpty: () => empty,
  startLineNumber: 1,
  startColumn: 1,
  endLineNumber: empty ? 1 : 1,
  endColumn: empty ? 1 : 5,
  ...extra,
});

const createEditor = (selection: any, fullContent = "full content") => {
  const actions: Record<string, any> = {};
  return {
    actions,
    editor: {
      onContextMenu: jest.fn(() => ({ dispose: jest.fn() })),
      addAction: jest.fn((action: any) => {
        actions[action.id] = action;
        return { dispose: jest.fn() };
      }),
      addCommand: jest.fn(),
      createContextKey: jest.fn(() => ({ set: jest.fn() })),
      getSelection: jest.fn(() => selection),
      getModel: jest.fn(() => ({
        getValue: jest.fn(() => fullContent),
        getValueInRange: jest.fn(() => "selected"),
        isDisposed: jest.fn(() => false),
      })),
    } as any,
  };
};

const monaco = {
  KeyMod: { CtrlCmd: 1 },
  KeyCode: { KeyK: 2 },
} as any;

const baseProps = (editor: any) => ({
  editor,
  monaco,
  latestActiveTabRef: { current: { id: "tab-1" } } as any,
  isAiReady: false,
  isAiLoading: false,
  isCodegenReady: false,
  isCodegenGenerating: false,
});

describe("buildTransformationsModalArgs", () => {
  it("returns empty text and null range when selection is null", () => {
    const getValueInRange = jest.fn();
    const args = buildTransformationsModalArgs("full", null, getValueInRange);

    expect(args).toEqual({
      content: "full",
      selectedText: "",
      selectionRange: null,
    });
    expect(getValueInRange).not.toHaveBeenCalled();
  });

  it("returns empty text and null range for an empty selection", () => {
    const getValueInRange = jest.fn();
    const args = buildTransformationsModalArgs(
      "full",
      createSelection(true),
      getValueInRange,
    );

    expect(args.selectedText).toBe("");
    expect(args.selectionRange).toBeNull();
    expect(getValueInRange).not.toHaveBeenCalled();
  });

  it("returns selected text and the range for a non-empty selection", () => {
    const selection = createSelection(false);
    const args = buildTransformationsModalArgs("full", selection, () => "sel");

    expect(args.selectedText).toBe("sel");
    expect(args.selectionRange).toBe(selection);
  });
});

describe("useEditorActions Transformations action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePipelineStore as unknown as jest.Mock).mockReturnValue({
      openModal,
    });
  });

  it("opens pipeline with full content when nothing is selected", () => {
    const { editor, actions } = createEditor(createSelection(true));
    renderHook(() => useEditorActions(baseProps(editor)));

    const run = actions["transformations-pipeline"].run;
    run({ getModel: editor.getModel, getSelection: editor.getSelection });

    expect(openModal).toHaveBeenCalledTimes(1);
    expect(openModal).toHaveBeenCalledWith("full content", "", null);
  });

  it("opens pipeline with selected text when a selection exists", () => {
    const selection = createSelection(false);
    const { editor, actions } = createEditor(selection);
    renderHook(() => useEditorActions(baseProps(editor)));

    const run = actions["transformations-pipeline"].run;
    run({ getModel: editor.getModel, getSelection: editor.getSelection });

    expect(openModal).toHaveBeenCalledTimes(1);
    expect(openModal).toHaveBeenCalledWith("full content", "selected", selection);
  });
});
