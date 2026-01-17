/**
 * Pipeline Executor
 *
 * Pure functions for pipeline execution logic.
 * Used by both main thread (PipelineRunner) and Web Worker (pipelineWorker).
 *
 * This module contains NO worker-specific code (no postMessage, no self).
 * It is fully testable in Jest without browser APIs.
 */

import { operationRegistry } from "./OperationRegistry";
import {
  Pipeline,
  PipelineStep,
  ExecutionContext,
  StepResult,
  PipelineResult,
  PipelineExecutionOptions,
} from "./types";

/** Default execution options */
const DEFAULT_OPTIONS: Required<PipelineExecutionOptions> = {
  stepTimeout: 5000,
  totalTimeout: 30000,
  maxSteps: 50,
  maxInputSize: 10 * 1024 * 1024, // 10MB
  onStepComplete: () => {},
};

/**
 * Create an execution context for a step
 */
export function createExecutionContext(
  originalInput: string,
  stepIndex: number,
  totalSteps: number,
  previousOutput: string,
  variables: Map<string, string> = new Map(),
): ExecutionContext {
  return {
    stepIndex,
    totalSteps,
    variables,
    getVariable: (name: string) => variables.get(name),
    setVariable: (name: string, value: string) => variables.set(name, value),
    _input: originalInput,
    _previousOutput: previousOutput,
    _stepIndex: stepIndex,
  };
}

/**
 * Execute a single pipeline step
 *
 * @param step - The step definition
 * @param input - Current input string
 * @param context - Execution context
 * @returns Step execution result
 */
export async function executeStep(
  step: PipelineStep,
  input: string,
  context: ExecutionContext,
): Promise<StepResult> {
  const startTime = performance.now();

  // Handle disabled steps
  if (!step.enabled) {
    return {
      stepId: step.id,
      operationId: step.operationId,
      input,
      output: input,
      duration: 0,
      skipped: true,
    };
  }

  // Get operation from registry
  const operation = operationRegistry.getById(step.operationId);
  if (!operation) {
    return {
      stepId: step.id,
      operationId: step.operationId,
      input,
      output: input,
      duration: performance.now() - startTime,
      skipped: false,
      error: `Operation '${step.operationId}' not found in registry`,
    };
  }

  try {
    const output = await operation.execute(input, step.params, context);
    const stringOutput =
      typeof output === "string" ? output : String(output ?? "");

    return {
      stepId: step.id,
      operationId: step.operationId,
      input,
      output: stringOutput,
      duration: performance.now() - startTime,
      skipped: false,
    };
  } catch (error) {
    return {
      stepId: step.id,
      operationId: step.operationId,
      input,
      output: input,
      duration: performance.now() - startTime,
      skipped: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Progress callback type for pipeline execution
 */
export type ProgressCallback = (stepIndex: number, totalSteps: number) => void;

/**
 * Execute a complete pipeline
 *
 * @param input - The input string to process
 * @param pipeline - The pipeline definition
 * @param options - Execution options
 * @param onProgress - Optional progress callback (called before each step)
 * @returns Pipeline execution result
 */
export async function executePipeline(
  input: string,
  pipeline: Pipeline,
  options: PipelineExecutionOptions = {},
  onProgress?: ProgressCallback,
): Promise<PipelineResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = performance.now();

  // Validate input size
  if (input.length > opts.maxInputSize) {
    return {
      success: false,
      output: input,
      error: `Input size (${formatBytes(input.length)}) exceeds maximum allowed (${formatBytes(opts.maxInputSize)})`,
      stepResults: [],
      totalDuration: 0,
      variables: {},
    };
  }

  // Validate step count
  if (pipeline.steps.length > opts.maxSteps) {
    return {
      success: false,
      output: input,
      error: `Pipeline has ${pipeline.steps.length} steps, maximum allowed is ${opts.maxSteps}`,
      stepResults: [],
      totalDuration: 0,
      variables: {},
    };
  }

  // Initialize execution state
  const variables = new Map<string, string>();
  const stepResults: StepResult[] = [];
  let currentOutput = input;
  let success = true;
  let errorMessage: string | undefined;

  // Execute each step
  for (let i = 0; i < pipeline.steps.length; i++) {
    const step = pipeline.steps[i];

    // Check total timeout
    const elapsed = performance.now() - startTime;
    if (elapsed > opts.totalTimeout) {
      success = false;
      errorMessage = `Pipeline execution timed out after ${Math.round(elapsed)}ms`;
      break;
    }

    // Report progress
    onProgress?.(i, pipeline.steps.length);

    // Create context for this step
    const context = createExecutionContext(
      input,
      i,
      pipeline.steps.length,
      currentOutput,
      variables,
    );

    // Execute the step
    const stepResult = await executeStep(step, currentOutput, context);
    stepResults.push(stepResult);
    opts.onStepComplete(stepResult, i);

    if (stepResult.error) {
      success = false;
      errorMessage = `Step ${i + 1} (${step.operationId}) failed: ${stepResult.error}`;
      break;
    }

    // Update output for next step
    currentOutput = stepResult.output;

    // Handle variable assignment
    if (step.assignTo) {
      variables.set(step.assignTo, currentOutput);
    }
  }

  return {
    success,
    output: currentOutput,
    error: errorMessage,
    stepResults,
    totalDuration: performance.now() - startTime,
    variables: Object.fromEntries(variables),
  };
}

/**
 * Execute a single operation (not a full pipeline)
 *
 * @param operationId - The operation ID to execute
 * @param input - Input string
 * @param params - Operation parameters
 * @returns The operation result
 */
export async function executeSingleOperation(
  operationId: string,
  input: string,
  params: Record<string, unknown> = {},
): Promise<{ success: boolean; output: string; error?: string }> {
  const operation = operationRegistry.getById(operationId);

  if (!operation) {
    return {
      success: false,
      output: input,
      error: `Operation '${operationId}' not found`,
    };
  }

  const context = createExecutionContext(input, 0, 1, input);

  try {
    const output = await operation.execute(input, params, context);
    return {
      success: true,
      output: typeof output === "string" ? output : String(output ?? ""),
    };
  } catch (error) {
    return {
      success: false,
      output: input,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate a pipeline definition
 *
 * @param pipeline - The pipeline to validate
 * @returns Validation result with errors array
 */
export function validatePipeline(pipeline: Pipeline): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!pipeline.steps || pipeline.steps.length === 0) {
    errors.push("Pipeline has no steps");
    return { valid: false, errors };
  }

  for (let i = 0; i < pipeline.steps.length; i++) {
    const step = pipeline.steps[i];

    if (!step.id) {
      errors.push(`Step ${i + 1}: Missing step ID`);
    }

    if (!step.operationId) {
      errors.push(`Step ${i + 1}: Missing operation ID`);
    } else if (!operationRegistry.has(step.operationId)) {
      errors.push(
        `Step ${i + 1}: Operation '${step.operationId}' not found in registry`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
