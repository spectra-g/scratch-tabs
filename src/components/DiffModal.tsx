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
}

interface ChangeHistoryEntry {
  leftContent: string;
  rightContent: string;
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
    
    // Simple diff algorithm (LCS-based)
    const result: DiffLine[] = [];
    let leftIndex = 0;
    let rightIndex = 0;
    
    // Find common prefix
    while (leftIndex < leftLines.length && 
           rightIndex < rightLines.length && 
           leftLines[leftIndex] === rightLines[rightIndex]) {
      result.push({
        leftLineNumber: leftIndex + 1,
        rightLineNumber: rightIndex + 1,
        leftContent: leftLines[leftIndex],
        rightContent: rightLines[rightIndex],
        type: 'unchanged'
      });
      leftIndex++;
      rightIndex++;
    }
    
    // Find common suffix
    let leftSuffix = leftLines.length - 1;
    let rightSuffix = rightLines.length - 1;
    const suffixLines: DiffLine[] = [];
    
    while (leftSuffix >= leftIndex && 
           rightSuffix >= rightIndex && 
           leftLines[leftSuffix] === rightLines[rightSuffix]) {
      suffixLines.unshift({
        leftLineNumber: leftSuffix + 1,
        rightLineNumber: rightSuffix + 1,
        leftContent: leftLines[leftSuffix],
        rightContent: rightLines[rightSuffix],
        type: 'unchanged'
      });
      leftSuffix--;
      rightSuffix--;
    }
    
    // Process the middle (different) part
    // This is a simplified diff that doesn't try to find optimal matching
    // For a real implementation, you'd want to use a proper diff algorithm
    
    // Add remaining left lines
    for (let i = leftIndex; i <= leftSuffix; i++) {
      // Check if this line exists in the right side
      const rightMatch = rightLines.slice(rightIndex, rightSuffix + 1).indexOf(leftLines[i]);
      
      if (rightMatch !== -1) {
        // Line exists in both sides but at different positions
        // Add all right lines before the match as 'added'
        for (let j = rightIndex; j < rightIndex + rightMatch; j++) {
          result.push({
            leftLineNumber: null,
            rightLineNumber: j + 1,
            leftContent: '',
            rightContent: rightLines[j],
            type: 'removed'
          });
        }
        
        // Add the matching line as 'unchanged'
        result.push({
          leftLineNumber: i + 1,
          rightLineNumber: rightIndex + rightMatch + 1,
          leftContent: leftLines[i],
          rightContent: rightLines[rightIndex + rightMatch],
          type: 'unchanged'
        });
        
        // Update right index
        rightIndex = rightIndex + rightMatch + 1;
      } else {
        // Line only exists in left side
        result.push({
          leftLineNumber: i + 1,
          rightLineNumber: null,
          leftContent: leftLines[i],
          rightContent: '',
          type: 'added'
        });
      }
    }
    
    // Add any remaining right lines
    for (let i = rightIndex; i <= rightSuffix; i++) {
      result.push({
        leftLineNumber: null,
        rightLineNumber: i + 1,
        leftContent: '',
        rightContent: rightLines[i],
        type: 'removed'
      });
    }
    
    // Add the common suffix
    result.push(...suffixLines);
    
    return result;
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
                  {line.leftContent}
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
                  {line.rightContent}
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