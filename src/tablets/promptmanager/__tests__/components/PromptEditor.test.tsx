import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { PromptEditor } from "../../components/PromptEditor";
import { Prompt, Tag } from "../../types";

// Mock the MarkdownPreview component
jest.mock("../../components/MarkdownPreview", () => ({
  MarkdownPreview: ({ content }: any) => (
    <div data-testid="markdown-preview">
      <div data-testid="preview-content">{content}</div>
    </div>
  ),
}));

// Mock the FormattingToolbar component
jest.mock("../../components/FormattingToolbar", () => ({
  FormattingToolbar: ({ onFormat }: any) => (
    <div data-testid="formatting-toolbar">
      <button data-testid="bold-button" onClick={() => onFormat("bold")}>Bold</button>
      <button data-testid="italic-button" onClick={() => onFormat("italic")}>Italic</button>
      <button data-testid="code-button" onClick={() => onFormat("code")}>Code</button>
    </div>
  ),
}));

// Mock the EditorInsertPanel component
jest.mock("../../components/EditorInsertPanel", () => ({
  EditorInsertPanel: ({ onInsert }: any) => (
    <div data-testid="editor-insert-panel">
      <button data-testid="insert-variable" onClick={() => onInsert("{{variable}}")}>Insert Variable</button>
      <button data-testid="insert-snippet" onClick={() => onInsert("snippet content")}>Insert Snippet</button>
    </div>
  ),
}));

describe("PromptEditor", () => {
  const mockPrompt: Prompt = {
    id: "test-prompt",
    title: "Test Prompt",
    content: "This is test content with **bold** and *italic* text.",
    tags: ["tag1", "tag2"],
    isFavorite: false,
    createdAt: Date.now(),
    lastModified: Date.now(),
    usageCount: 5,
    history: [
      { content: "Previous version", timestamp: Date.now() - 1000 }
    ]
  };

  const mockTags: Tag[] = [
    { id: "tag1", name: "Tag 1", color: "#ff0000" },
    { id: "tag2", name: "Tag 2", color: "#00ff00" },
    { id: "tag3", name: "Tag 3", color: "#0000ff" }
  ];

  const mockProps = {
    prompt: mockPrompt,
    onUpdatePrompt: jest.fn(),
    onIncrementUsage: jest.fn(),
    tags: mockTags,
    snippets: [],
    templates: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the editor in read-only mode by default", () => {
      render(<PromptEditor {...mockProps} />);
      
      // Should show title as heading, not input
      expect(screen.getByText("Test Prompt")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("Test Prompt")).not.toBeInTheDocument();
      
      // Should show content in preview mode
      expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
      expect(screen.getByTestId("preview-content")).toHaveTextContent("This is test content with **bold** and *italic* text.");
    });

    it("should display action buttons in read-only mode", () => {
      render(<PromptEditor {...mockProps} />);
      
      // Should have edit, history, and copy buttons
      expect(screen.getByTitle("Edit prompt")).toBeInTheDocument();
      expect(screen.getByTitle("View history")).toBeInTheDocument();
      expect(screen.getByTitle("Copy to clipboard")).toBeInTheDocument();
    });

    it("should display selected tags", () => {
      render(<PromptEditor {...mockProps} />);
      
      expect(screen.getByText("Tag 1")).toBeInTheDocument();
      expect(screen.getByText("Tag 2")).toBeInTheDocument();
    });

    it("should display token count", () => {
      render(<PromptEditor {...mockProps} />);
      
      expect(screen.getByText("Token Count:")).toBeInTheDocument();
      expect(screen.getByText("22 tokens")).toBeInTheDocument();
    });
  });

  describe("Edit Mode", () => {
    it("should enter edit mode when edit button is clicked", async () => {
      render(<PromptEditor {...mockProps} />);
      
      // Click edit button to enter edit mode
      const editButton = screen.getByTitle("Edit prompt");
      await userEvent.click(editButton);
      
      // Should now show input fields
      expect(screen.getByDisplayValue("Test Prompt")).toBeInTheDocument();
      expect(screen.getByDisplayValue("This is test content with **bold** and *italic* text.")).toBeInTheDocument();
    });

    it("should show save and cancel buttons in edit mode", async () => {
      render(<PromptEditor {...mockProps} />);
      
      // Click edit button to enter edit mode
      const editButton = screen.getByTitle("Edit prompt");
      await userEvent.click(editButton);
      
      // Should have save and cancel buttons
      expect(screen.getByTitle("Save changes")).toBeInTheDocument();
      expect(screen.getByTitle("Cancel editing")).toBeInTheDocument();
    });

    it("should allow editing title in edit mode", async () => {
      render(<PromptEditor {...mockProps} />);
      
      // Click edit button to enter edit mode
      const editButton = screen.getByTitle("Edit prompt");
      await userEvent.click(editButton);
      
      const titleInput = screen.getByDisplayValue("Test Prompt");
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, "Updated Title");
      
      expect(titleInput).toHaveValue("Updated Title");
    });

    it("should allow editing content in edit mode", async () => {
      render(<PromptEditor {...mockProps} />);
      
      // Click edit button to enter edit mode
      const editButton = screen.getByTitle("Edit prompt");
      await userEvent.click(editButton);
      
      const contentInput = screen.getByDisplayValue("This is test content with **bold** and *italic* text.");
      await userEvent.clear(contentInput);
      await userEvent.type(contentInput, "Updated content");
      
      expect(contentInput).toHaveValue("Updated content");
    });
  });

  describe("Save and Cancel", () => {
    it("should save changes when save button is clicked", async () => {
      render(<PromptEditor {...mockProps} />);
      
      // Click edit button to enter edit mode
      const editButton = screen.getByTitle("Edit prompt");
      await userEvent.click(editButton);
      
      const titleInput = screen.getByDisplayValue("Test Prompt");
      const contentInput = screen.getByDisplayValue("This is test content with **bold** and *italic* text.");
      
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, "Updated Title");
      await userEvent.clear(contentInput);
      await userEvent.type(contentInput, "Updated content");
      
      const saveButton = screen.getByTitle("Save changes");
      await userEvent.click(saveButton);
      
      expect(mockProps.onUpdatePrompt).toHaveBeenCalledWith("test-prompt", {
        title: "Updated Title",
        content: "Updated content"
      });
    });

    it("should cancel editing when cancel button is clicked", async () => {
      render(<PromptEditor {...mockProps} />);
      
      // Click edit button to enter edit mode
      const editButton = screen.getByTitle("Edit prompt");
      await userEvent.click(editButton);
      
      const titleInput = screen.getByDisplayValue("Test Prompt");
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, "This won't be saved");
      
      const cancelButton = screen.getByTitle("Cancel editing");
      await userEvent.click(cancelButton);
      
      // Should return to read-only mode
      expect(screen.getByText("Test Prompt")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("This won't be saved")).not.toBeInTheDocument();
    });
  });

  describe("Copy Functionality", () => {
    it("should copy prompt content when copy button is clicked", async () => {
      // Mock clipboard API
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      };
      Object.assign(navigator, { clipboard: mockClipboard });
      
      render(<PromptEditor {...mockProps} />);
      
      const copyButton = screen.getByTitle("Copy to clipboard");
      await userEvent.click(copyButton);
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith("This is test content with **bold** and *italic* text.");
    });
  });

  describe("Tag Management", () => {
    it("should display tags", () => {
      render(<PromptEditor {...mockProps} />);
      
      // Should display the tags
      expect(screen.getByText("Tag 1")).toBeInTheDocument();
      expect(screen.getByText("Tag 2")).toBeInTheDocument();
    });
  });
}); 