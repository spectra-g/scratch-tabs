import { create } from 'zustand';
// Remove direct import of pipeline
// import { pipeline, Pipeline, SummarizationPipeline, PipelineType } from '@huggingface/transformers';
import { setSetting, getSetting } from '../db';

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
  codegenFiles: Record<string, FileProgress>;
  isCodegenGenerating: boolean;
  codegenResult: string | null;
  activeCodegenTabId: string | null;
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
        codegenFiles: ai.codegenFiles,
        isCodegenGenerating: ai.isCodegenGenerating,
        codegenResult: ai.codegenResult,
        activeCodegenTabId: ai.activeCodegenTabId,
    };
}

let workerInstance: Worker | null = null;
let codegenWorkerInstance: Worker | null = null;
let codegenListenerAttached = false;

export const useAIStore = create<AISlice>((set, get) => {
    // On store creation, check IndexedDB settings and auto-initialize if needed
    if (typeof window !== 'undefined') {
        getSetting('xenova.summarization.downloaded').then(val => {
            if (val === 'true') setTimeout(() => get().initializeModel(), 0);
        });
        getSetting('xenova.codegen.350.mono.downloaded').then(val => {
            if (val === 'true') setTimeout(() => get().initializeCodegenModel(), 0);
        });
    }
    return {
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
            codegenFiles: {},
            isCodegenGenerating: false,
            codegenResult: null,
            activeCodegenTabId: null,
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
                            set(state => {
                                setSetting('xenova.summarization.downloaded', 'true');
                                return { ai: { ...state.ai, isReady: true, isLoading: false, progress: 100, progressStatus: 'ready', error: null } };
                            });
                            break;
                        case 'init_error':
                            set(state => ({ ai: { ...state.ai, error: payload, isLoading: false, isReady: false, progressStatus: 'error' } }));
                            workerInstance?.terminate(); // Terminate on init error
                            workerInstance = null;
                            set(state => ({ ai: { ...state.ai, worker: null } }));
                            setSetting('xenova.summarization.downloaded', 'false');
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
                    setSetting('xenova.summarization.downloaded', 'false');
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
                setSetting('xenova.summarization.downloaded', 'false');
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
                codegenFiles: {},
                isCodegenGenerating: false,
                codegenResult: null,
                activeCodegenTabId: null,
            } });
        },

        initializeCodegenModel: async () => {
            console.log(`[${Date.now()}] [AI Store] initializeCodegenModel called`);
            const { isCodegenReady, isCodegenLoading } = get().ai;
            if (isCodegenReady || isCodegenLoading) {
                console.log(`[${Date.now()}] [AI Store] Codegen already ready or loading, skipping`);
                return;
            }
            console.log(`[${Date.now()}] [AI Store] Setting codegen loading state`);
            set(state => ({ ai: { ...state.ai, isCodegenLoading: true, codegenError: null, codegenProgressStatus: 'initializing' } }));
            if (!codegenWorkerInstance) {
                console.log(`[${Date.now()}] [AI Store] Creating new codegen worker instance`);
                codegenWorkerInstance = new Worker(new URL('../workers/codegenWorker.js', import.meta.url), { type: 'module' });
            }
            if (!codegenListenerAttached && codegenWorkerInstance) {
                console.log(`[${Date.now()}] [AI Store] Attaching codegen worker listener`);
                codegenWorkerInstance.onmessage = (e) => {
                    const data = e.data;
                    console.log(`[${Date.now()}] [AI Store] Codegen worker message received:`, data.status, data);
                    if (data.modelType !== 'codegen') return;
                    switch (data.status) {
                        case 'ready':
                            console.log(`[${Date.now()}] [AI Store] Codegen model ready`);
                            setSetting('xenova.codegen.350.mono.downloaded', 'true');
                            set(state => ({ ai: { ...state.ai, isCodegenReady: true, isCodegenLoading: false, codegenProgress: 100, codegenProgressStatus: 'ready', codegenFiles: {} } }));
                            break;
                        case 'progress': {
                            console.log(`[${Date.now()}] [AI Store] Codegen progress:`, data.file, data.loaded, data.total);
                            const files = { ...(get().ai.codegenFiles || {}) };
                            files[data.file] = {
                                file: data.file,
                                loaded: data.loaded,
                                total: data.total,
                                percent: data.total ? Math.round((data.loaded / data.total) * 100) : 0,
                                completed: data.total ? data.loaded === data.total : false,
                                lastUpdateTime: Date.now(),
                                status: data.status,
                            };
                            set(state => ({ ai: { ...state.ai, codegenFiles: files, codegenProgress: Math.round(data.progress) }}));
                            break;
                        }
                        case 'update':
                            console.log(`[${Date.now()}] [AI Store] Codegen streaming update:`, data.output?.length || 0, 'chars');
                            set(state => {
                                console.log(`[${Date.now()}] [AI Store] Updating codegenResult, activeCodegenTabId:`, state.ai.activeCodegenTabId);
                                return { ai: { ...state.ai, codegenResult: data.output } };
                            });
                            break;
                        case 'complete': {
                            console.log(`[${Date.now()}] [AI Store] Codegen complete, final output:`, data.output?.length || 0, 'chars');
                            // Capture the tabId before clearing the state
                            const { activeCodegenTabId } = get().ai;
                            console.log(`[${Date.now()}] [AI Store] Active tab ID before clearing:`, activeCodegenTabId);
                            
                            set(state => ({
                                ai: {
                                    ...state.ai,
                                    isCodegenGenerating: false,
                                    codegenResult: data.output,
                                    activeCodegenTabId: null,
                                }
                            }));
                            
                            // Commit final result to rootStore
                            try {
                                console.log(`[${Date.now()}] [AI Store] Committing final result to tab:`, activeCodegenTabId);
                                if (activeCodegenTabId && data.output) {
                                    // Dynamically import to avoid circular deps
                                    import('../stores/rootStore').then(({ useRootStore }) => {
                                        console.log(`[${Date.now()}] [AI Store] Updating tab content in rootStore`);
                                        useRootStore.getState().updateTabContent(activeCodegenTabId, data.output);
                                        console.log(`[${Date.now()}] [AI Store] Tab content updated successfully`);
                                    });
                                } else {
                                    console.warn(`[${Date.now()}] [AI Store] Cannot commit result:`, { activeCodegenTabId, hasOutput: !!data.output });
                                }
                            } catch (err) {
                                console.error(`[${Date.now()}] [AI Store] Failed to commit codegen result to tab:`, err);
                            }
                            document.body.classList.remove('global-cursor-progress');
                            break;
                        }
                        case 'error':
                            console.error(`[${Date.now()}] [AI Store] Codegen error:`, data.error);
                            set(state => ({ ai: { ...state.ai, codegenError: data.error, isCodegenLoading: false, isCodegenGenerating: false, activeCodegenTabId: null } }));
                            document.body.classList.remove('global-cursor-progress');
                            break;
                    }
                };
                codegenListenerAttached = true;
            }
            console.log(`[${Date.now()}] [AI Store] Setting codegen worker and sending init message`);
            set(state => ({ ai: { ...state.ai, codegenWorker: codegenWorkerInstance } }));
            codegenWorkerInstance.postMessage({ type: 'init' });
        },

        runCodegen: (payload) => {
            console.log(`[${Date.now()}] [AI Store] runCodegen called with payload:`, payload);
            const { isCodegenReady, isCodegenGenerating, codegenWorker } = get().ai;
            console.log(`[${Date.now()}] [AI Store] Codegen state:`, { isCodegenReady, isCodegenGenerating, hasWorker: !!codegenWorker });
            if (!isCodegenReady || isCodegenGenerating || !codegenWorker) {
                console.log(`[${Date.now()}] [AI Store] Codegen not ready, returning early`);
                return;
            }
            console.log(`[${Date.now()}] [AI Store] Starting codegen generation`);
            document.body.classList.add('global-cursor-progress');
            set(state => {
                console.log(`[${Date.now()}] [AI Store] Setting codegen state with tabId:`, payload.tabId);
                return {
                    ai: {
                        ...state.ai,
                        isCodegenGenerating: true,
                        codegenError: null,
                        codegenResult: payload.text,
                        activeCodegenTabId: payload.tabId,
                    }
                };
            });
            console.log(`[${Date.now()}] [AI Store] Sending generate message to worker`);
            codegenWorker.postMessage({ type: 'generate', ...payload });
        }
    };
});

// Ensure initializeModel is called from App.tsx useEffect