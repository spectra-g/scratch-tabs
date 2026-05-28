import {
  OPENAPI_HTTP_METHODS,
  OpenApiMediaContent,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiResponse,
  OpenApiSchema,
  OpenApiSchemaProperty,
  OpenApiSecurityRequirement,
  OpenApiSecurityScheme,
  OpenApiServer,
  OpenApiTag,
  OpenApiViewModel,
} from "./openApiTypes";
import { buildOpenApiDiagnostics } from "./diagnostics";
import { collectLocalRefs, getLocalRefName, resolveLocalRef } from "./refResolver";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeSecurity(value: unknown): OpenApiSecurityRequirement[] {
  return asArray(value).flatMap((item) => {
    if (!isRecord(item)) return [];
    return Object.entries(item).map(([scheme, scopes]) => ({
      scheme,
      scopes: asArray(scopes).filter((scope): scope is string => typeof scope === "string"),
    }));
  });
}

function normalizeServers(root: Record<string, unknown>): OpenApiServer[] {
  const servers = asArray(root.servers)
    .filter(isRecord)
    .map((server) => ({
      url: asString(server.url) ?? "",
      description: asString(server.description),
    }))
    .filter((server) => server.url);

  if (servers.length > 0) return servers;

  const schemes = asArray(root.schemes).filter((scheme): scheme is string => typeof scheme === "string");
  const scheme = schemes[0] ?? "https";
  const host = asString(root.host);
  const basePath = asString(root.basePath) ?? "";
  return host ? [{ url: `${scheme}://${host}${basePath}` }] : [{ url: basePath || "/" }];
}

function schemaType(schema: unknown): string | undefined {
  if (!isRecord(schema)) return undefined;
  if (typeof schema.type === "string") return schema.type;
  if (typeof schema.$ref === "string") return getLocalRefName(schema.$ref) ?? schema.$ref;
  if (Array.isArray(schema.oneOf)) return "oneOf";
  if (Array.isArray(schema.anyOf)) return "anyOf";
  if (Array.isArray(schema.allOf)) return "allOf";
  return undefined;
}

function schemaItems(schema: unknown): { itemsType?: string; itemsRef?: string } {
  if (!isRecord(schema) || !isRecord(schema.items)) return {};
  return {
    itemsType: schemaType(schema.items),
    itemsRef: typeof schema.items.$ref === "string" ? getLocalRefName(schema.items.$ref) ?? schema.items.$ref : undefined,
  };
}

function refsFrom(value: unknown): string[] {
  return Array.from(collectLocalRefs(value)).map((ref) => getLocalRefName(ref) ?? ref);
}

function dereferenceLocal(root: Record<string, unknown>, value: unknown): unknown {
  if (isRecord(value) && typeof value.$ref === "string") {
    return resolveLocalRef(root, value.$ref) ?? value;
  }
  return value;
}

function parameterKey(root: Record<string, unknown>, parameter: unknown): string | null {
  const dereferenced = dereferenceLocal(root, parameter);
  if (!isRecord(dereferenced)) return null;
  const name = asString(dereferenced.name);
  const location = asString(dereferenced.in);
  if (!name || !location) {
    return typeof dereferenced.$ref === "string" ? dereferenced.$ref : null;
  }
  return `${location}:${name}`;
}

function mergeParameters(root: Record<string, unknown>, pathParameters: unknown[], operationParameters: unknown[]): unknown[] {
  const merged = new Map<string, unknown>();
  pathParameters.forEach((parameter, index) => {
    merged.set(parameterKey(root, parameter) ?? `path:${index}`, parameter);
  });
  operationParameters.forEach((parameter, index) => {
    merged.set(parameterKey(root, parameter) ?? `operation:${index}`, parameter);
  });
  return Array.from(merged.values());
}

function normalizeParameter(parameter: unknown, root: Record<string, unknown>): OpenApiParameter | null {
  parameter = dereferenceLocal(root, parameter);
  if (!isRecord(parameter)) return null;
  const name = asString(parameter.name);
  const location = asString(parameter.in);
  if (!name || !location) return null;

  const schema = isRecord(parameter.schema) ? parameter.schema : undefined;
  return {
    name,
    in: ["path", "query", "header", "cookie", "body"].includes(location)
      ? (location as OpenApiParameter["in"])
      : "query",
    required: parameter.required === true || location === "path",
    type: schemaType(schema) ?? asString(parameter.type),
    description: asString(parameter.description),
    default: schema?.default ?? parameter.default,
    schema: schema ?? parameter,
  };
}

