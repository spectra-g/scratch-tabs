import { LogFilter } from "../types";

interface TabState {
  columnVisibility: Record<string, boolean>;
  filter: LogFilter;
  timestamp: number;
}

class GlobalStateStore {
  private states = new Map<string, TabState>();
  private maxAge = 30 * 60 * 1000; // 30 minutes

  private generateContentHash(content: string): string {
    // Simple hash function for content
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  saveState(content: string, columnVisibility: Record<string, boolean>, filter: LogFilter): void {
    const key = this.generateContentHash(content);
    
    this.states.set(key, {
      columnVisibility: { ...columnVisibility },
      filter: { ...filter },
      timestamp: Date.now(),
    });

    // Clean up old states
    this.cleanup();
  }

  restoreState(content: string): TabState | null {
    const key = this.generateContentHash(content);
    const state = this.states.get(key);
    
    if (state) {
      return state;
    }
    
    return null;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, state] of this.states.entries()) {
      if (now - state.timestamp > this.maxAge) {
        this.states.delete(key);
      }
    }
  }
}

export const globalStateStore = new GlobalStateStore();