import React from "react";
import { X, AlertTriangle, Copy, Key, CheckCircle } from "../../../../components/Icons";
import { PropertiesValidation } from "../types";

interface PropertiesValidationPanelProps {
  validation: PropertiesValidation;
  onClose: () => void;
}

export const PropertiesValidationPanel: React.FC<PropertiesValidationPanelProps> = ({
  validation,
  onClose,
}) => {
  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
    } catch (err) {
      console.error('Failed to copy key:', err);
    }
  };

  const totalIssues = 
    validation.duplicateKeys.length + 
    validation.emptyValues.length + 
    validation.invalidKeys.length;

  return (
    <div className="p-3 bg-yellow-500/5 border-yellow-500/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <AlertTriangle size={16} className="text-yellow-400" />
          <h3 className="text-sm font-medium text-yellow-300">
            Validation Issues ({totalIssues})
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Duplicate Keys */}
        {validation.duplicateKeys.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-red-400 mb-2 uppercase tracking-wide">
              Duplicate Keys ({validation.duplicateKeys.length})
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {validation.duplicateKeys.map((key, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded px-2 py-1"
                >
                  <div className="flex items-center space-x-1 flex-1 min-w-0">
                    <Key size={10} className="text-red-400 flex-shrink-0" />
                    <span className="text-xs font-mono text-red-300 truncate">
                      {key}
                    </span>
                  </div>
                  <button
                    onClick={() => copyKey(key)}
                    className="p-0.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                    title="Copy key"
                  >
                    <Copy size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty Values */}
        {validation.emptyValues.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-yellow-400 mb-2 uppercase tracking-wide">
              Empty Values ({validation.emptyValues.length})
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {validation.emptyValues.map((key, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded px-2 py-1"
                >
                  <div className="flex items-center space-x-1 flex-1 min-w-0">
                    <Key size={10} className="text-yellow-400 flex-shrink-0" />
                    <span className="text-xs font-mono text-yellow-300 truncate">
                      {key}
                    </span>
                  </div>
                  <button
                    onClick={() => copyKey(key)}
                    className="p-0.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20 rounded transition-colors"
                    title="Copy key"
                  >
                    <Copy size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invalid Keys */}
        {validation.invalidKeys.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-orange-400 mb-2 uppercase tracking-wide">
              Invalid Keys ({validation.invalidKeys.length})
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {validation.invalidKeys.map((key, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-orange-500/10 border border-orange-500/30 rounded px-2 py-1"
                >
                  <div className="flex items-center space-x-1 flex-1 min-w-0">
                    <Key size={10} className="text-orange-400 flex-shrink-0" />
                    <span className="text-xs font-mono text-orange-300 truncate">
                      {key}
                    </span>
                  </div>
                  <button
                    onClick={() => copyKey(key)}
                    className="p-0.5 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 rounded transition-colors"
                    title="Copy key"
                  >
                    <Copy size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {totalIssues === 0 && (
        <div className="flex items-center justify-center py-4 text-green-400">
          <CheckCircle size={16} className="mr-2" />
          <span className="text-sm">No validation issues found</span>
        </div>
      )}
    </div>
  );
};