import React, { useCallback, useEffect, useRef, useState } from "react";
import { Edit, Pin, ChevronDown, ChevronRight } from "lucide-react";
import { useSplitViewStore } from "../../../stores/splitViewStore";
import { useTabsStore } from "../../../stores/tabsStore";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Tab } from "../../../types";
import { languageRegistry } from "../../../languages";
import { getRelativeTimeString } from "./helpers";

export interface DraggableTabItemProps {
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

export const DraggableTabItem: React.FC<DraggableTabItemProps> = ({
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
  // Count tabs in the same workspace to determine if this is the only tab
  const allApplicationTabs = useTabsStore((state) => {
    const tabs = state.tabs;
    return tabs;
  });
  const tabsInSameWorkspace = allApplicationTabs.filter(
    (t: Tab) => t.workspaceId === tab.workspaceId,
  );
  const isOnlyTabInWorkspace = tabsInSameWorkspace.length === 1;

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: tab.id,
    disabled: tab.isPinned || isOnlyTabInWorkspace, // Disable dragging if it's the only tab in workspace
    data: {
      type: "tab",
      tab,
      isOnlyTabInWorkspace,
    },
  });

  const { setNodeRef: setDroppableNodeRef, isOver: isDropTargetOver } =
    useDroppable({
      id: tab.id,
      data: {
        type: "tab",
        tab: tab,
        workspaceId: tab.workspaceId, // Add workspaceId for context
      },
    });

  const combinedNodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      setDraggableNodeRef(node);
      setDroppableNodeRef(node);
    },
    [setDraggableNodeRef, setDroppableNodeRef],
  );

  const style =
    transform && !isDraggingOverlay
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          zIndex: isDragging ? 1000 : "auto",
          opacity: isDragging ? 0 : 1,
        }
      : {
          opacity: isDragging && !isDraggingOverlay ? 0 : 1,
        };

  const [editingTitle, setEditingTitle] = useState(tab.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditingTitle(tab.title);
    }
  }, [tab.title, isEditing]);
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditingTitle(e.target.value);
  const handleSave = () => {
    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle && trimmedTitle !== tab.title)
      onSaveTitle(tab.id, trimmedTitle);
    else onCancelEdit(tab.id);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSave();
    else if (e.key === "Escape") {
      setEditingTitle(tab.title);
      onCancelEdit(tab.id);
    }
  };
  const getLanguageLabel = () =>
    tab.isTablet
      ? "Tablet"
      : languageRegistry.getById(tab.language)?.name || tab.language;

  const getLanguageColor = () => {
    if (tab.isTablet) return "bg-purple-500/20 text-purple-300";

    switch (tab.language) {
      case "javascript":
        return "bg-yellow-500/20 text-yellow-300";
      case "typescript":
        return "bg-blue-500/20 text-blue-300";
      case "json":
        return "bg-green-500/20 text-green-300";
      case "html":
        return "bg-orange-500/20 text-orange-300";
      case "css":
        return "bg-pink-500/20 text-pink-300";
      case "markdown":
        return "bg-indigo-500/20 text-indigo-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  const getTooltipText = () => {
    if (tab.isTablet) {
      return `${tab.title}\nType: Tablet\nLast Modified: ${new Date(tab.lastModified).toLocaleString()}`;
    }
    const content = tab.content || "";
    const firstLines = content.split("\n").slice(0, 5).join("\n"); // Show first 5 lines for brevity
    const moreLinesIndicator = content.split("\n").length > 5 ? "\n..." : "";
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
                  ${isSelected ? "bg-blue-500/20" : "hover:bg-gray-700/50"}
                  ${isDropTargetOver && !isDragging ? "ring-1 ring-inset ring-blue-400 bg-blue-500/5" : ""}
                  ${isDragging && !isDraggingOverlay ? "opacity-50" : ""}
                  ${isDraggingOverlay ? "bg-gray-700 shadow-xl !opacity-100" : ""} {/* Ensure overlay item is opaque */}
                `}
      onClick={(e) => {
        if (!isEditing) onSelect(tab.id, e.ctrlKey || e.metaKey);
      }}
      onDoubleClick={() => {
        if (!isEditing) onDoubleClick(tab.id);
      }}
      title={getTooltipText()}
    >
      <div
        style={{ paddingLeft: `${indentPadding}px` }}
        className="flex items-center flex-1 min-w-0"
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
            className="mr-1 text-gray-400 hover:text-gray-200 flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        )}
        {!hasChildren && depth > 0 && <div className="w-5 flex-shrink-0"></div>}
        {tab.isPinned && (
          <Pin size={12} className="text-yellow-400 mr-1.5 flex-shrink-0" />
        )}
        <div className="flex-1 truncate mr-2">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editingTitle}
              onChange={handleTitleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-gray-700 border border-blue-500 rounded px-1 py-0.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          ) : (
            <span
              className={`text-sm ${isSelected ? "text-blue-300" : "text-gray-100"}`}
            >
              {tab.title || "Untitled"}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {!isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit(tab.id);
              }}
              className="p-0.5 text-gray-400 hover:text-blue-300 hover:bg-gray-600/50 rounded"
              title="Rename Tab"
            >
              <Edit size={12} />
            </button>
          )}
        </div>
        <div
          className={`text-xs px-2 py-0.5 rounded ${getLanguageColor()} ml-2 flex-shrink-0`}
        >
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
            <span
              className={`px-1.5 py-0.5 rounded ${
                useSplitViewStore.getState().splitView.leftTabs.includes(tab.id)
                  ? "bg-blue-900/30 text-blue-300"
                  : "bg-purple-900/30 text-purple-300"
              }`}
            >
              {useSplitViewStore.getState().splitView.leftTabs.includes(tab.id)
                ? "Left"
                : "Right"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
