import { render, screen, fireEvent } from "@testing-library/react";
import { VaultScratchpad } from "../VaultScratchpad";

describe("VaultScratchpad", () => {
  const mockOnContentChange = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnCopy = jest.fn();
  const mockOnSaveAsNew = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders when open", () => {
    render(
      <VaultScratchpad
        content="test content"
        isOpen={true}
        onContentChange={mockOnContentChange}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        onSaveAsNew={mockOnSaveAsNew}
        isCopied={false}
      />
    );

    expect(screen.getByText("Scratchpad")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("test content");
  });

  it("does not render when closed", () => {
    render(
      <VaultScratchpad
        content="test content"
        isOpen={false}
        onContentChange={mockOnContentChange}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        onSaveAsNew={mockOnSaveAsNew}
        isCopied={false}
      />
    );

    expect(screen.queryByText("Scratchpad")).not.toBeInTheDocument();
  });

  it("calls onContentChange when text is edited", () => {
    render(
      <VaultScratchpad
        content=""
        isOpen={true}
        onContentChange={mockOnContentChange}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        onSaveAsNew={mockOnSaveAsNew}
        isCopied={false}
      />
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "new content" } });

    expect(mockOnContentChange).toHaveBeenCalledWith("new content");
  });

  it("calls onClose when close button is clicked", () => {
    render(
      <VaultScratchpad
        content="test content"
        isOpen={true}
        onContentChange={mockOnContentChange}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        onSaveAsNew={mockOnSaveAsNew}
        isCopied={false}
      />
    );

    const closeButton = screen.getByTitle(/close scratchpad/i);
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onCopy when copy button is clicked", () => {
    render(
      <VaultScratchpad
        content="test content"
        isOpen={true}
        onContentChange={mockOnContentChange}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        onSaveAsNew={mockOnSaveAsNew}
        isCopied={false}
      />
    );

    const copyButton = screen.getByRole("button", { name: /copy/i });
    fireEvent.click(copyButton);

    expect(mockOnCopy).toHaveBeenCalled();
  });

  it("shows copied state", () => {
    render(
      <VaultScratchpad
        content="test content"
        isOpen={true}
        onContentChange={mockOnContentChange}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        onSaveAsNew={mockOnSaveAsNew}
        isCopied={true}
      />
    );

    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("calls onSaveAsNew when save button is clicked", () => {
    render(
      <VaultScratchpad
        content="test content"
        isOpen={true}
        onContentChange={mockOnContentChange}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        onSaveAsNew={mockOnSaveAsNew}
        isCopied={false}
      />
    );

    const saveButton = screen.getByRole("button", { name: /save as new/i });
    fireEvent.click(saveButton);

    expect(mockOnSaveAsNew).toHaveBeenCalled();
  });

  it("disables buttons when content is empty", () => {
    render(
      <VaultScratchpad
        content=""
        isOpen={true}
        onContentChange={mockOnContentChange}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        onSaveAsNew={mockOnSaveAsNew}
        isCopied={false}
      />
    );

    const copyButton = screen.getByRole("button", { name: /copy/i });
    const saveButton = screen.getByRole("button", { name: /save as new/i });

    expect(copyButton).toBeDisabled();
    expect(saveButton).toBeDisabled();
  });

  it("enables buttons when content is not empty", () => {
    render(
      <VaultScratchpad
        content="test content"
        isOpen={true}
        onContentChange={mockOnContentChange}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        onSaveAsNew={mockOnSaveAsNew}
        isCopied={false}
      />
    );

    const copyButton = screen.getByRole("button", { name: /copy/i });
    const saveButton = screen.getByRole("button", { name: /save as new/i });

    expect(copyButton).not.toBeDisabled();
    expect(saveButton).not.toBeDisabled();
  });

  it("displays helper text", () => {
    render(
      <VaultScratchpad
        content="test content"
        isOpen={true}
        onContentChange={mockOnContentChange}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        onSaveAsNew={mockOnSaveAsNew}
        isCopied={false}
      />
    );

    expect(
      screen.getByText(/changes won't affect the original/i)
    ).toBeInTheDocument();
  });
});
