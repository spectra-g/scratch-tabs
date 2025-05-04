import React, { useState, useEffect, useRef } from 'react';
import { BaseModal } from '../../languages/json/components/modals/BaseModal';
import { useAIStore } from '../../stores/aiStore';
import { Brain, ClipboardCopy } from 'lucide-react';
import './SummarizeModal.css';

interface SummarizeModalProps {
  content: string;
  onClose: () => void;
}

export const SummarizeModal: React.FC<SummarizeModalProps> = ({ content, onClose }) => {
  const { 
    summarizeText, 
    isAiReady, 
    aiError, 
    isGenerating, // Get generation status from store
    summaryResult, // Get summary result from store
    storeError // Get error specifically set during summarization
  } = useAIStore(state => ({
      summarizeText: state.summarizeText,
      isAiReady: state.ai.isReady,
      aiError: state.ai.error, // Initial worker/load error
      isGenerating: state.ai.isGenerating,
      summaryResult: state.ai.summaryResult,
      storeError: state.ai.error // Also monitor error set by store during summary
  }));

  const [localSummary, setLocalSummary] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const isMounted = useRef(true);
  const didInitiateSummarize = useRef(false);

  // Mount / Reset Effect
  useEffect(() => {
    isMounted.current = true;
    didInitiateSummarize.current = false;
    setLocalError(aiError); // Set initial error from worker/load
    setLocalSummary('');
    return () => {
      isMounted.current = false;
    };
  }, [aiError]); // Only depend on initial load error

  // Summarization Trigger Effect - only triggers the process
  useEffect(() => {
    if (!content || !isAiReady || aiError) return; // If not ready or initial error
    if (didInitiateSummarize.current) return; // Prevent re-triggering
    
    didInitiateSummarize.current = true;
    setLocalError(null); // Clear local error before starting
    setLocalSummary('');
    console.log('[SummarizeModal] Triggering summarizeText');
    summarizeText(content); // Trigger the worker, don't await
  }, [content, summarizeText, isAiReady, aiError]);

  // Effect to react to store changes (summary result or error)
  useEffect(() => {
    if (!isMounted.current) return;

    if (summaryResult) {
      console.log('[SummarizeModal] Received summary result from store:', summaryResult);
      setLocalSummary(summaryResult.replace(/^['"]|['"]$/g, ''));
      setLocalError(null);
    }
  }, [summaryResult]);

  useEffect(() => {
    if (!isMounted.current) return;
    // Use the error from the store if it occurred *during* generation
    if (isGenerating === false && storeError && storeError !== aiError) { 
       console.log('[SummarizeModal] Received error from store:', storeError);
       setLocalError(storeError);
       setLocalSummary('');
    }
     // Clear local error if generation starts successfully without initial error
     else if (isGenerating === true && !aiError) { 
       setLocalError(null);
     }
  }, [storeError, isGenerating, aiError]);

  // Function to handle copying text to clipboard
  const handleCopy = async () => {
    if (!localSummary) return;
    try {
      await navigator.clipboard.writeText(localSummary);
      setIsCopied(true);
      setTimeout(() => {
        if (isMounted.current) {
          setIsCopied(false);
        }
      }, 1500); // Reset after 1.5 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Optionally show an error to the user
    }
  };

  const copyButton = localSummary ? (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 transition-colors duration-150 ml-2"
      aria-label="Copy summary to clipboard"
      title="Copy summary"
    >
      <ClipboardCopy size={16} />
    </button>
  ) : null;

  // Determine final error state to display
  const currentError = localError;
  const showThinking = isGenerating;
  const thinkingText = 'Thinking...';

  return (
    <BaseModal 
      title="Summary" 
      onClose={onClose} 
      maxWidthClass="max-w-2xl"
      headerActions={copyButton}
    >
      <div className="p-5 md:p-6 min-h-[250px] flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar bg-gray-900/30 rounded-md p-4 flex items-center justify-center">
          {showThinking && !currentError && (
            <div className="flex items-center justify-center space-x-1 text-blue-400">
              <Brain className="inline-block w-4 h-4 thinking-brain-pulse" aria-hidden="true" />
              <div className="text-shimmer">
                <span className="text-sm">{thinkingText}</span>
              </div>
            </div>
          )}
          {currentError && (
            <div className="text-center text-red-300 p-4 bg-red-900/30 rounded border border-red-500/40">
              <p className="font-semibold text-red-200 mb-1">Summarization Error</p>
              <p className="text-sm">{currentError}</p>
            </div>
          )}
          {!showThinking && !currentError && (
            <div className="relative prose prose-sm prose-invert max-w-none text-gray-200 whitespace-pre-wrap leading-relaxed">
              {localSummary || <span className="text-gray-500 italic">Summary could not be generated or is empty.</span>}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};