function normalizeContent(content: unknown): OpenApiMediaContent[] {
  if (!isRecord(content)) return [];

  return Object.entries(content).map(([mediaType, media]) => {
    const mediaObject = isRecord(media) ? media : {};
    const example = mediaObject.example ?? (isRecord(mediaObject.examples) ? Object.values(mediaObject.examples)[0] : undefined);
    return {
      mediaType,
      schema: mediaObject.schema,
      example,
      schemaRefs: refsFrom(mediaObject.schema),
    };
  });
}

function normalizeSwaggerBody(parameters: unknown[], root: Record<string, unknown>): OpenApiMediaContent[] {
  const body = parameters
    .map((parameter) => normalizeParameter(parameter, root))
    .find((parameter) => parameter?.in === "body");
  if (!body) return [];
  return [{
    mediaType: "application/json",
    schema: body.schema,
    schemaRefs: refsFrom(body.schema),
  }];
}

function normalizeResponses(responses: unknown): OpenApiResponse[] {
  if (!isRecord(responses)) return [];

  return Object.entries(responses).map(([status, response]) => {
    const responseObject = isRecord(response) ? response : {};
    const openApiContent = normalizeContent(responseObject.content);
    const swaggerSchema = responseObject.schema
      ? [{
        mediaType: "application/json",
        schema: responseObject.schema,
        schemaRefs: refsFrom(responseObject.schema),
      }]
      : [];

    return {
      status,
      description: asString(responseObject.description),
      content: openApiContent.length > 0 ? openApiContent : swaggerSchema,
    };
  });
}

function normalizeOperations(root: Record<string, unknown>, servers: OpenApiServer[]): OpenApiOperation[] {
  const paths = isRecord(root.paths) ? root.paths : {};
  const globalSecurity = normalizeSecurity(root.security);

  return Object.entries(paths).flatMap(([path, pathItem]) => {
    if (!isRecord(pathItem)) return [];
    const pathParameters = asArray(pathItem.parameters);
    const pathServers = normalizeServers(pathItem).filter((server) => server.url !== "/");

    return OPENAPI_HTTP_METHODS.flatMap((method) => {
      const operation = pathItem[method];
      if (!isRecord(operation)) return [];

      const operationParameters = mergeParameters(root, pathParameters, asArray(operation.parameters));
      const parameters = operationParameters
        .map((parameter) => normalizeParameter(parameter, root))
        .filter((parameter): parameter is OpenApiParameter => Boolean(parameter));
      const requestBody = normalizeContent(isRecord(operation.requestBody) ? operation.requestBody.content : undefined);
      const swaggerBody = requestBody.length > 0 ? [] : normalizeSwaggerBody(operationParameters, root);
      const responses = normalizeResponses(operation.responses);
      const auth = "security" in operation ? normalizeSecurity(operation.security) : globalSecurity;
      const referencedSchemas = Array.from(new Set([
        ...refsFrom(operation.requestBody),
        ...refsFrom(operation.responses),
        ...parameters.flatMap((parameter) => refsFrom(parameter.schema)),
      ]));

      return [{
        id: `${method}-${path}`,
        method,
        path,
        summary: asString(operation.summary),
        description: asString(operation.description),
        operationId: asString(operation.operationId),
        tags: asArray(operation.tags).filter((tag): tag is string => typeof tag === "string"),
        deprecated: operation.deprecated === true,
        servers: pathServers.length > 0 ? pathServers : servers,
        auth,
        authInherited: !("security" in operation),
        parameters,
        requestBody: requestBody.length > 0 ? requestBody : swaggerBody,
        responses,
        referencedSchemas,
      }];
    });
  });
}

