import { OpenApiMediaContent, OpenApiOperation, OpenApiParameter, OpenApiServer } from "./openApiTypes";
import { CurlRequest } from "../../curl/utils/parser";

export function joinRequestUrl(server: OpenApiServer, path: string): string {
  if (!server.url || server.url === "/") return path;
  return `${server.url.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function placeholder(parameter: OpenApiParameter): string {
  if (parameter.default !== undefined && parameter.default !== null) {
    return encodeURIComponent(String(parameter.default));
  }
  return `<${parameter.name}>`;
}

export function buildRequestUrl(operation: OpenApiOperation, server: OpenApiServer | undefined): string {
  let url = joinRequestUrl(server ?? operation.servers[0] ?? { url: "/" }, operation.path);

  operation.parameters
    .filter((parameter) => parameter.in === "path")
    .forEach((parameter) => {
      url = url.replaceAll(`{${parameter.name}}`, placeholder(parameter));
    });

  const query = operation.parameters
    .filter((parameter) => parameter.in === "query")
    .map((parameter) => `${encodeURIComponent(parameter.name)}=${placeholder(parameter)}`);

  if (query.length === 0) return url;

  return `${url}${url.includes("?") ? "&" : "?"}${query.join("&")}`;
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function schemaProperties(schema: unknown): string[] {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return [];
  const properties = (schema as Record<string, unknown>).properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return [];
  return Object.keys(properties);
}

export function buildBodyLines(body: OpenApiMediaContent | undefined): string[] {
  if (!body) return [];

  if (body.mediaType === "multipart/form-data") {
    const fields = schemaProperties(body.schema);
    return [
      `  -H ${shellQuote(`Content-Type: ${body.mediaType}`)}`,
      ...(fields.length > 0 ? fields : ["field"]).map((field) => `  -F ${shellQuote(`${field}=<${field}>`)}`),
    ];
  }

  if (body.mediaType === "application/x-www-form-urlencoded") {
    const fields = schemaProperties(body.schema);
    const formBody = (fields.length > 0 ? fields : ["field"])
      .map((field) => `${encodeURIComponent(field)}=<${field}>`)
      .join("&");
    return [
      `  -H ${shellQuote(`Content-Type: ${body.mediaType}`)}`,
      `  --data ${shellQuote(formBody)}`,
    ];
  }

  return [
    `  -H ${shellQuote(`Content-Type: ${body.mediaType}`)}`,
    `  --data ${shellQuote(JSON.stringify(body.example ?? {}, null, 2))}`,
  ];
}

export function buildCurlRequestImport(operation: OpenApiOperation, server: OpenApiServer | undefined): CurlRequest {
  const body = operation.requestBody[0];
  const headers = operation.parameters
    .filter((parameter) => parameter.in === "header")
    .map((parameter) => ({ key: parameter.name, value: `<${parameter.name}>` }));

  if (body) {
    headers.push({ key: "Content-Type", value: body.mediaType });
  }

  let bodyContent: string | undefined;
  if (body?.mediaType === "application/x-www-form-urlencoded") {
    bodyContent = schemaProperties(body.schema)
      .map((field) => `${encodeURIComponent(field)}=<${field}>`)
      .join("&");
  } else if (body?.mediaType === "multipart/form-data") {
    bodyContent = schemaProperties(body.schema)
      .map((field) => `${field}=<${field}>`)
      .join("&");
  } else if (body) {
    bodyContent = JSON.stringify(body.example ?? {}, null, 2);
  }

  return {
    method: operation.method.toUpperCase(),
    url: buildRequestUrl(operation, server),
    headers,
    body: bodyContent,
    otherOptions: [],
  };
}
