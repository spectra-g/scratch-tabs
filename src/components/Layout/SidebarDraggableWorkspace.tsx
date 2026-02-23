import React, { useCallback, useRef, useEffect } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Folder, FolderOpen, ChevronDown, ChevronRight, Edit, ArrowRightLeft } from "../Icons";
import { clsx } from "clsx";
import { useSidebarStore } from "../../stores/sidebarStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";

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
  const editingId = useSidebarStore(s => s.editingId);
  const editingValue = useSidebarStore(s => s.editingValue);
  const setEditingId = useSidebarStore(s => s.setEditingId);
  const setEditingValue = useSidebarStore(s => s.setEditingValue);
  const { renameWorkspace, switchWorkspace } = useWorkspaceStore();
  const isEditing = editingId === id;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRenameSave = useCallback(() => {
    if (editingValue.trim() && editingValue.trim() !== name) {
      renameWorkspace(id, editingValue.trim());
    }
    setEditingId(null);
  }, [editingValue, name, renameWorkspace, id, setEditingId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSave();
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  }, [handleRenameSave, setEditingId]);

  // Setup draggable for workspace reordering
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `workspace-${id}`,
    disabled: isEditing,
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
      {...(!isEditing ? attributes : {})}
      {...(!isEditing ? listeners : {})}
      className={clsx(
        "flex items-center px-2 py-0.5 cursor-pointer hover:bg-element-hover group select-none",
        isActive ? "text-main font-semibold border-l-2 border-primary" : "text-secondary",
        isSwitching && "bg-primary-subtle animate-pulse",
        isOver && !isDragging && "ring-1 ring-inset ring-blue-400 bg-primary/5",
        isDragging && "scale-105 shadow-md bg-surface-highlight"
      )}
      onClick={!isEditing ? onClick : undefined}
      onDoubleClick={!isEditing ? onDoubleClick : undefined}
      onContextMenu={!isEditing ? onContextMenu : undefined}
      data-testid={`sidebar-workspace-${id}`}
      aria-expanded={isExpanded}
      aria-selected={isActive}
    >
      <span className="mr-1 pointer-events-none" data-testid={`sidebar-workspace-${id}-expand`}>
        {isVisuallyExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </span>
      <span className="mr-1.5 pointer-events-none text-secondary group-hover:text-main">
        {isVisuallyExpanded ? (
          <FolderOpen size={14} className={isActive ? "text-primary" : ""} />
        ) : (
          <Folder size={14} className={isActive ? "text-primary" : ""} />
        )}
      </span>

      <div className="flex-1 flex items-center min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-canvas border border-primary px-1 text-[12px] rounded focus:outline-none"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={handleRenameSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            data-testid="workspace-rename-input"
          />
        ) : (
          <span className="truncate text-[12px] pointer-events-none">
            {name}
            {isSwitching && <span className="ml-2 text-[11px] opacity-70">Switching...</span>}
          </span>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="hidden group-hover:flex items-center gap-1.5 transition-opacity">
            {!isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  switchWorkspace(id);
                }}
                className="p-0.5 hover:bg-surface-raised rounded text-secondary hover:text-main"
                title="Switch to workspace"
              >
                <ArrowRightLeft size={12} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(id, name);
              }}
              className="p-0.5 hover:bg-surface-raised rounded text-secondary hover:text-main"
              title="Rename workspace"
            >
              <Edit size={12} />
            </button>
          </div>
          <span
            className="text-[10px] opacity-50 px-1 py-0.25 rounded-full bg-surface-secondary pointer-events-none"
            data-testid={`sidebar-workspace-${id}-badge`}
          >
            {tabCount}
          </span>
        </div>
      )}
    </div>
  );
};
