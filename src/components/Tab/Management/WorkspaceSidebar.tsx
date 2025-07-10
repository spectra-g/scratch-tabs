import React from "react";
import { DroppableWorkspaceItem, Workspace } from "./DroppableWorkspaceItem";

export interface WorkspaceSidebarProps {
  workspaces: Array<Workspace & { isLoadingCount?: boolean }>;
  activeWorkspaceId: string | null;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  workspaces,
  activeWorkspaceId,
  onSelect,
  onRename,
  onDelete,
}) => {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {workspaces.map((workspace) => (
        <DroppableWorkspaceItem
          key={workspace.id}
          workspace={workspace}
          isActive={workspace.id === activeWorkspaceId}
          activeWorkspaceId={activeWorkspaceId}
          onSelect={(id, e) => onSelect(id, e)}
          onRename={() => onRename(workspace.id)}
          onDelete={() => onDelete(workspace.id)}
        />
      ))}
    </div>
  );
};
