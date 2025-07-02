import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { CanvasSettings, Shape, Point, ShapeSnapTool } from '../types';
import { renderShape, renderRoughShapeSVG, renderShapeOverlay, hashCode } from '../utils/renderUtils';
import { getShapeCenter, getShapeBoundingBox } from '../utils/geometryUtils';
import { useShapeSnapCanvasEvents } from '../hooks/useShapeSnapCanvasEvents';
import { ShapeLabelEditor } from './ShapeLabelEditor';
import { ShapeSnapInfoModal } from './ShapeSnapInfoModal';

// Custom hook to create modal-aware event handlers
const useModalAwareHandlers = (isModalOpen: boolean) => {
  const createEventHandler = (handler: (e: any) => void) => {
    return isModalOpen ? () => {} : handler;
  };
  
  return { createEventHandler };
};

interface ShapeSnapCanvasProps {
  shapes: Shape[];
  canvasSettings: CanvasSettings;
  currentPoints: Point[];
  width: number;
  height: number;
  currentTool: ShapeSnapTool;
  currentFontSize?: number;
  selectedShapeIds?: string[];
  onShapeClick?: (shape: Shape, position: Point) => void;
  onUpdateLabel?: (shapeId: string, label: string) => void;
  onUpdateShape?: (shapeId: string, updates: Partial<Shape>) => void;
  onDeleteShape?: (shapeId: string) => void;
  onAddShape?: (shape: Shape) => void;
  onDrawEnd?: (points: Point[]) => Shape | null;
  onSelectionChange?: (shapeIds: string[]) => void;
  onToggleShapeSelection?: (shapeId: string) => void;
  onClearSelection?: () => void;
  gridSnappingEnabled?: boolean;
  sketchModeEnabled?: boolean;
  showInfoModal: boolean;
  onShowInfoModal: (show: boolean) => void;
}

