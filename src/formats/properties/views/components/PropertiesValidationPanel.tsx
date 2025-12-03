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
    <div className="p-3 bg-warning/5 border-warning/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <AlertTriangle size={16} className="text-warning" />
          <h3 className="text-sm font-medium text-warning">
            Validation Issues ({totalIssues})
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Duplicate Keys */}
        {validation.duplicateKeys.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-danger mb-2 uppercase tracking-wide">
              Duplicate Keys ({validation.duplicateKeys.length})
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {validation.duplicateKeys.map((key, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-danger/10 border border-danger/30 rounded px-2 py-1"
                >
                  <div className="flex items-center space-x-1 flex-1 min-w-0">
                    <Key size={10} className="text-danger flex-shrink-0" />
                    <span className="text-xs font-mono text-danger truncate">
                      {key}
                    </span>
                  </div>
                  <button
                    onClick={() => copyKey(key)}
                    className="p-0.5 text-danger hover:text-danger/80 hover:bg-danger/20 rounded transition-colors"
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
            <h4 className="text-xs font-medium text-warning mb-2 uppercase tracking-wide">
              Empty Values ({validation.emptyValues.length})
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {validation.emptyValues.map((key, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-warning/10 border border-warning/30 rounded px-2 py-1"
                >
                  <div className="flex items-center space-x-1 flex-1 min-w-0">
                    <Key size={10} className="text-warning flex-shrink-0" />
                    <span className="text-xs font-mono text-warning truncate">
                      {key}
                    </span>
                  </div>
                  <button
                    onClick={() => copyKey(key)}
                    className="p-0.5 text-warning hover:text-warning/80 hover:bg-warning/20 rounded transition-colors"
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
            <h4 className="text-xs font-medium text-warning mb-2 uppercase tracking-wide">
              Invalid Keys ({validation.invalidKeys.length})
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {validation.invalidKeys.map((key, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-warning/10 border border-warning/30 rounded px-2 py-1"
                >
                  <div className="flex items-center space-x-1 flex-1 min-w-0">
                    <Key size={10} className="text-warning flex-shrink-0" />
                    <span className="text-xs font-mono text-warning truncate">
                      {key}
                    </span>
                  </div>
                  <button
                    onClick={() => copyKey(key)}
                    className="p-0.5 text-warning hover:text-warning/80 hover:bg-warning/20 rounded transition-colors"
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
        <div className="flex items-center justify-center py-4 text-success">
          <CheckCircle size={16} className="mr-2" />
          <span className="text-sm">No validation issues found</span>
        </div>
      )}
    </div>
  );
};