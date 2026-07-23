import { CanvasItemNavigationDispatcher } from "../CanvasItemNavigationDispatcher";

describe("CanvasItemNavigationDispatcher", () => {
  it("queues item navigation until the Canvas renderer registers", async () => {
    const dispatcher = new CanvasItemNavigationDispatcher();
    const handler = jest.fn().mockResolvedValue(undefined);

    const navigation = dispatcher.dispatch("tab-1", "item-1");
    expect(handler).not.toHaveBeenCalled();
    dispatcher.register("tab-1", handler);

    await navigation;
    expect(handler).toHaveBeenCalledWith("item-1");
  });

  it("propagates navigation failures to the caller", async () => {
    const dispatcher = new CanvasItemNavigationDispatcher();
    dispatcher.register(
      "tab-1",
      jest.fn().mockRejectedValue(new Error("missing item")),
    );

    await expect(dispatcher.dispatch("tab-1", "missing")).rejects.toThrow(
      "missing item",
    );
  });
});
