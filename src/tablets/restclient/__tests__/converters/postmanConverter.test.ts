import { describe, it, expect } from "@jest/globals";
import { postmanConverter, requestToPostman } from "../../converters/postmanConverter";
import { HttpRequest } from "../../types";

describe("postmanConverter", () => {
  describe("requestToPostman", () => {
    it("should convert basic GET request", () => {
      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/test",
        headers: [],
        auth: { type: "none", params: {} },
        params: [],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.info.name).toBe("Exported Collection");
      expect(parsed.item).toHaveLength(1);
      expect(parsed.item[0].name).toBe("GET https://api.example.com/test");
      expect(parsed.item[0].request.method).toBe("GET");
      expect(parsed.item[0].request.url.raw).toBe("https://api.example.com/test");
      expect(parsed.item[0].request.url.protocol).toBe("https");
      expect(parsed.item[0].request.url.host).toEqual(["api", "example", "com"]);
      expect(parsed.item[0].request.url.path).toEqual(["test"]);
    });

    it("should convert POST request with JSON body", () => {
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
          content: '{"name":"John","age":30}',
          format: "json",
          params: [],
        },
        variables: [],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.item[0].request.method).toBe("POST");
      expect(parsed.item[0].request.body.mode).toBe("raw");
      expect(parsed.item[0].request.body.raw).toBe('{"name":"John","age":30}');
      expect(parsed.item[0].request.body.options.raw.language).toBe("json");
      expect(parsed.item[0].request.header).toHaveLength(1);
      expect(parsed.item[0].request.header[0]).toEqual({
        key: "Content-Type",
        value: "application/json",
        disabled: false,
      });
    });

    it("should handle query parameters", () => {
      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/search",
        headers: [],
        auth: { type: "none", params: {} },
        params: [
          { key: "q", value: "test", enabled: true },
          { key: "page", value: "1", enabled: true },
        ],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.item[0].request.url.query).toHaveLength(2);
      expect(parsed.item[0].request.url.query[0]).toEqual({
        key: "q",
        value: "test",
        disabled: false,
      });
      expect(parsed.item[0].request.url.query[1]).toEqual({
        key: "page",
        value: "1",
        disabled: false,
      });
    });

    it("should handle basic authentication", () => {
      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/protected",
        headers: [],
        auth: {
          type: "basic",
          params: { username: "user", password: "pass" },
        },
        params: [],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.item[0].request.auth.type).toBe("basic");
      expect(parsed.item[0].request.auth.basic).toHaveLength(2);
      expect(parsed.item[0].request.auth.basic[0]).toEqual({
        key: "username",
        value: "user",
        type: "string",
      });
      expect(parsed.item[0].request.auth.basic[1]).toEqual({
        key: "password",
        value: "pass",
        type: "string",
      });
    });

    it("should handle bearer token authentication", () => {
      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/protected",
        headers: [],
        auth: {
          type: "bearer",
          params: { token: "secret-token" },
        },
        params: [],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.item[0].request.auth.type).toBe("bearer");
      expect(parsed.item[0].request.auth.bearer).toHaveLength(1);
      expect(parsed.item[0].request.auth.bearer[0]).toEqual({
        key: "token",
        value: "secret-token",
        type: "string",
      });
    });

    it("should handle API key authentication", () => {
      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/protected",
        headers: [],
        auth: {
          type: "apikey",
          params: { key: "X-API-Key", value: "secret-key", addTo: "header" },
        },
        params: [],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.item[0].request.auth.type).toBe("apikey");
      expect(parsed.item[0].request.auth.apikey).toHaveLength(3);
      expect(parsed.item[0].request.auth.apikey[0]).toEqual({
        key: "key",
        value: "X-API-Key",
        type: "string",
      });
      expect(parsed.item[0].request.auth.apikey[1]).toEqual({
        key: "value",
        value: "secret-key",
        type: "string",
      });
      expect(parsed.item[0].request.auth.apikey[2]).toEqual({
        key: "in",
        value: "header",
        type: "string",
      });
    });

    it("should handle form-data body", () => {
      const request: HttpRequest = {
        method: "POST",
        url: "https://api.example.com/upload",
        headers: [],
        auth: { type: "none", params: {} },
        params: [],
        body: {
          type: "form-data",
          content: "",
          params: [
            { key: "file", value: "data.csv", enabled: true },
            { key: "description", value: "Test file", enabled: true },
          ],
        },
        variables: [],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.item[0].request.body.mode).toBe("formdata");
      expect(parsed.item[0].request.body.formdata).toHaveLength(2);
      expect(parsed.item[0].request.body.formdata[0]).toEqual({
        key: "file",
        value: "data.csv",
        type: "text",
        disabled: false,
      });
      expect(parsed.item[0].request.body.formdata[1]).toEqual({
        key: "description",
        value: "Test file",
        type: "text",
        disabled: false,
      });
    });

    it("should handle x-www-form-urlencoded body", () => {
      const request: HttpRequest = {
        method: "POST",
        url: "https://api.example.com/submit",
        headers: [],
        auth: { type: "none", params: {} },
        params: [],
        body: {
          type: "x-www-form-urlencoded",
          content: "",
          params: [
            { key: "name", value: "John", enabled: true },
            { key: "email", value: "john@example.com", enabled: true },
          ],
        },
        variables: [],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.item[0].request.body.mode).toBe("urlencoded");
      expect(parsed.item[0].request.body.urlencoded).toHaveLength(2);
      expect(parsed.item[0].request.body.urlencoded[0]).toEqual({
        key: "name",
        value: "John",
        disabled: false,
      });
      expect(parsed.item[0].request.body.urlencoded[1]).toEqual({
        key: "email",
        value: "john@example.com",
        disabled: false,
      });
    });

    it("should handle variables in parameters", () => {
      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/users",
        headers: [],
        auth: { type: "none", params: {} },
        params: [
          { key: "token", value: "{{authToken}}", enabled: true },
        ],
        body: { type: "none", content: "", params: [] },
        variables: [
          { key: "authToken", value: "secret-token", enabled: true },
        ],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.item[0].request.url.query[0]).toEqual({
        key: "token",
        value: "secret-token",
        disabled: false,
      });
    });

    it("should handle variables in headers", () => {
      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/users",
        headers: [
          { key: "Authorization", value: "Bearer {{token}}", enabled: true },
        ],
        auth: { type: "none", params: {} },
        params: [],
        body: { type: "none", content: "", params: [] },
        variables: [
          { key: "token", value: "secret-token", enabled: true },
        ],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.item[0].request.header[0]).toEqual({
        key: "Authorization",
        value: "Bearer secret-token",
        disabled: false,
      });
    });

    it("should handle variables in body content", () => {
      const request: HttpRequest = {
        method: "POST",
        url: "https://api.example.com/users",
        headers: [],
        auth: { type: "none", params: {} },
        params: [],
        body: {
          type: "raw",
          content: '{"name":"{{userName}}","age":{{userAge}}}',
          format: "json",
          params: [],
        },
        variables: [
          { key: "userName", value: "John", enabled: true },
          { key: "userAge", value: "30", enabled: true },
        ],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.item[0].request.body.raw).toBe('{"name":"John","age":30}');
    });

    it("should handle different body formats", () => {
      const testCases = [
        {
          format: "json" as const,
          expectedLanguage: "json",
        },
        {
          format: "xml" as const,
          expectedLanguage: "xml",
        },
        {
          format: "html" as const,
          expectedLanguage: "html",
        },
        {
          format: "javascript" as const,
          expectedLanguage: "javascript",
        },
      ];

      testCases.forEach(({ format, expectedLanguage }) => {
        const request: HttpRequest = {
          method: "POST",
          url: "https://api.example.com/test",
          headers: [],
          auth: { type: "none", params: {} },
          params: [],
          body: {
            type: "raw",
            content: "test content",
            format,
            params: [],
          },
          variables: [],
        };

        const result = requestToPostman(request);
        const parsed = JSON.parse(result);

        expect(parsed.item[0].request.body.options.raw.language).toBe(expectedLanguage);
      });
    });

    it("should handle URL with port", () => {
      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com:8080/test",
        headers: [],
        auth: { type: "none", params: {} },
        params: [],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.item[0].request.url.port).toBe("8080");
    });

    it("should handle disabled parameters and headers", () => {
      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/test",
        headers: [
          { key: "Enabled-Header", value: "enabled", enabled: true },
          { key: "Disabled-Header", value: "disabled", enabled: false },
        ],
        auth: { type: "none", params: {} },
        params: [
          { key: "enabled", value: "yes", enabled: true },
          { key: "disabled", value: "no", enabled: false },
        ],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      // Only enabled headers should be included
      expect(parsed.item[0].request.header).toHaveLength(1);
      expect(parsed.item[0].request.header[0].key).toBe("Enabled-Header");

      // Only enabled params should be included
      expect(parsed.item[0].request.url.query).toHaveLength(1);
      expect(parsed.item[0].request.url.query[0].key).toBe("enabled");
    });

    it("should handle complex URL path", () => {
      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/users/123/posts/456",
        headers: [],
        auth: { type: "none", params: {} },
        params: [],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.item[0].request.url.path).toEqual(["users", "123", "posts", "456"]);
    });

    it("should handle no body", () => {
      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/test",
        headers: [],
        auth: { type: "none", params: {} },
        params: [],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      const result = requestToPostman(request);
      const parsed = JSON.parse(result);

      expect(parsed.item[0].request.body).toBeUndefined();
    });
  });

  describe("postmanConverter object", () => {
    it("should have correct properties", () => {
      expect(postmanConverter.id).toBe("postman");
      expect(postmanConverter.name).toBe("Postman Collection");
      expect(typeof postmanConverter.convert).toBe("function");
      expect(postmanConverter.parse).toBeUndefined();
    });

    it("should convert request to Postman collection", () => {
      const request: HttpRequest = {
        method: "GET",
        url: "https://api.example.com/test",
        headers: [],
        auth: { type: "none", params: {} },
        params: [],
        body: { type: "none", content: "", params: [] },
        variables: [],
      };

      const result = postmanConverter.convert(request);
      const parsed = JSON.parse(result);

      expect(parsed.info.name).toBe("Exported Collection");
      expect(parsed.item).toHaveLength(1);
      expect(parsed.item[0].request.method).toBe("GET");
    });
  });
}); 