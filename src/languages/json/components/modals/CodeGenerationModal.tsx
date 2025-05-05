import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Editor } from '@monaco-editor/react';
import { Tab } from '../../../../types';
import { Copy, ExternalLink, Check } from 'lucide-react';

interface CodeTab {
  id: string;
  title: string;
  content: string;
  language: string;
}

interface CodeGenerationModalProps {
  tabs: CodeTab[];
  onClose: () => void;
  addTab: (tab: Tab) => void;
}

export const CodeGenerationModal: React.FC<CodeGenerationModalProps> = ({ tabs, onClose, addTab }) => {
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id || '');
  const [copiedTabId, setCopiedTabId] = useState<string | null>(null);

  const handleCopyContent = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    await navigator.clipboard.writeText(tab.content);
    setCopiedTabId(tabId);
    setTimeout(() => setCopiedTabId(null), 1500);
  };

  const handleOpenInNewTab = (tab: CodeTab) => {
    addTab({
      id: crypto.randomUUID(),
      title: tab.title,
      content: tab.content,
      language: tab.language,
      languageLocked: true
    });
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <BaseModal title="Generated Code" onClose={onClose}>
      <div className="flex flex-col h-[70vh]">
        <div className="flex flex-row justify-between">
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-800 p-2 rounded-t-lg">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${activeTabId === tab.id
                    ? 'bg-gray-700 text-gray-200'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                  }
                `}
              >
                {tab.title}
              </button>
            ))}
          </div>
          {activeTab && (
            <div className="flex items-center justify-end space-x-2 px-4 py-2">
              <button
                onClick={() => handleCopyContent(activeTab.id)}
                className={`p-2 rounded-md transition-colors ${copiedTabId === activeTab.id ? 'text-green-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'}`}
                title="Copy to clipboard"
              >
                {copiedTabId === activeTab.id ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <button
                onClick={() => handleOpenInNewTab(activeTab)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors"
              >
                <ExternalLink size={16} />
                <span>Open in New Tab</span>
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-800 rounded-b-lg overflow-hidden">
          {activeTab && (
            <div className="h-full flex flex-col">
              {/* Editor */}
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={activeTab.language}
                  value={activeTab.content}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    padding: { top: 16, bottom: 16 },
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};