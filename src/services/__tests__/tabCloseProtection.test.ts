import type { Tab } from "../../types";
import {
  shouldConfirmTabClose,
  tabHasCloseProtectedContent,
} from "../tabCloseProtection";

const createTab = (overrides: Partial<Tab> = {}): Tab => ({
  id: "test-tab",
  title: "Test Tab",
  content: "",
  language: "plaintext",
  languageLocked: false,
  workspaceId: "workspace-1",
  dateCreated: 1,
  lastModified: 1,
  cursorPosition: { lineNumber: 1, column: 1 },
  ...overrides,
});

describe("tab close protection", () => {
  it.each([
    ["text", createTab({ content: "Some text" })],
    [
      "rich text",
      createTab({
        contentKind: "rich-text",
        isRich: true,
        richContent: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Rich text" }],
            },
          ],
        },
      }),
    ],
    ["tablet", createTab({ contentKind: "tablet", isTablet: true })],
  ])("protects a non-empty %s tab", async (_label, tab) => {
    await expect(tabHasCloseProtectedContent(tab)).resolves.toBe(true);
  });

  it("does not protect empty or whitespace-only text tabs", async () => {
    await expect(
      tabHasCloseProtectedContent(createTab({ content: "  \n\t" })),
    ).resolves.toBe(false);
  });

  it("uses the Canvas document inspector instead of the empty Tab content", async () => {
    const inspectCanvas = jest.fn().mockResolvedValue(true);
    const tab = createTab({
      contentKind: "canvas",
      documentId: "canvas-document",
    });

    await expect(
      tabHasCloseProtectedContent(tab, inspectCanvas),
    ).resolves.toBe(true);
    expect(inspectCanvas).toHaveBeenCalledWith(tab.id);
  });

  it("allows the explicit bypass without inspecting Canvas content", async () => {
    const inspectCanvas = jest.fn().mockResolvedValue(true);
    const tab = createTab({ contentKind: "canvas", documentId: "document-1" });

    await expect(
      shouldConfirmTabClose(tab, true, inspectCanvas),
    ).resolves.toBe(false);
    expect(inspectCanvas).not.toHaveBeenCalled();
  });

  it("fails safe when Canvas content cannot be inspected", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    const inspectCanvas = jest.fn().mockRejectedValue(new Error("read failed"));
    const tab = createTab({ contentKind: "canvas", documentId: "document-1" });

    await expect(
      shouldConfirmTabClose(tab, false, inspectCanvas),
    ).resolves.toBe(true);
    consoleError.mockRestore();
  });
});
