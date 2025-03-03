import React, { useState, useEffect, useCallback } from 'react';
import { Disc, Square, Play } from 'lucide-react';
import { useEditorStore } from '../../store';

type MacroMode = 'idle' | 'recording' | 'recorded';

interface KeystrokeEvent {
  key: string;
  timestamp: number;
}

/**
 * Macro component that provides recording and playback functionality.
 * Records keystrokes with timing information and plays them back at
 * the original speed.
 */
export const Macro: React.FC = () => {
  const [mode, setMode] = useState<MacroMode>('idle');
  const [recordStartTime, setRecordStartTime] = useState<number>(0);
  const [keystrokes, setKeystrokes] = useState<KeystrokeEvent[]>([]);
  const [nextInsertPosition, setNextInsertPosition] = useState<number | null>(null);
  const { updateTabContent, splitView, tabs } = useEditorStore();

  // Handle keydown events during recording
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (mode !== 'recording') return;

    // Only record printable characters, Enter, and Backspace
    if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace') {
      const timestamp = Date.now() - recordStartTime;
      setKeystrokes(prev => [...prev, { key: e.key, timestamp }]);
    }
  }, [mode, recordStartTime]);

  // Set up and clean up keyboard event listeners
  useEffect(() => {
    if (mode === 'recording') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [mode, handleKeyDown]);

  // Start recording
  const handleRecord = (e: React.MouseEvent) => {
    e.preventDefault();
    setMode('recording');
    setRecordStartTime(Date.now());
    setKeystrokes([]);
    setNextInsertPosition(null);
  };

  // Stop recording
  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    setMode('recorded');
  };

  // Play back recording
  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (mode !== 'recorded' || keystrokes.length === 0) return;

    const activeTabId = splitView.activeLeftTabId || splitView.activeRightTabId;
    if (!activeTabId) return;

    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    // Get editor textarea
    const textarea = document.querySelector('.monaco-editor textarea.inputarea') as HTMLTextAreaElement;
    if (!textarea) return;

    // Use stored position or current cursor position
    const insertPosition = nextInsertPosition !== null ? nextInsertPosition : textarea.selectionStart;
    let content = tab.content;

    // Create a copy of the keystrokes to apply
    const recordedText = keystrokes.reduce((acc, keystroke) => {
      if (keystroke.key === 'Backspace') {
        return acc.slice(0, -1);
      } else if (keystroke.key === 'Enter') {
        return acc + '\n';
      } else {
        return acc + keystroke.key;
      }
    }, '');

    // Insert the recorded text
    const newContent = content.slice(0, insertPosition) + recordedText + content.slice(insertPosition);
    updateTabContent(activeTabId, newContent);

    // Store the next insert position
    setNextInsertPosition(insertPosition + recordedText.length);
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
        disabled={mode !== 'recorded' || keystrokes.length === 0}
        title="Play recorded keystrokes"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Play size={14} />
      </button>
    </div>
  );
}; 