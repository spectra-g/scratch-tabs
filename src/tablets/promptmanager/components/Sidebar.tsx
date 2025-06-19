import React, { useState } from 'react';
import { Tag, Star, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { Tag as TagType } from '../types';

interface SidebarProps {
  tags: TagType[];
  selectedTags: string[];
  onTagSelect: (tagId: string) => void;
  showFavoritesOnly: boolean;
  onFavoritesToggle: () => void;
  onCreateTag: (tag: Omit<TagType, 'id'>) => TagType;
  onUpdateTag: (id: string, updates: Partial<Omit<TagType, 'id'>>) => void;
  onDeleteTag: (id: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tags,
  selectedTags,
  onTagSelect,
  showFavoritesOnly,
  onFavoritesToggle,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  isVisible,
  onClose
}) => {
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6'); // Default blue
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');
  
  // Available colors for tags
  const tagColors = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Gray', value: '#6B7280' },
  ];
  
  const handleCreateTag = () => {
    if (newTagName.trim()) {
      onCreateTag({
        name: newTagName.trim(),
        color: newTagColor
      });
      setNewTagName('');
      setIsCreatingTag(false);
    }
  };
  
  const handleStartEditTag = (tag: TagType) => {
    setEditingTagId(tag.id);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
  };
  
  const handleSaveEditTag = () => {
    if (editingTagId && editTagName.trim()) {
      onUpdateTag(editingTagId, {
        name: editTagName.trim(),
        color: editTagColor
      });
      setEditingTagId(null);
    }
  };
  
  const handleCancelEditTag = () => {
    setEditingTagId(null);
  };
  
  return (
    <>
      {/* Mobile overlay */}
      {isVisible && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`w-64 bg-gray-800 border-r border-gray-700/50 flex-none overflow-y-auto custom-scrollbar transition-all duration-300 ease-in-out ${
          isVisible ? 'fixed md:relative left-0 top-0 bottom-0 z-50' : 'fixed md:relative -left-64 md:left-0 top-0 bottom-0 z-50'
        }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-200">Filters</h2>
            <button
              className="md:hidden p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
          
          {/* Favorites Filter */}
          <div className="mb-6">
            <button
              className={`flex items-center space-x-2 w-full px-3 py-2 rounded-md transition-colors ${
                showFavoritesOnly
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'hover:bg-gray-700/50 text-gray-300'
              }`}
              onClick={onFavoritesToggle}
            >
              <Star size={16} className={showFavoritesOnly ? 'text-yellow-400 fill-yellow-400' : ''} />
              <span>Favorites Only</span>
            </button>
          </div>
          
          {/* Tags */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Tags</h3>
              <button
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                onClick={() => setIsCreatingTag(!isCreatingTag)}
                title={isCreatingTag ? 'Cancel' : 'Create new tag'}
              >
                {isCreatingTag ? <X size={14} /> : <Plus size={14} />}
              </button>
            </div>
            
            {/* Create Tag Form */}
            {isCreatingTag && (
              <div className="mb-3 bg-gray-700/30 p-2 rounded-md">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 mb-2"
                  autoFocus
                />
                <div className="flex flex-wrap gap-1 mb-2">
                  {tagColors.map((color) => (
                    <button
                      key={color.value}
                      className={`w-5 h-5 rounded-full ${
                        newTagColor === color.value ? 'ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setNewTagColor(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                    onClick={() => setIsCreatingTag(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
            
            {/* Tag List */}
            <div className="space-y-1">
              {tags.map((tag) => (
                <div key={tag.id} className="group">
                  {editingTagId === tag.id ? (
                    <div className="bg-gray-700/30 p-2 rounded-md">
                      <input
                        type="text"
                        value={editTagName}
                        onChange={(e) => setEditTagName(e.target.value)}
                        placeholder="Tag name"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 mb-2"
                        autoFocus
                      />
                      <div className="flex flex-wrap gap-1 mb-2">
                        {tagColors.map((color) => (
                          <button
                            key={color.value}
                            className={`w-5 h-5 rounded-full ${
                              editTagColor === color.value ? 'ring-2 ring-white' : ''
                            }`}
                            style={{ backgroundColor: color.value }}
                            onClick={() => setEditTagColor(color.value)}
                            title={color.name}
                          />
                        ))}
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                          onClick={handleCancelEditTag}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded"
                          onClick={handleSaveEditTag}
                          disabled={!editTagName.trim()}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors flex-1 ${
                          selectedTags.includes(tag.id)
                            ? 'bg-gray-700/70 text-gray-200'
                            : 'hover:bg-gray-700/50 text-gray-300'
                        }`}
                        onClick={() => onTagSelect(tag.id)}
                      >
                        <Tag size={14} style={{ color: tag.color }} />
                        <span>{tag.name}</span>
                      </button>
                      
                      {!tag.isBuiltIn && (
                        <div className="hidden group-hover:flex items-center space-x-1">
                          <button
                            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                            onClick={() => handleStartEditTag(tag)}
                            title="Edit tag"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded"
                            onClick={() => onDeleteTag(tag.id)}
                            title="Delete tag"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {tags.length === 0 && (
                <div className="text-gray-500 text-sm italic text-center py-2">
                  No tags created yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};