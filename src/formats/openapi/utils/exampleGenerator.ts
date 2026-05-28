import { OpenApiSchema, OpenApiSchemaProperty } from "./openApiTypes";

const MAX_REF_DEPTH = 8;

function schemaByName(schemas: OpenApiSchema[], name: string | undefined): OpenApiSchema | undefined {
  return name ? schemas.find((schema) => schema.name === name) : undefined;
}

function sampleForType(type: string | undefined): unknown {
  if (type === "integer" || type === "number") return 0;
  if (type === "boolean") return true;
  if (type === "array") return [];
  if (type === "object") return {};
  return "string";
}

function sampleForProperty(
  property: OpenApiSchemaProperty,
  schemas: OpenApiSchema[],
  seen: Set<string>,
  depth: number,
): unknown {
  if (property.enumValues?.length) return property.enumValues[0];

  if (property.ref) {
    return sampleForSchemaName(property.ref, schemas, seen, depth + 1);
  }

  if (property.type === "array") {
    if (property.itemsRef) {
      return [sampleForSchemaName(property.itemsRef, schemas, seen, depth + 1)];
    }
    return [sampleForType(property.itemsType)];
  }

  return sampleForType(property.type);
}

export function sampleForSchemaName(
  name: string,
  schemas: OpenApiSchema[],
  seen = new Set<string>(),
  depth = 0,
): unknown {
  const schema = schemaByName(schemas, name);
  if (!schema) return `<${name}>`;
  return sampleForSchema(schema, schemas, seen, depth);
}

export function sampleForSchema(
  schema: OpenApiSchema,
  schemas: OpenApiSchema[],
  seen = new Set<string>(),
  depth = 0,
): unknown {
  if (seen.has(schema.name)) return `<recursive ${schema.name}>`;
  if (depth > MAX_REF_DEPTH) return `<max-depth ${schema.name}>`;

  const nextSeen = new Set(seen);
  nextSeen.add(schema.name);

  if (schema.enumValues?.length) return schema.enumValues[0];

  if (schema.type === "array") {
    if (schema.itemsRef) {
      return [sampleForSchemaName(schema.itemsRef, schemas, nextSeen, depth + 1)];
    }
    return [sampleForType(schema.itemsType)];
  }

  if (schema.type === "boolean") return true;
  if (schema.type === "integer" || schema.type === "number") return 0;

  if (schema.type === "object" || schema.properties.length > 0) {
    return Object.fromEntries(
      schema.properties.map((property) => [
        property.name,
        sampleForProperty(property, schemas, nextSeen, depth),
      ]),
    );
  }

  return "string";
}
