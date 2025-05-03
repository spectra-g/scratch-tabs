import { create } from 'zustand';
import { pipeline, Pipeline, SummarizationPipeline, PipelineType } from '@huggingface/transformers';

interface FileProgress {
  file: string;
  loaded: number;
  total?: number;
  percent?: number;
  status?: string;
}

interface AIState {
  pipelineInstance: SummarizationPipeline | null;
  isReady: boolean;
  isLoading: boolean; // Loading the model itself
  error: string | null;
  isGenerating: boolean; // Generating a summary
  progress: number;
  progressStatus: string; // e.g., 'idle', 'downloading', 'initializing', 'ready', 'error'
  files: Record<string, FileProgress>; // <-- NEW: per-file progress
}

export interface AISlice {
  ai: AIState;
  initializeModel: () => Promise<void>;
  summarizeText: (text: string) => Promise<string>;
}

console.log("[AI Store] Defining store...");

// Helper function to update progress state for the ai slice only
function updateProgressState(ai: AIState, p: any): AIState {
  if (!ai.isLoading) return ai;
  let files = { ...ai.files };
  if (p.file && typeof p.loaded === 'number') {
    files[p.file] = {
      file: p.file,
      loaded: p.loaded,
      total: p.total,
      percent: p.total ? Math.round((p.loaded / p.total) * 100) : undefined,
      status: p.status,
    };
  }
  const newProgress = p.status === 'progress' && typeof p.progress === 'number' ? Math.round(p.progress) : ai.progress;
  const newStatus = p.status === 'ready' ? 'initializing' : p.status;
  return {
    pipelineInstance: ai.pipelineInstance,
    isReady: ai.isReady,
    isLoading: ai.isLoading,
    error: ai.error,
    isGenerating: ai.isGenerating,
    progress: newProgress,
    progressStatus: newStatus,
    files,
  };
}

export const useAIStore = create<AISlice>((set, get) => ({
  ai: {
    pipelineInstance: null,
    isReady: false,
    isLoading: false,
    error: null,
    isGenerating: false,
    progress: 0,
    progressStatus: 'idle',
    files: {}, // <-- NEW
  },

  initializeModel: async () => {
    const currentState = get().ai;
    console.log("[AI Store] initializeModel called. Current state:", { isReady: currentState.isReady, isLoading: currentState.isLoading });

    if (currentState.isReady || currentState.isLoading) {
      console.log("[AI Store] Initialization skipped.");
      return;
    }

    console.log("[AI Store] Setting isLoading=true, progressStatus='initializing'");
    set(state => ({ ai: { ...state.ai, isLoading: true, error: null, progress: 0, progressStatus: 'initializing', files: {} } }));

    try {
      console.log("[AI Store] Initializing pipeline...");
      const pipe = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6', {
        progress_callback: (p: any) => {
          // @ts-expect-error Zustand/TS union complexity workaround
          set({ ai: updateProgressState(get().ai, p) });
        },
      }) as SummarizationPipeline;

      console.log("[AI Store] Pipeline initialized successfully.");
      set(state => ({ ai: { ...state.ai, pipelineInstance: pipe, isReady: true, isLoading: false, progress: 100, progressStatus: 'ready', files: {} } }));

    } catch (error) {
      console.error('[AI Store] Failed to initialize model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize model';
      set(state => ({ ai: { ...state.ai, error: errorMessage, isLoading: false, isReady: false, progressStatus: 'error', files: {} } }));
    }
  },

  summarizeText: async (text: string) => {
    const { pipelineInstance, isReady, isGenerating } = get().ai;
    console.log("[AI Store] summarizeText called. State:", { isReady, isGenerating });
    if (!isReady || !pipelineInstance) throw new Error('Summarization model not initialized or not ready.');
    if (isGenerating) throw new Error('Summarization already in progress. Please wait.');

    set(state => ({ ai: { ...state.ai, isGenerating: true, error: null } }));
    try {
      console.log("[AI Store] Calling pipeline instance...");
      const result = await pipelineInstance(text);
      console.log("[AI Store] Pipeline result:", result);
      let summary = '';
      if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object' && 'summary_text' in result[0]) {
          summary = (result[0] as any).summary_text.trim();
      } else { summary = "Could not extract summary."; }
      return summary;
    } catch (error) {
      console.error('[AI Store] An error occurred during summarization execution:', error);
      const errorMessage = error instanceof Error ? error.message : 'Summarization failed';
      set(state => ({ ai: { ...state.ai, error: errorMessage } }));
      throw error;
    } finally {
      set(state => ({ ai: { ...state.ai, isGenerating: false } }));
    }
  }
}));

// Ensure initializeModel is called from App.tsx useEffect