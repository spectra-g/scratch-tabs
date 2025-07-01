import React, { useState, useCallback } from 'react';
import { Eye, EyeOff, AlertTriangle, Info, Copy } from 'lucide-react';
import { UrlComponents, UrlWarning } from '../types';
import { decodeComponent } from '../utils/urlUtils';

interface ComponentEditorProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  component: keyof UrlComponents;
  warnings: UrlWarning[];
  isEncoded: boolean;
  onChange: (value: string, component: keyof UrlComponents) => void;
  onToggleEncoding?: () => void;
  sensitive?: boolean;
}

export const ComponentEditor: React.FC<ComponentEditorProps> = ({
  label,
  icon,
  value,
  component,
  warnings,
  isEncoded,
  onChange,
  onToggleEncoding,
  sensitive = false
}) => {
  const [revealed, setRevealed] = useState(!sensitive);
  const [isCopied, setIsCopied] = useState(false);
  
  // Get warnings for this component
  const componentWarnings = warnings.filter(w => w.component === component);
  const hasError = componentWarnings.some(w => w.type === 'error');
  const hasWarning = componentWarnings.some(w => w.type === 'warning');
  
  // Display value (decoded or encoded)
  const displayValue = isEncoded ? value : decodeComponent(value, component);
  
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayValue);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [displayValue]);
  
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {icon}
          <h3 className="text-sm font-medium text-gray-200 ml-2">{label}</h3>
        </div>
        <div className="flex items-center space-x-1">
          {hasError && (
            <div className="text-red-500" title={componentWarnings.find(w => w.type === 'error')?.message}>
              <AlertTriangle size={14} />
            </div>
          )}
          {!hasError && hasWarning && (
            <div className="text-yellow-500" title={componentWarnings.find(w => w.type === 'warning')?.message}>
              <AlertTriangle size={14} />
            </div>
          )}
          {onToggleEncoding && (
            <button
              onClick={onToggleEncoding}
              className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
              title={isEncoded ? "Show decoded" : "Show encoded"}
            >
              {isEncoded ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
            title="Copy value"
          >
            <Copy size={14} className={isCopied ? "text-green-500" : ""} />
          </button>
        </div>
      </div>
      
      <div className="relative">
        <input
          type={revealed ? "text" : "password"}
          value={displayValue}
          onChange={(e) => onChange(e.target.value, component)}
          className={`w-full bg-gray-800 border ${
            hasError ? 'border-red-500' : hasWarning ? 'border-yellow-500' : 'border-gray-700'
          } rounded-md px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500`}
        />
        
        {sensitive && (
          <button
            onClick={() => setRevealed(!revealed)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
            title={revealed ? "Hide value" : "Show value"}
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      
      {componentWarnings.length > 0 && (
        <div className="mt-1 text-xs">
          {componentWarnings.map((warning, index) => (
            <div 
              key={index}
              className={`flex items-start mt-1 ${
                warning.type === 'error' ? 'text-red-400' : 'text-yellow-400'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {warning.type === 'error' ? (
                  <AlertTriangle size={12} />
                ) : (
                  <Info size={12} />
                )}
              </div>
              <div className="ml-1">{warning.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};