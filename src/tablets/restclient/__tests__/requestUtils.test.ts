import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  resolveVariables,
  buildUrl,
  buildHeaders,
  buildBody,
  executeRequest,
  parseUrl,
} from "../utils/requestUtils";
import { HttpRequest, KeyValuePair } from "../types";

// Mock fetch globally
(global as any).fetch = jest.fn() as jest.Mock<any>;

// Mock AbortSignal.timeout for Jest environment
if (!(AbortSignal as any).timeout) {
  (AbortSignal as any).timeout = function mockTimeout() {
    return undefined;
  };
}

describe("requestUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("resolveVariables", () => {
    it("should return empty string for null/undefined input", () => {
      expect(resolveVariables("", [])).toBe("");
      expect(resolveVariables(null as any, [])).toBe(null);
    });

    it("should resolve variables in text", () => {
      const variables: KeyValuePair[] = [
        { key: "host", value: "api.example.com", enabled: true },
        { key: "token", value: "secret-token", enabled: true },
        { key: "disabled", value: "should-not-appear", enabled: false },
      ];

      const text = "https://{{host}}/test?token={{token}}&disabled={{disabled}}";
      const result = resolveVariables(text, variables);

      expect(result).toBe("https://api.example.com/test?token=secret-token&disabled={{disabled}}");
    });

    it("should handle multiple occurrences of the same variable", () => {
      const variables: KeyValuePair[] = [
        { key: "name", value: "John", enabled: true },
      ];

      const text = "Hello {{name}}, how are you {{name}}?";
      const result = resolveVariables(text, variables);

      expect(result).toBe("Hello John, how are you John?");
    });

    it("should handle case-sensitive variable names", () => {
      const variables: KeyValuePair[] = [
        { key: "Name", value: "John", enabled: true },
        { key: "name", value: "Jane", enabled: true },
      ];

      const text = "Hello {{Name}} and {{name}}";
      const result = resolveVariables(text, variables);

      expect(result).toBe("Hello John and Jane");
    });
  });

  describe("buildUrl", () => {
    it("should return base URL when no parameters", () => {
      const url = buildUrl("https://api.example.com/test", [], []);
      expect(url).toBe("https://api.example.com/test");
    });

    it("should add query parameters to URL", () => {
      const params: KeyValuePair[] = [
        { key: "page", value: "1", enabled: true },
        { key: "limit", value: "10", enabled: true },
        { key: "disabled", value: "should-not-appear", enabled: false },
      ];

      const url = buildUrl("https://api.example.com/test", params, []);
      expect(url).toBe("https://api.example.com/test?page=1&limit=10");
    });

    it("should resolve variables in URL and parameters", () => {
      const params: KeyValuePair[] = [
        { key: "token", value: "{{authToken}}", enabled: true },
      ];

      const variables: KeyValuePair[] = [
        { key: "host", value: "api.example.com", enabled: true },
        { key: "authToken", value: "secret-token", enabled: true },
      ];

      const url = buildUrl("https://{{host}}/test", params, variables);
      expect(url).toBe("https://api.example.com/test?token=secret-token");
    });

    it("should handle URLs without protocol", () => {
      const params: KeyValuePair[] = [
        { key: "test", value: "value", enabled: true },
      ];

      const url = buildUrl("api.example.com/test", params, []);
      expect(url).toBe("http://api.example.com/test?test=value");
    });
  });

  describe("buildHeaders", () => {
    it("should build headers from key-value pairs", () => {
      const headers: KeyValuePair[] = [
        { key: "Content-Type", value: "application/json", enabled: true },
        { key: "User-Agent", value: "TestClient", enabled: true },
        { key: "Disabled", value: "should-not-appear", enabled: false },
      ];

      const auth = { type: "none" as const, params: {} };
      const variables: KeyValuePair[] = [];

      const result = buildHeaders(headers, auth, variables);

      expect(result).toEqual({
        "Content-Type": "application/json",
        "User-Agent": "TestClient",
      });
    });

    it("should add Basic auth header", () => {
      const headers: KeyValuePair[] = [];
      const auth = {
        type: "basic" as const,
        params: { username: "user", password: "pass" },
      };
      const variables: KeyValuePair[] = [];

      const result = buildHeaders(headers, auth, variables);

      expect(result.Authorization).toBe("Basic dXNlcjpwYXNz");
    });

    it("should add Bearer auth header", () => {
      const headers: KeyValuePair[] = [];
      const auth = {
        type: "bearer" as const,
        params: { token: "secret-token" },
      };
      const variables: KeyValuePair[] = [];

      const result = buildHeaders(headers, auth, variables);

      expect(result.Authorization).toBe("Bearer secret-token");
    });

    it("should add API key to header", () => {
      const headers: KeyValuePair[] = [];
      const auth = {
        type: "apikey" as const,
        params: { key: "X-API-Key", value: "secret-key", addTo: "header" },
      };
      const variables: KeyValuePair[] = [];

      const result = buildHeaders(headers, auth, variables);

      expect(result["X-API-Key"]).toBe("secret-key");
    });

    it("should resolve variables in headers and auth", () => {
      const headers: KeyValuePair[] = [
        { key: "X-Custom", value: "{{customValue}}", enabled: true },
      ];
      const auth = {
        type: "bearer" as const,
        params: { token: "{{authToken}}" },
      };
      const variables: KeyValuePair[] = [
        { key: "customValue", value: "resolved-value", enabled: true },
        { key: "authToken", value: "resolved-token", enabled: true },
      ];

      const result = buildHeaders(headers, auth, variables);

      expect(result["X-Custom"]).toBe("resolved-value");
      expect(result.Authorization).toBe("Bearer resolved-token");
    });
  });

  describe("buildBody", () => {
    it("should return null for none body type", () => {
      const body = { type: "none" as const, content: "", params: [] };
      const variables: KeyValuePair[] = [];

      const result = buildBody(body, variables);

      expect(result).toBeNull();
    });

    it("should return raw content for raw body type", () => {
      const body = {
        type: "raw" as const,
        content: '{"test": "data"}',
        params: [],
      };
      const variables: KeyValuePair[] = [];

      const result = buildBody(body, variables);

      expect(result).toBe('{"test": "data"}');
    });

    it("should resolve variables in raw content", () => {
      const body = {
        type: "raw" as const,
        content: '{"user": "{{username}}", "token": "{{token}}"}',
        params: [],
      };
      const variables: KeyValuePair[] = [
        { key: "username", value: "john", enabled: true },
        { key: "token", value: "secret", enabled: true },
      ];

      const result = buildBody(body, variables);

      expect(result).toBe('{"user": "john", "token": "secret"}');
    });

    it("should build URLSearchParams for x-www-form-urlencoded", () => {
      const body = {
        type: "x-www-form-urlencoded" as const,
        content: "",
        params: [
          { key: "name", value: "John", enabled: true },
          { key: "email", value: "john@example.com", enabled: true },
          { key: "disabled", value: "should-not-appear", enabled: false },
        ],
      };
      const variables: KeyValuePair[] = [];

      const result = buildBody(body, variables);

      expect(result).toBeInstanceOf(URLSearchParams);
      expect((result as URLSearchParams).get("name")).toBe("John");
      expect((result as URLSearchParams).get("email")).toBe("john@example.com");
      expect((result as URLSearchParams).get("disabled")).toBeNull();
    });

    it("should build FormData for form-data", () => {
      const body = {
        type: "form-data" as const,
        content: "",
        params: [
          { key: "file", value: "data.csv", enabled: true },
          { key: "description", value: "Test file", enabled: true },
        ],
      };
      const variables: KeyValuePair[] = [];

      const result = buildBody(body, variables);

      expect(result).toBeInstanceOf(FormData);
      expect((result as FormData).get("file")).toBe("data.csv");
      expect((result as FormData).get("description")).toBe("Test file");
    });

    it("should resolve variables in form parameters", () => {
      const body = {
        type: "form-data" as const,
        content: "",
        params: [
          { key: "user", value: "{{username}}", enabled: true },
        ],
      };
      const variables: KeyValuePair[] = [
        { key: "username", value: "john", enabled: true },
      ];

      const result = buildBody(body, variables);

      expect((result as FormData).get("user")).toBe("john");
    });
  });

  describe("executeRequest", () => {
    beforeEach(() => {
      // Reset fetch mock
      ((global as any).fetch as jest.Mock).mockClear();
    });

    it("should execute a successful GET request", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: {
          forEach: (cb: (value: string, key: string) => void) => {
            cb("application/json", "content-type");
          },
          get: (key: string) => (key === "content-type" ? "application/json" : undefined),
        },
        // @ts-expect-error
        text: jest.fn().mockResolvedValue('{"success": true}') as jest.Mock<any>,
      };

      // @ts-expect-error
      ((global as any).fetch as jest.Mock).mockResolvedValue(mockResponse as any);

      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/test",
        headers: [],
        auth: { type: "none", params: {} },
        params: [],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      const result = await executeRequest(request);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "GET",
          headers: {},
        })
      );

      expect(result.status).toBe(200);
      expect(result.statusText).toBe("OK");
      expect(result.body).toBe('{"success": true}');
      expect(result.timing.total).toBeGreaterThan(0);
    });

    it("should execute a POST request with body", async () => {
      const mockResponse = {
        status: 201,
        statusText: "Created",
        headers: {
          forEach: (cb: (value: string, key: string) => void) => {
            cb("application/json", "content-type");
          },
          get: (key: string) => (key === "content-type" ? "application/json" : undefined),
        },
        // @ts-expect-error
        text: jest.fn().mockResolvedValue('{"id": 123}') as jest.Mock<any>,
      };

      // @ts-expect-error
      ((global as any).fetch as jest.Mock).mockResolvedValue(mockResponse as any);

      const request: HttpRequest = {
        method: "POST",
        url: "https://api.example.com/users",
        headers: [
          { key: "Content-Type", value: "application/json", enabled: true },
        ],
        auth: { type: "none", params: {} },
        params: [],
        body: {
          type: "raw",
          content: '{"name": "John", "email": "john@example.com"}',
          params: [],
        },
        variables: [],
      };

      const result = await executeRequest(request);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/users",
        expect.objectContaining({
          method: "POST",
          body: '{"name": "John", "email": "john@example.com"}',
        })
      );

      expect(result.status).toBe(201);
      expect(result.body).toBe('{"id": 123}');
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      // @ts-expect-error
      ((global as any).fetch as jest.Mock).mockRejectedValue(networkError as any);

      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/test",
        headers: [],
        auth: { type: "none", params: {} },
        params: [],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      await expect(executeRequest(request)).rejects.toThrow("Request failed");
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("Timeout");
      timeoutError.name = "AbortError";
      // @ts-expect-error
      ((global as any).fetch as jest.Mock).mockRejectedValue(timeoutError as any);

      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/test",
        headers: [],
        auth: { type: "none", params: {} },
        params: [],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      await expect(executeRequest(request)).rejects.toThrow("Request failed");
    });

    it("should resolve variables in request", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: {
          forEach: (_cb: (value: string, key: string) => void) => {},
          get: (_key: string) => undefined,
        },
        // @ts-expect-error
        text: jest.fn().mockResolvedValue("OK") as jest.Mock<any>,
      };

      // @ts-expect-error
      ((global as any).fetch as jest.Mock).mockResolvedValue(mockResponse as any);

      const request: HttpRequest = {
        method: "GET",
        url: "https://{{host}}/{{endpoint}}",
        headers: [
          { key: "Authorization", value: "Bearer {{token}}", enabled: true },
        ],
        auth: { type: "none", params: {} },
        params: [
          { key: "user", value: "{{username}}", enabled: true },
        ],
        body: { type: "none", content: "", params: [] },
        variables: [
          { key: "host", value: "api.example.com", enabled: true },
          { key: "endpoint", value: "users", enabled: true },
          { key: "token", value: "secret-token", enabled: true },
          { key: "username", value: "john", enabled: true },
        ],
      };

      await executeRequest(request);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/users?user=john",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer secret-token",
          }),
        })
      );
    });
  });

  describe("parseUrl", () => {
    it("should parse URL with query parameters", () => {
      const url = "https://api.example.com/test?page=1&limit=10&sort=name";

      const result = parseUrl(url);

      expect(result.baseUrl).toBe("https://api.example.com/test");
      expect(result.params).toHaveLength(3);
      expect(result.params).toEqual(
        expect.arrayContaining([
          { key: "page", value: "1", enabled: true },
          { key: "limit", value: "10", enabled: true },
          { key: "sort", value: "name", enabled: true },
        ])
      );
    });

    it("should handle URL without query parameters", () => {
      const url = "https://api.example.com/test";

      const result = parseUrl(url);

      expect(result.baseUrl).toBe("https://api.example.com/test");
      expect(result.params).toEqual([]);
    });

    it("should handle URL without protocol", () => {
      const url = "api.example.com/test?param=value";

      const result = parseUrl(url);

      expect(result.baseUrl).toBe("api.example.com/test");
      expect(result.params).toHaveLength(1);
      expect(result.params[0]).toEqual({
        key: "param",
        value: "value",
        enabled: true,
      });
    });

    it("should handle invalid URL gracefully", () => {
      const url = "not-a-valid-url";

      const result = parseUrl(url);

      expect(result.baseUrl).toBe("not-a-valid-url");
      expect(result.params).toEqual([]);
    });

    it("should handle empty URL", () => {
      const url = "";

      const result = parseUrl(url);

      expect(result.baseUrl).toBe("");
      expect(result.params).toEqual([]);
    });
  });
}); 