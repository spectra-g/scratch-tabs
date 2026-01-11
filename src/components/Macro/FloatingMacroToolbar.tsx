import React, { useState, useRef } from 'react';
import { Play, Square, Circle, SkipForward, ChevronDown, ChevronUp, X } from '../Icons';
import * as monaco from 'monaco-editor';
import { MacroEngine, ACTION_TYPE, Action } from './useMacroEngine';

interface FloatingMacroToolbarProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  engine: MacroEngine;
}

export const FloatingMacroToolbar: React.FC<FloatingMacroToolbarProps> = ({
  editor,
  engine,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ top: 20, right: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, top: 0, right: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  const {
    status,
    recordedActions,
    handleStartRecording,
    handleStopRecording,
    handlePlayRecording,
    handlePlayToEnd,
    canPlay,
    forceVisible,
    executingActionIndex,
  } = engine;

  const isRecording = status === 'recording';
  const isPlaying = status === 'playingOnce' || status === 'playingToEnd';

  // Show toolbar when recording, playing, has recorded actions, or forced visible
  const shouldShow = isRecording || isPlaying || recordedActions.length > 0 || forceVisible;

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!nodeRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      top: position.top,
      right: position.right,
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !nodeRef.current || !nodeRef.current.parentElement) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    const parentRect = nodeRef.current.parentElement.getBoundingClientRect();
    const toolbarRect = nodeRef.current.getBoundingClientRect();

    setPosition({
      top: Math.max(0, Math.min(parentRect.height - toolbarRect.height, dragStart.top + dy)),
      right: Math.max(0, Math.min(parentRect.width - toolbarRect.width, dragStart.right - dx)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove global mouse listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);



  // Don't render if not needed (AFTER all hooks are called)
  if (!shouldShow || !editor) {
    return null;
  }

  const getStatusText = () => {
    if (isRecording) {
      return `Recording... (${recordedActions.length} actions)`;
    }
    if (isPlaying) {
      return `Playing... (${executingActionIndex + 1}/${recordedActions.length})`;
    }
    return `Ready (${recordedActions.length} actions recorded)`;
  };

  const getStatusColor = () => {
    if (isRecording) return 'text-red-500';
    if (isPlaying) return 'text-blue-500';
    return 'text-green-500';
  };

  // Format action for display
  const formatAction = (action: Action): string => {
    switch (action.type) {
      case ACTION_TYPE.CHAR:
        return `Type: "${action.value}"`;
      case ACTION_TYPE.DELETE_LEFT:
        return 'Backspace';
      case ACTION_TYPE.DELETE_RIGHT:
        return 'Delete';
      case ACTION_TYPE.PASTE:
        return `Paste: "${action.value.substring(0, 20)}${action.value.length > 20 ? '...' : ''}"`;
      case ACTION_TYPE.NEW_LINE:
        return 'Enter';
      case ACTION_TYPE.MOVE_LEFT:
        return 'Arrow Left';
      case ACTION_TYPE.MOVE_RIGHT:
        return 'Arrow Right';
      case ACTION_TYPE.MOVE_UP:
        return 'Arrow Up';
      case ACTION_TYPE.MOVE_DOWN:
        return 'Arrow Down';
      case ACTION_TYPE.SELECT_LEFT:
        return 'Shift+Arrow Left';
      case ACTION_TYPE.SELECT_RIGHT:
        return 'Shift+Arrow Right';
      case ACTION_TYPE.SELECT_UP:
        return 'Shift+Arrow Up';
      case ACTION_TYPE.SELECT_DOWN:
        return 'Shift+Arrow Down';
      case ACTION_TYPE.COPY:
        return 'Copy';
      case ACTION_TYPE.MOVE_HOME:
        return 'Home';
      case ACTION_TYPE.MOVE_END:
        return 'End';
      case ACTION_TYPE.SELECT_HOME:
        return 'Shift+Home';
      case ACTION_TYPE.SELECT_END:
        return 'Shift+End';
      default:
        return 'Unknown action';
    }
  };

  return (
    <div
      ref={nodeRef}
      className="absolute bg-surface border border-base rounded-lg shadow-2xl z-40 overflow-hidden"
      style={{
        right: `${position.right}px`,
        top: `${position.top}px`,
        minWidth: isMinimized ? '200px' : '400px',
        maxWidth: '500px',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Header - Draggable */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-surface-tab-bar border-b border-base select-none cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <Circle
            size={10}
            className={`${isRecording ? 'fill-red-500 animate-pulse' : 'fill-gray-400'}`}
          />
          <span className="text-xs font-semibold text-main">Macro Controls</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleMinimize}
            className="p-1 hover:bg-themed-hover rounded transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => {
              engine.handleClearRecording();
            }}
            className="p-1 hover:bg-themed-hover rounded transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <div className="p-3 space-y-3">
          {/* Status */}
          <div className={`text-xs ${getStatusColor()} font-medium`}>
            {getStatusText()}
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {!isRecording && !isPlaying && (
              <button
                onClick={handleStartRecording}
                className="flex items-center space-x-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                title="Start Recording (Ctrl+Shift+R)"
              >
                <Circle size={12} className="fill-white" />
                <span>Record</span>
              </button>
            )}

            {(isRecording || isPlaying) && (
              <button
                onClick={handleStopRecording}
                className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                title="Stop (Ctrl+Shift+R)"
              >
                <Square size={12} className="fill-white" />
                <span>Stop</span>
              </button>
            )}

            {!isRecording && !isPlaying && canPlay && (
              <>
                <button
                  onClick={handlePlayRecording}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
                  title="Play Next Action (Ctrl+Shift+P)"
                >
                  <Play size={12} className="fill-white" />
                  <span>Play</span>
                </button>
                <button
                  onClick={handlePlayToEnd}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
                  title="Play to End (Ctrl+Shift+E)"
                >
                  <SkipForward size={12} />
                  <span>Play to End</span>
                </button>
              </>
            )}
          </div>

          {/* Progress Bar (when playing) */}
          {isPlaying && recordedActions.length > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-secondary">
                <span>Progress</span>
                <span>{executingActionIndex + 1} / {recordedActions.length}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-200"
                  style={{
                    width: `${((executingActionIndex + 1) / recordedActions.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* Action List */}
          {recordedActions.length > 0 && (
            <div className="pt-2 border-t border-base">
              <div className="text-xs text-secondary font-semibold mb-1">Actions Recorded:</div>
              <div className="max-h-[150px] overflow-y-auto bg-element-hover rounded p-2 space-y-1 custom-scrollbar">
                {recordedActions.map((action: Action, index: number) => (
                  <div
                    key={index}
                    className="text-xs font-mono text-main"
                  >
                    {index + 1}. {formatAction(action)}
                  </div>
                ))}
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  );
};
