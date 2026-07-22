interface CanvasDocumentFlusher {
  flushAll(): Promise<void>;
}

type CanvasDocumentFlusherLoader = () => Promise<CanvasDocumentFlusher>;

const loadCanvasDocumentManager: CanvasDocumentFlusherLoader = async () => {
  const { canvasDocumentManager } = await import(
    "../features/canvas/services/CanvasDocumentManager"
  );
  return canvasDocumentManager;
};

export class CanvasLifecycleCoordinator {
  constructor(
    private readonly loadFlusher: CanvasDocumentFlusherLoader =
      loadCanvasDocumentManager,
  ) {}

  async flushActiveDocuments(): Promise<void> {
    const manager = await this.loadFlusher();
    await manager.flushAll();
  }
}

export const canvasLifecycleCoordinator = new CanvasLifecycleCoordinator();
