import React from 'react';
import { AlertTriangle, Bug } from '../../../../components/Icons';
import { ErrorInfo } from '../../utils/parser';

interface ErrorInfoDisplayProps {
  errorInfo: ErrorInfo;
}

export const ErrorInfoDisplay: React.FC<ErrorInfoDisplayProps> = ({
  errorInfo,
}) => {
  if (!errorInfo.raw && !errorInfo.errorType && !errorInfo.errorMessage) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
      <div className="flex items-start space-x-3">
        <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          {/* Error type */}
          {errorInfo.errorType && (
            <div className="flex items-center space-x-2 mb-2">
              <Bug size={16} className="text-red-400" />
              <span className="font-mono text-red-300 font-medium">
                {errorInfo.errorType}
              </span>
            </div>
          )}

          {/* Error message */}
          {errorInfo.errorMessage && (
            <div className="text-gray-200 text-sm leading-relaxed">
              {errorInfo.errorMessage}
            </div>
          )}

          {/* Raw error line if no structured parsing */}
          {!errorInfo.errorType && !errorInfo.errorMessage && errorInfo.raw && (
            <div className="text-gray-200 text-sm font-mono leading-relaxed">
              {errorInfo.raw}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};