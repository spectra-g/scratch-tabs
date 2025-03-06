import React, { useState, useEffect, useCallback } from 'react';
import { Disc, Square, Play, PlayCircle } from 'lucide-react';
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
  const [isPlayingToEnd, setIsPlayingToEnd] = useState(false);
  const { updateTabContent, splitView, tabs } = useEditorStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (mode !== 'recording') return;
    if (e.key.startsWith('Arrow')) e.preventDefault();
    if (e.key.length === 1 || RECORDABLE_KEYS.includes(e.key)) {
      setKeystrokes(prev => [...prev, { key: e.key, timestamp: Date.now() - recordStartTime }]);
    }
  }, [mode, recordStartTime]);

  useEffect(() => {
    if (mode === 'recording') {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [mode, handleKeyDown]);

  const getCursorPosition = (content: string, cursorPos: number) => {
    const contentBeforeCursor = content.slice(0, cursorPos);
    const lines = contentBeforeCursor.split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length
    };
  };

  const getContentPosition = (content: string, line: number, column: number) => {
    const allLines = content.split('\n');
    let position = 0;
    for (let i = 0; i < line - 1; i++) {
      position += allLines[i].length + 1;
    }
    return position + column;
  };

  const processKeystrokes = (
      content: string,
      currentLine: number,
      currentCol: number,
      keystrokes: KeystrokeEvent[]
  ): { content: string; line: number; column: number } => {
    const allLines = content.split('\n');
    let position = getContentPosition(content, currentLine, currentCol);

    keystrokes.forEach(keystroke => {
      if (keystroke.key === 'Backspace') {
        if (position > 0) {
          content = content.slice(0, position - 1) + content.slice(position);
          if (currentCol > 0) {
            currentCol--;
          } else if (currentLine > 1) {
            currentLine--;
            currentCol = allLines[currentLine - 1].length;
          }
          position--;
        }
      } else if (keystroke.key === 'Enter') {
        content = content.slice(0, position) + '\n' + content.slice(position);
        currentLine++;
        currentCol = 0;
        position++;
      } else if (keystroke.key === 'ArrowLeft') {
        if (currentCol > 0) {
          currentCol--;
          position--;
        } else if (currentLine > 1) {
          currentLine--;
          currentCol = allLines[currentLine - 1].length;
          position--;
        }
      } else if (keystroke.key === 'ArrowRight') {
        if (currentCol < allLines[currentLine - 1].length) {
          currentCol++;
          position++;
        } else if (currentLine < allLines.length) {
          currentLine++;
          currentCol = 0;
          position++;
        }
      } else if (keystroke.key === 'ArrowUp') {
        if (currentLine > 1) {
          currentLine--;
          const targetLine = allLines[currentLine - 1];
          currentCol = Math.min(currentCol, targetLine.length);
          position = position - (allLines[currentLine].length + 1) + (currentCol - targetLine.length);
        }
      } else if (keystroke.key === 'ArrowDown') {
        if (currentLine < allLines.length) {
          const prevLineLength = allLines[currentLine - 1].length;
          currentLine++;
          const targetLine = allLines[currentLine - 1];
          currentCol = Math.min(currentCol, targetLine.length);
          position = position + prevLineLength + 1 + (currentCol - prevLineLength);
        }
      } else if (!keystroke.key.startsWith('Arrow')) {
        content = content.slice(0, position) + keystroke.key + content.slice(position);
        currentCol++;
        position++;
      }
    });

    return { content, line: currentLine, column: currentCol };
  };

  const getActiveTab = () => {
    const activeTabId = splitView.activeLeftTabId || splitView.activeRightTabId;
    if (!activeTabId) return null;
    return tabs.find(t => t.id === activeTabId);
  };

  const getTextarea = () => {
    return document.querySelector('.monaco-editor textarea.inputarea') as HTMLTextAreaElement;
  };

  const handleRecord = (e: React.MouseEvent) => {
    e.preventDefault();
    setMode('recording');
    setRecordStartTime(Date.now());
    setKeystrokes([]);
    setNextPosition(null);
  };

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    setMode('recorded');
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (mode !== 'recorded' || keystrokes.length === 0 || isPlaying) return;

    setIsPlaying(true);
    const tab = getActiveTab();
    const textarea = getTextarea();
    if (!tab || !textarea) {
      setIsPlaying(false);
      return;
    }

    try {
      // Get the current cursor position from the textarea
      const visibleCursorPos = textarea.selectionStart;
      textarea.blur();

      let currentLine, currentCol;

      // If this is the first play (nextPosition is null) or the cursor has been manually repositioned
      // to a position other than 0 or the end, use the visible cursor position
      if (nextPosition === null || (visibleCursorPos !== 0 && Math.abs(visibleCursorPos - tab.content.length) > 5)) {
        const { line, column } = getCursorPosition(tab.content, visibleCursorPos);
        currentLine = line;
        currentCol = column;
      } else {
        // Otherwise, use the stored next position
        currentLine = nextPosition.line;
        currentCol = nextPosition.column;
      }

      const { content, line: newLine, column: newColumn } = processKeystrokes(tab.content, currentLine, currentCol, keystrokes);

      updateTabContent(tab.id, content);
      setNextPosition({ line: newLine, column: newColumn });

    } finally {
      setIsPlaying(false);
    }
  };

  const handlePlayToEnd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (mode !== 'recorded' || keystrokes.length === 0 || isPlaying || isPlayingToEnd) return;

    setIsPlayingToEnd(true);
    const tab = getActiveTab();
    const textarea = getTextarea();
    if (!tab || !textarea) {
      setIsPlayingToEnd(false);
      return;
    }

    try {
      // Get the current cursor position from the textarea
      const visibleCursorPos = textarea.selectionStart;
      textarea.blur();

      let startLine, startCol;

      // If this is the first play (nextPosition is null) or the cursor has been manually repositioned
      // to a position other than 0 or the end, use the visible cursor position
      if (nextPosition === null || (visibleCursorPos !== 0 && Math.abs(visibleCursorPos - tab.content.length) > 5)) {
        const { line, column } = getCursorPosition(tab.content, visibleCursorPos);
        startLine = line;
        startCol = column;
      } else {
        // Otherwise, use the stored next position
        startLine = nextPosition.line;
        startCol = nextPosition.column;
      }

      let currentLine = startLine;
      let currentCol = startCol;
      let content = tab.content;

      while (true) {
        if (currentLine >= content.split('\n').length) break;

        const result = processKeystrokes(content, currentLine, currentCol, keystrokes);
        content = result.content;
        currentLine = result.line;
        currentCol = result.column;

        updateTabContent(tab.id, content);

        // Update nextPosition for potential future plays
        setNextPosition({ line: currentLine, column: currentCol });

        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } finally {
      setIsPlayingToEnd(false);
    }
  };

  return (
      <div className="flex items-center space-x-2 px-2">
        <button
            className={`p-1 rounded hover:bg-gray-700 ${
                mode === 'recording' ? 'text-red-500' : 'text-gray-400'
            }`}
            onClick={handleRecord}
            disabled={mode === 'recording' || isPlaying || isPlayingToEnd}
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
            disabled={mode !== 'recording' || isPlaying || isPlayingToEnd}
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
            disabled={mode !== 'recorded' || keystrokes.length === 0 || isPlaying || isPlayingToEnd}
            title="Play recorded keystrokes"
            onMouseDown={(e) => e.preventDefault()}
        >
          <Play size={14} />
        </button>
        <button
            className={`p-1 rounded hover:bg-gray-700 ${
                mode === 'recorded' ? 'text-gray-400' : 'text-gray-600'
            }`}
            onClick={handlePlayToEnd}
            disabled={mode !== 'recorded' || keystrokes.length === 0 || isPlaying || isPlayingToEnd}
            title="Play to end of file"
            onMouseDown={(e) => e.preventDefault()}
        >
          <PlayCircle size={14} />
        </button>
      </div>
  );
}; 