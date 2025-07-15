export type ShapeType =
  | "line"
  | "rectangle"
  | "circle"
  | "diamond"
  | "straight-arrow"
  | "text"
  | "triangle"
  | "square"
  | "curved-arrow"
  | "orthogonal-arrow";
export type ShapeSnapMode = "dark" | "light";
export type ShapeSnapTool = "draw" | "select" | "text" | "eraser";

// Arrow tip styles for lines
export type ArrowTipStyle =
  | "none" // No arrow tip
  | "simple" // Two angled lines forming an arrow
  | "filled-triangle" // Filled triangle
  | "outline-triangle" // Non-filled triangle
  | "filled-circle" // Filled circle
  | "outline-circle" // Non-filled circle
  | "filled-diamond" // Filled diamond
  | "outline-diamond" // Non-filled diamond
  | "cross-circle" // Circle with cross inside
  | "dot" // Simple dot
  | "arrowhead" // Classic arrowhead
  | "double-line"; // Double line arrow

export interface Point {
  x: number;
  y: number;
}

export interface ShapeStyle {
  stroke: string;
  fill?: string;
  strokeWidth?: number;
}

export interface BaseShape {
  id: string;
  type: ShapeType;
  label?: string;
  style: ShapeStyle;
  zIndex: number;
}

export interface LineShape extends BaseShape {
  type: "line";
  points: Point[];
  arrowTipStart?: ArrowTipStyle; // Arrow tip style for the start of the line
  arrowTipEnd?: ArrowTipStyle; // Arrow tip style for the end of the line
  arrowTipSize?: number; // Size of the arrow tips (default: 10)
}

export interface RectangleShape extends BaseShape {
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: "circle";
  x: number;
  y: number;
  radius: number;
}

export interface DiamondShape extends BaseShape {
  type: "diamond";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StraightArrowShape extends BaseShape {
  type: "straight-arrow";
  from: Point;
  to: Point;
}

export interface TextShape extends BaseShape {
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize?: number;
}

export interface SquareShape extends BaseShape {
  type: "square";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TriangleShape extends BaseShape {
  type: "triangle";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CurvedArrowShape extends BaseShape {
  type: "curved-arrow";
  from: Point;
  to: Point;
  control: Point; // The point that defines the curve's bend
  arrowTipEnd?: ArrowTipStyle;
  arrowTipSize?: number;
}

export interface OrthogonalArrowShape extends BaseShape {
  type: "orthogonal-arrow";
  points: Point[];
  arrowTipStart?: ArrowTipStyle; // Arrow tip style for the start of the line
  arrowTipEnd?: ArrowTipStyle; // Arrow tip style for the end of the line
  arrowTipSize?: number; // Size of the arrow tips (default: 10)
}

export type Shape =
  | LineShape
  | RectangleShape
  | CircleShape
  | DiamondShape
  | StraightArrowShape
  | TextShape
  | SquareShape
  | TriangleShape
  | CurvedArrowShape
  | OrthogonalArrowShape;

export interface CanvasSettings {
  background: string;
  mode: ShapeSnapMode;
}

export interface ShapeSnapTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  shapes: Shape[];
  canvas: CanvasSettings;
  isBuiltIn?: boolean;
}

export interface ShapeSnapData {
  shapes: Shape[];
  canvas: CanvasSettings;
  currentTool: ShapeSnapTool;
  history: Shape[][];
  historyIndex: number;
  currentFontSize: number;
  selectedShapeIds?: string[]; // Support for multi-selection
  clipboard?: Shape[]; // Clipboard for copy/paste operations
}

export interface DrawState {
  isDrawing: boolean;
  currentPoints: Point[];
  startPoint: Point | null;
}
