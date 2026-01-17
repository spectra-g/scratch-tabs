/**
 * Operation Palette Component
 *
 * Left panel showing available operations organized by category.
 * Uses accordion pattern for categories.
 */

import React, { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Search, Plus } from "../Icons";
import {
  OperationDefinition,
  OperationCategory,
} from "../../services/pipeline/types";
import { operationRegistry } from "../../services/pipeline";

interface OperationPaletteProps {
  onAddOperation: (operation: OperationDefinition) => void;
}

export const OperationPalette: React.FC<OperationPaletteProps> = ({
  onAddOperation,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["json", "encoding"]), // Default expanded
  );

  // Get categories and operations from registry
  const categories = useMemo(
    () => operationRegistry.getNonEmptyCategories(),
    [],
  );

  const operationsByCategory = useMemo(() => {
    const map = new Map<string, OperationDefinition[]>();
    for (const category of categories) {
      map.set(category.id, operationRegistry.getByCategory(category.id));
    }
    return map;
  }, [categories]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return operationRegistry.search(searchQuery);
  }, [searchQuery]);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Render an operation item
  const renderOperation = (operation: OperationDefinition) => (
    <div
      key={operation.id}
      className="flex items-center justify-between px-3 py-2 hover:bg-element-hover cursor-pointer rounded group"
      onClick={() => onAddOperation(operation)}
      title={operation.description}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm text-main truncate">{operation.name}</div>
        <div className="text-xs text-muted truncate">
          {operation.description}
        </div>
      </div>
      <Plus className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-base">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search operations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-element border border-base rounded focus:outline-none focus:border-focus text-main placeholder-muted"
          />
        </div>
      </div>

      {/* Operations List */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {searchResults !== null ? (
          // Search Results
          <div className="p-2">
            {searchResults.length === 0 ? (
              <div className="text-sm text-muted text-center py-4">
                No operations found
              </div>
            ) : (
              <div className="space-y-1">
                {searchResults.map(renderOperation)}
              </div>
            )}
          </div>
        ) : (
          // Category Accordion
          <div className="divide-y divide-base">
            {categories.map((category) => {
              const operations = operationsByCategory.get(category.id) || [];
              const isExpanded = expandedCategories.has(category.id);

              return (
                <div key={category.id}>
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-element-hover transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted" />
                      )}
                      <span className="text-sm font-medium text-main">
                        {category.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted">
                      {operations.length}
                    </span>
                  </button>

                  {/* Category Operations */}
                  {isExpanded && operations.length > 0 && (
                    <div className="pb-2 pl-4 pr-2">
                      <div className="space-y-1">
                        {operations.map(renderOperation)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {categories.length === 0 && (
              <div className="p-4 text-sm text-muted text-center">
                No operations registered.
                <br />
                <span className="text-xs">
                  Operations are loaded from formats and tablets.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
