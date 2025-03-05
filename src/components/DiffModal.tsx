import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Undo2, Redo2, XCircle } from 'lucide-react';
import { useEditorStore } from '../store';

interface DiffModalProps {
  leftTabId: string;
  rightTabId: string;
  onClose: () => void;
}

interface DiffLine {
  leftLineNumber: number | null;
  rightLineNumber: number | null;
  leftContent: string;
  rightContent: string;
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  charDiffs?: {
    left: { start: number; end: number; type: 'unchanged' | 'modified' }[];
    right: { start: number; end: number; type: 'unchanged' | 'modified' }[];
  };
}

interface ChangeHistoryEntry {
  leftContent: string;
  rightContent: string;
}

interface Token {
  text: string;
  start: number;
  end: number;
}

export const DiffModal: React.FC<DiffModalProps> = ({ leftTabId, rightTabId, onClose }) => {
  const { tabs, updateTabContent } = useEditorStore();
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);

  // History management
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  // Find the tabs
  const leftTab = tabs.find(tab => tab.id === leftTabId);
  const rightTab = tabs.find(tab => tab.id === rightTabId);

  // Initialize history when the modal opens
  useEffect(() => {
    if (leftTab && rightTab) {
      setChangeHistory([{ leftContent: leftTab.content, rightContent: rightTab.content }]);
      setCurrentHistoryIndex(0);
    }
  }, []);

  // Calculate diff when tabs change or history changes
  useEffect(() => {
    if (leftTab && rightTab && currentHistoryIndex >= 0) {
      const currentState = changeHistory[currentHistoryIndex];
      const diff = calculateDiff(currentState.leftContent, currentState.rightContent);
      setDiffLines(diff);
    }
  }, [leftTab, rightTab, currentHistoryIndex, changeHistory]);

  const canUndo = currentHistoryIndex > 0;
  const canRedo = currentHistoryIndex < changeHistory.length - 1;

  const handleUndo = () => {
    if (!canUndo) return;

    const previousState = changeHistory[currentHistoryIndex - 1];
    updateTabContent(leftTabId, previousState.leftContent);
    updateTabContent(rightTabId, previousState.rightContent);
    setCurrentHistoryIndex(currentHistoryIndex - 1);
  };

  const handleRedo = () => {
    if (!canRedo) return;

    const nextState = changeHistory[currentHistoryIndex + 1];
    updateTabContent(leftTabId, nextState.leftContent);
    updateTabContent(rightTabId, nextState.rightContent);
    setCurrentHistoryIndex(currentHistoryIndex + 1);
  };

  // Split text into tokens (words and spaces)
  const tokenize = (text: string): Token[] => {
    const tokens: Token[] = [];
    let currentToken = '';
    let start = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (/\s/.test(char)) {
        // If we have a pending token, add it
        if (currentToken) {
          tokens.push({
            text: currentToken,
            start: start,
            end: i
          });
          currentToken = '';
        }
        // Add the whitespace as a separate token
        tokens.push({
          text: char,
          start: i,
          end: i + 1
        });
        start = i + 1;
      } else {
        if (!currentToken) {
          start = i;
        }
        currentToken += char;
      }
    }

    // Add any remaining token
    if (currentToken) {
      tokens.push({
        text: currentToken,
        start: start,
        end: text.length
      });
    }

    return tokens;
  };

  // Calculate character-level differences between two strings
  const calculateCharDiffs = (str1: string, str2: string) => {
    const tokens1 = tokenize(str1);
    const tokens2 = tokenize(str2);

    const left: { start: number; end: number; type: 'unchanged' | 'modified' }[] = [];
    const right: { start: number; end: number; type: 'unchanged' | 'modified' }[] = [];

    let i = 0, j = 0;

    while (i < tokens1.length && j < tokens2.length) {
      if (tokens1[i].text === tokens2[j].text) {
        // Matching tokens - mark as unchanged
        left.push({
          start: tokens1[i].start,
          end: tokens1[i].end,
          type: 'unchanged'
        });
        right.push({
          start: tokens2[j].start,
          end: tokens2[j].end,
          type: 'unchanged'
        });
        i++;
        j++;
      } else {
        // Different tokens - mark as modified
        // Look ahead to find the next matching token
        let matchFound = false;
        let lookAhead = 1;
        const maxLookAhead = 3; // Limit look-ahead to avoid performance issues

        while (lookAhead <= maxLookAhead &&
        (i + lookAhead < tokens1.length || j + lookAhead < tokens2.length)) {
          // Check if tokens match after skipping some on either side
          if (i + lookAhead < tokens1.length &&
              j < tokens2.length &&
              tokens1[i + lookAhead].text === tokens2[j].text) {
            // Found match by skipping tokens in left side
            for (let k = 0; k < lookAhead; k++) {
              left.push({
                start: tokens1[i + k].start,
                end: tokens1[i + k].end,
                type: 'modified'
              });
            }
            right.push({
              start: tokens2[j].start,
              end: tokens2[j].end,
              type: 'modified'
            });
            i += lookAhead;
            matchFound = true;
            break;
          } else if (i < tokens1.length &&
              j + lookAhead < tokens2.length &&
              tokens1[i].text === tokens2[j + lookAhead].text) {
            // Found match by skipping tokens in right side
            left.push({
              start: tokens1[i].start,
              end: tokens1[i].end,
              type: 'modified'
            });
            for (let k = 0; k < lookAhead; k++) {
              right.push({
                start: tokens2[j + k].start,
                end: tokens2[j + k].end,
                type: 'modified'
              });
            }
            j += lookAhead;
            matchFound = true;
            break;
          }
          lookAhead++;
        }

        if (!matchFound) {
          // No match found within look-ahead - mark current tokens as modified
          left.push({
            start: tokens1[i].start,
            end: tokens1[i].end,
            type: 'modified'
          });
          right.push({
            start: tokens2[j].start,
            end: tokens2[j].end,
            type: 'modified'
          });
          i++;
          j++;
        }
      }
    }

    // Add any remaining tokens
    while (i < tokens1.length) {
      left.push({
        start: tokens1[i].start,
        end: tokens1[i].end,
        type: 'modified'
      });
      i++;
    }

    while (j < tokens2.length) {
      right.push({
        start: tokens2[j].start,
        end: tokens2[j].end,
        type: 'modified'
      });
      j++;
    }

    return { left, right };
  };

  // Apply a change from one side to the other
  const applyChange = (line: DiffLine, direction: 'left-to-right' | 'right-to-left') => {
    if (!leftTab || !rightTab) return;

    let newLeftContent = changeHistory[currentHistoryIndex].leftContent;
    let newRightContent = changeHistory[currentHistoryIndex].rightContent;

    if (direction === 'left-to-right') {
      // Apply left content to right tab
      const rightLines = newRightContent.split('\n');

      if (line.type === 'added') {
        // Line exists in left but not right - insert it
        if (line.rightLineNumber === null && line.leftLineNumber !== null) {
          // Find where to insert the line
          const insertIndex = findInsertIndex(diffLines, line);
          rightLines.splice(insertIndex, 0, line.leftContent);
        }
      } else if (line.type === 'modified' || line.type === 'removed') {
        // Line exists in both or only in right - replace or remove it
        if (line.rightLineNumber !== null) {
          if (line.type === 'modified') {
            rightLines[line.rightLineNumber - 1] = line.leftContent;
          } else {
            rightLines.splice(line.rightLineNumber - 1, 1);
          }
        }
      }

      newRightContent = rightLines.join('\n');
    } else {
      // Apply right content to left tab
      const leftLines = newLeftContent.split('\n');

      if (line.type === 'removed') {
        // Line exists in right but not left - insert it
        if (line.leftLineNumber === null && line.rightLineNumber !== null) {
          // Find where to insert the line
          const insertIndex = findInsertIndex(diffLines, line);
          leftLines.splice(insertIndex, 0, line.rightContent);
        }
      } else if (line.type === 'modified' || line.type === 'added') {
        // Line exists in both or only in left - replace or remove it
        if (line.leftLineNumber !== null) {
          if (line.type === 'modified') {
            leftLines[line.leftLineNumber - 1] = line.rightContent;
          } else {
            leftLines.splice(line.leftLineNumber - 1, 1);
          }
        }
      }

      newLeftContent = leftLines.join('\n');
    }

    // Update the content
    updateTabContent(leftTabId, newLeftContent);
    updateTabContent(rightTabId, newRightContent);

    // Add to history
    const newHistory = changeHistory.slice(0, currentHistoryIndex + 1);
    newHistory.push({ leftContent: newLeftContent, rightContent: newRightContent });
    setChangeHistory(newHistory);
    setCurrentHistoryIndex(currentHistoryIndex + 1);
  };

  // Reject a change from one side
  const rejectChange = (line: DiffLine, side: 'left' | 'right') => {
    if (!leftTab || !rightTab) return;

    let newLeftContent = changeHistory[currentHistoryIndex].leftContent;
    let newRightContent = changeHistory[currentHistoryIndex].rightContent;

    if (side === 'left') {
      // Remove the change from the left side
      const leftLines = newLeftContent.split('\n');

      if (line.type === 'added' && line.leftLineNumber !== null) {
        // Remove the added line
        leftLines.splice(line.leftLineNumber - 1, 1);
      } else if (line.type === 'modified' && line.leftLineNumber !== null) {
        // Revert to right content
        leftLines[line.leftLineNumber - 1] = line.rightContent;
      }

      newLeftContent = leftLines.join('\n');
    } else {
      // Remove the change from the right side
      const rightLines = newRightContent.split('\n');

      if (line.type === 'removed' && line.rightLineNumber !== null) {
        // Remove the line that was marked for removal
        rightLines.splice(line.rightLineNumber - 1, 1);
      } else if (line.type === 'modified' && line.rightLineNumber !== null) {
        // Revert to left content
        rightLines[line.rightLineNumber - 1] = line.leftContent;
      }

      newRightContent = rightLines.join('\n');
    }

    // Update the content
    updateTabContent(leftTabId, newLeftContent);
    updateTabContent(rightTabId, newRightContent);

    // Add to history
    const newHistory = changeHistory.slice(0, currentHistoryIndex + 1);
    newHistory.push({ leftContent: newLeftContent, rightContent: newRightContent });
    setChangeHistory(newHistory);
    setCurrentHistoryIndex(currentHistoryIndex + 1);
  };

  // Find the index where a line should be inserted
  const findInsertIndex = (diffLines: DiffLine[], currentLine: DiffLine): number => {
    const lineIndex = diffLines.indexOf(currentLine);

    // Look for the nearest line with a valid line number on the target side
    let insertIndex = 0;

    if (currentLine.rightLineNumber === null) {
      // Inserting into right side
      // Find the previous line with a right line number
      for (let i = lineIndex - 1; i >= 0; i--) {
        if (diffLines[i].rightLineNumber !== null) {
          insertIndex = diffLines[i].rightLineNumber as number;
          break;
        }
      }
    } else {
      // Inserting into left side
      // Find the previous line with a left line number
      for (let i = lineIndex - 1; i >= 0; i--) {
        if (diffLines[i].leftLineNumber !== null) {
          insertIndex = diffLines[i].leftLineNumber as number;
          break;
        }
      }
    }

    return insertIndex;
  };

  // Calculate diff between two strings
  const calculateDiff = (leftContent: string, rightContent: string): DiffLine[] => {
    const leftLines = leftContent.split('\n');
    const rightLines = rightContent.split('\n');

    const result: DiffLine[] = [];
    let leftIndex = 0;
    let rightIndex = 0;

    // Create a map of line content to all its positions in both files
    const lineMap = new Map<string, { left: number[]; right: number[] }>();

    leftLines.forEach((line, index) => {
      const positions = lineMap.get(line) || { left: [], right: [] };
      positions.left.push(index);
      lineMap.set(line, positions);
    });

    rightLines.forEach((line, index) => {
      const positions = lineMap.get(line) || { left: [], right: [] };
      positions.right.push(index);
      lineMap.set(line, positions);
    });

    // Process lines
    while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
      if (leftIndex >= leftLines.length) {
        // Only right lines remain - add as removed
        result.push({
          leftLineNumber: null,
          rightLineNumber: rightIndex + 1,
          leftContent: '',
          rightContent: rightLines[rightIndex],
          type: 'removed'
        });
        rightIndex++;
        continue;
      }

      if (rightIndex >= rightLines.length) {
        // Only left lines remain - add as added
        result.push({
          leftLineNumber: leftIndex + 1,
          rightLineNumber: null,
          leftContent: leftLines[leftIndex],
          rightContent: '',
          type: 'added'
        });
        leftIndex++;
        continue;
      }

      const leftLine = leftLines[leftIndex];
      const rightLine = rightLines[rightIndex];

      if (leftLine === rightLine) {
        // Lines are identical
        result.push({
          leftLineNumber: leftIndex + 1,
          rightLineNumber: rightIndex + 1,
          leftContent: leftLine,
          rightContent: rightLine,
          type: 'unchanged'
        });
        leftIndex++;
        rightIndex++;
      } else {
        // Lines are different - check if they appear later
        const leftPositions = lineMap.get(leftLine)?.right || [];
        const rightPositions = lineMap.get(rightLine)?.left || [];

        // Find the closest future match
        const nextLeftMatch = leftPositions.find(pos => pos > rightIndex);
        const nextRightMatch = rightPositions.find(pos => pos > leftIndex);

        if (nextLeftMatch !== undefined &&
            (nextRightMatch === undefined || nextLeftMatch - rightIndex <= nextRightMatch - leftIndex)) {
          // Left line appears later in right - add right line as removed
          result.push({
            leftLineNumber: null,
            rightLineNumber: rightIndex + 1,
            leftContent: '',
            rightContent: rightLine,
            type: 'removed'
          });
          rightIndex++;
        } else if (nextRightMatch !== undefined) {
          // Right line appears later in left - add left line as added
          result.push({
            leftLineNumber: leftIndex + 1,
            rightLineNumber: null,
            leftContent: leftLine,
            rightContent: '',
            type: 'added'
          });
          leftIndex++;
        } else {
          // Neither line appears later - check if they're similar
          const similarity = calculateSimilarity(leftLine, rightLine);
          if (similarity > 0.5) {
            // Lines are similar - mark as modified
            result.push({
              leftLineNumber: leftIndex + 1,
              rightLineNumber: rightIndex + 1,
              leftContent: leftLine,
              rightContent: rightLine,
              type: 'modified',
              charDiffs: calculateCharDiffs(leftLine, rightLine)
            });
          } else {
            // Lines are different - add as separate changes
            result.push({
              leftLineNumber: leftIndex + 1,
              rightLineNumber: null,
              leftContent: leftLine,
              rightContent: '',
              type: 'added'
            });
            result.push({
              leftLineNumber: null,
              rightLineNumber: rightIndex + 1,
              leftContent: '',
              rightContent: rightLine,
              type: 'removed'
            });
          }
          leftIndex++;
          rightIndex++;
        }
      }
    }

    return result;
  };

  // Calculate similarity between two strings (0 to 1)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const tokens1 = str1.split(/\s+/);
    const tokens2 = str2.split(/\s+/);

    let matches = 0;
    for (const token1 of tokens1) {
      if (tokens2.includes(token1)) {
        matches++;
      }
    }

    return matches * 2 / (tokens1.length + tokens2.length);
  };

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Ctrl (or Cmd on Mac) is pressed
      const ctrlPressed = e.ctrlKey || e.metaKey;

      if (ctrlPressed && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          // Ctrl+Shift+Z for Redo
          handleRedo();
        } else {
          // Ctrl+Z for Undo
          handleUndo();
        }
      } else if (ctrlPressed && e.key === 'y') {
        e.preventDefault();
        // Ctrl+Y for Redo
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  if (!leftTab || !rightTab) {
    return null;
  }

  // Render a line with character-level diff highlighting
  const renderDiffContent = (content: string, diffs?: { start: number; end: number; type: 'unchanged' | 'modified' }[]) => {
    if (!diffs) return content;

    return diffs.map((diff, index) => {
      const segment = content.slice(diff.start, diff.end);
      return (
          <span
              key={index}
              className={diff.type === 'modified' ? 'bg-yellow-500/30' : ''}
          >
          {segment}
        </span>
      );
    });
  };

  return (
      <div className="fixed inset-8 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between bg-gray-700 px-4 py-2">
          <div className="flex items-center space-x-4">
            <h2 className="text-gray-200 font-medium">
              Compare: {leftTab.title} ↔ {rightTab.title}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                  className={`p-1 rounded hover:bg-gray-600 ${canUndo ? 'text-gray-200' : 'text-gray-500'}`}
                  onClick={handleUndo}
                  disabled={!canUndo}
                  title="Undo (Ctrl+Z)"
              >
                <Undo2 size={16} />
              </button>
              <button
                  className={`p-1 rounded hover:bg-gray-600 ${canRedo ? 'text-gray-200' : 'text-gray-500'}`}
                  onClick={handleRedo}
                  disabled={!canRedo}
                  title="Redo (Ctrl+Y)"
              >
                <Redo2 size={16} />
              </button>
            </div>
          </div>
          <button
              className="text-gray-400 hover:text-gray-200"
              onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="flex text-xs font-mono">
            <div className="w-1/2 border-r border-gray-600">
              <div className="sticky top-0 bg-gray-700 px-4 py-2 text-gray-300 font-semibold">
                {leftTab.title}
              </div>
            </div>
            <div className="w-1/2">
              <div className="sticky top-0 bg-gray-700 px-4 py-2 text-gray-300 font-semibold">
                {rightTab.title}
              </div>
            </div>
          </div>

          <div className="flex flex-col text-xs font-mono">
            {diffLines.map((line, index) => (
                <div
                    key={index}
                    className={`flex hover:bg-gray-700 ${
                        line.type === 'unchanged' ? 'bg-gray-800' :
                            line.type === 'added' ? 'bg-green-900/30' :
                                line.type === 'removed' ? 'bg-red-900/30' :
                                    'bg-yellow-900/30' // modified
                    }`}
                >
                  <div className="w-1/2 border-r border-gray-600 flex">
                    <div className="w-8 text-right px-2 text-gray-500 select-none border-r border-gray-700">
                      {line.leftLineNumber || ' '}
                    </div>
                    <div className="flex-1 px-2 overflow-x-auto whitespace-pre">
                      {line.type === 'modified' ?
                          renderDiffContent(line.leftContent, line.charDiffs?.left) :
                          line.leftContent
                      }
                    </div>
                    <div className="flex items-center">
                      {(line.type === 'added' || line.type === 'modified') && (
                          <>
                            <button
                                className="px-1 text-gray-400 hover:text-white"
                                onClick={() => applyChange(line, 'left-to-right')}
                                title="Apply to right"
                            >
                              <ArrowRight size={14} />
                            </button>
                            <button
                                className="px-1 text-gray-400 hover:text-red-400"
                                onClick={() => rejectChange(line, 'left')}
                                title="Remove this change"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                      )}
                    </div>
                  </div>
                  <div className="w-1/2 flex">
                    <div className="w-8 text-right px-2 text-gray-500 select-none border-r border-gray-700">
                      {line.rightLineNumber || ' '}
                    </div>
                    <div className="flex-1 px-2 overflow-x-auto whitespace-pre">
                      {line.type === 'modified' ?
                          renderDiffContent(line.rightContent, line.charDiffs?.right) :
                          line.rightContent
                      }
                    </div>
                    <div className="flex items-center">
                      {(line.type === 'removed' || line.type === 'modified') && (
                          <>
                            <button
                                className="px-1 text-gray-400 hover:text-red-400"
                                onClick={() => rejectChange(line, 'right')}
                                title="Remove this change"
                            >
                              <XCircle size={14} />
                            </button>
                            <button
                                className="px-1 text-gray-400 hover:text-white"
                                onClick={() => applyChange(line, 'right-to-left')}
                                title="Apply to left"
                            >
                              <ArrowLeft size={14} />
                            </button>
                          </>
                      )}
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>
  );
};