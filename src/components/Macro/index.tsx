import React, { useState, useEffect, useCallback } from 'react';
import { Disc, Square, Play } from 'lucide-react';
import { useEditorStore } from '../../store';

type MacroMode = 'idle' | 'recording' | 'recorded';

interface KeystrokeEvent {
  key: string;
  timestamp: number;
}

const RECORDABLE_KEYS = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Enter',
  'Backspace'
];

/**
 * Macro component that provides recording and playback functionality.
 * Records keystrokes with timing information and plays them back at
 * the original position.
 */
export const Macro: React.FC = () => {
  const [mode, setMode] = useState<MacroMode>('idle');
  const [recordStartTime, setRecordStartTime] = useState<number>(0);
  const [keystrokes, setKeystrokes] = useState<KeystrokeEvent[]>([]);
  const [nextPosition, setNextPosition] = useState<{ line: number; column: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { updateTabContent, splitView, tabs } = useEditorStore();

  // Handle keydown events during recording
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (mode !== 'recording') return;

    // Prevent default behavior for arrow keys during recording
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
    }

    // Record printable characters and special keys
    if (e.key.length === 1 || RECORDABLE_KEYS.includes(e.key)) {
      const timestamp = Date.now() - recordStartTime;
      setKeystrokes(prev => [...prev, { key: e.key, timestamp }]);
    }
  }, [mode, recordStartTime]);

  // Set up and clean up keyboard event listeners
  useEffect(() => {
    if (mode === 'recording') {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [mode, handleKeyDown]);

  // Start recording
  const handleRecord = (e: React.MouseEvent) => {
    e.preventDefault();
    setMode('recording');
    setRecordStartTime(Date.now());
    setKeystrokes([]);
    setNextPosition(null);
  };

  // Stop recording
  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    setMode('recorded');
  };

  // Play back recording
  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (mode !== 'recorded' || keystrokes.length === 0 || isPlaying) return;

    setIsPlaying(true);

    const activeTabId = splitView.activeLeftTabId || splitView.activeRightTabId;
    if (!activeTabId) {
      setIsPlaying(false);
      return;
    }

    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) {
      setIsPlaying(false);
      return;
    }

    // Get editor textarea
    const textarea = document.querySelector('.monaco-editor textarea.inputarea') as HTMLTextAreaElement;
    if (!textarea) {
      setIsPlaying(false);
      return;
    }

    try {
      // Get the current cursor position and calculate line/column
      const cursorPos = textarea.selectionStart;
      const contentBeforeCursor = tab.content.slice(0, cursorPos);
      const lines = contentBeforeCursor.split('\n');
      const allLines = tab.content.split('\n');
      
      // Use stored position or calculate from cursor
      let currentLine = nextPosition?.line ?? lines.length;
      let currentCol = nextPosition?.column ?? lines[lines.length - 1].length;
      
      // Calculate the actual position in the content
      let currentPosition = 0;
      for (let i = 0; i < currentLine - 1; i++) {
        currentPosition += allLines[i].length + 1;
      }
      currentPosition += currentCol;

      let content = tab.content;

      // Process each keystroke
      keystrokes.forEach(keystroke => {
        if (keystroke.key === 'Backspace') {
          if (currentPosition > 0) {
            content = content.slice(0, currentPosition - 1) + content.slice(currentPosition);
            if (currentCol > 0) {
              currentCol--;
            } else if (currentLine > 1) {
              currentLine--;
              currentCol = allLines[currentLine - 1].length;
            }
            currentPosition--;
          }
        } else if (keystroke.key === 'Enter') {
          content = content.slice(0, currentPosition) + '\n' + content.slice(currentPosition);
          currentLine++;
          currentCol = 0;
          currentPosition++;
        } else if (keystroke.key === 'ArrowLeft') {
          if (currentCol > 0) {
            currentCol--;
            currentPosition--;
          } else if (currentLine > 1) {
            currentLine--;
            currentCol = allLines[currentLine - 1].length;
            currentPosition--;
          }
        } else if (keystroke.key === 'ArrowRight') {
          if (currentCol < allLines[currentLine - 1].length) {
            currentCol++;
            currentPosition++;
          } else if (currentLine < allLines.length) {
            currentLine++;
            currentCol = 0;
            currentPosition++;
          }
        } else if (keystroke.key === 'ArrowUp') {
          if (currentLine > 1) {
            currentLine--;
            const targetLine = allLines[currentLine - 1];
            currentCol = Math.min(currentCol, targetLine.length);
            currentPosition = currentPosition - (allLines[currentLine].length + 1) + (currentCol - targetLine.length);
          }
        } else if (keystroke.key === 'ArrowDown') {
          if (currentLine < allLines.length) {
            const prevLineLength = allLines[currentLine - 1].length;
            currentLine++;
            const targetLine = allLines[currentLine - 1];
            currentCol = Math.min(currentCol, targetLine.length);
            currentPosition = currentPosition + prevLineLength + 1 + (currentCol - prevLineLength);
          }
        } else if (!keystroke.key.startsWith('Arrow')) {
          content = content.slice(0, currentPosition) + keystroke.key + content.slice(currentPosition);
          currentCol++;
          currentPosition++;
        }
      });
      
      updateTabContent(activeTabId, content);
      setNextPosition({ line: currentLine, column: currentCol });

      // Set the cursor position in the textarea
      textarea.selectionStart = currentPosition;
      textarea.selectionEnd = currentPosition;
      textarea.focus();
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex items-center space-x-2 px-2">
      <button
        className={`p-1 rounded hover:bg-gray-700 ${
          mode === 'recording' ? 'text-red-500' : 'text-gray-400'
        }`}
        onClick={handleRecord}
        disabled={mode === 'recording' || isPlaying}
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
        disabled={mode !== 'recording' || isPlaying}
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
        disabled={mode !== 'recorded' || keystrokes.length === 0 || isPlaying}
        title="Play recorded keystrokes"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Play size={14} />
      </button>
    </div>
  );
}; 