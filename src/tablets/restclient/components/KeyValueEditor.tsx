import React, { useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { KeyValuePair } from '../types';
import { SensitiveDataManager } from '../../../utils/sensitiveDataManager';

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  placeholder?: string;
  valuePlaceholder?: string;
  suggestions?: string[];
  showSecrets?: boolean;
}

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  pairs,
  onChange,
  placeholder = 'Key',
  valuePlaceholder = 'Value',
  suggestions = [],
  showSecrets = true
}) => {
  const handleAddPair = () => {
    onChange([
      ...pairs,
      { key: '', value: '', enabled: true }
    ]);
  };
  
  const handleRemovePair = (index: number) => {
    const newPairs = [...pairs];
    newPairs.splice(index, 1);
    onChange(newPairs);
  };
  
  const handleTogglePair = (index: number) => {
    const newPairs = [...pairs];
    newPairs[index] = {
      ...newPairs[index],
      enabled: !newPairs[index].enabled
    };
    onChange(newPairs);
  };
  
  const handleChangePair = (index: number, field: 'key' | 'value', value: string) => {
    const newPairs = [...pairs];
    const currentPair = newPairs[index];
    
    if (field === 'value') {
      // Check if this is a sensitive variable based on the key
      const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth', 'api', 'access'];
      const isSensitive = sensitiveKeys.some(sensitiveKey => 
        currentPair.key.toLowerCase().includes(sensitiveKey)
      );
      
      // Mask the value if it's sensitive
      const maskedValue = isSensitive ? SensitiveDataManager.mask(value) : value;
      newPairs[index] = {
        ...currentPair,
        [field]: maskedValue
      };
    } else {
      newPairs[index] = {
        ...currentPair,
        [field]: value
      };
    }
    
    onChange(newPairs);
  };
  
  const getDisplayValue = (pair: KeyValuePair): string => {
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth', 'api', 'access'];
    const isSensitive = sensitiveKeys.some(sensitiveKey => 
      pair.key.toLowerCase().includes(sensitiveKey)
    );
    
    if (isSensitive && SensitiveDataManager.isMasked(pair.value)) {
      return SensitiveDataManager.unmask(pair.value);
    }
    return pair.value || '';
  };
  
  // Determine if a value should be masked (for sensitive data)
  const shouldMaskValue = (key: string): boolean => {
    if (showSecrets) return false;
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth', 'api', 'access'];
    return sensitiveKeys.some(sensitiveKey => key.toLowerCase().includes(sensitiveKey));
  };
  
  return (
    <div className="space-y-4">
      {pairs.length === 0 ? (
        <div className="text-center text-gray-400 py-4">
          No items yet. Click "Add" to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {pairs.map((pair, index) => (
            <div key={index} className="flex items-center space-x-2">
              <button
                onClick={() => handleTogglePair(index)}
                className={`
                  p-1.5 rounded-md transition-colors
                  ${pair.enabled
                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                  }
                `}
                title={pair.enabled ? 'Disable' : 'Enable'}
              >
                {pair.enabled ? <Check size={16} /> : <X size={16} />}
              </button>
              
              <input
                type="text"
                value={pair.key}
                onChange={(e) => handleChangePair(index, 'key', e.target.value)}
                placeholder={placeholder}
                className={`
                  flex-1 bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm
                  focus:outline-none focus:border-blue-500/50 transition-colors
                  ${pair.enabled ? 'text-gray-200' : 'text-gray-500'}
                `}
                list="key-suggestions"
                disabled={!pair.enabled}
              />
              
              <input
                type={shouldMaskValue(pair.key) ? 'password' : 'text'}
                value={getDisplayValue(pair)}
                onChange={(e) => handleChangePair(index, 'value', e.target.value)}
                placeholder={valuePlaceholder}
                className={`
                  flex-1 bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm
                  focus:outline-none focus:border-blue-500/50 transition-colors
                  ${pair.enabled ? 'text-gray-200' : 'text-gray-500'}
                `}
                disabled={!pair.enabled}
              />
              
              <button
                onClick={() => handleRemovePair(index)}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-md transition-colors"
                title="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <button
        onClick={handleAddPair}
        className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-sm text-gray-300 transition-colors"
      >
        <Plus size={16} />
        <span>Add</span>
      </button>
      
      {suggestions.length > 0 && (
        <datalist id="key-suggestions">
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
    </div>
  );
};