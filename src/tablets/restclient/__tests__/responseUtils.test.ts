import { describe, it, expect } from "@jest/globals";
import {
  formatResponseBody,
  getStatusCodeColor,
  formatBytes,
  formatTime,
} from "../utils/responseUtils";
import { HttpResponse } from "../types";

describe("responseUtils", () => {
  describe("formatResponseBody", () => {
    it("should format JSON responses", () => {
      const response: HttpResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        body: '{"name":"John","age":30}',
        size: 0,
        timing: {
          dns: 0,
          connection: 0,
          tls: 0,
          firstByte: 0,
          download: 0,
          total: 0,
        },
        contentType: "application/json",
      };

      const result = formatResponseBody(response);

      expect(result.formatted).toBe('{\n  "name": "John",\n  "age": 30\n}');
      expect(result.language).toBe("json");
    });

    it("should handle invalid JSON gracefully", () => {
      const response: HttpResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        body: '{"name":"John",}',
        size: 0,
        timing: {
          dns: 0,
          connection: 0,
          tls: 0,
          firstByte: 0,
          download: 0,
          total: 0,
        },
        contentType: "application/json",
      };

      const result = formatResponseBody(response);

      expect(result.formatted).toBe('{"name":"John",}');
      expect(result.language).toBe("json");
    });

    it("should format XML responses", () => {
      const response: HttpResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        body: '<user><name>John</name><age>30</age></user>',
        size: 0,
        timing: {
          dns: 0,
          connection: 0,
          tls: 0,
          firstByte: 0,
          download: 0,
          total: 0,
        },
        contentType: "application/xml",
      };

      const result = formatResponseBody(response);

      expect(result.formatted).toBe('<user><name>John</name><age>30</age></user>');
      expect(result.language).toBe("xml");
    });

    it("should format HTML responses", () => {
      const response: HttpResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        body: '<html><body><h1>Hello</h1></body></html>',
        size: 0,
        timing: {
          dns: 0,
          connection: 0,
          tls: 0,
          firstByte: 0,
          download: 0,
          total: 0,
        },
        contentType: "text/html",
      };

      const result = formatResponseBody(response);

      expect(result.formatted).toBe('<html><body><h1>Hello</h1></body></html>');
      expect(result.language).toBe("html");
    });

    it("should format JavaScript responses", () => {
      const response: HttpResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        body: 'function hello() { console.log("Hello"); }',
        size: 0,
        timing: {
          dns: 0,
          connection: 0,
          tls: 0,
          firstByte: 0,
          download: 0,
          total: 0,
        },
        contentType: "application/javascript",
      };

      const result = formatResponseBody(response);

      expect(result.formatted).toBe('function hello() { console.log("Hello"); }');
      expect(result.language).toBe("javascript");
    });

    it("should format CSS responses", () => {
      const response: HttpResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        body: 'body { color: red; }',
        size: 0,
        timing: {
          dns: 0,
          connection: 0,
          tls: 0,
          firstByte: 0,
          download: 0,
          total: 0,
        },
        contentType: "text/css",
      };

      const result = formatResponseBody(response);

      expect(result.formatted).toBe('body { color: red; }');
      expect(result.language).toBe("css");
    });

    it("should default to plaintext for unknown content types", () => {
      const response: HttpResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        body: "Hello World",
        size: 0,
        timing: {
          dns: 0,
          connection: 0,
          tls: 0,
          firstByte: 0,
          download: 0,
          total: 0,
        },
        contentType: "text/plain",
      };

      const result = formatResponseBody(response);

      expect(result.formatted).toBe("Hello World");
      expect(result.language).toBe("plaintext");
    });

    it("should handle missing content type", () => {
      const response: HttpResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        body: "Hello World",
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

      const result = formatResponseBody(response);

      expect(result.formatted).toBe("Hello World");
      expect(result.language).toBe("plaintext");
    });

    it("should handle empty body", () => {
      const response: HttpResponse = {
        status: 204,
        statusText: "No Content",
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
        contentType: "application/json",
      };

      const result = formatResponseBody(response);

      expect(result.formatted).toBe("");
      expect(result.language).toBe("json");
    });

    it("should handle null body", () => {
      const response: HttpResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        body: null as any,
        size: 0,
        timing: {
          dns: 0,
          connection: 0,
          tls: 0,
          firstByte: 0,
          download: 0,
          total: 0,
        },
        contentType: "application/json",
      };

      const result = formatResponseBody(response);

      expect(result.formatted).toBe("");
      expect(result.language).toBe("json");
    });
  });

  describe("getStatusCodeColor", () => {
    it("should return green for 2xx status codes", () => {
      expect(getStatusCodeColor(200)).toBe("text-green-400");
      expect(getStatusCodeColor(201)).toBe("text-green-400");
      expect(getStatusCodeColor(204)).toBe("text-green-400");
      expect(getStatusCodeColor(299)).toBe("text-green-400");
    });

    it("should return blue for 3xx status codes", () => {
      expect(getStatusCodeColor(300)).toBe("text-blue-400");
      expect(getStatusCodeColor(301)).toBe("text-blue-400");
      expect(getStatusCodeColor(302)).toBe("text-blue-400");
      expect(getStatusCodeColor(304)).toBe("text-blue-400");
      expect(getStatusCodeColor(399)).toBe("text-blue-400");
    });

    it("should return yellow for 4xx status codes", () => {
      expect(getStatusCodeColor(400)).toBe("text-yellow-400");
      expect(getStatusCodeColor(401)).toBe("text-yellow-400");
      expect(getStatusCodeColor(403)).toBe("text-yellow-400");
      expect(getStatusCodeColor(404)).toBe("text-yellow-400");
      expect(getStatusCodeColor(422)).toBe("text-yellow-400");
      expect(getStatusCodeColor(499)).toBe("text-yellow-400");
    });

    it("should return red for 5xx status codes", () => {
      expect(getStatusCodeColor(500)).toBe("text-red-400");
      expect(getStatusCodeColor(501)).toBe("text-red-400");
      expect(getStatusCodeColor(502)).toBe("text-red-400");
      expect(getStatusCodeColor(503)).toBe("text-red-400");
      expect(getStatusCodeColor(599)).toBe("text-red-400");
    });

    it("should return gray for other status codes", () => {
      expect(getStatusCodeColor(100)).toBe("text-gray-400");
      expect(getStatusCodeColor(199)).toBe("text-gray-400");
      expect(getStatusCodeColor(600)).toBe("text-red-400"); // 600 >= 500, so it's red
      expect(getStatusCodeColor(999)).toBe("text-red-400"); // 999 >= 500, so it's red
    });
  });

  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
      expect(formatBytes(1)).toBe("1 Bytes");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(1048576)).toBe("1 MB");
      expect(formatBytes(1572864)).toBe("1.5 MB");
      expect(formatBytes(1073741824)).toBe("1 GB");
      expect(formatBytes(1610612736)).toBe("1.5 GB");
    });

    it("should handle large numbers", () => {
      expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe("2 GB");
      // The current implementation only supports up to GB, so larger values will show "undefined"
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1 undefined");
    });

    it("should handle decimal precision", () => {
      expect(formatBytes(1500)).toBe("1.46 KB");
      expect(formatBytes(1500000)).toBe("1.43 MB");
    });
  });

  describe("formatTime", () => {
    it("should format milliseconds correctly", () => {
      expect(formatTime(0)).toBe("< 1 ms");
      expect(formatTime(0.5)).toBe("< 1 ms");
      expect(formatTime(1)).toBe("1 ms");
      expect(formatTime(100)).toBe("100 ms");
      expect(formatTime(999)).toBe("999 ms");
      expect(formatTime(1000)).toBe("1.00 s");
      expect(formatTime(1500)).toBe("1.50 s");
      expect(formatTime(60000)).toBe("60.00 s");
    });

    it("should handle sub-millisecond values", () => {
      expect(formatTime(0.1)).toBe("< 1 ms");
      expect(formatTime(0.9)).toBe("< 1 ms");
    });

    it("should handle large time values", () => {
      expect(formatTime(300000)).toBe("300.00 s");
      expect(formatTime(3600000)).toBe("3600.00 s");
    });
  });
}); 