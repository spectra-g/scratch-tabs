import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule } from "./types";

export class HarFormatDetector extends BaseFormatDetector implements FormatModule {
  id = "har";
  name = "HAR";
  extensions = ["har"];
  priority = 9; // Sub-detect on JSON; higher priority to win over generic json

  sampleContent(): string {
    return JSON.stringify(
      {
        log: {
          version: "1.2",
          creator: { name: "Chrome DevTools", version: "120.0" },
          pages: [
            {
              startedDateTime: new Date().toISOString(),
              id: "page_1",
              title: "https://example.com",
              pageTimings: { onContentLoad: 450, onLoad: 820 },
            },
          ],
          entries: [
            {
              startedDateTime: new Date().toISOString(),
              time: 350.5,
              request: {
                method: "GET",
                url: "https://example.com/api/users",
                httpVersion: "HTTP/1.1",
                headers: [
                  { name: "Accept", value: "application/json" },
                  { name: "Authorization", value: "Bearer eyJ0..." },
                ],
                queryString: [{ name: "limit", value: "20" }],
                cookies: [],
                headersSize: 432,
                bodySize: 0,
              },
              response: {
                status: 200,
                statusText: "OK",
                httpVersion: "HTTP/1.1",
                headers: [
                  { name: "Content-Type", value: "application/json" },
                  { name: "Content-Length", value: "1234" },
                ],
                cookies: [],
                content: {
                  size: 1234,
                  mimeType: "application/json",
                  text: '{"users":[{"id":1,"name":"Alice"}]}',
                },
                redirectURL: "",
                headersSize: 234,
                bodySize: 1234,
              },
              cache: {},
              timings: {
                blocked: 0,
                dns: 5,
                connect: 12,
                ssl: 8,
                send: 0.5,
                wait: 280,
                receive: 45,
              },
              pageref: "page_1",
            },
          ],
        },
      },
      null,
      2,
    );
  }

  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 20) return this.noMatch();

    const trimmed = content.trim();
    if (!trimmed.startsWith("{")) return this.noMatch();

    // Fast path: look for the required HAR markers before full parse
    const hasLog = /"log"\s*:/.test(content);
    const hasEntries = /"entries"\s*:/.test(content);
    if (!hasLog || !hasEntries) return this.noMatch();

    try {
      // Only parse if content is under 2MB to avoid blocking
      if (content.length > 2_000_000) {
        // For large files rely on structural heuristics
        const hasVersion = /"version"\s*:\s*"1\.[12]"/.test(content);
        const hasTimings = /"timings"\s*:/.test(content);
        const hasRequest = /"request"\s*:/.test(content);
        const hasResponse = /"response"\s*:/.test(content);
        const score = [hasVersion, hasTimings, hasRequest, hasResponse].filter(Boolean).length;
        if (score >= 3) {
          return { match: true, confidence: 0.9, matchedDefinitive: true };
        }
        return this.noMatch();
      }

      const parsed = JSON.parse(content);
      const log = parsed?.log;
      if (!log || typeof log !== "object") return this.noMatch();

      // Required HAR fields
      if (!Array.isArray(log.entries)) return this.noMatch();

      let confidence = 0.7;

      // version field
      if (typeof log.version === "string") confidence += 0.05;
      // creator
      if (log.creator && typeof log.creator.name === "string") confidence += 0.05;
      // pages
      if (Array.isArray(log.pages)) confidence += 0.05;

      // Validate at least the first entry structure
      const first = log.entries[0];
      if (first) {
        const hasEntryFields =
          first.request &&
          first.response &&
          first.timings &&
          typeof first.startedDateTime === "string";
        if (hasEntryFields) confidence += 0.15;
      }

      return {
        match: confidence >= 0.7,
        confidence: Math.min(1.0, confidence),
        matchedDefinitive: confidence >= 0.9,
      };
    } catch {
      return this.noMatch();
    }
  }

  getFileExtension(): string {
    return "har";
  }

  registerProvider(monaco: any): void {
    // HAR is JSON — reuse Monaco's built-in JSON language
    monaco.languages.register({ id: "har" });

    monaco.languages.setLanguageConfiguration("har", {
      brackets: [
        ["{", "}"],
        ["[", "]"],
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: '"', close: '"' },
      ],
    });

    monaco.languages.setMonarchTokensProvider("har", {
      defaultToken: "",
      tokenPostfix: ".har",
      keywords: ["true", "false", "null"],
      tokenizer: {
        root: [
          [/"([^"\\]|\\.)*"(?=\s*:)/, "key.har"],
          [/"(?:[^"\\]|\\.)*"/, "string.har"],
          [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "number.har"],
          [/\b(?:true|false|null)\b/, "keyword.har"],
          [/[{}]/, "delimiter.bracket.har"],
          [/[[\]]/, "delimiter.array.har"],
          [/:/, "delimiter.colon.har"],
          [/,/, "delimiter.comma.har"],
          [/\s+/, "white"],
        ],
      },
    });

    monaco.editor.defineTheme("har-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "key.har", foreground: "4FC1FF", fontStyle: "bold" },
        { token: "string.har", foreground: "CE9178" },
        { token: "number.har", foreground: "B5CEA8" },
        { token: "keyword.har", foreground: "569CD6" },
        { token: "delimiter.bracket.har", foreground: "FFD700" },
        { token: "delimiter.array.har", foreground: "FFD700" },
        { token: "delimiter.colon.har", foreground: "D4D4D4" },
        { token: "delimiter.comma.har", foreground: "D4D4D4" },
      ],
      colors: {},
    });
  }
}

const harDetector = new HarFormatDetector();
formatRegistry.register(harDetector);

export const registerHarProvider = (monaco: any) => {
  harDetector.registerProvider(monaco);
};
