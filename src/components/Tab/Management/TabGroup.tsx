import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Tab } from "../../../types";
import { useDroppable } from "@dnd-kit/core";
import { DraggableTabItem } from "./DraggableTabItem";

export interface TabGroupProps {
  title: string;
  tabs: Tab[];
  selectedTabIds: Set<string>;
  onSelectTab: (tabId: string, multiSelect: boolean) => void;
  onDoubleClickTab: (tabId: string) => void;
  editingTabId: string | null;
  onStartEditTab: (tabId: string) => void;
  onSaveTabTitle: (tabId: string, newTitle: string) => void;
  onCancelEditTab: (tabId: string) => void;
  groupWorkspaceId: string; // Pass the workspace ID for this group
}

export const TabGroup: React.FC<TabGroupProps> = ({
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
  const {
    setNodeRef: setDroppableNodeRefForGroup,
    isOver: isGroupDropTargetOver,
  } = useDroppable({
    id: `group-${groupWorkspaceId}-${title}`, // Ensure unique ID per workspace
    data: {
      type: "group",
      groupName: title,
      groupWorkspaceId: groupWorkspaceId,
    },
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
        <div
          ref={setDroppableNodeRefForGroup}
          className={`${isGroupDropTargetOver ? "bg-blue-500/10 ring-1 ring-blue-400 rounded" : ""} py-1`}
        >
          {tabs.map((tab) => (
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
