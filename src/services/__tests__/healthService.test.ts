import { GOOD_HEALTH_MESSAGES } from "../../data/healthMessages";
import type { HealthRepository } from "../../types/health";
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
