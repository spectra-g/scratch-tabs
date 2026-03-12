import type { HealthRepository } from "../../types/health";
import type { DatabaseHealthProbe } from "../health/DatabaseHealthProbe";
import type { HealthMessagesConfig, HealthMessagesConfigLoader } from "../health/configLoader";
import { createHealthService } from "../healthService";

function createRepository(status: "healthy" | "unhealthy" = "healthy"): HealthRepository {
  return {
    checkHealth: jest.fn().mockResolvedValue({ status }),
  };
}

function createDatabaseProbe(healthy = true): DatabaseHealthProbe {
  return {
    check: jest.fn().mockResolvedValue({ healthy }),
  };
}

function createConfigLoader(
  config: HealthMessagesConfig,
): HealthMessagesConfigLoader {
  return {
    load: jest.fn().mockResolvedValue(config),
  };
}

describe("healthService", () => {
  it("initializes by loading both message pools from external config", async () => {
    const configLoader = createConfigLoader({
      good: ["Config says healthy"],
      notGood: ["Config says unhealthy"],
    });

    const service = createHealthService({
      repository: createRepository(),
      databaseProbe: createDatabaseProbe(),
      configLoader,
      random: () => 0,
    });

    await service.initialize();
    const healthy = await service.getStatus();

    expect(configLoader.load).toHaveBeenCalledTimes(1);
    expect(healthy.message).toBe("Config says healthy");
  });

  it("picks up changed config after re-initialization without code changes", async () => {
    const configLoader: HealthMessagesConfigLoader = {
      load: jest
        .fn()
        .mockResolvedValueOnce({
          good: ["Initial message"],
          notGood: ["Initial unhealthy"],
        })
        .mockResolvedValueOnce({
          good: ["Updated message"],
          notGood: ["Updated unhealthy"],
        }),
    };

    const service = createHealthService({
      repository: createRepository(),
      databaseProbe: createDatabaseProbe(),
      configLoader,
      random: () => 0,
    });

    await service.initialize();
    const first = await service.getStatus();
    await service.initialize();
    const second = await service.getStatus();

    expect(first.message).toBe("Initial message");
    expect(second.message).toBe("Updated message");
    expect(configLoader.load).toHaveBeenCalledTimes(2);
  });

  it("preserves the health response contract while sourcing messages externally", async () => {
    const service = createHealthService({
      repository: createRepository(),
      databaseProbe: createDatabaseProbe(),
      configLoader: createConfigLoader({
        good: ["Healthy contract message"],
        notGood: ["Unhealthy contract message"],
      }),
      random: () => 0,
    });

    const response = await service.getStatus();

    expect(response).toMatchObject({
      status: "healthy",
      timestamp: expect.any(String),
      message: "Healthy contract message",
      database: { healthy: true },
    });
    expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
  });

  it("uses the last configured message when the random source hits the upper bound", async () => {
    const service = createHealthService({
      repository: createRepository(),
      databaseProbe: createDatabaseProbe(),
      configLoader: createConfigLoader({
        good: ["First healthy", "Last healthy"],
        notGood: ["First unhealthy", "Last unhealthy"],
      }),
      random: () => 1,
    });

    await expect(service.getStatus()).resolves.toMatchObject({
      message: "Last healthy",
    });
  });

  it("throws a clear error when config loading fails instead of silently defaulting", async () => {
    const service = createHealthService({
      repository: createRepository(),
      databaseProbe: createDatabaseProbe(),
      configLoader: {
        load: jest
          .fn()
          .mockRejectedValue(new Error("Failed to load health messages config")),
      },
    });

    await expect(service.initialize()).rejects.toThrow(
      "Failed to load health messages config",
    );
  });
});