function normalizeSchemas(root: Record<string, unknown>, operations: OpenApiOperation[]): OpenApiSchema[] {
  const components = isRecord(root.components) ? root.components : {};
  const openApiSchemas = isRecord(components.schemas) ? components.schemas : {};
  const swaggerDefinitions = isRecord(root.definitions) ? root.definitions : {};
  const source = Object.keys(openApiSchemas).length > 0 ? openApiSchemas : swaggerDefinitions;

  const schemas = Object.entries(source).map(([name, raw]) => {
    const schema = isRecord(raw) ? raw : {};
    const required = asArray(schema.required).filter((item): item is string => typeof item === "string");
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const outboundRefs = refsFrom(schema);
    const compositionRefs = (key: "oneOf" | "anyOf" | "allOf") => asArray(schema[key]).flatMap(refsFrom);

    const normalizedProperties: OpenApiSchemaProperty[] = Object.entries(properties).map(([propertyName, property]) => {
      const propertySchema = isRecord(property) ? property : {};
      const items = schemaItems(propertySchema);
      return {
        name: propertyName,
        type: schemaType(propertySchema),
        itemsType: items.itemsType,
        itemsRef: items.itemsRef,
        required: required.includes(propertyName),
        description: asString(propertySchema.description),
        deprecated: propertySchema.deprecated === true,
        enumValues: Array.isArray(propertySchema.enum) ? propertySchema.enum : undefined,
        ref: typeof propertySchema.$ref === "string" ? getLocalRefName(propertySchema.$ref) ?? propertySchema.$ref : undefined,
      };
    });

    return {
      name,
      type: schemaType(schema),
      ...schemaItems(schema),
      format: asString(schema.format),
      required,
      properties: normalizedProperties,
      enumValues: Array.isArray(schema.enum) ? schema.enum : undefined,
      oneOf: compositionRefs("oneOf"),
      anyOf: compositionRefs("anyOf"),
      allOf: compositionRefs("allOf"),
      nullable: schema.nullable === true,
      deprecated: schema.deprecated === true,
      description: asString(schema.description),
      inboundRefs: [],
      outboundRefs,
      raw,
    };
  });

  const inbound = new Map<string, Set<string>>();
  schemas.forEach((schema) => {
    schema.outboundRefs.forEach((ref) => {
      const refs = inbound.get(ref) ?? new Set<string>();
      refs.add(schema.name);
      inbound.set(ref, refs);
    });
  });
  operations.forEach((operation) => {
    operation.referencedSchemas.forEach((ref) => {
      const refs = inbound.get(ref) ?? new Set<string>();
      refs.add(`${operation.method.toUpperCase()} ${operation.path}`);
      inbound.set(ref, refs);
    });
  });

  return schemas.map((schema) => ({
    ...schema,
    inboundRefs: Array.from(inbound.get(schema.name) ?? []),
  }));
}

function normalizeSecuritySchemes(root: Record<string, unknown>): OpenApiSecurityScheme[] {
  const components = isRecord(root.components) ? root.components : {};
  const source = isRecord(components.securitySchemes)
    ? components.securitySchemes
    : isRecord(root.securityDefinitions)
      ? root.securityDefinitions
      : {};

  return Object.entries(source).map(([name, scheme]) => {
    const object = isRecord(scheme) ? scheme : {};
    const flows = isRecord(object.flows) ? object.flows : {};
    const scopes = Object.values(flows).flatMap((flow) => {
      if (!isRecord(flow) || !isRecord(flow.scopes)) return [];
      return Object.keys(flow.scopes);
    });

    return {
      name,
      type: asString(object.type),
      description: asString(object.description),
      in: asString(object.in),
      scheme: asString(object.scheme),
      bearerFormat: asString(object.bearerFormat),
      openIdConnectUrl: asString(object.openIdConnectUrl),
      scopes,
    };
  });
}

function normalizeTags(root: Record<string, unknown>, operations: OpenApiOperation[]): OpenApiTag[] {
  const counts = new Map<string, number>();
  operations.forEach((operation) => {
    const tags = operation.tags.length > 0 ? operation.tags : ["untagged"];
    tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  });

  const declared = asArray(root.tags).filter(isRecord);
  const tags = new Map<string, OpenApiTag>();
  declared.forEach((tag) => {
    const name = asString(tag.name);
    if (name) tags.set(name, { name, description: asString(tag.description), count: counts.get(name) ?? 0 });
  });
  counts.forEach((count, name) => {
    if (!tags.has(name)) tags.set(name, { name, count });
  });
  return Array.from(tags.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeOpenApi(root: Record<string, unknown>, sourceFormat: OpenApiViewModel["sourceFormat"]): OpenApiViewModel {
  const info = isRecord(root.info) ? root.info : {};
  const servers = normalizeServers(root);
  const operations = normalizeOperations(root, servers);
  const schemas = normalizeSchemas(root, operations);
  const securitySchemes = normalizeSecuritySchemes(root);

  return {
    sourceFormat,
    specVersion: asString(root.openapi) ?? (asString(root.swagger) ? `Swagger ${root.swagger}` : "OpenAPI"),
    title: asString(info.title) ?? "Untitled API",
    description: asString(info.description),
    apiVersion: asString(info.version),
    license: isRecord(info.license) ? asString(info.license.name) : undefined,
    contact: isRecord(info.contact) ? asString(info.contact.email) ?? asString(info.contact.name) : undefined,
    servers,
    tags: normalizeTags(root, operations),
    operations,
    schemas,
    securitySchemes,
    globalSecurity: normalizeSecurity(root.security),
    diagnostics: buildOpenApiDiagnostics(root, operations),
  };
}
