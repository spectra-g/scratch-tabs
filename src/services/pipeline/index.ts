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

// Runner
export {
  runPipeline,
  runSingleOperation,
  validatePipeline,
  createStep,
  createPipeline,
} from "./PipelineRunner";

// Categories
export {
  coreCategories,
  registerCoreCategories,
  getCategoryById,
} from "./categories";
