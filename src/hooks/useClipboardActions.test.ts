import { renderHook } from "@testing-library/react";
import { useClipboardActions } from "./useClipboardActions";

describe("useClipboardActions", () => {
  let writeTextMock: jest.Mock;
  let readTextMock: jest.Mock;
  let copyDisposableDisposeMock: jest.Mock;
  let pasteDisposableDisposeMock: jest.Mock;
  let addActionMock: jest.Mock;
  let getSelectionMock: jest.Mock;
  let getModelMock: jest.Mock;
  let getValueInRangeMock: jest.Mock;
  let executeEditsMock: jest.Mock;
  let setSelectionMock: jest.Mock;

  const makeEditor = () => ({
    addAction: addActionMock,
    getSelection: getSelectionMock,
    getModel: getModelMock,
    executeEdits: executeEditsMock,
    setSelection: setSelectionMock,
  });

  beforeEach(() => {
    writeTextMock = jest.fn().mockResolvedValue(undefined);
    readTextMock = jest.fn().mockResolvedValue("clipboard-text");

    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
        readText: readTextMock,
      },
      configurable: true,
    });

    copyDisposableDisposeMock = jest.fn();
    pasteDisposableDisposeMock = jest.fn();

    addActionMock = jest
      .fn()
      .mockReturnValueOnce({ dispose: copyDisposableDisposeMock })
      .mockReturnValueOnce({ dispose: pasteDisposableDisposeMock });

    getSelectionMock = jest.fn(() => ({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 5,
      isEmpty: () => false,
    }));

    getValueInRangeMock = jest.fn(() => "test");
    getModelMock = jest.fn(() => ({
      isDisposed: () => false,
      getValueInRange: getValueInRangeMock,
    }));

    executeEditsMock = jest.fn(() => true);
    setSelectionMock = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls navigator.clipboard.writeText with selected text on copy", async () => {
    const editor = makeEditor();

    renderHook(() => useClipboardActions(editor as any));

    const copyAction = addActionMock.mock.calls[0][0];
    await copyAction.run(editor);

    expect(writeTextMock).toHaveBeenCalledWith("test");
  });

  it("does not copy when selection is empty", async () => {
    getSelectionMock.mockReturnValue({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
      isEmpty: () => true,
    });
    const editor = makeEditor();

    renderHook(() => useClipboardActions(editor as any));

    const copyAction = addActionMock.mock.calls[0][0];
    await copyAction.run(editor);

    expect(writeTextMock).not.toHaveBeenCalled();
  });

  it("reads clipboard text and inserts it at cursor/selection on paste", async () => {
    const editor = makeEditor();

    renderHook(() => useClipboardActions(editor as any));

    const pasteAction = addActionMock.mock.calls[1][0];
    await pasteAction.run(editor);

    expect(readTextMock).toHaveBeenCalledTimes(1);
    expect(executeEditsMock).toHaveBeenCalledWith(
      "clipboard-paste",
      [
        {
          range: expect.objectContaining({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 5,
          }),
          text: "clipboard-text",
          forceMoveMarkers: true,
        },
      ],
    );
  });

  it("replaces selected text and clears selection after paste", async () => {
    const editor = makeEditor();

    renderHook(() => useClipboardActions(editor as any));

    const pasteAction = addActionMock.mock.calls[1][0];
    await pasteAction.run(editor);

    expect(executeEditsMock).toHaveBeenCalledTimes(1);
    expect(setSelectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        startLineNumber: 1,
        endLineNumber: 1,
        startColumn: 15,
        endColumn: 15,
      }),
    );
  });

  it("disposes clipboard actions on unmount", () => {
    const editor = makeEditor();

    const { unmount } = renderHook(() => useClipboardActions(editor as any));
    unmount();

    expect(copyDisposableDisposeMock).toHaveBeenCalledTimes(1);
    expect(pasteDisposableDisposeMock).toHaveBeenCalledTimes(1);
  });
});
