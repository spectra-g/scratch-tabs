import { detectFormat, getPotentialFormatMatches } from "../../index";
import { buildCurlCommand } from "../utils/curlGenerator";
import { normalizeOpenApi } from "../utils/normalizeOpenApi";
import { parseOpenApiDocument } from "../utils/parseOpenApiDocument";
import { buildRestClientRequest } from "../utils/restClientExport";

const openApiYaml = `openapi: 3.1.0
info:
  title: Test API
  version: 1.0.0
servers:
  - url: https://api.example.test
paths:
  /users:
    get:
      operationId: listUsers
      tags: [users]
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/User"
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
  schemas:
    User:
      type: object
      required: [id]
      properties:
        id:
          type: string
`;

describe("OpenAPI format", () => {
  test("detects OpenAPI YAML above generic YAML", () => {
    expect(detectFormat(openApiYaml)).toBe("openapi");
    expect(getPotentialFormatMatches(openApiYaml, 3)[0].id).toBe("openapi");
  });

  test("parses OpenAPI YAML and normalizes operations and schemas", () => {
    const parsed = parseOpenApiDocument(openApiYaml);
    expect(parsed.format).toBe("yaml");
    expect(parsed.data).toBeTruthy();

    const model = normalizeOpenApi(parsed.data!, parsed.format);
    expect(model.title).toBe("Test API");
    expect(model.operations).toHaveLength(1);
    expect(model.operations[0].referencedSchemas).toContain("User");
    expect(model.schemas[0].properties[0]).toMatchObject({ name: "id", required: true, type: "string" });
  });

  test("normalizes Swagger 2.0 JSON", () => {
    const parsed = parseOpenApiDocument(JSON.stringify({
      swagger: "2.0",
      info: { title: "Legacy API", version: "2.0.0" },
      host: "legacy.example.test",
      basePath: "/api",
      securityDefinitions: { apiKey: { type: "apiKey", in: "header", name: "X-API-Key" } },
      paths: {
        "/pets": {
          post: {
            operationId: "createPet",
            parameters: [{ name: "body", in: "body", schema: { $ref: "#/definitions/Pet" } }],
            responses: { "201": { description: "Created", schema: { $ref: "#/definitions/Pet" } } },
          },
        },
      },
      definitions: {
        Pet: { type: "object", properties: { name: { type: "string" } } },
      },
    }));

    const model = normalizeOpenApi(parsed.data!, parsed.format);
    expect(model.specVersion).toBe("Swagger 2.0");
    expect(model.servers[0].url).toBe("https://legacy.example.test/api");
    expect(model.securitySchemes[0].name).toBe("apiKey");
    expect(model.operations[0].requestBody[0].schemaRefs).toContain("Pet");
  });

  test("builds cURL command for an operation", () => {
    const parsed = parseOpenApiDocument(openApiYaml);
    const model = normalizeOpenApi(parsed.data!, parsed.format);
    const curl = buildCurlCommand(model.operations[0], model.servers[0]);
    expect(curl).toContain("curl -X GET");
    expect(curl).toContain("https://api.example.test/users");
  });

  test("merges parameter overrides and generates request URLs with path and query placeholders", () => {
    const parsed = parseOpenApiDocument(JSON.stringify({
      openapi: "3.1.0",
      info: { title: "Users", version: "1.0.0" },
      servers: [{ url: "https://api.example.test/v1" }],
      paths: {
        "/users/{id}": {
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "include", in: "query", schema: { type: "string", default: "profile" } },
          ],
          get: {
            operationId: "getUser",
            parameters: [
              { name: "include", in: "query", schema: { type: "string" }, description: "Override" },
              { name: "trace", in: "query", schema: { type: "boolean" } },
            ],
            responses: { "200": { description: "OK" } },
          },
        },
      },
    }));

    const model = normalizeOpenApi(parsed.data!, parsed.format);
    const operation = model.operations[0];
    expect(operation.parameters.map((parameter) => `${parameter.in}:${parameter.name}`)).toEqual([
      "path:id",
      "query:include",
      "query:trace",
    ]);
    expect(operation.parameters.find((parameter) => parameter.name === "include")?.description).toBe("Override");

    const curl = buildCurlCommand(operation, model.servers[0]);
    const rest = buildRestClientRequest(operation, model.servers[0]);
    expect(curl).toContain("https://api.example.test/v1/users/<id>?include=<include>&trace=<trace>");
    expect(rest).toContain("GET https://api.example.test/v1/users/<id>?include=<include>&trace=<trace>");
  });

  test("normalizes array item refs and types in schemas", () => {
    const parsed = parseOpenApiDocument(JSON.stringify({
      openapi: "3.1.0",
      info: { title: "Arrays", version: "1.0.0" },
      paths: {},
      components: {
        schemas: {
          UserList: {
            type: "array",
            items: { $ref: "#/components/schemas/User" },
          },
          Group: {
            type: "object",
            properties: {
              members: {
                type: "array",
                items: { $ref: "#/components/schemas/User" },
              },
              tags: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
          User: { type: "object" },
        },
      },
    }));

    const model = normalizeOpenApi(parsed.data!, parsed.format);
    expect(model.schemas.find((schema) => schema.name === "UserList")).toMatchObject({
      type: "array",
      itemsRef: "User",
    });
    expect(model.schemas.find((schema) => schema.name === "Group")?.properties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "members", type: "array", itemsRef: "User" }),
        expect.objectContaining({ name: "tags", type: "array", itemsType: "string" }),
      ]),
    );
  });
});
