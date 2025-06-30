import React, { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, GripVertical, Clock, Tag as TagIcon, Check, X, Copy, CheckSquare, Square, ExternalLink } from 'lucide-react';
import { Workflow, WorkflowStep, Prompt, Tag } from '../types';
import { useRootStore } from '../../../stores';
import { useWorkspaceStore } from '../../../stores/workspaceStore';

interface PromptSelectorProps {
  prompts: Prompt[];
  onSelectPrompt: (promptId: string) => void;
  onClose: () => void;
}

const PromptSelector: React.FC<PromptSelectorProps> = ({ prompts, onSelectPrompt, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredPrompts = prompts.filter(prompt =>
    prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-40 w-80 max-h-[400px] flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-700">
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredPrompts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No prompts found
            </div>
          ) : (
            filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="p-3 hover:bg-gray-700/50 cursor-pointer border-b border-gray-700/50 last:border-b-0"
                onClick={() => {
                  onSelectPrompt(prompt.id);
                  onClose();
                }}
              >
                <div className="font-medium text-sm text-gray-200">{prompt.title}</div>
                <div className="text-xs text-gray-400 line-clamp-2 mt-1">
                  {prompt.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

interface WorkflowEditorProps {
  workflow: Workflow;
  onUpdateWorkflow: (id: string, updates: Partial<Omit<Workflow, 'id' | 'createdAt'>>) => void;
  prompts: Prompt[];
  tags: Tag[];
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  workflow,
  onUpdateWorkflow,
  prompts,
  tags
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(workflow.title);
  const [description, setDescription] = useState(workflow.description);
  const [showPromptSelector, setShowPromptSelector] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSteps, setSelectedSteps] = useState<Set<number>>(new Set());
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [copiedAllSteps, setCopiedAllSteps] = useState(false);
  const [openedStepIndex, setOpenedStepIndex] = useState<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get stores for opening tabs
  const { addBackgroundTab, splitView } = useRootStore();
  const { activeWorkspaceId } = useWorkspaceStore();

  // Auto-enter edit mode for new workflows
  React.useEffect(() => {
    const isNewWorkflow = workflow.title === 'Untitled Workflow' && workflow.steps.length === 0;
    if (isNewWorkflow) {
      setIsEditing(true);
    }
  }, [workflow.id]);

  // Focus title input when editing starts
  React.useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    onUpdateWorkflow(workflow.id, {
      title: title.trim() || 'Untitled Workflow',
      description: description.trim()
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(workflow.title);
    setDescription(workflow.description);
    setIsEditing(false);
  };

  const handleAddStep = (promptId: string) => {
    const newStep: WorkflowStep = {
      id: crypto.randomUUID(),
      promptId,
      stepTitle: undefined
    };

    onUpdateWorkflow(workflow.id, {
      steps: [...workflow.steps, newStep]
    });
  };

  const handleRemoveStep = (stepIndex: number) => {
    const newSteps = workflow.steps.filter((_, index) => index !== stepIndex);
    onUpdateWorkflow(workflow.id, {
      steps: newSteps
    });
  };

  const handleStepTitleChange = (stepIndex: number, stepTitle: string) => {
    const newSteps = [...workflow.steps];
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      stepTitle: stepTitle.trim() || undefined
    };
    onUpdateWorkflow(workflow.id, {
      steps: newSteps
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newSteps = [...workflow.steps];
    const draggedStep = newSteps[draggedIndex];
    
    // Remove the dragged step
    newSteps.splice(draggedIndex, 1);
    
    // Insert at new position
    const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newSteps.splice(adjustedDropIndex, 0, draggedStep);

    onUpdateWorkflow(workflow.id, {
      steps: newSteps
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleTagToggle = (tagId: string) => {
    const newTags = workflow.tags.includes(tagId)
      ? workflow.tags.filter(id => id !== tagId)
      : [...workflow.tags, tagId];
    
    onUpdateWorkflow(workflow.id, { tags: newTags });
  };

  // Copy functionality
  const copyStepToClipboard = (stepIndex: number) => {
    const step = workflow.steps[stepIndex];
    const prompt = getPromptById(step.promptId);
    const stepTitle = step.stepTitle || prompt?.title || 'Unknown Prompt';
    const content = prompt?.content || '';
    
    const stepText = `Step ${stepIndex + 1}: ${stepTitle}

${content}`;
    
    navigator.clipboard.writeText(stepText).then(() => {
      setCopiedStep(stepIndex);
      setTimeout(() => setCopiedStep(null), 2000);
    });
  };

  const copySelectedSteps = () => {
    const selectedStepIndexes = Array.from(selectedSteps).sort((a, b) => a - b);
    const stepsText = selectedStepIndexes.map(stepIndex => {
      const step = workflow.steps[stepIndex];
      const prompt = getPromptById(step.promptId);
      const stepTitle = step.stepTitle || prompt?.title || 'Unknown Prompt';
      const content = prompt?.content || '';
      
      return `Step ${stepIndex + 1}: ${stepTitle}

${content}`;
    }).join('\n\n---\n\n');

    const header = `${workflow.title}${workflow.description ? `\n${workflow.description}` : ''}`;
    const fullText = `${header}\n\n${stepsText}`;

    navigator.clipboard.writeText(fullText).then(() => {
      setSelectionMode(false);
      setSelectedSteps(new Set());
    });
  };

  // Selection mode handlers
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedSteps(new Set());
  };

  const toggleStepSelection = (stepIndex: number) => {
    const newSelection = new Set(selectedSteps);
    if (newSelection.has(stepIndex)) {
      newSelection.delete(stepIndex);
    } else {
      newSelection.add(stepIndex);
    }
    setSelectedSteps(newSelection);
  };

  const selectAllSteps = () => {
    const allSteps = new Set(workflow.steps.map((_, index) => index));
    setSelectedSteps(allSteps);
  };

  const clearSelection = () => {
    setSelectedSteps(new Set());
  };

  const copyAllSteps = () => {
    if (workflow.steps.length === 0) return;
    
    const allStepsText = workflow.steps.map((step, index) => {
      const prompt = getPromptById(step.promptId);
      const stepTitle = step.stepTitle || prompt?.title || 'Unknown Prompt';
      const content = prompt?.content || '';
      
      return `Step ${index + 1}: ${stepTitle}

${content}`;
    }).join('\n\n---\n\n');

    const header = `${workflow.title}${workflow.description ? `\n${workflow.description}` : ''}`;
    const fullText = `${header}\n\n${allStepsText}`;

    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedAllSteps(true);
      setTimeout(() => setCopiedAllSteps(false), 2000);
    });
  };

  // Open selected steps in new tab
  const openSelectedStepsInNewTab = useCallback(() => {
    if (selectedSteps.size === 0) return;

    const selectedStepIndexes = Array.from(selectedSteps).sort((a, b) => a - b);
    const stepsText = selectedStepIndexes.map(stepIndex => {
      const step = workflow.steps[stepIndex];
      const prompt = getPromptById(step.promptId);
      const stepTitle = step.stepTitle || prompt?.title || 'Unknown Prompt';
      const content = prompt?.content || '';
      
      return `Step ${stepIndex + 1}: ${stepTitle}

${content}`;
    }).join('\n\n---\n\n');

    const header = `${workflow.title}${workflow.description ? `\n${workflow.description}` : ''}`;
    const fullContent = `${header}\n\n${stepsText}`;

    // Determine which side to open the tab on
    const paneElem = containerRef.current?.closest('[data-editor-pane-side]');
    const sideAttr = paneElem?.getAttribute('data-editor-pane-side');
    const isRightSideLocal = splitView.isSplit && sideAttr === 'right';

    const newTabId = crypto.randomUUID();
    addBackgroundTab({
      id: newTabId,
      title: `${workflow.title} (${selectedSteps.size} steps)`,
      content: fullContent,
      language: 'markdown',
      languageLocked: false,
      cursorPosition: { lineNumber: 1, column: 1 },
      dateCreated: Date.now(),
      lastModified: Date.now(),
      workspaceId: activeWorkspaceId || ''
    }, isRightSideLocal);

    // Exit selection mode and show success
    setSelectionMode(false);
    setSelectedSteps(new Set());
  }, [selectedSteps, workflow, addBackgroundTab, splitView.isSplit, activeWorkspaceId]);

  const getPromptById = (promptId: string) => {
    return prompts.find(p => p.id === promptId);
  };

  const getTagsForWorkflow = () => {
    return workflow.tags.map(tagId => tags.find(tag => tag.id === tagId)).filter(Boolean) as Tag[];
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-700/50">
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Workflow title"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-lg font-semibold text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
              <button
                className="p-2 text-green-400 hover:bg-gray-700/50 rounded-md"
                onClick={handleSave}
                title="Save changes"
              >
                <Check size={18} />
              </button>
              <button
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md"
                onClick={handleCancel}
                title="Cancel editing"
              >
                <X size={18} />
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Workflow description (optional)"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-200">{workflow.title}</h2>
              <div className="flex items-center space-x-2">
                {workflow.steps.length > 0 && (
                  <button
                    className={`p-2 rounded-md transition-colors ${
                      copiedAllSteps 
                        ? 'text-green-400 bg-green-500/20' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                    }`}
                    onClick={copyAllSteps}
                    title="Copy all steps"
                  >
                    {copiedAllSteps ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                )}
                <button
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md"
                  onClick={() => setIsEditing(true)}
                  title="Edit workflow"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
              </div>
            </div>
            {workflow.description && (
              <p className="text-gray-400 mb-3">{workflow.description}</p>
            )}
            
            {/* Tags */}
            <div className="flex items-center space-x-2">
              <div className="flex flex-wrap gap-1">
                {getTagsForWorkflow().map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              <div className="relative">
                <button
                  className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                  onClick={() => setShowTagSelector(!showTagSelector)}
                  title="Manage tags"
                >
                  <TagIcon size={16} />
                </button>
                
                {showTagSelector && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowTagSelector(false)}
                    />
                    <div className="absolute left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[200px]">
                      <div className="py-2 max-h-60 overflow-y-auto">
                        {tags.map((tag) => (
                          <button
                            key={tag.id}
                            className={`flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                              workflow.tags.includes(tag.id) ? 'bg-gray-700/50' : ''
                            }`}
                            onClick={() => handleTagToggle(tag.id)}
                          >
                            <span
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="text-gray-200">{tag.name}</span>
                            {workflow.tags.includes(tag.id) && (
                              <Check size={14} className="ml-auto text-blue-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Selection Toolbar */}
        {workflow.steps.length > 0 && (
          <div className="mb-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleSelectionMode}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    selectionMode 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {selectionMode ? <CheckSquare size={16} /> : <Square size={16} />}
                  <span>{selectionMode ? 'Exit Selection' : 'Select Steps'}</span>
                </button>

                {selectionMode && (
                  <>
                    <div className="h-4 w-px bg-gray-600" />
                    <span className="text-sm text-gray-400">
                      {selectedSteps.size} of {workflow.steps.length} selected
                    </span>
                    <button
                      onClick={selectAllSteps}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearSelection}
                      className="text-xs text-gray-400 hover:text-gray-300"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>

              {selectionMode && selectedSteps.size > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={copySelectedSteps}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-md text-sm transition-colors"
                  >
                    <Copy size={14} />
                    <span>Copy Selected</span>
                  </button>
                  <button
                    onClick={openSelectedStepsInNewTab}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md text-sm transition-colors"
                  >
                    <ExternalLink size={14} />
                    <span>Open in Tab</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {workflow.steps.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="mb-4">No steps in this workflow yet</p>
              <div className="relative">
                <button
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors"
                  onClick={() => setShowPromptSelector(true)}
                >
                  <Plus size={16} />
                  <span>Add First Step</span>
                </button>
                
                {showPromptSelector && (
                  <PromptSelector
                    prompts={prompts}
                    onSelectPrompt={handleAddStep}
                    onClose={() => setShowPromptSelector(false)}
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              {workflow.steps.map((step, index) => {
                const prompt = getPromptById(step.promptId);
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;
                const isSelected = selectedSteps.has(index);
                const isCopied = copiedStep === index;
                
                return (
                  <div
                    key={step.id}
                    draggable={!selectionMode}
                    onDragStart={(e) => !selectionMode && handleDragStart(e, index)}
                    onDragOver={(e) => !selectionMode && handleDragOver(e, index)}
                    onDragLeave={!selectionMode ? handleDragLeave : undefined}
                    onDrop={(e) => !selectionMode && handleDrop(e, index)}
                    className={`group relative border rounded-lg p-4 transition-all ${
                      isDragging ? 'opacity-50 scale-95' : ''
                    } ${
                      isDragOver ? 'border-blue-500/50 bg-blue-500/10' : ''
                    } ${
                      isSelected 
                        ? 'border-blue-500/50 bg-blue-500/10' 
                        : 'border-gray-700/50 bg-gray-800/50 hover:bg-gray-800/70'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Selection Checkbox / Step Number & Drag Handle */}
                      <div className="flex items-center space-x-2">
                        {selectionMode ? (
                          <button
                            onClick={() => toggleStepSelection(index)}
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-gray-700/50"
                          >
                            {isSelected ? (
                              <CheckSquare size={20} className="text-blue-400" />
                            ) : (
                              <Square size={20} className="text-gray-400" />
                            )}
                          </button>
                        ) : (
                          <>
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <button
                              className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Drag to reorder"
                            >
                              <GripVertical size={16} />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={step.stepTitle || ''}
                              onChange={(e) => handleStepTitleChange(index, e.target.value)}
                              placeholder={prompt?.title || 'Unknown Prompt'}
                              className="w-full bg-transparent border-none px-0 py-1 text-base font-medium text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-0"
                              disabled={selectionMode}
                            />
                            <div className="text-sm text-gray-400">
                              Prompt: {prompt?.title || 'Unknown Prompt'}
                            </div>
                          </div>
                          
                          {/* Step Actions */}
                          {!selectionMode && (
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className={`p-2 rounded-md transition-colors ${
                                  isCopied 
                                    ? 'text-green-400 bg-green-500/20' 
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                                }`}
                                onClick={() => copyStepToClipboard(index)}
                                title="Copy step"
                              >
                                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                              </button>
                              <button
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-md"
                                onClick={() => {
                                  if (confirm('Remove this step from the workflow?')) {
                                    handleRemoveStep(index);
                                  }
                                }}
                                title="Remove step"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {prompt && (
                          <div className="mt-2 p-3 bg-gray-900/50 rounded border border-gray-700/30">
                            <div className="text-xs text-gray-400 mb-1">Preview:</div>
                            <div className="text-sm text-gray-300 line-clamp-3">
                              {prompt.content}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Step Button */}
              <div className="relative">
                <button
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-600 hover:border-blue-500/50 text-gray-400 hover:text-blue-400 rounded-lg transition-colors"
                  onClick={() => setShowPromptSelector(true)}
                >
                  <Plus size={16} />
                  <span>Add Step</span>
                </button>
                
                {showPromptSelector && (
                  <PromptSelector
                    prompts={prompts}
                    onSelectPrompt={handleAddStep}
                    onClose={() => setShowPromptSelector(false)}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}; 