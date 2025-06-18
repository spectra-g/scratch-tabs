import { create } from 'zustand';
// Remove direct import of pipeline
// import { pipeline, Pipeline, SummarizationPipeline, PipelineType } from '@huggingface/transformers';

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
  worker: Worker | null; // Add worker instance
  isReady: boolean;
  isLoading: boolean; // Loading the model itself
  error: string | null;
  isGenerating: boolean; // Generating a summary
  progress: number;
  progressStatus: string; // e.g., 'idle', 'downloading', 'initializing', 'ready', 'error'
  files: Record<string, FileProgress>;
  summaryResult: string | null; // Add field to store the latest summary result
  isCodegenReady: boolean;
  isCodegenLoading: boolean;
  codegenProgress: number;
  codegenProgressStatus: string;
  codegenError: string | null;
  codegenWorker: Worker | null;
}

export interface AISlice {
  ai: AIState;
  initializeModel: () => Promise<void>;
  summarizeText: (text: string) => void; // No longer returns Promise<string>
  terminateWorker: () => void; // Add function to terminate worker
  initializeCodegenModel: () => Promise<void>;
  runCodegen: (payload: any) => void;
}

// Helper function to update progress state for the ai slice only
function updateProgressState(ai: AIState, p: any): AIState {
    // Keep this function largely the same, it now updates based on worker messages
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
    // Use overall progress if provided directly, otherwise maintain current state progress
    const newProgress = (p.status === 'progress' || p.type === 'progress') && typeof p.progress === 'number'
        ? Math.round(p.progress)
        : ai.progress;

    // Handle status updates more carefully based on worker messages
    let newStatus = ai.progressStatus;
    if (p.type === 'progress') {
        newStatus = p.status === 'ready' ? 'initializing' : p.status; // Worker says file is ready, but overall state is init
    } else if (p.type === 'init_complete') {
        newStatus = 'ready';
    } else if (p.type === 'init_error' || p.type === 'summary_error') {
        newStatus = 'error';
    }

    const allFilesCompleted = Object.values(files).every(f => f.completed);
    const finalOverallStatus = ai.isReady ? 'ready' : (allFilesCompleted && newStatus !== 'error' ? 'initializing' : newStatus);

    return {
        worker: ai.worker,
        isReady: ai.isReady,
        isLoading: ai.isLoading,
        error: ai.error,
        isGenerating: ai.isGenerating,
        progress: newProgress,
        progressStatus: finalOverallStatus,
        files,
        summaryResult: ai.summaryResult,
        isCodegenReady: ai.isCodegenReady,
        isCodegenLoading: ai.isCodegenLoading,
        codegenProgress: ai.codegenProgress,
        codegenProgressStatus: ai.codegenProgressStatus,
        codegenError: ai.codegenError,
        codegenWorker: ai.codegenWorker,
    };
}

let workerInstance: Worker | null = null;

