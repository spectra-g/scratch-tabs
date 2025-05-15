import React, { useState, useEffect, useCallback } from 'react';
import { BaseModal } from '../../languages/json/components/modals/BaseModal';
import { useRootStore } from '../../stores';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useModalStore } from '../../stores/modalStore';
import { Tab } from '../../types';
import { Folder, Loader2, MoveHorizontal } from 'lucide-react';

interface TabManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TabManagementModal: React.FC<TabManagementModalProps> = ({ isOpen, onClose }) => {
  const { tabs } = useRootStore();
  const { workspaces, activeWorkspaceId, switchWorkspace } = useWorkspaceStore();
  const { isTabManagementActionInProgress, setTabManagementActionInProgress } = useModalStore();
  
  const [selectedTabs, setSelectedTabs] = useState<Set<string>>(new Set());
  const [draggedTabs, setDraggedTabs] = useState<string[]>([]);
  const [dropTargetWorkspace, setDropTargetWorkspace] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTabs(new Set());
      setDraggedTabs([]);
      setDropTargetWorkspace(null);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  // Group tabs by workspace
  const tabsByWorkspace = tabs.reduce((acc, tab) => {
    if (!acc[tab.workspaceId]) {
      acc[tab.workspaceId] = [];
    }
    acc[tab.workspaceId].push(tab);
    return acc;
  }, {} as Record<string, Tab[]>);

