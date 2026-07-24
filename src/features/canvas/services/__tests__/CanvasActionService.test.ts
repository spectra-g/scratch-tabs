import type { Tab } from "../../../../types";
import { CanvasActionService } from "../CanvasActionService";

const tab = (overrides: Partial<Tab>): Tab => ({
  id: "tab-1",
  title: "Tab",
  content: "",
  language: "plaintext",
  languageLocked: false,
  workspaceId: "workspace-1",
  dateCreated: 1,
  lastModified: 1,
  cursorPosition: { lineNumber: 1, column: 1 },
  ...overrides,
});

describe("CanvasActionService", () => {
  const createCanvas = jest.fn();
  const activateTab = jest.fn();
  const getTabs = jest.fn();
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    getTabs.mockReturnValue([
      tab({
        id: "canvas-1",
        title: "Architecture",
        contentKind: "canvas",
        documentId: "canvas-1",
      }),
      tab({ id: "text-1", title: "Notes" }),
    ]);
  });

  const createService = () =>
    new CanvasActionService(
      { createCanvas, activateTab, getTabs },
      { dispatch },
    );

  it("lists only Canvas targets in the requested workspace", () => {
    expect(createService().getTargets("workspace-1")).toEqual([
      { id: "canvas-1", title: "Architecture" },
    ]);
  });

  it("creates, activates, and dispatches to a new Canvas", async () => {
    createCanvas.mockResolvedValue("canvas-new");
    const inputs = [{ kind: "text" as const, text: "hello" }];

    await expect(
      createService().send("workspace-1", inputs, {
        kind: "new",
        side: "right",
      }),
    ).resolves.toBe("canvas-new");

    expect(createCanvas).toHaveBeenCalledWith("right");
    expect(activateTab).toHaveBeenCalledWith("canvas-new");
    expect(dispatch).toHaveBeenCalledWith("canvas-new", inputs);
  });

  it("rejects an existing target outside the active workspace", async () => {
    await expect(
      createService().send(
        "workspace-2",
        [{ kind: "text", text: "hello" }],
        { kind: "existing", tabId: "canvas-1" },
      ),
    ).rejects.toThrow("no longer available");
    expect(dispatch).not.toHaveBeenCalled();
  });
});
