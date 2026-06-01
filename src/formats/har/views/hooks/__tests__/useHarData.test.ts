import { renderHook, act } from "@testing-library/react";
import { useHarData } from "../useHarData";

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<{
  method: string;
  url: string;
  status: number;
  time: number;
  startedDateTime: string;
  hasCookie: boolean;
  hasAuth: boolean;
  mimeType: string;
}> = {}) {
  const {
    method = "GET",
    url = "https://example.com/api/test",
    status = 200,
    time = 120,
    startedDateTime = "2023-01-01T12:00:00.000Z",
    hasCookie = false,
    hasAuth = false,
    mimeType = "application/json",
  } = overrides;

  const headers: { name: string; value: string }[] = [];
  if (hasCookie) headers.push({ name: "Cookie", value: "session=abc123" });
  if (hasAuth) headers.push({ name: "Authorization", value: "Bearer token" });

  return {
    startedDateTime,
    time,
    request: {
      method,
      url,
      httpVersion: "HTTP/1.1",
      headers,
      queryString: [],
      cookies: [],
      headersSize: 300,
      bodySize: -1,
    },
    response: {
      status,
      statusText: status === 200 ? "OK" : "Error",
      httpVersion: "HTTP/1.1",
      headers: [{ name: "Content-Type", value: mimeType }],
      cookies: [],
      content: { size: 500, mimeType },
      redirectURL: "",
      headersSize: 200,
      bodySize: 500,
    },
    cache: {},
    timings: { blocked: 0, dns: 5, connect: 10, ssl: 8, send: 0.5, wait: 80, receive: 16.5 },
  };
}

