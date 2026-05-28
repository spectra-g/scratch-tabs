import { OpenApiOperation, OpenApiServer } from "./openApiTypes";
import { buildRequestUrl } from "./requestArtifacts";

export function buildRestClientRequest(operation: OpenApiOperation, server: OpenApiServer | undefined): string {
  const body = operation.requestBody[0];
  const lines = [
    `${operation.method.toUpperCase()} ${buildRequestUrl(operation, server)}`,
    ...(body ? [`Content-Type: ${body.mediaType}`] : []),
    "",
  ];

  if (body) {
    lines.push(JSON.stringify(body.example ?? {}, null, 2));
  }

  return lines.join("\n");
}
