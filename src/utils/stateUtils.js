import { SplitViewState } from '../types';
 function createDefaultSplitViewState(workspaceId: string): SplitViewState {
   return {
     id: crypto.randomUUID(),
     isSplit: false,
     leftTabs: [],
     rightTabs: [],
     activeLeftTabId: null,
     activeRightTabId: null,
     activeSide: 'left',
     splitRatio: 0.5,
     leftTabHistory: [],
     rightTabHistory: [],
     workspaceId: workspaceId, // Associate with workspace
     lastModified: Date.now()
   };
 }