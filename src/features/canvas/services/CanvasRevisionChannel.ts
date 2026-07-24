export interface CanvasRevisionMessage {
  tabId: string;
  documentId: string;
  revision: number;
}

type CanvasRevisionListener = (message: CanvasRevisionMessage) => void;

export interface CanvasRevisionChannelContract {
  publish(message: CanvasRevisionMessage): void;
  subscribe(listener: CanvasRevisionListener): () => void;
}

export const isCanvasRevisionMessage = (
  value: unknown,
): value is CanvasRevisionMessage => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 3 &&
    typeof record.tabId === "string" &&
    record.tabId.length > 0 &&
    typeof record.documentId === "string" &&
    record.documentId.length > 0 &&
    typeof record.revision === "number" &&
    Number.isSafeInteger(record.revision) &&
    record.revision >= 0
  );
};

export class CanvasRevisionChannel implements CanvasRevisionChannelContract {
  private readonly channel = new BroadcastChannel(
    "scratch-tabs-canvas-revisions-v1",
  );
  private readonly listeners = new Set<CanvasRevisionListener>();

  constructor() {
    this.channel.addEventListener("message", this.handleMessage);
  }

  publish(message: CanvasRevisionMessage): void {
    this.channel.postMessage(message);
  }

  subscribe(listener: CanvasRevisionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): void {
    this.channel.removeEventListener("message", this.handleMessage);
    this.listeners.clear();
    this.channel.close();
  }

  private readonly handleMessage = (event: MessageEvent<unknown>): void => {
    if (!isCanvasRevisionMessage(event.data)) return;
    this.listeners.forEach((listener) => listener(event.data));
  };
}

export const canvasRevisionChannel = new CanvasRevisionChannel();
