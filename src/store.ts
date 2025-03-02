import { create } from 'zustand';
import { Tab, EditorPosition, SplitViewState } from './types';
import { useRootStore } from './stores/rootStore';

interface EditorStore {
  tabs: Tab[];
  activeTabId: string | null;
  cursorPosition: EditorPosition;
  previewMode: boolean;
  splitView: SplitViewState;
  
  // Tab management
  addTab: (tab: Tab, toRightSide?: boolean) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabLanguage: (id: string, language: string, lock?: boolean) => void;
  updateTabTitle: (id: string, title: string) => void;
  setCursorPosition: (position: EditorPosition) => void;
  togglePreviewMode: () => void;
  
  // Split view management
  splitScreen: (tabId: string) => void;
  unsplitScreen: (fromRight: boolean) => void;
  moveTabToRight: (tabId: string) => void;
  moveTabToLeft: (tabId: string) => void;
  setActiveLeftTab: (id: string) => void;
  setActiveRightTab: (id: string) => void;
  setSplitRatio: (ratio: number) => void;
  
  // Bulk tab operations
  closeTabsToLeft: (tabId: string, isRightSide: boolean) => void;
  closeTabsToRight: (tabId: string, isRightSide: boolean) => void;
  closeAllExcept: (tabId: string, isRightSide: boolean) => void;
  duplicateTab: (tabId: string, isRightSide: boolean) => void;
  groupTabsByType: (isRightSide: boolean) => void;
  
  // Tab limit checks
  canAddNewTab: (toRightSide?: boolean) => boolean;
}

export const useEditorStore = useRootStore;

export default useRootStore;

// Helper function to group tabs by language
function groupTabsByLanguage(tabs: { id: string; language: string }[]): string[] {
  // Create a map of language -> tab IDs
  const languageMap: Record<string, string[]> = {};
  
  // Group tabs by language
  tabs.forEach(tab => {
    if (!languageMap[tab.language]) {
      languageMap[tab.language] = [];
    }
    languageMap[tab.language].push(tab.id);
  });
  
  // Flatten the map back to an array, preserving the order of languages
  const languages = Object.keys(languageMap);
  const result: string[] = [];
  
  languages.forEach(language => {
    result.push(...languageMap[language]);
  });
  
  return result;
}