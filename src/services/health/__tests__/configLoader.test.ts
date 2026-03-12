import { createHealthMessagesConfigLoader } from "../configLoader";

describe("health messages config loader", () => {
  it("loads and parses the external JSON config", async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        good: ["Healthy"],
        notGood: ["Unhealthy"],
      }),
    });

    const loader = createHealthMessagesConfigLoader({ fetcher });

    await expect(loader.load()).resolves.toEqual({
      good: ["Healthy"],
      notGood: ["Unhealthy"],
    });
    expect(fetcher).toHaveBeenCalledWith("/health-messages.json", {
      cache: "no-store",
    });
  });

  it("throws a clear error when the config file is missing", async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const loader = createHealthMessagesConfigLoader({ fetcher });

    await expect(loader.load()).rejects.toThrow(
      "Failed to load health messages config: 404 Not Found",
    );
  });

  it("throws a clear error when fetching the config fails before a response exists", async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error("Network down"));

    const loader = createHealthMessagesConfigLoader({ fetcher });

    await expect(loader.load()).rejects.toThrow(
      "Failed to load health messages config: Network down",
    );
  });

  it("throws a clear error when the config JSON is malformed", async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new Error("Unexpected token }")),
    });

    const loader = createHealthMessagesConfigLoader({ fetcher });

    await expect(loader.load()).rejects.toThrow(
      "Failed to parse health messages config: Unexpected token }",
    );
  });

  it("throws a clear error when required pools are missing or invalid", async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        good: [],
        notGood: ["still here"],
      }),
    });

    const loader = createHealthMessagesConfigLoader({ fetcher });

    await expect(loader.load()).rejects.toThrow(
      "Invalid health messages config: 'good' must be a non-empty string array",
    );
  });
});
