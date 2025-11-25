import React from 'react';
import { FileText } from '../../../../components/Icons';
import { YamlDocument } from '../../utils/yamlParser';

interface DocumentTabsProps {
  documents: YamlDocument[];
  activeIndex: number;
  onDocumentChange: (index: number) => void;
}

export const DocumentTabs: React.FC<DocumentTabsProps> = ({
  documents,
  activeIndex,
  onDocumentChange,
}) => {
  if (documents.length <= 1) {
    return null;
  }

  return (
    <div className="flex-none border-b border-base bg-surface-highlight" data-testid="document-tabs">
      <div className="flex items-center px-3 py-2 space-x-1">
        <FileText size={14} className="text-secondary mr-2" />
        {documents.map((doc, index) => (
          <button
            key={index}
            onClick={() => onDocumentChange(index)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${index === activeIndex
                ? 'bg-primary/20 text-info'
                : 'text-secondary hover:text-main hover:bg-element-hover'
              }`}
          >
            Document {index + 1}
            <span className="ml-1 text-xs opacity-75">
              (lines {doc.startLine}-{doc.endLine})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};