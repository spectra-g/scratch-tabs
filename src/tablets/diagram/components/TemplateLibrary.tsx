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
      <div className="bg-gray-850 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <FileText size={24} className="text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-200">Diagram Templates</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search and filters */}
        <div className="p-4 border-b border-gray-700 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === category.id
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
              <FileText size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No templates found</p>
              <p className="text-gray-600 text-sm">Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors cursor-pointer group"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-200 group-hover:text-white transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                    <button
                      onClick={(e) => copyTemplateCode(template, e)}
                      className={`p-1 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-all ${
                        copiedTemplateId === template.id ? 'opacity-100 bg-green-600' : ''
                      }`}
                      title={copiedTemplateId === template.id ? "Copied!" : "Copy code"}
                    >
                      {copiedTemplateId === template.id ? (
                        <Check size={14} className="text-white" />
                      ) : (
                        <Copy size={14} className="text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Tags and complexity */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300"
                        >
                          <Tag size={10} className="mr-1" />
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{template.tags.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      template.complexity === 'basic' 
                        ? 'bg-green-900 text-green-300'
                        : template.complexity === 'intermediate'
                        ? 'bg-yellow-900 text-yellow-300'
                        : 'bg-red-900 text-red-300'
                    }`}>
                      {template.complexity}
                    </span>
                  </div>

                  {/* Code preview */}
                  <div className="mt-3 bg-gray-900 rounded p-2 overflow-hidden">
                    <pre className="text-xs text-gray-400 font-mono line-clamp-3">
                      {template.code}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 text-center">
          <p className="text-xs text-gray-500">
            Click any template to load it into the editor, or use the copy button to copy the code
          </p>
        </div>
      </div>
    </div>
  );
};