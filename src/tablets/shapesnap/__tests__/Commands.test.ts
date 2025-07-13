import {
  AddShapeCommand,
  UpdateShapeCommand,
  DeleteShapeCommand,
  DeleteSelectedShapesCommand,
  MoveShapeCommand,
  CommandManager,
} from "../core/Commands";
import { ShapeSnapData, Shape } from "../types";

describe("Commands", () => {
  let mockState: ShapeSnapData;
  let mockOnChange: jest.Mock;

  const createMockShape = (
    id: string,
    type: "rectangle" | "line" = "rectangle",
  ): Shape =>
    ({
      id,
      type,
      style: { stroke: "#000", strokeWidth: 2 },
      zIndex: Date.now(),
      ...(type === "rectangle"
        ? { x: 0, y: 0, width: 100, height: 100 }
        : {
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 100 },
            ],
          }),
    }) as Shape;

  beforeEach(() => {
    mockState = {
      shapes: [],
      canvas: { background: "#fff", mode: "light" },
      currentTool: "draw",
      history: [[]],
      historyIndex: 0,
      currentFontSize: 16,
      selectedShapeIds: [],
      clipboard: [],
    };
    mockOnChange = jest.fn((newState) => {
      mockState = newState;
    });
  });

  // Helper function to get current state
  const getCurrentState = () => mockState;

  describe("AddShapeCommand", () => {
    it("should add a shape to the canvas", () => {
      const shape = createMockShape("shape1");
      const command = new AddShapeCommand(getCurrentState, mockOnChange, shape);

      command.execute();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.shapes).toContain(shape);
      expect(newState.shapes.length).toBe(1);
    });

    it("should undo shape addition", () => {
      const shape = createMockShape("shape1");
      const command = new AddShapeCommand(getCurrentState, mockOnChange, shape);

      // Execute and update state
      command.execute();
      mockState = mockOnChange.mock.calls[0][0];

      // Reset mock and undo
      mockOnChange.mockClear();
      command.undo();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.shapes).not.toContain(shape);
      expect(newState.shapes.length).toBe(0);
    });

    it("should not add shape multiple times on repeated execute", () => {
      const shape = createMockShape("shape1");
      const command = new AddShapeCommand(getCurrentState, mockOnChange, shape);

      command.execute();
      mockState = mockOnChange.mock.calls[0][0];
      mockOnChange.mockClear();

      command.execute(); // Execute again

      expect(mockOnChange).not.toHaveBeenCalled();
      expect(mockState.shapes.length).toBe(1);
    });
  });

  describe("UpdateShapeCommand", () => {
    let existingShape: Shape;

    beforeEach(() => {
      existingShape = createMockShape("shape1");
      mockState.shapes = [existingShape];
    });

    it("should update shape properties", () => {
      const updates = { x: 50, y: 50 };
      const command = new UpdateShapeCommand(
        getCurrentState,
        mockOnChange,
        "shape1",
        updates,
      );

      command.execute();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      const updatedShape = newState.shapes.find(
        (s: Shape) => s.id === "shape1",
      );
      expect(updatedShape.x).toBe(50);
      expect(updatedShape.y).toBe(50);
    });

    it("should undo shape updates", () => {
      const updates = { x: 50, y: 50 };
      const command = new UpdateShapeCommand(
        getCurrentState,
        mockOnChange,
        "shape1",
        updates,
      );

      // Execute and update state
      command.execute();
      mockState = mockOnChange.mock.calls[0][0];

      // Reset mock and undo
      mockOnChange.mockClear();
      command.undo();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      const revertedShape = newState.shapes.find(
        (s: Shape) => s.id === "shape1",
      );
      expect(revertedShape.x).toBe(0); // Original value
      expect(revertedShape.y).toBe(0); // Original value
    });

    it("should handle non-existent shape gracefully", () => {
      const command = new UpdateShapeCommand(
        getCurrentState,
        mockOnChange,
        "nonexistent",
        { x: 50 },
      );

      command.execute();

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe("DeleteShapeCommand", () => {
    let existingShape: Shape;

    beforeEach(() => {
      existingShape = createMockShape("shape1");
      mockState.shapes = [existingShape];
    });

    it("should delete a shape from the canvas", () => {
      const command = new DeleteShapeCommand(
        getCurrentState,
        mockOnChange,
        "shape1",
      );

      command.execute();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(
        newState.shapes.find((s: Shape) => s.id === "shape1"),
      ).toBeUndefined();
      expect(newState.shapes.length).toBe(0);
    });

    it("should undo shape deletion", () => {
      const command = new DeleteShapeCommand(
        getCurrentState,
        mockOnChange,
        "shape1",
      );

      // Execute and update state
      command.execute();
      mockState = mockOnChange.mock.calls[0][0];

      // Reset mock and undo
      mockOnChange.mockClear();
      command.undo();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      const restoredShape = newState.shapes.find(
        (s: Shape) => s.id === "shape1",
      );
      expect(restoredShape).toBeDefined();
      expect(restoredShape?.id).toBe("shape1");
    });

    it("should remove shape from selection when deleted", () => {
      mockState.selectedShapeIds = ["shape1"];
      const command = new DeleteShapeCommand(
        getCurrentState,
        mockOnChange,
        "shape1",
      );

      command.execute();

      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).not.toContain("shape1");
    });
  });

  describe("DeleteSelectedShapesCommand", () => {
    let shapes: Shape[];

    beforeEach(() => {
      shapes = [
        createMockShape("shape1"),
        createMockShape("shape2"),
        createMockShape("shape3"),
      ];
      mockState.shapes = shapes;
      mockState.selectedShapeIds = ["shape1", "shape3"];
    });

    it("should delete multiple selected shapes", () => {
      const command = new DeleteSelectedShapesCommand(
        getCurrentState,
        mockOnChange,
        ["shape1", "shape3"],
      );

      command.execute();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.shapes.length).toBe(1);
      expect(newState.shapes[0].id).toBe("shape2");
      expect(newState.selectedShapeIds).toEqual([]);
    });

    it("should undo multiple shape deletion", () => {
      const command = new DeleteSelectedShapesCommand(
        getCurrentState,
        mockOnChange,
        ["shape1", "shape3"],
      );

      // Execute and update state
      command.execute();
      mockState = mockOnChange.mock.calls[0][0];

      // Reset mock and undo
      mockOnChange.mockClear();
      command.undo();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.shapes.length).toBe(3);
      expect(newState.shapes.map((s: Shape) => s.id).sort()).toEqual([
        "shape1",
        "shape2",
        "shape3",
      ]);
    });
  });

  describe("MoveShapeCommand", () => {
    let existingShape: Shape;

    beforeEach(() => {
      existingShape = createMockShape("shape1");
      mockState.shapes = [existingShape];
    });

    it("should move a rectangle shape", () => {
      const delta = { x: 50, y: 30 };
      const command = new MoveShapeCommand(
        getCurrentState,
        mockOnChange,
        "shape1",
        delta,
      );

      command.execute();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      const movedShape = newState.shapes.find((s: Shape) => s.id === "shape1");
      expect(movedShape.x).toBe(50); // 0 + 50
      expect(movedShape.y).toBe(30); // 0 + 30
    });

    it("should move a line shape", () => {
      const lineShape = createMockShape("line1", "line");
      mockState.shapes = [lineShape];

      const delta = { x: 20, y: 10 };
      const command = new MoveShapeCommand(
        getCurrentState,
        mockOnChange,
        "line1",
        delta,
      );

      command.execute();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      const movedShape = newState.shapes.find(
        (s: Shape) => s.id === "line1",
      ) as any;
      expect(movedShape.points[0].x).toBe(20); // 0 + 20
      expect(movedShape.points[0].y).toBe(10); // 0 + 10
      expect(movedShape.points[1].x).toBe(120); // 100 + 20
      expect(movedShape.points[1].y).toBe(110); // 100 + 10
    });

    it("should undo shape movement", () => {
      const delta = { x: 50, y: 30 };
      const command = new MoveShapeCommand(
        getCurrentState,
        mockOnChange,
        "shape1",
        delta,
      );

      // Execute and update state
      command.execute();
      mockState = mockOnChange.mock.calls[0][0];

      // Reset mock and undo
      mockOnChange.mockClear();
      command.undo();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      const revertedShape = newState.shapes.find(
        (s: Shape) => s.id === "shape1",
      );
      expect(revertedShape.x).toBe(0); // Back to original position
      expect(revertedShape.y).toBe(0); // Back to original position
    });
  });

  describe("CommandManager", () => {
    let commandManager: CommandManager;

    beforeEach(() => {
      commandManager = new CommandManager();
    });

    it("should execute commands in order", () => {
      const shape1 = createMockShape("shape1");
      const shape2 = createMockShape("shape2");

      const command1 = new AddShapeCommand(
        getCurrentState,
        mockOnChange,
        shape1,
      );
      const command2 = new AddShapeCommand(
        getCurrentState,
        mockOnChange,
        shape2,
      );

      commandManager.executeCommand(command1);
      mockState = mockOnChange.mock.calls[0][0]; // Update state
      mockOnChange.mockClear();

      commandManager.executeCommand(command2);

      expect(mockOnChange).toHaveBeenCalled();
      const finalState = mockOnChange.mock.calls[0][0];
      expect(finalState.shapes.length).toBe(2);
    });

    it("should undo commands", () => {
      const shape = createMockShape("shape1");
      const command = new AddShapeCommand(getCurrentState, mockOnChange, shape);

      commandManager.executeCommand(command);
      mockState = mockOnChange.mock.calls[0][0];
      mockOnChange.mockClear();

      const undoResult = commandManager.undo();

      expect(undoResult).toBe(true);
      expect(mockOnChange).toHaveBeenCalled();
    });

    it("should redo commands", () => {
      const shape = createMockShape("shape1");
      const command = new AddShapeCommand(getCurrentState, mockOnChange, shape);

      commandManager.executeCommand(command);
      commandManager.undo();
      mockOnChange.mockClear();

      const redoResult = commandManager.redo();

      expect(redoResult).toBe(true);
      expect(mockOnChange).toHaveBeenCalled();
    });

    it("should report undo/redo availability correctly", () => {
      expect(commandManager.canUndo()).toBe(false);
      expect(commandManager.canRedo()).toBe(false);

      const shape = createMockShape("shape1");
      const command = new AddShapeCommand(getCurrentState, mockOnChange, shape);
      commandManager.executeCommand(command);

      expect(commandManager.canUndo()).toBe(true);
      expect(commandManager.canRedo()).toBe(false);

      commandManager.undo();

      expect(commandManager.canUndo()).toBe(false);
      expect(commandManager.canRedo()).toBe(true);
    });

    it("should clear command history", () => {
      const shape = createMockShape("shape1");
      const command = new AddShapeCommand(getCurrentState, mockOnChange, shape);
      commandManager.executeCommand(command);

      expect(commandManager.canUndo()).toBe(true);

      commandManager.clear();

      expect(commandManager.canUndo()).toBe(false);
      expect(commandManager.canRedo()).toBe(false);
    });

    it("should provide command history", () => {
      const shape1 = createMockShape("shape1");
      const shape2 = createMockShape("shape2");

      const command1 = new AddShapeCommand(
        getCurrentState,
        mockOnChange,
        shape1,
      );
      const command2 = new AddShapeCommand(
        getCurrentState,
        mockOnChange,
        shape2,
      );

      commandManager.executeCommand(command1);
      commandManager.executeCommand(command2);

      const history = commandManager.getCommandHistory();
      expect(history).toEqual(["Add rectangle", "Add rectangle"]);
    });
  });
});
