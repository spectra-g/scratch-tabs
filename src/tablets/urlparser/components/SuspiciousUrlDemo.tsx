import React, { useState } from 'react';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { getSuspiciousUrlExamples } from '../utils/urlUtils';

interface SuspiciousUrlDemoProps {
  onSelectUrl: (url: string) => void;
  onClose: () => void;
}

export const SuspiciousUrlDemo: React.FC<SuspiciousUrlDemoProps> = ({
  onSelectUrl,
  onClose
}) => {
  const examples = getSuspiciousUrlExamples();
  const [selectedExample, setSelectedExample] = useState<number | null>(null);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={18} className="text-yellow-500" />
            <h3 className="text-lg font-medium text-gray-200">Suspicious URL Examples</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
          >
            <X size={18} />
          </button>
        </div>
        
        <p className="text-gray-300 mb-4">
          These examples demonstrate common URL-based attacks and security issues. 
          Select an example to analyze it with the URL Parser.
        </p>
        
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {examples.map((example, index) => (
            <div 
              key={index}
              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                selectedExample === index 
                  ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-200' 
                  : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-yellow-500/30'
              }`}
              onClick={() => setSelectedExample(index)}
            >
              <div className="font-mono text-sm mb-1 break-all">{example.url}</div>
              <div className="text-sm text-gray-400">{example.description}</div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={() => {
              if (selectedExample !== null) {
                onSelectUrl(examples[selectedExample].url);
                onClose();
              }
            }}
            disabled={selectedExample === null}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
              selectedExample !== null
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>Analyze Selected URL</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};