  const handleTabSelect = (tabId: string) => {
    setSelectedTabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tabId)) {
        newSet.delete(tabId);
      } else {
        newSet.add(tabId);
      }
      return newSet;
    });
  };

  const handleSelectAllInWorkspace = (workspaceId: string) => {
    const workspaceTabs = tabsByWorkspace[workspaceId] || [];
    setSelectedTabs(prev => {
      const newSet = new Set(prev);
      workspaceTabs.forEach(tab => newSet.add(tab.id));
      return newSet;
    });
  };

  const handleDeselectAllInWorkspace = (workspaceId: string) => {
    const workspaceTabs = tabsByWorkspace[workspaceId] || [];
    setSelectedTabs(prev => {
      const newSet = new Set(prev);
      workspaceTabs.forEach(tab => newSet.delete(tab.id));
      return newSet;
    });
  };

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    // If the tab is not already selected, select only this tab
    if (!selectedTabs.has(tabId)) {
      setSelectedTabs(new Set([tabId]));
      setDraggedTabs([tabId]);
      console.log(`[TabManagement] Drag started with single tab: ${tabId}`);
    } else {
      // If the tab is already selected, drag all selected tabs
      const draggedTabsArray = Array.from(selectedTabs);
      setDraggedTabs(draggedTabsArray);
      console.log(`[TabManagement] Drag started with multiple tabs: ${draggedTabsArray.length} tabs`, draggedTabsArray);
    }
    
    // Set the drag data
    e.dataTransfer.setData('text/plain', 'tab-drag');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, workspaceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set drop target if it's different from the current one
    if (dropTargetWorkspace !== workspaceId) {
      setDropTargetWorkspace(workspaceId);
      console.log(`[TabManagement] Drag over workspace: ${workspaceId}`);
    }
    
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setDropTargetWorkspace(null);
  };

  const moveTabsToWorkspace = useCallback(async (tabIds: string[], targetWorkspaceId: string) => {
    console.log(`[TabManagement] moveTabsToWorkspace called with:`, {
      tabIds,
      targetWorkspaceId,
      selectedTabsCount: selectedTabs.size
    });
    
    if (tabIds.length === 0 || !targetWorkspaceId) {
      console.error('[TabManagement] Invalid parameters for moveTabsToWorkspace');
      return;
    }

    setIsLoading(true);
    setTabManagementActionInProgress(true);
    setError(null);
    setSuccess(null);

    try {
      console.log(`[TabManagement] Starting tab movement process for ${tabIds.length} tabs to workspace ${targetWorkspaceId}`);
      
      // Get the tabs to move
      const tabsToMove = tabs.filter(tab => tabIds.includes(tab.id));
      console.log(`[TabManagement] Found ${tabsToMove.length} tabs to move`);
      
      // Check if any tabs are from the active workspace
      const movingFromActiveWorkspace = tabsToMove.some(tab => tab.workspaceId === activeWorkspaceId);
      console.log(`[TabManagement] Moving from active workspace: ${movingFromActiveWorkspace}`);
      
      // Update the workspace ID for each tab
      const updatedTabs = tabsToMove.map(tab => ({
        ...tab,
        workspaceId: targetWorkspaceId
      }));
      
      // Get the current store state
      const store = useRootStore.getState();
      
      // Update the tabs in the store
      store.tabs = tabs.map(tab => {
        const updatedTab = updatedTabs.find(t => t.id === tab.id);
        return updatedTab || tab;
      });
      
      console.log(`[TabManagement] Updated tabs in store`);
      
      // If we moved tabs from the active workspace, we need to switch to the target workspace
      if (movingFromActiveWorkspace && targetWorkspaceId !== activeWorkspaceId) {
        console.log(`[TabManagement] Switching to target workspace: ${targetWorkspaceId}`);
        await switchWorkspace(targetWorkspaceId);
      }
      
      setSuccess(`Successfully moved ${tabIds.length} tab${tabIds.length === 1 ? '' : 's'} to ${workspaces.find(w => w.id === targetWorkspaceId)?.name || 'workspace'}`);
      console.log(`[TabManagement] Tab movement completed successfully`);
    } catch (err) {
      console.error('[TabManagement] Error moving tabs:', err);
      setError('Failed to move tabs. Please try again.');
    } finally {
      setIsLoading(false);
      setTabManagementActionInProgress(false);
      setSelectedTabs(new Set());
      setDraggedTabs([]);
      setDropTargetWorkspace(null);
    }
  }, [tabs, activeWorkspaceId, switchWorkspace, workspaces, setTabManagementActionInProgress, selectedTabs]);

  const handleDrop = useCallback((e: React.DragEvent, workspaceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log(`[TabManagement] Drop event on workspace: ${workspaceId}`);
    console.log(`[TabManagement] Dragged tabs:`, draggedTabs);
    
    // Check if we have tabs to move and a valid target workspace
    if (draggedTabs.length === 0) {
      console.error('[TabManagement] No tabs being dragged');
      return;
    }
    
    // Don't move tabs to their current workspace
    const sourceWorkspaceId = tabs.find(tab => tab.id === draggedTabs[0])?.workspaceId;
    if (sourceWorkspaceId === workspaceId) {
      console.log(`[TabManagement] Source and target workspaces are the same: ${workspaceId}`);
      return;
    }
    
    console.log(`[TabManagement] Moving tabs from workspace ${sourceWorkspaceId} to ${workspaceId}`);
    moveTabsToWorkspace(draggedTabs, workspaceId);
  }, [draggedTabs, tabs, moveTabsToWorkspace]);

  const handleMoveButtonClick = useCallback(() => {
    if (selectedTabs.size === 0 || !dropTargetWorkspace) {
      console.log(`[TabManagement] Invalid move button click:`, {
        selectedTabsCount: selectedTabs.size,
        dropTargetWorkspace
      });
      return;
    }
    
    console.log(`[TabManagement] Move button clicked for ${selectedTabs.size} tabs to workspace ${dropTargetWorkspace}`);
    moveTabsToWorkspace(Array.from(selectedTabs), dropTargetWorkspace);
  }, [selectedTabs, dropTargetWorkspace, moveTabsToWorkspace]);

  if (!isOpen) return null;

  return (
    <BaseModal title="Manage Tabs" onClose={onClose} maxWidthClass="max-w-5xl">
      <div className="p-4 space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-md p-3 text-red-400">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-md p-3 text-green-400">
            {success}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-200">
            {selectedTabs.size > 0 ? `${selectedTabs.size} tab${selectedTabs.size === 1 ? '' : 's'} selected` : 'Select tabs to manage'}
          </h3>
          
          {selectedTabs.size > 0 && (
            <div className="flex items-center space-x-2">
              <select
                value={dropTargetWorkspace || ''}
                onChange={(e) => setDropTargetWorkspace(e.target.value || null)}
                className="bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200"
              >
                <option value="">Move to workspace...</option>
                {workspaces.map(workspace => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
              
              <button
                onClick={handleMoveButtonClick}
                disabled={selectedTabs.size === 0 || !dropTargetWorkspace || isLoading}
                className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <MoveHorizontal size={16} />
                )}
                <span>Move</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-6">
          {workspaces.map(workspace => {
            const workspaceTabs = tabsByWorkspace[workspace.id] || [];
            const isActive = workspace.id === activeWorkspaceId;
            const isDropTarget = dropTargetWorkspace === workspace.id;
            
            return (
              <div 
                key={workspace.id}
                className={`border rounded-lg overflow-hidden ${
                  isActive ? 'border-blue-500/50' : 'border-gray-700/50'
                } ${
                  isDropTarget ? 'bg-blue-500/10 border-blue-500/50' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, workspace.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, workspace.id)}
              >
                <div className="bg-gray-800/50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Folder size={18} className={isActive ? 'text-blue-400' : 'text-gray-400'} />
                    <h4 className="font-medium text-gray-200">
                      {workspace.name}
                      {isActive && <span className="ml-2 text-xs text-blue-400">(Active)</span>}
                    </h4>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs">
                    <button
                      onClick={() => handleSelectAllInWorkspace(workspace.id)}
                      className="px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded text-gray-300"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => handleDeselectAllInWorkspace(workspace.id)}
                      className="px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded text-gray-300"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-700/30">
                  {workspaceTabs.length === 0 ? (
                    <div className="px-4 py-3 text-gray-400 text-sm italic">
                      No tabs in this workspace
                    </div>
                  ) : (
                    workspaceTabs.map(tab => (
                      <div
                        key={tab.id}
                        className={`px-4 py-3 flex items-center ${
                          selectedTabs.has(tab.id) ? 'bg-blue-500/20' : 'hover:bg-gray-800/50'
                        }`}
                        onClick={() => handleTabSelect(tab.id)}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, tab.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTabs.has(tab.id)}
                          onChange={() => handleTabSelect(tab.id)}
                          className="mr-3 h-4 w-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500/50 bg-gray-700"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-200 truncate">
                            {tab.title}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {tab.language} • {new Date(tab.lastModified).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </BaseModal>
  );
};