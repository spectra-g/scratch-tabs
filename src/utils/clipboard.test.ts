import { safeCopy, safePaste } from "./clipboard";

describe("clipboard utils", () => {
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it("logs warn when writeText rejects with NotAllowedError", async () => {
    const writeText = jest
      .fn()
      .mockRejectedValue(new DOMException("Permission denied", "NotAllowedError"));

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText, readText: jest.fn() },
      configurable: true,
    });

    await expect(safeCopy("value")).resolves.toBeUndefined();
    expect(writeText).toHaveBeenCalledWith("value");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("fails gracefully with warn when navigator.clipboard is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });

    await expect(safeCopy("value")).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("fails gracefully with warn when readText is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn() },
      configurable: true,
    });

    await expect(safePaste()).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("logs error when readText rejects", async () => {
    const readText = jest.fn().mockRejectedValue(new Error("read failed"));

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn(), readText },
      configurable: true,
    });

    await expect(safePaste()).resolves.toBeNull();
    expect(readText).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("no-ops copy when text is empty", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText, readText: jest.fn() },
      configurable: true,
    });

    await expect(safeCopy("")).resolves.toBeUndefined();
    expect(writeText).not.toHaveBeenCalled();
  });
});
