import React, { useState } from 'react';
import { Plus, Star, Copy, Trash2, Grid, List, ArrowUp, ArrowDown, SortAsc, SortDesc } from 'lucide-react';
import { Workflow, Tag } from '../types';

interface WorkflowListProps {
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  onSelectWorkflow: (id: string) => void;
  onCreateWorkflow: (workflow: Omit<Workflow, 'id' | 'createdAt' | 'lastModified'>) => Workflow;
  onDeleteWorkflow: (id: string) => void;
  onCloneWorkflow: (id: string) => Workflow | undefined;
  onToggleFavorite: (id: string) => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: () => void;
  sortBy: 'title' | 'createdAt' | 'lastModified';
  sortDirection: 'asc' | 'desc';
  onSortChange: (sortBy: 'title' | 'createdAt' | 'lastModified') => void;
  onSortDirectionChange: () => void;
  tags: Tag[];
}

export const WorkflowList: React.FC<WorkflowListProps> = ({
  workflows,
  selectedWorkflowId,
  onSelectWorkflow,
  onCreateWorkflow,
  onDeleteWorkflow,
  onCloneWorkflow,
  onToggleFavorite,
  viewMode,
  onViewModeChange,
  sortBy,
  sortDirection,
  onSortChange,
  onSortDirectionChange,
  tags
}) => {
  const [showSortOptions, setShowSortOptions] = useState(false);

  const handleCreateWorkflow = () => {
    const newWorkflow = onCreateWorkflow({
      title: 'Untitled Workflow',
      description: '',
      steps: [],
      tags: [],
      isFavorite: false
    });
  };
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const getTagsForWorkflow = (workflow: Workflow) => {
    return workflow.tags.map(tagId => tags.find(tag => tag.id === tagId)).filter(Boolean) as Tag[];
  };
  
  return (
    <div className="w-80 border-r border-gray-700/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none p-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-200">Workflows</h2>
          <div className="flex items-center space-x-1">
            <button
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
              onClick={onViewModeChange}
              title={viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'}
            >
              {viewMode === 'list' ? <Grid size={16} /> : <List size={16} />}
            </button>
            
            <div className="relative">
              <button
                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                onClick={() => setShowSortOptions(!showSortOptions)}
                title="Sort options"
              >
                {sortDirection === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
              </button>
              
              {showSortOptions && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowSortOptions(false)}
                  />
                  <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[180px]">
                    <div className="py-1">
                      <button
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                          sortBy === 'title' ? 'text-blue-400' : 'text-gray-300'
                        }`}
                        onClick={() => {
                          onSortChange('title');
                          setShowSortOptions(false);
                        }}
                      >
                        <span>Title</span>
                        {sortBy === 'title' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        )}
                      </button>
                      <button
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                          sortBy === 'createdAt' ? 'text-blue-400' : 'text-gray-300'
                        }`}
                        onClick={() => {
                          onSortChange('createdAt');
                          setShowSortOptions(false);
                        }}
                      >
                        <span>Date Created</span>
                        {sortBy === 'createdAt' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        )}
                      </button>
                      <button
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                          sortBy === 'lastModified' ? 'text-blue-400' : 'text-gray-300'
                        }`}
                        onClick={() => {
                          onSortChange('lastModified');
                          setShowSortOptions(false);
                        }}
                      >
                        <span>Last Modified</span>
                        {sortBy === 'lastModified' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        )}
                      </button>
                      <div className="border-t border-gray-700 my-1"></div>
                      <button
                        className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors text-gray-300"
                        onClick={() => {
                          onSortDirectionChange();
                          setShowSortOptions(false);
                        }}
                      >
                        <span>
                          {sortDirection === 'asc' ? 'Descending Order' : 'Ascending Order'}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        <button
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors"
          onClick={handleCreateWorkflow}
        >
          <Plus size={16} />
          <span>New Workflow</span>
        </button>
      </div>
      
      {/* Workflow List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <p className="text-center mb-2">No workflows found</p>
            <button
              className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors text-sm"
              onClick={handleCreateWorkflow}
            >
              Create your first workflow
            </button>
          </div>
        ) : (
          <div className={viewMode === 'list' ? 'divide-y divide-gray-700/50' : 'p-2 grid gap-2'}>
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className={`group ${
                  viewMode === 'list'
                    ? 'hover:bg-gray-800/50 transition-colors'
                    : 'bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors'
                } ${
                  selectedWorkflowId === workflow.id
                    ? viewMode === 'list'
                      ? 'bg-gray-800/50 border-l-2 border-blue-500'
                      : 'bg-gray-800 ring-1 ring-blue-500'
                    : ''
                }`}
                onClick={() => onSelectWorkflow(workflow.id)}
              >
                <div className={`${viewMode === 'list' ? 'p-3' : 'p-3'} cursor-pointer`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-200 truncate">
                          {workflow.title}
                        </h3>
                        {workflow.isFavorite && (
                          <Star size={14} className="text-yellow-500 fill-current" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                        {workflow.description || 'No description'}
                      </p>
                      
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(workflow.lastModified)}
                        </span>
                      </div>
                      
                      {/* Tags */}
                      {getTagsForWorkflow(workflow).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {getTagsForWorkflow(workflow).slice(0, 3).map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {getTagsForWorkflow(workflow).length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{getTagsForWorkflow(workflow).length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-gray-700/50 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(workflow.id);
                        }}
                        title={workflow.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star size={14} className={workflow.isFavorite ? 'fill-current' : ''} />
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloneWorkflow(workflow.id);
                        }}
                        title="Clone workflow"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this workflow?')) {
                            onDeleteWorkflow(workflow.id);
                          }
                        }}
                        title="Delete workflow"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 