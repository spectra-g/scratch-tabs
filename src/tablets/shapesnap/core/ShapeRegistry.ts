import { Shape, ShapeType, Point } from '../types';

export interface ShapeDefinition {
  type: ShapeType;
  defaultProperties: Partial<Shape>;
  requiredProperties: string[];
  supportedOperations: ShapeOperation[];
  renderingStrategy: RenderingStrategy;
}

export type ShapeOperation = 
  | 'move' 
  | 'resize' 
  | 'rotate' 
  | 'editLabel' 
  | 'changeStyle' 
  | 'copy' 
  | 'delete';

export type RenderingStrategy = 'svg' | 'canvas' | 'rough';

export interface ShapeCapabilities {
  canMove: boolean;
  canResize: boolean;
  canRotate: boolean;
  canEditLabel: boolean;
  canChangeStyle: boolean;
  supportsMultipoint: boolean;
  supportsFill: boolean;
  supportsBorder: boolean;
}

export class ShapeRegistry {
  private static instance: ShapeRegistry;
  private definitions: Map<ShapeType, ShapeDefinition> = new Map();
  private capabilities: Map<ShapeType, ShapeCapabilities> = new Map();

  private constructor() {
    this.initializeDefaultShapes();
  }

  public static getInstance(): ShapeRegistry {
    if (!ShapeRegistry.instance) {
      ShapeRegistry.instance = new ShapeRegistry();
    }
    return ShapeRegistry.instance;
  }

  private initializeDefaultShapes(): void {
    // Line definition
    this.registerShape('line', {
      type: 'line',
      defaultProperties: {
        type: 'line',
        points: [],
        style: { stroke: '#000000', strokeWidth: 2 },
        arrowTipEnd: 'none',
        arrowTipStart: 'none',
        arrowTipSize: 10
      },
      requiredProperties: ['points'],
      supportedOperations: ['move', 'resize', 'editLabel', 'changeStyle', 'copy', 'delete'],
      renderingStrategy: 'svg'
    }, {
      canMove: true,
      canResize: true,
      canRotate: false,
      canEditLabel: true,
      canChangeStyle: true,
      supportsMultipoint: true,
      supportsFill: false,
      supportsBorder: true
    });

    // Rectangle definition
    this.registerShape('rectangle', {
      type: 'rectangle',
      defaultProperties: {
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 60,
        style: { stroke: '#000000', strokeWidth: 2, fill: 'transparent' }
      },
      requiredProperties: ['x', 'y', 'width', 'height'],
      supportedOperations: ['move', 'resize', 'editLabel', 'changeStyle', 'copy', 'delete'],
      renderingStrategy: 'svg'
    }, {
      canMove: true,
      canResize: true,
      canRotate: false,
      canEditLabel: true,
      canChangeStyle: true,
      supportsMultipoint: false,
      supportsFill: true,
      supportsBorder: true
    });

    // Circle definition
    this.registerShape('circle', {
      type: 'circle',
      defaultProperties: {
        type: 'circle',
        x: 0,
        y: 0,
        radius: 30,
        style: { stroke: '#000000', strokeWidth: 2, fill: 'transparent' }
      },
      requiredProperties: ['x', 'y', 'radius'],
      supportedOperations: ['move', 'resize', 'editLabel', 'changeStyle', 'copy', 'delete'],
      renderingStrategy: 'svg'
    }, {
      canMove: true,
      canResize: true,
      canRotate: false,
      canEditLabel: true,
      canChangeStyle: true,
      supportsMultipoint: false,
      supportsFill: true,
      supportsBorder: true
    });

    // Add other shapes...
    this.registerShape('square', {
      type: 'square',
      defaultProperties: {
        type: 'square',
        x: 0,
        y: 0,
        width: 80,
        height: 80,
        style: { stroke: '#000000', strokeWidth: 2, fill: 'transparent' }
      },
      requiredProperties: ['x', 'y', 'width', 'height'],
      supportedOperations: ['move', 'resize', 'editLabel', 'changeStyle', 'copy', 'delete'],
      renderingStrategy: 'svg'
    }, {
      canMove: true,
      canResize: true,
      canRotate: false,
      canEditLabel: true,
      canChangeStyle: true,
      supportsMultipoint: false,
      supportsFill: true,
      supportsBorder: true
    });

    this.registerShape('diamond', {
      type: 'diamond',
      defaultProperties: {
        type: 'diamond',
        x: 0,
        y: 0,
        width: 80,
        height: 80,
        style: { stroke: '#000000', strokeWidth: 2, fill: 'transparent' }
      },
      requiredProperties: ['x', 'y', 'width', 'height'],
      supportedOperations: ['move', 'resize', 'editLabel', 'changeStyle', 'copy', 'delete'],
      renderingStrategy: 'svg'
    }, {
      canMove: true,
      canResize: true,
      canRotate: false,
      canEditLabel: true,
      canChangeStyle: true,
      supportsMultipoint: false,
      supportsFill: true,
      supportsBorder: true
    });

    this.registerShape('triangle', {
      type: 'triangle',
      defaultProperties: {
        type: 'triangle',
        x: 0,
        y: 0,
        width: 80,
        height: 80,
        style: { stroke: '#000000', strokeWidth: 2, fill: 'transparent' }
      },
      requiredProperties: ['x', 'y', 'width', 'height'],
      supportedOperations: ['move', 'resize', 'editLabel', 'changeStyle', 'copy', 'delete'],
      renderingStrategy: 'svg'
    }, {
      canMove: true,
      canResize: true,
      canRotate: false,
      canEditLabel: true,
      canChangeStyle: true,
      supportsMultipoint: false,
      supportsFill: true,
      supportsBorder: true
    });

    this.registerShape('text', {
      type: 'text',
      defaultProperties: {
        type: 'text',
        x: 0,
        y: 0,
        text: '',
        fontSize: 16,
        style: { stroke: '#000000', strokeWidth: 1 }
      },
      requiredProperties: ['x', 'y', 'text'],
      supportedOperations: ['move', 'editLabel', 'changeStyle', 'copy', 'delete'],
      renderingStrategy: 'svg'
    }, {
      canMove: true,
      canResize: false,
      canRotate: false,
      canEditLabel: true,
      canChangeStyle: true,
      supportsMultipoint: false,
      supportsFill: false,
      supportsBorder: false
    });

    this.registerShape('arrow', {
      type: 'arrow',
      defaultProperties: {
        type: 'arrow',
        from: { x: 0, y: 0 },
        to: { x: 100, y: 100 },
        style: { stroke: '#000000', strokeWidth: 2 }
      },
      requiredProperties: ['from', 'to'],
      supportedOperations: ['move', 'resize', 'editLabel', 'changeStyle', 'copy', 'delete'],
      renderingStrategy: 'svg'
    }, {
      canMove: true,
      canResize: true,
      canRotate: false,
      canEditLabel: true,
      canChangeStyle: true,
      supportsMultipoint: false,
      supportsFill: false,
      supportsBorder: true
    });
  }

