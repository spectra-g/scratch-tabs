/**
 * Pipeline Runner
 *
 * Main thread API for pipeline execution.
 * Delegates to pipelineExecutor for core logic, adds Web Worker support.
 *
 * For core execution logic, see pipelineExecutor.ts
 * For Web Worker implementation, see WorkerRunner.ts
 */

import { operationRegistry } from "./OperationRegistry";
import {
  Pipeline,
  PipelineStep,
  PipelineResult,
  PipelineExecutionOptions,
} from "./types";
import {
  executePipeline,
  executeSingleOperation,
  validatePipeline as validatePipelineCore,
} from "./pipelineExecutor";

// Re-export core functions
export { validatePipeline } from "./pipelineExecutor";

/**
 * Execute a pipeline on the main thread
 *
 * @param input - The input string to process
 * @param pipeline - The pipeline definition
 * @param options - Execution options
 * @returns Pipeline execution result
 */
export async function runPipeline(
  input: string,
  pipeline: Pipeline,
  options: PipelineExecutionOptions = {},
): Promise<PipelineResult> {
  return executePipeline(input, pipeline, options);
}

/**
 * Execute a single operation on the main thread
 *
 * @param operationId - The operation ID to execute
 * @param input - Input string
 * @param params - Operation parameters
 * @returns The output string
 */
export async function runSingleOperation(
  operationId: string,
  input: string,
  params: Record<string, unknown> = {},
  applyPerLine?: boolean,
): Promise<{ success: boolean; output: string; error?: string }> {
  return executeSingleOperation(operationId, input, params, applyPerLine);
}

/**
 * Create a new pipeline step
 *
 * @param operationId - The operation ID
 * @param params - Optional initial parameters
 * @returns A new pipeline step
 */
export function createStep(
  operationId: string,
  params?: Record<string, unknown>,
): PipelineStep {
  const operation = operationRegistry.getById(operationId);

  // Build default params from operation definition
  const defaultParams: Record<string, unknown> = {};
  if (operation) {
    for (const param of operation.parameters) {
      if (param.default !== undefined) {
        defaultParams[param.name] = param.default;
      }
    }
  }

  return {
    id: generateUUID(),
    operationId,
    params: { ...defaultParams, ...params },
    enabled: true,
  };
}

/**
 * Create an empty pipeline
 *
 * @param name - Optional pipeline name
 * @returns A new empty pipeline
 */
export function createPipeline(name?: string): Pipeline {
  return {
    id: generateUUID(),
    name: name || null,
    steps: [],
  };
}

/**
 * Generate a UUID (with fallback for environments without crypto.randomUUID)
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// Web Worker Support
// ============================================================================

/**
 * Configuration for worker-based execution
 */
export interface WorkerExecutionConfig {
  /** Whether to use Web Worker for execution. Default: true */
  useWorker: boolean;
  /** Timeout in milliseconds. Worker will be terminated if exceeded. Default: 30000 */
  timeout: number;
  /** Callback for progress updates */
  onProgress?: (stepIndex: number, totalSteps: number) => void;
}

const DEFAULT_WORKER_CONFIG: WorkerExecutionConfig = {
  useWorker: true,
  timeout: 30000,
};

// Lazy-loaded worker runner to avoid import issues in test environment
let workerRunnerModulePromise: Promise<typeof import("./WorkerRunner")> | null =
  null;

async function loadWorkerRunnerModule() {
  if (!workerRunnerModulePromise) {
    workerRunnerModulePromise = import("./WorkerRunner");
  }
  return workerRunnerModulePromise;
}

/**
 * Run a pipeline with Web Worker support
 *
 * Uses a Web Worker for execution to prevent UI blocking.
 * Falls back to main thread execution if workers aren't available.
 *
 * @param input - The input string to process
 * @param pipeline - The pipeline definition
 * @param config - Worker execution configuration
 * @returns Pipeline execution result
 */
export async function runPipelineAsync(
  input: string,
  pipeline: Pipeline,
  config: Partial<WorkerExecutionConfig> = {},
): Promise<PipelineResult> {
  const opts = { ...DEFAULT_WORKER_CONFIG, ...config };

  // Try worker execution if enabled
  if (opts.useWorker && typeof Worker !== "undefined") {
    try {
      const { getWorkerRunner, isWorkerAvailable } =
        await loadWorkerRunnerModule();

      if (isWorkerAvailable()) {
        const runner = getWorkerRunner();
        return await runner.runPipeline(input, pipeline, {
          timeout: opts.timeout,
          onProgress: opts.onProgress,
        });
      }
    } catch (error) {
      console.warn(
        "[PipelineRunner] Worker execution failed, falling back to main thread:",
        error,
      );
    }
  }

  // Fallback to main thread execution
  return runPipeline(input, pipeline, {
    totalTimeout: opts.timeout,
    onStepComplete: (result, index) => {
      opts.onProgress?.(index, pipeline.steps.length);
    },
  });
}

/**
 * Run a single operation with Web Worker support
 *
 * @param input - The input string to process
 * @param operationId - The operation ID to execute
 * @param params - Operation parameters
 * @param config - Worker execution configuration
 * @returns Operation result
 */
export async function runSingleOperationAsync(
  input: string,
  operationId: string,
  params: Record<string, unknown> = {},
  config: Partial<WorkerExecutionConfig> = {},
): Promise<{ success: boolean; output: string; error?: string }> {
  const opts = { ...DEFAULT_WORKER_CONFIG, ...config };

  // Try worker execution if enabled
  if (opts.useWorker && typeof Worker !== "undefined") {
    try {
      const { getWorkerRunner, isWorkerAvailable } =
        await loadWorkerRunnerModule();

      if (isWorkerAvailable()) {
        const runner = getWorkerRunner();
        return await runner.runSingleOperation(input, operationId, params, {
          timeout: opts.timeout,
        });
      }
    } catch (error) {
      console.warn(
        "[PipelineRunner] Worker execution failed, falling back to main thread:",
        error,
      );
    }
  }

  // Fallback to main thread execution
  return runSingleOperation(operationId, input, params);
}

/**
 * Check if Web Worker execution is available
 */
export async function isWorkerExecutionAvailable(): Promise<boolean> {
  if (typeof Worker === "undefined") {
    return false;
  }

  try {
    const { isWorkerAvailable } = await loadWorkerRunnerModule();
    return isWorkerAvailable();
  } catch {
    return false;
  }
}
