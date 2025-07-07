import React from 'react';
import { BaseModal } from './BaseModal';
import { Editor } from '@monaco-editor/react';
import { Tab } from '../../../../types';
import { createTab } from '../../../../utils/tabUtils';

interface StringifyModalProps {
  content: string;
  onClose: () => void;
  addTab: (tab: Tab) => void;
}

export const StringifyModal: React.FC<StringifyModalProps> = ({ content, onClose, addTab }) => {
  const handleOpenInNewTab = () => {
    addTab(createTab({
      title: 'Stringified JSON',
      content
    }));
    onClose();
  };

  return (
    <BaseModal title="Stringified JSON" onClose={onClose}>
      <div className="space-y-4">
        <Editor
          height="450px"
          language="plaintext"
          value={content}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on'
          }}
        />
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleOpenInNewTab}
            className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors"
          >
            Open in New Tab
          </button>
        </div>
      </div>
    </BaseModal>
  );
};