import React, { useState } from 'react';
import { Copy, Plus, RefreshCw, Download, Check } from '../../../components/Icons';
import { GenerationMode } from '../types';

interface OutputAreaProps {
  content: string;
  mode: GenerationMode;
  isGenerating: boolean;
  onGenerate: () => void;
  onCreateNewTab: () => void;
}

export const OutputArea: React.FC<OutputAreaProps> = ({
  content,
  mode,
  isGenerating,
  onGenerate,
  onCreateNewTab,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      // Silently handle copy failures - user will see no feedback
    }
  };

  const handleDownload = () => {
    const extensions = {
      text: 'txt',
      html: 'html',
      markdown: 'md',
      json: 'json',
      custom: 'txt'
    };

    const extension = extensions[mode];
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-content.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLanguageClass = () => {
    switch (mode) {
      case 'html': return 'language-html';
      case 'markdown': return 'language-markdown';
      case 'json': return 'language-json';
      default: return 'language-text';
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-main">Generated Content</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-3 py-2 bg-primary hover:bg-primary/90 disabled:bg-surface-secondary disabled:cursor-not-allowed text-white rounded-md transition-colors text-sm"
          >
            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
            <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
          </button>

          <button
            onClick={handleCopy}
            disabled={!content || isGenerating}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm ${copySuccess
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-surface-secondary hover:bg-element-hover disabled:bg-surface disabled:cursor-not-allowed text-main'
              }`}
          >
            {copySuccess ? <Check size={14} /> : <Copy size={14} />}
            <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={onCreateNewTab}
            disabled={!content || isGenerating}
            className="flex items-center space-x-2 px-3 py-2 bg-success hover:bg-success/90 disabled:bg-surface-secondary disabled:cursor-not-allowed text-white rounded-md transition-colors text-sm"
          >
            <Plus size={14} />
            <span>New Tab</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={!content || isGenerating}
            className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-surface-secondary disabled:cursor-not-allowed text-white rounded-md transition-colors text-sm"
          >
            <Download size={14} />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Content Display */}
      <div className="relative">
        <div className="bg-canvas border border-base rounded-lg overflow-hidden">
          <div className="bg-surface-raised px-4 py-2 border-b border-base">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">
                {mode.toUpperCase()} Output
              </span>
              <span className="text-xs text-muted">
                {content.length.toLocaleString()} characters
              </span>
            </div>
          </div>

          <div className="relative">
            <pre className={`p-4 text-sm text-main overflow-auto max-h-96 custom-scrollbar ${getLanguageClass()}`}>
              <code>{content || 'Click "Generate" to create content...'}</code>
            </pre>

            {isGenerating && (
              <div className="absolute inset-0 bg-canvas/80 flex items-center justify-center">
                <div className="flex items-center space-x-3 text-main">
                  <RefreshCw size={20} className="animate-spin" />
                  <span>Generating content...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Stats */}
      {content && !isGenerating && (
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-surface-raised p-3 rounded-md border border-base">
            <div className="text-lg font-semibold text-main">
              {content.length.toLocaleString()}
            </div>
            <div className="text-xs text-muted">Characters</div>
          </div>
          <div className="bg-surface-raised p-3 rounded-md border border-base">
            <div className="text-lg font-semibold text-main">
              {content.split(/\s+/).filter(w => w.length > 0).length.toLocaleString()}
            </div>
            <div className="text-xs text-muted">Words</div>
          </div>
          <div className="bg-surface-raised p-3 rounded-md border border-base">
            <div className="text-lg font-semibold text-main">
              {content.split('\n').length.toLocaleString()}
            </div>
            <div className="text-xs text-muted">Lines</div>
          </div>
        </div>
      )}
    </div>
  );
};