import React, { useState } from 'react';
import { Plus, Copy, Trash2, Edit2, Check, X } from 'lucide-react';
import { Snippet } from '../types';

interface SnippetListProps {
  snippets: Snippet[];
  selectedSnippetId: string | null;
  onSelectSnippet: (id: string) => void;
  onCreateSnippet: (snippet: Omit<Snippet, 'id'>) => Snippet;
  onUpdateSnippet: (id: string, updates: Partial<Omit<Snippet, 'id'>>) => void;
  onDeleteSnippet: (id: string) => void;
}

export const SnippetList: React.FC<SnippetListProps> = ({
  snippets,
  selectedSnippetId,
  onSelectSnippet,
  onCreateSnippet,
  onUpdateSnippet,
  onDeleteSnippet
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSnippet, setNewSnippet] = useState<Omit<Snippet, 'id'>>({
    title: '',
    content: '',
    category: 'Custom'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedSnippet, setEditedSnippet] = useState<Snippet | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  
  // Group snippets by category
  const groupedSnippets = snippets.reduce((acc, snippet) => {
    if (!acc[snippet.category]) {
      acc[snippet.category] = [];
    }
    acc[snippet.category].push(snippet);
    return acc;
  }, {} as Record<string, Snippet[]>);
  
  // Sort categories with "Custom" at the end
  const sortedCategories = Object.keys(groupedSnippets).sort((a, b) => {
    if (a === 'Custom') return 1;
    if (b === 'Custom') return -1;
    return a.localeCompare(b);
  });
  
  const handleCreateSnippet = () => {
    if (newSnippet.title.trim() && newSnippet.content.trim()) {
      onCreateSnippet({
        ...newSnippet,
        title: newSnippet.title.trim(),
        content: newSnippet.content.trim()
      });
      
      setNewSnippet({
        title: '',
        content: '',
        category: 'Custom'
      });
      
      setIsCreating(false);
    }
  };
  
  const handleUpdateSnippet = () => {
    if (editedSnippet && editedSnippet.title.trim() && editedSnippet.content.trim()) {
      onUpdateSnippet(editedSnippet.id, {
        title: editedSnippet.title.trim(),
        content: editedSnippet.content.trim(),
        category: editedSnippet.category
      });
      
      setIsEditing(false);
      setEditedSnippet(null);
    }
  };
  
  const handleStartEdit = (snippet: Snippet) => {
    setEditedSnippet(snippet);
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedSnippet(null);
  };
  
  const handleCopySnippet = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    
    setTimeout(() => {
      setCopied(null);
    }, 2000);
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none p-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-200">Snippets</h2>
          <button
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
            onClick={() => setIsCreating(!isCreating)}
            title={isCreating ? 'Cancel' : 'Create new snippet'}
          >
            {isCreating ? <X size={18} /> : <Plus size={18} />}
          </button>
        </div>
        
        {isCreating && (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 mb-3">
            <h3 className="text-sm font-medium text-gray-200 mb-2">Create New Snippet</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newSnippet.title}
                  onChange={(e) => setNewSnippet({ ...newSnippet, title: e.target.value })}
                  placeholder="Snippet title"
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  value={newSnippet.category}
                  onChange={(e) => setNewSnippet({ ...newSnippet, category: e.target.value })}
                  placeholder="Category"
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Content</label>
                <textarea
                  value={newSnippet.content}
                  onChange={(e) => setNewSnippet({ ...newSnippet, content: e.target.value })}
                  placeholder="Snippet content"
                  rows={6}
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
                  onClick={handleCreateSnippet}
                  disabled={!newSnippet.title.trim() || !newSnippet.content.trim()}
                >
                  Create Snippet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Snippet List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {isEditing && editedSnippet ? (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 mb-3">
            <h3 className="text-sm font-medium text-gray-200 mb-2">Edit Snippet</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={editedSnippet.title}
                  onChange={(e) => setEditedSnippet({ ...editedSnippet, title: e.target.value })}
                  placeholder="Snippet title"
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  value={editedSnippet.category}
                  onChange={(e) => setEditedSnippet({ ...editedSnippet, category: e.target.value })}
                  placeholder="Category"
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                  disabled={editedSnippet.isBuiltIn}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Content</label>
                <textarea
                  value={editedSnippet.content}
                  onChange={(e) => setEditedSnippet({ ...editedSnippet, content: e.target.value })}
                  placeholder="Snippet content"
                  rows={8}
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
                  onClick={handleUpdateSnippet}
                  disabled={!editedSnippet.title.trim() || !editedSnippet.content.trim()}
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
                <p className="text-center mb-2">No snippets found</p>
                <button
                  className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors text-sm"
                  onClick={() => setIsCreating(true)}
                >
                  Create your first snippet
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedCategories.map(category => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-300 mb-2">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groupedSnippets[category].map(snippet => (
                        <div
                          key={snippet.id}
                          className={`bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:bg-gray-800 transition-colors cursor-pointer group ${
                            selectedSnippetId === snippet.id ? 'ring-1 ring-blue-500/50' : ''
                          }`}
                          onClick={() => onSelectSnippet(snippet.id)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-gray-200">{snippet.title}</h4>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopySnippet(snippet.id, snippet.content);
                                }}
                                title="Copy snippet"
                              >
                                {copied === snippet.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                              </button>
                              {!snippet.isBuiltIn && (
                                <>
                                  <button
                                    className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEdit(snippet);
                                    }}
                                    title="Edit snippet"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteSnippet(snippet.id);
                                    }}
                                    title="Delete snippet"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 line-clamp-3 font-mono">
                            {snippet.content}
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