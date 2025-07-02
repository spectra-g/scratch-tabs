import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, MagicWand } from 'lucide-react';
import { CronDialect, CronValidationError } from '../types';

interface RawExpressionInputProps {
  expression: string;
  dialect: CronDialect;
  onExpressionChange: (expression: string) => void;
  onDialectDetect: (expression: string) => CronDialect;
  validationErrors: CronValidationError[];
}

export const RawExpressionInput: React.FC<RawExpressionInputProps> = ({
  expression,
  dialect,
  onExpressionChange,
  onDialectDetect,
  validationErrors
}) => {
  const [localExpression, setLocalExpression] = useState(expression);
  const [detectedDialect, setDetectedDialect] = useState<CronDialect | null>(null);
  
  // Update local expression when prop changes
  useEffect(() => {
    setLocalExpression(expression);
  }, [expression]);
  
  // Handle expression change
  const handleExpressionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newExpression = e.target.value;
    setLocalExpression(newExpression);
    
    // Detect dialect if expression changes significantly
    if (newExpression.trim().split(/\s+/).length !== expression.trim().split(/\s+/).length) {
      const detected = onDialectDetect(newExpression);
      if (detected !== dialect) {
        setDetectedDialect(detected);
      } else {
        setDetectedDialect(null);
      }
    }
    
    // Update parent component
    onExpressionChange(newExpression);
  };
  
  // Handle blur event
  const handleBlur = () => {
    // Update parent component
    onExpressionChange(localExpression);
  };
  
  // Get global validation errors
  const globalError = validationErrors.find(error => error.field === 'global');
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-medium text-gray-300 mb-4">Raw Cron Expression</h3>
      
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={localExpression}
            onChange={handleExpressionChange}
            onBlur={handleBlur}
            className={`w-full bg-gray-700 border rounded-md px-3 py-2 text-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              globalError ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder={`Enter cron expression (e.g., "0 0 * * *" for daily at midnight)`}
          />
          
          {detectedDialect && (
            <div className="absolute top-full left-0 mt-1 bg-yellow-900/30 border border-yellow-900/50 rounded-md p-2 text-xs text-yellow-400 flex items-center">
              <MagicWand size={12} className="mr-1" />
              <span>Detected {detectedDialect} dialect. Consider switching dialects for better validation.</span>
            </div>
          )}
          
          {globalError ? (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500" title={globalError.message}>
              <AlertTriangle size={16} />
            </div>
          ) : validationErrors.length === 0 && expression.trim() ? (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500" title="Valid expression">
              <Check size={16} />
            </div>
          ) : null}
        </div>
        
        <div className="text-xs text-gray-400">
          <p>
            <span className="font-medium text-gray-300">Format for {dialect}:</span>{' '}
            {getFormatForDialect(dialect)}
          </p>
          <p className="mt-1">
            <span className="font-medium text-gray-300">Special characters:</span>{' '}
            * (any), , (list), - (range), / (step), ? (any/no specific value, Quartz only)
          </p>
          <p className="mt-1">
            <span className="font-medium text-gray-300">Examples:</span>{' '}
            <code className="bg-gray-700 px-1 rounded">0 0 * * *</code> (daily at midnight),{' '}
            <code className="bg-gray-700 px-1 rounded">*/15 * * * *</code> (every 15 minutes)
          </p>
        </div>
        
        {globalError && (
          <div className="p-3 bg-red-900/20 border border-red-900/30 rounded-md">
            <p className="text-xs text-red-400 flex items-start">
              <AlertTriangle size={12} className="mr-1 mt-0.5 flex-shrink-0" />
              <span>{globalError.message}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get format string for dialect
function getFormatForDialect(dialect: CronDialect): string {
  switch (dialect) {
    case 'unix':
    case 'crontab':
    case 'jenkins':
      return 'minute hour day-of-month month day-of-week';
    case 'quartz':
      return 'second minute hour day-of-month month day-of-week year';
    case 'spring':
      return 'second minute hour day-of-month month day-of-week';
    case 'aws':
      return 'minute hour day-of-month month day-of-week year';
    default:
      return 'minute hour day-of-month month day-of-week';
  }
}