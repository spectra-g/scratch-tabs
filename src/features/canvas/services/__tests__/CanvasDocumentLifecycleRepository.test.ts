import type { Tab } from "../../../../types";
import type { CanvasDocument, CanvasImageItem } from "../../types";
import { createEmptyCanvasDocument } from "../../utils/canvasSchemas";
import { cloneCanvasDocument } from "../CanvasDocumentLifecycleRepository";

const sourceTab: Tab = {
  id: "tab-1",
  documentId: "document-1",
  contentKind: "canvas",
  title: "Canvas",
  content: "",
  language: "plaintext",
  languageLocked: true,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 1,
  lastModified: 2,
  workspaceId: "workspace-1",
};

const image: CanvasImageItem = {
  id: "image-1",
  type: "image",
  x: 10,
  y: 20,
  width: 300,
  height: 200,
  zIndex: 1,
  assetId: "asset-1",
  altText: "diagram",
  objectFit: "contain",
  createdAt: 1,
  updatedAt: 2,
};

describe("cloneCanvasDocument", () => {
  it("creates an independent scene while retaining immutable asset references", () => {
    const source: CanvasDocument = {
      ...createEmptyCanvasDocument({
        id: sourceTab.documentId!,
        tabId: sourceTab.id,
        workspaceId: sourceTab.workspaceId,
        now: 1,
      }),
      revision: 4,
      items: [image],
    };
    const duplicate = {
      ...sourceTab,
      id: "tab-2",
      documentId: "document-2",
      title: "Canvas (Copy)",
    };

    const cloned = cloneCanvasDocument(source, duplicate, 10);

    expect(cloned).toEqual(
      expect.objectContaining({
        id: "document-2",
        tabId: "tab-2",
        workspaceId: "workspace-1",
        revision: 0,
        createdAt: 10,
        updatedAt: 10,
        items: [expect.objectContaining({ assetId: "asset-1" })],
      }),
    );
    expect(cloned.items).not.toBe(source.items);
    expect(cloned.items[0]).not.toBe(source.items[0]);
  });
});
