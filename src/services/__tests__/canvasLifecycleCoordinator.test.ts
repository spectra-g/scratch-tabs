import { CanvasLifecycleCoordinator } from "../canvasLifecycleCoordinator";

describe("CanvasLifecycleCoordinator", () => {
  it("loads the Canvas manager only when a flush boundary is reached", async () => {
    const flushAll = jest.fn().mockResolvedValue(undefined);
    const loader = jest.fn().mockResolvedValue({ flushAll });
    const coordinator = new CanvasLifecycleCoordinator(loader);

    expect(loader).not.toHaveBeenCalled();
    await coordinator.flushActiveDocuments();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(flushAll).toHaveBeenCalledTimes(1);
  });
});
