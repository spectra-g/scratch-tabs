import React, { useState, useEffect, useRef } from 'react';
import { BaseModal } from '../../languages/json/components/modals/BaseModal';
import { useAIStore } from '../../stores/aiStore';
import { Loader2 } from 'lucide-react';

interface SummarizeModalProps {
  content: string;
  onClose: () => void;
}

export const SummarizeModal: React.FC<SummarizeModalProps> = ({ content, onClose }) => {
  console.log("[SummarizeModal] Rendering.");

  const { summarizeText, isAiReady, aiError } = useAIStore(state => ({
      summarizeText: state.summarizeText,
      isAiReady: state.ai.isReady,
      aiError: state.ai.error
  }));

  // 1. Show spinner immediately if content exists
  const [localIsGenerating, setLocalIsGenerating] = useState<boolean>(!!content);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const didInitiateSummarize = useRef(false);

  // Mount / Reset Effect
  useEffect(() => {
    isMounted.current = true;
    didInitiateSummarize.current = false;
    setError(aiError ? `AI Initialization Error: ${aiError}` : null);
    setSummary('');
    setLocalIsGenerating(!!content); // Reset spinner on remount
    return () => {
      isMounted.current = false;
    };
  }, [aiError, content]);

  // Summarization Trigger Effect
  useEffect(() => {
    if (!content || !isAiReady || aiError) return;
    if (didInitiateSummarize.current) return;
    didInitiateSummarize.current = true;
    setLocalIsGenerating(true);
    setError(null);
    setSummary('');
    const timerId = setTimeout(() => {
      if (!isMounted.current) return;
      const getSummary = async () => {
        try {
          const result = await summarizeText(content);
          if (typeof result === 'string' && result.trim()) {
            setSummary(result.trim().replace(/^['"]|['"]$/g, ''));
            setError(null);
          } else {
            setSummary('');
            setError('Could not extract summary.');
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to generate summary';
          setSummary('');
          setError(errorMessage);
        } finally {
          if (isMounted.current) setLocalIsGenerating(false);
        }
      };
      getSummary();
    }, 10);
    return () => clearTimeout(timerId);
  }, [content, summarizeText, isAiReady, aiError]);

  // Spinner logic: only local state
  const showSpinner = localIsGenerating;
  const currentError = error || aiError;
  const loadingText = 'Generating summary...';

  console.log("[SummarizeModal] Rendering UI. State:", { showSpinner, currentError, summaryLength: summary?.length });

  return (
    <BaseModal title="Summary" onClose={onClose} maxWidthClass="max-w-2xl">
      <div className="p-5 md:p-6 min-h-[250px] flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar bg-gray-900/30 rounded-md p-4">
          {showSpinner && !currentError && (
            <div className="flex h-full flex-col items-center justify-center space-y-3 text-center text-gray-400">
              <Loader2 className="animate-spin text-blue-400" size={28} />
              <p className="text-sm">{loadingText}</p>
            </div>
          )}
          {currentError && (
            <div className="text-red-300 p-4 bg-red-900/30 rounded border border-red-500/40">
              <p className="font-semibold text-red-200 mb-1">Summarization Error</p>
              <p className="text-sm">{currentError}</p>
            </div>
          )}
          {!showSpinner && !currentError && (
            <div className="prose prose-sm prose-invert max-w-none text-gray-200 whitespace-pre-wrap leading-relaxed">
              {summary || <span className="text-gray-500 italic">Summary could not be generated or is empty.</span>}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};