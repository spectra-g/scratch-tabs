import { Tablet, TabletState } from '../types';
import { ShapeSnapData, ShapeSnapTemplate } from './types';
import { ShapeSnapUI } from './components/ShapeSnapUI';

interface ShapeSnapTabletState extends TabletState {
  type: 'shapesnap';
  data: ShapeSnapData;
}

export const ShapeSnapTablet: Tablet = {
  id: 'shapesnap',
  label: 'Shape Snap',
  keywords: ['draw', 'diagram', 'shapes', 'sketch', 'flowchart', 'whiteboard'],

  createInitialState(): ShapeSnapTabletState {
    return {
      type: 'shapesnap',
      data: {
        shapes: [],
        canvas: {
          background: '#1e1e1e',
          mode: 'dark'
        },
        currentTool: 'draw',
        history: [],
        historyIndex: -1,
        currentFontSize: 16,
        selectedShapeIds: [],
        clipboard: []
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'shapesnap' && parsed.data) {
        // Ensure all required properties exist
        const data = parsed.data as ShapeSnapData;
        
        // Ensure arrays exist
        data.shapes = Array.isArray(data.shapes) ? data.shapes : [];
        data.history = Array.isArray(data.history) ? data.history : [];
        data.selectedShapeIds = Array.isArray(data.selectedShapeIds) ? data.selectedShapeIds : [];
        data.clipboard = Array.isArray(data.clipboard) ? data.clipboard : [];
        
        // Ensure required properties exist
        data.canvas = data.canvas || { background: '#1e1e1e', mode: 'dark' };
        data.currentTool = data.currentTool || 'draw';
        data.historyIndex = typeof data.historyIndex === 'number' ? data.historyIndex : -1;
        data.currentFontSize = typeof data.currentFontSize === 'number' ? data.currentFontSize : 16;
        
        return parsed;
      }
    } catch (e) {
      console.error("Failed to deserialize ShapeSnap state:", e);
    }
    return this.createInitialState();
  },

  render(state: TabletState, onChange: (state: TabletState) => void) {
    const shapeSnapState = state as ShapeSnapTabletState;
    return (
      <ShapeSnapUI 
        state={shapeSnapState.data} 
        onChange={(newData: ShapeSnapData) => {
          onChange({
            ...shapeSnapState,
            data: newData
          });
        }} 
      />
    );
  }
};