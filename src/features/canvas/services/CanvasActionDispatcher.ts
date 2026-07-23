import type { CanvasNormalizedInput } from "../utils/clipboardClassification";

export type CanvasActionHandler = (
  inputs: readonly CanvasNormalizedInput[],
) => Promise<void>;

interface PendingCanvasAction {
  inputs: CanvasNormalizedInput[];
}

export class CanvasActionDispatcher {
  private readonly handlers = new Map<string, CanvasActionHandler>();
  private readonly pending = new Map<string, PendingCanvasAction[]>();

  register(tabId: string, handler: CanvasActionHandler): () => void {
    this.handlers.set(tabId, handler);
    const queued = this.pending.get(tabId) ?? [];
    this.pending.delete(tabId);
    void queued.reduce(
      (previous, action) =>
        previous.then(() => handler(action.inputs)).catch(() => undefined),
      Promise.resolve(),
    );

    return () => {
      if (this.handlers.get(tabId) === handler) {
        this.handlers.delete(tabId);
      }
    };
  }

  dispatch(
    tabId: string,
    inputs: readonly CanvasNormalizedInput[],
  ): void {
    if (inputs.length === 0) return;
    const copiedInputs = [...inputs];
    const handler = this.handlers.get(tabId);
    if (handler) {
      void handler(copiedInputs);
      return;
    }
    const queued = this.pending.get(tabId) ?? [];
    queued.push({ inputs: copiedInputs });
    this.pending.set(tabId, queued);
  }
}

export const canvasActionDispatcher = new CanvasActionDispatcher();
