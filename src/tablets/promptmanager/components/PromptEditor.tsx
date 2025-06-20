import React, { useState, useRef, useEffect } from 'react';
import { Copy, Eye, EyeOff, Tag as TagIcon, Check, X, Plus } from 'lucide-react';
import { Prompt, Tag, Snippet } from '../types';
import { MarkdownPreview } from './MarkdownPreview';
import { SnippetSelector } from './SnippetSelector';

interface PromptEditorProps {
  prompt: Prompt;
  onUpdatePrompt: (id: string, updates: Partial<Omit<Prompt, 'id' | 'createdAt'>>) => void;
  onIncrementUsage: (id: string) => void;
  tags: Tag[];
  snippets: Snippet[];
  showPreview: boolean;
  onTogglePreview: () => void;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  onUpdatePrompt,
  onIncrementUsage,
  tags,
  snippets,
  showPreview,
  onTogglePreview
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(prompt.title);
  const [content, setContent] = useState(prompt.content);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showSnippetSelector, setShowSnippetSelector] = useState(false);
  const [copied, setCopied] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Update local state when prompt changes
  useEffect(() => {
    setTitle(prompt.title);
    setContent(prompt.content);
    
    // Auto-enter edit mode for new prompts (empty content and default title)
    const isNewPrompt = prompt.content === '' && (prompt.title === 'Untitled Prompt' || prompt.title === 'New Prompt');
    if (isNewPrompt) {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  }, [prompt.id, prompt.title, prompt.content]);
  
  // Focus title input when editing starts
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);
  
  const handleSave = () => {
    onUpdatePrompt(prompt.id, {
      title: title.trim() || 'Untitled Prompt',
      content
    });
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setTitle(prompt.title);
    setContent(prompt.content);
    setIsEditing(false);
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
  
  const handleInsertSnippet = (snippetContent: string) => {
    // Get cursor position
    const textarea = contentTextareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const textBefore = content.substring(0, cursorPos);
    const textAfter = content.substring(cursorPos);
    
    // Insert snippet at cursor position
    const newContent = `${textBefore}${snippetContent}${textAfter}`;
    setContent(newContent);
    
    // Update prompt content
    onUpdatePrompt(prompt.id, { content: newContent });
    
    // Close snippet selector
    setShowSnippetSelector(false);
    
    // Focus textarea and set cursor position after inserted snippet
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = cursorPos + snippetContent.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
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
              onChange={(e) => setTitle(e.target.value)}
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
                className={`p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md ${
                  showPreview ? 'bg-gray-700/50' : ''
                }`}
                onClick={onTogglePreview}
                title={showPreview ? 'Hide preview' : 'Show preview'}
              >
                {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md"
                onClick={() => {
                  setIsEditing(true);
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
      
      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className={`flex-1 flex flex-col overflow-hidden ${showPreview ? 'md:w-1/2' : 'w-full'}`}>
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
          
          {/* Editor Area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isEditing ? (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between p-2 bg-gray-800/50 border-b border-gray-700/50">
                  <span className="text-xs text-gray-400">Markdown supported</span>
                  
                  <div className="relative">
                    <button
                      className="px-2 py-1 text-xs bg-gray-700/50 hover:bg-gray-700 rounded text-gray-300"
                      onClick={() => setShowSnippetSelector(!showSnippetSelector)}
                    >
                      Insert Snippet
                    </button>
                    
                    {showSnippetSelector && (
                      <SnippetSelector
                        snippets={snippets}
                        onSelectSnippet={(snippetContent) => handleInsertSnippet(snippetContent)}
                        onClose={() => setShowSnippetSelector(false)}
                      />
                    )}
                  </div>
                </div>
                
                <textarea
                  ref={contentTextareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your prompt here..."
                  className="flex-1 w-full bg-gray-900 text-gray-200 p-4 resize-none focus:outline-none custom-scrollbar font-mono text-sm leading-relaxed"
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300 leading-relaxed">
                  {prompt.content || <span className="text-gray-500 italic">No content</span>}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        {/* Preview */}
        {showPreview && (
          <div className="hidden md:block md:w-1/2 border-l border-gray-700/50 overflow-hidden">
            <div className="h-full overflow-y-auto custom-scrollbar">
              <MarkdownPreview content={content} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};