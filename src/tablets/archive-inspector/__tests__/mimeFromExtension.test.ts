import { mimeFromExtension } from "../utils/mimeFromExtension";

describe("mimeFromExtension", () => {
  it("returns application/zip for .zip", () => {
    expect(mimeFromExtension("archive.zip")).toBe("application/zip");
  });

  it("returns application/java-archive for .jar", () => {
    expect(mimeFromExtension("app.jar")).toBe("application/java-archive");
  });

  it("returns application/java-archive for .war", () => {
    expect(mimeFromExtension("app.war")).toBe("application/java-archive");
  });

  it("returns application/vnd.android.package-archive for .apk", () => {
    expect(mimeFromExtension("app.apk")).toBe("application/vnd.android.package-archive");
  });

  it("returns application/epub+zip for .epub", () => {
    expect(mimeFromExtension("book.epub")).toBe("application/epub+zip");
  });

  it("returns application/json for .json", () => {
    expect(mimeFromExtension("data.json")).toBe("application/json");
  });

  it("returns text/plain for .txt", () => {
    expect(mimeFromExtension("readme.txt")).toBe("text/plain");
  });

  it("returns image/png for .png", () => {
    expect(mimeFromExtension("logo.png")).toBe("image/png");
  });

  it("returns application/octet-stream for unknown extension", () => {
    expect(mimeFromExtension("file.xyz123")).toBe("application/octet-stream");
  });

  it("returns application/octet-stream for file with no extension", () => {
    expect(mimeFromExtension("Makefile")).toBe("application/octet-stream");
  });

  it("is case-insensitive for extensions", () => {
    expect(mimeFromExtension("ARCHIVE.ZIP")).toBe("application/zip");
  });

  it("returns application/vnd.openxmlformats-officedocument.wordprocessingml.document for .docx", () => {
    expect(mimeFromExtension("doc.docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });
});
