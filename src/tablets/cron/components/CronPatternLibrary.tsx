import React, { useState } from "react";
import { X, Plus, Trash2, Save, BookOpen } from "lucide-react";
import { CronPattern } from "../types";

interface CronPatternLibraryProps {
  patterns: CronPattern[];
  onClose: () => void;
  onSavePattern: (name: string, description?: string) => void;
  onDeletePattern: (id: string) => void;
  onLoadPattern: (pattern: CronPattern) => void;
}

export const CronPatternLibrary: React.FC<CronPatternLibraryProps> = ({
  patterns,
  onClose,
  onSavePattern,
  onDeletePattern,
  onLoadPattern,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newPatternName, setNewPatternName] = useState("");
  const [newPatternDescription, setNewPatternDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSavePattern = () => {
    if (newPatternName.trim()) {
      onSavePattern(
        newPatternName.trim(),
        newPatternDescription.trim() || undefined,
      );
      setNewPatternName("");
      setNewPatternDescription("");
      setIsCreating(false);
    }
  };

  // Filter patterns based on search query
  const filteredPatterns = patterns.filter(
    (pattern) =>
      pattern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pattern.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pattern.expression.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center">
            <BookOpen size={20} className="text-blue-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-200">
              Cron Pattern Library
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patterns..."
                className="w-full bg-gray-700 border border-gray-600 rounded-md pl-10 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <button
              onClick={() => setIsCreating(true)}
              className="ml-4 flex items-center bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-2 rounded-md text-sm transition-colors"
            >
              <Plus size={16} className="mr-1" />
              <span>New Pattern</span>
            </button>
          </div>

          {isCreating && (
            <div className="mb-4 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-sm font-medium text-gray-200 mb-2">
                Save Current Pattern
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Pattern Name
                  </label>
                  <input
                    type="text"
                    value={newPatternName}
                    onChange={(e) => setNewPatternName(e.target.value)}
                    placeholder="e.g., Every weekday at 9am"
                    className="w-full bg-gray-600 border border-gray-500 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newPatternDescription}
                    onChange={(e) => setNewPatternDescription(e.target.value)}
                    placeholder="Add a description for this pattern"
                    className="w-full bg-gray-600 border border-gray-500 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1 text-sm text-gray-300 hover:text-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePattern}
                    disabled={!newPatternName.trim()}
                    className="flex items-center px-3 py-1 text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={14} className="mr-1" />
                    <span>Save Pattern</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {filteredPatterns.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                <p>No patterns found.</p>
                {searchQuery ? (
                  <p className="text-sm mt-1">Try a different search term.</p>
                ) : (
                  <p className="text-sm mt-1">
                    Click "New Pattern" to create one.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredPatterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="bg-gray-700 border border-gray-600 rounded-lg p-3 hover:border-gray-500 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-medium text-gray-200 truncate">
                        {pattern.name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onDeletePattern(pattern.id)}
                          className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded"
                          title="Delete pattern"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-400 truncate">
                      <code className="bg-gray-600 px-1 rounded">
                        {pattern.expression}
                      </code>
                      <span className="ml-1">({pattern.dialect})</span>
                    </div>
                    {pattern.description && (
                      <p className="mt-2 text-xs text-gray-300 line-clamp-2">
                        {pattern.description}
                      </p>
                    )}
                    <button
                      onClick={() => onLoadPattern(pattern)}
                      className="mt-2 w-full text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 py-1 rounded"
                    >
                      Use This Pattern
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
