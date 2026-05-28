import { BaseFormatDetector } from "./baseDetector";
import { DetectionResult, FormatModule } from "./types";
import { parseOpenApiDocument } from "./openapi/utils/parseOpenApiDocument";

interface MonacoLike {
  languages: {
    register: (language: { id: string }) => void;
    setLanguageConfiguration: (languageId: string, configuration: unknown) => void;
    setMonarchTokensProvider: (languageId: string, provider: unknown) => void;
  };
}

function hasRootKey(content: string, key: "openapi" | "swagger"): boolean {
  return new RegExp(`^\\s*${key}\\s*:`, "m").test(content) || new RegExp(`["']${key}["']\\s*:`).test(content);
}

function hasSupportingKeys(content: string): number {
  return ["info", "paths", "components", "definitions", "securityDefinitions", "servers", "host", "basePath"]
    .filter((key) => new RegExp(`(^\\s*${key}\\s*:)|(["']${key}["']\\s*:)`, "m").test(content))
    .length;
}

export class OpenApiFormatDetector extends BaseFormatDetector implements FormatModule {
  id = "openapi";
  name = "OpenAPI";
  extensions = ["openapi.json", "openapi.yaml", "openapi.yml", "swagger.json", "swagger.yaml", "swagger.yml", "json", "yaml", "yml"];
  priority = 35;

  detect(content: string): DetectionResult {
    const trimmed = content.trim();
    if (!trimmed) return this.noMatch();

    const hasVersionKey = hasRootKey(content, "openapi") || hasRootKey(content, "swagger");
    const supportingKeys = hasSupportingKeys(content);

    if (hasVersionKey && supportingKeys >= 2) {
      return { match: true, confidence: 0.99, matchedDefinitive: true };
    }

    if (hasVersionKey && supportingKeys >= 1) {
      return { match: true, confidence: 0.9, matchedDefinitive: true };
    }

    if (supportingKeys >= 4) {
      const parsed = parseOpenApiDocument(content);
      const isSpecLike = Boolean(parsed.data?.paths && parsed.data?.info);
      return { match: isSpecLike, confidence: isSpecLike ? 0.72 : 0 };
    }

    return this.noMatch();
  }

  registerProvider(monaco: MonacoLike): void {
    monaco.languages.register({ id: "openapi" });
    monaco.languages.setMonarchTokensProvider("openapi", {
      tokenizer: {
        root: [
          [/^\s*#.*$/, "comment"],
          [/"(?:\\.|[^"\\])*"(?=\s*:)/, "type.identifier"],
          [/"(?:\\.|[^"\\])*"/, "string"],
          [/'(?:\\.|[^'\\])*'/, "string"],
          [/\b(openapi|swagger|info|paths|components|schemas|definitions|security|securitySchemes|responses|parameters|requestBody|content|servers|tags)\b(?=\s*:)/, "keyword"],
          [/\b(get|put|post|delete|options|head|patch|trace)\b(?=\s*:)/, "keyword"],
          [/\b(true|false|null)\b/, "constant"],
          [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "number"],
          [/[{}[\],]/, "delimiter"],
          [/[A-Za-z0-9_.~/$-]+(?=\s*:)/, "type.identifier"],
          [/:/, "delimiter"],
        ],
      },
    });
    monaco.languages.setLanguageConfiguration("openapi", {
      comments: { lineComment: "#" },
      brackets: [["{", "}"], ["[", "]"]],
      autoClosingPairs: [{ open: "{", close: "}" }, { open: "[", close: "]" }, { open: '"', close: '"' }],
    });
  }

  sampleContent(): string {
    return `openapi: 3.1.0
info:
  title: Acme Orders API
  version: 1.4.0
  description: Private order management API.
servers:
  - url: https://api.acme.test/v1
security:
  - bearerAuth: []
tags:
  - name: orders
paths:
  /orders:
    get:
      tags: [orders]
      operationId: listOrders
      summary: List orders
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [open, shipped]
      responses:
        "200":
          description: Orders
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Order"
    post:
      tags: [orders]
      operationId: createOrder
      summary: Create an order
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/OrderCreate"
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Order"
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
  schemas:
    Order:
      type: object
      required: [id, status]
      properties:
        id:
          type: string
        status:
          type: string
          enum: [open, shipped]
    OrderCreate:
      type: object
      required: [sku]
      properties:
        sku:
          type: string
`;
  }

  getFileExtension(): string {
    return "openapi.yaml";
  }
}
