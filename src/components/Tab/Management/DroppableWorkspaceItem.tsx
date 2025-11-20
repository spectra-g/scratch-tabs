import React from "react";
import { Edit, Trash2, Folder } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";

export interface Workspace {
  id: string;
  name: string;
  tabCount: number;
}

export interface DroppableWorkspaceItemProps {
  workspace: Workspace;
  isActive: boolean;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onRename: () => void;
  onDelete: () => void;
  activeWorkspaceId: string | null;
}

export const DroppableWorkspaceItem: React.FC<DroppableWorkspaceItemProps> = ({
  workspace,
  isActive,
  onSelect,
  onRename,
  onDelete,
  activeWorkspaceId,
}) => {
  const droppableId = `workspace-${workspace.id}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: {
      type: "workspace",
      workspaceId: workspace.id,
      isActiveWorkspace: workspace.id === activeWorkspaceId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      data-workspace-id={workspace.id}
      className={`relative flex items-center justify-between px-3 py-1.5 cursor-pointer
        ${isActive ? "bg-blue-500/10" : "hover:bg-themed-hover"}
        ${isOver ? "bg-green-500/40 ring-2 ring-inset ring-green-500" : ""}`}
      onClick={(e) => onSelect(workspace.id, e)}
      style={{
        transition: "background-color 0.2s, box-shadow 0.2s",
        position: "relative",
      }}
    >
      <div className="flex items-center relative z-10">
        <Folder
          size={16}
          className={`mr-2 ${isActive ? "text-blue-500" : "icon-themed"}`}
        />
        <span
          className={`text-sm ${isActive ? "text-blue-500" : "text-themed"}`}
        >
          {workspace.name}
        </span>
        <span className="ml-2 text-xs text-themed-muted">
          ({workspace.tabCount === -1 ? "..." : workspace.tabCount})
        </span>
      </div>

      <div className="flex items-center space-x-1 relative z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
          className="p-1 icon-themed icon-themed-hover hover:bg-themed-hover rounded"
          title="Rename workspace"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 icon-themed hover:text-red-400 hover:bg-themed-hover rounded"
          title="Delete workspace"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
