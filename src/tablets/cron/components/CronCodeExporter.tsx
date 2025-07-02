import React, { useState } from 'react';
import { X, Copy, Check, Code } from 'lucide-react';
import { CronDialect } from '../types';
import { getCronCodeSnippets } from '../utils/codeSnippets';

interface CronCodeExporterProps {
  expression: string;
  dialect: CronDialect;
  onClose: () => void;
}

export const CronCodeExporter: React.FC<CronCodeExporterProps> = ({
  expression,
  dialect,
  onClose
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [selectedFramework, setSelectedFramework] = useState('node-cron');
  const [copied, setCopied] = useState(false);
  
  const snippets = getCronCodeSnippets(expression, dialect);
  
  // Get available languages
  const languages = Array.from(new Set(snippets.map(snippet => snippet.language)));
  
  // Get available frameworks for selected language
  const frameworks = snippets
    .filter(snippet => snippet.language === selectedLanguage)
    .map(snippet => ({ value: snippet.framework, label: snippet.framework }));
  
  // Get selected snippet
  const selectedSnippet = snippets.find(
    snippet => snippet.language === selectedLanguage && snippet.framework === selectedFramework
  );
  
  const handleCopy = () => {
    if (selectedSnippet) {
      navigator.clipboard.writeText(selectedSnippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-3xl w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center">
            <Code size={20} className="text-blue-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-200">Code Snippets</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  // Reset framework when language changes
                  const firstFramework = snippets.find(s => s.language === e.target.value)?.framework;
                  if (firstFramework) {
                    setSelectedFramework(firstFramework);
                  }
                }}
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {languages.map((language) => (
                  <option key={language} value={language}>
                    {language.charAt(0).toUpperCase() + language.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1">Framework/Library</label>
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {frameworks.map((framework) => (
                  <option key={framework.value} value={framework.value}>
                    {framework.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="md:ml-auto">
              <button
                onClick={handleCopy}
                className="flex items-center bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-2 rounded-md text-sm transition-colors"
              >
                {copied ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>
          
          {selectedSnippet?.installCommand && (
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">Installation</label>
              <div className="bg-gray-900 rounded-md p-3 font-mono text-sm text-gray-300 overflow-x-auto">
                {selectedSnippet.installCommand}
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-xs text-gray-400 mb-1">Code Snippet</label>
            <pre className="bg-gray-900 rounded-md p-3 font-mono text-sm text-gray-300 overflow-x-auto max-h-96 custom-scrollbar">
              {selectedSnippet?.code || 'No code available for this selection.'}
            </pre>
          </div>
          
          {selectedSnippet?.description && (
            <div className="mt-4 p-3 bg-gray-700/50 rounded-md">
              <p className="text-sm text-gray-300">{selectedSnippet.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};