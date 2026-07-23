import { CanvasActionDispatcher } from "../CanvasActionDispatcher";

describe("CanvasActionDispatcher", () => {
  it("delivers actions immediately to an active Canvas", async () => {
    const dispatcher = new CanvasActionDispatcher();
    const handler = jest.fn().mockResolvedValue(undefined);
    dispatcher.register("canvas-1", handler);

    dispatcher.dispatch("canvas-1", [{ kind: "text", text: "hello" }]);
    await Promise.resolve();

    expect(handler).toHaveBeenCalledWith([{ kind: "text", text: "hello" }]);
  });

  it("queues actions until the destination Canvas mounts", async () => {
    const dispatcher = new CanvasActionDispatcher();
    let resolveDelivered!: () => void;
    const delivered = new Promise<void>((resolve) => {
      resolveDelivered = resolve;
    });
    const handler = jest.fn().mockImplementation(async () => {
      if (handler.mock.calls.length === 2) resolveDelivered();
    });

    dispatcher.dispatch("canvas-1", [{ kind: "text", text: "first" }]);
    dispatcher.dispatch("canvas-1", [{ kind: "text", text: "second" }]);
    dispatcher.register("canvas-1", handler);
    await delivered;

    expect(handler.mock.calls).toEqual([
      [[{ kind: "text", text: "first" }]],
      [[{ kind: "text", text: "second" }]],
    ]);
  });

  it("does not remove a newer handler when an older registration disposes", () => {
    const dispatcher = new CanvasActionDispatcher();
    const first = jest.fn().mockResolvedValue(undefined);
    const second = jest.fn().mockResolvedValue(undefined);
    const disposeFirst = dispatcher.register("canvas-1", first);
    dispatcher.register("canvas-1", second);

    disposeFirst();
    dispatcher.dispatch("canvas-1", [{ kind: "text", text: "hello" }]);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
