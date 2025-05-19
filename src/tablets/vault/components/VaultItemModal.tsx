import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { X, Save, Tag, Plus, FileCode } from 'lucide-react';
import { VaultItem, ContentType } from '../types';
import { getContentTypeIcon, detectContentType, CONTENT_TYPES } from '../utils/contentTypeUtils';

interface VaultItemModalProps {
  item: VaultItem;
  isNew: boolean;
  onSave: (item: VaultItem, isNew: boolean) => void;
  onClose: () => void;
  existingLabels: string[];
}

export const VaultItemModal: React.FC<VaultItemModalProps> = ({
  item,
  isNew,
  onSave,
  onClose,
  existingLabels
}) => {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);
  const [contentType, setContentType] = useState<ContentType>(item.contentType as ContentType);
  const [labels, setLabels] = useState<string[]>(item.labels);
  const [newLabel, setNewLabel] = useState('');
  const [isPinned, setIsPinned] = useState(item.isPinned);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const newLabelInputRef = useRef<HTMLInputElement>(null);
  
  // Focus title input on mount
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);
  
  // Auto-detect content type when content changes
  useEffect(() => {
    if (isNew && content && contentType === 'plaintext') {
      const detectedType = detectContentType(content);
      if (detectedType !== 'plaintext') {
        setContentType(detectedType);
      }
    }
  }, [content, isNew, contentType]);
  
  const handleSave = () => {
    // Validate required fields
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    
    onSave({
      ...item,
      title: title.trim(),
      content,
      contentType,
      labels,
      isPinned,
      modifiedTimestamp: Date.now()
    }, isNew);
  };
  
  const handleAddLabel = () => {
    if (!newLabel.trim()) return;
    
    // Don't add duplicate labels
    if (!labels.includes(newLabel.trim())) {
      setLabels([...labels, newLabel.trim()]);
    }
    
    setNewLabel('');
    if (newLabelInputRef.current) {
      newLabelInputRef.current.focus();
    }
  };
  
  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter(label => label !== labelToRemove));
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddLabel();
    }
  };
  
  const ContentTypeIcon = getContentTypeIcon(contentType);
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold text-gray-100">
            {isNew ? 'Add New Item' : 'Edit Item'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                Title
              </label>
              <input
                ref={titleInputRef}
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
                placeholder="Enter a descriptive title..."
              />
            </div>
            
            {/* Content Type */}
            <div>
              <label htmlFor="contentType" className="block text-sm font-medium text-gray-300 mb-1">
                Content Type
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ContentTypeIcon size={16} className="text-gray-400" />
                </div>
                <select
                  id="contentType"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as ContentType)}
                  className="w-full bg-gray-900/50 border border-gray-700/50 rounded-md pl-10 pr-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                >
                  {CONTENT_TYPES.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <FileCode size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-1">
                Content
              </label>
              <div className="border border-gray-700/50 rounded-md overflow-hidden">
                <Editor
                  height="300px"
                  language={contentType}
                  value={content}
                  onChange={(value) => setContent(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    padding: { top: 16, bottom: 16 },
                  }}
                />
              </div>
            </div>
            
            {/* Labels */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Labels
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {labels.map(label => (
                  <span 
                    key={label} 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm bg-blue-500/20 text-blue-300"
                  >
                    <Tag size={12} className="mr-1.5" />
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="ml-1.5 text-blue-300 hover:text-blue-100"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag size={16} className="text-gray-400" />
                  </div>
                  <input
                    ref={newLabelInputRef}
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-gray-900/50 border border-gray-700/50 rounded-l-md pl-10 pr-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
                    placeholder="Add a label..."
                    list="existing-labels"
                  />
                  <datalist id="existing-labels">
                    {existingLabels
                      .filter(label => !labels.includes(label))
                      .map(label => (
                        <option key={label} value={label} />
                      ))}
                  </datalist>
                </div>
                <button
                  type="button"
                  onClick={handleAddLabel}
                  className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-2 rounded-r-md transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            {/* Pin Option */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPinned"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500/50 bg-gray-700"
              />
              <label htmlFor="isPinned" className="ml-2 text-sm text-gray-300">
                Pin this item
              </label>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-700/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="ml-3 px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors flex items-center"
          >
            <Save size={16} className="mr-2" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};