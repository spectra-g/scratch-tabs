import * as YAML from "yaml";
import { OpenApiDiagnostic, OpenApiParseResult } from "./openApiTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function detectYamlWarnings(content: string): OpenApiDiagnostic[] {
  const diagnostics: OpenApiDiagnostic[] = [];
  if (/^---\s*$/m.test(content) && content.match(/^---\s*$/gm)?.length && content.match(/^---\s*$/gm)!.length > 1) {
    diagnostics.push({
      severity: "warning",
      message: "Multi-document YAML is not supported; only the first document is used.",
    });
  }
  if (/(^|\s)[&*][A-Za-z0-9_-]+/.test(content)) {
    diagnostics.push({
      severity: "warning",
      message: "YAML anchors and aliases are parsed, but the OpenAPI view treats the resolved object as local data.",
    });
  }
  if (/^\s*![^\s]+/m.test(content)) {
    diagnostics.push({
      severity: "warning",
      message: "YAML tags are not part of the OpenAPI subset and may not render as intended.",
    });
  }
  return diagnostics;
}

export function parseOpenApiDocument(content: string): OpenApiParseResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return {
      data: null,
      format: "unknown",
      diagnostics: [{ severity: "error", message: "Document is empty." }],
    };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!isRecord(parsed)) {
      return {
        data: null,
        format: "json",
        diagnostics: [{ severity: "error", message: "OpenAPI document must be a JSON object." }],
      };
    }
    return { data: parsed, format: "json", diagnostics: [] };
  } catch {
    // Fall through to YAML.
  }

  const diagnostics = detectYamlWarnings(content);
  try {
    const documents = YAML.parseAllDocuments(content, { prettyErrors: false });
    const doc = documents[0];
    if (!doc) {
      return {
        data: null,
        format: "yaml",
        diagnostics: [{ severity: "error", message: "YAML document is empty." }],
      };
    }

    const errors = (doc.errors ?? []).map((error) => ({
      severity: "error" as const,
      message: error.message,
    }));
    const warnings = (doc.warnings ?? []).map((warning) => ({
      severity: "warning" as const,
      message: warning.message,
    }));
    const parsed = doc.toJS();

    if (!isRecord(parsed)) {
      return {
        data: null,
        format: "yaml",
        diagnostics: [
          ...diagnostics,
          ...errors,
          ...warnings,
          { severity: "error", message: "OpenAPI document must be a YAML mapping/object." },
        ],
      };
    }

    return {
      data: parsed,
      format: "yaml",
      diagnostics: [...diagnostics, ...errors, ...warnings],
    };
  } catch (error) {
    return {
      data: null,
      format: "yaml",
      diagnostics: [
        ...diagnostics,
        {
          severity: "error",
          message: `YAML parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
}
