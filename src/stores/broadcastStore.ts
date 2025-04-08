import { useRootStore } from './rootStore';

// Message types for type safety
type BroadcastMessage = {
  type: 'STATE_UPDATED';
  payload: {
    tabs?: any[];
    splitView?: any;
  };
} | {
  type: 'REQUEST_SYNC';
};

class BroadcastManager {
  private static instance: BroadcastManager;
  private channel: BroadcastChannel;
  private isInitialized = false;

  private constructor() {
    this.channel = new BroadcastChannel('scratch-tabs-sync');
    this.setupListeners();
  }

  static getInstance(): BroadcastManager {
    if (!BroadcastManager.instance) {
      BroadcastManager.instance = new BroadcastManager();
    }
    return BroadcastManager.instance;
  }

  private setupListeners() {
    this.channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'STATE_UPDATED':
          // Update local state with received state
          if (payload.tabs) {
            useRootStore.setState(state => ({
              ...state,
              tabs: payload.tabs
            }));
          }
          if (payload.splitView) {
            useRootStore.setState(state => ({
              ...state,
              splitView: payload.splitView
            }));
          }
          break;

        case 'REQUEST_SYNC':
          // Send current state to other tabs
          const currentState = useRootStore.getState();
          this.broadcastState({
            tabs: currentState.tabs,
            splitView: currentState.splitView
          });
          break;
      }
    };
  }

  initialize() {
    if (this.isInitialized) return;
    
    // Request sync from other tabs when initializing
    this.channel.postMessage({
      type: 'REQUEST_SYNC'
    });

    this.isInitialized = true;
  }

  broadcastState(state: { tabs?: any[], splitView?: any }) {
    this.channel.postMessage({
      type: 'STATE_UPDATED',
      payload: state
    });
  }

  cleanup() {
    this.channel.close();
  }
}

export const broadcastManager = BroadcastManager.getInstance();