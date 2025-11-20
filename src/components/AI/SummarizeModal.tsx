import React, { useState, useEffect, useRef } from "react";
import { BaseModal } from "../../formats/json/components/modals/BaseModal";
import { useAIStore } from "../../stores/aiStore";
import "./SummarizeModal.css";

interface SummarizeModalProps {
  content: string;
  onClose: () => void;
}

export const SummarizeModal: React.FC<SummarizeModalProps> = ({
  content,
  onClose,
}) => {
  const {
    summarizeText,
    isAiReady,
    aiError,
    isGenerating,
    summaryResult,
    storeError,
  } = useAIStore((state) => ({
    summarizeText: state.summarizeText,
    isAiReady: state.ai.isReady,
    aiError: state.ai.error,
    isGenerating: state.ai.isGenerating,
    summaryResult: state.ai.summaryResult,
    storeError: state.ai.error,
  }));

  const [localSummary, setLocalSummary] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const didInitiateSummarize = useRef(false);

  // Mount / Reset Effect
  useEffect(() => {
    isMounted.current = true;
    didInitiateSummarize.current = false;
    setLocalError(aiError);
    setLocalSummary("");
    return () => {
      isMounted.current = false;
    };
  }, [aiError]);

  // Summarization Trigger Effect - only triggers the process
  useEffect(() => {
    if (!content || !isAiReady || aiError) return;
    if (didInitiateSummarize.current) return;

    didInitiateSummarize.current = true;
    setLocalError(null);
    setLocalSummary("");
    summarizeText(content);
  }, [content, summarizeText, isAiReady, aiError]);

  // Effect to react to store changes (summary result or error)
  useEffect(() => {
    if (!isMounted.current || !summaryResult) return;

    // Fix for removing quotes but not stripping first character
    const fullText = summaryResult.replace(/^['"]|['"]$/g, "");

    // Reset for new summary
    setLocalSummary("");
    setLocalError(null);

    let currentText = "";
    let idx = 0;

    const interval = setInterval(() => {
      if (idx < fullText.length) {
        currentText += fullText[idx];
        setLocalSummary(currentText);
        idx++;
      } else {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [summaryResult]);

  useEffect(() => {
    if (!isMounted.current) return;
    if (isGenerating === false && storeError && storeError !== aiError) {
      setLocalError(storeError);
      setLocalSummary("");
    } else if (isGenerating === true && !aiError) {
      setLocalError(null);
    }
  }, [storeError, isGenerating, aiError]);

  const currentError = localError;
  const showThinking = isGenerating;
  const thinkingText = "Summarizing...";

  return (
    <BaseModal title="Summary" onClose={onClose} maxWidthClass="max-w-4xl">
      <div className="p-2 min-h-[250px] flex flex-col">
        {/* Experimental feature notice */}
        <div className="mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/30 rounded-md text-xs text-blue-800 dark:text-blue-200">
          <span className="font-semibold">Experimental Feature:</span> This AI
          summary is processed entirely in your browser. No content is sent to
          any servers - your data remains private and local.
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar bg-themed-secondary rounded-md p-4 flex items-center justify-center border border-themed shadow-inner">
          {showThinking && !currentError && (
            <div className="flex items-center justify-center space-x-1 text-blue-400">
              <div className="text-shimmer p-1">
                <span className="text-sm">{thinkingText}</span>
              </div>
            </div>
          )}
          {currentError && (
            <div className="text-center text-red-800 dark:text-red-300 p-4 bg-red-50 dark:bg-red-900/80 rounded border border-red-200 dark:border-red-500/40 shadow-lg">
              <p className="font-semibold text-red-900 dark:text-red-200 mb-1">
                Summarization Error
              </p>
              <p className="text-sm">{currentError}</p>
            </div>
          )}
          {!showThinking && !currentError && (
            <div className="relative prose prose-sm dark:prose-invert max-w-none text-themed whitespace-pre-wrap leading-relaxed p-2 bg-themed rounded-md border border-themed">
              {localSummary || (
                <span className="text-themed-muted italic">
                  Summary could not be generated or is empty.
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
