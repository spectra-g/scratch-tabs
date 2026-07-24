import type { CanvasDocument } from "../types";

export class CanvasRevisionConflictError extends Error {
  constructor(
    readonly expectedRevision: number,
    readonly storedRevision: number,
  ) {
    super(
      `Canvas revision conflict: expected revision ${expectedRevision}, found ${storedRevision}`,
    );
    this.name = "CanvasRevisionConflictError";
  }
}

export const assertCanvasRevision = (
  storedDocument: CanvasDocument | undefined,
  candidate: CanvasDocument,
  expectedRevision: number,
): void => {
  if (!storedDocument) {
    throw new Error(`Canvas document ${candidate.id} no longer exists`);
  }
  if (
    storedDocument.id !== candidate.id ||
    storedDocument.tabId !== candidate.tabId
  ) {
    throw new Error("Canvas document identity changed while saving");
  }
  if (storedDocument.revision !== expectedRevision) {
    throw new CanvasRevisionConflictError(
      expectedRevision,
      storedDocument.revision,
    );
  }
  if (candidate.revision !== expectedRevision + 1) {
    throw new Error("Canvas saves must increment the expected revision by one");
  }
};

export const createCanvasTakeOverDocument = (
  candidate: CanvasDocument,
  storedDocument: CanvasDocument,
): CanvasDocument => {
  if (
    storedDocument.id !== candidate.id ||
    storedDocument.tabId !== candidate.tabId
  ) {
    throw new Error("Cannot take over a different Canvas document");
  }
  return {
    ...candidate,
    revision: storedDocument.revision + 1,
  };
};
