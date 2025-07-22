import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { WorkflowEditor } from "../../components/WorkflowEditor";
import { Workflow, Prompt, Tag } from "../../types";

describe("WorkflowEditor", () => {
  const mockWorkflow: Workflow = {
    id: "workflow-1",
    title: "Test Workflow",
    description: "This is a test workflow",
    steps: [
      { id: "step-1", promptId: "prompt-1", stepTitle: "Step 1" },
      { id: "step-2", promptId: "prompt-2", stepTitle: "Step 2" }
    ],
    tags: ["tag1", "tag2"],
    isFavorite: false,
    createdAt: Date.now(),
    lastModified: Date.now()
  };

  const mockPrompts: Prompt[] = [
    {
      id: "prompt-1",
      title: "Test Prompt 1",
      content: "This is test content 1",
      tags: ["tag1"],
      isFavorite: false,
      createdAt: Date.now(),
      lastModified: Date.now(),
      usageCount: 5,
      history: []
    },
    {
      id: "prompt-2",
      title: "Test Prompt 2",
      content: "This is test content 2",
      tags: ["tag2"],
      isFavorite: true,
      createdAt: Date.now(),
      lastModified: Date.now(),
      usageCount: 10,
      history: []
    }
  ];

  const mockTags: Tag[] = [
    { id: "tag1", name: "Tag 1", color: "#ff0000" },
    { id: "tag2", name: "Tag 2", color: "#00ff00" },
    { id: "tag3", name: "Tag 3", color: "#0000ff" }
  ];

  const mockProps = {
    workflow: mockWorkflow,
    prompts: mockPrompts,
    tags: mockTags,
    onUpdateWorkflow: jest.fn(),
    onSave: jest.fn(),
    onCancel: jest.fn(),
    onDelete: jest.fn(),
    onClone: jest.fn(),
    onToggleFavorite: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the workflow editor", () => {
      render(<WorkflowEditor {...mockProps} />);
      
      expect(screen.getByText("Test Workflow")).toBeInTheDocument();
      expect(screen.getByText("This is a test workflow")).toBeInTheDocument();
    });

    it("should display tags", () => {
      render(<WorkflowEditor {...mockProps} />);
      
      expect(screen.getByText("Tag 1")).toBeInTheDocument();
      expect(screen.getByText("Tag 2")).toBeInTheDocument();
    });

    it("should display edit button", () => {
      render(<WorkflowEditor {...mockProps} />);
      
      expect(screen.getByTitle("Edit workflow")).toBeInTheDocument();
    });

    it("should display copy button", () => {
      render(<WorkflowEditor {...mockProps} />);
      
      expect(screen.getByTitle("Copy all steps")).toBeInTheDocument();
    });

    it("should display tag management button", () => {
      render(<WorkflowEditor {...mockProps} />);
      
      expect(screen.getByTitle("Manage tags")).toBeInTheDocument();
    });
  });

  describe("Workflow Editing", () => {
    it("should allow editing title when edit mode is activated", async () => {
      render(<WorkflowEditor {...mockProps} />);
      
      // Click the edit button to enter edit mode
      const editButton = screen.getByTitle("Edit workflow");
      await userEvent.click(editButton);
      
      // Now the title should be editable
      const titleInput = screen.getByDisplayValue("Test Workflow");
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, "Updated Workflow");
      
      expect(titleInput).toHaveValue("Updated Workflow");
    });

    it("should allow editing description when edit mode is activated", async () => {
      render(<WorkflowEditor {...mockProps} />);
      
      // Click the edit button to enter edit mode
      const editButton = screen.getByTitle("Edit workflow");
      await userEvent.click(editButton);
      
      // Now the description should be editable
      const descriptionInput = screen.getByDisplayValue("This is a test workflow");
      await userEvent.clear(descriptionInput);
      await userEvent.type(descriptionInput, "Updated description");
      
      expect(descriptionInput).toHaveValue("Updated description");
    });

    it("should save changes when save button is clicked", async () => {
      render(<WorkflowEditor {...mockProps} />);
      
      // Enter edit mode
      const editButton = screen.getByTitle("Edit workflow");
      await userEvent.click(editButton);
      
      // Edit the title
      const titleInput = screen.getByDisplayValue("Test Workflow");
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, "Updated Workflow");
      
      // Click save button
      const saveButton = screen.getByTitle("Save changes");
      await userEvent.click(saveButton);
      
      expect(mockProps.onUpdateWorkflow).toHaveBeenCalledWith("workflow-1", {
        title: "Updated Workflow",
        description: "This is a test workflow"
      });
    });

    it("should cancel changes when cancel button is clicked", async () => {
      render(<WorkflowEditor {...mockProps} />);
      
      // Enter edit mode
      const editButton = screen.getByTitle("Edit workflow");
      await userEvent.click(editButton);
      
      // Edit the title
      const titleInput = screen.getByDisplayValue("Test Workflow");
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, "Updated Workflow");
      
      // Click cancel button
      const cancelButton = screen.getByTitle("Cancel editing");
      await userEvent.click(cancelButton);
      
      // Title should be back to original
      expect(titleInput).toHaveValue("Test Workflow");
    });
  });

  describe("Copy Functionality", () => {
    it("should copy all steps when copy button is clicked", async () => {
      render(<WorkflowEditor {...mockProps} />);
      
      const copyButton = screen.getByTitle("Copy all steps");
      await userEvent.click(copyButton);
      
      // Should call navigator.clipboard.writeText
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  describe("Tag Management", () => {
    it("should show tag selector when tag button is clicked", async () => {
      render(<WorkflowEditor {...mockProps} />);
      
      // Click tag management button
      const tagButton = screen.getByTitle("Manage tags");
      await userEvent.click(tagButton);
      
      // Should show tag selector
      expect(screen.getByText("Tag 3")).toBeInTheDocument();
    });
  });
}); 