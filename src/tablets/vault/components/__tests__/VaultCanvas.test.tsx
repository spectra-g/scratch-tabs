import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VaultCanvas } from "../VaultCanvas";
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
    title: "Git Push",
    content: "git push origin main",
    contentType: "script",
    labels: ["git"],
    createdTimestamp: Date.now(),
    modifiedTimestamp: Date.now(),
    isPinned: false,
    usageCount: 5,
    lastUsedTimestamp: Date.now(),
  },
  {
    id: "3",
    title: "Docker PS",
    content: "docker ps -a",
    contentType: "script",
    labels: ["docker"],
    createdTimestamp: Date.now(),
    modifiedTimestamp: Date.now(),
    isPinned: false,
    usageCount: 8,
    lastUsedTimestamp: Date.now(),
  },
];

describe("VaultCanvas", () => {
  const mockOnAddItem = jest.fn();
  const mockOnCopyItem = jest.fn();
  const mockOnStageItem = jest.fn();
  const mockOnUpdateItem = jest.fn();
  const mockOnDeleteItem = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows message when no category is selected", () => {
    render(
      <VaultCanvas
        items={mockItems}
        selectedCategory={null}
        onAddItem={mockOnAddItem}
        onCopyItem={mockOnCopyItem}
        onStageItem={mockOnStageItem}
        onUpdateItem={mockOnUpdateItem}
        onDeleteItem={mockOnDeleteItem}
        copiedItemId={null}
      />
    );

    expect(
      screen.getByText(/select a category from the sidebar/i)
    ).toBeInTheDocument();
  });

  it("filters items by selected category", () => {
    render(
      <VaultCanvas
        items={mockItems}
        selectedCategory="git"
        onAddItem={mockOnAddItem}
        onCopyItem={mockOnCopyItem}
        onStageItem={mockOnStageItem}
        onUpdateItem={mockOnUpdateItem}
        onDeleteItem={mockOnDeleteItem}
        copiedItemId={null}
      />
    );

    expect(screen.getByText("git status")).toBeInTheDocument();
    expect(screen.getByText("git push origin main")).toBeInTheDocument();
    expect(screen.queryByText("docker ps -a")).not.toBeInTheDocument();
  });

  it("displays item count for selected category", () => {
    render(
      <VaultCanvas
        items={mockItems}
        selectedCategory="git"
        onAddItem={mockOnAddItem}
        onCopyItem={mockOnCopyItem}
        onStageItem={mockOnStageItem}
        onUpdateItem={mockOnUpdateItem}
        onDeleteItem={mockOnDeleteItem}
        copiedItemId={null}
      />
    );

    expect(screen.getByText("2 commands")).toBeInTheDocument();
  });

  it("sorts items by usage count (most used first)", () => {
    render(
      <VaultCanvas
        items={mockItems}
        selectedCategory="git"
        onAddItem={mockOnAddItem}
        onCopyItem={mockOnCopyItem}
        onStageItem={mockOnStageItem}
        onUpdateItem={mockOnUpdateItem}
        onDeleteItem={mockOnDeleteItem}
        copiedItemId={null}
      />
    );

    const items = screen.getAllByRole("button", { hidden: true });
    // Git status (10) should come before git push (5)
    expect(items[0]).toHaveTextContent("git status");
    expect(items[1]).toHaveTextContent("git push origin main");
  });

  it("shows ghost input for adding new command", () => {
    render(
      <VaultCanvas
        items={mockItems}
        selectedCategory="git"
        onAddItem={mockOnAddItem}
        onCopyItem={mockOnCopyItem}
        onStageItem={mockOnStageItem}
        onUpdateItem={mockOnUpdateItem}
        onDeleteItem={mockOnDeleteItem}
        copiedItemId={null}
      />
    );

    expect(screen.getByText(/add a command/i)).toBeInTheDocument();
  });

  it("opens textarea when ghost input is clicked", () => {
    render(
      <VaultCanvas
        items={mockItems}
        selectedCategory="git"
        onAddItem={mockOnAddItem}
        onCopyItem={mockOnCopyItem}
        onStageItem={mockOnStageItem}
        onUpdateItem={mockOnUpdateItem}
        onDeleteItem={mockOnDeleteItem}
        copiedItemId={null}
      />
    );

    const ghostInput = screen.getByText(/add a command/i);
    fireEvent.click(ghostInput);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("adds new item on Enter key", async () => {
    render(
      <VaultCanvas
        items={mockItems}
        selectedCategory="git"
        onAddItem={mockOnAddItem}
        onCopyItem={mockOnCopyItem}
        onStageItem={mockOnStageItem}
        onUpdateItem={mockOnUpdateItem}
        onDeleteItem={mockOnDeleteItem}
        copiedItemId={null}
      />
    );

    // Open ghost input
    const ghostInput = screen.getByText(/add a command/i);
    fireEvent.click(ghostInput);

    // Type command
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "git commit -m 'test'" } });

    // Press Enter
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(mockOnAddItem).toHaveBeenCalledWith("git commit -m 'test'", "git");
    });
  });

  it("allows multiline input with Shift+Enter", async () => {
    render(
      <VaultCanvas
        items={mockItems}
        selectedCategory="git"
        onAddItem={mockOnAddItem}
        onCopyItem={mockOnCopyItem}
        onStageItem={mockOnStageItem}
        onUpdateItem={mockOnUpdateItem}
        onDeleteItem={mockOnDeleteItem}
        copiedItemId={null}
      />
    );

    // Open ghost input
    const ghostInput = screen.getByText(/add a command/i);
    fireEvent.click(ghostInput);

    // Type command
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "line 1" } });

    // Press Shift+Enter (should not add item)
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    await waitFor(() => {
      expect(mockOnAddItem).not.toHaveBeenCalled();
    });
  });

  it("cancels adding on Escape key", async () => {
    render(
      <VaultCanvas
        items={mockItems}
        selectedCategory="git"
        onAddItem={mockOnAddItem}
        onCopyItem={mockOnCopyItem}
        onStageItem={mockOnStageItem}
        onUpdateItem={mockOnUpdateItem}
        onDeleteItem={mockOnDeleteItem}
        copiedItemId={null}
      />
    );

    // Open ghost input
    const ghostInput = screen.getByText(/add a command/i);
    fireEvent.click(ghostInput);

    // Type command
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "test command" } });

    // Press Escape
    fireEvent.keyDown(textarea, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(mockOnAddItem).not.toHaveBeenCalled();
    });
  });

  it("does not add empty command", async () => {
    render(
      <VaultCanvas
        items={mockItems}
        selectedCategory="git"
        onAddItem={mockOnAddItem}
        onCopyItem={mockOnCopyItem}
        onStageItem={mockOnStageItem}
        onUpdateItem={mockOnUpdateItem}
        onDeleteItem={mockOnDeleteItem}
        copiedItemId={null}
      />
    );

    // Open ghost input
    const ghostInput = screen.getByText(/add a command/i);
    fireEvent.click(ghostInput);

    // Press Enter without typing
    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter" });

    await waitFor(() => {
      expect(mockOnAddItem).not.toHaveBeenCalled();
    });
  });

  it("shows empty state message when category has no items", () => {
    render(
      <VaultCanvas
        items={mockItems}
        selectedCategory="python" // Category with no items
        onAddItem={mockOnAddItem}
        onCopyItem={mockOnCopyItem}
        onStageItem={mockOnStageItem}
        onUpdateItem={mockOnUpdateItem}
        onDeleteItem={mockOnDeleteItem}
        copiedItemId={null}
      />
    );

    expect(
      screen.getByText(/no commands in this category yet/i)
    ).toBeInTheDocument();
  });

  it("does not show ghost input when no category selected", () => {
    render(
      <VaultCanvas
        items={mockItems}
        selectedCategory={null}
        onAddItem={mockOnAddItem}
        onCopyItem={mockOnCopyItem}
        onStageItem={mockOnStageItem}
        onUpdateItem={mockOnUpdateItem}
        onDeleteItem={mockOnDeleteItem}
        copiedItemId={null}
      />
    );

    expect(screen.queryByText(/add a command/i)).not.toBeInTheDocument();
  });
});
