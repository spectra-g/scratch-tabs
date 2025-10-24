import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SplitTabModal } from "../SplitTabModal";
import { useTabsStore } from "../../../stores/tabsStore";
import { useSplitViewStore } from "../../../stores/splitViewStore";
import { useRootStore } from "../../../stores/rootStore";
import { Tab } from "../../../types";

// Mock dependencies
jest.mock("../../../stores/tabsStore");
jest.mock("../../../stores/splitViewStore");
jest.mock("../../../stores/rootStore");
jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: () => <div data-testid="monaco-editor">Monaco Editor Mock</div>,
}));

const mockUseTabsStore = useTabsStore as jest.MockedFunction<
  typeof useTabsStore
>;
const mockUseSplitViewStore = useSplitViewStore as jest.MockedFunction<
  typeof useSplitViewStore
>;
const mockUseRootStore = useRootStore as jest.MockedFunction<
  typeof useRootStore
>;

describe("SplitTabModal", () => {
  const mockTab: Tab = {
    id: "test-tab-id",
    title: "Test Document",
    content: "Line 1\n---\nLine 2\n---\nLine 3",
    language: "plaintext",
    languageLocked: false,
    isTablet: false,
    workspaceId: "test-workspace",
    dateCreated: Date.now(),
    lastModified: Date.now(),
    cursorPosition: { lineNumber: 1, column: 1 },
  };

  const mockHandleNewPopulatedTab = jest.fn();
  const mockRemoveTab = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTabsStore.mockReturnValue({
      tabs: [mockTab],
    } as any);

    (useSplitViewStore.getState as jest.Mock) = jest.fn().mockReturnValue({
      splitView: {
        leftTabs: ["test-tab-id"],
        rightTabs: [],
        isSplit: false,
      },
    });

    mockUseRootStore.mockReturnValue({
      handleNewPopulatedTab: mockHandleNewPopulatedTab,
      removeTab: mockRemoveTab,
    } as any);
  });

  it("renders the modal with title", () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);
    expect(screen.getByText("Split Tab: Test Document")).toBeInTheDocument();
  });

  it("shows split method options", () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);
    expect(
      screen.getByText("By Delimiter (Text or Regex)")
    ).toBeInTheDocument();
    expect(screen.getByText("By Number of Lines")).toBeInTheDocument();
  });

  it("shows delimiter options when delimiter method is selected", () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);
    expect(screen.getByText("Delimiter")).toBeInTheDocument();
    expect(screen.getByText("Use Regular Expression")).toBeInTheDocument();
    expect(screen.getByText("Delimiter Handling")).toBeInTheDocument();
  });

  it("shows skip first N matches option", () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);
    expect(screen.getByText("Skip first N matches")).toBeInTheDocument();
  });

  it("switches to lines method when selected", () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);

    const linesRadio = screen.getByLabelText("By Number of Lines");
    fireEvent.click(linesRadio);

    expect(screen.getByText("Lines per new tab")).toBeInTheDocument();
    expect(screen.queryByText("Delimiter")).not.toBeInTheDocument();
  });

  it("shows header/footer replication options", () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);
    expect(
      screen.getByText("Replicate header lines on each new tab")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Replicate footer lines on each new tab")
    ).toBeInTheDocument();
  });

  it("shows output options", () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);
    expect(screen.getByText("Title Pattern")).toBeInTheDocument();
    expect(screen.getByText("Keep original tab")).toBeInTheDocument();
  });

  it("displays preview of split results", async () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);

    // With default delimiter "\\n\\n" (double newline), no splits will occur
    // Let's change to "---" to match our test data
    const delimiterInput = screen.getByPlaceholderText("Enter delimiter");
    fireEvent.change(delimiterInput, { target: { value: "---" } });

    // Uncheck regex since we want literal match
    const regexCheckbox = screen.getByLabelText("Use Regular Expression");
    fireEvent.click(regexCheckbox);

    await waitFor(() => {
      // Should show 3 tabs in preview (split by "---")
      expect(screen.getByText("Live Preview (3 tabs)")).toBeInTheDocument();
    });
  });

  it("applies split and creates new tabs", async () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);

    // Configure split
    const delimiterInput = screen.getByPlaceholderText("Enter delimiter");
    fireEvent.change(delimiterInput, { target: { value: "---" } });

    const regexCheckbox = screen.getByLabelText("Use Regular Expression");
    fireEvent.click(regexCheckbox);

    // Click Apply Split
    const applySplitButton = screen.getByText("Apply Split");
    fireEvent.click(applySplitButton);

    await waitFor(() => {
      // Should create 3 new tabs
      expect(mockHandleNewPopulatedTab).toHaveBeenCalledTimes(3);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("removes original tab when 'Keep original tab' is unchecked", async () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);

    // Configure split
    const delimiterInput = screen.getByPlaceholderText("Enter delimiter");
    fireEvent.change(delimiterInput, { target: { value: "---" } });

    const regexCheckbox = screen.getByLabelText("Use Regular Expression");
    fireEvent.click(regexCheckbox);

    // Keep original is unchecked by default
    const applySplitButton = screen.getByText("Apply Split");
    fireEvent.click(applySplitButton);

    await waitFor(() => {
      expect(mockRemoveTab).toHaveBeenCalledWith("test-tab-id");
    });
  });

  it("keeps original tab when 'Keep original tab' is checked", async () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);

    // Configure split
    const delimiterInput = screen.getByPlaceholderText("Enter delimiter");
    fireEvent.change(delimiterInput, { target: { value: "---" } });

    const regexCheckbox = screen.getByLabelText("Use Regular Expression");
    fireEvent.click(regexCheckbox);

    // Check 'Keep original tab'
    const keepOriginalCheckbox = screen.getByLabelText("Keep original tab");
    fireEvent.click(keepOriginalCheckbox);

    const applySplitButton = screen.getByText("Apply Split");
    fireEvent.click(applySplitButton);

    await waitFor(() => {
      expect(mockRemoveTab).not.toHaveBeenCalled();
    });
  });

  it("closes modal when cancel is clicked", () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("closes modal when X button is clicked", () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText("Close modal");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("skips first N delimiter matches", async () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);

    // Configure split with skip
    const delimiterInput = screen.getByPlaceholderText("Enter delimiter");
    fireEvent.change(delimiterInput, { target: { value: "---" } });

    const regexCheckbox = screen.getByLabelText("Use Regular Expression");
    fireEvent.click(regexCheckbox);

    const skipInput = screen.getByPlaceholderText("0");
    fireEvent.change(skipInput, { target: { value: "1" } });

    await waitFor(() => {
      // Should show 2 tabs instead of 3 (skipping first delimiter)
      expect(screen.getByText("Live Preview (2 tabs)")).toBeInTheDocument();
    });
  });

  it("handles invalid regex gracefully", async () => {
    render(<SplitTabModal tabId="test-tab-id" onClose={mockOnClose} />);

    const delimiterInput = screen.getByPlaceholderText("Enter delimiter");
    fireEvent.change(delimiterInput, { target: { value: "[invalid(" } });

    // Should show no preview due to invalid regex
    await waitFor(() => {
      expect(
        screen.getByText("Configure split options to see preview")
      ).toBeInTheDocument();
    });
  });

  it("returns null when tab is not found", () => {
    mockUseTabsStore.mockReturnValue({
      tabs: [],
    } as any);

    const { container } = render(
      <SplitTabModal tabId="non-existent-tab" onClose={mockOnClose} />
    );

    expect(container.firstChild).toBeNull();
  });
});
