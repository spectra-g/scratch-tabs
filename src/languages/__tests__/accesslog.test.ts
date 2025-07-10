import { AccessLogLanguageDetector } from "../accesslog";

describe("AccessLogLanguageDetector", () => {
  let detector: AccessLogLanguageDetector;

  beforeEach(() => {
    detector = new AccessLogLanguageDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("accesslog");
      expect(detector.name).toBe("Access Log");
      expect(detector.extensions).toEqual([
        "log",
        "access",
        "access.log",
        "error.log",
      ]);
      expect(detector.priority).toBe(5);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("log");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid access log sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("GET");
      expect(sample).toContain("POST");
      expect(sample).toContain("200");
      expect(sample).toContain("HTTP/1.1");
      expect(sample).toContain("[");
      expect(sample).toContain("]");

      // Should have multiple lines
      const lines = sample.split("\n").filter((line) => line.trim());
      expect(lines.length).toBeGreaterThan(3);

      // Should contain IP addresses
      expect(sample).toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
    });
  });

  describe("Detection", () => {
    test("should detect Apache Common Log Format", () => {
      const content = `192.168.1.100 - - [01/Jan/2024:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234
127.0.0.1 - - [01/Jan/2024:10:00:01 +0000] "POST /api/users HTTP/1.1" 201 456
10.0.0.1 - - [01/Jan/2024:10:00:02 +0000] "PUT /api/data/123 HTTP/1.1" 404 0`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.matchedDefinitive).toBe(true);
    });

    test("should detect Apache Combined Log Format", () => {
      const content = `192.168.1.100 - - [01/Jan/2024:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234 "https://example.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
10.0.0.1 - admin [01/Jan/2024:10:00:01 +0000] "POST /api/users HTTP/1.1" 201 456 "https://example.com/signup" "Mozilla/5.0"`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect Nginx access logs", () => {
      const content = `203.0.113.195 - - [01/Jan/2024:10:00:00 +0000] "GET /assets/styles.css HTTP/1.1" 200 8842 "https://www.example.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
192.168.1.50 - - [01/Jan/2024:10:00:01 +0000] "GET /favicon.ico HTTP/1.1" 404 0 "-" "curl/7.68.0"`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should detect error logs", () => {
      const content = `[2024-01-01 10:00:00] [error] [client 192.168.1.50] File does not exist: /var/www/favicon.ico
[2024-01-01 10:00:01] [warn] [client 10.0.0.1] Request timeout exceeded
[2024-01-01 10:00:02] [info] [client 127.0.0.1] Connection established`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should detect logs with various HTTP methods", () => {
      const content = `192.168.1.100 - - [01/Jan/2024:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234
192.168.1.100 - - [01/Jan/2024:10:00:01 +0000] "POST /api/data HTTP/1.1" 201 456
192.168.1.100 - - [01/Jan/2024:10:00:02 +0000] "PUT /api/users/123 HTTP/1.1" 200 789
192.168.1.100 - - [01/Jan/2024:10:00:03 +0000] "DELETE /api/users/123 HTTP/1.1" 204 0
192.168.1.100 - - [01/Jan/2024:10:00:04 +0000] "HEAD /health HTTP/1.1" 200 0
192.168.1.100 - - [01/Jan/2024:10:00:05 +0000] "OPTIONS /api HTTP/1.1" 200 0`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect logs with various HTTP status codes", () => {
      const content = `192.168.1.100 - - [01/Jan/2024:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234
192.168.1.100 - - [01/Jan/2024:10:00:01 +0000] "GET /not-found HTTP/1.1" 404 0
192.168.1.100 - - [01/Jan/2024:10:00:02 +0000] "POST /api/error HTTP/1.1" 500 123
192.168.1.100 - - [01/Jan/2024:10:00:03 +0000] "GET /redirect HTTP/1.1" 301 0`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect logs with user agents", () => {
      const content = `192.168.1.100 - - [01/Jan/2024:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
10.0.0.1 - - [01/Jan/2024:10:00:01 +0000] "GET /api/data HTTP/1.1" 200 456 "-" "curl/7.68.0"
203.0.113.195 - - [01/Jan/2024:10:00:02 +0000] "GET /test HTTP/1.1" 200 789 "-" "wget/1.20.3"`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should reject HTML content", () => {
      const content = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <p>This is HTML, not access logs</p>
</body>
</html>`;
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should reject JavaScript content", () => {
      const content = `function processLogs() {
  const logs = [
    { ip: "192.168.1.1", method: "GET", status: 200 },
    { ip: "10.0.0.1", method: "POST", status: 201 }
  ];
  return logs;
}`;
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should reject JSON content", () => {
      const content = `{
  "logs": [
    {
      "ip": "192.168.1.1",
      "method": "GET",
      "status": 200,
      "timestamp": "2024-01-01T10:00:00Z"
    }
  ]
}`;
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should handle mixed log formats", () => {
      const content = `192.168.1.100 - - [01/Jan/2024:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234
[2024-01-01 10:00:01] [error] [client 10.0.0.1] Connection timeout
203.0.113.195 - - [01/Jan/2024:10:00:02 +0000] "POST /api/data HTTP/1.1" 201 456`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should handle logs with referrers", () => {
      const content = `192.168.1.100 - - [01/Jan/2024:10:00:00 +0000] "GET /page.html HTTP/1.1" 200 1234 "https://google.com/" "Mozilla/5.0"
10.0.0.1 - - [01/Jan/2024:10:00:01 +0000] "GET /image.jpg HTTP/1.1" 200 456 "https://example.com/page" "Mozilla/5.0"`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should handle empty content", () => {
      const result = detector.detect("");
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should handle very short content", () => {
      const result = detector.detect("test");
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should detect logs with different IP formats", () => {
      const content = `192.168.1.100 - - [01/Jan/2024:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234
10.0.0.1 - - [01/Jan/2024:10:00:01 +0000] "POST /api HTTP/1.1" 201 456
127.0.0.1 - - [01/Jan/2024:10:00:02 +0000] "GET /health HTTP/1.1" 200 0
172.16.0.5 - - [01/Jan/2024:10:00:03 +0000] "PUT /data HTTP/1.1" 200 789`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect logs with various log levels", () => {
      const content = `[2024-01-01 10:00:00] [error] [client 192.168.1.50] Database connection failed
[2024-01-01 10:00:01] [warn] [client 10.0.0.1] High memory usage detected  
[2024-01-01 10:00:02] [info] [client 127.0.0.1] User login successful
[2024-01-01 10:00:03] [debug] [client 172.16.0.1] Processing request
[2024-01-01 10:00:04] [crit] [client 203.0.113.1] System overload`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should handle logs with missing fields", () => {
      const content = `192.168.1.100 - - [01/Jan/2024:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 -
10.0.0.1 - - [01/Jan/2024:10:00:01 +0000] "POST /api HTTP/1.1" 404 0
- - - [01/Jan/2024:10:00:02 +0000] "HEAD /health HTTP/1.1" 200 0`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });
  });

  describe("Monaco Provider Registration", () => {
    test("should register monaco provider without errors", () => {
      const mockMonaco = {
        languages: {
          register: jest.fn(),
          setLanguageConfiguration: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
          registerDocumentFormattingEditProvider: jest.fn(),
          registerCompletionItemProvider: jest.fn(),
          CompletionItemKind: {
            Snippet: 1,
          },
          CompletionItemInsertTextRule: {
            InsertAsSnippet: 1,
          },
        },
        editor: {
          defineTheme: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();

      expect(mockMonaco.languages.register).toHaveBeenCalledWith({
        id: "accesslog",
      });
      expect(
        mockMonaco.languages.setLanguageConfiguration,
      ).toHaveBeenCalledWith("accesslog", expect.any(Object));
      expect(
        mockMonaco.languages.setMonarchTokensProvider,
      ).toHaveBeenCalledWith("accesslog", expect.any(Object));
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
        "accesslog-dark",
        expect.any(Object),
      );
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
        "accesslog-light",
        expect.any(Object),
      );
      expect(
        mockMonaco.languages.registerDocumentFormattingEditProvider,
      ).toHaveBeenCalledWith("accesslog", expect.any(Object));
      expect(
        mockMonaco.languages.registerCompletionItemProvider,
      ).toHaveBeenCalledWith("accesslog", expect.any(Object));
    });
  });
});
