import type { DatabaseHealthProbe } from "../health/DatabaseHealthProbe";
import { createHealthService } from "../healthService";

describe("healthService database integration", () => {
  it("calls the database probe and includes its result in the health response", async () => {
    const databaseProbe: DatabaseHealthProbe = {
      check: jest.fn().mockResolvedValue({ healthy: true }),
    };

    const service = createHealthService({
      databaseProbe,
      configLoader: {
        load: jest.fn().mockResolvedValue({
          good: ["Healthy integration message"],
          notGood: ["Unhealthy integration message"],
        }),
      },
      random: () => 0,
    });
    const response = await service.getStatus();

    expect(databaseProbe.check).toHaveBeenCalledTimes(1);
    expect(response).toMatchObject({
      status: "healthy",
      database: { healthy: true },
      message: expect.any(String),
      timestamp: expect.any(String),
    });
  });
});
