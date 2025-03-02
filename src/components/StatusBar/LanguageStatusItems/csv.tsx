import React from 'react';
import { AlignJustify } from 'lucide-react';
import { StatusItemProps } from '../types';

export const CsvStatusItem: React.FC<StatusItemProps> = () => {
  return (
    <div className="flex items-center space-x-2">
      <AlignJustify size={14} className="text-green-400" />
      <span className="text-xs text-green-400">CSV</span>
    </div>
  );
};