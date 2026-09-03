import { operationRegistry } from "../../../services/pipeline/OperationRegistry";
import { runSingleOperation } from "../../../services/pipeline/PipelineRunner";
import type { OperationDefinition } from "../../../services/pipeline/types";

export type SingleOperationRunner = (
  operationId: string,
  input: string,
  params: Record<string, unknown>,
) => Promise<{ success: boolean; output: string; error?: string }>;

export interface CanvasTransformResult {
  ok: boolean;
  output: string;
  error?: string;
}

/** Defaults from the operation definition so quick transform works with one click. */
export const resolveDefaultParams = (
  operation: Pick<OperationDefinition, "parameters">,
): Record<string, unknown> => {
  const params: Record<string, unknown> = {};
  for (const param of operation.parameters) {
    if (param.default !== undefined) params[param.name] = param.default;
  }
  return params;
};

export const getTransformOperation = (
  operationId: string,
): OperationDefinition => {
  const operation = operationRegistry.getById(operationId);
  if (!operation) {
    throw new Error(`Transform '${operationId}' is not available.`);
  }
  return operation;
};

/**
 * Run one pipeline operation over card content.
 * The runner is injectable so unit tests never touch the real registry.
 */
export const executeCanvasTransform = async (
  input: string,
  operationId: string,
  params: Record<string, unknown> = {},
  runner: SingleOperationRunner = runSingleOperation,
): Promise<CanvasTransformResult> => {
  const result = await runner(operationId, input, params);
  if (!result.success) {
    return {
      ok: false,
      output: input,
      error: result.error ?? `Transform '${operationId}' failed.`,
    };
  }
  return { ok: true, output: result.output };
};
