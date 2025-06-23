export type ShapeType = 'line' | 'rectangle' | 'circle' | 'diamond' | 'arrow' | 'text' | 'triangle' | 'square';
export type ShapeSnapMode = 'dark' | 'light';
export type ShapeSnapTool = 'draw' | 'select' | 'text' | 'eraser';

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
  type: 'line';
  points: Point[];
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
}

export interface DiamondShape extends BaseShape {
  type: 'diamond';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  from: Point;
  to: Point;
}

export interface TextShape extends BaseShape {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize?: number;
}

export interface SquareShape extends BaseShape {
  type: 'square';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TriangleShape extends BaseShape {
  type: 'triangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Shape = LineShape | RectangleShape | CircleShape | DiamondShape | ArrowShape | TextShape | SquareShape | TriangleShape;

export interface CanvasSettings {
  background: string;
  mode: ShapeSnapMode;
}

export interface ShapeSnapData {
  shapes: Shape[];
  canvas: CanvasSettings;
  currentTool: ShapeSnapTool;
  history: Shape[][];
  historyIndex: number;
}

export interface DrawState {
  isDrawing: boolean;
  currentPoints: Point[];
  startPoint: Point | null;
}