  public registerShape(
    type: ShapeType, 
    definition: ShapeDefinition, 
    capabilities: ShapeCapabilities
  ): void {
    this.definitions.set(type, definition);
    this.capabilities.set(type, capabilities);
  }

  public getShapeDefinition(type: ShapeType): ShapeDefinition | undefined {
    return this.definitions.get(type);
  }

  public getShapeCapabilities(type: ShapeType): ShapeCapabilities | undefined {
    return this.capabilities.get(type);
  }

  public getSupportedOperations(type: ShapeType): ShapeOperation[] {
    return this.definitions.get(type)?.supportedOperations || [];
  }

  public createDefaultShape(type: ShapeType, overrides: Partial<Shape> = {}): any {
    const definition = this.getShapeDefinition(type);
    if (!definition) {
      throw new Error(`Unknown shape type: ${type}`);
    }

    return {
      ...definition.defaultProperties,
      ...overrides,
      id: `shape-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      zIndex: Date.now()
    };
  }

  public validateShape(shape: Shape): boolean {
    const definition = this.getShapeDefinition(shape.type);
    if (!definition) return false;

    return definition.requiredProperties.every(prop => 
      shape.hasOwnProperty(prop) && (shape as any)[prop] !== undefined
    );
  }

  public canPerformOperation(shape: Shape, operation: ShapeOperation): boolean {
    const definition = this.getShapeDefinition(shape.type);
    return definition?.supportedOperations.includes(operation) || false;
  }

  public getAllShapeTypes(): ShapeType[] {
    return Array.from(this.definitions.keys());
  }
}

export const shapeRegistry = ShapeRegistry.getInstance(); 