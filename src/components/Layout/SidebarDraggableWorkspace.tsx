import React, { useCallback } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
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
  // Setup draggable for workspace reordering
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `workspace-${id}`,
    data: {
      type: "workspace",
      workspaceId: id,
    },
  });

  // Setup droppable (tabs dropped on workspace, OR workspace dropped on workspace)
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: `workspace-drop-${id}`,
    data: {
      type: "workspace",
      workspaceId: id,
    },
  });

  // Combine refs
  const combinedNodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      setDraggableNodeRef(node);
      setDroppableNodeRef(node);
    },
    [setDraggableNodeRef, setDroppableNodeRef]
  );

  // Combine styles
  const transformStyle = transform
    ? {
      transform: CSS.Translate.toString(transform),
      transition: "none",
      zIndex: 100,
    }
    : {};

  const combinedStyle: React.CSSProperties = {
    ...externalStyle,
    ...transformStyle,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={combinedNodeRef}
      style={combinedStyle}
      {...attributes}
      {...listeners}
      className={clsx(
        "flex items-center px-2 cursor-pointer hover:bg-element-hover group select-none",
        isActive ? "text-main font-semibold border-l-2 border-primary" : "text-secondary",
        isSwitching && "bg-primary-subtle animate-pulse",
        isOver && !isDragging && "ring-1 ring-inset ring-blue-400 bg-primary/5",
        isDragging && "scale-105 shadow-md bg-surface-highlight"
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
      <span className="mr-2 pointer-events-none text-secondary group-hover:text-main">
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
