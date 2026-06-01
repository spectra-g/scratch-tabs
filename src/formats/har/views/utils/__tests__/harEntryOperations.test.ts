import {
  compareHarEntries,
  deleteHarEntries,
  mergeHarContent,
  mergeHarFiles,
  parseHarContent,
  serializeHar,
} from "../harEntryOperations";
import { HarEntry, HarFile } from "../../types";

function makeEntry(overrides: Partial<{
  method: string;
  url: string;
  status: number;
  startedDateTime: string;
}> = {}): HarEntry {
  const {
    method = "GET",
    url = "https://example.com/api/test",
    status = 200,
    startedDateTime = "2023-01-01T12:00:00.000Z",
  } = overrides;

  return {
    startedDateTime,
    time: 100,
    request: {
      method,
      url,
      httpVersion: "HTTP/1.1",
      headers: [{ name: "Accept", value: "application/json" }],
      queryString: [],
      cookies: [],
      headersSize: 10,
      bodySize: -1,
    },
    response: {
      status,
      statusText: status === 200 ? "OK" : "Error",
      httpVersion: "HTTP/1.1",
      headers: [{ name: "Content-Type", value: "application/json" }],
      cookies: [],
      content: { size: 20, mimeType: "application/json" },
      redirectURL: "",
      headersSize: 10,
      bodySize: 20,
    },
    timings: { send: 1, wait: 90, receive: 9 },
  };
}

function makeHar(entries: HarEntry[]): HarFile {
  return {
    log: {
      version: "1.2",
      creator: { name: "Test", version: "1" },
      pages: [
        {
          id: "page_1",
          title: "Page 1",
          startedDateTime: "2023-01-01T12:00:00.000Z",
          pageTimings: {},
        },
      ],
      entries,
    },
  };
}

describe("harEntryOperations", () => {
  it("parses valid HAR content", () => {
    const result = parseHarContent(serializeHar(makeHar([makeEntry()])));
    expect(result.error).toBeNull();
    expect(result.file?.log.entries).toHaveLength(1);
  });

  it("rejects JSON without log.entries", () => {
    const result = parseHarContent(JSON.stringify({ log: { version: "1.2" } }));
    expect(result.file).toBeNull();
    expect(result.error).toContain("missing log.entries");
  });

  it("deletes entries by original index", () => {
    const file = makeHar([
      makeEntry({ url: "https://example.com/a" }),
      makeEntry({ url: "https://example.com/b" }),
      makeEntry({ url: "https://example.com/c" }),
    ]);

    const next = deleteHarEntries(file, new Set([0, 2]));

    expect(next.log.entries).toHaveLength(1);
    expect(next.log.entries[0].request.url).toBe("https://example.com/b");
  });

  it("merges entries and deduplicates page ids", () => {
    const base = makeHar([makeEntry({ url: "https://example.com/a" })]);
    const incoming = makeHar([makeEntry({ url: "https://example.com/b" })]);
    incoming.log.pages = [
      incoming.log.pages![0],
      {
        id: "page_2",
        title: "Page 2",
        startedDateTime: "2023-01-01T12:00:01.000Z",
        pageTimings: {},
      },
    ];

    const next = mergeHarFiles(base, incoming);

    expect(next.log.entries).toHaveLength(2);
    expect(next.log.pages?.map((page) => page.id)).toEqual(["page_1", "page_2"]);
  });

  it("returns an error when merge content is not valid HAR", () => {
    const result = mergeHarContent(serializeHar(makeHar([makeEntry()])), "{ bad");
    expect(result.file).toBeNull();
    expect(result.error).toContain("Merge content");
  });

  it("compares entries as same and different field rows", () => {
    const comparison = compareHarEntries(
      makeEntry({ method: "GET", status: 200 }),
      makeEntry({ method: "POST", status: 404 }),
    );

    expect(comparison.same.some((row) => row.path === "request.url")).toBe(true);
    expect(comparison.different).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "request.method",
          leftValue: "GET",
          rightValue: "POST",
        }),
        expect.objectContaining({
          path: "response.status",
          leftValue: "200",
          rightValue: "404",
        }),
      ]),
    );
  });
});
