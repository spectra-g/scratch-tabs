import { OpenApiOperation, OpenApiServer } from "./openApiTypes";
import { buildBodyLines, buildRequestUrl, shellQuote } from "./requestArtifacts";

export function buildCurlCommand(operation: OpenApiOperation, server: OpenApiServer | undefined): string {
  const url = buildRequestUrl(operation, server);
  const headers = operation.parameters
    .filter((parameter) => parameter.in === "header")
    .map((parameter) => `  -H ${shellQuote(`${parameter.name}: <${parameter.name}>`)}`);
  const body = operation.requestBody[0];

  return [
    `curl -X ${operation.method.toUpperCase()} ${shellQuote(url)}`,
    ...headers,
    ...buildBodyLines(body),
  ].join(" \\\n");
}
