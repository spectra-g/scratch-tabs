import * as React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CsvTableViewer } from "../components/CsvTableViewer";

const mockGetBoundingClientRect = jest.fn(() => ({
  width: 800,
  height: 600,
  top: 0,
  left: 0,
  bottom: 600,
  right: 800,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
}));

Object.defineProperty(Element.prototype, "getBoundingClientRect", {
  value: mockGetBoundingClientRect,
});

const sampleCsv = `City,Status
New York,yes
new york,Y
NY,true
Chicago,N/A`;

const mockOnContentChange = jest.fn();
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const renderViewer = (content = sampleCsv) =>
  render(
    <CsvTableViewer
      content={content}
      onContentChange={mockOnContentChange}
      tabId="test-tab"
      isActive={true}
      side="left"
    />,
  );

const openReplaceBar = () => {
  fireEvent.click(screen.getByTestId("toggle-replace"));
  return screen.getByTestId("find-replace-bar");
};

const setSearch = (value: string) => {
  fireEvent.change(screen.getByTestId("search-input"), {
    target: { value },
  });
};

const setReplace = (value: string) => {
  fireEvent.change(screen.getByTestId("replace-input"), {
    target: { value },
  });
};

describe("CSV Find & Replace", () => {
  beforeEach(() => {
    mockOnContentChange.mockClear();
    jest.clearAllMocks();
  });

  it("toggles the replace bar from the toolbar", () => {
    renderViewer();
    expect(screen.queryByTestId("find-replace-bar")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("toggle-replace"));
    expect(screen.getByTestId("find-replace-bar")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("replace-close"));
    expect(screen.queryByTestId("find-replace-bar")).not.toBeInTheDocument();
  });

  it("previews 'N cells in M columns' and replaces across all columns in one step", async () => {
    renderViewer();
    openReplaceBar();
    setSearch("new york");
    setReplace("NY");

    expect(screen.getByTestId("replace-preview")).toHaveTextContent(
      "2 cells in 1 column",
    );

    const button = screen.getByTestId("replace-all-button");
    expect(button).toBeEnabled();

    fireEvent.click(button);

    await waitFor(
      () => {
        expect(mockOnContentChange).toHaveBeenCalled();
      },
      { timeout: 1500 },
    );
    const lastCall: string =
      mockOnContentChange.mock.calls[
        mockOnContentChange.mock.calls.length - 1
      ][0];
    expect(lastCall).toContain("NY,yes");
    expect(lastCall).toContain("NY,Y");
    expect(lastCall).not.toContain("New York");
    expect(lastCall).not.toContain("new york");
  });

  it("is a single undo step", async () => {
    renderViewer();
    openReplaceBar();
    setSearch("Chicago");
    setReplace("NYC");
    fireEvent.click(screen.getByTestId("replace-all-button"));

    await waitFor(
      () => {
        expect(mockOnContentChange).toHaveBeenCalled();
      },
      { timeout: 1500 },
    );

    // One bulk edit = one undo: a single click restores Chicago
    fireEvent.click(screen.getByTestId("undo-button"));
    await act(async () => {
      await delay(400);
    });
    expect(screen.getByText("Chicago")).toBeInTheDocument();
  });

  it("supports entire-cell matching to normalize variants (NY vs New York)", () => {
    renderViewer();
    openReplaceBar();
    // Substring "NY" would also hit nothing else here, but entire-cell proves scoping
    setSearch("NY");
    // Without entire-cell: "NY" is a substring of nothing else, still 1 cell
    expect(screen.getByTestId("replace-preview")).toHaveTextContent(
      "1 cell in 1 column",
    );

    fireEvent.click(screen.getByTestId("exact-cell-toggle"));
    expect(screen.getByTestId("replace-preview")).toHaveTextContent(
      "1 cell in 1 column",
    );

    // A partial query no longer matches whole cells
    setSearch("N");
    expect(screen.getByTestId("replace-preview")).toHaveTextContent(
      "0 cells in 0 columns",
    );
    expect(screen.getByTestId("replace-all-button")).toBeDisabled();
  });

  it("respects match case", () => {
    renderViewer();
    openReplaceBar();
    setSearch("new york");
    // Case-insensitive default matches both casings
    expect(screen.getByTestId("replace-preview")).toHaveTextContent(
      "2 cells in 1 column",
    );

    fireEvent.click(screen.getByTestId("match-case-toggle"));
    // Only the lowercase row matches now
    expect(screen.getByTestId("replace-preview")).toHaveTextContent(
      "1 cell in 1 column",
    );
  });

  it("scopes replacement to a single column", async () => {
    const twoColCsv = `A,B
x,x
y,x`;
    renderViewer(twoColCsv);
    openReplaceBar();
    setSearch("x");
    setReplace("z");
    expect(screen.getByTestId("replace-preview")).toHaveTextContent(
      "3 cells in 2 columns",
    );

    fireEvent.change(screen.getByTestId("replace-scope-select"), {
      target: { value: "column" },
    });
    // Defaults to the first column (A) which has one "x"
    expect(screen.getByTestId("replace-preview")).toHaveTextContent(
      "1 cell in 1 column",
    );

    fireEvent.click(screen.getByTestId("replace-all-button"));
    await waitFor(
      () => {
        expect(mockOnContentChange).toHaveBeenCalled();
      },
      { timeout: 1500 },
    );
    const lastCall: string =
      mockOnContentChange.mock.calls[
        mockOnContentChange.mock.calls.length - 1
      ][0];
    // Column A replaced, column B untouched
    expect(lastCall).toContain("z,x");
    expect(lastCall).toContain("y,x");
  });

  it("supports value->empty (clearing placeholder values)", async () => {
    renderViewer();
    openReplaceBar();
    setSearch("N/A");
    fireEvent.click(screen.getByTestId("exact-cell-toggle"));
    setReplace("");
    expect(screen.getByTestId("replace-preview")).toHaveTextContent(
      "1 cell in 1 column",
    );

    fireEvent.click(screen.getByTestId("replace-all-button"));
    await waitFor(
      () => {
        expect(mockOnContentChange).toHaveBeenCalled();
      },
      { timeout: 1500 },
    );
    const lastCall: string =
      mockOnContentChange.mock.calls[
        mockOnContentChange.mock.calls.length - 1
      ][0];
    expect(lastCall).toContain("Chicago,");
    expect(lastCall).not.toContain("N/A");
  });

  it("supports empty->value (filling blanks with exact empty find)", async () => {
    const withBlank = `City,Status
,yes
NY,`;
    renderViewer(withBlank);
    openReplaceBar();
    fireEvent.click(screen.getByTestId("exact-cell-toggle"));
    // Empty find + entire-cell matches the 2 blank cells (preview counts
    // real changes, so set the replacement first)
    setReplace("unknown");
    setSearch("");
    expect(screen.getByTestId("replace-preview")).toHaveTextContent(
      "2 cells in 2 columns",
    );
    fireEvent.click(screen.getByTestId("replace-all-button"));

    await waitFor(
      () => {
        expect(mockOnContentChange).toHaveBeenCalled();
      },
      { timeout: 1500 },
    );
    const lastCall: string =
      mockOnContentChange.mock.calls[
        mockOnContentChange.mock.calls.length - 1
      ][0];
    expect(lastCall).toContain("unknown,yes");
    expect(lastCall).toContain("NY,unknown");
  });

  it("scopes replacement to the current selection", async () => {
    renderViewer();
    // Select one cell by clicking it (single selection resolves after the
    // cell's 250ms click-detection timer)
    fireEvent.click(screen.getByText("Chicago"));
    await act(async () => {
      await delay(300);
    });

    openReplaceBar();
    setSearch("o");
    setReplace("0");
    // Global matches: multiple cells contain "o"; selection narrows to 1
    fireEvent.change(screen.getByTestId("replace-scope-select"), {
      target: { value: "selection" },
    });
    expect(screen.getByTestId("replace-preview")).toHaveTextContent(
      "1 cell in 1 column",
    );

    fireEvent.click(screen.getByTestId("replace-all-button"));
    await waitFor(
      () => {
        expect(mockOnContentChange).toHaveBeenCalled();
      },
      { timeout: 1500 },
    );
    const lastCall: string =
      mockOnContentChange.mock.calls[
        mockOnContentChange.mock.calls.length - 1
      ][0];
    expect(lastCall).toContain("Chicag0");
    // Other "o" cells untouched
    expect(lastCall).toContain("New York");
  });

  it("disables replace-all and syncs nothing when there are no matches", async () => {
    renderViewer();
    openReplaceBar();
    setSearch("zzz-no-match");
    setReplace("x");

    expect(screen.getByTestId("replace-preview")).toHaveTextContent(
      "0 cells in 0 columns",
    );
    expect(screen.getByTestId("replace-all-button")).toBeDisabled();

    fireEvent.click(screen.getByTestId("replace-all-button"));
    await act(async () => {
      await delay(400);
    });
    expect(mockOnContentChange).not.toHaveBeenCalled();
  });

  it("replaces via keyboard Enter in the replacement field", async () => {
    renderViewer();
    openReplaceBar();
    setSearch("Chicago");
    setReplace("NYC");

    fireEvent.keyDown(screen.getByTestId("replace-input"), {
      key: "Enter",
      code: "Enter",
    });

    await waitFor(
      () => {
        expect(mockOnContentChange).toHaveBeenCalled();
      },
      { timeout: 1500 },
    );
    const lastCall: string =
      mockOnContentChange.mock.calls[
        mockOnContentChange.mock.calls.length - 1
      ][0];
    expect(lastCall).toContain("NYC");
  });
});
