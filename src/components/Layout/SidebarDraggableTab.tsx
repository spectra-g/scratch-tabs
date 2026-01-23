import React, { useCallback } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Pin, Calculator, Type, File, FileCode, FileText } from "../Icons";
import { clsx } from "clsx";

export interface SidebarDraggableTabProps {
  id: string;
  title: string;
  language: string;
  workspaceId: string;
  isActive: boolean;
  isPinned?: boolean;
  isTablet?: boolean;
  isRich?: boolean;
  style?: React.CSSProperties;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export const SidebarDraggableTab: React.FC<SidebarDraggableTabProps> = ({
  id,
  title,
  language,
  workspaceId,
  isActive,
  isPinned,
  isTablet,
  isRich,
  style: externalStyle,
  onClick,
  onContextMenu,
  disabled = false
}) => {
  // Setup draggable
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `tab-${id}`,
    disabled: disabled || isPinned,
    data: {
      type: "tab",
      tabId: id,
      workspaceId,
      isPinned,
    },
  });

  // Setup droppable (for reordering)
  const { setNodeRef: setDroppableNodeRef, isOver: isDropTargetOver } =
    useDroppable({
      id: `tab-drop-${id}`,
      data: {
        type: "tab",
        tabId: id,
        workspaceId,
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
        transform: CSS.Transform.toString(transform),
        transition: "none", // Disable transition during drag
      }
    : {};

  const combinedStyle: React.CSSProperties = {
    ...externalStyle,
    ...transformStyle,
    opacity: isDragging ? 0.5 : 1,
    cursor: disabled || isPinned ? "pointer" : "grab",
  };

  return (
    <div
      ref={combinedNodeRef}
      style={combinedStyle}
      {...attributes}
      {...listeners}
      className={clsx(
        "flex items-center px-6 cursor-pointer hover:bg-element-hover group select-none",
        isActive ? "bg-primary-subtle border-r-2 border-primary" : "text-secondary",
        isDropTargetOver && !isDragging && "ring-1 ring-inset ring-blue-400 bg-primary/5",
        isDragging && "opacity-50 scale-105"
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <span className="mr-2 opacity-70 pointer-events-none">
        <TabIcon language={language} isTablet={isTablet} />
      </span>
      <span className={clsx("flex-1 truncate text-sm pointer-events-none", isActive && "text-main font-medium")}>
        {title}
      </span>
      {isPinned && <Pin size={12} className="ml-1 opacity-50 pointer-events-none" />}
      {isRich && <Type size={12} className="ml-1 opacity-50 pointer-events-none" />}
    </div>
  );
};

// TabIcon component (same as in Sidebar.tsx)
const TabIcon: React.FC<{ language: string; isTablet?: boolean }> = ({ language, isTablet }) => {
  if (isTablet) return <Calculator size={14} />;

  switch (language.toLowerCase()) {
    case "typescript":
    case "javascript":
    case "json":
      return <FileCode size={14} />;
    case "markdown":
    case "plaintext":
      return <FileText size={14} />;
    default:
      return <File size={14} />;
  }
};
