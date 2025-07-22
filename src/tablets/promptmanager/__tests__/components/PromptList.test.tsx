import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { PromptList } from "../../components/PromptList";
import { Prompt, Tag } from "../../types";

describe("PromptList", () => {
  const mockPrompts: Prompt[] = [
    {
      id: "prompt-1",
      title: "Test Prompt 1",
      content: "This is test content 1",
      tags: ["tag1", "tag2"],
      isFavorite: false,
      createdAt: Date.now() - 1000,
      lastModified: Date.now() - 500,
      usageCount: 5,
      history: []
    },
    {
      id: "prompt-2",
      title: "Test Prompt 2",
      content: "This is test content 2",
      tags: ["tag1"],
      isFavorite: true,
      createdAt: Date.now() - 2000,
      lastModified: Date.now() - 1000,
      usageCount: 10,
      history: []
    },
    {
      id: "prompt-3",
      title: "Another Prompt",
      content: "This is another test content",
      tags: ["tag3"],
      isFavorite: false,
      createdAt: Date.now() - 3000,
      lastModified: Date.now() - 1500,
      usageCount: 2,
      history: []
    }
  ];

  const mockTags: Tag[] = [
    { id: "tag1", name: "Tag 1", color: "#ff0000" },
    { id: "tag2", name: "Tag 2", color: "#00ff00" },
    { id: "tag3", name: "Tag 3", color: "#0000ff" }
  ];

  const mockProps = {
    prompts: mockPrompts,
    tags: mockTags,
    selectedPromptId: null,
    sortBy: "lastModified" as const,
    sortDirection: "desc" as const,
    viewMode: "list" as const,
    onSelectPrompt: jest.fn(),
    onCreatePrompt: jest.fn(),
    onDeletePrompt: jest.fn(),
    onClonePrompt: jest.fn(),
    onToggleFavorite: jest.fn(),
    onStartFromTemplate: jest.fn(),
    onViewModeChange: jest.fn(),
    onSortChange: jest.fn(),
    onSortDirectionChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render all prompts", () => {
      render(<PromptList {...mockProps} />);
      
      expect(screen.getByText("Test Prompt 1")).toBeInTheDocument();
      expect(screen.getByText("Test Prompt 2")).toBeInTheDocument();
      expect(screen.getByText("Another Prompt")).toBeInTheDocument();
    });

    it("should render the header with title", () => {
      render(<PromptList {...mockProps} />);
      
      expect(screen.getByText("Prompts")).toBeInTheDocument();
    });

    it("should render the New Prompt button", () => {
      render(<PromptList {...mockProps} />);
      
      expect(screen.getByText("New Prompt")).toBeInTheDocument();
    });

    it("should render empty state when no prompts", () => {
      render(<PromptList {...mockProps} prompts={[]} />);
      
      expect(screen.getByText("No prompts found")).toBeInTheDocument();
      expect(screen.getByText("Create your first prompt")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("should call onSelectPrompt when a prompt is clicked", async () => {
      render(<PromptList {...mockProps} />);
      
      const promptElement = screen.getByText("Test Prompt 1");
      await userEvent.click(promptElement);
      
      expect(mockProps.onSelectPrompt).toHaveBeenCalledWith("prompt-1");
    });

    it("should call onToggleFavorite when star button is clicked", async () => {
      render(<PromptList {...mockProps} />);
      
      const starButtons = screen.getAllByTitle("Add to favorites");
      const firstStarButton = starButtons[0];
      await userEvent.click(firstStarButton);
      
      expect(mockProps.onToggleFavorite).toHaveBeenCalledWith("prompt-1");
    });

    it("should call onClonePrompt when clone button is clicked", async () => {
      render(<PromptList {...mockProps} />);
      
      // Find the first clone button (they're all visible in test environment)
      const cloneButtons = screen.getAllByTitle("Clone prompt");
      const firstCloneButton = cloneButtons[0];
      
      await userEvent.click(firstCloneButton);
      
      expect(mockProps.onClonePrompt).toHaveBeenCalledWith("prompt-1");
    });

    it("should call onDeletePrompt when delete button is clicked", async () => {
      render(<PromptList {...mockProps} />);
      
      // Find the first delete button (they're all visible in test environment)
      const deleteButtons = screen.getAllByTitle("Delete prompt");
      const firstDeleteButton = deleteButtons[0];
      
      await userEvent.click(firstDeleteButton);
      
      expect(mockProps.onDeletePrompt).toHaveBeenCalledWith("prompt-1");
    });

    it("should call onCreatePrompt when New Prompt button is clicked", async () => {
      render(<PromptList {...mockProps} />);
      
      const newPromptButton = screen.getByText("New Prompt");
      await userEvent.click(newPromptButton);
      
      // The button opens a menu, so we need to click the "Start from Blank" option
      await waitFor(() => {
        expect(screen.getByText("Start from Blank")).toBeInTheDocument();
      });
      
      const startFromBlankButton = screen.getByText("Start from Blank");
      await userEvent.click(startFromBlankButton);
      
      expect(mockProps.onCreatePrompt).toHaveBeenCalledWith({
        title: "Untitled Prompt",
        content: "",
        tags: [],
        isFavorite: false,
      });
    });

    it("should call onStartFromTemplate when Start from Template is clicked", async () => {
      render(<PromptList {...mockProps} />);
      
      const newPromptButton = screen.getByText("New Prompt");
      await userEvent.click(newPromptButton);
      
      // Wait for the menu to appear
      await waitFor(() => {
        expect(screen.getByText("Start from Template")).toBeInTheDocument();
      });
      
      const startFromTemplateButton = screen.getByText("Start from Template");
      await userEvent.click(startFromTemplateButton);
      
      expect(mockProps.onStartFromTemplate).toHaveBeenCalled();
    });
  });

  describe("View Modes", () => {
    it("should render in list mode by default", () => {
      render(<PromptList {...mockProps} viewMode="list" />);
      
      // Check that prompts are rendered in list format
      const promptElements = screen.getAllByText(/Test Prompt/);
      expect(promptElements.length).toBeGreaterThan(0);
    });

    it("should render in grid mode when specified", () => {
      render(<PromptList {...mockProps} viewMode="grid" />);
      
      // Check that prompts are rendered in grid format
      const promptElements = screen.getAllByText(/Test Prompt/);
      expect(promptElements.length).toBeGreaterThan(0);
    });

    it("should call onViewModeChange when view mode button is clicked", async () => {
      render(<PromptList {...mockProps} />);
      
      const viewModeButton = screen.getByTitle("Switch to grid view");
      await userEvent.click(viewModeButton);
      
      expect(mockProps.onViewModeChange).toHaveBeenCalled();
    });
  });

  describe("Selection State", () => {
    it("should highlight selected prompt", () => {
      render(<PromptList {...mockProps} selectedPromptId="prompt-1" />);
      
      // Find the prompt container that has the bg-gray-800 class
      const promptContainers = screen.getAllByText("Test Prompt 1");
      const selectedContainer = promptContainers[0].closest('.group');
      expect(selectedContainer).toHaveClass("bg-gray-800");
    });

    it("should not highlight unselected prompts", () => {
      render(<PromptList {...mockProps} selectedPromptId="prompt-1" />);
      
      // Find the unselected prompt container
      const unselectedContainers = screen.getAllByText("Test Prompt 2");
      const unselectedContainer = unselectedContainers[0].closest('.group');
      expect(unselectedContainer).not.toHaveClass("bg-gray-800");
    });
  });

  describe("Tags", () => {
    it("should render tags for prompts", () => {
      render(<PromptList {...mockProps} />);
      
      expect(screen.getAllByText("Tag 1")).toHaveLength(2); // Tag 1 appears twice
      expect(screen.getAllByText("Tag 2")).toHaveLength(1); // Tag 2 appears once
    });

    it("should not render tags section when prompt has no tags", () => {
      const promptsWithoutTags = mockPrompts.map(p => ({ ...p, tags: [] }));
      render(<PromptList {...mockProps} prompts={promptsWithoutTags} />);
      
      expect(screen.queryByText("Tag 1")).not.toBeInTheDocument();
    });
  });

  describe("Favorites", () => {
    it("should show filled star for favorite prompts", () => {
      render(<PromptList {...mockProps} />);
      
      const favoriteStar = screen.getByTitle("Remove from favorites");
      expect(favoriteStar).toBeInTheDocument();
    });

    it("should show empty star for non-favorite prompts", () => {
      render(<PromptList {...mockProps} />);
      
      const nonFavoriteStars = screen.getAllByTitle("Add to favorites");
      expect(nonFavoriteStars.length).toBeGreaterThan(0);
    });
  });

  describe("Performance", () => {
    it("should handle large numbers of prompts", () => {
      const largePromptList = Array.from({ length: 1000 }, (_, i) => ({
        id: `prompt-${i}`,
        title: `Prompt ${i}`,
        content: `Content ${i}`,
        tags: [],
        isFavorite: false,
        createdAt: Date.now() - i * 1000,
        lastModified: Date.now() - i * 500,
        usageCount: i,
        history: []
      }));

      render(<PromptList {...mockProps} prompts={largePromptList} />);
      
      expect(screen.getByText("Prompt 0")).toBeInTheDocument();
      expect(screen.getByText("Prompt 999")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed prompt data", () => {
      const malformedPrompts = [
        {
          id: "malformed-1",
          title: "Malformed Prompt",
          content: "Content",
          tags: ["invalid-tag"], // Tag that doesn't exist
          isFavorite: false,
          createdAt: Date.now(),
          lastModified: Date.now(),
          usageCount: 0,
          history: []
        }
      ];

      render(<PromptList {...mockProps} prompts={malformedPrompts} />);
      
      // Should not crash and should still render the prompt
      expect(screen.getByText("Malformed Prompt")).toBeInTheDocument();
    });

    it("should handle missing tag data", () => {
      render(<PromptList {...mockProps} tags={[]} />);
      
      // Should not crash and should still render prompts
      expect(screen.getByText("Test Prompt 1")).toBeInTheDocument();
    });
  });
}); 