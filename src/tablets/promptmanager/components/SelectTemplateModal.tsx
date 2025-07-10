import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Template } from "../types";

interface SelectTemplateModalProps {
  templates: Template[];
  onSelect: (templateId: string) => void;
  onClose: () => void;
}

export const SelectTemplateModal: React.FC<SelectTemplateModalProps> = ({
  templates,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) {
      return templates;
    }
    return templates.filter(
      (template) =>
        template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.description || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    );
  }, [templates, searchQuery]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-3/4 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Select a Template</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => onSelect(template.id)}
                className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
              >
                <h3 className="font-bold text-white truncate">
                  {template.title}
                </h3>
                <p className="text-sm text-gray-300 line-clamp-2">
                  {template.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
