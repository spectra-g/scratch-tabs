import { OpenApiOperation } from "./openApiTypes";

export function operationSearchText(operation: OpenApiOperation): string {
  return [
    operation.method,
    operation.path,
    operation.summary,
    operation.description,
    operation.operationId,
    ...operation.tags,
    ...operation.referencedSchemas,
    ...operation.responses.map((response) => response.status),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
