import { useMemo } from "react";
import { normalizeOpenApi } from "../../utils/normalizeOpenApi";
import { parseOpenApiDocument } from "../../utils/parseOpenApiDocument";
import { OpenApiOperation, OpenApiViewModel } from "../../utils/openApiTypes";
import { operationSearchText } from "../../utils/searchIndex";

export interface OpenApiFilters {
  query: string;
  method: string;
  tag: string;
  auth: "all" | "auth" | "none";
  deprecated: "all" | "deprecated" | "active";
}

const defaultModel: OpenApiViewModel = {
  sourceFormat: "unknown",
  specVersion: "OpenAPI",
  title: "Invalid OpenAPI document",
  servers: [],
  tags: [],
  operations: [],
  schemas: [],
  securitySchemes: [],
  globalSecurity: [],
  diagnostics: [],
};

function matchesFilters(operation: OpenApiOperation, filters: OpenApiFilters): boolean {
  if (filters.method !== "all" && operation.method !== filters.method) return false;
  if (filters.tag !== "all" && !operation.tags.includes(filters.tag)) return false;
  if (filters.auth === "auth" && operation.auth.length === 0) return false;
  if (filters.auth === "none" && operation.auth.length > 0) return false;
  if (filters.deprecated === "deprecated" && !operation.deprecated) return false;
  if (filters.deprecated === "active" && operation.deprecated) return false;
  if (filters.query.trim() && !operationSearchText(operation).includes(filters.query.toLowerCase().trim())) return false;
  return true;
}

export function useOpenApiData(content: string, filters: OpenApiFilters) {
  const parsed = useMemo(() => parseOpenApiDocument(content), [content]);

  const model = useMemo<OpenApiViewModel>(() => {
    if (!parsed.data) {
      return { ...defaultModel, sourceFormat: parsed.format, diagnostics: parsed.diagnostics };
    }
    const normalized = normalizeOpenApi(parsed.data, parsed.format);
    return {
      ...normalized,
      diagnostics: [...parsed.diagnostics, ...normalized.diagnostics],
    };
  }, [parsed]);

  const filteredOperations = useMemo(
    () => model.operations.filter((operation) => matchesFilters(operation, filters)),
    [filters, model.operations],
  );

  const methodCounts = useMemo(() => {
    return model.operations.reduce<Record<string, number>>((counts, operation) => {
      counts[operation.method] = (counts[operation.method] ?? 0) + 1;
      return counts;
    }, {});
  }, [model.operations]);

  return { model, filteredOperations, methodCounts };
}
