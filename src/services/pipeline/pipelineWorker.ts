/**
 * Pipeline Web Worker
 *
 * Thin wrapper that executes pipeline operations off the main thread.
 * All execution logic is in pipelineExecutor.ts (fully testable in Jest).
 *
 * This file only handles:
 * - Message passing (onmessage/postMessage)
 * - Progress reporting
 * - Operation registration for worker context
 */

import { Pipeline, PipelineResult } from "./types";
import { executePipeline, executeSingleOperation } from "./pipelineExecutor";

// Import and register all operations in the worker context
import "./categories";
import "../../formats/json/pipelineOperations";
import "../../tablets/base64/pipelineOperations";
import "../../components/BatchTools/pipelineOperations";

/**
 * Message types for worker communication
 */
export interface WorkerRequest {
  id: string;
  type: "run-pipeline" | "run-single";
  input: string;
  pipeline?: Pipeline;
  operationId?: string;
  params?: Record<string, unknown>;
}

export interface WorkerResponse {
  id: string;
  type: "success" | "error" | "progress";
  result?: PipelineResult;
  singleResult?: { success: boolean; output: string; error?: string };
  error?: string;
  stepIndex?: number;
  totalSteps?: number;
}

/**
 * Handle incoming messages from main thread
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    if (request.type === "run-pipeline" && request.pipeline) {
      // Execute pipeline with progress reporting
      const result = await executePipeline(
        request.input,
        request.pipeline,
        {}, // Use default options
        (stepIndex, totalSteps) => {
          // Report progress to main thread
          self.postMessage({
            id: "progress",
            type: "progress",
            stepIndex,
            totalSteps,
          } as WorkerResponse);
        },
      );

      self.postMessage({
        id: request.id,
        type: "success",
        result,
      } as WorkerResponse);
    } else if (request.type === "run-single" && request.operationId) {
      // Execute single operation
      const result = await executeSingleOperation(
        request.operationId,
        request.input,
        request.params || {},
      );

      self.postMessage({
        id: request.id,
        type: "success",
        singleResult: result,
      } as WorkerResponse);
    } else {
      self.postMessage({
        id: request.id,
        type: "error",
        error: "Invalid request type",
      } as WorkerResponse);
    }
  } catch (error) {
    self.postMessage({
      id: request.id,
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse);
  }
};

// Signal that worker is ready
self.postMessage({ id: "init", type: "success" } as WorkerResponse);
