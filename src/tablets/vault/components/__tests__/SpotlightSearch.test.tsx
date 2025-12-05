import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SpotlightSearch } from "../SpotlightSearch";
import { VaultItem } from "../../types";

const mockItems: VaultItem[] = [
  {
    id: "1",
    title: "Git Status",
    content: "git status",
    contentType: "script",
    labels: ["git"],
    createdTimestamp: Date.now(),
    modifiedTimestamp: Date.now(),
    isPinned: false,
    usageCount: 10,
    lastUsedTimestamp: Date.now(),
  },
  {
    id: "2",
    title: "Docker PS",
    content: "docker ps -a",
    contentType: "script",
    labels: ["docker"],
    createdTimestamp: Date.now(),
    modifiedTimestamp: Date.now(),
    isPinned: false,
    usageCount: 5,
    lastUsedTimestamp: Date.now(),
  },
  {
    id: "3",
    title: "Git Push",
    content: "git push origin main",
    contentType: "script",
    labels: ["git"],
    createdTimestamp: Date.now(),
    modifiedTimestamp: Date.now(),
    isPinned: false,
    usageCount: 8,
    lastUsedTimestamp: Date.now(),
  },
];

describe("SpotlightSearch", () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with all items when no search query", () => {
    render(
      <SpotlightSearch
        items={mockItems}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText("git status")).toBeInTheDocument();
    expect(screen.getByText("docker ps -a")).toBeInTheDocument();
    expect(screen.getByText("git push origin main")).toBeInTheDocument();
  });

  it("sorts items by usage count when no search query", () => {
    render(
      <SpotlightSearch
        items={mockItems}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const items = screen.getAllByRole("button", { hidden: true });
    // Should be sorted: git status (10), git push (8), docker ps (5)
    expect(items[0]).toHaveTextContent("git status");
    expect(items[1]).toHaveTextContent("git push origin main");
    expect(items[2]).toHaveTextContent("docker ps -a");
  });

  it("filters items based on search query", async () => {
    render(
      <SpotlightSearch
        items={mockItems}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search commands/i);
    fireEvent.change(searchInput, { target: { value: "docker" } });

    await waitFor(() => {
      expect(screen.getByText("docker ps -a")).toBeInTheDocument();
      expect(screen.queryByText("git status")).not.toBeInTheDocument();
    });
  });

  it("performs fuzzy matching on content", async () => {
    render(
      <SpotlightSearch
        items={mockItems}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search commands/i);
    fireEvent.change(searchInput, { target: { value: "gst" } }); // Fuzzy match for "git status"

    await waitFor(() => {
      expect(screen.getByText("git status")).toBeInTheDocument();
    });
  });

  it("calls onSelect when item is clicked", () => {
    render(
      <SpotlightSearch
        items={mockItems}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const firstItem = screen.getByText("git status");
    fireEvent.click(firstItem);

    expect(mockOnSelect).toHaveBeenCalledWith(mockItems[0]);
  });

  it("calls onClose when Escape is pressed", () => {
    render(
      <SpotlightSearch
        items={mockItems}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search commands/i);
    fireEvent.keyDown(searchInput, { key: "Escape" });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("navigates with arrow keys", () => {
    render(
      <SpotlightSearch
        items={mockItems}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search commands/i);

    // Press ArrowDown
    fireEvent.keyDown(searchInput, { key: "ArrowDown" });

    // The second item should now be selected (visual indication through CSS class)
    const items = screen.getAllByRole("button", { hidden: true });
    expect(items[1]).toHaveClass("bg-element-active");
  });

  it("selects item with Enter key", () => {
    render(
      <SpotlightSearch
        items={mockItems}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search commands/i);
    fireEvent.keyDown(searchInput, { key: "Enter" });

    expect(mockOnSelect).toHaveBeenCalledWith(mockItems[0]);
  });

  it("clears search query when X button is clicked", async () => {
    render(
      <SpotlightSearch
        items={mockItems}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search commands/i);
    fireEvent.change(searchInput, { target: { value: "docker" } });

    const clearButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(searchInput).toHaveValue("");
    });
  });

  it("displays no results message when no items match", async () => {
    render(
      <SpotlightSearch
        items={mockItems}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search commands/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    await waitFor(() => {
      expect(screen.getByText(/no commands found/i)).toBeInTheDocument();
    });
  });

  it("displays correct result count", () => {
    render(
      <SpotlightSearch
        items={mockItems}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText("3 results")).toBeInTheDocument();
  });

  it("closes when clicking outside modal", () => {
    render(
      <SpotlightSearch
        items={mockItems}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const backdrop = screen.getByRole("presentation");
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
