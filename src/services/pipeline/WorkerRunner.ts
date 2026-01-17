/**
 * Worker Runner
 *
 * Manages the pipeline Web Worker from the main thread.
 * Provides true timeout support by terminating the worker if operations take too long.
 *
 * Usage:
 *   const runner = new WorkerRunner();
 *   const result = await runner.runPipeline(input, pipeline, { timeout: 30000 });
 */

import type { Pipeline, PipelineResult } from "./types";
import type { WorkerRequest, WorkerResponse } from "./pipelineWorker";

// Vite worker import
import PipelineWorker from "./pipelineWorker?worker";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
  onProgress?: (stepIndex: number, totalSteps: number) => void;
}

export interface WorkerRunnerOptions {
  /** Timeout in milliseconds. Worker will be terminated if exceeded. Default: 30000 */
  timeout?: number;
  /** Callback for progress updates */
  onProgress?: (stepIndex: number, totalSteps: number) => void;
}

/**
 * Manages pipeline execution in a Web Worker
 */
export class WorkerRunner {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestCounter = 0;
  private isReady = false;
  private readyPromise: Promise<void> | null = null;

  constructor() {
    this.initWorker();
  }

  /**
   * Initialize the Web Worker
   */
  private initWorker(): void {
    try {
      this.worker = new PipelineWorker();
      this.readyPromise = new Promise((resolve) => {
        const initHandler = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.id === "init" && event.data.type === "success") {
            this.isReady = true;
            resolve();
          }
        };
        this.worker!.addEventListener("message", initHandler, { once: true });
      });

      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
    } catch (error) {
      console.warn("[WorkerRunner] Failed to create worker:", error);
      this.worker = null;
    }
  }

  /**
   * Handle messages from the worker
   */
  private handleMessage(event: MessageEvent<WorkerResponse>): void {
    const response = event.data;

    // Handle progress updates (no pending request)
    if (response.type === "progress") {
      // Find any pending request and call its progress callback
      for (const pending of this.pendingRequests.values()) {
        if (pending.onProgress && response.stepIndex !== undefined) {
          pending.onProgress(response.stepIndex, response.totalSteps || 0);
        }
      }
      return;
    }

    const pending = this.pendingRequests.get(response.id);
    if (!pending) return;

    // Clear timeout
    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }

    this.pendingRequests.delete(response.id);

    if (response.type === "success") {
      pending.resolve(response.result || response.singleResult);
    } else {
      pending.reject(new Error(response.error || "Unknown worker error"));
    }
  }

  /**
   * Handle worker errors
   */
  private handleError(error: ErrorEvent): void {
    console.error("[WorkerRunner] Worker error:", error);

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      pending.reject(new Error(`Worker error: ${error.message}`));
      this.pendingRequests.delete(id);
    }

    // Recreate the worker
    this.terminateWorker();
    this.initWorker();
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${++this.requestCounter}`;
  }

  /**
   * Wait for the worker to be ready
   */
  async waitForReady(): Promise<boolean> {
    if (!this.worker) return false;
    if (this.isReady) return true;
    if (this.readyPromise) {
      await this.readyPromise;
      return true;
    }
    return false;
  }

  /**
   * Check if Web Workers are supported and available
   */
  isAvailable(): boolean {
    return this.worker !== null;
  }

  /**
   * Run a complete pipeline in the worker
   */
  async runPipeline(
    input: string,
    pipeline: Pipeline,
    options: WorkerRunnerOptions = {},
  ): Promise<PipelineResult> {
    const timeout = options.timeout ?? 30000;

    if (!this.worker) {
      throw new Error("Worker not available");
    }

    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();

      // Set up timeout with worker termination
      const timeoutId = setTimeout(() => {
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          this.pendingRequests.delete(requestId);

          // Terminate and recreate worker for true cancellation
          console.warn("[WorkerRunner] Operation timed out, terminating worker");
          this.terminateWorker();
          this.initWorker();

          reject(new Error(`Pipeline execution timed out after ${timeout}ms`));
        }
      }, timeout);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeoutId,
        onProgress: options.onProgress,
      });

      const request: WorkerRequest = {
        id: requestId,
        type: "run-pipeline",
        input,
        pipeline,
      };

      this.worker!.postMessage(request);
    });
  }

  /**
   * Run a single operation in the worker
   */
  async runSingleOperation(
    input: string,
    operationId: string,
    params: Record<string, unknown> = {},
    options: WorkerRunnerOptions = {},
  ): Promise<{ success: boolean; output: string; error?: string }> {
    const timeout = options.timeout ?? 30000;

    if (!this.worker) {
      throw new Error("Worker not available");
    }

    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();

      const timeoutId = setTimeout(() => {
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          this.pendingRequests.delete(requestId);
          this.terminateWorker();
          this.initWorker();
          reject(new Error(`Operation timed out after ${timeout}ms`));
        }
      }, timeout);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeoutId,
      });

      const request: WorkerRequest = {
        id: requestId,
        type: "run-single",
        input,
        operationId,
        params,
      };

      this.worker!.postMessage(request);
    });
  }

  /**
   * Terminate the worker (cancels all pending operations)
   */
  terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.readyPromise = null;
    }

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      pending.reject(new Error("Worker terminated"));
    }
    this.pendingRequests.clear();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.terminateWorker();
  }
}

// Singleton instance for shared use
let workerRunnerInstance: WorkerRunner | null = null;

/**
 * Get the shared WorkerRunner instance
 */
export function getWorkerRunner(): WorkerRunner {
  if (!workerRunnerInstance) {
    workerRunnerInstance = new WorkerRunner();
  }
  return workerRunnerInstance;
}

/**
 * Check if worker execution is available
 */
export function isWorkerAvailable(): boolean {
  return getWorkerRunner().isAvailable();
}
