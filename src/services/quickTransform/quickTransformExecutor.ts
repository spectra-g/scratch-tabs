import { executeSingleOperation, executePipeline } from "../pipeline/pipelineExecutor";
import { operationRegistry } from "../pipeline/OperationRegistry";
import { SavedPipeline, PipelineStep, ParameterDefinition } from "../pipeline/types";
import { QuickTransformItem } from "./types";

export interface QuickTransformResult {
  success: boolean;
  output: string;
  error?: string;
}

function typeDefault(type: ParameterDefinition["type"]): unknown {
  if (type === "boolean") return false;
  if (type === "number") return 0;
  return "";
}

export function buildInitialParams(
  parameters: ParameterDefinition[],
): Record<string, unknown> {
  return Object.fromEntries(
    parameters.map((p) => [p.name, p.default ?? typeDefault(p.type)]),
  );
}

export function validateParams(
  parameters: ParameterDefinition[],
  params: Record<string, unknown>,
): string | null {
  for (const param of parameters) {
    if (!param.required) continue;
    const value = params[param.name];
    if (value === undefined || value === null || value === "") {
      return `"${param.label}" is required`;
    }
  }
  return null;
}

export async function executeQuickTransformItem(
  item: QuickTransformItem,
  input: string,
  savedPipelines: SavedPipeline[],
  params?: Record<string, unknown>,
  applyPerLine?: boolean,
): Promise<QuickTransformResult> {
  if (item.type === "operation") {
    const op = operationRegistry.getById(item.id);
    const resolvedParams = params ?? (op ? buildInitialParams(op.parameters) : {});
    return executeSingleOperation(item.id, input, resolvedParams, applyPerLine);
  }

  const pipeline = savedPipelines.find((p) => p.id === item.id);
  if (!pipeline) {
    return { success: false, output: input, error: `Pipeline '${item.id}' not found` };
  }

  let steps: PipelineStep[];
  try {
    steps = JSON.parse(pipeline.steps) as PipelineStep[];
  } catch {
    return { success: false, output: input, error: "Failed to parse pipeline steps" };
  }

  const result = await executePipeline(input, {
    id: pipeline.id,
    name: pipeline.name,
    steps,
  });

  return { success: result.success, output: result.output, error: result.error };
}
