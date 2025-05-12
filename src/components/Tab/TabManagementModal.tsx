import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { StorageProviderFactory } from '../../db';
import { BaseModal } from '../../languages/json/components/modals/BaseModal';
import { useRootStore } from '../../stores';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Tab } from '../../types';
import { 
  Search, X, Folder, FolderPlus, Edit, Trash2, Pin, 
  Merge, Filter, ArrowDownAZ, ArrowUpZA, AlertTriangle,
  Layers, ChevronRight, ChevronDown, Copy
} from 'lucide-react';
import { languageRegistry } from '../../languages';
import { useSplitViewStore } from '../../stores/splitViewStore';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';

// Helper function to format relative time
const getRelativeTimeString = (timestamp: number): string => {
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
};

interface TabManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
        <h3 className="font-semibold text-red-300 mb-1 flex items-center"><AlertTriangle size={18} className="mr-2" />{title}</h3>
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

interface TabGroupProps {
  title: string;
  tabs: Tab[];
  selectedTabIds: Set<string>;
  onSelectTab: (tabId: string, multiSelect: boolean) => void;
  onDoubleClickTab: (tabId: string) => void;
  // onRenameTab: (tabId: string, currentTitle: string) => void; // Replaced by internal edit handling
  editingTabId: string | null;
  onStartEditTab: (tabId: string) => void;
  onSaveTabTitle: (tabId: string, newTitle: string) => void;
  onCancelEditTab: (tabId: string) => void;
  groupWorkspaceId: string; // Pass the workspace ID for this group
}

