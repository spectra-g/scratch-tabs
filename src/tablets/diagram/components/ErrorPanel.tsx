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
        return <AlertTriangle size={16} className="text-red-400" />;
      case 'semantic':
        return <AlertTriangle size={16} className="text-yellow-400" />;
      case 'render':
        return <AlertTriangle size={16} className="text-orange-400" />;
      default:
        return <AlertTriangle size={16} className="text-red-400" />;
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case 'syntax':
        return 'border-red-500 bg-red-900/20';
      case 'semantic':
        return 'border-yellow-500 bg-yellow-900/20';
      case 'render':
        return 'border-orange-500 bg-orange-900/20';
      default:
        return 'border-red-500 bg-red-900/20';
    }
  };

  return (
    <div className={`border-l-4 p-4 ${getErrorColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getErrorIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-sm font-medium text-gray-200 capitalize">
                {error.type} Error
              </h4>
              {error.line && (
                <button
                  onClick={() => onGoToLine?.(error.line)}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Line {error.line}
                </button>
              )}
            </div>
            
            <p className="text-sm text-gray-300 mb-2">
              {error.message}
            </p>

            {error.suggestion && (
              <div className="flex items-start space-x-2 mt-2 p-2 bg-gray-800/50 rounded">
                <Info size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-400">
                  <strong className="text-yellow-400">Suggestion:</strong> {error.suggestion}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200 flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};