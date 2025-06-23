import React from 'react';
import { Tablet, TabletState } from '../types';
import { ShapeSnapData, ShapeSnapMode } from './types';
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
        historyIndex: -1
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