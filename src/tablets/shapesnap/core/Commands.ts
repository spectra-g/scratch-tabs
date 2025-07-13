import { Shape, ShapeSnapData, Point } from "../types";

export interface Command {
  execute(): void;
  undo(): void;
  canUndo(): boolean;
  description: string;
}

export abstract class BaseCommand implements Command {
  protected getState: () => ShapeSnapData;
  protected onChange: (newState: ShapeSnapData) => void;
  public description: string;

  constructor(
    getState: () => ShapeSnapData,
    onChange: (newState: ShapeSnapData) => void,
    description: string,
  ) {
    this.getState = getState;
    this.onChange = onChange;
    this.description = description;
  }

  abstract execute(): void;
  abstract undo(): void;

  canUndo(): boolean {
    return true;
  }

  protected get state(): ShapeSnapData {
    return this.getState();
  }

  protected updateState(newState: ShapeSnapData): void {
    // Update history when state changes
    const newHistory = newState.history.slice(0, newState.historyIndex + 1);
    newHistory.push([...newState.shapes]);
    const newHistoryIndex = newHistory.length - 1;

    this.onChange({
      ...newState,
      history: newHistory,
      historyIndex: newHistoryIndex,
    });
  }

  protected addToHistory(shapes: Shape[]): void {
    const currentState = this.state;
    const newHistory = currentState.history.slice(
      0,
      currentState.historyIndex + 1,
    );
    newHistory.push([...shapes]);
    this.updateState({
      ...currentState,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  }
}

export class AddShapeCommand extends BaseCommand {
  private shape: Shape;
  private shapeAdded: boolean = false;

  constructor(
    getState: () => ShapeSnapData,
    onChange: (newState: ShapeSnapData) => void,
    shape: Shape,
  ) {
    super(getState, onChange, `Add ${shape.type}`);
    this.shape = shape;
  }

  execute(): void {
    if (!this.shapeAdded) {
      const newShapes = [...this.state.shapes, this.shape];
      this.updateState({
        ...this.state,
        shapes: newShapes,
      });
      this.shapeAdded = true;
    }
  }

  undo(): void {
    if (this.shapeAdded) {
      const newShapes = this.state.shapes.filter((s) => s.id !== this.shape.id);
      this.updateState({
        ...this.state,
        shapes: newShapes,
      });
      this.shapeAdded = false;
    }
  }
}

export class UpdateShapeCommand extends BaseCommand {
  private shapeId: string;
  private updates: Partial<Shape>;
  private originalShape: Shape | null = null;

  constructor(
    getState: () => ShapeSnapData,
    onChange: (newState: ShapeSnapData) => void,
    shapeId: string,
    updates: Partial<Shape>,
  ) {
    super(getState, onChange, `Update ${shapeId}`);
    this.shapeId = shapeId;
    this.updates = updates;
  }

  execute(): void {
    const shapeIndex = this.state.shapes.findIndex(
      (s) => s.id === this.shapeId,
    );
    if (shapeIndex === -1) return;

    // Store original shape for undo
    this.originalShape = { ...this.state.shapes[shapeIndex] };

    const updatedShapes = [...this.state.shapes];
    updatedShapes[shapeIndex] = {
      ...updatedShapes[shapeIndex],
      ...this.updates,
    } as Shape;

    this.updateState({
      ...this.state,
      shapes: updatedShapes,
    });
  }

  undo(): void {
    if (!this.originalShape) return;

    const shapeIndex = this.state.shapes.findIndex(
      (s) => s.id === this.shapeId,
    );
    if (shapeIndex === -1) return;

    const updatedShapes = [...this.state.shapes];
    updatedShapes[shapeIndex] = this.originalShape as Shape;

    this.updateState({
      ...this.state,
      shapes: updatedShapes,
    });
  }
}

export class DeleteShapeCommand extends BaseCommand {
  private shapeId: string;
  private deletedShape: Shape | null = null;
  private originalIndex: number = -1;

  constructor(
    getState: () => ShapeSnapData,
    onChange: (newState: ShapeSnapData) => void,
    shapeId: string,
  ) {
    super(getState, onChange, `Delete shape`);
    this.shapeId = shapeId;
  }

  execute(): void {
    const shapeIndex = this.state.shapes.findIndex(
      (s) => s.id === this.shapeId,
    );
    if (shapeIndex === -1) return;

    // Store deleted shape and index for undo
    this.deletedShape = { ...this.state.shapes[shapeIndex] };
    this.originalIndex = shapeIndex;

    const newShapes = this.state.shapes.filter((s) => s.id !== this.shapeId);
    this.updateState({
      ...this.state,
      shapes: newShapes,
      selectedShapeIds: (this.state.selectedShapeIds || []).filter(
        (id) => id !== this.shapeId,
      ),
    });
  }

  undo(): void {
    if (!this.deletedShape) return;

    const newShapes = [...this.state.shapes];
    newShapes.splice(this.originalIndex, 0, this.deletedShape);

    this.updateState({
      ...this.state,
      shapes: newShapes,
    });
  }
}

export class DeleteSelectedShapesCommand extends BaseCommand {
  private selectedShapeIds: string[];
  private deletedShapes: { shape: Shape; index: number }[] = [];

  constructor(
    getState: () => ShapeSnapData,
    onChange: (newState: ShapeSnapData) => void,
    selectedShapeIds: string[],
  ) {
    super(getState, onChange, `Delete ${selectedShapeIds.length} shapes`);
    this.selectedShapeIds = selectedShapeIds;
  }

  execute(): void {
    // Store deleted shapes and their indices for undo
    this.deletedShapes = this.selectedShapeIds
      .map((id) => {
        const index = this.state.shapes.findIndex((s) => s.id === id);
        return index !== -1
          ? { shape: { ...this.state.shapes[index] }, index }
          : null;
      })
      .filter(Boolean) as { shape: Shape; index: number }[];

    const newShapes = this.state.shapes.filter(
      (s) => !this.selectedShapeIds.includes(s.id),
    );
    this.updateState({
      ...this.state,
      shapes: newShapes,
      selectedShapeIds: [],
    });
  }

  undo(): void {
    if (this.deletedShapes.length === 0) return;

    const currentState = this.state;
    const newShapes = [...currentState.shapes];

    // Restore deleted shapes at their original indices
    // Sort by index in descending order to avoid index shifting issues
    this.deletedShapes
      .sort((a, b) => b.index - a.index)
      .forEach(({ shape, index }) => {
        // Clamp index to valid range
        const insertIndex = Math.min(index, newShapes.length);
        newShapes.splice(insertIndex, 0, shape);
      });

    this.updateState({
      ...currentState,
      shapes: newShapes,
    });
  }
}

export class MoveShapeCommand extends BaseCommand {
  private shapeId: string;
  private delta: Point;
  private originalPosition: Point | null = null;

  constructor(
    getState: () => ShapeSnapData,
    onChange: (newState: ShapeSnapData) => void,
    shapeId: string,
    delta: Point,
  ) {
    super(getState, onChange, `Move shape`);
    this.shapeId = shapeId;
    this.delta = delta;
  }

  execute(): void {
    const shapeIndex = this.state.shapes.findIndex(
      (s) => s.id === this.shapeId,
    );
    if (shapeIndex === -1) return;

    const shape = this.state.shapes[shapeIndex];

    // Store original position for undo
    if (!this.originalPosition) {
      this.originalPosition = this.getShapePosition(shape);
    }

    const updatedShapes = [...this.state.shapes];
    updatedShapes[shapeIndex] = this.moveShape(shape, this.delta);

    this.updateState({
      ...this.state,
      shapes: updatedShapes,
    });
  }

  undo(): void {
    if (!this.originalPosition) return;

    const shapeIndex = this.state.shapes.findIndex(
      (s) => s.id === this.shapeId,
    );
    if (shapeIndex === -1) return;

    const shape = this.state.shapes[shapeIndex];
    const currentPosition = this.getShapePosition(shape);
    const undoDelta = {
      x: this.originalPosition.x - currentPosition.x,
      y: this.originalPosition.y - currentPosition.y,
    };

    const updatedShapes = [...this.state.shapes];
    updatedShapes[shapeIndex] = this.moveShape(shape, undoDelta);

    this.updateState({
      ...this.state,
      shapes: updatedShapes,
    });
  }

  private getShapePosition(shape: Shape): Point {
    switch (shape.type) {
      case "line":
        return shape.points[0] || { x: 0, y: 0 };
      case "arrow":
        return shape.from;
      default:
        return { x: (shape as any).x || 0, y: (shape as any).y || 0 };
    }
  }

  private moveShape(shape: Shape, delta: Point): Shape {
    const newShape = { ...shape };

    switch (shape.type) {
      case "line":
        (newShape as any).points = shape.points.map((p) => ({
          x: p.x + delta.x,
          y: p.y + delta.y,
        }));
        break;
      case "arrow":
        (newShape as any).from = {
          x: shape.from.x + delta.x,
          y: shape.from.y + delta.y,
        };
        (newShape as any).to = {
          x: shape.to.x + delta.x,
          y: shape.to.y + delta.y,
        };
        break;
      default:
        (newShape as any).x = (shape as any).x + delta.x;
        (newShape as any).y = (shape as any).y + delta.y;
        break;
    }

    return newShape;
  }
}

export class AddMultipleShapesCommand extends BaseCommand {
  private shapes: Shape[];
  private shapesAdded: boolean = false;

  constructor(
    getState: () => ShapeSnapData,
    onChange: (newState: ShapeSnapData) => void,
    shapes: Shape[],
  ) {
    super(getState, onChange, `Add ${shapes.length} shapes`);
    this.shapes = shapes;
  }

  execute(): void {
    if (!this.shapesAdded) {
      const newShapes = [...this.state.shapes, ...this.shapes];
      this.updateState({
        ...this.state,
        shapes: newShapes,
      });
      this.shapesAdded = true;
    }
  }

  undo(): void {
    if (this.shapesAdded) {
      const newShapes = this.state.shapes.filter(
        (s) => !this.shapes.some((added) => added.id === s.id),
      );
      this.updateState({
        ...this.state,
        shapes: newShapes,
      });
      this.shapesAdded = false;
    }
  }
}

export class CommandManager {
  private commands: Command[] = [];
  private currentIndex: number = -1;

  executeCommand(command: Command): void {
    // Remove any commands after the current index (for redo branching)
    this.commands = this.commands.slice(0, this.currentIndex + 1);

    // Execute the command
    command.execute();

    // Add to command history
    this.commands.push(command);
    this.currentIndex++;
  }

  undo(): boolean {
    if (this.currentIndex >= 0) {
      const command = this.commands[this.currentIndex];
      if (command.canUndo()) {
        command.undo();
        this.currentIndex--;
        return true;
      }
    }
    return false;
  }

  redo(): boolean {
    if (this.currentIndex < this.commands.length - 1) {
      this.currentIndex++;
      const command = this.commands[this.currentIndex];
      command.execute();
      return true;
    }
    return false;
  }

  canUndo(): boolean {
    return (
      this.currentIndex >= 0 && this.commands[this.currentIndex]?.canUndo()
    );
  }

  canRedo(): boolean {
    return this.currentIndex < this.commands.length - 1;
  }

  clear(): void {
    this.commands = [];
    this.currentIndex = -1;
  }

  getCommandHistory(): string[] {
    return this.commands.map((cmd) => cmd.description);
  }
}
