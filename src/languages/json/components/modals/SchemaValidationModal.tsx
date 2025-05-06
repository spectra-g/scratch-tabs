import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Editor } from '@monaco-editor/react';
import { validateJsonSchema } from '../../utils/jsonSchema';
import { CheckCircle2, XCircle } from 'lucide-react';

interface SchemaValidationModalProps {
  json: any;
  onClose: () => void;
}

export const SchemaValidationModal: React.FC<SchemaValidationModalProps> = ({ json, onClose }) => {
  const [schema, setSchema] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);

  const handleValidate = () => {
    try {
      const parsedSchema = JSON.parse(schema);
      const result = validateJsonSchema(json, parsedSchema);
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        valid: false,
        errors: [(error as Error).message]
      });
    }
  };

  return (
    <BaseModal title="JSON Schema Validation" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-row p-2 space-x-4">
          <div className="flex-1">
            {/* Schema Editor */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Schema</h3>
              <div className="h-64 border border-gray-700/50 rounded-lg overflow-hidden">
                <Editor
                  height="100%"
                  language="json"
                  value={schema}
                  onChange={(value) => setSchema(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on'
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex-1">
            {/* JSON Preview */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">JSON Data</h3>
              <div className="h-64 border border-gray-700/50 rounded-lg overflow-hidden">
                <Editor
                  height="100%"
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
          </div>
        </div>

        {/* Validation Results */}
        {validationResult && (
          <div className={`p-2 rounded-lg ${validationResult.valid ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
            <div className="flex items-center m-2">
              {validationResult.valid ? (
                <CheckCircle2 className="text-green-400 mr-2" size={20} />
              ) : (
                <XCircle className="text-red-400 mr-2" size={20} />
              )}
              <h3 className={`font-medium ${validationResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                {validationResult.valid ? 'Validation Passed' : 'Validation Failed'}
              </h3>
            </div>
            {!validationResult.valid && validationResult.errors.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-sm text-red-400 mt-2">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2 p-2">
          <button
            onClick={handleValidate}
            className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors"
          >
            Validate
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
