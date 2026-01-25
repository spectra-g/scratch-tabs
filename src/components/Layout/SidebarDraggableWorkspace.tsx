import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Folder, FolderOpen, ChevronDown, ChevronRight } from "../Icons";
import { clsx } from "clsx";

export interface SidebarDraggableWorkspaceProps {
  id: string;
  name: string;
  isExpanded: boolean;
  isActive: boolean;
  tabCount: number;
  isSwitching: boolean;
  isVisuallyExpanded: boolean;
  style?: React.CSSProperties;
  onClick: () => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const SidebarDraggableWorkspace: React.FC<SidebarDraggableWorkspaceProps> = ({
  id,
  name,
  isExpanded,
  isActive,
  tabCount,
  isSwitching,
  isVisuallyExpanded,
  style: externalStyle,
  onClick,
  onDoubleClick,
  onContextMenu,
}) => {
  // Setup droppable zone for tabs
  const { setNodeRef, isOver } = useDroppable({
    id: `workspace-drop-${id}`,
    data: {
      type: "workspace",
      workspaceId: id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={externalStyle}
      className={clsx(
        "flex items-center px-2 cursor-pointer hover:bg-element-hover group select-none",
        isActive ? "text-main font-semibold border-l-2 border-primary" : "text-secondary",
        isSwitching && "bg-primary-subtle animate-pulse",
        isOver && "ring-1 ring-inset ring-blue-400 bg-primary/5"
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      data-testid={`sidebar-workspace-${id}`}
      aria-expanded={isExpanded}
      aria-selected={isActive}
    >
      <span className="mr-1 pointer-events-none" data-testid={`sidebar-workspace-${id}-expand`}>
        {isVisuallyExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </span>
      <span className="mr-2 pointer-events-none">
        {isVisuallyExpanded ? (
          <FolderOpen size={16} className={isActive ? "text-primary" : ""} />
        ) : (
          <Folder size={16} className={isActive ? "text-primary" : ""} />
        )}
      </span>
      <span className="flex-1 truncate text-sm pointer-events-none">
        {name}
        {isSwitching && <span className="ml-2 text-xs opacity-70">Switching...</span>}
      </span>
      <span
        className="text-[10px] opacity-50 px-1.5 py-0.5 rounded-full bg-surface-secondary pointer-events-none"
        data-testid={`sidebar-workspace-${id}-badge`}
      >
        {tabCount}
      </span>
    </div>
  );
};
