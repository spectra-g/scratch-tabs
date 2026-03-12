import { GOOD_HEALTH_MESSAGES } from "../../data/healthMessages";
import { NOT_GOOD_HEALTH_MESSAGES } from "../../constants/healthMessages";
import type { HealthRepository } from "../../types/health";
import type { DatabaseHealthProbe } from "../health/DatabaseHealthProbe";
import { createHealthService, healthService } from "../healthService";

describe("healthService", () => {
  it("returns a healthy status when the repository reports healthy", async () => {
    const repository: HealthRepository = {
      checkHealth: jest.fn().mockResolvedValue({ status: "healthy" }),
    };

    const service = createHealthService({ repository });

    await expect(service.getStatus()).resolves.toMatchObject({
      status: "healthy",
      message: expect.any(String),
      timestamp: expect.any(String),
    });
    expect(repository.checkHealth).toHaveBeenCalledTimes(1);
  });

  it("returns an unhealthy status when the database probe reports unhealthy", async () => {
    const repository: HealthRepository = {
      checkHealth: jest.fn().mockResolvedValue({ status: "healthy" }),
    };
    const databaseProbe: DatabaseHealthProbe = {
      check: jest.fn().mockResolvedValue({ healthy: false }),
    };

    const service = createHealthService({ repository, databaseProbe });

    await expect(service.getStatus()).resolves.toMatchObject({
      status: "unhealthy",
      database: { healthy: false },
    });
  });

  it("returns a message from the not-good pool when the database probe is unhealthy", async () => {
    const repository: HealthRepository = {
      checkHealth: jest.fn().mockResolvedValue({ status: "healthy" }),
    };
    const databaseProbe: DatabaseHealthProbe = {
      check: jest.fn().mockResolvedValue({ healthy: false }),
    };

    const response = await createHealthService({
      repository,
      databaseProbe,
      random: () => 0,
    }).getStatus();

    expect(response.status).toBe("unhealthy");
    expect(NOT_GOOD_HEALTH_MESSAGES).toContain(response.message);
  });

  it("preserves the response contract when the database probe is unhealthy", async () => {
    const repository: HealthRepository = {
      checkHealth: jest.fn().mockResolvedValue({ status: "healthy" }),
    };
    const databaseProbe: DatabaseHealthProbe = {
      check: jest.fn().mockResolvedValue({ healthy: false }),
    };

    const response = await createHealthService({
      repository,
      databaseProbe,
    }).getStatus();

    expect(response).toMatchObject({
      status: "unhealthy",
      message: expect.any(String),
      timestamp: expect.any(String),
      database: { healthy: false },
    });
    expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
  });

  it("may return different messages from the not-good pool across sequential unhealthy calls", async () => {
    const repository: HealthRepository = {
      checkHealth: jest.fn().mockResolvedValue({ status: "healthy" }),
    };
    const databaseProbe: DatabaseHealthProbe = {
      check: jest.fn().mockResolvedValue({ healthy: false }),
    };
    const random = jest
      .fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    const service = createHealthService({ repository, databaseProbe, random });
    const first = await service.getStatus();
    const second = await service.getStatus();

    expect(first.status).toBe("unhealthy");
    expect(second.status).toBe("unhealthy");
    expect(NOT_GOOD_HEALTH_MESSAGES).toContain(first.message);
    expect(NOT_GOOD_HEALTH_MESSAGES).toContain(second.message);
    expect(first.message).not.toBe(second.message);
  });

  it("returns the message selected from the good message pool", async () => {
    const repository: HealthRepository = {
      checkHealth: jest.fn().mockResolvedValue({ status: "healthy" }),
    };
    const random = jest.fn().mockReturnValue(0.99);

    const service = createHealthService({ repository, random });
    const response = await service.getStatus();

    expect(response.message).toBe(
      GOOD_HEALTH_MESSAGES[GOOD_HEALTH_MESSAGES.length - 1],
    );
    expect(GOOD_HEALTH_MESSAGES).toContain(response.message);
    expect(random).toHaveBeenCalledTimes(1);
  });

  it("may return different messages across sequential calls", async () => {
    const repository: HealthRepository = {
      checkHealth: jest.fn().mockResolvedValue({ status: "healthy" }),
    };
    const random = jest
      .fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    const service = createHealthService({ repository, random });
    const first = await service.getStatus();
    const second = await service.getStatus();

    expect(first.message).not.toBe(second.message);
    expect(random).toHaveBeenCalledTimes(2);
  });

  it("encapsulates message selection instead of leaking repository fields", async () => {
    const repository: HealthRepository = {
      checkHealth: jest.fn().mockResolvedValue({
        status: "healthy",
        message: "leaky repository message",
      }),
    };

    const response = await createHealthService({ repository }).getStatus();

    expect(response.status).toBe("healthy");
    expect(response.message).not.toBe("leaky repository message");
    expect(GOOD_HEALTH_MESSAGES).toContain(response.message);
  });

  it("exposes a ready-to-use default service for consumers", async () => {
    await expect(healthService.getStatus()).resolves.toMatchObject({
      status: "healthy",
      message: expect.any(String),
      timestamp: expect.any(String),
    });
  });
});
