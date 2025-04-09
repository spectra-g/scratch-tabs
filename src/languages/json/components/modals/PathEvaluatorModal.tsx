import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Editor } from '@monaco-editor/react';

interface PathEvaluatorModalProps {
  json: any;
  onClose: () => void;
}

export const PathEvaluatorModal: React.FC<PathEvaluatorModalProps> = ({ json, onClose }) => {
  const [path, setPath] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const evaluatePath = (path: string) => {
    try {
      let current = json;
      if (!path) {
        setResult(null);
        setError(null);
        return;
      }

      // Handle array indices and object properties
      const parts = path.split(/[.\[\]]/).filter(Boolean);
      for (const part of parts) {
        if (current === undefined || current === null) {
          throw new Error(`Cannot read property '${part}' of ${current}`);
        }
        current = current[part];
      }

      setResult(current);
      setError(null);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Invalid path');
    }
  };

  return (
    <BaseModal title="JSON Path Evaluator" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Enter JSON Path:
          </label>
          <input
            type="text"
            value={path}
            onChange={(e) => {
              setPath(e.target.value);
              evaluatePath(e.target.value);
            }}
            placeholder="e.g., users[0].name or data.items[2].id"
            className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 placeholder-gray-500"
          />
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-md p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {result !== null && !error && (
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Result:</h3>
            <Editor
              height="100px"
              language="json"
              value={JSON.stringify(result, null, 2)}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on'
              }}
            />
          </div>
        )}

        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">JSON Preview:</h3>
          <Editor
            height="350px"
            language="json"
            value={JSON.stringify(json, null, 2)}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on'
            }}
          />
        </div>
      </div>
    </BaseModal>
  );
};