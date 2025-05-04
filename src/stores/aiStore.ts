import { create } from 'zustand';
import { pipeline, Pipeline, SummarizationPipeline, PipelineType } from '@huggingface/transformers';

interface FileProgress {
  file: string;
  loaded: number;
  total?: number;
  percent?: number;
  status?: string;
  completed: boolean;
  lastUpdateTime: number;
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

// Helper function to update progress state for the ai slice only
function updateProgressState(ai: AIState, p: any): AIState {
  if (!ai.isLoading) return ai;
  let files = { ...ai.files };
  if (p.file && typeof p.loaded === 'number') {
    const percent = p.total ? Math.round((p.loaded / p.total) * 100) : undefined;
    files[p.file] = {
      file: p.file,
      loaded: p.loaded,
      total: p.total,
      percent: percent,
      status: p.status,
      completed: percent === 100,
      lastUpdateTime: Date.now(),
    };
  }
  const newProgress = p.status === 'progress' && typeof p.progress === 'number' ? Math.round(p.progress) : ai.progress;
  const currentStatusUpdate = p.status === 'ready' && ai.progressStatus !== 'ready' ? 'initializing' : p.status;

  const allFilesCompleted = Object.values(files).every(f => f.completed);
  const finalOverallStatus = ai.isReady ? 'ready' : (allFilesCompleted ? 'initializing' : currentStatusUpdate);

  return {
    pipelineInstance: ai.pipelineInstance,
    isReady: ai.isReady,
    isLoading: ai.isLoading,
    error: ai.error,
    isGenerating: ai.isGenerating,
    progress: newProgress,
    progressStatus: finalOverallStatus,
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

    if (currentState.isReady || currentState.isLoading) {
      return;
    }

    set(state => ({ ai: { ...state.ai, isLoading: true, error: null, progress: 0, progressStatus: 'initializing', files: {} } }));

    try {
      const pipe = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6', {
        progress_callback: (p: any) => {
          set((state: AISlice) => ({ ai: updateProgressState(state.ai, p) }));
        },
      }) as SummarizationPipeline;

      set(state => ({ ai: { ...state.ai, pipelineInstance: pipe, isReady: true, isLoading: false, progress: 100, progressStatus: 'ready', files: {} } }));

    } catch (error) {
      console.error('[AI Store] Failed to initialize model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize model';
      set(state => ({ ai: { ...state.ai, error: errorMessage, isLoading: false, isReady: false, progressStatus: 'error', files: {} } }));
    }
  },

  summarizeText: async (text: string) => {
    const { pipelineInstance, isReady, isGenerating } = get().ai;
    if (!isReady || !pipelineInstance) throw new Error('Summarization model not initialized or not ready.');
    if (isGenerating) throw new Error('Summarization already in progress. Please wait.');

    set(state => ({ ai: { ...state.ai, isGenerating: true, error: null } }));
    try {
      const result = await pipelineInstance(text);
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