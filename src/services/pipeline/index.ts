/**
 * Pipeline Service
 *
 * Public API for the pipeline system.
 *
 * Usage:
 * ```typescript
 * import {
 *   operationRegistry,
 *   runPipeline,
 *   createPipeline,
 *   createStep,
 * } from '@/services/pipeline';
 *
 * // Create a pipeline
 * const pipeline = createPipeline('My Pipeline');
 * pipeline.steps.push(createStep('text.trim'));
 * pipeline.steps.push(createStep('json.format', { indent: 2 }));
 *
 * // Run the pipeline
 * const result = await runPipeline(inputText, pipeline);
 * console.log(result.output);
 * ```
 */

// Types
export type {
  ParameterDefinition,
  OperationDefinition,
  ExecutionContext,
  PipelineStep,
  Pipeline,
  StepResult,
  PipelineResult,
  OperationCategory,
  SavedPipeline,
  PipelineSettingRecord,
  PipelineExecutionOptions,
} from "./types";

// Registry
export { operationRegistry } from "./OperationRegistry";

// Runner (main thread API)
export {
  runPipeline,
  runSingleOperation,
  validatePipeline,
  createStep,
  createPipeline,
  // Web Worker support
  runPipelineAsync,
  runSingleOperationAsync,
  isWorkerExecutionAvailable,
} from "./PipelineRunner";

export type { WorkerExecutionConfig } from "./PipelineRunner";

// Executor (low-level API for advanced use cases)
export {
  createExecutionContext,
  executeStep,
  executePipeline,
  executeSingleOperation,
} from "./pipelineExecutor";

export type { ProgressCallback } from "./pipelineExecutor";

// Categories
export {
  coreCategories,
  registerCoreCategories,
  getCategoryById,
} from "./categories";
