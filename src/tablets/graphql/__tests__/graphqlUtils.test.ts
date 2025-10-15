import {
  introspectSchema,
  executeGraphQLQuery,
  formatTypeRef,
  getRootTypes,
  findTypeByName,
  isBuiltInType,
  parseVariables,
  detectOperationType,
  extractOperationNames,
  GraphQLWebSocketClient,
} from "../utils/graphqlUtils";

// Mock fetch globally
global.fetch = jest.fn();

describe("graphqlUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("introspectSchema", () => {
    it("should successfully introspect a schema", async () => {
      const mockSchema = {
        __schema: {
          queryType: { name: "Query" },
          types: [],
          directives: [],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockSchema }),
      });

      const result = await introspectSchema("https://api.example.com/graphql");

      expect(result.error).toBeUndefined();
      expect(result.schema).toEqual(mockSchema.__schema);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/graphql",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should handle HTTP errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await introspectSchema("https://api.example.com/graphql");

      expect(result.error).toBe("HTTP 404: Not Found");
      expect(result.schema.types).toEqual([]);
    });

    it("should handle GraphQL errors in response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          errors: [{ message: "Schema introspection is disabled" }],
        }),
      });

      const result = await introspectSchema("https://api.example.com/graphql");

      expect(result.error).toBe("Schema introspection is disabled");
    });

    it("should handle network errors", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error("Network request failed")
      );

      const result = await introspectSchema("https://api.example.com/graphql");

      expect(result.error).toBe("Network request failed");
    });

    it("should include custom headers in request", async () => {
      const mockSchema = {
        __schema: {
          queryType: { name: "Query" },
          types: [],
          directives: [],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockSchema }),
      });

      await introspectSchema("https://api.example.com/graphql", {
        Authorization: "Bearer test-token",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/graphql",
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          },
        })
      );
    });
  });

  describe("executeGraphQLQuery", () => {
    it("should successfully execute a query", async () => {
      const mockResponse = {
        data: { user: { id: "1", name: "Test User" } },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await executeGraphQLQuery(
        "https://api.example.com/graphql",
        "query { user { id name } }",
        {}
      );

      expect(result.data).toEqual(mockResponse.data);
      expect(result.status).toBe(200);
      expect(result.statusText).toBe("OK");
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it("should handle GraphQL errors", async () => {
      const mockResponse = {
        data: null,
        errors: [{ message: "User not found", path: ["user"] }],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await executeGraphQLQuery(
        "https://api.example.com/graphql",
        "query { user { id } }",
        {}
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toBe("User not found");
    });

    it("should handle invalid JSON response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "Not JSON",
      });

      const result = await executeGraphQLQuery(
        "https://api.example.com/graphql",
        "query { user { id } }",
        {}
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toBe("Invalid JSON response");
    });

    it("should handle network errors", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new TypeError("Failed to fetch")
      );

      const result = await executeGraphQLQuery(
        "https://api.example.com/graphql",
        "query { user { id } }",
        {}
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toContain("Network error");
      expect(result.status).toBe(0);
    });

    it("should include variables in request", async () => {
      const mockResponse = { data: { user: { id: "1" } } };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify(mockResponse),
      });

      await executeGraphQLQuery(
        "https://api.example.com/graphql",
        "query GetUser($id: ID!) { user(id: $id) { id } }",
        { id: "123" }
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/graphql",
        expect.objectContaining({
          body: JSON.stringify({
            query: "query GetUser($id: ID!) { user(id: $id) { id } }",
            variables: { id: "123" },
          }),
        })
      );
    });

    it("should include custom headers", async () => {
      const mockResponse = { data: { user: { id: "1" } } };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify(mockResponse),
      });

      await executeGraphQLQuery(
        "https://api.example.com/graphql",
        "query { user { id } }",
        {},
        { Authorization: "Bearer test-token" }
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/graphql",
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          },
        })
      );
    });
  });

  describe("formatTypeRef", () => {
    it("should format a simple type", () => {
      const typeRef = { kind: "SCALAR", name: "String" };
      expect(formatTypeRef(typeRef)).toBe("String");
    });

    it("should format a non-null type", () => {
      const typeRef = {
        kind: "NON_NULL",
        ofType: { kind: "SCALAR", name: "String" },
      };
      expect(formatTypeRef(typeRef)).toBe("String!");
    });

    it("should format a list type", () => {
      const typeRef = {
        kind: "LIST",
        ofType: { kind: "SCALAR", name: "String" },
      };
      expect(formatTypeRef(typeRef)).toBe("[String]");
    });

    it("should format a non-null list type", () => {
      const typeRef = {
        kind: "NON_NULL",
        ofType: {
          kind: "LIST",
          ofType: { kind: "SCALAR", name: "String" },
        },
      };
      expect(formatTypeRef(typeRef)).toBe("[String]!");
    });

    it("should format a list of non-null types", () => {
      const typeRef = {
        kind: "LIST",
        ofType: {
          kind: "NON_NULL",
          ofType: { kind: "SCALAR", name: "String" },
        },
      };
      expect(formatTypeRef(typeRef)).toBe("[String!]");
    });
  });

  describe("getRootTypes", () => {
    it("should extract query, mutation, and subscription types", () => {
      const schema = {
        queryType: { name: "Query" },
        mutationType: { name: "Mutation" },
        subscriptionType: { name: "Subscription" },
        types: [
          {
            kind: "OBJECT",
            name: "Query",
            fields: [
              {
                name: "user",
                args: [],
                type: { kind: "OBJECT", name: "User" },
                isDeprecated: false,
              },
            ],
          },
          {
            kind: "OBJECT",
            name: "Mutation",
            fields: [
              {
                name: "createUser",
                args: [],
                type: { kind: "OBJECT", name: "User" },
                isDeprecated: false,
              },
            ],
          },
          {
            kind: "OBJECT",
            name: "Subscription",
            fields: [
              {
                name: "userUpdated",
                args: [],
                type: { kind: "OBJECT", name: "User" },
                isDeprecated: false,
              },
            ],
          },
        ],
        directives: [],
      };

      const result = getRootTypes(schema);

      expect(result.queries).toHaveLength(1);
      expect(result.queries[0].name).toBe("user");
      expect(result.mutations).toHaveLength(1);
      expect(result.mutations[0].name).toBe("createUser");
      expect(result.subscriptions).toHaveLength(1);
      expect(result.subscriptions[0].name).toBe("userUpdated");
    });

    it("should return empty arrays when root types are not defined", () => {
      const schema = {
        types: [],
        directives: [],
      };

      const result = getRootTypes(schema);

      expect(result.queries).toEqual([]);
      expect(result.mutations).toEqual([]);
      expect(result.subscriptions).toEqual([]);
    });
  });

  describe("findTypeByName", () => {
    const schema = {
      types: [
        { kind: "OBJECT", name: "User" },
        { kind: "OBJECT", name: "Post" },
      ],
      directives: [],
    };

    it("should find a type by name", () => {
      const result = findTypeByName(schema, "User");
      expect(result).toBeDefined();
      expect(result!.name).toBe("User");
    });

    it("should return undefined for non-existent type", () => {
      const result = findTypeByName(schema, "NonExistent");
      expect(result).toBeUndefined();
    });
  });

  describe("isBuiltInType", () => {
    it("should return true for scalar types", () => {
      expect(isBuiltInType("String")).toBe(true);
      expect(isBuiltInType("Int")).toBe(true);
      expect(isBuiltInType("Float")).toBe(true);
      expect(isBuiltInType("Boolean")).toBe(true);
      expect(isBuiltInType("ID")).toBe(true);
    });

    it("should return true for introspection types", () => {
      expect(isBuiltInType("__Schema")).toBe(true);
      expect(isBuiltInType("__Type")).toBe(true);
      expect(isBuiltInType("__Field")).toBe(true);
    });

    it("should return false for custom types", () => {
      expect(isBuiltInType("User")).toBe(false);
      expect(isBuiltInType("Post")).toBe(false);
    });
  });

  describe("parseVariables", () => {
    it("should parse valid JSON variables", () => {
      const result = parseVariables('{"id": "123", "name": "Test"}');
      expect(result).toEqual({ id: "123", name: "Test" });
    });

    it("should return empty object for empty string", () => {
      expect(parseVariables("")).toEqual({});
      expect(parseVariables("   ")).toEqual({});
    });

    it("should throw error for invalid JSON", () => {
      expect(() => parseVariables("{invalid}")).toThrow("Invalid variables JSON");
    });
  });

  describe("detectOperationType", () => {
    it("should detect query operation", () => {
      expect(detectOperationType("query GetUser { user { id } }")).toBe("query");
      expect(detectOperationType("{ user { id } }")).toBe("query");
    });

    it("should detect mutation operation", () => {
      expect(detectOperationType("mutation CreateUser { createUser { id } }")).toBe(
        "mutation"
      );
    });

    it("should detect subscription operation", () => {
      expect(
        detectOperationType("subscription OnUserUpdate { userUpdated { id } }")
      ).toBe("subscription");
    });

    it("should return null for invalid operation", () => {
      expect(detectOperationType("invalid")).toBe(null);
    });
  });

  describe("extractOperationNames", () => {
    it("should extract operation name from query", () => {
      const result = extractOperationNames("query GetUser { user { id } }");
      expect(result).toEqual(["GetUser"]);
    });

    it("should extract multiple operation names", () => {
      const result = extractOperationNames(`
        query GetUser { user { id } }
        query GetPost { post { id } }
      `);
      expect(result).toEqual(["GetUser", "GetPost"]);
    });

    it("should extract mutation names", () => {
      const result = extractOperationNames(
        "mutation CreateUser { createUser { id } }"
      );
      expect(result).toEqual(["CreateUser"]);
    });

    it("should extract subscription names", () => {
      const result = extractOperationNames(
        "subscription OnUserUpdate { userUpdated { id } }"
      );
      expect(result).toEqual(["OnUserUpdate"]);
    });

    it("should return empty array for anonymous operations", () => {
      const result = extractOperationNames("{ user { id } }");
      expect(result).toEqual([]);
    });
  });

  describe("GraphQLWebSocketClient", () => {
    let mockWebSocket: any;

    beforeEach(() => {
      // Mock WebSocket
      mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1, // OPEN state
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      // Proper WebSocket mock with constants
      const MockWebSocket = jest.fn().mockImplementation(() => mockWebSocket) as any;
      MockWebSocket.CONNECTING = 0;
      MockWebSocket.OPEN = 1;
      MockWebSocket.CLOSING = 2;
      MockWebSocket.CLOSED = 3;

      global.WebSocket = MockWebSocket;
    });

    it("should create a WebSocket connection", async () => {
      const client = new GraphQLWebSocketClient("ws://localhost:4000/graphql");

      // Start connecting
      const connectPromise = client.connect();

      // Trigger onopen
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({});
      }

      // Trigger connection_ack
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({ type: "connection_ack" }),
        });
      }

      await connectPromise;

      expect(global.WebSocket).toHaveBeenCalledWith(
        "ws://localhost:4000/graphql",
        "graphql-transport-ws"
      );
    });

    it("should send connection_init on connect", async () => {
      const client = new GraphQLWebSocketClient("ws://localhost:4000/graphql");

      // Simulate connection open
      const connectPromise = client.connect();

      // Trigger onopen
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({});
      }

      // Trigger connection_ack
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({ type: "connection_ack" }),
        });
      }

      await connectPromise;

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "connection_init", payload: {} })
      );
    });

    it("should handle connection params", () => {
      const connectionParams = { Authorization: "Bearer test-token" };
      const client = new GraphQLWebSocketClient(
        "ws://localhost:4000/graphql",
        connectionParams
      );

      expect(client).toBeDefined();
    });

    it("should close WebSocket connection", async () => {
      const client = new GraphQLWebSocketClient("ws://localhost:4000/graphql");

      // Start connecting
      const connectPromise = client.connect();

      // Trigger onopen
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({});
      }

      // Trigger connection_ack
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({ type: "connection_ack" }),
        });
      }

      await connectPromise;

      // Now close the connection
      client.close();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });
});
