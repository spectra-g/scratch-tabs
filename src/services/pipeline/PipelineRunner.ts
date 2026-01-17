/**
 * Pipeline Runner
 *
 * Executes pipelines by running operations in sequence.
 * The runner only knows about operations through the OperationRegistry,
 * maintaining decoupling from specific implementations.
 */

import { operationRegistry } from "./OperationRegistry";
import {
  Pipeline,
  PipelineStep,
  PipelineResult,
  StepResult,
  ExecutionContext,
  PipelineExecutionOptions,
} from "./types";

/** Default execution options */
const DEFAULT_OPTIONS: Required<PipelineExecutionOptions> = {
  stepTimeout: 5000, // 5 seconds per step
  totalTimeout: 30000, // 30 seconds total
  maxSteps: 50, // Maximum 50 steps
  maxInputSize: 10 * 1024 * 1024, // 10MB
  onStepComplete: () => {},
};

/**
 * Execute a pipeline
 *
 * Runs all enabled steps in sequence, passing output to input.
 * Disabled steps are skipped but recorded in results.
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

  // Initialize execution context
  const variables = new Map<string, string>();
  const context: ExecutionContext = {
    stepIndex: 0,
    totalSteps: pipeline.steps.length,
    variables,
    getVariable: (name: string) => variables.get(name),
    setVariable: (name: string, value: string) => variables.set(name, value),
    _input: input,
    _previousOutput: input,
    _stepIndex: 0,
  };

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

    // Update context
    context.stepIndex = i;
    context._stepIndex = i;
    context._previousOutput = currentOutput;

    // Handle disabled steps
    if (!step.enabled) {
      const skippedResult: StepResult = {
        stepId: step.id,
        operationId: step.operationId,
        input: currentOutput,
        output: currentOutput,
        duration: 0,
        skipped: true,
      };
      stepResults.push(skippedResult);
      opts.onStepComplete(skippedResult, i);
      continue;
    }

    // Execute the step
    const stepResult = await executeStep(step, currentOutput, context, opts);
    stepResults.push(stepResult);
    opts.onStepComplete(stepResult, i);

    if (stepResult.error) {
      success = false;
      errorMessage = `Step ${i + 1} (${step.operationId}) failed: ${stepResult.error}`;
      break;
    }

    // Update output for next step
    currentOutput = stepResult.output;

    // Handle variable assignment (for future interpolation support)
    if (step.assignTo) {
      variables.set(step.assignTo, currentOutput);
    }
  }

  const totalDuration = performance.now() - startTime;

  return {
    success,
    output: currentOutput,
    error: errorMessage,
    stepResults,
    totalDuration,
    variables: Object.fromEntries(variables),
  };
}

/**
 * Execute a single pipeline step
 */
async function executeStep(
  step: PipelineStep,
  input: string,
  context: ExecutionContext,
  options: Required<PipelineExecutionOptions>,
): Promise<StepResult> {
  const startTime = performance.now();

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
    // Execute with timeout
    const output = await executeWithTimeout(
      () => operation.execute(input, step.params, context),
      options.stepTimeout,
      `Operation '${operation.name}' timed out after ${options.stepTimeout}ms`,
    );

    // Ensure output is a string
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
      output: input, // Return original input on error
      duration: performance.now() - startTime,
      skipped: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute a function with a timeout
 */
async function executeWithTimeout<T>(
  fn: () => T | Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    try {
      const result = fn();
      if (result instanceof Promise) {
        result
          .then((value) => {
            clearTimeout(timeoutId);
            resolve(value);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      } else {
        clearTimeout(timeoutId);
        resolve(result);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Execute a single step in isolation (for preview/testing)
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
): Promise<{ success: boolean; output: string; error?: string }> {
  const operation = operationRegistry.getById(operationId);
  if (!operation) {
    return {
      success: false,
      output: input,
      error: `Operation '${operationId}' not found`,
    };
  }

  const context: ExecutionContext = {
    stepIndex: 0,
    totalSteps: 1,
    variables: new Map(),
    getVariable: () => undefined,
    setVariable: () => {},
    _input: input,
    _previousOutput: input,
    _stepIndex: 0,
  };

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
 * Checks that all operations exist in the registry.
 *
 * @param pipeline - The pipeline to validate
 * @returns Validation result
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
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
