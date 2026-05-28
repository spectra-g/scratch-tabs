import { OpenApiDiagnostic, OpenApiOperation } from "./openApiTypes";
import { collectLocalRefs, resolveLocalRef } from "./refResolver";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function buildOpenApiDiagnostics(root: Record<string, unknown>, operations: OpenApiOperation[]): OpenApiDiagnostic[] {
  const diagnostics: OpenApiDiagnostic[] = [];
  const info = root.info;
  const paths = root.paths;

  if (!isRecord(info) || typeof info.title !== "string" || !info.title.trim()) {
    diagnostics.push({ severity: "warning", message: "Missing info.title.", path: "/info/title" });
  }
  if (!isRecord(info) || typeof info.version !== "string" || !info.version.trim()) {
    diagnostics.push({ severity: "warning", message: "Missing info.version.", path: "/info/version" });
  }
  if (!isRecord(paths) || Object.keys(paths).length === 0) {
    diagnostics.push({ severity: "error", message: "Missing or empty paths object.", path: "/paths" });
  }

  const operationIds = new Map<string, number>();
  operations.forEach((operation) => {
    if (!operation.operationId) {
      diagnostics.push({
        severity: "info",
        message: `${operation.method.toUpperCase()} ${operation.path} is missing operationId.`,
        path: `/paths/${operation.path}/${operation.method}`,
      });
    } else {
      operationIds.set(operation.operationId, (operationIds.get(operation.operationId) ?? 0) + 1);
    }

    if (!operation.responses.some((response) => /^2\d\d$|^default$/i.test(response.status))) {
      diagnostics.push({
        severity: "warning",
        message: `${operation.method.toUpperCase()} ${operation.path} has no success response.`,
        path: `/paths/${operation.path}/${operation.method}/responses`,
      });
    }

    if (operation.requestBody.length === 0 && operation.parameters.some((parameter) => parameter.in === "body" && !parameter.schema)) {
      diagnostics.push({
        severity: "warning",
        message: `${operation.method.toUpperCase()} ${operation.path} has a body parameter without a schema.`,
      });
    }

    operation.responses.forEach((response) => {
      response.content.forEach((content) => {
        if (!content.schema) {
          diagnostics.push({
            severity: "warning",
            message: `${operation.method.toUpperCase()} ${operation.path} response ${response.status} ${content.mediaType} has content without schema.`,
          });
        }
      });
    });
  });

  operationIds.forEach((count, operationId) => {
    if (count > 1) {
      diagnostics.push({
        severity: "warning",
        message: `Duplicate operationId "${operationId}" appears ${count} times.`,
      });
    }
  });

  collectLocalRefs(root).forEach((ref) => {
    if (resolveLocalRef(root, ref) === undefined) {
      diagnostics.push({
        severity: "error",
        message: `Unresolved local $ref: ${ref}`,
      });
    }
  });

  return diagnostics;
}
