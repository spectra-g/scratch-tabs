import { 
  CommandManager, 
  AddShapeCommand, 
  DeleteShapeCommand,
  MoveShapeCommand 
} from '../core/Commands';
import { ShapeSnapData, Shape } from '../types';

describe('CommandManager', () => {
  let mockState: ShapeSnapData;
  let mockOnChange: jest.Mock;
  let commandManager: CommandManager;

  const createMockShape = (id: string, type: 'rectangle' | 'line' = 'rectangle'): Shape => ({
    id,
    type,
    style: { stroke: '#000', strokeWidth: 2 },
    zIndex: Date.now(),
    ...(type === 'rectangle' ? { x: 0, y: 0, width: 100, height: 100 } : { points: [{ x: 0, y: 0 }, { x: 100, y: 100 }] })
  } as Shape);

  beforeEach(() => {
    mockState = {
      shapes: [],
      canvas: { background: '#fff', mode: 'light' },
      currentTool: 'draw',
      history: [[]],
      historyIndex: 0,
      currentFontSize: 16,
      selectedShapeIds: [],
      clipboard: []
    };
    mockOnChange = jest.fn((newState) => {
      mockState = newState;
    });
    commandManager = new CommandManager();
  });

  // Helper function to get current state
  const getCurrentState = () => mockState;

  describe('Double State Update Issue', () => {
    it('should demonstrate that onChange is called twice for each command', () => {
      const shape = createMockShape('shape1');
      const command = new AddShapeCommand(getCurrentState, mockOnChange, shape);

      // Clear mock before executing
      mockOnChange.mockClear();

      commandManager.executeCommand(command);

      // This should fail - onChange is called more than once
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should properly add shape without state corruption', () => {
      const shape = createMockShape('shape1');
      const command = new AddShapeCommand(getCurrentState, mockOnChange, shape);

      commandManager.executeCommand(command);

      // Verify shape was added correctly
      expect(mockState.shapes).toHaveLength(1);
      expect(mockState.shapes[0].id).toBe('shape1');
      
      // Verify history was updated
      expect(mockState.history).toHaveLength(2); // Initial empty state + new state
      expect(mockState.historyIndex).toBe(1);
    });

    it('should properly delete shape', () => {
      // First add a shape
      const shape = createMockShape('shape1');
      const addCommand = new AddShapeCommand(getCurrentState, mockOnChange, shape);
      commandManager.executeCommand(addCommand);
      
      // Clear mock and verify initial state
      mockOnChange.mockClear();
      expect(mockState.shapes).toHaveLength(1);

      // Now delete the shape
      const deleteCommand = new DeleteShapeCommand(getCurrentState, mockOnChange, 'shape1');
      commandManager.executeCommand(deleteCommand);

      // Verify shape was deleted
      expect(mockState.shapes).toHaveLength(0);
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should properly move shape without bouncing back', () => {
      // First add a shape
      const shape = createMockShape('shape1');
      const addCommand = new AddShapeCommand(getCurrentState, mockOnChange, shape);
      commandManager.executeCommand(addCommand);
      
      // Clear mock
      mockOnChange.mockClear();

      // Move the shape
      const moveCommand = new MoveShapeCommand(getCurrentState, mockOnChange, 'shape1', { x: 50, y: 30 });
      commandManager.executeCommand(moveCommand);

      // Verify shape was moved correctly
      expect((mockState.shapes[0] as any).x).toBe(50);
      expect((mockState.shapes[0] as any).y).toBe(30);
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should support undo/redo correctly', () => {
      // Add a shape
      const shape = createMockShape('shape1');
      const addCommand = new AddShapeCommand(getCurrentState, mockOnChange, shape);
      commandManager.executeCommand(addCommand);
      
      expect(mockState.shapes).toHaveLength(1);
      expect(commandManager.canUndo()).toBe(true);

      // Undo
      const undoResult = commandManager.undo();
      expect(undoResult).toBe(true);
      expect(mockState.shapes).toHaveLength(0);

      // Redo
      const redoResult = commandManager.redo();
      expect(redoResult).toBe(true);
      expect(mockState.shapes).toHaveLength(1);
      expect(mockState.shapes[0].id).toBe('shape1');
    });

    it('should paste shape from clipboard and add to state/history', () => {
      // Add a shape to clipboard
      const shape = createMockShape('shape1');
      mockState.clipboard = [shape];
      
      // Paste logic (simulate what useShapeSnapEngineV2 does)
      const offset = 20;
      const pastedShape = {
        ...shape,
        id: 'pasted1',
        zIndex: Date.now(),
        x: (shape as any).x + offset,
        y: (shape as any).y + offset
      };
      // Use AddShapeCommand for paste
      const addCommand = new AddShapeCommand(getCurrentState, mockOnChange, pastedShape);
      commandManager.executeCommand(addCommand);

      // Assert new shape is in state
      expect(mockState.shapes).toHaveLength(1);
      expect(mockState.shapes[0].id).toBe('pasted1');
      expect((mockState.shapes[0] as any).x).toBe((shape as any).x + offset);
      expect((mockState.shapes[0] as any).y).toBe((shape as any).y + offset);
      // Assert history is updated
      expect(mockState.history).toHaveLength(2);
      expect(mockState.historyIndex).toBe(1);
    });
  });
}); 