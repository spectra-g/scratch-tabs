import type { CanvasDocument } from "../../types";
import { createEmptyCanvasDocument } from "../../utils/canvasSchemas";
import {
  assertCanvasRevision,
  CanvasRevisionConflictError,
  createCanvasTakeOverDocument,
} from "../CanvasRevisionConflict";

const createDocument = (revision: number): CanvasDocument => ({
  ...createEmptyCanvasDocument({
    id: "document-1",
    tabId: "tab-1",
    workspaceId: "workspace-1",
    now: 1,
  }),
  revision,
});

describe("Canvas revision rules", () => {
  it("accepts only a one-step save based on the stored revision", () => {
    expect(() =>
      assertCanvasRevision(createDocument(4), createDocument(5), 4),
    ).not.toThrow();
    expect(() =>
      assertCanvasRevision(createDocument(5), createDocument(5), 4),
    ).toThrow(new CanvasRevisionConflictError(4, 5));
    expect(() =>
      assertCanvasRevision(createDocument(4), createDocument(6), 4),
    ).toThrow("Canvas saves must increment");
  });

  it("takes over at exactly one revision above the latest stored version", () => {
    const local = {
      ...createDocument(2),
      items: [
        {
          id: "item-1",
          type: "text" as const,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          zIndex: 1,
          createdAt: 1,
          updatedAt: 2,
          text: "local work",
        },
      ],
    };

    const takenOver = createCanvasTakeOverDocument(local, createDocument(8));

    expect(takenOver.revision).toBe(9);
    expect(takenOver.items[0]).toEqual(
      expect.objectContaining({ text: "local work" }),
    );
  });
});
