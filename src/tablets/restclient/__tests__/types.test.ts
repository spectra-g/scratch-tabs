import { describe, it, expect } from "@jest/globals";
import {
  HttpMethod,
  AuthType,
  BodyType,
  RawBodyFormat,
  ExplanationLevel,
  KeyValuePair,
  AuthParams,
  HttpRequestBody,
  HttpRequest,
  HttpResponseTiming,
  HttpResponse,
  ResponseHistoryItem,
  HttpRequestHistoryItem,
  RestClientState,
  RequestConverter,
} from "../types";

describe("REST Client Types", () => {
  describe("HttpMethod", () => {
    it("should include all standard HTTP methods", () => {
      const methods: HttpMethod[] = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "HEAD",
        "OPTIONS",
      ];

      methods.forEach((method) => {
        expect(method).toBeDefined();
      });
    });
  });

  describe("AuthType", () => {
    it("should include all authentication types", () => {
      const authTypes: AuthType[] = ["none", "basic", "bearer", "apikey"];

      authTypes.forEach((type) => {
        expect(type).toBeDefined();
      });
    });
  });

  describe("BodyType", () => {
    it("should include all body types", () => {
      const bodyTypes: BodyType[] = [
        "none",
        "form-data",
        "x-www-form-urlencoded",
        "raw",
        "binary",
      ];

      bodyTypes.forEach((type) => {
        expect(type).toBeDefined();
      });
    });
  });

  describe("RawBodyFormat", () => {
    it("should include all raw body formats", () => {
      const formats: RawBodyFormat[] = [
        "json",
        "xml",
        "html",
        "text",
        "javascript",
      ];

      formats.forEach((format) => {
        expect(format).toBeDefined();
      });
    });
  });

  describe("ExplanationLevel", () => {
    it("should include all explanation levels", () => {
      const levels: ExplanationLevel[] = [
        "simplest",
        "simple",
        "medium",
        "detailed",
        "most-detailed",
      ];

      levels.forEach((level) => {
        expect(level).toBeDefined();
      });
    });
  });

  describe("KeyValuePair", () => {
    it("should have required properties", () => {
      const keyValuePair: KeyValuePair = {
        key: "test-key",
        value: "test-value",
        enabled: true,
      };

      expect(keyValuePair.key).toBe("test-key");
      expect(keyValuePair.value).toBe("test-value");
      expect(keyValuePair.enabled).toBe(true);
    });

    it("should have optional description property", () => {
      const keyValuePair: KeyValuePair = {
        key: "test-key",
        value: "test-value",
        enabled: true,
        description: "Test description",
      };

      expect(keyValuePair.description).toBe("Test description");
    });
  });

  describe("AuthParams", () => {
    it("should be a record of string key-value pairs", () => {
      const authParams: AuthParams = {
        username: "testuser",
        password: "testpass",
        token: "test-token",
      };

      expect(authParams.username).toBe("testuser");
      expect(authParams.password).toBe("testpass");
      expect(authParams.token).toBe("test-token");
    });
  });

  describe("HttpRequestBody", () => {
    it("should have required properties", () => {
      const body: HttpRequestBody = {
        type: "raw",
        content: '{"test": "data"}',
        format: "json",
        params: [],
      };

      expect(body.type).toBe("raw");
      expect(body.content).toBe('{"test": "data"}');
      expect(body.format).toBe("json");
      expect(body.params).toEqual([]);
    });

    it("should have optional format property", () => {
      const body: HttpRequestBody = {
        type: "none",
        content: "",
        params: [],
      };

      expect(body.format).toBeUndefined();
    });
  });

  describe("HttpRequest", () => {
    it("should have all required properties", () => {
      const request: HttpRequest = {
        method: "POST",
        url: "https://api.example.com/test",
        headers: [
          { key: "Content-Type", value: "application/json", enabled: true },
        ],
        auth: {
          type: "bearer",
          params: { token: "test-token" },
        },
        params: [
          { key: "page", value: "1", enabled: true },
        ],
        body: {
          type: "raw",
          content: '{"test": "data"}',
          format: "json",
          params: [],
        },
        variables: [
          { key: "host", value: "api.example.com", enabled: true },
        ],
        curlFlags: ["-k", "--compressed"],
      };

      expect(request.method).toBe("POST");
      expect(request.url).toBe("https://api.example.com/test");
      expect(request.headers).toHaveLength(1);
      expect(request.auth.type).toBe("bearer");
      expect(request.params).toHaveLength(1);
      expect(request.body.type).toBe("raw");
      expect(request.variables).toHaveLength(1);
      expect(request.curlFlags).toEqual(["-k", "--compressed"]);
    });

    it("should have optional curlFlags property", () => {
      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/test",
        headers: [],
        auth: { type: "none", params: {} },
        params: [],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      expect(request.curlFlags).toBeUndefined();
    });
  });

  describe("HttpResponseTiming", () => {
    it("should have all timing properties", () => {
      const timing: HttpResponseTiming = {
        dns: 10,
        connection: 20,
        tls: 30,
        firstByte: 40,
        download: 50,
        total: 150,
      };

      expect(timing.dns).toBe(10);
      expect(timing.connection).toBe(20);
      expect(timing.tls).toBe(30);
      expect(timing.firstByte).toBe(40);
      expect(timing.download).toBe(50);
      expect(timing.total).toBe(150);
    });
  });

  describe("HttpResponse", () => {
    it("should have all required properties", () => {
      const response: HttpResponse = {
        status: 200,
        statusText: "OK",
        headers: {
          "content-type": "application/json",
          "content-length": "123",
        },
        body: '{"success": true}',
        size: 123,
        timing: {
          dns: 10,
          connection: 20,
          tls: 30,
          firstByte: 40,
          download: 50,
          total: 150,
        },
        contentType: "application/json",
      };

      expect(response.status).toBe(200);
      expect(response.statusText).toBe("OK");
      expect(response.headers["content-type"]).toBe("application/json");
      expect(response.body).toBe('{"success": true}');
      expect(response.size).toBe(123);
      expect(response.timing.total).toBe(150);
      expect(response.contentType).toBe("application/json");
    });

    it("should have optional contentType property", () => {
      const response: HttpResponse = {
        status: 404,
        statusText: "Not Found",
        headers: {},
        body: "",
        size: 0,
        timing: {
          dns: 0,
          connection: 0,
          tls: 0,
          firstByte: 0,
          download: 0,
          total: 0,
        },
      };

      expect(response.contentType).toBeUndefined();
    });
  });

  describe("ResponseHistoryItem", () => {
    it("should have all required properties", () => {
      const historyItem: ResponseHistoryItem = {
        id: "history-1",
        timestamp: Date.now(),
        method: "GET",
        url: "https://api.example.com/test",
        status: 200,
        statusText: "OK",
        duration: 150,
        isPinned: false,
        response: {
          status: 200,
          statusText: "OK",
          headers: {},
          body: "",
          size: 0,
          timing: {
            dns: 0,
            connection: 0,
            tls: 0,
            firstByte: 0,
            download: 0,
            total: 0,
          },
        },
      };

      expect(historyItem.id).toBe("history-1");
      expect(historyItem.timestamp).toBeGreaterThan(0);
      expect(historyItem.method).toBe("GET");
      expect(historyItem.url).toBe("https://api.example.com/test");
      expect(historyItem.status).toBe(200);
      expect(historyItem.statusText).toBe("OK");
      expect(historyItem.duration).toBe(150);
      expect(historyItem.isPinned).toBe(false);
      expect(historyItem.response).toBeDefined();
    });
  });

  describe("HttpRequestHistoryItem", () => {
    it("should have all required properties", () => {
      const historyItem: HttpRequestHistoryItem = {
        id: "request-history-1",
        timestamp: Date.now(),
        request: {
          method: "POST",
          url: "https://api.example.com/test",
          headers: [],
          auth: { type: "none", params: {} },
          params: [],
          body: { type: "none", content: "", params: [] },
          variables: [],
        },
        isPinned: false,
      };

      expect(historyItem.id).toBe("request-history-1");
      expect(historyItem.timestamp).toBeGreaterThan(0);
      expect(historyItem.request.method).toBe("POST");
      expect(historyItem.request.url).toBe("https://api.example.com/test");
      expect(historyItem.isPinned).toBe(false);
    });
  });

  describe("RestClientState", () => {
    it("should have all required properties", () => {
      const state: RestClientState = {
        request: {
          method: "GET",
          url: "https://api.example.com/test",
          headers: [],
          auth: { type: "none", params: {} },
          params: [],
          body: { type: "none", content: "", params: [] },
          variables: [],
        },
        response: null,
        responseHistory: [],
        requestHistory: [],
        conversionFormat: "curl",
        explanationLevel: "medium",
        isExecuting: false,
        error: null,
        comparison: {
          isComparing: false,
          selectedItems: [],
          activeComparison: null,
        },
      };

      expect(state.request).toBeDefined();
      expect(state.response).toBeNull();
      expect(state.responseHistory).toEqual([]);
      expect(state.requestHistory).toEqual([]);
      expect(state.conversionFormat).toBe("curl");
      expect(state.explanationLevel).toBe("medium");
      expect(state.isExecuting).toBe(false);
      expect(state.error).toBeNull();
      expect(state.comparison).toBeDefined();
      expect(state.comparison.isComparing).toBe(false);
      expect(state.comparison.selectedItems).toEqual([]);
      expect(state.comparison.activeComparison).toBeNull();
    });
  });

  describe("RequestConverter", () => {
    it("should have required properties", () => {
      const converter: RequestConverter = {
        id: "curl",
        name: "cURL",
        convert: jest.fn(() => "curl command"),
        parse: jest.fn(() => null),
      };

      expect(converter.id).toBe("curl");
      expect(converter.name).toBe("cURL");
      expect(typeof converter.convert).toBe("function");
      expect(typeof converter.parse).toBe("function");
    });

    it("should have optional parse property", () => {
      const converter: RequestConverter = {
        id: "http",
        name: "HTTP",
        convert: jest.fn(() => "http request"),
      };

      expect(converter.parse).toBeUndefined();
    });
  });
}); 