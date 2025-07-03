import React, { useState, useRef, useEffect } from 'react';
import { Copy, Tag as TagIcon, Check, X, Plus, History } from 'lucide-react';
import { Prompt, Tag, Snippet, Template } from '../types';
import { MarkdownPreview } from './MarkdownPreview';
import { HistoryViewer } from './HistoryViewer';
import { EditorInsertPanel } from './EditorInsertPanel';
import { FormattingToolbar } from './FormattingToolbar';

interface PromptEditorProps {
  prompt: Prompt;
  onUpdatePrompt: (id: string, updates: Partial<Omit<Prompt, 'id' | 'createdAt'>>) => void;
  onIncrementUsage: (id: string) => void;
  tags: Tag[];
  snippets: Snippet[];
  templates: Template[];
}

interface HistoryState {
  content: string;
  title: string;
  timestamp: number;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  onUpdatePrompt,
  onIncrementUsage,
  tags,
  snippets,
  templates
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(prompt.title);
  const [content, setContent] = useState(prompt.content);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isInsertPanelOpen, setIsInsertPanelOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Undo/Redo state
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Track if we're currently editing to prevent exiting edit mode during user edits
  const isCurrentlyEditingRef = useRef(false);
  
  // Update local state when prompt changes
  useEffect(() => {
    // Only update local state if we're not currently editing
    // This prevents the effect from overriding user changes during editing
    if (!isCurrentlyEditingRef.current) {
      setTitle(prompt.title);
      setContent(prompt.content);
      
      // Auto-enter edit mode for new prompts (empty content and default title)
      const isNewPrompt = prompt.content === '' && (prompt.title === 'Untitled Prompt' || prompt.title === 'New Prompt');
      if (isNewPrompt) {
        setIsEditing(true);
        isCurrentlyEditingRef.current = true;
        // Initialize history for new prompts
        initializeHistory(prompt.title, prompt.content);
      } else {
        setIsEditing(false);
        isCurrentlyEditingRef.current = false;
        // Clear history when not editing
        setHistory([]);
        setHistoryIndex(-1);
      }
    }
  }, [prompt.id, prompt.title, prompt.content]);
  
  // Update the ref when editing state changes
  useEffect(() => {
    isCurrentlyEditingRef.current = isEditing;
  }, [isEditing]);
  
  // Focus title input when editing starts
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  // Initialize history when editing starts
  const initializeHistory = (initialTitle: string, initialContent: string) => {
    const initialState: HistoryState = {
      title: initialTitle,
      content: initialContent,
      timestamp: Date.now()
    };
    setHistory([initialState]);
    setHistoryIndex(0);
  };

