import React, { useState, useMemo } from 'react';
import { Search, X, Copy, Check, FileText, Tag } from '../../../components/Icons';
import { DiagramTemplate, DiagramType } from '../types';
import { DIAGRAM_TEMPLATES, TEMPLATE_CATEGORIES, searchTemplates } from '../templates';

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: DiagramTemplate) => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  isOpen,
  onClose,
  onSelectTemplate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DiagramType | 'all'>('all');
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    let templates = searchTemplates(searchQuery);

    if (selectedCategory !== 'all') {
      templates = templates.filter(template => template.category === selectedCategory);
    }

    return templates;
  }, [searchQuery, selectedCategory]);

  const handleTemplateSelect = (template: DiagramTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  const copyTemplateCode = async (template: DiagramTemplate, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(template.code);
      setCopiedTemplateId(template.id);
      setTimeout(() => setCopiedTemplateId(null), 2000);
    } catch (error) {
      // Silently handle clipboard errors
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-base">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base">
          <div className="flex items-center space-x-3">
            <FileText size={24} className="text-info" />
            <h2 className="text-xl font-semibold text-main">Diagram Templates</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-element-hover rounded-md transition-colors text-muted hover:text-main"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search and filters */}
        <div className="p-4 border-b border-base space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-element border border-base rounded-md text-main placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedCategory === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-element text-secondary hover:bg-element-hover'
                }`}
            >
              All ({DIAGRAM_TEMPLATES.length})
            </button>
            {TEMPLATE_CATEGORIES.map(category => {
              const count = DIAGRAM_TEMPLATES.filter(t => t.category === category.id).length;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id as DiagramType)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  {category.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="text-muted mx-auto mb-4" />
              <p className="text-secondary text-lg">No templates found</p>
              <p className="text-muted text-sm">Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className="bg-surface-secondary border border-base rounded-lg p-4 hover:border-secondary transition-colors cursor-pointer group"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-main group-hover:text-main/80 transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-sm text-muted mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                    <button
                      onClick={(e) => copyTemplateCode(template, e)}
                      className={`p-1 hover:bg-element-hover rounded opacity-0 group-hover:opacity-100 transition-all ${copiedTemplateId === template.id ? 'opacity-100 bg-success' : ''
                        }`}
                      title={copiedTemplateId === template.id ? "Copied!" : "Copy code"}
                    >
                      {copiedTemplateId === template.id ? (
                        <Check size={14} className="text-white" />
                      ) : (
                        <Copy size={14} className="text-muted" />
                      )}
                    </button>
                  </div>

                  {/* Tags and complexity */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-element text-secondary"
                        >
                          <Tag size={10} className="mr-1" />
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="text-xs text-muted">
                          +{template.tags.length - 3} more
                        </span>
                      )}
                    </div>

                    <span className={`text-xs px-2 py-0.5 rounded-full ${template.complexity === 'basic'
                        ? 'bg-success-subtle text-success'
                        : template.complexity === 'intermediate'
                          ? 'bg-warning-subtle text-warning'
                          : 'bg-danger-subtle text-danger'
                      }`}>
                      {template.complexity}
                    </span>
                  </div>

                  {/* Code preview */}
                  <div className="mt-3 bg-canvas rounded p-2 overflow-hidden">
                    <pre className="text-xs text-muted font-mono line-clamp-3">
                      {template.code}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base text-center">
          <p className="text-xs text-muted">
            Click any template to load it into the editor, or use the copy button to copy the code
          </p>
        </div>
      </div>
    </div>
  );
};