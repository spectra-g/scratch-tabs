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
  
  // Builtin transformation state
  const [selectedBuiltin, setSelectedBuiltin] = useState('');
  const [builtinParams, setBuiltinParams] = useState<{ [key: string]: string }>({});
  
  // Preserve builtin state when switching modes
  const [savedBuiltinState, setSavedBuiltinState] = useState<{
    selectedBuiltin: string;
    builtinParams: { [key: string]: string };
    transformation: string;
  }>({ selectedBuiltin: '', builtinParams: {}, transformation: '' });
  
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

  // Initialize builtin transformation from existing rule
  useEffect(() => {
    if (transformationType === 'builtin' && transformation) {
      // Parse existing builtin transformation
      const match = transformation.match(/^(\w+)\((.*)\)$/);
      if (match) {
        const [, funcName, argsStr] = match;
        setSelectedBuiltin(funcName);
        
        // Parse parameters
        const params: { [key: string]: string } = {};
        if (argsStr) {
          const args = argsStr.split(',').map(arg => arg.trim().replace(/['"]/g, ''));
          switch (funcName) {
            case 'substring':
              params.start = args[0] || '0';
              params.end = args[1] || '';
              break;
            case 'append':
            case 'prepend':
              params.text = args[0] || '';
              break;
            case 'join':
              params.separator = args[0] || ',';
              break;
            case 'toFixed':
              params.decimals = args[0] || '0';
              break;
            case 'add':
            case 'subtract':
            case 'multiply':
            case 'divide':
              params.value = args[0] || (funcName === 'divide' || funcName === 'multiply' ? '1' : '0');
              break;
            case 'default':
              params.defaultValue = args[0] || '';
              break;
          }
        }
        setBuiltinParams(params);
      }
    }
  }, [transformationType, transformation]);

  // Update transformation string when builtin params change
  useEffect(() => {
    if (transformationType === 'builtin' && selectedBuiltin) {
      let transformationStr = '';
      switch (selectedBuiltin) {
        case 'toUpperCase':
        case 'toLowerCase':
        case 'capitalize':
        case 'trim':
        case 'toNumber':
        case 'toString':
        case 'toBoolean':
        case 'formatDate':
        case 'toTimestamp':
        case 'firstElement':
        case 'lastElement':
        case 'round':
        case 'floor':
        case 'ceil':
        case 'not':
        case 'isEmpty':
        case 'isNull':
        case 'length':
          transformationStr = `${selectedBuiltin}()`;
          break;
        case 'substring':
          const start = builtinParams.start || '0';
          const end = builtinParams.end || '';
          transformationStr = end ? `${selectedBuiltin}(${start}, ${end})` : `${selectedBuiltin}(${start})`;
          break;
        case 'append':
          transformationStr = `${selectedBuiltin}("${builtinParams.text || ''}")`;
          break;
        case 'prepend':
          transformationStr = `${selectedBuiltin}("${builtinParams.text || ''}")`;
          break;
        case 'join':
          transformationStr = `${selectedBuiltin}("${builtinParams.separator || ','}")`;
          break;
        case 'toFixed':
          transformationStr = `${selectedBuiltin}(${builtinParams.decimals || '0'})`;
          break;
        case 'add':
        case 'subtract':
        case 'multiply':
        case 'divide':
          transformationStr = `${selectedBuiltin}(${builtinParams.value || (selectedBuiltin === 'divide' || selectedBuiltin === 'multiply' ? '1' : '0')})`;
          break;
        case 'default':
          transformationStr = `${selectedBuiltin}("${builtinParams.defaultValue || ''}")`;
          break;
      }
      setTransformation(transformationStr);
    }
  }, [transformationType, selectedBuiltin, builtinParams]);
  
  // Update preview when transformation changes
  useEffect(() => {
    if (sourceValue === null) return;
    
    try {
      if (transformationType === 'none') {
        setPreviewValue(sourceValue);
        setError(null);
      } else if (transformationType === 'builtin') {
        // If no transformation is selected yet, show source value
        if (!transformation || !selectedBuiltin) {
          setPreviewValue(sourceValue);
          setError(null);
          return;
        }

        // Apply built-in transformation
        const [funcName, ...args] = transformation.split('(');
        const argsStr = args.join('(').replace(/\)$/, '');
        const parsedArgs = argsStr ? argsStr.split(',').map(arg => arg.trim().replace(/['"]/g, '')) : [];
        
        switch (funcName.trim()) {
          case 'toUpperCase':
            setPreviewValue(String(sourceValue).toUpperCase());
            setError(null);
            break;
          case 'toLowerCase':
            setPreviewValue(String(sourceValue).toLowerCase());
            setError(null);
            break;
          case 'capitalize':
            const str = String(sourceValue);
            setPreviewValue(str.charAt(0).toUpperCase() + str.slice(1).toLowerCase());
            setError(null);
            break;
          case 'trim':
            setPreviewValue(String(sourceValue).trim());
            setError(null);
            break;
          case 'substring':
            const start = parseInt(parsedArgs[0] || '0');
            const end = parsedArgs[1] ? parseInt(parsedArgs[1]) : undefined;
            setPreviewValue(String(sourceValue).substring(start, end));
            setError(null);
            break;
          case 'append':
            setPreviewValue(String(sourceValue) + (parsedArgs[0] || ''));
            setError(null);
            break;
          case 'prepend':
            setPreviewValue((parsedArgs[0] || '') + String(sourceValue));
            setError(null);
            break;
          case 'length':
            setPreviewValue((Array.isArray(sourceValue) || typeof sourceValue === 'string') ? sourceValue.length : 0);
            setError(null);
            break;
          case 'toNumber':
            setPreviewValue(Number(sourceValue));
            setError(null);
            break;
          case 'toString':
            setPreviewValue(String(sourceValue));
            setError(null);
            break;
          case 'toBoolean':
            setPreviewValue(Boolean(sourceValue));
            setError(null);
            break;
          case 'round':
            setPreviewValue(Math.round(Number(sourceValue)));
            setError(null);
            break;
          case 'floor':
            setPreviewValue(Math.floor(Number(sourceValue)));
            setError(null);
            break;
          case 'ceil':
            setPreviewValue(Math.ceil(Number(sourceValue)));
            setError(null);
            break;
          case 'toFixed':
            const decimals = parseInt(parsedArgs[0] || '0');
            setPreviewValue(Number(sourceValue).toFixed(decimals));
            setError(null);
            break;
          case 'add':
            setPreviewValue(Number(sourceValue) + Number(parsedArgs[0] || 0));
            setError(null);
            break;
          case 'subtract':
            setPreviewValue(Number(sourceValue) - Number(parsedArgs[0] || 0));
            setError(null);
            break;
          case 'multiply':
            setPreviewValue(Number(sourceValue) * Number(parsedArgs[0] || 1));
            setError(null);
            break;
          case 'divide':
            const divisor = Number(parsedArgs[0] || 1);
            if (divisor === 0) {
              setError('Cannot divide by zero');
              setPreviewValue(sourceValue);
            } else {
              setPreviewValue(Number(sourceValue) / divisor);
              setError(null);
            }
            break;
          case 'not':
            setPreviewValue(!sourceValue);
            setError(null);
            break;
          case 'isEmpty':
            setPreviewValue(sourceValue === null || sourceValue === undefined || sourceValue === '' || 
                           (Array.isArray(sourceValue) && sourceValue.length === 0));
            setError(null);
            break;
          case 'isNull':
            setPreviewValue(sourceValue === null || sourceValue === undefined);
            setError(null);
            break;
          case 'default':
            const defaultValue = parsedArgs[0] || '';
            setPreviewValue(sourceValue === null || sourceValue === undefined ? defaultValue : sourceValue);
            setError(null);
            break;
          case 'formatDate':
            try {
              setPreviewValue(new Date(sourceValue).toISOString());
              setError(null);
            } catch (error) {
              setError('Invalid date');
              setPreviewValue(null);
            }
            break;
          case 'toTimestamp':
            try {
              setPreviewValue(new Date(sourceValue).getTime());
              setError(null);
            } catch (error) {
              setError('Invalid date');
              setPreviewValue(null);
            }
            break;
          case 'join':
            if (Array.isArray(sourceValue)) {
              setPreviewValue(sourceValue.join(parsedArgs[0] || ','));
              setError(null);
            } else {
              setError('Source value is not an array');
              setPreviewValue(sourceValue);
            }
            break;
          case 'firstElement':
            if (Array.isArray(sourceValue) && sourceValue.length > 0) {
              setPreviewValue(sourceValue[0]);
              setError(null);
            } else {
              setError('Source value is not an array or is empty');
              setPreviewValue(null);
            }
            break;
          case 'lastElement':
            if (Array.isArray(sourceValue) && sourceValue.length > 0) {
              setPreviewValue(sourceValue[sourceValue.length - 1]);
              setError(null);
            } else {
              setError('Source value is not an array or is empty');
              setPreviewValue(null);
            }
            break;
          default:
            setPreviewValue(sourceValue);
            setError(null);
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
  }, [sourceValue, transformationType, transformation, sourceJson, selectedBuiltin]);

  const handleTransformationTypeChange = (newType: TransformationType) => {
    // Save current builtin state when leaving builtin mode
    if (transformationType === 'builtin' && newType !== 'builtin') {
      setSavedBuiltinState({
        selectedBuiltin,
        builtinParams,
        transformation
      });
    }

    setTransformationType(newType);
    
    // Convert between transformation types
    if (newType === 'custom' && transformationType === 'builtin' && selectedBuiltin) {
      // Convert builtin to custom JavaScript
      let customCode = '';
      switch (selectedBuiltin) {
        case 'toUpperCase':
          customCode = 'sourceValue.toUpperCase()';
          break;
        case 'toLowerCase':
          customCode = 'sourceValue.toLowerCase()';
          break;
        case 'capitalize':
          customCode = 'sourceValue.charAt(0).toUpperCase() + sourceValue.slice(1).toLowerCase()';
          break;
        case 'trim':
          customCode = 'sourceValue.trim()';
          break;
        case 'substring':
          const start = builtinParams.start || '0';
          const end = builtinParams.end || '';
          customCode = end ? `sourceValue.substring(${start}, ${end})` : `sourceValue.substring(${start})`;
          break;
        case 'append':
          customCode = `sourceValue + "${builtinParams.text || ''}"`;
          break;
        case 'prepend':
          customCode = `"${builtinParams.text || ''}" + sourceValue`;
          break;
        case 'length':
          customCode = 'sourceValue.length';
          break;
        case 'toNumber':
          customCode = 'Number(sourceValue)';
          break;
        case 'toString':
          customCode = 'String(sourceValue)';
          break;
        case 'toBoolean':
          customCode = 'Boolean(sourceValue)';
          break;
        case 'round':
          customCode = 'Math.round(sourceValue)';
          break;
        case 'floor':
          customCode = 'Math.floor(sourceValue)';
          break;
        case 'ceil':
          customCode = 'Math.ceil(sourceValue)';
          break;
        case 'toFixed':
          customCode = `sourceValue.toFixed(${builtinParams.decimals || '0'})`;
          break;
        case 'add':
          customCode = `sourceValue + ${builtinParams.value || '0'}`;
          break;
        case 'subtract':
          customCode = `sourceValue - ${builtinParams.value || '0'}`;
          break;
        case 'multiply':
          customCode = `sourceValue * ${builtinParams.value || '1'}`;
          break;
        case 'divide':
          customCode = `sourceValue / ${builtinParams.value || '1'}`;
          break;
        case 'not':
          customCode = '!sourceValue';
          break;
        case 'isEmpty':
          customCode = 'sourceValue === null || sourceValue === undefined || sourceValue === "" || (Array.isArray(sourceValue) && sourceValue.length === 0)';
          break;
        case 'isNull':
          customCode = 'sourceValue === null || sourceValue === undefined';
          break;
        case 'default':
          customCode = `sourceValue === null || sourceValue === undefined ? "${builtinParams.defaultValue || ''}" : sourceValue`;
          break;
        case 'formatDate':
          customCode = 'new Date(sourceValue).toISOString()';
          break;
        case 'toTimestamp':
          customCode = 'new Date(sourceValue).getTime()';
          break;
        case 'join':
          customCode = `sourceValue.join("${builtinParams.separator || ','}")`;
          break;
        case 'firstElement':
          customCode = 'sourceValue[0]';
          break;
        case 'lastElement':
          customCode = 'sourceValue[sourceValue.length - 1]';
          break;
        default:
          customCode = 'sourceValue';
      }
      setTransformation(customCode);
    } else if (newType === 'none') {
      setTransformation('');
    } else if (newType === 'builtin') {
      // Restore previous builtin state if available
      if (savedBuiltinState.selectedBuiltin) {
        setSelectedBuiltin(savedBuiltinState.selectedBuiltin);
        setBuiltinParams(savedBuiltinState.builtinParams);
        setTransformation(savedBuiltinState.transformation);
      } else {
        setSelectedBuiltin('');
        setBuiltinParams({});
        setTransformation('');
      }
    }
  };

  const handleBuiltinSelect = (builtin: string) => {
    setSelectedBuiltin(builtin);
    setBuiltinParams({});
  };

  const handleBuiltinParamChange = (param: string, value: string) => {
    setBuiltinParams(prev => ({ ...prev, [param]: value }));
  };
  
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

  const renderBuiltinParams = () => {
    switch (selectedBuiltin) {
      case 'substring':
        return (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Start Index</label>
              <input
                type="number"
                value={builtinParams.start || '0'}
                onChange={(e) => handleBuiltinParamChange('start', e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1 text-sm text-gray-200"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">End Index (optional)</label>
              <input
                type="number"
                value={builtinParams.end || ''}
                onChange={(e) => handleBuiltinParamChange('end', e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1 text-sm text-gray-200"
                placeholder="end"
              />
            </div>
          </div>
        );
      case 'append':
      case 'prepend':
        return (
          <div className="mb-2">
            <label className="block text-xs text-gray-400 mb-1">Text to {selectedBuiltin}</label>
            <input
              type="text"
              value={builtinParams.text || ''}
              onChange={(e) => handleBuiltinParamChange('text', e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1 text-sm text-gray-200"
              placeholder="Enter text..."
            />
          </div>
        );
      case 'join':
        return (
          <div className="mb-2">
            <label className="block text-xs text-gray-400 mb-1">Separator</label>
            <input
              type="text"
              value={builtinParams.separator || ','}
              onChange={(e) => handleBuiltinParamChange('separator', e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1 text-sm text-gray-200"
              placeholder=","
            />
          </div>
        );
      case 'toFixed':
        return (
          <div className="mb-2">
            <label className="block text-xs text-gray-400 mb-1">Decimal Places</label>
            <input
              type="number"
              min="0"
              max="20"
              value={builtinParams.decimals || '0'}
              onChange={(e) => handleBuiltinParamChange('decimals', e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1 text-sm text-gray-200"
              placeholder="0"
            />
          </div>
        );
      case 'add':
      case 'subtract':
      case 'multiply':
      case 'divide':
        return (
          <div className="mb-2">
            <label className="block text-xs text-gray-400 mb-1">Value to {selectedBuiltin}</label>
            <input
              type="number"
              step="any"
              value={builtinParams.value || (selectedBuiltin === 'divide' || selectedBuiltin === 'multiply' ? '1' : '0')}
              onChange={(e) => handleBuiltinParamChange('value', e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1 text-sm text-gray-200"
              placeholder={selectedBuiltin === 'divide' || selectedBuiltin === 'multiply' ? '1' : '0'}
            />
          </div>
        );
      case 'default':
        return (
          <div className="mb-2">
            <label className="block text-xs text-gray-400 mb-1">Default Value</label>
            <input
              type="text"
              value={builtinParams.defaultValue || ''}
              onChange={(e) => handleBuiltinParamChange('defaultValue', e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1 text-sm text-gray-200"
              placeholder="Enter default value..."
            />
          </div>
        );
      default:
        return null;
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
              <div className="flex space-x-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={transformationType === 'none'}
                    onChange={() => handleTransformationTypeChange('none')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-300">None</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={transformationType === 'builtin'}
                    onChange={() => handleTransformationTypeChange('builtin')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-300">Built-in</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={transformationType === 'custom'}
                    onChange={() => handleTransformationTypeChange('custom')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-300">Custom</span>
                </label>
              </div>
              
              {transformationType === 'builtin' && (
                <div className="mb-4">
                  <select
                    value={selectedBuiltin}
                    onChange={(e) => handleBuiltinSelect(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors mb-2"
                  >
                    <option value="">Select a transformation...</option>
                    <optgroup label="String">
                      <option value="toUpperCase">toUpperCase()</option>
                      <option value="toLowerCase">toLowerCase()</option>
                      <option value="capitalize">capitalize()</option>
                      <option value="trim">trim()</option>
                      <option value="substring">substring(start, end)</option>
                      <option value="append">append(text)</option>
                      <option value="prepend">prepend(text)</option>
                      <option value="length">length()</option>
                    </optgroup>
                    <optgroup label="Number">
                      <option value="toNumber">toNumber()</option>
                      <option value="round">round()</option>
                      <option value="floor">floor()</option>
                      <option value="ceil">ceil()</option>
                      <option value="toFixed">toFixed(decimals)</option>
                      <option value="add">add(value)</option>
                      <option value="subtract">subtract(value)</option>
                      <option value="multiply">multiply(value)</option>
                      <option value="divide">divide(value)</option>
                    </optgroup>
                    <optgroup label="Type Conversion">
                      <option value="toString">toString()</option>
                      <option value="toBoolean">toBoolean()</option>
                    </optgroup>
                    <optgroup label="Boolean/Logic">
                      <option value="not">not()</option>
                      <option value="isEmpty">isEmpty()</option>
                      <option value="isNull">isNull()</option>
                    </optgroup>
                    <optgroup label="Utility">
                      <option value="default">default(value)</option>
                    </optgroup>
                    <optgroup label="Date">
                      <option value="formatDate">formatDate()</option>
                      <option value="toTimestamp">toTimestamp()</option>
                    </optgroup>
                    <optgroup label="Array">
                      <option value="join">join(separator)</option>
                      <option value="firstElement">firstElement()</option>
                      <option value="lastElement">lastElement()</option>
                    </optgroup>
                  </select>
                  
                  {renderBuiltinParams()}
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
              
              {/* Preview - Always visible */}
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
            className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="ml-3 px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors flex items-center text-sm"
          >
            <Save size={14} className="mr-2" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};