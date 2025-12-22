import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommandBlock } from "../CommandBlock";
import { VaultItem } from "../../types";

const mockItem: VaultItem = {
  id: "1",
  title: "Git Status",
  content: "git status",
  contentType: "script",
  labels: ["git", "vcs"],
  createdTimestamp: Date.now(),
  modifiedTimestamp: Date.now(),
  isPinned: false,
  usageCount: 5,
  lastUsedTimestamp: Date.now(),
  order: 0,
};

describe("CommandBlock", () => {
  const mockOnCopy = jest.fn();
  const mockOnOpenInScratchpad = jest.fn();
  const mockOnInsertAfter = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders command content", () => {
    render(
      <CommandBlock
        item={mockItem}
        onCopy={mockOnCopy}
        onOpenInScratchpad={mockOnOpenInScratchpad}
        onInsertAfter={mockOnInsertAfter}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        isCopied={false}
      />
    );

    expect(screen.getByText("git status")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument(); // Usage count
  });

  it("displays labels", () => {
    render(
      <CommandBlock
        item={mockItem}
        onCopy={mockOnCopy}
        onOpenInScratchpad={mockOnOpenInScratchpad}
        onInsertAfter={mockOnInsertAfter}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        isCopied={false}
      />
    );

    expect(screen.getByText("git")).toBeInTheDocument();
    expect(screen.getByText("vcs")).toBeInTheDocument();
  });

  it("enters edit mode when content is clicked", () => {
    render(
      <CommandBlock
        item={mockItem}
        onCopy={mockOnCopy}
        onOpenInScratchpad={mockOnOpenInScratchpad}
        onInsertAfter={mockOnInsertAfter}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        isCopied={false}
      />
    );

    const content = screen.getByText("git status");
    fireEvent.click(content);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("saves changes when save button is clicked", async () => {
    render(
      <CommandBlock
        item={mockItem}
        onCopy={mockOnCopy}
        onOpenInScratchpad={mockOnOpenInScratchpad}
        onInsertAfter={mockOnInsertAfter}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        isCopied={false}
      />
    );

    // Enter edit mode
    const content = screen.getByText("git status");
    fireEvent.click(content);

    // Edit content
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "git status -s" } });

    // Click save
    const saveButton = screen.getByTitle(/save/i);
    fireEvent.mouseDown(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith("git status -s", "git status -s");
    });
  });

  it("saves changes on Ctrl+Enter", async () => {
    render(
      <CommandBlock
        item={mockItem}
        onCopy={mockOnCopy}
        onOpenInScratchpad={mockOnOpenInScratchpad}
        onInsertAfter={mockOnInsertAfter}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        isCopied={false}
      />
    );

    // Enter edit mode
    const content = screen.getByText("git status");
    fireEvent.click(content);

    // Edit content
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "git status -s" } });

    // Press Ctrl+Enter
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith("git status -s", "git status -s");
    });
  });

  it("cancels edit on Escape key", () => {
    render(
      <CommandBlock
        item={mockItem}
        onCopy={mockOnCopy}
        onOpenInScratchpad={mockOnOpenInScratchpad}
        onInsertAfter={mockOnInsertAfter}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        isCopied={false}
      />
    );

    // Enter edit mode
    const content = screen.getByText("git status");
    fireEvent.click(content);

    // Edit content
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "modified" } });

    // Press Escape
    fireEvent.keyDown(textarea, { key: "Escape" });

    // Should exit edit mode and revert changes
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("git status")).toBeInTheDocument();
  });

  it("calls onCopy when copy button is clicked", () => {
    render(
      <CommandBlock
        item={mockItem}
        onCopy={mockOnCopy}
        onOpenInScratchpad={mockOnOpenInScratchpad}
        onInsertAfter={mockOnInsertAfter}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        isCopied={false}
      />
    );

    const copyButton = screen.getByTitle(/copy to clipboard/i);
    fireEvent.click(copyButton);

    expect(mockOnCopy).toHaveBeenCalled();
  });

  it("shows checkmark when copied", () => {
    render(
      <CommandBlock
        item={mockItem}
        onCopy={mockOnCopy}
        onOpenInScratchpad={mockOnOpenInScratchpad}
        onInsertAfter={mockOnInsertAfter}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        isCopied={true}
      />
    );

    // Should show success state
    expect(screen.getByTitle(/copy to clipboard/i)).toHaveClass("text-success");
  });

  it("calls onOpenInScratchpad when scratchpad button is clicked", () => {
    render(
      <CommandBlock
        item={mockItem}
        onCopy={mockOnCopy}
        onOpenInScratchpad={mockOnOpenInScratchpad}
        onInsertAfter={mockOnInsertAfter}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        isCopied={false}
      />
    );

    const scratchpadButton = screen.getByTitle(/open in scratchpad/i);
    fireEvent.click(scratchpadButton);

    expect(mockOnOpenInScratchpad).toHaveBeenCalled();
  });

  it("shows delete confirmation dialog", () => {
    render(
      <CommandBlock
        item={mockItem}
        onCopy={mockOnCopy}
        onOpenInScratchpad={mockOnOpenInScratchpad}
        onInsertAfter={mockOnInsertAfter}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        isCopied={false}
      />
    );

    const deleteButton = screen.getByTitle(/delete command/i);
    fireEvent.click(deleteButton);

    expect(screen.getByText(/delete\?/i)).toBeInTheDocument();
  });

  it("calls onDelete when delete is confirmed", () => {
    render(
      <CommandBlock
        item={mockItem}
        onCopy={mockOnCopy}
        onOpenInScratchpad={mockOnOpenInScratchpad}
        onInsertAfter={mockOnInsertAfter}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        isCopied={false}
      />
    );

    // Click delete button
    const deleteButton = screen.getByTitle(/delete command/i);
    fireEvent.click(deleteButton);

    // Confirm delete
    const confirmButton = screen.getByTitle(/confirm delete/i);
    fireEvent.click(confirmButton);

    expect(mockOnDelete).toHaveBeenCalled();
  });

  it("cancels delete when cancel is clicked", () => {
    render(
      <CommandBlock
        item={mockItem}
        onCopy={mockOnCopy}
        onOpenInScratchpad={mockOnOpenInScratchpad}
        onInsertAfter={mockOnInsertAfter}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        isCopied={false}
      />
    );

    // Click delete button
    const deleteButton = screen.getByTitle(/delete command/i);
    fireEvent.click(deleteButton);

    // Cancel delete
    const cancelButton = screen.getByTitle(/cancel/i);
    fireEvent.click(cancelButton);

    expect(mockOnDelete).not.toHaveBeenCalled();
    expect(screen.queryByText(/delete\?/i)).not.toBeInTheDocument();
  });

  it("does not save if content is unchanged", async () => {
    render(
      <CommandBlock
        item={mockItem}
        onCopy={mockOnCopy}
        onOpenInScratchpad={mockOnOpenInScratchpad}
        onInsertAfter={mockOnInsertAfter}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        isCopied={false}
      />
    );

    // Enter edit mode
    const content = screen.getByText("git status");
    fireEvent.click(content);

    // Click save without changing content
    const saveButton = screen.getByTitle(/save/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });
});
