export type CanvasItemNavigationHandler = (itemId: string) => Promise<void>;

interface PendingNavigation {
  itemId: string;
  resolve: () => void;
  reject: (error: unknown) => void;
}

export class CanvasItemNavigationDispatcher {
  private readonly handlers = new Map<string, CanvasItemNavigationHandler>();
  private readonly pending = new Map<string, PendingNavigation[]>();

  register(tabId: string, handler: CanvasItemNavigationHandler): () => void {
    this.handlers.set(tabId, handler);
    const queued = this.pending.get(tabId) ?? [];
    this.pending.delete(tabId);
    void this.runQueued(handler, queued);

    return () => {
      if (this.handlers.get(tabId) === handler) {
        this.handlers.delete(tabId);
      }
    };
  }

  dispatch(tabId: string, itemId: string): Promise<void> {
    const handler = this.handlers.get(tabId);
    if (handler) return handler(itemId);

    return new Promise<void>((resolve, reject) => {
      const queued = this.pending.get(tabId) ?? [];
      queued.push({ itemId, resolve, reject });
      this.pending.set(tabId, queued);
    });
  }

  private async runQueued(
    handler: CanvasItemNavigationHandler,
    queued: PendingNavigation[],
  ): Promise<void> {
    for (const navigation of queued) {
      try {
        await handler(navigation.itemId);
        navigation.resolve();
      } catch (error) {
        navigation.reject(error);
      }
    }
  }
}

export const canvasItemNavigationDispatcher =
  new CanvasItemNavigationDispatcher();
