import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BaseModal } from '../../languages/json/components/modals/BaseModal';
import { useRootStore } from '../../stores';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Tab } from '../../types';
import { 
  Search, X, Folder, FolderPlus, Edit, Trash2, Pin, PinOff, Copy, 
  Merge, Filter, ArrowDownAZ, ArrowUpZA, Clock, FileCode, 
  CheckSquare, Square, ChevronRight, ChevronDown, AlertTriangle,
  Layers, MoveRight
} from 'lucide-react';
import { languageRegistry } from '../../languages';

interface TabManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SortOption = 'title-asc' | 'title-desc' | 'created-asc' | 'created-desc' | 'modified-asc' | 'modified-desc' | 'language';
type GroupOption = 'none' | 'language' | 'workspace';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDestructive = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-700">
        <h3 className="text-lg font-medium text-gray-100 mb-2">{title}</h3>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

interface TabItemProps {
  tab: Tab;
  isSelected: boolean;
  onSelect: (tabId: string, multiSelect: boolean) => void;
  onDoubleClick: (tabId: string) => void;
  onRename: (tabId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  hasChildren?: boolean;
  depth?: number;
}

const TabItem: React.FC<TabItemProps> = ({
  tab,
  isSelected,
  onSelect,
  onDoubleClick,
  onRename,
  isExpanded,
  onToggleExpand,
  hasChildren,
  depth = 0
}) => {
  const handleClick = (e: React.MouseEvent) => {
    onSelect(tab.id, e.ctrlKey || e.metaKey);
  };

  const handleDoubleClick = () => {
    onDoubleClick(tab.id);
  };

  const getLanguageLabel = () => {
    if (tab.isTablet) return 'Tablet';
    const language = languageRegistry.getById(tab.language);
    return language?.name || tab.language;
  };

  const getLanguageColor = () => {
    if (tab.isTablet) return 'bg-purple-500/20 text-purple-300';
    
    switch(tab.language) {
      case 'javascript': return 'bg-yellow-500/20 text-yellow-300';
      case 'typescript': return 'bg-blue-500/20 text-blue-300';
      case 'json': return 'bg-green-500/20 text-green-300';
      case 'html': return 'bg-orange-500/20 text-orange-300';
      case 'css': return 'bg-pink-500/20 text-pink-300';
      case 'markdown': return 'bg-indigo-500/20 text-indigo-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const indentPadding = depth * 16;

  return (
    <div 
      className={`flex items-center px-3 py-2 cursor-pointer ${isSelected ? 'bg-blue-500/20' : 'hover:bg-gray-700/50'}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div style={{ paddingLeft: `${indentPadding}px` }} className="flex items-center flex-1 min-w-0">
        {hasChildren && (
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
            className="mr-1 text-gray-400 hover:text-gray-200"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        
        {!hasChildren && depth > 0 && <div className="w-5"></div>}
        
        <div className="flex-1 truncate mr-2">
          <span className={`${isSelected ? 'text-blue-300' : 'text-gray-200'}`}>
            {tab.title || 'Untitled'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded ${getLanguageColor()}`}>
            {getLanguageLabel()}
          </span>
          {tab.isPinned && <Pin size={14} className="text-yellow-400" />}
        </div>
      </div>
    </div>
  );
};

interface TabGroupProps {
  title: string;
  tabs: Tab[];
  selectedTabIds: Set<string>;
  onSelectTab: (tabId: string, multiSelect: boolean) => void;
  onDoubleClickTab: (tabId: string) => void;
  onRenameTab: (tabId: string) => void;
}

const TabGroup: React.FC<TabGroupProps> = ({
  title,
  tabs,
  selectedTabIds,
  onSelectTab,
  onDoubleClickTab,
  onRenameTab
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-2">
      <div 
        className="flex items-center px-3 py-2 bg-gray-700/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="mr-1 text-gray-400">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
        <span className="text-gray-200 font-medium">{title}</span>
        <span className="ml-2 text-xs text-gray-400">({tabs.length})</span>
      </div>
      
      {isExpanded && (
        <div>
          {tabs.map(tab => (
            <TabItem
              key={tab.id}
              tab={tab}
              isSelected={selectedTabIds.has(tab.id)}
              onSelect={onSelectTab}
              onDoubleClick={onDoubleClickTab}
              onRename={onRenameTab}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface WorkspaceItemProps {
  workspace: {
    id: string;
    name: string;
    tabCount: number;
  };
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const WorkspaceItem: React.FC<WorkspaceItemProps> = ({
  workspace,
  isActive,
  onSelect,
  onRename,
  onDelete
}) => {
  return (
    <div 
      className={`flex items-center justify-between px-3 py-2 cursor-pointer ${isActive ? 'bg-blue-500/20' : 'hover:bg-gray-700/50'}`}
      onClick={onSelect}
    >
      <div className="flex items-center">
        <Folder size={16} className={`mr-2 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
        <span className={`${isActive ? 'text-blue-300' : 'text-gray-200'}`}>
          {workspace.name}
        </span>
        <span className="ml-2 text-xs text-gray-400">({workspace.tabCount})</span>
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={(e) => { e.stopPropagation(); onRename(); }}
          className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
          title="Rename workspace"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded"
          title="Delete workspace"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export const TabManagementModal: React.FC<TabManagementModalProps> = ({ isOpen, onClose }) => {
  const { tabs, removeTab, updateTabTitle, toggleTabPin, duplicateTab } = useRootStore();
  const { 
    workspaces, 
    activeWorkspaceId, 
    switchWorkspace, 
    createWorkspace, 
    renameWorkspace, 
    deleteWorkspace 
  } = useWorkspaceStore();

  // Local state
  const [selectedTabIds, setSelectedTabIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('title-asc');
  const [groupOption, setGroupOption] = useState<GroupOption>('language');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState('');
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string | null>(null);
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const [mergeDelimiter, setMergeDelimiter] = useState('\n\n');
  const [showDuplicateOptions, setShowDuplicateOptions] = useState(false);
  const [duplicateNamePattern, setDuplicateNamePattern] = useState('');
  
  // Confirmation dialogs
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    isDestructive: false
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedTabIds(new Set());
      setSearchQuery('');
      setLanguageFilter([]);
    }
  }, [isOpen]);

  // Get available languages from tabs
  const availableLanguages = useMemo(() => {
    const languages = new Set<string>();
    tabs.forEach(tab => {
      if (tab.isTablet) {
        languages.add('tablet');
      } else {
        languages.add(tab.language);
      }
    });
    return Array.from(languages).sort();
  }, [tabs]);

  // Get workspace tab counts
  const workspacesWithCounts = useMemo(() => {
    return workspaces.map(workspace => {
      const tabCount = tabs.filter(tab => tab.workspaceId === workspace.id).length;
      return { ...workspace, tabCount };
    });
  }, [workspaces, tabs]);

  // Filter and sort tabs
  const filteredTabs = useMemo(() => {
    let result = [...tabs];
    
    // Filter by workspace
    result = result.filter(tab => tab.workspaceId === activeWorkspaceId);
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(tab => 
        tab.title.toLowerCase().includes(query)
      );
    }
    
    // Filter by language
    if (languageFilter.length > 0) {
      result = result.filter(tab => {
        if (tab.isTablet && languageFilter.includes('tablet')) {
          return true;
        }
        return languageFilter.includes(tab.language);
      });
    }
    
    // Sort tabs
    switch (sortOption) {
      case 'title-asc':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'created-asc':
        result.sort((a, b) => a.dateCreated - b.dateCreated);
        break;
      case 'created-desc':
        result.sort((a, b) => b.dateCreated - a.dateCreated);
        break;
      case 'modified-asc':
        result.sort((a, b) => a.lastModified - b.lastModified);
        break;
      case 'modified-desc':
        result.sort((a, b) => b.lastModified - a.lastModified);
        break;
      case 'language':
        result.sort((a, b) => {
          const aLang = a.isTablet ? 'tablet' : a.language;
          const bLang = b.isTablet ? 'tablet' : b.language;
          return aLang.localeCompare(bLang);
        });
        break;
    }
    
    return result;
  }, [tabs, activeWorkspaceId, searchQuery, languageFilter, sortOption]);

  // Group tabs based on grouping option
  const groupedTabs = useMemo(() => {
    if (groupOption === 'none') {
      return { 'All Tabs': filteredTabs };
    }
    
    const groups: Record<string, Tab[]> = {};
    
    if (groupOption === 'language') {
      filteredTabs.forEach(tab => {
        const key = tab.isTablet ? 'Tablets' : (languageRegistry.getById(tab.language)?.name || tab.language);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(tab);
      });
    } else if (groupOption === 'workspace') {
      const workspaceMap = new Map(workspaces.map(w => [w.id, w.name]));
      
      filteredTabs.forEach(tab => {
        const key = workspaceMap.get(tab.workspaceId) || 'Unknown Workspace';
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(tab);
      });
    }
    
    return groups;
  }, [filteredTabs, groupOption, workspaces]);

  // Check if there are any duplicate tabs
  const duplicateTabs = useMemo(() => {
    const contentMap = new Map<string, Tab[]>();
    
    // Only consider tabs in the current workspace
    const workspaceTabs = tabs.filter(tab => tab.workspaceId === activeWorkspaceId);
    
    workspaceTabs.forEach(tab => {
      if (!tab.isTablet) {
        const content = tab.content.trim();
        if (content) {
          if (!contentMap.has(content)) {
            contentMap.set(content, []);
          }
          contentMap.get(content)!.push(tab);
        }
      }
    });
    
    // Filter to only include content with multiple tabs
    const duplicates: Record<string, Tab[]> = {};
    contentMap.forEach((tabsWithContent, content) => {
      if (tabsWithContent.length > 1) {
        // Use the first tab's title as the key
        const key = tabsWithContent[0].title;
        duplicates[key] = tabsWithContent;
      }
    });
    
    return duplicates;
  }, [tabs, activeWorkspaceId]);

  // Handlers
  const handleSelectTab = (tabId: string, multiSelect: boolean) => {
    setSelectedTabIds(prev => {
      const newSelection = new Set(prev);
      
      if (multiSelect) {
        // Toggle selection
        if (newSelection.has(tabId)) {
          newSelection.delete(tabId);
        } else {
          newSelection.add(tabId);
        }
      } else {
        // Single selection
        newSelection.clear();
        newSelection.add(tabId);
      }
      
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const allTabIds = new Set(filteredTabs.map(tab => tab.id));
    setSelectedTabIds(allTabIds);
  };

  const handleDeselectAll = () => {
    setSelectedTabIds(new Set());
  };

  const handleDoubleClickTab = (tabId: string) => {
    // Open the tab and close the modal
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      // Determine which side to activate
      const { splitView, setActiveLeftTab, setActiveRightTab } = useRootStore.getState();
      
      if (splitView.leftTabs.includes(tabId)) {
        setActiveLeftTab(tabId);
      } else if (splitView.rightTabs.includes(tabId)) {
        setActiveRightTab(tabId);
      } else {
        // Default to left side if not found in either
        setActiveLeftTab(tabId);
      }
      
      onClose();
    }
  };

  const handleRenameTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      const newTitle = prompt('Enter new tab title:', tab.title);
      if (newTitle !== null && newTitle.trim() !== '') {
        updateTabTitle(tabId, newTitle.trim());
      }
    }
  };

  const handleCloseTabs = () => {
    if (selectedTabIds.size === 0) return;
    
    setConfirmationDialog({
      isOpen: true,
      title: 'Close Tabs',
      message: `Are you sure you want to close ${selectedTabIds.size} tab(s)? This action cannot be undone.`,
      confirmText: 'Close Tabs',
      cancelText: 'Cancel',
      onConfirm: () => {
        selectedTabIds.forEach(id => {
          removeTab(id);
        });
        setSelectedTabIds(new Set());
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      },
      isDestructive: true
    });
  };

  const handleTogglePinTabs = () => {
    if (selectedTabIds.size === 0) return;
    
    // Check if any selected tab is not pinned
    const selectedTabs = tabs.filter(tab => selectedTabIds.has(tab.id));
    const hasUnpinnedTab = selectedTabs.some(tab => !tab.isPinned);
    
    // Pin all if any are unpinned, otherwise unpin all
    selectedTabIds.forEach(id => {
      const tab = tabs.find(t => t.id === id);
      if (tab && (hasUnpinnedTab ? !tab.isPinned : tab.isPinned)) {
        toggleTabPin(id);
      }
    });
  };

  const handleDuplicateTabs = () => {
    if (selectedTabIds.size === 0) return;
    
    if (duplicateNamePattern) {
      // Bulk rename with pattern
      const selectedTabs = tabs.filter(tab => selectedTabIds.has(tab.id));
      
      selectedTabs.forEach((tab, index) => {
        const newTabId = duplicateTab(tab.id, false);
        const newTitle = duplicateNamePattern.replace('{index}', (index + 1).toString())
                                            .replace('{title}', tab.title);
        updateTabTitle(newTabId, newTitle);
      });
      
      setDuplicateNamePattern('');
      setShowDuplicateOptions(false);
    } else {
      // Simple duplication
      selectedTabIds.forEach(id => {
        duplicateTab(id, false);
      });
    }
    
    // Clear selection after duplication
    setSelectedTabIds(new Set());
  };

  const handleMergeTabs = () => {
    if (selectedTabIds.size < 2) return;
    
    const selectedTabs = tabs.filter(tab => selectedTabIds.has(tab.id));
    
    // Check if all selected tabs are text-based (not tablets)
    const allTextBased = selectedTabs.every(tab => !tab.isTablet);
    
    if (!allTextBased) {
      alert('Only text-based tabs can be merged. Please deselect any tablet tabs.');
      return;
    }
    
    // Sort tabs by title before merging
    const sortedTabs = [...selectedTabs].sort((a, b) => a.title.localeCompare(b.title));
    
    // Merge content with the specified delimiter
    const mergedContent = sortedTabs.map(tab => tab.content).join(mergeDelimiter);
    
    // Create a new tab with the merged content
    const { addTab } = useRootStore.getState();
    
    addTab({
      id: crypto.randomUUID(),
      title: 'Merged Tabs',
      content: mergedContent,
      language: 'plaintext', // Default to plaintext
      languageLocked: false,
      cursorPosition: { lineNumber: 1, column: 1 },
      dateCreated: Date.now(),
      lastModified: Date.now(),
      workspaceId: activeWorkspaceId || ''
    });
    
    setShowMergeOptions(false);
    setSelectedTabIds(new Set());
  };

  const handleMoveToWorkspace = () => {
    if (selectedTabIds.size === 0 || !targetWorkspaceId) return;
    
    // Update workspaceId for all selected tabs
    const updatedTabs = tabs.map(tab => {
      if (selectedTabIds.has(tab.id)) {
        return { ...tab, workspaceId: targetWorkspaceId };
      }
      return tab;
    });
    
    // Update tabs in store
    const { saveTabs } = useRootStore.getState();
    saveTabs(updatedTabs);
    
    setTargetWorkspaceId(null);
    setSelectedTabIds(new Set());
  };

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;
    
    createWorkspace(newWorkspaceName.trim());
    setNewWorkspaceName('');
    setIsCreatingWorkspace(false);
  };

  const handleRenameWorkspace = () => {
    if (!editingWorkspaceId || !editingWorkspaceName.trim()) return;
    
    renameWorkspace(editingWorkspaceId, editingWorkspaceName.trim());
    setEditingWorkspaceId(null);
    setEditingWorkspaceName('');
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;
    
    setConfirmationDialog({
      isOpen: true,
      title: 'Delete Workspace',
      message: `Are you sure you want to delete the workspace "${workspace.name}"? All tabs in this workspace will be permanently deleted.`,
      confirmText: 'Delete Workspace',
      cancelText: 'Cancel',
      onConfirm: () => {
        deleteWorkspace(workspaceId);
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      },
      isDestructive: true
    });
  };

  const handleRemoveDuplicates = () => {
    const duplicateGroups = Object.values(duplicateTabs);
    if (duplicateGroups.length === 0) return;
    
    setConfirmationDialog({
      isOpen: true,
      title: 'Remove Duplicate Tabs',
      message: `Found ${duplicateGroups.length} groups of duplicate tabs. Do you want to keep only the newest tab from each group and remove the rest?`,
      confirmText: 'Remove Duplicates',
      cancelText: 'Cancel',
      onConfirm: () => {
        // For each group of duplicates, keep the newest and remove the rest
        duplicateGroups.forEach(group => {
          // Sort by lastModified (descending)
          const sorted = [...group].sort((a, b) => b.lastModified - a.lastModified);
          
          // Keep the first one (newest) and remove the rest
          for (let i = 1; i < sorted.length; i++) {
            removeTab(sorted[i].id);
          }
        });
        
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Render tab tooltip content
  const renderTabTooltip = (tab: Tab) => {
    if (tab.isTablet) {
      return (
        <div className="p-2">
          <div className="font-medium">{tab.title}</div>
          <div className="text-xs text-gray-400 mt-1">Tablet</div>
        </div>
      );
    }
    
    // Get first 10 lines of content
    const lines = tab.content.split('\n').slice(0, 10);
    const hasMoreLines = tab.content.split('\n').length > 10;
    
    return (
      <div className="p-2">
        <div className="font-medium">{tab.title}</div>
        <div className="text-xs text-gray-400 mt-1">
          Last modified: {new Date(tab.lastModified).toLocaleString()}
        </div>
        <div className="mt-2 font-mono text-xs border-t border-gray-700 pt-2">
          {lines.map((line, i) => (
            <div key={i} className="truncate">{line}</div>
          ))}
          {hasMoreLines && <div className="text-gray-500">...</div>}
        </div>
      </div>
    );
  };

  // Reset selected tabs when switching workspaces
  useEffect(() => {
    setSelectedTabIds(new Set());
  }, [activeWorkspaceId]);

  if (!isOpen) return null;

  return (
    <BaseModal 
      title="Tab Management" 
      onClose={onClose}
      maxWidthClass="max-w-6xl"
      maxHeightClass="max-h-[90vh]"
    >
      <div className="flex h-[70vh]">
        {/* Left sidebar - Workspaces */}
        <div className="w-64 border-r border-gray-700/50 flex flex-col">
          <div className="p-3 border-b border-gray-700/50">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Workspaces</h3>
            
            {/* Create workspace button */}
            <button
              onClick={() => setIsCreatingWorkspace(true)}
              className="w-full flex items-center justify-center space-x-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors text-sm"
            >
              <FolderPlus size={14} />
              <span>New Workspace</span>
            </button>
            
            {/* Create workspace form */}
            {isCreatingWorkspace && (
              <div className="mt-3 p-3 bg-gray-800/50 rounded-md">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name"
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded px-2 py-1 text-sm text-gray-200 mb-2"
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsCreatingWorkspace(false)}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={!newWorkspaceName.trim()}
                    className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
            
            {/* Edit workspace form */}
            {editingWorkspaceId && (
              <div className="mt-3 p-3 bg-gray-800/50 rounded-md">
                <input
                  type="text"
                  value={editingWorkspaceName}
                  onChange={(e) => setEditingWorkspaceName(e.target.value)}
                  placeholder="Workspace name"
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded px-2 py-1 text-sm text-gray-200 mb-2"
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => { setEditingWorkspaceId(null); setEditingWorkspaceName(''); }}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRenameWorkspace}
                    disabled={!editingWorkspaceName.trim()}
                    className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 disabled:opacity-50"
                  >
                    Rename
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Workspace list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {workspacesWithCounts.map(workspace => (
              <WorkspaceItem
                key={workspace.id}
                workspace={workspace}
                isActive={workspace.id === activeWorkspaceId}
                onSelect={() => switchWorkspace(workspace.id)}
                onRename={() => {
                  setEditingWorkspaceId(workspace.id);
                  setEditingWorkspaceName(workspace.name);
                }}
                onDelete={() => handleDeleteWorkspace(workspace.id)}
              />
            ))}
          </div>
        </div>
        
        {/* Main content - Tabs */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="p-3 border-b border-gray-700/50">
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative flex-grow max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tabs..."
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md pl-9 pr-3 py-1.5 text-sm text-gray-200"
                />
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              </div>
              
              {/* Language filter */}
              <div className="relative">
                <select
                  multiple
                  value={languageFilter}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions, option => option.value);
                    setLanguageFilter(options);
                  }}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 appearance-none pr-8"
                >
                  <option value="">All Languages</option>
                  {availableLanguages.map(lang => (
                    <option key={lang} value={lang}>
                      {lang === 'tablet' ? 'Tablets' : (languageRegistry.getById(lang)?.name || lang)}
                    </option>
                  ))}
                </select>
                <Filter size={14} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              
              {/* Sort options */}
              <div className="relative">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 appearance-none pr-8"
                >
                  <option value="title-asc">Title A-Z</option>
                  <option value="title-desc">Title Z-A</option>
                  <option value="created-desc">Newest First</option>
                  <option value="created-asc">Oldest First</option>
                  <option value="modified-desc">Recently Modified</option>
                  <option value="modified-asc">Least Recently Modified</option>
                  <option value="language">Language</option>
                </select>
                {sortOption.includes('asc') ? (
                  <ArrowDownAZ size={14} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
                ) : (
                  <ArrowUpZA size={14} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
                )}
              </div>
              
              {/* Group options */}
              <div className="relative">
                <select
                  value={groupOption}
                  onChange={(e) => setGroupOption(e.target.value as GroupOption)}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 appearance-none pr-8"
                >
                  <option value="none">No Grouping</option>
                  <option value="language">Group by Language</option>
                  <option value="workspace">Group by Workspace</option>
                </select>
                <Layers size={14} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
            
            {/* Selection info and actions */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-400">
                  {selectedTabIds.size > 0 
                    ? `${selectedTabIds.size} tab(s) selected` 
                    : `${filteredTabs.length} tab(s) found`}
                </div>
                
                {selectedTabIds.size > 0 && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleDeselectAll}
                      className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-300"
                    >
                      Deselect All
                    </button>
                  </div>
                )}
                
                {selectedTabIds.size === 0 && filteredTabs.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-300"
                  >
                    Select All
                  </button>
                )}
              </div>
              
              {/* Bulk actions */}
              {selectedTabIds.size > 0 && activeWorkspaceId === workspacesWithCounts.find(w => w.id === activeWorkspaceId)?.id && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleTogglePinTabs}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-colors"
                    title="Toggle pin status"
                  >
                    <Pin size={14} className="text-gray-400" />
                    <span>Toggle Pin</span>
                  </button>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowDuplicateOptions(!showDuplicateOptions)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-colors"
                      title="Duplicate selected tabs"
                    >
                      <Copy size={14} className="text-gray-400" />
                      <span>Duplicate</span>
                    </button>
                    
                    {showDuplicateOptions && (
                      <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 p-3 w-64">
                        <div className="text-xs text-gray-300 mb-2">Naming Pattern (optional)</div>
                        <input
                          type="text"
                          value={duplicateNamePattern}
                          onChange={(e) => setDuplicateNamePattern(e.target.value)}
                          placeholder="e.g. Copy of {title} {index}"
                          className="w-full bg-gray-700/50 border border-gray-600/50 rounded px-2 py-1 text-sm text-gray-200 mb-2"
                        />
                        <div className="text-xs text-gray-500 mb-3">
                          Use {'{title}'} for original title and {'{index}'} for numbering
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setShowDuplicateOptions(false)}
                            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDuplicateTabs}
                            className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                          >
                            Duplicate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {selectedTabIds.size >= 2 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowMergeOptions(!showMergeOptions)}
                        className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-colors"
                        title="Merge selected tabs"
                      >
                        <Merge size={14} className="text-gray-400" />
                        <span>Merge</span>
                      </button>
                      
                      {showMergeOptions && (
                        <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 p-3 w-64">
                          <div className="text-xs text-gray-300 mb-2">Delimiter Between Contents</div>
                          <select
                            value={mergeDelimiter}
                            onChange={(e) => setMergeDelimiter(e.target.value)}
                            className="w-full bg-gray-700/50 border border-gray-600/50 rounded px-2 py-1 text-sm text-gray-200 mb-3"
                          >
                            <option value="\n\n">Double Line Break</option>
                            <option value="\n">Single Line Break</option>
                            <option value="\n---\n">Markdown Separator</option>
                            <option value="">No Separator</option>
                          </select>
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setShowMergeOptions(false)}
                              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleMergeTabs}
                              className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                            >
                              Merge Tabs
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="relative">
                    <button
                      onClick={() => setTargetWorkspaceId(null)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-colors"
                      title="Move to workspace"
                    >
                      <MoveRight size={14} className="text-gray-400" />
                      <span>Move To</span>
                    </button>
                    
                    {targetWorkspaceId !== null && (
                      <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 p-3 w-64">
                        <div className="text-xs text-gray-300 mb-2">Select Target Workspace</div>
                        <select
                          value={targetWorkspaceId}
                          onChange={(e) => setTargetWorkspaceId(e.target.value)}
                          className="w-full bg-gray-700/50 border border-gray-600/50 rounded px-2 py-1 text-sm text-gray-200 mb-3"
                        >
                          <option value="">Select Workspace</option>
                          {workspaces.filter(w => w.id !== activeWorkspaceId).map(workspace => (
                            <option key={workspace.id} value={workspace.id}>
                              {workspace.name}
                            </option>
                          ))}
                        </select>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setTargetWorkspaceId(null)}
                            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleMoveToWorkspace}
                            disabled={!targetWorkspaceId}
                            className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 disabled:opacity-50"
                          >
                            Move Tabs
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleCloseTabs}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/30 transition-colors"
                    title="Close selected tabs"
                  >
                    <X size={14} />
                    <span>Close</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Tab list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {Object.entries(duplicateTabs).length > 0 && (
              <div className="m-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle size={16} className="text-yellow-500 mr-2" />
                  <span className="text-sm text-yellow-200">
                    Found {Object.entries(duplicateTabs).length} groups of duplicate tabs
                  </span>
                </div>
                <button
                  onClick={handleRemoveDuplicates}
                  className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors"
                >
                  Remove Duplicates
                </button>
              </div>
            )}
            
            {filteredTabs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p>No tabs found matching your criteria</p>
              </div>
            ) : (
              <div>
                {Object.entries(groupedTabs).map(([groupName, groupTabs]) => (
                  <TabGroup
                    key={groupName}
                    title={groupName}
                    tabs={groupTabs}
                    selectedTabIds={selectedTabIds}
                    onSelectTab={handleSelectTab}
                    onDoubleClickTab={handleDoubleClickTab}
                    onRenameTab={handleRenameTab}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Confirmation dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        confirmText={confirmationDialog.confirmText}
        cancelText={confirmationDialog.cancelText}
        onConfirm={confirmationDialog.onConfirm}
        onCancel={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmationDialog.isDestructive}
      />
    </BaseModal>
  );
};