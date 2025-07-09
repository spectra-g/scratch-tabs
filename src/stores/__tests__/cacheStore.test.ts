import { describe, it, expect, beforeEach } from '@jest/globals';
import { useCacheStore } from '../cacheStore';
import { SplitViewRecord } from '../../types';

describe('CacheStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useCacheStore.setState({
      cachedSplitView: null,
    });
  });

  describe('Initial State', () => {
    it('should initialize with no cached split view', () => {
      const state = useCacheStore.getState();
      
      expect(state.cachedSplitView).toBeNull();
    });
  });

  describe('Cache Split View', () => {
    it('should cache split view for workspace', () => {
      const workspaceId = 'test-workspace-id';
      const splitView: SplitViewRecord = {
        id: 'split-view-1',
        isSplit: true,
        leftTabs: ['tab1', 'tab2'],
        rightTabs: ['tab3'],
        activeLeftTabId: 'tab1',
        activeRightTabId: 'tab3',
        activeSide: 'left',
        splitRatio: 0.5,
        workspaceId,
        lastModified: Date.now(),
        leftTabHistory: ['tab1', 'tab2'],
        rightTabHistory: ['tab3'],
      };

      useCacheStore.getState().cacheSplitViewForWorkspace(workspaceId, splitView);

      const state = useCacheStore.getState();
      expect(state.cachedSplitView).not.toBeNull();
      expect(state.cachedSplitView?.workspaceId).toBe(workspaceId);
      expect(state.cachedSplitView?.splitView).toEqual(splitView);
    });

    it('should handle activeSide type casting correctly', () => {
      const workspaceId = 'test-workspace-id';
      const splitView: SplitViewRecord = {
        id: 'split-view-1',
        isSplit: true,
        leftTabs: ['tab1'],
        rightTabs: ['tab2'],
        activeLeftTabId: 'tab1',
        activeRightTabId: 'tab2',
        activeSide: 'right' as any, // Testing type casting
        splitRatio: 0.6,
        workspaceId,
        lastModified: Date.now(),
        leftTabHistory: ['tab1'],
        rightTabHistory: ['tab2'],
      };

      useCacheStore.getState().cacheSplitViewForWorkspace(workspaceId, splitView);

      const state = useCacheStore.getState();
      expect(state.cachedSplitView?.splitView.activeSide).toBe('right');
    });

    it('should handle null activeSide', () => {
      const workspaceId = 'test-workspace-id';
      const splitView: SplitViewRecord = {
        id: 'split-view-1',
        isSplit: false,
        leftTabs: ['tab1'],
        rightTabs: [],
        activeLeftTabId: 'tab1',
        activeRightTabId: null,
        activeSide: null,
        splitRatio: 0.5,
        workspaceId,
        lastModified: Date.now(),
        leftTabHistory: ['tab1'],
        rightTabHistory: [],
      };

      useCacheStore.getState().cacheSplitViewForWorkspace(workspaceId, splitView);

      const state = useCacheStore.getState();
      expect(state.cachedSplitView?.splitView.activeSide).toBeNull();
    });

    it('should overwrite existing cached split view', () => {
      const workspaceId = 'test-workspace-id';
      const firstSplitView: SplitViewRecord = {
        id: 'split-view-1',
        isSplit: true,
        leftTabs: ['tab1'],
        rightTabs: ['tab2'],
        activeLeftTabId: 'tab1',
        activeRightTabId: 'tab2',
        activeSide: 'left',
        splitRatio: 0.5,
        workspaceId,
        lastModified: Date.now(),
        leftTabHistory: ['tab1'],
        rightTabHistory: ['tab2'],
      };

      const secondSplitView: SplitViewRecord = {
        id: 'split-view-2',
        isSplit: false,
        leftTabs: ['tab3', 'tab4'],
        rightTabs: [],
        activeLeftTabId: 'tab3',
        activeRightTabId: null,
        activeSide: null,
        splitRatio: 0.5,
        workspaceId,
        lastModified: Date.now(),
        leftTabHistory: ['tab3', 'tab4'],
        rightTabHistory: [],
      };

      // Cache first split view
      useCacheStore.getState().cacheSplitViewForWorkspace(workspaceId, firstSplitView);
      expect(useCacheStore.getState().cachedSplitView?.splitView.id).toBe('split-view-1');

      // Cache second split view - should overwrite
      useCacheStore.getState().cacheSplitViewForWorkspace(workspaceId, secondSplitView);
      expect(useCacheStore.getState().cachedSplitView?.splitView.id).toBe('split-view-2');
    });

    it('should handle different workspace IDs', () => {
      const firstWorkspaceId = 'workspace-1';
      const secondWorkspaceId = 'workspace-2';
      const splitView: SplitViewRecord = {
        id: 'split-view-1',
        isSplit: true,
        leftTabs: ['tab1'],
        rightTabs: ['tab2'],
        activeLeftTabId: 'tab1',
        activeRightTabId: 'tab2',
        activeSide: 'left',
        splitRatio: 0.5,
        workspaceId: firstWorkspaceId,
        lastModified: Date.now(),
        leftTabHistory: ['tab1'],
        rightTabHistory: ['tab2'],
      };

      // Cache for first workspace
      useCacheStore.getState().cacheSplitViewForWorkspace(firstWorkspaceId, splitView);
      expect(useCacheStore.getState().cachedSplitView?.workspaceId).toBe(firstWorkspaceId);

      // Cache for second workspace - should overwrite
      useCacheStore.getState().cacheSplitViewForWorkspace(secondWorkspaceId, splitView);
      expect(useCacheStore.getState().cachedSplitView?.workspaceId).toBe(secondWorkspaceId);
    });
  });

  describe('Clear Cache', () => {
    it('should clear cached split view', () => {
      const workspaceId = 'test-workspace-id';
      const splitView: SplitViewRecord = {
        id: 'split-view-1',
        isSplit: true,
        leftTabs: ['tab1'],
        rightTabs: ['tab2'],
        activeLeftTabId: 'tab1',
        activeRightTabId: 'tab2',
        activeSide: 'left',
        splitRatio: 0.5,
        workspaceId,
        lastModified: Date.now(),
        leftTabHistory: ['tab1'],
        rightTabHistory: ['tab2'],
      };

      // Cache a split view
      useCacheStore.getState().cacheSplitViewForWorkspace(workspaceId, splitView);
      expect(useCacheStore.getState().cachedSplitView).not.toBeNull();

      // Clear cache
      useCacheStore.getState().clearCachedSplitView();
      expect(useCacheStore.getState().cachedSplitView).toBeNull();
    });

    it('should handle clearing when cache is already empty', () => {
      expect(useCacheStore.getState().cachedSplitView).toBeNull();

      // Clear cache when already empty
      useCacheStore.getState().clearCachedSplitView();
      expect(useCacheStore.getState().cachedSplitView).toBeNull();
    });
  });

  describe('Function References', () => {
    it('should provide consistent function references', () => {
      const store1 = useCacheStore.getState();
      const store2 = useCacheStore.getState();

      expect(store1.cacheSplitViewForWorkspace).toBe(store2.cacheSplitViewForWorkspace);
      expect(store1.clearCachedSplitView).toBe(store2.clearCachedSplitView);
    });
  });

  describe('State Immutability', () => {
    it('should not mutate the original splitView object', () => {
      const workspaceId = 'test-workspace-id';
      const originalSplitView: SplitViewRecord = {
        id: 'split-view-1',
        isSplit: true,
        leftTabs: ['tab1'],
        rightTabs: ['tab2'],
        activeLeftTabId: 'tab1',
        activeRightTabId: 'tab2',
        activeSide: 'left',
        splitRatio: 0.5,
        workspaceId,
        lastModified: Date.now(),
        leftTabHistory: ['tab1'],
        rightTabHistory: ['tab2'],
      };

      const originalCopy = { ...originalSplitView };
      
      useCacheStore.getState().cacheSplitViewForWorkspace(workspaceId, originalSplitView);
      
      // Original should not be modified
      expect(originalSplitView).toEqual(originalCopy);
      
      // Cached version should be a copy
      const cachedSplitView = useCacheStore.getState().cachedSplitView?.splitView;
      expect(cachedSplitView).not.toBe(originalSplitView);
      expect(cachedSplitView).toEqual(originalSplitView);
    });
  });
}); 