import React, { useState } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';
import { KeyValuePair } from '../types';
import { KeyValueEditor } from './KeyValueEditor';

interface VariablesEditorProps {
  variables: KeyValuePair[];
  onChange: (variables: KeyValuePair[]) => void;
}

export const VariablesEditor: React.FC<VariablesEditorProps> = ({
  variables,
  onChange
}) => {
  const [showSecrets, setShowSecrets] = useState(false);
  
  const handleChange = (newVariables: KeyValuePair[]) => {
    onChange(newVariables);
  };
  
  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3 text-sm text-blue-300 flex items-start">
        <Info size={16} className="mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <p>Variables can be used in URLs, headers, and body content using the <code className="bg-blue-500/20 px-1 rounded">{'{{variable}}'}</code> syntax.</p>
          <p className="mt-1">Example: <code className="bg-blue-500/20 px-1 rounded">https://{'{{host}}'}/api/users</code></p>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={() => setShowSecrets(!showSecrets)}
          className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-sm text-gray-300 transition-colors"
        >
          {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{showSecrets ? 'Hide Secrets' : 'Show Secrets'}</span>
        </button>
      </div>
      
      <KeyValueEditor
        pairs={variables}
        onChange={handleChange}
        placeholder="Variable name"
        valuePlaceholder="Variable value"
        showSecrets={showSecrets}
      />
    </div>
  );
};