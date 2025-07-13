import React, { useState, useRef, useCallback } from "react";
import { Brain } from "lucide-react";
import { useAIStore } from "../../stores/aiStore";
import { useModalStore } from "../../stores/modalStore";
import { AITooltip } from "./AIToolTip";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";

export const AIStatusIcon: React.FC = () => {
  // FIX: Use useStoreWithEqualityFn with shallow comparison to prevent unnecessary re-renders
  const {
    isReady,
    isLoading,
    error,
    progress,
    progressStatus,
    files,
    isCodegenReady,
    isCodegenLoading,
    codegenProgress,
    codegenProgressStatus,
    codegenError,
    codegenFiles,
  } = useStoreWithEqualityFn(
    useAIStore,
    (state) => ({
      isReady: state.ai.isReady,
      isLoading: state.ai.isLoading,
      error: state.ai.error,
      progress: state.ai.progress,
      progressStatus: state.ai.progressStatus,
      files: state.ai.files,
      isCodegenReady: state.ai.isCodegenReady,
      isCodegenLoading: state.ai.isCodegenLoading,
      codegenProgress: state.ai.codegenProgress,
      codegenProgressStatus: state.ai.codegenProgressStatus,
      codegenError: state.ai.codegenError,
      codegenFiles: state.ai.codegenFiles,
    }),
    shallow,
  );

  const { openAIModelManagementModal } = useModalStore();

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = useCallback(() => {
    // Open the AI model management modal instead of directly initializing
    openAIModelManagementModal();
  }, [openAIModelManagementModal]);

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
  let iconColor = "text-blue-400"; // Default to blue for not ready states
  let hoverColor = "hover:text-blue-300";
  let animationClass = "";
  let title = "Open AI Model Management";

  if (isReady && isCodegenReady) {
    // Both models ready - use same color as nearby icons
    iconColor = "text-gray-300";
    hoverColor = "hover:text-gray-200";
    title = "AI Ready - Click to manage models";
  } else if (error || codegenError) {
    iconColor = "text-blue-400"; // Blue for error states instead of red
    hoverColor = "hover:text-blue-300";
    title = "AI Error - Click to manage models";
  } else if (isLoading || isCodegenLoading) {
    // Check both loading states for pulse
    iconColor = "text-blue-400";
    hoverColor = "hover:text-blue-300";
    animationClass = "animate-pulse"; // Pulse when either model is loading
    title = "AI Downloading - Click to view progress";
  } else if (isReady && !isCodegenReady) {
    // Summary ready, codegen not ready
    iconColor = "text-blue-400"; // Blue for partial readiness instead of yellow
    hoverColor = "hover:text-blue-300";
    title = "AI Partially Ready - Click to manage models";
  }
  // All other states use blue as default

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={`p-1 rounded transition-colors ${iconColor} ${hoverColor}`}
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
        codegenStatus={codegenProgressStatus}
        codegenProgress={codegenProgress}
        codegenError={codegenError}
        codegenFiles={codegenFiles}
      />
    </div>
  );
};
