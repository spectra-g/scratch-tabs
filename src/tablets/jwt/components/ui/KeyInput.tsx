import React, { useState } from 'react';
import { Eye, EyeOff, Key, FileText, Database } from 'lucide-react';
import { KeyType } from '../../types';

interface KeyInputProps {
  value: string;
  onChange: (value: string, type: KeyType) => void;
  type: KeyType;
  onTypeChange: (type: KeyType) => void;
  label: string;
  placeholder?: string;
  isPrivate?: boolean;
}

export const KeyInput: React.FC<KeyInputProps> = ({
  value,
  onChange,
  type,
  onTypeChange,
  label,
  placeholder = 'Enter key...',
  isPrivate = false
}) => {
  const [showKey, setShowKey] = useState(false);
  
  const toggleShowKey = () => {
    setShowKey(!showKey);
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onTypeChange('text')}
            className={`px-2 py-1 text-xs rounded-md ${
              type === 'text'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
            title="Plain text"
          >
            <Key size={12} className="inline mr-1" />
            Text
          </button>
          <button
            type="button"
            onClick={() => onTypeChange('base64')}
            className={`px-2 py-1 text-xs rounded-md ${
              type === 'base64'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
            title="Base64 encoded"
          >
            <Database size={12} className="inline mr-1" />
            Base64
          </button>
          <button
            type="button"
            onClick={() => onTypeChange('pem')}
            className={`px-2 py-1 text-xs rounded-md ${
              type === 'pem'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
            title="PEM format"
          >
            <FileText size={12} className="inline mr-1" />
            PEM
          </button>
        </div>
      </div>
      
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value, type)}
          placeholder={placeholder}
          rows={5}
          className={`w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors ${
            isPrivate && !showKey ? 'text-security-disc' : ''
          }`}
          style={isPrivate && !showKey ? { WebkitTextSecurity: 'disc' } as React.CSSProperties : undefined}
        />
        
        {isPrivate && (
          <button
            type="button"
            onClick={toggleShowKey}
            className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-md transition-colors"
            title={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      
      {isPrivate && (
        <div className="text-yellow-400 text-xs flex items-center">
          <AlertTriangle size={12} className="mr-1" />
          <span>Warning: Be careful when pasting private keys or secrets</span>
        </div>
      )}
    </div>
  );
};

// Import AlertTriangle for the warning message
import { AlertTriangle } from 'lucide-react';