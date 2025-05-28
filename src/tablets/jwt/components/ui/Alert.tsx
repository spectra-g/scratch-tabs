import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface AlertProps {
  children: React.ReactNode;
  variant: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant,
  title,
  onClose,
  className = ''
}) => {
  const variantStyles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400'
  };
  
  const IconComponent = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle
  }[variant];
  
  return (
    <div className={`border rounded-md p-3 ${variantStyles[variant]} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">
          <IconComponent size={18} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium">{title}</h3>
          )}
          <div className={`text-sm ${title ? 'mt-1' : ''}`}>
            {children}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            className="ml-auto flex-shrink-0 -mt-1 -mr-1 p-1 rounded-md hover:bg-gray-800/50 focus:outline-none"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};