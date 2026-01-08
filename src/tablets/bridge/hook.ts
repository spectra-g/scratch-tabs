/**
 * React hook for tablets to access the bridge
 * This provides a clean React-like interface for using the bridge
 */

import { useCallback, useEffect } from 'react';
import { useRootStore } from '../../stores';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useSplitViewStore } from '../../stores/splitViewStore';
import { useModalStore } from '../../stores/modalStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import { tabletBridge } from './implementation';
import type { TabletBridge } from './types';

/**
 * Hook that provides initialized bridge access for tablets
 * This handles the initialization automatically and returns the bridge instance
 */
export function useTabletBridge(): TabletBridge {
  const rootStore = useRootStore();
  const workspaceStore = useWorkspaceStore();
  const splitViewStore = useSplitViewStore();
  const modalStore = useModalStore();
  const isMobile = useIsMobile();

  // Initialize the bridge with current store instances
  useEffect(() => {
    tabletBridge.initialize(
      rootStore as any,
      workspaceStore as any,
      splitViewStore as any,
      modalStore as any,
      isMobile
    );
  }, [rootStore, workspaceStore, splitViewStore, modalStore, isMobile]);

  return tabletBridge;
}

/**
 * Convenience hooks for specific bridge functionality
 * These can be used when tablets only need specific features
 */

/**
 * Hook for tab creation functionality only
 */
export function useTabletTabCreation() {
  const bridge = useTabletBridge();

  const createBackgroundTab = useCallback(
    (title: string, content: string, language?: string, sourceTabId?: string) => {
      return bridge.createBackgroundTab({
        title,
        content,
        language,
        languageLocked: false,
        sourceTabId
      });
    },
    [bridge]
  );

  return { createBackgroundTab };
}

/**
 * Hook for device information only
 */
export function useTabletDeviceInfo() {
  const bridge = useTabletBridge();

  const getDeviceInfo = useCallback(() => {
    return bridge.getDeviceInfo();
  }, [bridge]);

  // Get device info safely
  let isMobile = false;
  try {
    isMobile = getDeviceInfo().isMobile;
  } catch (error) {
    // Bridge not initialized yet, default to false
    isMobile = false;
  }

  return { getDeviceInfo, isMobile };
}

/**
 * Hook for language detection only
 */
export function useTabletLanguageDetection() {
  const bridge = useTabletBridge();

  const detectLanguage = useCallback((content: string) => {
    return bridge.detectLanguage(content);
  }, [bridge]);

  return { detectLanguage };
}