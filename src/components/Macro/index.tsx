import React, { useState } from 'react';
import { Disc, Square, Play } from 'lucide-react';
import { useEditorStore } from '../../store';

type MacroMode = 'idle' | 'recording' | 'recorded';

/**
 * Macro component that provides recording and playback functionality.
 * Currently implements a simple test mode that inserts 'x' characters
 * sequentially from the cursor position.
 */
export const Macro: React.FC = () => {
  const [mode, setMode] = useState<MacroMode>('idle');
  const [lastCursorPos, setLastCursorPos] = useState<number | null>(null);
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

    // Get active tab and its content
    const activeTabId = splitView.activeLeftTabId || splitView.activeRightTabId;
    if (!activeTabId) return;

    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    // Get editor textarea and cursor position
    const textarea = document.querySelector('.monaco-editor textarea.inputarea') as HTMLTextAreaElement;
    if (!textarea) return;

    // Insert 'x' at the current or last cursor position
    const cursorPos = lastCursorPos !== null ? lastCursorPos : textarea.selectionStart;
    const newContent = tab.content.slice(0, cursorPos) + 'x' + tab.content.slice(cursorPos);
    
    // Update content and store next cursor position
    updateTabContent(activeTabId, newContent);
    setLastCursorPos(cursorPos + 1);

    // Remove editor focus and move it to the play button
    requestAnimationFrame(() => {
      textarea.blur();
      const editorElement = document.querySelector('.monaco-editor') as HTMLElement;
      if (editorElement) {
        editorElement.blur();
      }
      const playButton = document.querySelector('button[title="Play recorded keystrokes"]');
      if (playButton instanceof HTMLElement) {
        playButton.focus();
      }
    });
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