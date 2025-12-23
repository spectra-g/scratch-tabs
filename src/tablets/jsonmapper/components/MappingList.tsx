import React, { useState } from "react";
import { Edit, Trash2, Copy, Play, Plus } from "lucide-react";
import { MappingConfig } from "../types";
import { formatRelativeTime } from "../utils/dateUtils";
import { HelpGuide } from "./HelpGuide";

interface MappingListProps {
  mappings: MappingConfig[];
  searchQuery: string;
  onCreateMapping: () => void;
  onEditMapping: (id: string) => void;
  onDeleteMapping: (id: string) => void;
  onDuplicateMapping: (id: string) => void;
  onBatchTransform: (id: string) => void;
}

export const MappingList: React.FC<MappingListProps> = ({
  mappings,
  searchQuery,
  onCreateMapping,
  onEditMapping,
  onDeleteMapping,
  onDuplicateMapping,
  onBatchTransform,
}) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Filter mappings based on search query
  const filteredMappings = mappings.filter((mapping) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      mapping.name.toLowerCase().includes(query) ||
      mapping.description.toLowerCase().includes(query)
    );
  });

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(id);
  };

  const handleConfirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteMapping(id);
    setConfirmDelete(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-main">
          {filteredMappings.length}{" "}
          {filteredMappings.length === 1 ? "Mapping" : "Mappings"}
        </h2>
        <button
          onClick={onCreateMapping}
          className="flex items-center space-x-2 px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-sm"
        >
          <Plus size={14} />
          <span>Create Mapping</span>
        </button>
      </div>

      {filteredMappings.length === 0 ? (
        <div className="space-y-4">
          <HelpGuide />
          <div className="bg-surface-secondary border border-base rounded-lg p-8 text-center">
            <p className="text-secondary mb-4">No mappings found</p>
            {searchQuery ? (
              <p className="text-sm text-muted">
                Try a different search query
              </p>
            ) : (
              <button
                onClick={onCreateMapping}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                Create your first mapping
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMappings.map((mapping) => (
            <div
              key={mapping.id}
              className="bg-surface-secondary border border-base rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-main">
                      {mapping.name}
                    </h3>
                    <p className="text-sm text-secondary mt-1">
                      {mapping.description}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-muted">
                      <span>
                        Created: {formatRelativeTime(mapping.createdAt)}
                      </span>
                      <span className="mx-2">•</span>
                      <span>
                        Updated: {formatRelativeTime(mapping.updatedAt)}
                      </span>
                      <span className="mx-2">•</span>
                      <span>{mapping.rules.length} rules</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {confirmDelete === mapping.id ? (
                      <div className="flex items-center space-x-2 bg-danger-subtle px-2 py-1 rounded">
                        <span className="text-danger text-xs">Delete?</span>
                        <button
                          onClick={(e) => handleConfirmDelete(mapping.id, e)}
                          className="p-1 text-danger hover:text-danger hover:bg-danger-subtle/50 rounded"
                          title="Confirm delete"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={handleCancelDelete}
                          className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded"
                          title="Cancel"
                        >
                          <span className="text-xs">Cancel</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => onBatchTransform(mapping.id)}
                          className="p-1.5 text-secondary hover:text-success hover:bg-element-hover rounded transition-colors"
                          title="Batch transform files"
                        >
                          <Play size={16} />
                        </button>
                        <button
                          onClick={() => onEditMapping(mapping.id)}
                          className="p-1.5 text-secondary hover:text-primary hover:bg-element-hover rounded transition-colors"
                          title="Edit mapping"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => onDuplicateMapping(mapping.id)}
                          className="p-1.5 text-secondary hover:text-primary hover:bg-element-hover rounded transition-colors"
                          title="Duplicate mapping"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(mapping.id, e)}
                          className="p-1.5 text-secondary hover:text-danger hover:bg-element-hover rounded transition-colors"
                          title="Delete mapping"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