const TabGroup: React.FC<TabGroupProps> = ({
  title,
  tabs,
  selectedTabIds,
  onSelectTab,
  onDoubleClickTab,
  editingTabId,
  onStartEditTab,
  onSaveTabTitle,
  onCancelEditTab,
  groupWorkspaceId,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { setNodeRef: setDroppableNodeRefForGroup, isOver: isGroupDropTargetOver } = useDroppable({
    id: `group-${groupWorkspaceId}-${title}`, // Ensure unique ID per workspace
    data: {
      type: 'group',
      groupName: title,
      groupWorkspaceId: groupWorkspaceId,
    }
  });

  return (
    <div className="border-b border-gray-700/50 last:border-b-0">
      <div
        className="flex items-center px-3 py-2 bg-gray-800/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="mr-2 text-gray-400 hover:text-gray-200">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <span className="text-sm font-medium text-gray-300">{title}</span>
        <span className="ml-2 text-xs text-gray-400">({tabs.length})</span>
      </div>

      {isExpanded && (
        <div ref={setDroppableNodeRefForGroup} className={`${isGroupDropTargetOver ? 'bg-blue-500/10 ring-1 ring-blue-400 rounded' : ''} py-1`}>
          {tabs.map(tab => (
            <DraggableTabItem
              key={tab.id}
              tab={tab}
              isSelected={selectedTabIds.has(tab.id)}
              isEditing={editingTabId === tab.id}
              onSelect={onSelectTab}
              onDoubleClick={onDoubleClickTab}
              onStartEdit={onStartEditTab}
              onSaveTitle={onSaveTabTitle}
              onCancelEdit={onCancelEditTab}
              depth={1}
            />
          ))}
           {tabs.length === 0 && (
             <div className="h-8 flex items-center justify-center text-xs text-gray-500 italic">
                Drop tabs here
             </div>
           )}
        </div>
      )}
    </div>
  );
};

interface DraggableTabItemProps {
  tab: Tab;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (tabId: string, multiSelect: boolean) => void;
  onDoubleClick: (tabId: string) => void;
  onStartEdit: (tabId: string) => void;
  onSaveTitle: (tabId: string, newTitle: string) => void;
  onCancelEdit: (tabId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  hasChildren?: boolean;
  depth?: number;
  isDraggingOverlay?: boolean;
}

const DraggableTabItem: React.FC<DraggableTabItemProps> = ({
  tab,
  isSelected,
  isEditing,
  onSelect,
  onDoubleClick,
  onStartEdit,
  onSaveTitle,
  onCancelEdit,
  isExpanded,
  onToggleExpand,
  hasChildren,
  depth = 0,
  isDraggingOverlay = false, // Default to false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: tab.id,
    disabled: tab.isPinned,
    data: {
      type: 'tab',
      tab,
    }
  });

  const { setNodeRef: setDroppableNodeRef, isOver: isDropTargetOver } = useDroppable({
    id: tab.id,
    data: {
      type: 'tab',
      tab: tab,
      workspaceId: tab.workspaceId, // Add workspaceId for context
    }
  });

  const combinedNodeRef = useCallback((node: HTMLDivElement | null) => {
    setDraggableNodeRef(node);
    setDroppableNodeRef(node);
  }, [setDraggableNodeRef, setDroppableNodeRef]);

  const style = transform && !isDraggingOverlay ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0 : 1,
  } : {
    opacity: isDragging && !isDraggingOverlay ? 0 : 1,
  };

  const [editingTitle, setEditingTitle] = useState(tab.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!isEditing) { setEditingTitle(tab.title); } }, [tab.title, isEditing]);
  useEffect(() => { if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [isEditing]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => setEditingTitle(e.target.value);
  const handleSave = () => {
    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle && trimmedTitle !== tab.title) onSaveTitle(tab.id, trimmedTitle);
    else onCancelEdit(tab.id);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') { setEditingTitle(tab.title); onCancelEdit(tab.id); }
  };
  const getLanguageLabel = () => tab.isTablet ? 'Tablet' : (languageRegistry.getById(tab.language)?.name || tab.language);

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

  const getTooltipText = () => {
    if (tab.isTablet) {
      return `${tab.title}\nType: Tablet\nLast Modified: ${new Date(tab.lastModified).toLocaleString()}`;
    }
    const firstLines = tab.content.split('\n').slice(0, 5).join('\n'); // Show first 5 lines for brevity
    const moreLinesIndicator = tab.content.split('\n').length > 5 ? "\n..." : "";
    return `${tab.title}\nType: ${getLanguageLabel()}\nLast Modified: ${new Date(tab.lastModified).toLocaleString()}\n\n${firstLines}${moreLinesIndicator}`;
  };

  const indentPadding = depth * 16;

  return (
    <div
      ref={combinedNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group flex items-center px-3 py-1.5 cursor-pointer
                  ${isSelected ? 'bg-blue-500/20' : 'hover:bg-gray-700/50'}
                  ${isDropTargetOver && !isDragging ? 'ring-1 ring-inset ring-blue-400 bg-blue-500/5' : ''}
                  ${isDragging && !isDraggingOverlay ? 'opacity-50' : ''}
                  ${isDraggingOverlay ? 'bg-gray-700 shadow-xl !opacity-100' : ''} {/* Ensure overlay item is opaque */}
                `}
      onClick={(e) => { if (!isEditing) onSelect(tab.id, e.ctrlKey || e.metaKey); }}
      onDoubleClick={() => { if (!isEditing) onDoubleClick(tab.id); }}
      title={getTooltipText()}
    >
      <div style={{ paddingLeft: `${indentPadding}px` }} className="flex items-center flex-1 min-w-0">
        {hasChildren && (
          <button onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }} className="mr-1 text-gray-400 hover:text-gray-200 flex-shrink-0">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        {!hasChildren && depth > 0 && <div className="w-5 flex-shrink-0"></div>}
        {tab.isPinned && <Pin size={12} className="text-yellow-400 mr-1.5 flex-shrink-0" />}
        <div className="flex-1 truncate mr-2">
          {isEditing ? (
            <input
              ref={inputRef} type="text" value={editingTitle} onChange={handleTitleChange}
              onKeyDown={handleKeyDown} onBlur={handleSave} onClick={(e) => e.stopPropagation()}
              className="w-full bg-gray-700 border border-blue-500 rounded px-1 py-0.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          ) : (
            <span className={`text-sm ${isSelected ? 'text-blue-300' : 'text-gray-100'}`}>{tab.title || 'Untitled'}</span>
          )}
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {!isEditing && (
                <button onClick={(e) => { e.stopPropagation(); onStartEdit(tab.id); }} className="p-0.5 text-gray-400 hover:text-blue-300 hover:bg-gray-600/50 rounded" title="Rename Tab">
                    <Edit size={12} />
                </button>
            )}
        </div>
        <div className={`text-xs px-2 py-0.5 rounded ${getLanguageColor()} ml-2 flex-shrink-0`}>
            {getLanguageLabel()}
        </div>
        
        {/* Add a container for the timestamp and split view indicator */}
        <div className="flex items-center ml-2 text-xs text-gray-500 flex-shrink-0">
          {/* Last modified timestamp */}
          <span className="mr-2">
            {getRelativeTimeString(tab.lastModified)}
          </span>
          
          {/* Split view position indicator */}
          {useSplitViewStore.getState().splitView.isSplit && (
            <span className={`px-1.5 py-0.5 rounded ${
              useSplitViewStore.getState().splitView.leftTabs.includes(tab.id) 
                ? 'bg-blue-900/30 text-blue-300' 
                : 'bg-purple-900/30 text-purple-300'
            }`}>
              {useSplitViewStore.getState().splitView.leftTabs.includes(tab.id) ? 'Left' : 'Right'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface Workspace {
  id: string;
  name: string;
  tabCount: number;
}

interface DroppableWorkspaceItemProps {
  workspace: Workspace;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  activeWorkspaceId: string | null;
}

const DroppableWorkspaceItem: React.FC<DroppableWorkspaceItemProps> = ({
  workspace,
  isActive,
  onSelect,
  onRename,
  onDelete,
  activeWorkspaceId
}) => {
  const droppableId = `workspace-${workspace.id}`;
  
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { 
      type: 'workspace', 
      workspaceId: workspace.id,
      isActiveWorkspace: workspace.id === activeWorkspaceId 
    }
  });

  return (
    <div 
      ref={setNodeRef}
      data-workspace-id={workspace.id}
      className={`relative flex items-center justify-between px-3 py-1.5 cursor-pointer 
        ${isActive ? 'bg-blue-500/20' : 'hover:bg-gray-700/50'} 
        ${isOver ? 'bg-green-500/40 ring-2 ring-inset ring-green-500' : ''}`}
      onClick={onSelect}
      style={{ 
        transition: 'background-color 0.2s, box-shadow 0.2s',
        position: 'relative'
      }}
    >
      <div className="flex items-center relative z-10">
        <Folder size={16} className={`mr-2 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
        <span className={`text-sm ${isActive ? 'text-blue-300' : 'text-gray-100'}`}>
          {workspace.name}
        </span>
        <span className="ml-2 text-xs text-gray-400">({workspace.tabCount === -1 ? '...' : workspace.tabCount})</span>
      </div>
      
      <div className="flex items-center space-x-1 relative z-10">
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
  const { removeTab, updateTabTitle, toggleTabPin, duplicateTab, updateTabTitle: updateTabTitleInStore } = useRootStore();
  const {
    workspaces,
    activeWorkspaceId,
    switchWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace
  } = useWorkspaceStore();
  const activeWorkspaceTabs = useRootStore(state =>
    state.tabs.filter(tab => tab.workspaceId === activeWorkspaceId)
  );
  const storage = StorageProviderFactory.getProvider();
  const [allApplicationTabs, setAllApplicationTabs] = useState<Tab[]>([]);
  const [isLoadingAllTabs, setIsLoadingAllTabs] = useState(false);
  const [editingTabIdForModal, setEditingTabIdForModal] = useState<string | null>(null);

  // Local state
  const [selectedTabIds, setSelectedTabIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('current');
  const [groupOption, setGroupOption] = useState<GroupOption>('none');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState('');
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const [mergeDelimiter, setMergeDelimiter] = useState('\n\n');
  const [showRenameOptions, setShowRenameOptions] = useState(false);
  const [renameBasePattern, setRenameBasePattern] = useState('');
  const [renameSuffixPattern, setRenameSuffixPattern] = useState(' {d}');
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [isInternalActionInProgress, setIsInternalActionInProgress] = useState(false);
  const { switchWorkspace: switchWorkspaceFromStore } = useWorkspaceStore();
  const { setActiveLeftTab, setActiveRightTab } = useSplitViewStore.getState();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [draggedTabIds, setDraggedTabIds] = useState<Set<string>>(new Set());
  const [activeDragItemData, setActiveDragItemData] = useState<Tab | null>(null); // For DragOverlay content

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

  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

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
    activeWorkspaceTabs.forEach(tab => {
      if (tab.isTablet) {
        languages.add('tablet');
      } else {
        languages.add(tab.language);
      }
    });
    return Array.from(languages).sort();
  }, [activeWorkspaceTabs]);

  // --- Fetch ALL tabs when modal opens or workspaces change ---
  useEffect(() => {
    if (isOpen) {
      setIsLoadingAllTabs(true);
      storage.getTabs()
        .then(fetchedTabs => {
          setAllApplicationTabs(fetchedTabs);
        })
        .catch(err => {
          console.error("Failed to fetch all tabs for management modal:", err);
          // Handle error appropriately, maybe set an error state
        })
        .finally(() => {
          setIsLoadingAllTabs(false);
        });
    }
  }, [isOpen, storage]); // Re-fetch if storage instance could change (unlikely)

  // Get workspace tab counts using allApplicationTabs
  const workspacesWithCounts = useMemo(() => {
    // If still loading all tabs, you might show a loading state or previous counts
    if (isLoadingAllTabs) {
        return workspaces.map(ws => ({...ws, tabCount: 0, isLoadingCount: true})); // Indicate loading
    }
    return workspaces.map(workspace => {
      const tabCount = allApplicationTabs.filter(tab => tab.workspaceId === workspace.id).length;
      return { ...workspace, tabCount, isLoadingCount: false };
    });
  }, [workspaces, allApplicationTabs, isLoadingAllTabs]);

  // Filter and sort tabs (uses activeWorkspaceTabs from rootStore for display)
  const filteredTabs = useMemo(() => {
    let result = [...activeWorkspaceTabs]; // Start with tabs from the currently active workspace

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
      case 'current':
        // Get the current order from the root store
        const { splitView } = useSplitViewStore.getState();
        const currentOrder = [...splitView.leftTabs, ...splitView.rightTabs];
        
        // Create a map of tab positions for quick lookup
        const positionMap = new Map(currentOrder.map((id, index) => [id, index]));
        
        // Sort based on current positions, keeping pinned tabs at the front
        result.sort((a, b) => {
          // Keep pinned tabs at the front
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          
          // For non-pinned tabs, sort by their current position
          const posA = positionMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const posB = positionMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          return posA - posB;
        });
        break;
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
  }, [activeWorkspaceTabs, activeWorkspaceId, searchQuery, languageFilter, sortOption]);

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
    // Use activeWorkspaceTabs for finding duplicates *within the current view*
    const currentViewTabs = activeWorkspaceTabs.filter(tab => tab.workspaceId === activeWorkspaceId);

    currentViewTabs.forEach(tab => {
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
  }, [activeWorkspaceTabs, activeWorkspaceId]);

  const handleStartEditingTab = (tabId: string) => {
    setEditingTabIdForModal(tabId);
  };

  const handleSaveTabTitle = (tabId: string, newTitle: string) => {
    updateTabTitleInStore(tabId, newTitle);
    setEditingTabIdForModal(null);
  };

  const handleCancelEditingTab = () => {
    setEditingTabIdForModal(null);
  };

  const handleApplyCurrentOrder = (eventOrTabs: React.MouseEvent<HTMLButtonElement> | Tab[]) => {
    // If it's a mouse event, use the current filtered tabs
    const newOrder = Array.isArray(eventOrTabs) ? eventOrTabs : filteredTabs;
    
    // Get the current split view state
    const { splitView } = useSplitViewStore.getState();
    const { updateTabOrder } = useRootStore.getState();
    const { setActiveSide } = useSplitViewStore.getState();
    
    // Create sets to track which tabs belong to which side
    const leftTabSet = new Set(splitView.leftTabs);
    
    // Initialize arrays for pinned and unpinned tabs on each side
    const leftPinnedTabs: string[] = [];
    const leftUnpinnedTabs: string[] = [];
    const rightPinnedTabs: string[] = [];
    const rightUnpinnedTabs: string[] = [];
    
    // Distribute tabs based on their original side and pinned status
    newOrder.forEach(tab => {
      if (leftTabSet.has(tab.id)) {
        if (tab.isPinned) {
          leftPinnedTabs.push(tab.id);
        } else {
          leftUnpinnedTabs.push(tab.id);
        }
      } else {
        if (tab.isPinned) {
          rightPinnedTabs.push(tab.id);
        } else {
          rightUnpinnedTabs.push(tab.id);
        }
      }
    });
    
    // Combine pinned and unpinned tabs for each side
    const newLeftTabs = [...leftPinnedTabs, ...leftUnpinnedTabs];
    const newRightTabs = [...rightPinnedTabs, ...rightUnpinnedTabs];
    
    // Update the tab order while preserving the split view
    updateTabOrder(newLeftTabs, newRightTabs);
    
    // Set active tabs if they exist in the new arrays
    const activeLeftTab = newLeftTabs.find(id => id === splitView.activeLeftTabId);
    const activeRightTab = newRightTabs.find(id => id === splitView.activeRightTabId);
    
    if (activeLeftTab) {
      setActiveLeftTab(activeLeftTab);
    } else if (newLeftTabs.length > 0) {
      setActiveLeftTab(newLeftTabs[0]);
    }
    
    if (activeRightTab) {
      setActiveRightTab(activeRightTab);
    } else if (newRightTabs.length > 0) {
      setActiveRightTab(newRightTabs[0]);
    }
    
    // Preserve the active side
    if (splitView.activeSide) {
      setActiveSide(splitView.activeSide);
    }
    // Set sort option to 'current' after applying
    setSortOption('current');
  };

  // Custom useClickOutside hook that respects the internal action flag
    const useModalClickOutside = (
      ref: React.RefObject<HTMLElement>,
      modalOpenFlag: boolean, // Pass the modal's isOpen state
      internalActionFlag: boolean, // Pass the isInternalActionInProgress state
      handler: (event: MouseEvent | TouchEvent) => void
    ) => {
      useEffect(() => {
        if (!modalOpenFlag) return; // Only attach listener if modal is open

        const listener = (event: MouseEvent | TouchEvent) => {
          if (internalActionFlag) { // If an internal action is marked, ignore this click
            return;
          }
          if (!ref.current || ref.current.contains(event.target as Node)) {
            return; // Click was inside the ref
          }
          handler(event); // Click was outside
        };

        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
          document.removeEventListener("mousedown", listener);
          document.removeEventListener("touchstart", listener);
        };
        // Re-attach if modalOpenFlag, internalActionFlag, ref, or handler changes
      }, [ref, modalOpenFlag, internalActionFlag, handler]);
    };

  // Apply the custom click outside hook
  useModalClickOutside(modalContentRef, isOpen, isInternalActionInProgress, () => {
    if (!confirmationDialog.isOpen) { // Only close if no confirmation is active
        onClose();
    }
  });

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
    const tab = activeWorkspaceTabs.find(t => t.id === tabId);
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

  const handleTogglePinSelectedTabs = () => { // Renamed for clarity
    if (selectedTabIds.size === 0) return;
    
    // Determine if we are pinning or unpinning based on the first selected tab's current state
    // This helps if multiple tabs with mixed pinned states are selected.
    // A more sophisticated approach might allow pinning all or unpinning all regardless.
    let actionIsPin = false;
    const firstSelectedTabId = Array.from(selectedTabIds)[0];
    const firstTab = activeWorkspaceTabs.find(t => t.id === firstSelectedTabId);
    if (firstTab) {
        actionIsPin = !firstTab.isPinned;
    }

    selectedTabIds.forEach(id => {
        // Only toggle if the action aligns or if it's a single selection
        const tab = activeWorkspaceTabs.find(t => t.id === id);
        if (tab) {
            if (selectedTabIds.size === 1 || (actionIsPin && !tab.isPinned) || (!actionIsPin && tab.isPinned)) {
                 toggleTabPin(id);
            }
        }
    });
    // The rootStore's subscription should cause activeWorkspaceTabs to update,
    // which in turn should re-trigger useMemo for filteredTabs/groupedTabs.
  };

  const handleDuplicateTabs = () => {
    if (selectedTabIds.size === 0) return;
    
    // Simply duplicate all selected tabs with "(copy)" suffix
    const selectedTabs = activeWorkspaceTabs.filter(tab => selectedTabIds.has(tab.id));
    
    selectedTabs.forEach(tab => {
      const newTabId = duplicateTab(tab.id, false);
      const newTitle = `${tab.title} (copy)`;
      updateTabTitle(newTabId, newTitle);
    });
    
    // Clear selection after duplication
    setSelectedTabIds(new Set());
  };

  const handleBulkRename = () => {
    if (selectedTabIds.size === 0 || !renameBasePattern.trim()) return;
    
    const selectedTabs = activeWorkspaceTabs.filter(tab => selectedTabIds.has(tab.id));
    
    selectedTabs.forEach((tab, index) => {
      // Replace {d} in the suffix with the tab's index+1
      const suffix = renameSuffixPattern.replace('{d}', (index + 1).toString());
      const newTitle = renameBasePattern.trim() + suffix;
      updateTabTitle(tab.id, newTitle);
    });
    
    setShowRenameOptions(false);
    setRenameBasePattern('');
    // Keep the suffix pattern for next time
    
    // Clear selection after renaming
    setSelectedTabIds(new Set());
  };

  const handleMergeTabs = () => {
    if (selectedTabIds.size < 2) return;
    
    const selectedTabs = activeWorkspaceTabs.filter(tab => selectedTabIds.has(tab.id));
    
    // Check if all selected tabs are text-based (not tablets)
    const allTextBased = selectedTabs.every(tab => !tab.isTablet);
    
    if (!allTextBased) {
      alert('Only text-based tabs can be merged. Please deselect any tablet tabs.');
      return;
    }
    
    // Sort tabs by title before merging
    const sortedTabs = [...selectedTabs].sort((a, b) => a.title.localeCompare(b.title));
    
    // Process the delimiter to handle escape sequences
    let processedDelimiter = mergeDelimiter;
    if (mergeDelimiter === '\\n\\n') {
      processedDelimiter = '\n\n';
    } else if (mergeDelimiter === '\\n') {
      processedDelimiter = '\n';
    } else if (mergeDelimiter === '\\n---\\n') {
      processedDelimiter = '\n---\n';
    }

    // Merge content with the specified delimiter
    const mergedContent = sortedTabs.map(tab => tab.content).join(processedDelimiter);
    
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
    
    // Delete the original tabs
    selectedTabIds.forEach(id => {
      removeTab(id);
    });
    
    setShowMergeOptions(false);
    setSelectedTabIds(new Set());
  };

  // Add this function before the handleMoveToWorkspace function
  const handleMoveToWorkspaceWithId = async (targetWorkspaceId: string, draggedIds: string[]) => {
    if (draggedIds.length === 0 || !targetWorkspaceId) {
      return;
    }

    try {
      setIsInternalActionInProgress(true);
      const { splitView } = useSplitViewStore.getState();
      const { updateTabOrder } = useRootStore.getState();

      // Remove tabs from current workspace's split view
      const newLeftTabs = splitView.leftTabs.filter(id => !draggedIds.includes(id));
      const newRightTabs = splitView.rightTabs.filter(id => !draggedIds.includes(id));

      updateTabOrder(newLeftTabs, newRightTabs);

      // Get target workspace's split view
      const targetSplitView = await storage.getSplitViewByWorkspace(targetWorkspaceId);

      // Add tabs to target workspace's split view (all to left side as requested)
      const updatedTargetSplitView = {
        id: targetSplitView?.id || crypto.randomUUID(),
        isSplit: targetSplitView?.isSplit || false,
        leftTabs: [...(targetSplitView?.leftTabs || []), ...draggedIds],
        rightTabs: targetSplitView?.rightTabs || [],
        activeLeftTabId: targetSplitView?.activeLeftTabId || null,
        activeRightTabId: targetSplitView?.activeRightTabId || null,
        activeSide: targetSplitView?.activeSide || 'left',
        splitRatio: targetSplitView?.splitRatio || 0.5,
        workspaceId: targetWorkspaceId,
        lastModified: Date.now()
      };

      await storage.saveSplitView(updatedTargetSplitView);

      // Persist changes for each moved tab individually for safety
      for (const tabId of draggedIds) {
        const tabToUpdate = allApplicationTabs.find(t => t.id === tabId);
        if (tabToUpdate) {
          await storage.saveTab({ ...tabToUpdate, workspaceId: targetWorkspaceId, lastModified: Date.now() });
        }
      }

      // Refresh the list of all tabs in this modal
      const refreshedAllTabs = await storage.getTabs();
      setAllApplicationTabs(refreshedAllTabs);

      // Trigger a reload of the active workspace's tabs in the main UI
      if (activeWorkspaceId) {
        await switchWorkspace(activeWorkspaceId);
      }
    } catch (error) {
      console.error('[MoveToWorkspace] Failed to move tabs:', error);
    } finally {
      setIsInternalActionInProgress(false);
    }
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

  // Reset selected tabs when switching workspaces
  useEffect(() => {
    setSelectedTabIds(new Set());
  }, [activeWorkspaceId]);

  const handleSwitchWorkspaceAndKeepModal = async (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) { // Use activeWorkspaceId from workspaceStore
        return;
    }

    // Set the flag before any async operations
    setIsInternalActionInProgress(true);
    
    try {
      await switchWorkspaceFromStore(workspaceId);
      setSelectedTabIds(new Set());
    } catch (error) {
      console.error("Error switching workspace from modal:", error);
    } finally {
      // Use requestAnimationFrame to ensure this runs after the current event cycle completes
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsInternalActionInProgress(false);
        }, 100); // Add a small delay to ensure event bubbling is complete
      });
    }
  };

  // The BaseModal's onClose should be simple
  const handleBaseModalClose = () => {
      if (!isInternalActionInProgress) { // Only close if no internal action is flagged
          onClose();
      }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const tabId = active.id as string;
    const draggedTab = allApplicationTabs.find(t => t.id === tabId);
    
    setActiveDragId(tabId);
    setActiveDragItemData(draggedTab || null);
    
    const newDraggedIds = selectedTabIds.has(tabId) ? selectedTabIds : new Set([tabId]);
    setDraggedTabIds(newDraggedIds);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    setActiveDragId(null);

    if (!over) {
      setDraggedTabIds(new Set());
      return;
    }

    const overId = over.id as string;
    const overData = over.data.current;
    const overDataType = overData?.type as string | undefined;
    const draggedTabIdsToMove = Array.from(draggedTabIds);

    if (overDataType === 'workspace' && overData?.workspaceId) {
      const targetWorkspaceId = overData.workspaceId as string;
      if (targetWorkspaceId && targetWorkspaceId !== activeWorkspaceId) {
        handleMoveToWorkspaceWithId(targetWorkspaceId, draggedTabIdsToMove);
      } else if (targetWorkspaceId === activeWorkspaceId) {
        // Dropped on current workspace item - move to end of current list
        const itemsToMove = filteredTabs.filter(tab => draggedTabIdsToMove.includes(tab.id));
        const otherItemsInCurrentWorkspace = filteredTabs.filter(tab => !draggedTabIdsToMove.includes(tab.id));
        const finalNewOrderInCurrentWorkspace = [...otherItemsInCurrentWorkspace, ...itemsToMove];
        handleApplyCurrentOrder(finalNewOrderInCurrentWorkspace);
      }
    } else if (overDataType === 'tab' || overDataType === 'group') {
      const targetItemWorkspaceId = overDataType === 'tab' ? overData?.tab?.workspaceId : overData?.groupWorkspaceId;
      if (targetItemWorkspaceId === activeWorkspaceId) {
        // Reordering within the current workspace
        const itemsToMove = filteredTabs.filter(tab => draggedTabIdsToMove.includes(tab.id));
        const currentWorkspaceFilteredTabs = filteredTabs.filter(t => t.workspaceId === activeWorkspaceId);
        const otherItemsInCurrentWorkspace = currentWorkspaceFilteredTabs.filter(tab => !draggedTabIdsToMove.includes(tab.id));

        let finalNewOrderInCurrentWorkspace: Tab[];
        const targetIndexInOthers = otherItemsInCurrentWorkspace.findIndex(tab => tab.id === overId);

        if (targetIndexInOthers !== -1) { // Dropped on a specific tab
          finalNewOrderInCurrentWorkspace = [
            ...otherItemsInCurrentWorkspace.slice(0, targetIndexInOthers),
            ...itemsToMove,
            ...otherItemsInCurrentWorkspace.slice(targetIndexInOthers)
          ];
        } else { // Dropped on a group area or end of list
          finalNewOrderInCurrentWorkspace = [...otherItemsInCurrentWorkspace, ...itemsToMove];
        }
        handleApplyCurrentOrder(finalNewOrderInCurrentWorkspace);
      }
    }
    
    setDraggedTabIds(new Set());
  };

  if (!isOpen && !isInternalActionInProgress) return null; // Keep modal structure if internal action is happening
  if (!isOpen && isInternalActionInProgress) {
      // If modal was supposed to close but an internal action is flagged,
      // it might mean the onClose was called prematurely. Log this.
      console.warn("TabManagementModal: onClose was called while internal action was in progress. Investigate.");
      // Potentially force close after a delay if the flag isn't reset:
      // setTimeout(() => { if (isInternalActionInProgress) onClose(); }, 200);
  }

  return (
    <BaseModal title="Tab Management" onClose={handleBaseModalClose} maxWidthClass="max-w-6xl" maxHeightClass="max-h-[90vh]">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        // Consider adding collisionDetection strategy if needed:
        // collisionDetection={closestCenter}
      >
        <div ref={modalContentRef} className="flex h-[70vh]">
           {/* Left sidebar - Workspaces */}
           <div className="w-64 border-r border-gray-700/50 flex flex-col">
            <div className="p-3 border-b border-gray-700/50"> {/* Header for workspace section */}
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
            <WorkspaceSidebar
              workspaces={workspacesWithCounts}
              activeWorkspaceId={activeWorkspaceId}
              onSelect={handleSwitchWorkspaceAndKeepModal}
              onRename={(id) => {
                setEditingWorkspaceId(id);
                const workspace = workspaces.find(w => w.id === id);
                if (workspace) {
                  setEditingWorkspaceName(workspace.name);
                }
              }}
              onDelete={handleDeleteWorkspace}
            />
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
                    value={languageFilter[0] || ''}
                    onChange={(e) => {
                      const selectedLang = e.target.value;
                      // If "All Languages" is selected (empty value), set to empty array
                     setLanguageFilter(selectedLang ? [selectedLang] : []);
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
                    <option value="current">Current</option>
                    <option value="title-asc">Title A-Z</option>
                    <option value="title-desc">Title Z-A</option>
                    <option value="created-asc">Newest First</option>
                    <option value="created-desc">Oldest First</option>
                    <option value="modified-asc">Recently Modified</option>
                    <option value="modified-desc">Least Recently Modified</option>
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
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleSelectAll}
                        className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-300"
                      >
                        Select All
                      </button>
                      {sortOption !== 'current' && (
                        <button
                          onClick={handleApplyCurrentOrder}
                          className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-300"
                        >
                          Apply Current Order
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Bulk actions */}
                {selectedTabIds.size > 0 && activeWorkspaceTabs.some(tab => selectedTabIds.has(tab.id) && tab.workspaceId === activeWorkspaceId) && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleTogglePinSelectedTabs}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-colors"
                      title="Toggle pin status for selected"
                    >
                      <Pin size={14} className="text-gray-400" />
                      <span>Toggle Pin</span>
                    </button>
                    
                    <button
                      onClick={handleDuplicateTabs}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-colors"
                      title="Duplicate selected tabs with (copy) suffix"
                    >
                      <Copy size={14} className="text-gray-400" />
                      <span>Duplicate</span>
                    </button>
                    
                    {selectedTabIds.size >= 2 && (
                      <div className="relative">
                        <button
                          onClick={() => setShowRenameOptions(!showRenameOptions)}
                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-colors"
                          title="Rename selected tabs with pattern"
                        >
                          <Edit size={14} className="text-gray-400" />
                          <span>Rename</span>
                        </button>
                        
                        {showRenameOptions && (
                          <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 p-3 w-64">
                            <div className="text-xs text-gray-300 mb-2">Base Name</div>
                            <input
                              type="text"
                              value={renameBasePattern}
                              onChange={(e) => setRenameBasePattern(e.target.value)}
                              placeholder="e.g. My Tab"
                              className="w-full bg-gray-700/50 border border-gray-600/50 rounded px-2 py-1 text-sm text-gray-200 mb-2"
                            />
                            
                            <div className="text-xs text-gray-300 mb-2">Suffix Pattern</div>
                            <input
                              type="text"
                              value={renameSuffixPattern}
                              onChange={(e) => setRenameSuffixPattern(e.target.value)}
                              placeholder=" {d}"
                              className="w-full bg-gray-700/50 border border-gray-600/50 rounded px-2 py-1 text-sm text-gray-200 mb-2"
                            />
                            
                            <div className="text-xs text-gray-500 mb-3">
                              The {'{d}'} placeholder will be replaced with the tab number
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setShowRenameOptions(false)}
                                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleBulkRename}
                                disabled={!renameBasePattern.trim()}
                                className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 disabled:opacity-50"
                              >
                                Rename
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
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
                      key={`${activeWorkspaceId}-${groupName}`} // Ensure key is unique if groupName can repeat across workspaces
                      title={groupName}
                      tabs={groupTabs}
                      selectedTabIds={selectedTabIds}
                      onSelectTab={handleSelectTab}
                      onDoubleClickTab={handleDoubleClickTab}
                      editingTabId={editingTabIdForModal}
                      onStartEditTab={handleStartEditingTab}
                      onSaveTabTitle={handleSaveTabTitle}
                      onCancelEditTab={handleCancelEditingTab}
                      groupWorkspaceId={activeWorkspaceId!}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragId && activeDragItemData && (
            <div className="pointer-events-none">
              {draggedTabIds.size === 1 ? (
                // Compact representation for single tab
                <div className="bg-gray-800 text-gray-200 text-xs px-3 py-1.5 rounded-md shadow-lg border border-gray-700 inline-block">
                  {activeDragItemData.title}
                </div>
              ) : (
                // Compact representation for multiple tabs
                <div className="bg-gray-800 text-gray-200 text-xs px-3 py-1.5 rounded-md shadow-lg border border-gray-700 inline-block">
                  {draggedTabIds.size} tabs
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      
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

type SortOption = 'current' | 'title-asc' | 'title-desc' | 'created-asc' | 'created-desc' | 'modified-asc' | 'modified-desc' | 'language';
type GroupOption = 'none' | 'language';

interface WorkspaceSidebarProps {
  workspaces: Array<Workspace & { tabCount: number; isLoadingCount?: boolean }>;
  activeWorkspaceId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  workspaces, 
  activeWorkspaceId, 
  onSelect, 
  onRename, 
  onDelete
}) => {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {workspaces.map(workspace => (
        <DroppableWorkspaceItem
          key={workspace.id}
          workspace={workspace}
          isActive={workspace.id === activeWorkspaceId}
          activeWorkspaceId={activeWorkspaceId}
          onSelect={() => onSelect(workspace.id)}
          onRename={() => onRename(workspace.id)}
          onDelete={() => onDelete(workspace.id)}
        />
      ))}
    </div>
  );
};