export const useAIStore = create<AISlice>((set, get) => ({
    ai: {
        worker: null,
        isReady: false,
        isLoading: false,
        error: null,
        isGenerating: false,
        progress: 0,
        progressStatus: 'idle',
        files: {},
        summaryResult: null,
        isCodegenReady: false,
        isCodegenLoading: false,
        codegenProgress: 0,
        codegenProgressStatus: '',
        codegenError: null,
        codegenWorker: null,
    },

    initializeModel: async () => {
        const currentState = get().ai;

        if (currentState.isReady || currentState.isLoading || workerInstance) {
            return;
        }

        set(state => ({ ai: { ...state.ai, isLoading: true, error: null, progress: 0, progressStatus: 'initializing', files: {}, summaryResult: null } }));

        try {
            workerInstance = new Worker(new URL('../workers/aiWorker.ts', import.meta.url), {
                type: 'module'
            });
            set(state => ({ ai: { ...state.ai, worker: workerInstance } }));

            workerInstance.onmessage = (event) => {
                const { type, payload } = event.data;

                switch (type) {
                    case 'progress':
                        set((state: AISlice) => ({ ai: updateProgressState(state.ai, { ...payload, type }) }));
                        break;
                    case 'init_complete':
                        set(state => ({ ai: { ...state.ai, isReady: true, isLoading: false, progress: 100, progressStatus: 'ready', error: null } }));
                        break;
                    case 'init_error':
                        set(state => ({ ai: { ...state.ai, error: payload, isLoading: false, isReady: false, progressStatus: 'error' } }));
                        workerInstance?.terminate(); // Terminate on init error
                        workerInstance = null;
                        set(state => ({ ai: { ...state.ai, worker: null } }));
                        break;
                    case 'summary_result':
                        set(state => ({ ai: { ...state.ai, summaryResult: payload.summary, isGenerating: false, error: null } }));
                        break;
                    case 'summary_error':
                        set(state => ({ ai: { ...state.ai, error: payload, isGenerating: false, summaryResult: null } }));
                        break;
                    default:
                         console.warn('[AI Store] Received unknown message type from worker:', type);
                }
            };

            workerInstance.onerror = (error) => {
                console.error('[AI Store] Worker error:', error);
                set(state => ({ ai: { ...state.ai, error: 'Worker error occurred', isLoading: false, isReady: false, isGenerating: false, progressStatus: 'error' } }));
                workerInstance?.terminate();
                workerInstance = null;
                set(state => ({ ai: { ...state.ai, worker: null } }));
            };

            // Send init message to worker
            workerInstance.postMessage({ type: 'init' });

        } catch (error) {
            console.error('[AI Store] Failed to initialize worker:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to initialize worker';
            set(state => ({ ai: { ...state.ai, error: errorMessage, isLoading: false, isReady: false, progressStatus: 'error' } }));
            if (workerInstance) {
                 workerInstance.terminate();
                 workerInstance = null;
                 set(state => ({ ai: { ...state.ai, worker: null } }));
            }
        }
    },

    summarizeText: (text: string) => {
        const { worker, isReady, isGenerating } = get().ai;
        if (!isReady || !worker) {
             console.error('[AI Store] Summarize called but worker not ready or not initialized.');
            // Optionally set an error state here
             set(state => ({ ai: { ...state.ai, error: 'AI is not ready.' } }));
             return;
        }
        if (isGenerating) {
            return; // Prevent multiple requests
        }

        set(state => ({ ai: { ...state.ai, isGenerating: true, error: null, summaryResult: null } })); // Reset summary/error
        worker.postMessage({ type: 'summarize', payload: { text } });
        // Result will be handled by onmessage listener
    },

    terminateWorker: () => {
        if (workerInstance) {
            workerInstance.terminate();
            workerInstance = null;
        }
        set({ ai: {
            worker: null,
            isReady: false,
            isLoading: false,
            error: null,
            isGenerating: false,
            progress: 0,
            progressStatus: 'idle',
            files: {},
            summaryResult: null,
            isCodegenReady: false,
            isCodegenLoading: false,
            codegenProgress: 0,
            codegenProgressStatus: '',
            codegenError: null,
            codegenWorker: null,
        } });
    },

    initializeCodegenModel: async () => {
        set(state => ({ ai: { ...state.ai, isCodegenLoading: true, codegenError: null } }));
        if (!get().ai.codegenWorker) {
            const worker = new Worker(new URL('../workers/codegenWorker.js', import.meta.url), { type: 'module' });
            worker.onmessage = (e) => {
                const data = e.data;
                console.log('[aiStore] Codegen worker message:', data);
                if (data.modelType === 'codegen') {
                    if (data.status === 'ready') {
                        console.log('[aiStore] Codegen model is ready!');
                        set(state => ({ ai: { ...state.ai, isCodegenReady: true, isCodegenLoading: false, codegenProgress: 100, codegenProgressStatus: 'Ready' } }));
                    } else if (data.status === 'progress') {
                        set(state => ({ ai: { ...state.ai, codegenProgress: data.progress, codegenProgressStatus: data.file } }));
                    } else if (data.status === 'error') {
                        set(state => ({ ai: { ...state.ai, codegenError: data.error, isCodegenLoading: false } }));
                    }
                }
            };
            set(state => ({ ai: { ...state.ai, codegenWorker: worker } }));
            worker.postMessage({ type: 'init' });
        } else {
            get().ai.codegenWorker.postMessage({ type: 'init' });
        }
    },

    runCodegen: async (payload) => {
        set(state => ({ ai: { ...state.ai, codegenError: null } }));
        const worker = get().ai.codegenWorker;
        if (!worker) throw new Error('Codegen worker not initialized');
        worker.postMessage({ type: 'generate', ...payload });
        // The UI should listen for streaming updates via the worker's onmessage
    }
}));

// Ensure initializeModel is called from App.tsx useEffect