import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { XmlSmartView } from "../XmlSmartView";

const addBackgroundTab = jest.fn();
const setActiveEditor = jest.fn();
let editorValue = "";

// Prefixed with "mock" so Jest's hoisting allows referencing them inside jest.mock factories
const mockSaveViewState = jest.fn(() => ({ id: "saved-state" }));
const mockRestoreViewState = jest.fn();

jest.mock("../../../../stores", () => ({
  useRootStore: () => ({
    addBackgroundTab,
  }),
}));

jest.mock("../../../../stores/activeEditorStore", () => ({
  useActiveEditorStore: () => ({
    setActiveEditor,
  }),
}));

jest.mock("../../../../stores/themeStore", () => ({
  useThemeStore: () => ({
    isDarkMode: false,
  }),
}));

jest.mock("@monaco-editor/react", () => ({
  Editor: ({ onMount }: { onMount: (editor: unknown) => void }) => {
    React.useEffect(() => {
      const editor = {
        getValue: () => editorValue,
        getModel: () => ({
          getValue: () => editorValue,
          setValue: (value: string) => {
            editorValue = value;
          },
          getFullModelRange: () => ({}),
        }),
        onDidFocusEditorWidget: jest.fn(),
        onDidChangeModelContent: jest.fn(),
        onDidChangeCursorPosition: jest.fn(),
        saveViewState: mockSaveViewState,
        restoreViewState: mockRestoreViewState,
        executeEdits: jest.fn((_source, edits: Array<{ text: string }>) => {
          editorValue = edits[0].text;
        }),
        setSelection: jest.fn(),
        revealLineInCenter: jest.fn(),
        setPosition: jest.fn(),
        focus: jest.fn(),
      };
      onMount(editor);
    }, [onMount]);
    return <div data-testid="mock-monaco-editor" />;
  },
}));

jest.mock("monaco-editor/esm/vs/editor/editor.api", () => ({
  Range: class Range {
    constructor(
      public startLineNumber: number,
      public startColumn: number,
      public endLineNumber: number,
      public endColumn: number,
    ) {}
  },
}));

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});


const sampleXml = '<root><item id="1">Ada</item><item id="2">Grace</item></root>';

describe("XmlSmartView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    editorValue = sampleXml;
  });

  it("renders the XML inspector and structure tree", () => {
    render(<XmlSmartView content={sampleXml} onContentChange={jest.fn()} tabId="tab-1" isActive side="left" />);

    expect(screen.getByTestId("xml-smart-view-container")).toBeInTheDocument();
    expect(screen.getByText("XML Structure")).toBeInTheDocument();
    expect(screen.getByText("Valid XML")).toBeInTheDocument();
    expect(screen.getAllByText("root").length).toBeGreaterThan(0);
  });

  it("opens XML-to-JSON conversion in a background tab", () => {
    render(<XmlSmartView content={sampleXml} onContentChange={jest.fn()} tabId="tab-1" isActive side="left" />);

    fireEvent.click(screen.getByRole("button", { name: "JSON" }));

    expect(addBackgroundTab).toHaveBeenCalledTimes(1);
    const [tab, toRightSide] = addBackgroundTab.mock.calls[0];
    expect(toRightSide).toBe(false);
    expect(tab.title).toBe("Converted XML.json");
    expect(tab.language).toBe("json");
    expect(JSON.parse(tab.content)).toEqual({
      root: {
        item: [
          { "@attributes": { id: "1" }, "#text": "Ada" },
          { "@attributes": { id: "2" }, "#text": "Grace" },
        ],
      },
    });
  });

  it("shows a green copied state for copy actions", async () => {
    render(<XmlSmartView content={sampleXml} onContentChange={jest.fn()} tabId="tab-1" isActive side="left" />);

    const details = within(screen.getByTestId("xml-node-details"));
    fireEvent.click(details.getByRole("button", { name: "XPath" }));

    await waitFor(() => expect(details.getByRole("button", { name: "Copied" })).toBeInTheDocument());
    expect(details.getByRole("button", { name: "Copied" }).querySelector(".text-success")).toBeInTheDocument();
  });

  it("opens XPath exports in background tabs", () => {
    render(<XmlSmartView content={sampleXml} onContentChange={jest.fn()} tabId="tab-1" isActive side="right" />);

    fireEvent.click(screen.getAllByRole("button", { name: "XPath" }).at(-1)!);
    fireEvent.click(screen.getByTitle("Open JSON result in a new background tab"));

    expect(addBackgroundTab).toHaveBeenCalledTimes(1);
    const [tab, toRightSide] = addBackgroundTab.mock.calls[0];
    expect(toRightSide).toBe(true);
    expect(tab.title).toBe("XPath Result.json");
    expect(tab.language).toBe("json");
  });

  it("expanding a tree node shows its children", () => {
    render(<XmlSmartView content={sampleXml} onContentChange={jest.fn()} tabId="tab-expand" isActive side="left" />);

    // root is visible but item children are collapsed by default
    expect(screen.getByText("root")).toBeInTheDocument();
    expect(screen.queryByText("item")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Expand node"));

    expect(screen.getAllByText("item")).toHaveLength(2);
  });

  it("collapsing a tree node hides its children", () => {
    render(<XmlSmartView content={sampleXml} onContentChange={jest.fn()} tabId="tab-collapse" isActive side="left" />);

    fireEvent.click(screen.getByTitle("Expand node"));
    expect(screen.getAllByText("item")).toHaveLength(2);

    fireEvent.click(screen.getByTitle("Collapse node"));
    expect(screen.queryByText("item")).not.toBeInTheDocument();
  });

  it("saves editor view state on unmount and restores it on remount", () => {
    const { unmount } = render(
      <XmlSmartView content={sampleXml} onContentChange={jest.fn()} tabId="tab-viewstate" isActive side="left" />,
    );

    unmount();

    expect(mockSaveViewState).toHaveBeenCalled();
    const savedState = mockSaveViewState.mock.results[0].value;

    render(
      <XmlSmartView content={sampleXml} onContentChange={jest.fn()} tabId="tab-viewstate" isActive side="left" />,
    );

    expect(mockRestoreViewState).toHaveBeenCalledWith(savedState);
  });
});
