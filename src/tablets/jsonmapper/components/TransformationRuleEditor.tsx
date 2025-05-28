import React, { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { X, Save } from 'lucide-react';
import { MappingRule, TransformationType } from '../types';
import { jsonPathToReadablePath, readablePathToJsonPath, getValueByPath } from '../utils/jsonUtils';

interface TransformationRuleEditorProps {
  rule: MappingRule;
  onSave: (rule: MappingRule) => void;
  onCancel: () => void;
  sourceJson: string;
  targetJson: string;
}

export const TransformationRuleEditor: React.FC<TransformationRuleEditorProps> = ({
  rule,
  onSave,
  onCancel,
  sourceJson,
  targetJson
}) => {
  const [sourcePath, setSourcePath] = useState(jsonPathToReadablePath(rule.sourcePath));
  const [targetPath, setTargetPath] = useState(jsonPathToReadablePath(rule.targetPath));
  const [transformationType, setTransformationType] = useState<TransformationType>(rule.transformationType);
  const [transformation, setTransformation] = useState(rule.transformation);
  const [sourceValue, setSourceValue] = useState<any>(null);
  const [targetValue, setTargetValue] = useState<any>(null);
  const [previewValue, setPreviewValue] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Load source and target values when the component mounts
  useEffect(() => {
    try {
      if (sourceJson) {
        const sourceData = JSON.parse(sourceJson);
        if (rule.sourcePath) {
          const value = getValueByPath(sourceData, rule.sourcePath);
          setSourceValue(value);
        }
      }
      
      if (targetJson) {
        const targetData = JSON.parse(targetJson);
        if (rule.targetPath) {
          const value = getValueByPath(targetData, rule.targetPath);
          setTargetValue(value);
        }
      }
    } catch (error) {
      console.error('Error loading values:', error);
    }
  }, [rule.sourcePath, rule.targetPath, sourceJson, targetJson]);
  
  // Update preview when transformation changes
  useEffect(() => {
    if (sourceValue === null) return;
    
    try {
      if (transformationType === 'none') {
        setPreviewValue(sourceValue);
        setError(null);
      } else if (transformationType === 'builtin') {
        // Apply built-in transformation
        const [funcName, ...args] = transformation.split('(');
        const argsStr = args.join('(').replace(/\)$/, '');
        const parsedArgs = argsStr ? argsStr.split(',').map(arg => arg.trim()) : [];
        
        switch (funcName.trim()) {
          case 'toUpperCase':
            setPreviewValue(String(sourceValue).toUpperCase());
            break;
          case 'toLowerCase':
            setPreviewValue(String(sourceValue).toLowerCase());
            break;
          case 'trim':
            setPreviewValue(String(sourceValue).trim());
            break;
          case 'substring':
            setPreviewValue(String(sourceValue).substring(
              parseInt(parsedArgs[0] || '0'),
              parsedArgs[1] ? parseInt(parsedArgs[1]) : undefined
            ));
            break;
          case 'append':
            setPreviewValue(String(sourceValue) + (parsedArgs[0] || ''));
            break;
          case 'prepend':
            setPreviewValue((parsedArgs[0] || '') + String(sourceValue));
            break;
          case 'toNumber':
            setPreviewValue(Number(sourceValue));
            break;
          case 'toString':
            setPreviewValue(String(sourceValue));
            break;
          case 'toBoolean':
            setPreviewValue(Boolean(sourceValue));
            break;
          case 'formatDate':
            try {
              setPreviewValue(new Date(sourceValue).toISOString());
            } catch (error) {
              setError('Invalid date');
              setPreviewValue(null);
            }
            break;
          case 'toTimestamp':
            try {
              setPreviewValue(new Date(sourceValue).getTime());
            } catch (error) {
              setError('Invalid date');
              setPreviewValue(null);
            }
            break;
          case 'join':
            if (Array.isArray(sourceValue)) {
              setPreviewValue(sourceValue.join(parsedArgs[0] || ','));
            } else {
              setError('Source value is not an array');
              setPreviewValue(sourceValue);
            }
            break;
          case 'firstElement':
            if (Array.isArray(sourceValue) && sourceValue.length > 0) {
              setPreviewValue(sourceValue[0]);
            } else {
              setError('Source value is not an array or is empty');
              setPreviewValue(null);
            }
            break;
          case 'lastElement':
            if (Array.isArray(sourceValue) && sourceValue.length > 0) {
              setPreviewValue(sourceValue[sourceValue.length - 1]);
            } else {
              setError('Source value is not an array or is empty');
              setPreviewValue(null);
            }
            break;
          default:
            setError(`Unknown transformation: ${funcName}`);
            setPreviewValue(sourceValue);
        }
      } else if (transformationType === 'custom') {
        try {
          // Create a function from the transformation string
          const transformFn = new Function(
            'sourceValue',
            'sourceObject',
            `"use strict"; return (${transformation});`
          );
          
          // Execute the function with the source value
          const sourceData = sourceJson ? JSON.parse(sourceJson) : {};
          const result = transformFn(sourceValue, sourceData);
          
          setPreviewValue(result);
          setError(null);
        } catch (error) {
          console.error('Error applying custom transformation:', error);
          setError(error instanceof Error ? error.message : 'Invalid transformation');
          setPreviewValue(null);
        }
      }
    } catch (error) {
      console.error('Error updating preview:', error);
      setError(error instanceof Error ? error.message : 'Error updating preview');
    }
  }, [sourceValue, transformationType, transformation, sourceJson]);
  
  const handleSave = () => {
    try {
      const normalizedSourcePath = sourcePath ? readablePathToJsonPath(sourcePath) : '';
      const normalizedTargetPath = targetPath ? readablePathToJsonPath(targetPath) : '';
      
      onSave({
        ...rule,
        sourcePath: normalizedSourcePath,
        targetPath: normalizedTargetPath,
        transformationType,
        transformation,
        isUserDefined: true
      });
    } catch (error) {
      console.error('Error saving rule:', error);
      setError(error instanceof Error ? error.message : 'Error saving rule');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold text-gray-100">
            Edit Mapping Rule
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          <div className="space-y-6">
            {/* Paths */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Source Path
                </label>
                <input
                  type="text"
                  value={sourcePath}
                  onChange={(e) => setSourcePath(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                  placeholder="e.g., user.firstName"
                />
                {sourceValue !== null && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-400 mb-1">Source Value:</div>
                    <div className="bg-gray-900/50 border border-gray-700/50 rounded-md p-2 text-sm text-gray-200 font-mono overflow-auto max-h-20">
                      {typeof sourceValue === 'object'
                        ? JSON.stringify(sourceValue, null, 2)
                        : String(sourceValue)
                      }
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Path
                </label>
                <input
                  type="text"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                  placeholder="e.g., person.name"
                />
                {targetValue !== null && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-400 mb-1">Target Value:</div>
                    <div className="bg-gray-900/50 border border-gray-700/50 rounded-md p-2 text-sm text-gray-200 font-mono overflow-auto max-h-20">
                      {typeof targetValue === 'object'
                        ? JSON.stringify(targetValue, null, 2)
                        : String(targetValue)
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Transformation */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Transformation
              </label>
              <div className="flex space-x-4 mb-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={transformationType === 'none'}
                    onChange={() => setTransformationType('none')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-300">None</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={transformationType === 'builtin'}
                    onChange={() => setTransformationType('builtin')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-300">Built-in</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={transformationType === 'custom'}
                    onChange={() => setTransformationType('custom')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-300">Custom</span>
                </label>
              </div>
              
              {transformationType === 'builtin' && (
                <div className="mb-4">
                  <select
                    value={transformation}
                    onChange={(e) => setTransformation(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
                  >
                    <option value="">Select a transformation...</option>
                    <optgroup label="String">
                      <option value="toUpperCase()">toUpperCase()</option>
                      <option value="toLowerCase()">toLowerCase()</option>
                      <option value="trim()">trim()</option>
                      <option value="substring(0, 10)">substring(start, end)</option>
                      <option value="append(text)">append(text)</option>
                      <option value="prepend(text)">prepend(text)</option>
                    </optgroup>
                    <optgroup label="Type Conversion">
                      <option value="toNumber()">toNumber()</option>
                      <option value="toString()">toString()</option>
                      <option value="toBoolean()">toBoolean()</option>
                    </optgroup>
                    <optgroup label="Date">
                      <option value="formatDate()">formatDate()</option>
                      <option value="toTimestamp()">toTimestamp()</option>
                    </optgroup>
                    <optgroup label="Array">
                      <option value="join(,)">join(separator)</option>
                      <option value="firstElement()">firstElement()</option>
                      <option value="lastElement()">lastElement()</option>
                    </optgroup>
                  </select>
                </div>
              )}
              
              {transformationType === 'custom' && (
                <div className="mb-4">
                  <div className="text-xs text-gray-400 mb-1">
                    Enter a JavaScript expression. You have access to:
                    <ul className="list-disc list-inside mt-1 ml-2">
                      <li><code className="bg-gray-700/50 px-1 rounded">sourceValue</code> - The value at the source path</li>
                      <li><code className="bg-gray-700/50 px-1 rounded">sourceObject</code> - The entire source object</li>
                    </ul>
                  </div>
                  <div className="border border-gray-700/50 rounded-md overflow-hidden">
                    <Editor
                      height="150px"
                      language="javascript"
                      value={transformation}
                      onChange={(value) => setTransformation(value || '')}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        padding: { top: 8, bottom: 8 },
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Preview */}
              <div>
                <div className="text-xs text-gray-400 mb-1">Transformation Preview:</div>
                <div className="bg-gray-900/50 border border-gray-700/50 rounded-md p-2 text-sm text-gray-200 font-mono overflow-auto max-h-20">
                  {error ? (
                    <span className="text-red-400">{error}</span>
                  ) : previewValue !== null ? (
                    typeof previewValue === 'object'
                      ? JSON.stringify(previewValue, null, 2)
                      : String(previewValue)
                  ) : (
                    <span className="text-gray-500">No preview available</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-700/50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="ml-3 px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors flex items-center"
          >
            <Save size={16} className="mr-2" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};