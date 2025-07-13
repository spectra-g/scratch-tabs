import { create } from "zustand";
import { setSetting, getSetting } from "../db";

// Hard-coded switch to disable codegen worker (set to false to disable)
const ENABLE_CODEGEN_WORKER = false;

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
  summarizeTextWithModal: (text: string, tabId: string) => void; // New function that also triggers modal
  terminateWorker: () => void; // Add function to terminate worker
  initializeCodegenModel: () => Promise<void>;
  runCodegen: (payload: any) => void;
  setSummaryModalCallback: (callback: ((tabId: string) => void) | null) => void;
}

// Helper function to update progress state for the ai slice only
function updateProgressState(ai: AIState, p: any): AIState {
  // Keep this function largely the same, it now updates based on worker messages
  if (!ai.isLoading) return ai;
  let files = { ...ai.files };
  if (p.file && typeof p.loaded === "number") {
    const percent = p.total
      ? Math.round((p.loaded / p.total) * 100)
      : undefined;
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
  const newProgress =
    (p.status === "progress" || p.type === "progress") &&
    typeof p.progress === "number"
      ? Math.round(p.progress)
      : ai.progress;

  // Handle status updates more carefully based on worker messages
  let newStatus = ai.progressStatus;
  if (p.type === "progress") {
    newStatus = p.status === "ready" ? "initializing" : p.status; // Worker says file is ready, but overall state is init
  } else if (p.type === "init_complete") {
    newStatus = "ready";
  } else if (p.type === "init_error" || p.type === "summary_error") {
    newStatus = "error";
  }

  const allFilesCompleted = Object.values(files).every((f) => f.completed);
  const finalOverallStatus = ai.isReady
    ? "ready"
    : allFilesCompleted && newStatus !== "error"
      ? "initializing"
      : newStatus;

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
let summaryModalCallback: ((tabId: string) => void) | null = null;

export const useAIStore = create<AISlice>((set, get) => {
  // Track the current codegen model name for persistence
  let currentCodegenModelName = "Xenova/starcoderbase-1b-sft"; // Default fallback
  let currentSummarizationModelName = "Xenova/distilbart-cnn-6-6"; // Default fallback

  // Helper function to get persistence key for codegen model
  const getCodegenPersistenceKey = () => {
    return `xenova.${currentCodegenModelName.replace(/[\/\-\.]/g, "_")}.downloaded`;
  };

  // Helper function to get persistence key for summarization model
  const getSummarizationPersistenceKey = () => {
    return `xenova.${currentSummarizationModelName.replace(/[\/\-\.]/g, "_")}.downloaded`;
  };

  // On store creation, check IndexedDB settings and auto-initialize if needed
  if (typeof window !== "undefined") {
    getSetting(getSummarizationPersistenceKey()).then((val) => {
      if (val === "true") get().initializeModel();
    });

    // Only initialize codegen if enabled
    if (ENABLE_CODEGEN_WORKER) {
      // Try to get the current model name from storage, fallback to default
      getSetting("current_codegen_model").then((modelName) => {
        if (modelName) {
          currentCodegenModelName = modelName;
        }
        const persistenceKey = getCodegenPersistenceKey();
        getSetting(persistenceKey).then((val) => {
          if (val === "true") {
            get().initializeCodegenModel();
          }
        });
      });
    }
  }
  return {
    ai: {
      worker: null,
      isReady: false,
      isLoading: false,
      error: null,
      isGenerating: false,
      progress: 0,
      progressStatus: "idle",
      files: {},
      summaryResult: null,
      isCodegenReady: false,
      isCodegenLoading: false,
      codegenProgress: 0,
      codegenProgressStatus: "",
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

      set((state) => ({
        ai: {
          ...state.ai,
          isLoading: true,
          error: null,
          progress: 0,
          progressStatus: "initializing",
          files: {},
          summaryResult: null,
        },
      }));

      try {
        workerInstance = new Worker(
          new URL("../workers/aiWorker.ts", import.meta.url),
          {
            type: "module",
          },
        );
        set((state) => ({ ai: { ...state.ai, worker: workerInstance } }));

        workerInstance.onmessage = (event) => {
          const { type, payload } = event.data;

          switch (type) {
            case "progress":
              set((state: AISlice) => ({
                ai: updateProgressState(state.ai, { ...payload, type }),
              }));
              break;
            case "init_complete":
              set((state) => {
                setSetting(getSummarizationPersistenceKey(), "true");
                return {
                  ai: {
                    ...state.ai,
                    isReady: true,
                    isLoading: false,
                    progress: 100,
                    progressStatus: "ready",
                    error: null,
                  },
                };
              });
              break;
            case "init_error":
              set((state) => ({
                ai: {
                  ...state.ai,
                  error: payload,
                  isLoading: false,
                  isReady: false,
                  progressStatus: "error",
                },
              }));
              workerInstance?.terminate(); // Terminate on init error
              workerInstance = null;
              set((state) => ({ ai: { ...state.ai, worker: null } }));
              setSetting(getSummarizationPersistenceKey(), "false");
              break;
            case "summary_result":
              set((state) => ({
                ai: {
                  ...state.ai,
                  summaryResult: payload.summary,
                  isGenerating: false,
                  error: null,
                },
              }));
              break;
            case "summary_error":
              set((state) => ({
                ai: {
                  ...state.ai,
                  error: payload,
                  isGenerating: false,
                  summaryResult: null,
                },
              }));
              break;
            default:
              console.warn(
                "[AI Store] Received unknown message type from worker:",
                type,
              );
          }
        };

        workerInstance.onerror = (error) => {
          console.error("[AI Store] Worker error:", error);
          set((state) => ({
            ai: {
              ...state.ai,
              error: "Worker error occurred",
              isLoading: false,
              isReady: false,
              isGenerating: false,
              progressStatus: "error",
            },
          }));
          workerInstance?.terminate();
          workerInstance = null;
          set((state) => ({ ai: { ...state.ai, worker: null } }));
          setSetting(getSummarizationPersistenceKey(), "false");
        };

        // Send init message to worker
        workerInstance.postMessage({ type: "init" });
      } catch (error) {
        console.error("[AI Store] Failed to initialize worker:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to initialize worker";
        set((state) => ({
          ai: {
            ...state.ai,
            error: errorMessage,
            isLoading: false,
            isReady: false,
            progressStatus: "error",
          },
        }));
        if (workerInstance) {
          workerInstance.terminate();
          workerInstance = null;
          set((state) => ({ ai: { ...state.ai, worker: null } }));
        }
        setSetting(getSummarizationPersistenceKey(), "false");
      }
    },

    summarizeText: (text: string) => {
      const { worker, isReady, isGenerating } = get().ai;
      if (!isReady || !worker) {
        console.error(
          "[AI Store] Summarize called but worker not ready or not initialized.",
        );
        // Optionally set an error state here
        set((state) => ({ ai: { ...state.ai, error: "AI is not ready." } }));
        return;
      }
      if (isGenerating) {
        return; // Prevent multiple requests
      }

      set((state) => ({
        ai: {
          ...state.ai,
          isGenerating: true,
          error: null,
          summaryResult: null,
        },
      })); // Reset summary/error
      worker.postMessage({ type: "summarize", payload: { text } });
      // Result will be handled by onmessage listener
    },

    terminateWorker: () => {
      if (workerInstance) {
        workerInstance.terminate();
        workerInstance = null;
      }
      set({
        ai: {
          worker: null,
          isReady: false,
          isLoading: false,
          error: null,
          isGenerating: false,
          progress: 0,
          progressStatus: "idle",
          files: {},
          summaryResult: null,
          isCodegenReady: false,
          isCodegenLoading: false,
          codegenProgress: 0,
          codegenProgressStatus: "",
          codegenError: null,
          codegenWorker: null,
          codegenFiles: {},
          isCodegenGenerating: false,
          codegenResult: null,
          activeCodegenTabId: null,
        },
      });
    },

    initializeCodegenModel: async () => {
      // Early return if codegen is disabled
      if (!ENABLE_CODEGEN_WORKER) {
        return;
      }

      const { isCodegenReady, isCodegenLoading } = get().ai;
      if (isCodegenReady || isCodegenLoading) {
        return;
      }
      set((state) => ({
        ai: {
          ...state.ai,
          isCodegenLoading: true,
          codegenError: null,
          codegenProgressStatus: "initializing",
        },
      }));
      if (!codegenWorkerInstance) {
        codegenWorkerInstance = new Worker(
          new URL("../workers/codegenWorker.js", import.meta.url),
          { type: "module" },
        );
      }
      if (!codegenListenerAttached && codegenWorkerInstance) {
        codegenWorkerInstance.onmessage = (e) => {
          const data = e.data;
          if (data.modelType !== "codegen") return;
          switch (data.status) {
            case "ready":
              // Store the model name for future persistence checks
              if (data.modelName) {
                currentCodegenModelName = data.modelName;
                setSetting("current_codegen_model", data.modelName);
              }
              setSetting(getCodegenPersistenceKey(), "true");
              set((state) => ({
                ai: {
                  ...state.ai,
                  isCodegenReady: true,
                  isCodegenLoading: false,
                  codegenProgress: 100,
                  codegenProgressStatus: "ready",
                  codegenFiles: {},
                },
              }));
              break;
            case "progress": {
              const files = { ...(get().ai.codegenFiles || {}) };
              files[data.file] = {
                file: data.file,
                loaded: data.loaded,
                total: data.total,
                percent: data.total
                  ? Math.round((data.loaded / data.total) * 100)
                  : 0,
                completed: data.total ? data.loaded === data.total : false,
                lastUpdateTime: Date.now(),
                status: data.status,
              };
              set((state) => ({
                ai: {
                  ...state.ai,
                  codegenFiles: files,
                  codegenProgress: Math.round(data.progress),
                },
              }));
              break;
            }
            case "update":
              set((state) => {
                // Append the new tokens to the existing result
                const currentResult = state.ai.codegenResult || "";
                const newResult = currentResult + data.output;
                return { ai: { ...state.ai, codegenResult: newResult } };
              });
              break;
            case "complete": {
              // Capture the tabId before clearing the state
              const { activeCodegenTabId } = get().ai;

              set((state) => ({
                ai: {
                  ...state.ai,
                  isCodegenGenerating: false,
                  codegenResult: data.output,
                  activeCodegenTabId: null,
                },
              }));

              // Commit final result to rootStore
              try {
                if (activeCodegenTabId && data.output) {
                  // Dynamically import to avoid circular deps
                  import("../stores/rootStore").then(({ useRootStore }) => {
                    useRootStore
                      .getState()
                      .updateTabContent(activeCodegenTabId, data.output);
                  });
                }
              } catch (err) {
                console.error(
                  `[${Date.now()}] [AI Store] Failed to commit codegen result to tab:`,
                  err,
                );
              }
              document.body.classList.remove("global-cursor-progress");
              break;
            }
            case "error":
              console.error(
                `[${Date.now()}] [AI Store] Codegen error:`,
                data.error,
              );
              set((state) => ({
                ai: {
                  ...state.ai,
                  codegenError: data.error,
                  isCodegenLoading: false,
                  isCodegenGenerating: false,
                  activeCodegenTabId: null,
                },
              }));
              document.body.classList.remove("global-cursor-progress");
              break;
          }
        };
        codegenListenerAttached = true;
      }
      set((state) => ({
        ai: { ...state.ai, codegenWorker: codegenWorkerInstance },
      }));
      codegenWorkerInstance.postMessage({ type: "init" });
    },

    runCodegen: (payload) => {
      // Early return if codegen is disabled
      if (!ENABLE_CODEGEN_WORKER) {
        return;
      }

      const { isCodegenReady, isCodegenGenerating, codegenWorker } = get().ai;
      if (!isCodegenReady || isCodegenGenerating || !codegenWorker) {
        return;
      }
      document.body.classList.add("global-cursor-progress");
      set((state) => {
        return {
          ai: {
            ...state.ai,
            isCodegenGenerating: true,
            codegenError: null,
            codegenResult: payload.text, // Start with the original text
            activeCodegenTabId: payload.tabId,
          },
        };
      });
      codegenWorker.postMessage({ type: "generate", ...payload });
    },

    summarizeTextWithModal: (text: string, tabId: string) => {
      // First call the regular summarizeText
      const { summarizeText } = get();
      summarizeText(text);

      // Then trigger the modal callback if it exists
      if (summaryModalCallback) {
        summaryModalCallback(tabId);
      }
    },

    setSummaryModalCallback: (callback: ((tabId: string) => void) | null) => {
      summaryModalCallback = callback;
    },
  };
});

// Ensure initializeModel is called from App.tsx useEffect
