// Export all stores
export { useTabsStore } from './tabsStore';
export { useSplitViewStore } from './splitViewStore';
export { useEditorStore } from './editorStore';
export { useRootStore } from './rootStore';
export { useJsonModalsStore } from './jsonModalsStore';
export { useCacheStore } from './cacheStore';

// Export the root store as the default store for backward compatibility
export { useRootStore as default } from './rootStore';