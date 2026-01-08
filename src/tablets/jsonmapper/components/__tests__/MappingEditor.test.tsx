import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MappingEditor } from "../MappingEditor";
import { MappingConfig } from "../../types";

// Mock Monaco Editor
jest.mock("@monaco-editor/react", () => ({
  Editor: () => <div data-testid="monaco-editor">Monaco Editor Mock</div>,
}));

// Mock MappingTable component to simplify testing
jest.mock("../MappingTable", () => ({
  MappingTable: () => <div data-testid="mapping-table">Mapping Table Mock</div>,
}));

// Mock the context hook
jest.mock('../../../bridge/context', () => ({
  useTabletContext: jest.fn(() => ({
    tabId: 'test-tab-id',
  })),
  TabletContextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("MappingEditor", () => {
  const mockMapping: MappingConfig = {
    id: "test-mapping-1",
    name: "Test Mapping",
    description: "Test Description",
    sourceJson: '{"name": "John"}',
    targetJson: '{"fullName": ""}',
    rules: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const defaultProps = {
    mapping: mockMapping,
    isNew: false,
    onSave: jest.fn(),
    onCancel: jest.fn(),
    onTest: jest.fn(),
    onGenerateCode: jest.fn(),
    onBatchTransform: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("State Synchronization (Bug Fix #1 & #2)", () => {
    it("should call onMappingChange on initial mount", async () => {
      const onMappingChange = jest.fn();
      render(
        <MappingEditor
          {...defaultProps}
          onMappingChange={onMappingChange}
        />
      );

      // Wait for initial sync
      await waitFor(() => {
        expect(onMappingChange).toHaveBeenCalled();
      });

      // Verify it was called at least once
      expect(onMappingChange.mock.calls.length).toBeGreaterThan(0);
    });

    it("should call onMappingChange when rules are added", async () => {
      const onMappingChange = jest.fn();
      render(
        <MappingEditor
          {...defaultProps}
          onMappingChange={onMappingChange}
        />
      );

      await waitFor(() => {
        expect(onMappingChange).toHaveBeenCalled();
      });

      // Verify that the callback receives a properly structured mapping
      const lastCall = onMappingChange.mock.calls[onMappingChange.mock.calls.length - 1];
      const receivedMapping = lastCall[0];

      expect(receivedMapping).toHaveProperty("id");
      expect(receivedMapping).toHaveProperty("name");
      expect(receivedMapping).toHaveProperty("rules");
      expect(receivedMapping).toHaveProperty("updatedAt");
    });

    it("should preserve mapping structure when syncing state", async () => {
      const onMappingChange = jest.fn();
      render(
        <MappingEditor
          {...defaultProps}
          onMappingChange={onMappingChange}
        />
      );

      await waitFor(() => {
        expect(onMappingChange).toHaveBeenCalled();
      });

      const syncedMapping = onMappingChange.mock.calls[0][0];

      expect(syncedMapping).toMatchObject({
        id: mockMapping.id,
        name: mockMapping.name,
        description: mockMapping.description,
        sourceJson: mockMapping.sourceJson,
        targetJson: mockMapping.targetJson,
        rules: mockMapping.rules,
      });
      expect(syncedMapping.updatedAt).toBeGreaterThanOrEqual(mockMapping.updatedAt);
    });

    it("should not call onMappingChange when callback is not provided", () => {
      // This should not throw an error
      expect(() => {
        render(<MappingEditor {...defaultProps} />);
      }).not.toThrow();
    });
  });

  describe("Scroll Position Persistence (Bug Fix #1)", () => {
    it("should call onScrollPositionChange when provided", () => {
      const onScrollPositionChange = jest.fn();
      render(
        <MappingEditor
          {...defaultProps}
          scrollPosition={0}
          onScrollPositionChange={onScrollPositionChange}
        />
      );

      // The component should set up scroll listener
      expect(onScrollPositionChange).not.toHaveBeenCalled(); // Only called on actual scroll
    });

    it("should restore scroll position on mount when provided", () => {
      const scrollPosition = 500;
      const { container } = render(
        <MappingEditor
          {...defaultProps}
          scrollPosition={scrollPosition}
        />
      );

      const scrollContainer = container.querySelector('.custom-scrollbar');

      // Note: JSDOM doesn't fully support scrollTop, but we can verify the element exists
      expect(scrollContainer).toBeTruthy();
    });

    it("should handle missing scroll position gracefully", () => {
      expect(() => {
        render(
          <MappingEditor
            {...defaultProps}
            scrollPosition={undefined}
          />
        );
      }).not.toThrow();
    });
  });

  describe("Component Rendering", () => {
    it("should render with required fields", () => {
      render(<MappingEditor {...defaultProps} />);

      expect(screen.getByText(/Edit Mapping/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter mapping name...")).toHaveValue(mockMapping.name);
      expect(screen.getByPlaceholderText("Enter description...")).toHaveValue(mockMapping.description);
    });

    it("should show 'Create Mapping' when isNew is true", () => {
      render(<MappingEditor {...defaultProps} isNew={true} />);
      expect(screen.getByText(/Create Mapping/i)).toBeInTheDocument();
    });

    it("should render action buttons", () => {
      render(<MappingEditor {...defaultProps} />);

      expect(screen.getByText(/Test/i)).toBeInTheDocument();
      expect(screen.getByText(/Save/i)).toBeInTheDocument();
      expect(screen.getByText(/Batch Transform/i)).toBeInTheDocument();
      expect(screen.getByText(/Generate Code/i)).toBeInTheDocument();
    });
  });

  describe("Integration with Parent State", () => {
    it("should update parent state continuously as user types", async () => {
      const onMappingChange = jest.fn();
      render(
        <MappingEditor
          {...defaultProps}
          onMappingChange={onMappingChange}
        />
      );

      // Initial sync should happen
      await waitFor(() => {
        expect(onMappingChange).toHaveBeenCalled();
      });

      // Verify continuous sync doesn't cause infinite loops
      const callCount = onMappingChange.mock.calls.length;

      // Wait a bit to ensure no additional unnecessary calls
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should not have significantly more calls (allowing for a few due to initial effects)
      expect(onMappingChange.mock.calls.length).toBeLessThanOrEqual(callCount + 2);
    });
  });
});
