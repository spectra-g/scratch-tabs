import React from 'react';
import { Eye, Edit2 } from 'lucide-react';
import { useRootStore } from '../../../stores';
import { StatusItemProps } from '../types';

export const MarkdownStatusItem: React.FC<StatusItemProps> = () => {
  const { previewMode, togglePreviewMode } = useRootStore();

  return (
    <button
      onClick={togglePreviewMode}
      className="p-0.75 hover:bg-gray-700 rounded transition-colors"
      title={previewMode ? "Switch to editor" : "Switch to preview"}
    >
      {previewMode ? <Edit2 size={14} /> : <Eye size={14} />}
    </button>
  );
};