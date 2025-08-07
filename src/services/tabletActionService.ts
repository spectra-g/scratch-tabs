import { useRootStore } from '../stores/rootStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { dynamicTabletRegistry } from '../tablets/dynamicRegistry';
import { Tab } from '../types';

export interface TabletActionMessage<T = unknown> {
  targetTablet: string;
  action: 'new-tab' | 'open-in-split-view';
  payload: T; // Generic payload passed directly to the tablet
  source: {
    tabId?: string;
    titleHint?: string;
  };
}

class TabletActionService {
  public async handleAction(message: TabletActionMessage) {
    const { targetTablet, payload, action, source } = message;

    const targetTabletDef = await dynamicTabletRegistry.getById(targetTablet);
    
    if (!targetTabletDef) {
      console.error(`Target tablet "${targetTablet}" not found.`);
      return;
    }

    if (action === 'new-tab') {
      const { handleNewPopulatedTab } = useRootStore.getState();
      const { activeWorkspaceId } = useWorkspaceStore.getState();

      const initialState = targetTabletDef.createInitialState(payload);

      const newTab: Tab = {
        id: crypto.randomUUID(),
        title: source.titleHint || targetTabletDef.label,
        isTablet: true,
        tabletState: targetTabletDef.serializeState(initialState),
        content: '',
        language: 'plaintext',
        languageLocked: true,
        workspaceId: activeWorkspaceId || '',
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      handleNewPopulatedTab(newTab, false);
    }
  }
}

export const tabletActionService = new TabletActionService();