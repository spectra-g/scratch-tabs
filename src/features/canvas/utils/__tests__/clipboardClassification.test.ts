import {
  classifyCanvasInputs,
  classifyCanvasText,
  normalizeCanvasDataTransfer,
  readCanvasTextFile,
} from "../clipboardClassification";

describe("Canvas clipboard and drop classification", () => {
  it("pretty-prints complete JSON before general format detection", () => {
    expect(classifyCanvasText('{"users":[1,2]}')).toEqual({
      kind: "code",
      source: '{\n  "users": [\n    1,\n    2\n  ]\n}',
      language: "json",
      languageLocked: true,
    });
  });

  it("keeps ordinary prose as a text card", () => {
    expect(
      classifyCanvasText("Remember to update the deployment notes."),
    ).toEqual({
      kind: "text",
      text: "Remember to update the deployment notes.",
    });
  });

  it("classifies standalone URLs after complete JSON and before code detection", () => {
    expect(classifyCanvasText(" HTTPS://Example.COM:443/docs#intro ")).toEqual({
      kind: "link",
      canonicalUrl: "https://example.com/docs",
      hostname: "example.com",
    });
    expect(
      classifyCanvasText(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30",
      ),
    ).toEqual({
      kind: "video",
      canonicalUrl:
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30",
      hostname: "www.youtube.com",
      provider: "youtube",
      videoId: "dQw4w9WgXcQ",
    });
  });

  it("keeps unknown and deceptive video-like URLs as link cards", () => {
    expect(
      classifyCanvasText(
        "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
      ),
    ).toEqual({
      kind: "link",
      canonicalUrl:
        "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
      hostname: "youtube.com.evil.example",
    });
  });

  it("does not create links from non-HTTP(S) schemes", () => {
    expect(classifyCanvasText("javascript:alert(1)")).toEqual({
      kind: "text",
      text: "javascript:alert(1)",
    });
  });

  it("uses a known file extension for code even when the snippet is short", async () => {
    const file = new File(["select 1"], "query.sql", {
      type: "text/plain",
    });

    await expect(
      classifyCanvasInputs([{ kind: "file", file }], async () => "select 1"),
    ).resolves.toEqual([
      {
        kind: "code",
        source: "select 1",
        language: "sql",
        languageLocked: true,
      },
    ]);
  });

  it("classifies images before text files and clipboard text", () => {
    const image = new File(["image"], "diagram.png", { type: "image/png" });
    const textFile = new File(["const value = 1"], "sample.js", {
      type: "text/javascript",
    });
    const transfer = {
      files: {
        0: textFile,
        1: image,
        length: 2,
        item: (index: number) => [textFile, image][index] ?? null,
        [Symbol.iterator]: function* () {
          yield textFile;
          yield image;
        },
      },
      getData: (type: string) => (type === "text/plain" ? "fallback" : ""),
    } as unknown as DataTransfer;

    expect(normalizeCanvasDataTransfer(transfer)).toEqual([
      { kind: "file", file: image },
      { kind: "file", file: textFile },
      { kind: "text", text: "fallback" },
    ]);
  });

  it("rejects binary files instead of creating a corrupt text card", async () => {
    const file = {
      name: "archive.bin",
      size: 3,
      text: jest.fn().mockResolvedValue("a\0b"),
    } as unknown as File;

    await expect(readCanvasTextFile(file)).rejects.toThrow(
      "archive.bin does not appear to be text",
    );
  });
});
