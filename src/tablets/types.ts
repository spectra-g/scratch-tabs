import { ReactNode } from 'react';

export interface TabletState {
  type: string;
  data: any;
}

export interface Tablet {
  // Unique identifier for the tablet
  id: string;
  
  // Display name shown in the selector
  label: string;
  
  // Keywords for search/filtering
  keywords: string[];
  
  // Create initial state for the tablet
  createInitialState(): TabletState;
  
  // Serialize tablet state to JSON
  serializeState(state: TabletState): string;
  
  // Deserialize JSON back to tablet state
  deserializeState(json: string): TabletState;
  
  // Render the tablet's UI
  render(state: TabletState, onChange: (newState: TabletState) => void): ReactNode;
}

export interface TabletRegistry {
  register(tablet: Tablet): void;
  getAll(): Tablet[];
  getById(id: string): Tablet | undefined;
  search(query: string): Tablet[];
}