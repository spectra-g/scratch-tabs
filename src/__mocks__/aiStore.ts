// Mock implementation of aiStore for tests
export const useAIStore = jest.fn(() => ({
  summarizeTextWithModal: jest.fn(),
  summarizeText: jest.fn(),
  initializeModel: jest.fn(),
  terminateWorker: jest.fn(),
  initializeCodegenModel: jest.fn(),
  runCodegen: jest.fn(),
  setSummaryModalCallback: jest.fn(),
  ai: {
    worker: null,
    isReady: true,
    isLoading: false,
    error: null,
    isGenerating: false,
    progress: 0,
    progressStatus: 'ready',
    files: {},
    summaryResult: null,
    isCodegenReady: false,
    isCodegenLoading: false,
    codegenProgress: 0,
    codegenProgressStatus: 'idle',
    codegenError: null,
    codegenWorker: null,
    codegenFiles: {},
    isCodegenGenerating: false,
    codegenResult: null,
    activeCodegenTabId: null,
  },
}));

// Mock the store functions for direct access
useAIStore.getState = jest.fn(() => ({
  summarizeTextWithModal: jest.fn(),
  summarizeText: jest.fn(),
  initializeModel: jest.fn(),
  terminateWorker: jest.fn(),
  initializeCodegenModel: jest.fn(),
  runCodegen: jest.fn(),
  setSummaryModalCallback: jest.fn(),
  ai: {
    worker: null,
    isReady: true,
    isLoading: false,
    error: null,
    isGenerating: false,
    progress: 0,
    progressStatus: 'ready',
    files: {},
    summaryResult: null,
    isCodegenReady: false,
    isCodegenLoading: false,
    codegenProgress: 0,
    codegenProgressStatus: 'idle',
    codegenError: null,
    codegenWorker: null,
    codegenFiles: {},
    isCodegenGenerating: false,
    codegenResult: null,
    activeCodegenTabId: null,
  },
}));

useAIStore.setState = jest.fn();
useAIStore.subscribe = jest.fn();
useAIStore.destroy = jest.fn();