export const ShapeSnapCanvas: React.FC<ShapeSnapCanvasProps> = ({
  shapes,
  canvasSettings,
  currentPoints,
  width,
  height,
  currentTool,
  currentFontSize,
  selectedShapeIds = [],
  onShapeClick,
  onUpdateLabel,
  onUpdateShape,
  onDeleteShape,
  onAddShape,
  onSelectionChange,
  onToggleShapeSelection,
  onClearSelection,
  gridSnappingEnabled,
  sketchModeEnabled,
  showInfoModal,
  onShowInfoModal
}) => {
  const { createEventHandler } = useModalAwareHandlers(showInfoModal);
  
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Track modifier key states
  const [modifierKeys, setModifierKeys] = useState({
    ctrlKey: false,
    metaKey: false
  });

  // Handle modifier key tracking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setModifierKeys(prev => ({
        ...prev,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey
      }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setModifierKeys(prev => ({
        ...prev,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey
      }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Use the events hook to handle all mouse interactions
  const {
    editingShape,
    draggedShape,
    dragGuides,
    resizeHandle,
    setEditingShape,
    handleLabelSave,
    handleLabelCancel,
    handleCanvasDoubleClick,
    handleShapeDoubleClick,
    handleShapeMouseDown,
    handleMouseMove,
    handleMouseUp,
    detectResizeHandle
  } = useShapeSnapCanvasEvents({
    shapes,
    canvasSettings,
    currentTool,
    currentFontSize,
    gridSnappingEnabled,
    onShapeClick: undefined, // Don't use the hook's click handler
    onUpdateLabel,
    onUpdateShape,
    onDeleteShape,
    onAddShape
  });

  // Aggressively clear editing state in select mode - use useLayoutEffect for immediate execution
  useLayoutEffect(() => {
    if (currentTool === 'select' && editingShape) {
      setEditingShape(null);
    }
  }, [currentTool, editingShape, setEditingShape]);

  // Also clear on any state change that might trigger editing in select mode
  useEffect(() => {
    if (currentTool === 'select') {
      setEditingShape(null);
    }
  }, [currentTool, setEditingShape]);

  // Wrapper functions to control when the hook's mouse events should be handled
  const handleWrappedMouseDown = (shape: Shape, e: React.MouseEvent) => {
    // Always allow the hook to handle mouse down for dragging and resizing
    // The key is that we prevent the hook's onShapeClick callback, not the mouse tracking
    handleShapeMouseDown(shape, e);
  };

  const handleWrappedMouseMove = (e: React.MouseEvent) => {
    // Always allow mouse move
    handleMouseMove(e);
  };

  const handleWrappedMouseUp = (e: React.MouseEvent) => {
    // Always allow the hook to handle mouseUp for proper state cleanup
    // We already disabled the hook's onShapeClick callback (passed undefined), 
    // so the hook's internal click detection won't trigger label editing
    handleMouseUp(e);
  };

  // Custom shape click handler that properly handles multi-selection
  const handleCustomShapeClick = (shape: Shape, position: Point) => {
    // Call the original onShapeClick if provided
    if (onShapeClick) {
      onShapeClick(shape, position);
    }
    
    // Handle different tools
    switch (currentTool) {
      case 'select':
      case 'draw':
        // Both select and draw modes should allow shape selection and show resize handles
        // Handle multi-selection with tracked modifier keys
        const isMultiSelect = modifierKeys.ctrlKey || modifierKeys.metaKey;
        
        if (isMultiSelect && onToggleShapeSelection) {
          // Multi-selection: toggle this shape in the selection
          onToggleShapeSelection(shape.id);
        } else if (onSelectionChange) {
          // Single selection: select only this shape
          onSelectionChange([shape.id]);
        }
        break;
        
      case 'eraser':
        // Delete the shape when in eraser mode
        if (onDeleteShape) {
          onDeleteShape(shape.id);
        }
        // Clear selection after deleting
        if (onClearSelection) {
          onClearSelection();
        }
        break;
        
      default:
        // For other tools, clear selection
        if (onClearSelection) {
          onClearSelection();
        }
        break;
    }
  };

  // Custom double-click handler that only opens label editor in Draw mode
  const handleCustomShapeDoubleClick = (shape: Shape) => {
    // Only allow label editing in draw mode, not select mode
    if (currentTool === 'draw') {
      handleShapeDoubleClick(shape);
    }
  };
  
  // Handle canvas click to clear selection
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only clear selection if clicking on empty space (not on a shape)
    if (e.target === e.currentTarget && onClearSelection) {
      onClearSelection();
    }
  };
  
  // Sort shapes by zIndex for proper rendering order
  const sortedShapes = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
  
  // If we're dragging a shape, replace it with the dragged version for visual feedback
  const shapesToRender = draggedShape 
    ? sortedShapes.map(shape => shape.id === draggedShape.id ? draggedShape : shape)
    : sortedShapes;
  
  // Determine stroke color based on canvas mode
  const strokeColor = canvasSettings.mode === 'dark' ? '#ffffff' : '#000000';

  // Helper function to get cursor style for resize handles
  const getResizeCursor = (handle: string | null): string => {
    if (!handle) return 'default';
    
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nw-resize';
      case 'ne':
      case 'sw':
        return 'ne-resize';
      case 'n':
      case 's':
        return 'ns-resize';
      case 'e':
      case 'w':
        return 'ew-resize';
      default:
        return 'default';
    }
  };

  // Helper function to render resize indicators for selected shapes
  const renderResizeIndicators = (shape: Shape): React.ReactNode => {
    // Show resize handles for all selected shapes (not just the one being dragged)
    if (shape.type === 'line' || !selectedShapeIds.includes(shape.id)) {
      return null;
    }
    
    const bounds = getShapeBoundingBox(shape);
    const handleSize = 12;
    const strokeColor = canvasSettings.mode === 'dark' ? '#ffffff' : '#000000';
    const fillColor = canvasSettings.mode === 'dark' ? '#1e1e1e' : '#ffffff';
    
    const handles = [
      { name: 'nw', x: bounds.left, y: bounds.top },
      { name: 'ne', x: bounds.right, y: bounds.top },
      { name: 'se', x: bounds.right, y: bounds.bottom },
      { name: 'sw', x: bounds.left, y: bounds.bottom },
      { name: 'n', x: (bounds.left + bounds.right) / 2, y: bounds.top },
      { name: 'e', x: bounds.right, y: (bounds.top + bounds.bottom) / 2 },
      { name: 's', x: (bounds.left + bounds.right) / 2, y: bounds.bottom },
      { name: 'w', x: bounds.left, y: (bounds.top + bounds.bottom) / 2 }
    ];
    
    const handleMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      
      const mouseX = e.nativeEvent.offsetX;
      const mouseY = e.nativeEvent.offsetY;
      const mousePoint = { x: mouseX, y: mouseY };
      
      // Use the hook's detectResizeHandle function
      const handle = detectResizeHandle(shape, mousePoint);
      if (handle) {
        // Select the shape if it's not already selected
        if (!selectedShapeIds.includes(shape.id) && onSelectionChange) {
          onSelectionChange([shape.id]);
        }
        
        // The resize logic is now handled by the hook's handleShapeMouseDown
        // We just need to trigger the mouse down event on the shape
        handleWrappedMouseDown(shape, e);
      }
    };
    
    const handleTouchStart = (e: React.TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      const touchPoint = { x: touchX, y: touchY };
      
      // Use the hook's detectResizeHandle function
      const handle = detectResizeHandle(shape, touchPoint);
      if (handle) {
        // Select the shape if it's not already selected
        if (!selectedShapeIds.includes(shape.id) && onSelectionChange) {
          onSelectionChange([shape.id]);
        }
        
        // Convert touch to mouse event for compatibility with existing logic
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true
        });
        handleWrappedMouseDown(shape, mouseEvent as any);
      }
    };
    
    return (
      <g key={`${shape.id}-resize-handles`}>
        {handles.map(handle => (
          <rect
            key={`${shape.id}-handle-${handle.name}`}
            x={handle.x - handleSize / 2}
            y={handle.y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1}
            style={{ cursor: showInfoModal ? 'default' : getResizeCursor(handle.name) }}
            onMouseDown={createEventHandler(handleMouseDown)}
            onTouchStart={createEventHandler(handleTouchStart)}
          />
        ))}
      </g>
    );
  };

  // Helper function to get editor rectangle for label editing
  const getEditorRect = (shape: Shape) => {
    const center = getShapeCenter(shape);
    const width = 120;
    const height = 60;
    return {
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height
    };
  };

  // Wrapper function that handles shape clicks and prevents hook's click logic in select mode  
  const handleShapeClickWrapper = (shape: Shape, position: Point) => {
    // Handle the click with our custom logic
    handleCustomShapeClick(shape, position);
    
    // In select mode, we don't want the hook's internal click logic to run at all
    // So we don't call the hook's click handler
  };

  return (
    <div className="relative w-full h-full">
      {/* Information Icon */}
      <button
        onClick={() => onShowInfoModal(true)}
        className={`absolute top-4 right-4 z-10 p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 ${
          canvasSettings.mode === 'dark' 
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
            : 'bg-white hover:bg-gray-100 text-gray-700'
        }`}
        title="Shape Snap Help"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>

      <svg 
        ref={svgRef}
        data-shapesnap-canvas="true"
        width={width} 
        height={height}
        style={{ 
          backgroundColor: canvasSettings.background,
          touchAction: 'none',
          cursor: getResizeCursor(resizeHandle),
          pointerEvents: showInfoModal ? 'none' : 'auto'
        }}
        {...(showInfoModal ? {} : {
          onDoubleClick: handleCanvasDoubleClick,
          onMouseMove: handleWrappedMouseMove,
          onMouseUp: handleWrappedMouseUp,
          onClick: handleCanvasClick,
          onTouchStart: (e) => {
            // Prevent default to avoid scrolling
            e.preventDefault();
            // Convert touch to mouse event for compatibility
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
              clientX: touch.clientX,
              clientY: touch.clientY,
              bubbles: true
            });
            e.currentTarget.dispatchEvent(mouseEvent);
          },
          onTouchMove: (e) => {
            // Prevent default to avoid scrolling
            e.preventDefault();
            // Convert touch to mouse event for compatibility
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
              clientX: touch.clientX,
              clientY: touch.clientY,
              bubbles: true
            });
            e.currentTarget.dispatchEvent(mouseEvent);
          },
          onTouchEnd: (e) => {
            // Prevent default to avoid any unwanted behavior
            e.preventDefault();
            // Convert touch to mouse event for compatibility
            const mouseEvent = new MouseEvent('mouseup', {
              bubbles: true
            });
            e.currentTarget.dispatchEvent(mouseEvent);
          }
        })}
      >
        {/* Render all shapes */}
        {shapesToRender.map(shape => (
          sketchModeEnabled && svgRef.current ? (
            (() => {
              switch (shape.type) {
                case 'rectangle':
                case 'square':
                case 'circle':
                case 'diamond':
                case 'triangle':
                case 'line': {
                  const roughMarkup = renderRoughShapeSVG(svgRef.current, shape.type, shape, {
                    roughness: 2.2,
                    stroke: shape.style?.stroke || '#000',
                    strokeWidth: shape.style?.strokeWidth || 2,
                    fill: shape.style?.fill || undefined,
                    fillStyle: 'hachure',
                    seed: hashCode(shape.id),
                  });
                  // Render roughjs shape for visuals, then the normal SVG shape (with event handlers) on top, but invisible
                  return roughMarkup ? (
                    <g key={shape.id}>
                      <g dangerouslySetInnerHTML={{ __html: roughMarkup }} />
                      {/* Invisible hit area for interactivity */}
                      {renderShape(
                        // Clone the shape and override style for hit area
                        { ...shape, style: { ...shape.style, stroke: 'transparent', fill: 'transparent' } },
                        (s, pos) => { handleShapeClickWrapper(s, pos); },
                        selectedShapeIds.includes(shape.id) ? shape.id : undefined,
                        editingShape ? editingShape.id : undefined,
                        handleCustomShapeDoubleClick,
                        handleWrappedMouseDown,
                        currentTool,
                        sketchModeEnabled,
                        currentFontSize,
                        showInfoModal
                      )}
                      {renderShapeOverlay(shape, editingShape ? editingShape.id : undefined, sketchModeEnabled, currentFontSize)}
                    </g>
                  ) : null;
                }
                default:
                  return renderShape(shape, (s, pos) => { handleShapeClickWrapper(s, pos); }, selectedShapeIds.includes(shape.id) ? shape.id : undefined, editingShape ? editingShape.id : undefined, handleCustomShapeDoubleClick, handleWrappedMouseDown, currentTool, sketchModeEnabled, currentFontSize, showInfoModal);
              }
            })()
          ) : (
            renderShape(
              shape, 
              (s, pos) => { handleShapeClickWrapper(s, pos); },
              selectedShapeIds.includes(shape.id) ? shape.id : undefined,
              editingShape ? editingShape.id : undefined,
              handleCustomShapeDoubleClick,
              handleWrappedMouseDown,
              currentTool,
              sketchModeEnabled,
              currentFontSize,
              showInfoModal
            )
          )
        ))}
        
        {/* Render current drawing stroke */}
        {currentPoints.length > 1 && (
          <path
            d={`M ${currentPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke={strokeColor}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        )}

        {/* Render label editor INSIDE the SVG */}
        {editingShape && (
          (() => {
            const { x, y, width, height } = getEditorRect(editingShape);
            return (
              <ShapeLabelEditor
                shape={editingShape}
                onSave={handleLabelSave}
                onCancel={handleLabelCancel}
                x={x}
                y={y}
                width={width}
                height={height}
                canvasMode={canvasSettings.mode}
              />
            );
          })()
        )}

        {/* Render drag guides */}
        {dragGuides && (
          <g>
            {/* Vertical guides */}
            <line
              key="drag-guide-left"
              x1={dragGuides.left}
              y1={0}
              x2={dragGuides.left}
              y2={height}
              stroke={canvasSettings.mode === 'dark' ? '#ffffff' : '#000000'}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.3}
            />
            <line
              key="drag-guide-right"
              x1={dragGuides.right}
              y1={0}
              x2={dragGuides.right}
              y2={height}
              stroke={canvasSettings.mode === 'dark' ? '#ffffff' : '#000000'}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.3}
            />
            {/* Horizontal guides */}
            <line
              key="drag-guide-top"
              x1={0}
              y1={dragGuides.top}
              x2={width}
              y2={dragGuides.top}
              stroke={canvasSettings.mode === 'dark' ? '#ffffff' : '#000000'}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.3}
            />
            <line
              key="drag-guide-bottom"
              x1={0}
              y1={dragGuides.bottom}
              x2={width}
              y2={dragGuides.bottom}
              stroke={canvasSettings.mode === 'dark' ? '#ffffff' : '#000000'}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.3}
            />
          </g>
        )}

        {/* Render resize indicators */}
        {shapesToRender.map(shape => renderResizeIndicators(shape))}
      </svg>

      {/* Information Modal */}
      <ShapeSnapInfoModal
        isOpen={showInfoModal}
        onClose={() => onShowInfoModal(false)}
        canvasMode={canvasSettings.mode}
      />
    </div>
  );
};