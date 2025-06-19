import React, { useState } from 'react';
import { Plus, Copy, Trash2, Edit2, Check, X } from 'lucide-react';
import { Template } from '../types';

interface TemplateListProps {
  templates: Template[];
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string) => void;
  onCreateTemplate: (template: Omit<Template, 'id'>) => Template;
  onUpdateTemplate: (id: string, updates: Partial<Omit<Template, 'id'>>) => void;
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
  onCreatePromptFromTemplate
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Omit<Template, 'id'>>({
    title: '',
    description: '',
    content: '',
    category: 'Custom'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<Template | null>(null);
  
  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);
  
  // Sort categories with "Custom" at the end
  const sortedCategories = Object.keys(groupedTemplates).sort((a, b) => {
    if (a === 'Custom') return 1;
    if (b === 'Custom') return -1;
    return a.localeCompare(b);
  });
  
  const handleCreateTemplate = () => {
    if (newTemplate.title.trim() && newTemplate.content.trim()) {
      onCreateTemplate({
        ...newTemplate,
        title: newTemplate.title.trim(),
        description: newTemplate.description.trim(),
        content: newTemplate.content.trim()
      });
      
      setNewTemplate({
        title: '',
        description: '',
        content: '',
        category: 'Custom'
      });
      
      setIsCreating(false);
    }
  };
  
  const handleUpdateTemplate = () => {
    if (editedTemplate && editedTemplate.title.trim() && editedTemplate.content.trim()) {
      onUpdateTemplate(editedTemplate.id, {
        title: editedTemplate.title.trim(),
        description: editedTemplate.description.trim(),
        content: editedTemplate.content.trim(),
        category: editedTemplate.category
      });
      
      setIsEditing(false);
      setEditedTemplate(null);
    }
  };
  
  const handleStartEdit = (template: Template) => {
    setEditedTemplate(template);
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTemplate(null);
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none p-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-200">Templates</h2>
          <button
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
            onClick={() => setIsCreating(!isCreating)}
            title={isCreating ? 'Cancel' : 'Create new template'}
          >
            {isCreating ? <X size={18} /> : <Plus size={18} />}
          </button>
        </div>
        
        {isCreating && (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 mb-3">
            <h3 className="text-sm font-medium text-gray-200 mb-2">Create New Template</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newTemplate.title}
                  onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                  placeholder="Template title"
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Brief description"
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  placeholder="Category"
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Content</label>
                <textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  placeholder="Template content"
                  rows={8}
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-none custom-scrollbar"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded"
                  onClick={handleCreateTemplate}
                  disabled={!newTemplate.title.trim() || !newTemplate.content.trim()}
                >
                  Create Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Template List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {isEditing && editedTemplate ? (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 mb-3">
            <h3 className="text-sm font-medium text-gray-200 mb-2">Edit Template</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={editedTemplate.title}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, title: e.target.value })}
                  placeholder="Template title"
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={editedTemplate.description}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, description: e.target.value })}
                  placeholder="Brief description"
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  value={editedTemplate.category}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, category: e.target.value })}
                  placeholder="Category"
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                  disabled={editedTemplate.isBuiltIn}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Content</label>
                <textarea
                  value={editedTemplate.content}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, content: e.target.value })}
                  placeholder="Template content"
                  rows={12}
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-none custom-scrollbar"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded"
                  onClick={handleUpdateTemplate}
                  disabled={!editedTemplate.title.trim() || !editedTemplate.content.trim()}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {sortedCategories.length === 0 ? (
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
                {sortedCategories.map(category => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-300 mb-2">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groupedTemplates[category].map(template => (
                        <div
                          key={template.id}
                          className={`bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:bg-gray-800 transition-colors cursor-pointer group ${
                            selectedTemplateId === template.id ? 'ring-1 ring-blue-500/50' : ''
                          }`}
                          onClick={() => onSelectTemplate(template.id)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-gray-200">{template.title}</h4>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCreatePromptFromTemplate(template.id);
                                }}
                                title="Create prompt from template"
                              >
                                <Copy size={14} />
                              </button>
                              {!template.isBuiltIn && (
                                <>
                                  <button
                                    className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEdit(template);
                                    }}
                                    title="Edit template"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded"
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
                          <p className="text-xs text-gray-400 mb-2">{template.description}</p>
                          <div className="text-xs text-gray-500 line-clamp-3 font-mono">
                            {template.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};