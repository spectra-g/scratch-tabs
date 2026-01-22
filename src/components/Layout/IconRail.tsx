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
    <div className="hidden md:flex flex-col w-[42px] h-full bg-surface-secondary border-r border-base">
      {/* Expand button at top - h-8 to align border with bottom of tab bar */}
      <div className="flex items-center justify-center h-8 border-b border-base">
        <button
          onClick={onExpandSidebar}
          className="p-1.5 hover:bg-element-hover rounded text-secondary hover:text-main transition-colors"
          title="Expand sidebar (Cmd+B)"
          aria-label="Expand sidebar"
        >
          <ChevronRight size={14} />
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
            <div key={workspace.id} className="px-1.5 mb-2">
              <button
                onClick={() => onWorkspaceClick(workspace.id)}
                className={clsx(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold transition-all",
                  "hover:scale-105 hover:shadow-lg",
                  isActive
                    ? "shadow-md ring-1 ring-slate-400/50 ring-offset-1 ring-offset-surface-secondary"
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

      <div className="flex items-center justify-center h-[29px] border-t border-base">
        <button
          onClick={onCreateWorkspace}
          className="p-1.5 hover:bg-element-hover rounded text-secondary hover:text-main transition-colors"
          title="New workspace"
          aria-label="Create new workspace"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};
