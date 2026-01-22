import React from "react";
import { clsx } from "clsx";
import { Plus, ChevronRight } from "../Icons";
import { Workspace } from "../../types";
import { getWorkspaceColor, getWorkspaceInitial } from "./workspaceColors";

interface IconRailProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  workspaceTabCounts: Map<string, number>;
  onWorkspaceClick: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
  onExpandSidebar: () => void;
}

export const IconRail: React.FC<IconRailProps> = ({
  workspaces,
  activeWorkspaceId,
  workspaceTabCounts,
  onWorkspaceClick,
  onCreateWorkspace,
  onExpandSidebar,
}) => {
  return (
    <div className="hidden md:flex flex-col w-14 h-full bg-surface-secondary border-r border-base">
      {/* Expand button at top */}
      <div className="flex items-center justify-center h-12 border-b border-base">
        <button
          onClick={onExpandSidebar}
          className="p-2 hover:bg-element-hover rounded text-secondary hover:text-main transition-colors"
          title="Expand sidebar (Cmd+B)"
          aria-label="Expand sidebar"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Workspace icons */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {workspaces.map((workspace) => {
          const isActive = workspace.id === activeWorkspaceId;
          const color = getWorkspaceColor(workspace.id);
          const initial = getWorkspaceInitial(workspace.name);
          const tabCount = workspaceTabCounts.get(workspace.id) || 0;

          return (
            <div key={workspace.id} className="px-2 mb-2">
              <button
                onClick={() => onWorkspaceClick(workspace.id)}
                className={clsx(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold transition-all",
                  "hover:scale-105 hover:shadow-lg",
                  isActive
                    ? "shadow-md ring-2 ring-primary ring-offset-2 ring-offset-surface-secondary"
                    : "opacity-70 hover:opacity-100"
                )}
                style={{
                  backgroundColor: color,
                  color: '#ffffff', // Always white text for contrast
                }}
                title={`${workspace.name} (${tabCount} tabs)`}
                aria-label={`Switch to ${workspace.name}`}
              >
                {initial}
              </button>
            </div>
          );
        })}
      </div>

      {/* New workspace button at bottom */}
      <div className="flex items-center justify-center h-12 border-t border-base">
        <button
          onClick={onCreateWorkspace}
          className="p-2 hover:bg-element-hover rounded text-secondary hover:text-main transition-colors"
          title="New workspace"
          aria-label="Create new workspace"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
};
