import { HarFormatDetector } from "../har";

describe("HarFormatDetector", () => {
  let detector: HarFormatDetector;

  beforeEach(() => {
    detector = new HarFormatDetector();
  });

  describe("basic properties", () => {
    it("has correct id, name, extension", () => {
      expect(detector.id).toBe("har");
      expect(detector.name).toBe("HAR");
      expect(detector.extensions).toContain("har");
      expect(detector.getFileExtension()).toBe("har");
    });

    it("has higher priority than generic JSON", () => {
      expect(detector.priority).toBeGreaterThan(8);
    });
  });

  describe("sampleContent", () => {
    it("produces valid JSON that detects as HAR", () => {
      const sample = detector.sampleContent();
      const result = detector.detect(sample);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe("detect — positive cases", () => {
    const minimalHar = JSON.stringify({
      log: {
        version: "1.2",
        creator: { name: "test", version: "1" },
        entries: [
          {
            startedDateTime: "2023-01-01T00:00:00.000Z",
            time: 100,
            request: {
              method: "GET",
              url: "https://example.com/",
              httpVersion: "HTTP/1.1",
              headers: [],
              queryString: [],
              cookies: [],
              headersSize: 0,
              bodySize: -1,
            },
            response: {
              status: 200,
              statusText: "OK",
              httpVersion: "HTTP/1.1",
              headers: [],
              cookies: [],
              content: { size: 0, mimeType: "text/html" },
              redirectURL: "",
              headersSize: 0,
              bodySize: 0,
            },
            cache: {},
            timings: { send: 0, wait: 100, receive: 0 },
          },
        ],
      },
    });

    it("detects minimal valid HAR", () => {
      const result = detector.detect(minimalHar);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it("detects HAR with pages array", () => {
      const har = JSON.stringify({
        log: {
          version: "1.2",
          creator: { name: "Chrome", version: "120" },
          pages: [{ startedDateTime: "2023-01-01T00:00:00Z", id: "p1", title: "Page", pageTimings: {} }],
          entries: [],
        },
      });
      const result = detector.detect(har);
      expect(result.match).toBe(true);
    });

    it("detects HAR with full entry (definitive match)", () => {
      const result = detector.detect(minimalHar);
      expect(result.matchedDefinitive).toBe(true);
    });
  });

  describe("detect — negative cases", () => {
    it("rejects empty string", () => {
      expect(detector.detect("").match).toBe(false);
    });

    it("rejects plain JSON object", () => {
      expect(detector.detect(JSON.stringify({ foo: "bar" })).match).toBe(false);
    });

    it("rejects JSON without entries", () => {
      expect(detector.detect(JSON.stringify({ log: { version: "1.2" } })).match).toBe(false);
    });

    it("rejects JSON array", () => {
      expect(detector.detect(JSON.stringify([1, 2, 3])).match).toBe(false);
    });

    it("rejects plain text", () => {
      expect(detector.detect("hello world").match).toBe(false);
    });

    it("rejects JSON without log key", () => {
      expect(detector.detect(JSON.stringify({ entries: [] })).match).toBe(false);
    });

    it("rejects malformed JSON", () => {
      expect(detector.detect("{log: {entries: []}}").match).toBe(false);
    });
  });

  describe("registerProvider", () => {
    it("calls register and setMonarchTokensProvider without throwing", () => {
      const monaco = {
        languages: {
          register: jest.fn(),
          setLanguageConfiguration: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
        },
        editor: {
          defineTheme: jest.fn(),
        },
      };
      expect(() => detector.registerProvider(monaco)).not.toThrow();
      expect(monaco.languages.register).toHaveBeenCalledWith({ id: "har" });
      expect(monaco.languages.setMonarchTokensProvider).toHaveBeenCalledWith(
        "har",
        expect.any(Object),
      );
    });
  });
});