  // Add to history when content or title changes
  const addToHistory = (newTitle: string, newContent: string) => {
    if (isUndoRedoAction) {
      setIsUndoRedoAction(false);
      return;
    }

    const newState: HistoryState = {
      title: newTitle,
      content: newContent,
      timestamp: Date.now()
    };

    // Remove any states after current index (for redo)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);

    // Keep only last 50 states
    if (newHistory.length > 50) {
      newHistory.splice(0, newHistory.length - 50);
    }

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Handle title changes
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (isEditing) {
      addToHistory(newTitle, content);
    }
  };

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (isEditing) {
      addToHistory(title, newContent);
    }
  };

  // Undo functionality
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setIsUndoRedoAction(true);
      setTitle(state.title);
      setContent(state.content);
      setHistoryIndex(newIndex);
    }
  };

  // Redo functionality
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setIsUndoRedoAction(true);
      setTitle(state.title);
      setContent(state.content);
      setHistoryIndex(newIndex);
    }
  };

  // Check if undo/redo is available
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  const handleSave = () => {
    onUpdatePrompt(prompt.id, {
      title: title.trim() || 'Untitled Prompt',
      content
    });
    setIsEditing(false);
    setIsPreviewMode(false);
    setIsInsertPanelOpen(false);
    // Clear history when saving
    setHistory([]);
    setHistoryIndex(-1);
  };
  
  const handleCancel = () => {
    setTitle(prompt.title);
    setContent(prompt.content);
    setIsEditing(false);
    setIsPreviewMode(false);
    setIsInsertPanelOpen(false);
    // Clear history when canceling
    setHistory([]);
    setHistoryIndex(-1);
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    onIncrementUsage(prompt.id);
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  
  const handleTagToggle = (tagId: string) => {
    const newTags = prompt.tags.includes(tagId)
      ? prompt.tags.filter(id => id !== tagId)
      : [...prompt.tags, tagId];
    
    onUpdatePrompt(prompt.id, { tags: newTags });
  };
  
  const handleInsertContent = (contentToInsert: string) => {
    // Get cursor position
    const textarea = contentTextareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const textBefore = content.substring(0, cursorPos);
    const textAfter = content.substring(cursorPos);
    
    // Insert content at cursor position
    const newContent = `${textBefore}${contentToInsert}${textAfter}`;
    handleContentChange(newContent);
    
    // Focus textarea and set cursor position after inserted content
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = cursorPos + contentToInsert.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleFormat = (markdown: string) => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selectedText = content.substring(cursorPos, selectionEnd);
    
    let newContent: string;
    let newCursorPos: number;

    if (selectedText) {
      // If text is selected, wrap it with the markdown
      const before = content.substring(0, cursorPos);
      const after = content.substring(selectionEnd);
      
      if (markdown === '**text**') {
        newContent = `${before}**${selectedText}**${after}`;
        newCursorPos = cursorPos + selectedText.length + 4;
      } else if (markdown === '*text*') {
        newContent = `${before}*${selectedText}*${after}`;
        newCursorPos = cursorPos + selectedText.length + 2;
      } else if (markdown === '`code`') {
        newContent = `${before}\`${selectedText}\`${after}`;
        newCursorPos = cursorPos + selectedText.length + 2;
      } else if (markdown === '- item') {
        newContent = `${before}- ${selectedText}${after}`;
        newCursorPos = cursorPos + selectedText.length + 2;
      } else if (markdown === '1. item') {
        newContent = `${before}1. ${selectedText}${after}`;
        newCursorPos = cursorPos + selectedText.length + 3;
      } else if (markdown === '[text](url)') {
        newContent = `${before}[${selectedText}](url)${after}`;
        newCursorPos = cursorPos + selectedText.length + 3;
      } else if (markdown === '> quote') {
        newContent = `${before}> ${selectedText}${after}`;
        newCursorPos = cursorPos + selectedText.length + 2;
      } else if (markdown === '# Heading 1') {
        newContent = `${before}# ${selectedText}${after}`;
        newCursorPos = cursorPos + selectedText.length + 2;
      } else if (markdown === '## Heading 2') {
        newContent = `${before}## ${selectedText}${after}`;
        newCursorPos = cursorPos + selectedText.length + 3;
      } else if (markdown === '### Heading 3') {
        newContent = `${before}### ${selectedText}${after}`;
        newCursorPos = cursorPos + selectedText.length + 4;
      } else {
        newContent = content;
        newCursorPos = cursorPos;
      }
    } else {
      // If no text is selected, insert the markdown template
      const before = content.substring(0, cursorPos);
      const after = content.substring(cursorPos);
      
      // Handle special cases for multi-line insertions
      if (markdown === '```\ncode block\n```') {
        newContent = `${before}\`\`\`\ncode block\n\`\`\`${after}`;
        newCursorPos = cursorPos + 13; // Position cursor after "```\n"
      } else if (markdown === '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |') {
        newContent = `${before}| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |${after}`;
        newCursorPos = cursorPos + 8; // Position cursor after "| "
      } else {
        newContent = `${before}${markdown}${after}`;
        newCursorPos = cursorPos + markdown.length;
      }
    }

    handleContentChange(newContent);

    // Focus textarea and set cursor position
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleToggleInsertPanel = () => {
    setIsInsertPanelOpen(!isInsertPanelOpen);
  };

  const handleTogglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none p-3 border-b border-gray-700/50">
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Prompt title"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-base text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
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
        ) : (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-200 truncate">{prompt.title}</h2>
            <div className="flex items-center space-x-2">
              <button
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md"
                onClick={() => setShowHistory(true)}
                title="View history"
              >
                <History size={18} />
              </button>
              <button
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md"
                onClick={() => {
                  setIsEditing(true);
                  initializeHistory(prompt.title, prompt.content);
                }}
                title="Edit prompt"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md relative"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Tags */}
      <div className="flex-none p-3 border-b border-gray-700/50">
        <div className="flex items-center space-x-2">
          <TagIcon size={16} className="text-gray-400" />
          <span className="text-sm text-gray-400">Tags:</span>
          
          <div className="flex flex-wrap gap-1 flex-1">
            {prompt.tags.length > 0 ? (
              prompt.tags.map(tagId => {
                const tag = tags.find(t => t.id === tagId);
                if (!tag) return null;
                
                return (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.name}
                    {isEditing && (
                      <button
                        className="ml-1 hover:text-gray-200"
                        onClick={() => handleTagToggle(tag.id)}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-gray-500 italic">No tags</span>
            )}
            
            {isEditing && (
              <div className="relative">
                <button
                  className="inline-flex items-center px-2 py-0.5 bg-gray-700/50 hover:bg-gray-700 rounded text-xs text-gray-300"
                  onClick={() => setShowTagSelector(!showTagSelector)}
                >
                  <Plus size={12} className="mr-1" />
                  Add Tag
                </button>
                
                {showTagSelector && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowTagSelector(false)}
                    />
                    <div className="absolute left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[180px] max-h-[200px] overflow-y-auto custom-scrollbar">
                      <div className="py-1">
                        {tags.map(tag => (
                          <button
                            key={tag.id}
                            className={`flex items-center w-full px-3 py-1.5 text-sm text-left hover:bg-gray-700 transition-colors ${
                              prompt.tags.includes(tag.id) ? 'bg-gray-700/70' : ''
                            }`}
                            onClick={() => handleTagToggle(tag.id)}
                          >
                            <span
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span>{tag.name}</span>
                            {prompt.tags.includes(tag.id) && (
                              <Check size={14} className="ml-auto text-green-400" />
                            )}
                          </button>
                        ))}
                        
                        {tags.length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500 italic">
                            No tags available
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor/Preview Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isEditing ? (
            <>
              {/* Formatting Toolbar */}
              <FormattingToolbar
                onFormat={handleFormat}
                onToggleInsertPanel={handleToggleInsertPanel}
                onTogglePreview={handleTogglePreview}
                isInsertPanelOpen={isInsertPanelOpen}
                isPreviewMode={isPreviewMode}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
              
              {/* Editor/Preview Content */}
              {isPreviewMode ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <MarkdownPreview content={content} />
                </div>
              ) : (
                <textarea
                  ref={contentTextareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Write your prompt here... Use the formatting toolbar above for common markdown operations."
                  className="flex-1 w-full bg-gray-900 text-gray-200 p-4 resize-none focus:outline-none custom-scrollbar font-mono text-sm leading-relaxed"
                />
              )}
            </>
          ) : (
            /* Read-only rendered view */
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <MarkdownPreview content={prompt.content} />
            </div>
          )}
        </div>
        
        {/* Insert Panel */}
        {isEditing && isInsertPanelOpen && (
          <div className="w-96 border-l border-gray-700/50">
            <EditorInsertPanel
              templates={templates}
              snippets={snippets}
              onInsert={handleInsertContent}
            />
          </div>
        )}
      </div>
      
      {/* History Viewer */}
      {showHistory && (
        <HistoryViewer
          prompt={prompt}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};