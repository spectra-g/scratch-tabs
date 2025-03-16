import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { validateJson } from './validation';
import { StatusItemProps } from '../../components/StatusBar/types';

export const JsonStatusItem: React.FC<StatusItemProps> = ({ content = '' }) => {
  const validation = validateJson(content);

  return (
    <div
      className="flex items-center space-x-1"
      title={validation.error || 'Valid JSON'}
    >
      {validation.isValid ? (
        <CheckCircle2 size={14} className="text-green-400" />
      ) : (
        <XCircle size={14} className="text-red-400" />
      )}
    </div>
  );
};