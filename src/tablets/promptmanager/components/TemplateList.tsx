import React, { useState } from "react";
import { Plus, Trash2, Edit2, Play, Check, PlusCircle } from "lucide-react";
import { Template, Snippet } from "../types";
import { TemplateDetailModal } from "./TemplateDetailModal";
import { ContentItemEditorModal } from "./ContentItemEditorModal";
import { VariableFillModal } from "./VariableFillModal";
import { estimateTokenCount, formatTokenCount, getTokenCountColor } from "../utils/tokenCount";
import { parseVariables, substituteVariables } from "../utils/variables";

interface TemplateListProps {
  templates: Template[];
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string) => void;
  onCreateTemplate: (template: Omit<Template, "id">) => Template;
  onUpdateTemplate: (
    id: string,
    updates: Partial<Omit<Template, "id">>,
  ) => void;
  onDeleteTemplate: (id: string) => void;
  onCreatePromptFromTemplate: (templateId: string) => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onCreatePromptFromTemplate,
}) => {
  const [showSystemTemplates, setShowSystemTemplates] = useState(true);
  const [showCustomTemplates, setShowCustomTemplates] = useState(true);
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [quickUseTemplate, setQuickUseTemplate] = useState<Template | null>(null);
  const [quickUseVariables, setQuickUseVariables] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const filteredTemplates = templates.filter((template) => {
    if (template.isBuiltIn) {
      return showSystemTemplates;
    }
    return showCustomTemplates;
  });

  // Group templates by category
  const groupedTemplates = filteredTemplates.reduce(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    },
    {} as Record<string, Template[]>,
  );

  // Sort categories with "Custom" at the end
  const sortedCategories = Object.keys(groupedTemplates).sort((a, b) => {
    if (a === "Custom") return 1;
    if (b === "Custom") return -1;
    return a.localeCompare(b);
  });

  const handleSaveTemplate = (
    item: Omit<Template, "id"> | Omit<Snippet, "id">,
  ) => {
    if (editingTemplate) {
      onUpdateTemplate(editingTemplate.id, item as Omit<Template, "id">);
    } else {
      onCreateTemplate(item as Omit<Template, "id">);
    }
    setIsCreating(false);
    setEditingTemplate(null);
  };

  const handleQuickUse = (template: Template) => {
    const variables = parseVariables(template.content);
    
    if (variables.length > 0) {
      // Open variable fill modal
      setQuickUseTemplate(template);
      setQuickUseVariables(variables);
    } else {
      // No variables, copy directly
      copyToClipboard(template.content, template.id);
    }
  };

  const handleQuickUseSubmit = (values: Record<string, string>) => {
    if (!quickUseTemplate) return;
    
    const substitutedContent = substituteVariables(quickUseTemplate.content, values, false);
    copyToClipboard(substitutedContent, quickUseTemplate.id);
    
    // Close modal
    setQuickUseTemplate(null);
    setQuickUseVariables([]);
  };

  const handleQuickUseClose = () => {
    setQuickUseTemplate(null);
    setQuickUseVariables([]);
  };

  const copyToClipboard = (content: string, templateId: string) => {
    navigator.clipboard.writeText(content);
    setCopied(templateId);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none p-3 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-200">Templates</h2>
            <button
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
              onClick={() => setIsCreating(true)}
              title="Create new template"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex items-center space-x-2 mb-3">
            <button
              onClick={() => setShowSystemTemplates(!showSystemTemplates)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                showSystemTemplates
                  ? "bg-blue-500/30 text-blue-300"
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
              }`}
            >
              System
            </button>
            <button
              onClick={() => setShowCustomTemplates(!showCustomTemplates)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                showCustomTemplates
                  ? "bg-green-500/30 text-green-300"
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {sortedCategories.length === 0 && !isCreating ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
              <p className="text-center mb-2">No templates found</p>
              <button
                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors text-sm"
                onClick={() => setIsCreating(true)}
              >
                Create your first template
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedCategories.map((category) => (
                <div key={category}>
                  <h3 className="text-base font-semibold text-gray-300 mb-3">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {groupedTemplates[category].map((template) => (
                      <div
                        key={template.id}
                        className={`relative group bg-gray-800/50 border rounded-lg p-3 transition-colors duration-200 cursor-pointer ${
                          selectedTemplateId === template.id
                            ? "border-blue-500/50"
                            : "border-gray-700/50 hover:border-gray-600/50"
                        }`}
                        onClick={() => {
                          onSelectTemplate(template.id);
                          setViewingTemplate(template);
                        }}
                      >
                        <h4 className="font-semibold text-gray-200 truncate pr-16">
                          {template.title}
                        </h4>
                        <p className="text-sm text-gray-400 truncate mt-1">
                          {template.description}
                        </p>
                        <div className="mt-2 text-xs">
                          <span className={getTokenCountColor(estimateTokenCount(template.content))}>
                            {formatTokenCount(estimateTokenCount(template.content))}
                          </span>
                        </div>

                        <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-700/50 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickUse(template);
                            }}
                            title="Use template (copy with variables filled)"
                          >
                            {copied === template.id ? (
                              <Check size={14} className="text-green-400" />
                            ) : (
                              <Play size={14} />
                            )}
                          </button>
                          <button
                            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCreatePromptFromTemplate(template.id);
                            }}
                            title="Create prompt from template"
                          >
                            <PlusCircle size={14} />
                          </button>
                          {!template.isBuiltIn && (
                            <>
                              <button
                                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTemplate(template);
                                }}
                                title="Edit template"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="p-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteTemplate(template.id);
                                }}
                                title="Delete template"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {viewingTemplate && (
        <TemplateDetailModal
          template={viewingTemplate}
          onClose={() => setViewingTemplate(null)}
        />
      )}
      {(isCreating || editingTemplate) && (
        <ContentItemEditorModal
          item={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => {
            setIsCreating(false);
            setEditingTemplate(null);
          }}
          itemType="Template"
        />
      )}
      <VariableFillModal
        isOpen={quickUseTemplate !== null}
        variables={quickUseVariables}
        onSubmit={handleQuickUseSubmit}
        onClose={handleQuickUseClose}
        submitButtonLabel="Generate & Copy"
      />
    </>
  );
};
