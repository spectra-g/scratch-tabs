import React, { useState } from 'react';
import { Disc, Square, Play } from 'lucide-react';
import { useEditorStore } from '../../store';

type MacroMode = 'idle' | 'recording' | 'recorded';

export const Macro: React.FC = () => {
  const [mode, setMode] = useState<MacroMode>('idle');
  const { updateTabContent, splitView, tabs } = useEditorStore();

  // Start recording
  const handleRecord = (e: React.MouseEvent) => {
    e.preventDefault();
    setMode('recording');
  };

  // Stop recording
  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    setMode('recorded');
  };

  // Play back recording
  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (mode !== 'recorded') return;

    const activeTabId = splitView.activeLeftTabId || splitView.activeRightTabId;
    if (!activeTabId) return;

    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    // Get the editor's textarea element
    const textarea = document.querySelector('.monaco-editor textarea.inputarea') as HTMLTextAreaElement;
    if (!textarea) return;

    // Get cursor position and insert 'x'
    const cursorPos = textarea.selectionStart;
    const newContent = tab.content.slice(0, cursorPos) + 'x' + tab.content.slice(cursorPos);
    
    // Update content and restore cursor position
    updateTabContent(activeTabId, newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
    }, 0);
  };

  return (
    <div className="flex items-center space-x-2 px-2">
      <button
        className={`p-1 rounded hover:bg-gray-700 ${
          mode === 'recording' ? 'text-red-500' : 'text-gray-400'
        }`}
        onClick={handleRecord}
        disabled={mode === 'recording'}
        title="Record keystrokes"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Disc size={14} />
      </button>
      <button
        className={`p-1 rounded hover:bg-gray-700 ${
          mode === 'recording' ? 'text-gray-400' : 'text-gray-600'
        }`}
        onClick={handleStop}
        disabled={mode !== 'recording'}
        title="Stop recording"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Square size={14} />
      </button>
      <button
        className={`p-1 rounded hover:bg-gray-700 ${
          mode === 'recorded' ? 'text-gray-400' : 'text-gray-600'
        }`}
        onClick={handlePlay}
        disabled={mode !== 'recorded'}
        title="Play recorded keystrokes"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Play size={14} />
      </button>
    </div>
  );
}; 