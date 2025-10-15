import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { GraphQLTablet } from "../GraphQLTablet";
import { SensitiveDataManager } from "../../../utils/sensitiveDataManager";

// Mock @monaco-editor/react
jest.mock("@monaco-editor/react", () => ({
  Editor: ({ value, onChange }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// Mock crypto.randomUUID
const mockUUID = "12345678-1234-1234-1234-123456789abc" as `${string}-${string}-${string}-${string}-${string}`;
global.crypto = {
  ...global.crypto,
  randomUUID: () => mockUUID,
};

describe("GraphQLTablet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Tablet Interface", () => {
    it("should have correct metadata", () => {
      expect(GraphQLTablet.id).toBe("graphql");
      expect(GraphQLTablet.label).toBe("GraphQL Client");
      expect(GraphQLTablet.keywords).toContain("graphql");
      expect(GraphQLTablet.keywords).toContain("api");
      expect(GraphQLTablet.keywords).toContain("query");
      expect(GraphQLTablet.keywords).toContain("mutation");
      expect(GraphQLTablet.keywords).toContain("subscription");
    });

    it("should create initial state", () => {
      const state = GraphQLTablet.createInitialState();
      expect(state.type).toBe("graphql");
      expect(state.data).toHaveProperty("endpoint");
      expect(state.data).toHaveProperty("query");
      expect(state.data).toHaveProperty("variables");
      expect(state.data).toHaveProperty("headers");
      expect(state.data).toHaveProperty("response");
      expect(state.data).toHaveProperty("schema");
      expect(state.data.isExecuting).toBe(false);
      expect(state.data.isLoadingSchema).toBe(false);
    });

    it("should have masked authorization header in initial state", () => {
      const state = GraphQLTablet.createInitialState();
      const authHeader = state.data.headers.find(
        (h: any) => h.key === "Authorization"
      );
      expect(authHeader).toBeDefined();
      expect(SensitiveDataManager.isMasked(authHeader!.value)).toBe(true);
    });

    it("should serialize state to JSON", () => {
      const state = GraphQLTablet.createInitialState();
      const serialized = GraphQLTablet.serializeState(state);
      expect(typeof serialized).toBe("string");
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it("should deserialize state from JSON", () => {
      const state = GraphQLTablet.createInitialState();
      const serialized = GraphQLTablet.serializeState(state);
      const deserialized = GraphQLTablet.deserializeState(serialized);
      expect(deserialized.type).toBe("graphql");
      expect(deserialized.data).toBeDefined();
    });

    it("should migrate sensitive data during deserialization", () => {
      const oldState = {
        type: "graphql",
        data: {
          ...GraphQLTablet.createInitialState().data,
          headers: [
            { key: "Authorization", value: "Bearer plain-text-token", enabled: true },
          ],
        },
      };
      const serialized = JSON.stringify(oldState);
      const deserialized = GraphQLTablet.deserializeState(serialized);
      const authHeader = deserialized.data.headers.find(
        (h: any) => h.key === "Authorization"
      );
      expect(SensitiveDataManager.isMasked(authHeader!.value)).toBe(true);
    });

    it("should return initial state if deserialization fails", () => {
      const deserialized = GraphQLTablet.deserializeState("invalid json");
      expect(deserialized.type).toBe("graphql");
      expect(deserialized.data).toBeDefined();
    });
  });

  describe("Rendering", () => {
    it("should render the GraphQL Client header", () => {
      const state = GraphQLTablet.createInitialState();
      const onChange = jest.fn();
      render(GraphQLTablet.render(state, onChange));
      expect(screen.getByText("GraphQL Client")).toBeInTheDocument();
    });

    it("should show CORS warning message", () => {
      const state = GraphQLTablet.createInitialState();
      const onChange = jest.fn();
      render(GraphQLTablet.render(state, onChange));
      expect(
        screen.getByText(/Browser CORS limitations may apply/i)
      ).toBeInTheDocument();
    });

    it("should render Load Schema button", () => {
      const state = GraphQLTablet.createInitialState();
      const onChange = jest.fn();
      render(GraphQLTablet.render(state, onChange));
      expect(screen.getByText("Load Schema")).toBeInTheDocument();
    });

    it("should render endpoint input field", () => {
      const state = GraphQLTablet.createInitialState();
      state.data.endpoint = "https://api.example.com/graphql";
      const onChange = jest.fn();
      render(GraphQLTablet.render(state, onChange));
      const input = screen.getByPlaceholderText("https://api.example.com/graphql") as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe("https://api.example.com/graphql");
    });

    it("should render Query tab", () => {
      const state = GraphQLTablet.createInitialState();
      const onChange = jest.fn();
      render(GraphQLTablet.render(state, onChange));
      expect(screen.getByText("Query")).toBeInTheDocument();
    });

    it("should render Variables tab", () => {
      const state = GraphQLTablet.createInitialState();
      const onChange = jest.fn();
      render(GraphQLTablet.render(state, onChange));
      expect(screen.getByText("Variables")).toBeInTheDocument();
    });

    it("should render Headers tab", () => {
      const state = GraphQLTablet.createInitialState();
      const onChange = jest.fn();
      render(GraphQLTablet.render(state, onChange));
      expect(screen.getByText("Headers")).toBeInTheDocument();
    });

    it("should render Execute button", () => {
      const state = GraphQLTablet.createInitialState();
      const onChange = jest.fn();
      render(GraphQLTablet.render(state, onChange));
      // Button text will be "Execute Query"
      expect(screen.getByRole("button", { name: /Execute Query/i })).toBeInTheDocument();
    });
  });

  describe("State Management", () => {
    it("should preserve endpoint in state", () => {
      const state = GraphQLTablet.createInitialState();
      state.data.endpoint = "https://graphql.example.com";

      const serialized = GraphQLTablet.serializeState(state);
      const deserialized = GraphQLTablet.deserializeState(serialized);

      expect(deserialized.data.endpoint).toBe("https://graphql.example.com");
    });

    it("should preserve query in state", () => {
      const state = GraphQLTablet.createInitialState();
      state.data.query = "query { users { id name } }";

      const serialized = GraphQLTablet.serializeState(state);
      const deserialized = GraphQLTablet.deserializeState(serialized);

      expect(deserialized.data.query).toBe("query { users { id name } }");
    });

    it("should preserve variables in state", () => {
      const state = GraphQLTablet.createInitialState();
      state.data.variables = '{"id": "123"}';

      const serialized = GraphQLTablet.serializeState(state);
      const deserialized = GraphQLTablet.deserializeState(serialized);

      expect(deserialized.data.variables).toBe('{"id": "123"}');
    });

    it("should handle malformed state gracefully", () => {
      const result = GraphQLTablet.deserializeState('{"type":"wrong"}');
      expect(result).toEqual(GraphQLTablet.createInitialState());
    });

    it("should handle empty JSON gracefully", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const result = GraphQLTablet.deserializeState("{}");
      expect(result).toEqual(GraphQLTablet.createInitialState());
      consoleSpy.mockRestore();
    });
  });

  describe("Security", () => {
    it("should mask sensitive header values", () => {
      const state = GraphQLTablet.createInitialState();
      const authHeader = state.data.headers[0];

      expect(authHeader.key).toBe("Authorization");
      expect(SensitiveDataManager.isMasked(authHeader.value)).toBe(true);
    });

    it("should unmask and remask on deserialization", () => {
      const state = GraphQLTablet.createInitialState();
      state.data.headers = [
        { key: "Authorization", value: "Bearer plain-token", enabled: true },
        { key: "X-API-Key", value: "secret-key", enabled: true },
      ];

      const serialized = GraphQLTablet.serializeState(state);
      const deserialized = GraphQLTablet.deserializeState(serialized);

      deserialized.data.headers.forEach((header: any) => {
        if (["Authorization", "X-API-Key"].includes(header.key)) {
          expect(SensitiveDataManager.isMasked(header.value)).toBe(true);
        }
      });
    });

    it("should not mask non-sensitive headers", () => {
      const oldState = {
        type: "graphql",
        data: {
          ...GraphQLTablet.createInitialState().data,
          headers: [
            { key: "Content-Type", value: "application/json", enabled: true },
          ],
        },
      };

      const serialized = JSON.stringify(oldState);
      const deserialized = GraphQLTablet.deserializeState(serialized);

      const contentTypeHeader = deserialized.data.headers.find(
        (h: any) => h.key === "Content-Type"
      );

      expect(contentTypeHeader?.value).toBe("application/json");
      expect(SensitiveDataManager.isMasked(contentTypeHeader!.value)).toBe(false);
    });
  });
});
