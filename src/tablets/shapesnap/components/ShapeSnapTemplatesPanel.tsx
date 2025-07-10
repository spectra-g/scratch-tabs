import React, { useState } from "react";
import { Layers, X, FileText } from "lucide-react";
import { ShapeSnapTemplate } from "../types";
import { defaultShapeSnapTemplates } from "../data/defaultTemplates";

interface ShapeSnapTemplatesPanelProps {
  onApplyTemplate: (template: ShapeSnapTemplate) => void;
  onClose: () => void;
}

export const ShapeSnapTemplatesPanel: React.FC<
  ShapeSnapTemplatesPanelProps
> = ({ onApplyTemplate, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Only built-in templates for now
  const allTemplates = defaultShapeSnapTemplates;

  // Get unique categories
  const categories = ["all", ...new Set(allTemplates.map((t) => t.category))];

  // Filter templates by category
  const filteredTemplates =
    selectedCategory === "all"
      ? allTemplates
      : allTemplates.filter((t) => t.category === selectedCategory);

  const handleApplyTemplate = (template: ShapeSnapTemplate) => {
    onApplyTemplate(template);
    onClose();
  };

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-gray-800 border-l border-gray-700 shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Layers size={20} className="text-blue-400" />
          <h3 className="text-lg font-medium text-gray-200">Templates</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Category Filter */}
      <div className="p-4 border-b border-gray-700">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === "all" ? "All Categories" : category}
            </option>
          ))}
        </select>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {filteredTemplates.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No templates found</p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="group bg-gray-700 hover:bg-gray-600 rounded-lg p-3 cursor-pointer transition-colors"
                onClick={() => handleApplyTemplate(template)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-200 text-sm">
                      {template.title}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-blue-400">
                        {template.category}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {template.shapes.length} shape
                  {template.shapes.length !== 1 ? "s" : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
