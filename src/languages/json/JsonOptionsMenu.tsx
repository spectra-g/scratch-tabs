import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Menu } from './components/Menu';
import { useRootStore } from '../../stores';
import { useJsonModals } from './hooks/useJsonModals';
import * as monaco from 'monaco-editor';

interface JsonOptionsMenuProps {
  editor: monaco.editor.IStandaloneCodeEditor;
}

export const JsonOptionsMenu: React.FC<JsonOptionsMenuProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { addTab } = useRootStore();
  const { renderModal } = useJsonModals();

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-0.75 hover:bg-gray-700 rounded transition-colors"
          title="JSON Options"
        >
          <MoreHorizontal size={14} />
        </button>

        {isOpen && (
          <Menu
            editor={editor}
            onClose={() => setIsOpen(false)}
            addTab={addTab}
          />
        )}
      </div>

      {/* Render active modal */}
      {renderModal()}
    </>
  );
};