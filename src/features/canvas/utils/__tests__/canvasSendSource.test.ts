import {
  canvasSendSourceToInputs,
  createCanvasSendSourceFromTab,
} from "../canvasSendSource";

describe("canvasSendSource", () => {
  it("uses live text content when creating a source from a tab", () => {
    expect(
      createCanvasSendSourceFromTab(
        { title: "Request", content: "saved" },
        "live",
      ),
    ).toEqual({ kind: "text", text: "live" });
  });

  it("converts an image data URI to a File input", () => {
    const dataUri = "data:image/png;base64,aGVsbG8=";
    const source = createCanvasSendSourceFromTab({
      title: "Diagram",
      content: dataUri,
    });

    expect(source).toEqual({
      kind: "image-data-uri",
      dataUri,
      fileName: "Diagram.png",
    });
    const [input] = canvasSendSourceToInputs(source!);
    expect(input.kind).toBe("file");
    if (input.kind === "file") {
      expect(input.file.name).toBe("Diagram.png");
      expect(input.file.type).toBe("image/png");
      expect(input.file.size).toBe(5);
    }
  });

  it("returns no source for an empty tab", () => {
    expect(
      createCanvasSendSourceFromTab({ title: "Empty", content: "" }),
    ).toBeNull();
  });
});
