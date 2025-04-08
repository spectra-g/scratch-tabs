import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Editor } from '@monaco-editor/react';

interface PathFinderModalProps {
  json: any;
  onClose: () => void;
}

export const PathFinderModal: React.FC<PathFinderModalProps> = ({ json, onClose }) => {
  const [paths, setPaths] = useState<string[]>([]);

  const findPaths = (obj: any, currentPath: string = '') => {
    const results: string[] = [];

    const traverse = (obj: any, path: string) => {
      if (obj === null) return;

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          traverse(item, `${path}[${index}]`);
        });
      } else if (typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
          const newPath = path ? `${path}.${key}` : key;
          results.push(newPath);
          traverse(value, newPath);
        });
      }
    };

    traverse(obj, currentPath);
    return results;
  };

  React.useEffect(() => {
    setPaths(findPaths(json));
  }, [json]);

  return (
    <BaseModal title="JSON Path Finder" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Available Paths:</h3>
          <div className="space-y-1">
            {paths.map((path, index) => (
              <div
                key={index}
                className="font-mono text-sm text-gray-200 hover:bg-gray-800 p-1 rounded cursor-pointer"
                onClick={() => navigator.clipboard.writeText(path)}
                title="Click to copy"
              >
                {path}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">JSON Preview:</h3>
          <Editor
            height="200px"
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