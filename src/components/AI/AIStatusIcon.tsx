import React, { useState, useRef, useCallback } from 'react';
import { Brain } from 'lucide-react';
import { useAIStore } from '../../stores/aiStore';
import { AITooltip } from './AIToolTip';

export const AIStatusIcon: React.FC = () => {
  const { isReady, isLoading, error, progress, progressStatus, files, initializeModel } = useAIStore(state => ({
      isReady: state.ai.isReady,
      isLoading: state.ai.isLoading, // Use this for pulse/disabled
      error: state.ai.error,
      progress: state.ai.progress,
      progressStatus: state.ai.progressStatus,
      files: state.ai.files,
      initializeModel: state.initializeModel,
  }));

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = useCallback(() => {
    if (!isReady && !isLoading) { // Only allow init if not ready AND not already loading
      initializeModel();
    }
  }, [isReady, isLoading, initializeModel]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top });
            setTooltipVisible(true);
        }
    }, 300); // Shorter delay maybe
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setTooltipVisible(false);
    setTooltipPosition(null);
  };

  // Determine icon color, animation, and title based on state
  let iconColor = 'text-gray-400';
  let hoverColor = 'hover:text-gray-300';
  let animationClass = '';
  let title = 'Initialize AI Model';

  if (error) {
    iconColor = 'text-red-400';
    hoverColor = 'hover:text-red-300';
    title = `AI Error: ${error}`;
  } else if (isLoading) { // Check isLoading for pulse
    iconColor = 'text-blue-400';
    hoverColor = 'hover:text-blue-300';
    animationClass = 'animate-pulse'; // Pulse when isLoading is true
    title = `AI Initializing (${progressStatus})... ${progress}%`;
  } else if (isReady) { // Check isReady only if not loading/errored
    iconColor = 'text-green-100'; // Green when ready
    hoverColor = 'hover:text-green-300';
    title = 'AI Ready';
  }
  // If !isReady and !isLoading and !error, it stays gray (initial state)

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={isLoading || isReady} // Disable click if loading or already ready
        className={`p-1 rounded transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${iconColor} ${hoverColor}`}
        title={title}
        aria-describedby={tooltipVisible ? "ai-tooltip-content" : undefined}
      >
        {/* Apply animation class based on isLoading */}
        <Brain size={16} className={animationClass} />
      </button>
      <AITooltip
        visible={tooltipVisible}
        position={tooltipPosition}
        status={progressStatus}
        progress={progress}
        error={error}
        files={files}
      />
    </div>
  );
};