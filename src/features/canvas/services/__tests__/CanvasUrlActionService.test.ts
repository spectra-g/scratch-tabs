import { CanvasUrlActionService } from "../CanvasUrlActionService";

describe("CanvasUrlActionService", () => {
  it("opens canonical URLs in an isolated tab", () => {
    const opened = { opener: window } as unknown as Window;
    const openWindow = jest.fn(() => opened);
    const service = new CanvasUrlActionService(openWindow, jest.fn());

    service.open("https://example.com/docs");

    expect(openWindow).toHaveBeenCalledWith(
      "https://example.com/docs",
      "_blank",
      "noopener,noreferrer",
    );
    expect(opened.opener).toBeNull();
  });

  it("copies only validated canonical URLs", async () => {
    const writeClipboard = jest.fn().mockResolvedValue(undefined);
    const service = new CanvasUrlActionService(jest.fn(), writeClipboard);

    await service.copy("https://example.com/");
    expect(writeClipboard).toHaveBeenCalledWith("https://example.com/");

    await expect(service.copy("javascript:alert(1)")).rejects.toThrow(
      "invalid",
    );
    expect(writeClipboard).toHaveBeenCalledTimes(1);
  });
});
