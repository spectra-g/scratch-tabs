import React from 'react';
import { AlertTriangle, X, Info } from '../../../components/Icons';
import { DiagramError } from '../types';

interface ErrorPanelProps {
  error: DiagramError | null;
  onClose: () => void;
  onGoToLine?: (lineNumber: number) => void;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({
  error,
  onClose,
  onGoToLine
}) => {
  if (!error) return null;

  const getErrorIcon = () => {
    switch (error.type) {
      case 'syntax':
        return <AlertTriangle size={16} className="text-danger" />;
      case 'semantic':
        return <AlertTriangle size={16} className="text-warning" />;
      case 'render':
        return <AlertTriangle size={16} className="text-warning" />;
      default:
        return <AlertTriangle size={16} className="text-danger" />;
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case 'syntax':
        return 'border-danger bg-danger-subtle';
      case 'semantic':
        return 'border-warning bg-warning-subtle';
      case 'render':
        return 'border-warning bg-warning-subtle';
      default:
        return 'border-danger bg-danger-subtle';
    }
  };

  return (
    <div className={`border-l-4 p-4 ${getErrorColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getErrorIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-sm font-medium text-main capitalize">
                {error.type} Error
              </h4>
              {error.line && (
                <button
                  onClick={() => onGoToLine?.(error.line)}
                  className="text-xs bg-element hover:bg-element-hover px-2 py-0.5 rounded text-info hover:text-opacity-80 transition-colors"
                >
                  Line {error.line}
                </button>
              )}
            </div>

            <p className="text-sm text-secondary mb-2">
              {error.message}
            </p>

            {error.suggestion && (
              <div className="flex items-start space-x-2 mt-2 p-2 bg-surface-secondary/50 rounded">
                <Info size={14} className="text-warning mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted">
                  <strong className="text-warning">Suggestion:</strong> {error.suggestion}
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 hover:bg-element-hover rounded text-muted hover:text-main flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};