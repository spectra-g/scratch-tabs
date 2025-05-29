import React, { useState } from 'react';
import { Edit, Trash2, EyeOff, Eye, RefreshCw } from 'lucide-react';
import { MappingRule } from '../types';
import { TransformationRuleEditor } from './TransformationRuleEditor';
import { jsonPathToReadablePath } from '../utils/jsonUtils';

interface MappingTableProps {
  rules: MappingRule[];
  onUpdateRule: (rule: MappingRule) => void;
  onDeleteRule: (id: string) => void;
  onIgnoreRule: (id: string) => void;
  onReEvaluateRule: (id: string) => void;
  sourceJson: string;
  targetJson: string;
}

export const MappingTable: React.FC<MappingTableProps> = ({
  rules,
  onUpdateRule,
  onDeleteRule,
  onIgnoreRule,
  onReEvaluateRule,
  sourceJson,
  targetJson
}) => {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  
  const handleEditRule = (id: string) => {
    setEditingRuleId(id);
  };
  
  const handleSaveRule = (rule: MappingRule) => {
    onUpdateRule(rule);
    setEditingRuleId(null);
  };
  
  const handleCancelEdit = () => {
    setEditingRuleId(null);
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'mapped':
        return 'bg-green-500/20 text-green-400';
      case 'unmapped':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'ignored':
        return 'bg-gray-500/20 text-gray-400';
      case 'error':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };
  
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs">High</span>;
    } else if (confidence >= 0.5) {
      return <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs">Medium</span>;
    } else if (confidence > 0) {
      return <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">Low</span>;
    }
    return null;
  };
  
  if (rules.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-8 text-center">
        <p className="text-gray-400">No mapping rules defined</p>
        <p className="text-sm text-gray-500 mt-2">
          Click "Analyze & Suggest Mappings" to automatically generate rules, or "Add Rule" to create one manually.
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-800">
            <tr>
              <th scope="col" className="px-4 py-3">Source Path</th>
              <th scope="col" className="px-4 py-3">Target Path</th>
              <th scope="col" className="px-4 py-3">Transformation</th>
              <th scope="col" className="px-4 py-3">Source Type</th>
              <th scope="col" className="px-4 py-3">Target Type</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr key={rule.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-4 py-3 font-mono text-xs">
                  {jsonPathToReadablePath(rule.sourcePath)}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {rule.targetPath ? jsonPathToReadablePath(rule.targetPath) : (
                    <span className="text-gray-500 italic">Not mapped</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {rule.transformationType === 'none' ? (
                    <span className="text-gray-500">None</span>
                  ) : rule.transformationType === 'builtin' ? (
                    <span className="text-blue-400">{rule.transformation}</span>
                  ) : (
                    <span className="text-purple-400">Custom</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-gray-700/50 text-xs">
                    {rule.sourceDataType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-gray-700/50 text-xs">
                    {rule.targetDataType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(rule.status)}`}>
                      {rule.status}
                    </span>
                    {!rule.isUserDefined && getConfidenceBadge(rule.confidence)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditRule(rule.id)}
                      className="p-1 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 rounded transition-colors"
                      title="Edit rule"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onIgnoreRule(rule.id)}
                      className="p-1 text-gray-400 hover:text-yellow-400 hover:bg-gray-700/50 rounded transition-colors"
                      title={rule.status === 'ignored' ? 'Unignore rule' : 'Ignore rule'}
                    >
                      {rule.status === 'ignored' ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={() => onReEvaluateRule(rule.id)}
                      className="p-1 text-gray-400 hover:text-green-400 hover:bg-gray-700/50 rounded transition-colors"
                      title="Re-evaluate rule"
                      disabled={!sourceJson || !targetJson}
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {editingRuleId && (
        <TransformationRuleEditor
          rule={rules.find(r => r.id === editingRuleId)!}
          onSave={handleSaveRule}
          onCancel={handleCancelEdit}
          sourceJson={sourceJson}
          targetJson={targetJson}
        />
      )}
    </div>
  );
};