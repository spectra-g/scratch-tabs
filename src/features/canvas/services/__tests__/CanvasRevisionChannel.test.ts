import {
  CanvasRevisionChannel,
  isCanvasRevisionMessage,
} from "../CanvasRevisionChannel";

describe("CanvasRevisionChannel", () => {
  it("accepts only the metadata-only revision message shape", () => {
    expect(
      isCanvasRevisionMessage({
        tabId: "tab-1",
        documentId: "document-1",
        revision: 3,
      }),
    ).toBe(true);
    expect(
      isCanvasRevisionMessage({
        tabId: "tab-1",
        documentId: "document-1",
        revision: 3,
        items: [{ text: "must not leak" }],
      }),
    ).toBe(false);
    expect(
      isCanvasRevisionMessage({
        tabId: "tab-1",
        documentId: "document-1",
        revision: -1,
      }),
    ).toBe(false);
  });

  it("ignores malformed incoming messages", () => {
    const channel = new CanvasRevisionChannel();
    const listener = jest.fn();
    channel.subscribe(listener);
    const broadcast = (
      channel as unknown as {
        channel: { onmessage: ((event: MessageEvent) => void) | null };
      }
    ).channel;

    broadcast.onmessage?.(
      new MessageEvent("message", { data: { scene: "private" } }),
    );

    expect(listener).not.toHaveBeenCalled();
    channel.close();
  });
});
