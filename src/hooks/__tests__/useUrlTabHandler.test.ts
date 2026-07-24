import { generateUrlIdentifier } from "../useUrlTabHandler";
import type { Tab } from "../../types";

const tab = (overrides: Partial<Tab> = {}): Tab => ({
  id: "tab-1",
  title: "My Document",
  content: "",
  language: "plaintext",
  languageLocked: false,
  workspaceId: "workspace-1",
  dateCreated: 1,
  lastModified: 1,
  cursorPosition: { lineNumber: 1, column: 1 },
  ...overrides,
});

describe("generateUrlIdentifier", () => {
  it("uses the stable Canvas route instead of the mutable title", () => {
    expect(
      generateUrlIdentifier(
        tab({ title: "Architecture Board", contentKind: "canvas" }),
      ),
    ).toBe("canvas");
  });

  it("continues to slugify normal tab titles", () => {
    expect(generateUrlIdentifier(tab())).toBe("my-document");
  });
});