function makeHar(entries: ReturnType<typeof makeEntry>[]) {
  return JSON.stringify({
    log: {
      version: "1.2",
      creator: { name: "Test", version: "1.0" },
      entries,
    },
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("useHarData", () => {
  describe("parsing", () => {
    it("parses a valid HAR and returns entries", () => {
      const content = makeHar([makeEntry(), makeEntry({ method: "POST", status: 201 })]);
      const { result } = renderHook(() => useHarData(content));

      expect(result.current.file).not.toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.entries).toHaveLength(2);
    });

    it("returns error for invalid JSON", () => {
      const { result } = renderHook(() => useHarData("{invalid json"));
      expect(result.current.error).not.toBeNull();
      expect(result.current.file).toBeNull();
    });

    it("returns error when entries is missing", () => {
      const { result } = renderHook(() => useHarData(JSON.stringify({ log: { version: "1.2" } })));
      expect(result.current.error).not.toBeNull();
    });

    it("handles empty entries array", () => {
      const { result } = renderHook(() => useHarData(makeHar([])));
      expect(result.current.entries).toHaveLength(0);
      expect(result.current.summary?.totalRequests).toBe(0);
    });
  });

  describe("entry processing", () => {
    it("correctly extracts hostname and pathname from URL", () => {
      const content = makeHar([makeEntry({ url: "https://api.example.com/v1/users?page=1" })]);
      const { result } = renderHook(() => useHarData(content));

      const entry = result.current.entries[0];
      expect(entry.hostname).toBe("api.example.com");
      expect(entry.pathname).toBe("/v1/users?page=1");
    });

    it("categorizes 2xx status correctly", () => {
      const content = makeHar([makeEntry({ status: 200 })]);
      const { result } = renderHook(() => useHarData(content));
      expect(result.current.entries[0].statusCategory).toBe("2xx");
    });

    it("categorizes 4xx status correctly", () => {
      const content = makeHar([makeEntry({ status: 404 })]);
      const { result } = renderHook(() => useHarData(content));
      expect(result.current.entries[0].statusCategory).toBe("4xx");
    });

    it("categorizes 5xx status correctly", () => {
      const content = makeHar([makeEntry({ status: 500 })]);
      const { result } = renderHook(() => useHarData(content));
      expect(result.current.entries[0].statusCategory).toBe("5xx");
    });

    it("identifies sensitive data via Authorization header", () => {
      const content = makeHar([makeEntry({ hasAuth: true })]);
      const { result } = renderHook(() => useHarData(content));
      expect(result.current.entries[0].hasSensitiveData).toBe(true);
    });

    it("identifies sensitive data via Cookie header", () => {
      const content = makeHar([makeEntry({ hasCookie: true })]);
      const { result } = renderHook(() => useHarData(content));
      expect(result.current.entries[0].hasSensitiveData).toBe(true);
    });

    it("does not flag entry without sensitive data", () => {
      const content = makeHar([makeEntry()]);
      const { result } = renderHook(() => useHarData(content));
      expect(result.current.entries[0].hasSensitiveData).toBe(false);
    });

    it("builds timing segments from entry timings", () => {
      const content = makeHar([makeEntry()]);
      const { result } = renderHook(() => useHarData(content));
      const segs = result.current.entries[0].timingSegments;
      expect(segs.length).toBeGreaterThan(0);
      // Segments with duration >= 0 are included (0ms = cached phase, still valid)
      segs.forEach((s) => expect(s.duration).toBeGreaterThanOrEqual(0));
    });

    it("subtracts ssl from connect to avoid double-counting", () => {
      const content = makeHar([makeEntry()]);
      // makeEntry uses timings: { blocked: 0, dns: 5, connect: 10, ssl: 8, ... }
      const { result } = renderHook(() => useHarData(content));
      const segs = result.current.entries[0].timingSegments;
      const connectSeg = segs.find((s) => s.label === "TCP Connect");
      const sslSeg = segs.find((s) => s.label === "SSL/TLS");
      expect(connectSeg?.duration).toBe(2); // 10 - 8
      expect(sslSeg?.duration).toBe(8);
    });

    it("includes zero-duration phases (cached DNS = 0ms)", () => {
      const harContent = JSON.stringify({
        log: {
          version: "1.2",
          creator: { name: "Test", version: "1.0" },
          entries: [{
            ...makeEntry(),
            timings: { blocked: -1, dns: 0, connect: -1, ssl: -1, send: 1, wait: 10, receive: 5 },
          }],
        },
      });
      const { result } = renderHook(() => useHarData(harContent));
      const segs = result.current.entries[0].timingSegments;
      const dnsSeg = segs.find((s) => s.label === "DNS Lookup");
      expect(dnsSeg).toBeDefined();
      expect(dnsSeg?.duration).toBe(0);
    });

    it("computes startOffset as 0 for first entry", () => {
      const content = makeHar([makeEntry(), makeEntry({ startedDateTime: "2023-01-01T12:00:01.000Z" })]);
      const { result } = renderHook(() => useHarData(content));
      expect(result.current.entries[0].startOffset).toBe(0);
      expect(result.current.entries[1].startOffset).toBeCloseTo(1000, 0);
    });

    it("uses the earliest timestamp as the baseline for startOffset regardless of entry order", () => {
      // entries[0] starts AFTER entries[1] — out-of-order HAR
      const content = makeHar([
        makeEntry({ startedDateTime: "2023-01-01T12:00:01.000Z" }),
        makeEntry({ startedDateTime: "2023-01-01T12:00:00.000Z" }),
      ]);
      const { result } = renderHook(() => useHarData(content));
      // The second entry is the earliest, so its offset must be 0
      expect(result.current.entries[1].startOffset).toBe(0);
      // The first entry started 1 second later
      expect(result.current.entries[0].startOffset).toBeCloseTo(1000, 0);
    });

    it("uses hostname '(data URI)' and truncates pathname for data: URLs", () => {
      const dataUrl = "data:image/png;base64," + "A".repeat(200);
      const content = makeHar([makeEntry({ url: dataUrl })]);
      const { result } = renderHook(() => useHarData(content));
      const entry = result.current.entries[0];
      expect(entry.hostname).toBe("(data URI)");
      expect(entry.pathname.length).toBeLessThan(70);
      expect(entry.pathname.endsWith("…")).toBe(true);
    });
  });

  describe("summary", () => {
    it("counts total requests", () => {
      const content = makeHar([makeEntry(), makeEntry()]);
      const { result } = renderHook(() => useHarData(content));
      expect(result.current.summary?.totalRequests).toBe(2);
    });

    it("aggregates status counts", () => {
      const content = makeHar([makeEntry({ status: 200 }), makeEntry({ status: 404 })]);
      const { result } = renderHook(() => useHarData(content));
      expect(result.current.summary?.statusCounts["2xx"]).toBe(1);
      expect(result.current.summary?.statusCounts["4xx"]).toBe(1);
    });

    it("sets hasSensitiveData when any entry has auth", () => {
      const content = makeHar([makeEntry(), makeEntry({ hasAuth: true })]);
      const { result } = renderHook(() => useHarData(content));
      expect(result.current.summary?.hasSensitiveData).toBe(true);
    });

    it("does not flag hasSensitiveData when no sensitive headers", () => {
      const content = makeHar([makeEntry(), makeEntry()]);
      const { result } = renderHook(() => useHarData(content));
      expect(result.current.summary?.hasSensitiveData).toBe(false);
    });
  });

  describe("filtering", () => {
    it("filters by search string (URL match)", () => {
      const content = makeHar([
        makeEntry({ url: "https://example.com/api/users" }),
        makeEntry({ url: "https://example.com/api/orders" }),
      ]);
      const { result } = renderHook(() => useHarData(content));

      act(() => {
        result.current.setFilter({ search: "users" });
      });

      expect(result.current.filteredEntries).toHaveLength(1);
      expect(result.current.filteredEntries[0].entry.request.url).toContain("users");
    });

    it("filters by method", () => {
      const content = makeHar([
        makeEntry({ method: "GET" }),
        makeEntry({ method: "POST" }),
        makeEntry({ method: "DELETE" }),
      ]);
      const { result } = renderHook(() => useHarData(content));

      act(() => {
        result.current.setFilter({ methods: new Set(["POST"]) });
      });

      expect(result.current.filteredEntries).toHaveLength(1);
      expect(result.current.filteredEntries[0].method).toBe("POST");
    });

    it("filters by status category", () => {
      const content = makeHar([
        makeEntry({ status: 200 }),
        makeEntry({ status: 404 }),
        makeEntry({ status: 500 }),
      ]);
      const { result } = renderHook(() => useHarData(content));

      act(() => {
        result.current.setFilter({ statusCategories: new Set(["4xx" as const]) });
      });

      expect(result.current.filteredEntries).toHaveLength(1);
      expect(result.current.filteredEntries[0].status).toBe(404);
    });

    it("filters errors only", () => {
      const content = makeHar([
        makeEntry({ status: 200 }),
        makeEntry({ status: 404 }),
        makeEntry({ status: 500 }),
      ]);
      const { result } = renderHook(() => useHarData(content));

      act(() => {
        result.current.setFilter({ showErrorsOnly: true });
      });

      expect(result.current.filteredEntries).toHaveLength(2);
    });

    it("returns all entries when filter is reset", () => {
      const content = makeHar([makeEntry({ status: 200 }), makeEntry({ status: 404 })]);
      const { result } = renderHook(() => useHarData(content));

      act(() => { result.current.setFilter({ showErrorsOnly: true }); });
      expect(result.current.filteredEntries).toHaveLength(1);

      act(() => { result.current.resetFilter(); });
      expect(result.current.filteredEntries).toHaveLength(2);
    });
  });

  describe("exports", () => {
    it("exportFilteredHar returns valid HAR JSON", () => {
      const content = makeHar([makeEntry(), makeEntry({ status: 404 })]);
      const { result } = renderHook(() => useHarData(content));

      act(() => { result.current.setFilter({ showErrorsOnly: true }); });

      const exported = result.current.exportFilteredHar();
      const parsed = JSON.parse(exported);
      expect(parsed.log.entries).toHaveLength(1);
      expect(parsed.log.entries[0].response.status).toBe(404);
    });

    it("exportAsCsv includes header row and data rows", () => {
      const content = makeHar([makeEntry({ method: "GET", status: 200 })]);
      const { result } = renderHook(() => useHarData(content));

      const csv = result.current.exportAsCsv();
      const lines = csv.split("\n");
      expect(lines[0]).toContain("Method");
      expect(lines[0]).toContain("Status");
      expect(lines[1]).toContain("GET");
      expect(lines[1]).toContain("200");
    });

    it("buildCurlCommand produces curl -X with URL", () => {
      const content = makeHar([makeEntry({ method: "POST", url: "https://api.example.com/data" })]);
      const { result } = renderHook(() => useHarData(content));
      const entry = result.current.entries[0];
      const curl = result.current.buildCurlCommand(entry);
      expect(curl).toContain("curl -X POST");
      expect(curl).toContain("https://api.example.com/data");
    });

    it("buildCurlCommand includes request headers", () => {
      const content = makeHar([makeEntry({ hasAuth: true })]);
      const { result } = renderHook(() => useHarData(content));
      const entry = result.current.entries[0];
      const curl = result.current.buildCurlCommand(entry);
      expect(curl).toContain("-H");
      expect(curl).toContain("Authorization");
    });

    it("buildCurlCommand uses --data-raw instead of --data", () => {
      const harContent = JSON.stringify({
        log: {
          version: "1.2",
          creator: { name: "Test", version: "1.0" },
          entries: [{
            ...makeEntry({ method: "POST" }),
            request: {
              ...makeEntry({ method: "POST" }).request,
              postData: { mimeType: "application/json", text: '{"key":"value"}' },
            },
          }],
        },
      });
      const { result } = renderHook(() => useHarData(harContent));
      const entry = result.current.entries[0];
      const curl = result.current.buildCurlCommand(entry);
      expect(curl).toContain("--data-raw");
      expect(curl).not.toContain("--data '");
    });

    it("buildCurlCommand always includes --compressed", () => {
      const content = makeHar([makeEntry()]);
      const { result } = renderHook(() => useHarData(content));
      const curl = result.current.buildCurlCommand(result.current.entries[0]);
      expect(curl).toContain("--compressed");
    });
  });

  describe("page filtering", () => {
    function makeHarWithPages() {
      return JSON.stringify({
        log: {
          version: "1.2",
          creator: { name: "Test", version: "1.0" },
          pages: [
            { id: "page_1", title: "Page 1", startedDateTime: "2023-01-01T12:00:00.000Z", pageTimings: {} },
            { id: "page_2", title: "Page 2", startedDateTime: "2023-01-01T12:00:01.000Z", pageTimings: {} },
          ],
          entries: [
            { ...makeEntry({ url: "https://example.com/a" }), pageref: "page_1" },
            { ...makeEntry({ url: "https://example.com/b" }), pageref: "page_2" },
            { ...makeEntry({ url: "https://example.com/c" }), pageref: "page_1" },
          ],
        },
      });
    }

    it("returns all entries when no pageref filter set", () => {
      const { result } = renderHook(() => useHarData(makeHarWithPages()));
      expect(result.current.filteredEntries).toHaveLength(3);
    });

    it("filters entries to a specific page", () => {
      const { result } = renderHook(() => useHarData(makeHarWithPages()));
      act(() => { result.current.setFilter({ pageref: "page_1" }); });
      expect(result.current.filteredEntries).toHaveLength(2);
      result.current.filteredEntries.forEach((e) =>
        expect(e.entry.pageref).toBe("page_1"),
      );
    });

    it("clears pageref filter on reset", () => {
      const { result } = renderHook(() => useHarData(makeHarWithPages()));
      act(() => { result.current.setFilter({ pageref: "page_2" }); });
      expect(result.current.filteredEntries).toHaveLength(1);
      act(() => { result.current.resetFilter(); });
      expect(result.current.filteredEntries).toHaveLength(3);
    });
  });
});
