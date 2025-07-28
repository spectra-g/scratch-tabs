import React, { useState, useEffect, useMemo } from "react";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { StorageProviderFactory } from "../../db";
import { ImportExportService } from "../../features/import-export/ImportExportService";
import { CheckSquare, Square, X } from "../Icons";

interface ExportWorkspacesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportWorkspacesModal: React.FC<ExportWorkspacesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { workspaces } = useWorkspaceStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  const service = useMemo(() => new ImportExportService(), []);

  useEffect(() => {
    if (isOpen) {
      const fetchCounts = async () => {
        setIsLoading(true);
        const storage = StorageProviderFactory.getProvider();
        const counts: Record<string, number> = {};
        for (const ws of workspaces) {
          const tabs = await storage.getTabsByWorkspace(ws.id);
          counts[ws.id] = tabs.length;
        }
        setTabCounts(counts);
        setIsLoading(false);
      };
      fetchCounts();
      setSelectedIds(new Set()); // Reset selections when modal opens
    }
  }, [isOpen, workspaces]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(workspaces.map((ws) => ws.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleExport = async () => {
    setIsLoading(true);
    await service.exportWorkspaces(Array.from(selectedIds));
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-850 p-6 rounded-lg shadow-2xl w-full max-w-lg border border-gray-700/50 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            Export Workspaces
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div className="space-x-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-md text-gray-200 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-md text-gray-200 transition-colors"
            >
              Deselect All
            </button>
          </div>
          <span className="text-sm text-gray-400">
            {selectedIds.size} of {workspaces.length} selected
          </span>
        </div>

        {isLoading &&
          workspaces.length > 0 &&
          Object.keys(tabCounts).length === 0 && (
            <p className="text-center text-gray-300 py-4">
              Loading tab counts...
            </p>
          )}

        <div className="overflow-y-auto flex-grow custom-scrollbar pr-1 space-y-2 mb-4">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              onClick={() => handleToggleSelect(ws.id)}
              className={`flex items-center p-3 rounded-md cursor-pointer transition-colors
                ${selectedIds.has(ws.id) ? "bg-blue-500/20" : "bg-gray-700/50 hover:bg-gray-600/50"}`}
            >
              {selectedIds.has(ws.id) ? (
                <CheckSquare
                  size={20}
                  className="mr-3 text-blue-400 flex-shrink-0"
                />
              ) : (
                <Square
                  size={20}
                  className="mr-3 text-gray-500 flex-shrink-0"
                />
              )}
              <span className="text-gray-100 truncate flex-grow">
                {ws.name}
              </span>
              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                (
                {tabCounts[ws.id] !== undefined
                  ? `${tabCounts[ws.id]} tab${tabCounts[ws.id] === 1 ? "" : "s"}`
                  : "..."}
                )
              </span>
            </div>
          ))}
          {workspaces.length === 0 && (
            <p className="text-center text-gray-400 py-4">
              No workspaces found.
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 bg-transparent hover:bg-gray-700/50 rounded-md transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
            disabled={isLoading || selectedIds.size === 0}
          >
            {isLoading
              ? "Exporting..."
              : `Export Selected (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
};
