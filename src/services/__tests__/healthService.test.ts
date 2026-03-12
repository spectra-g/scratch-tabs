import { getHealthStatus } from "../healthService";
import { HEALTH_MESSAGES } from "../../constants/healthMessages";

describe("getHealthStatus", () => {
  it("returns a healthy status response", async () => {
    await expect(getHealthStatus()).resolves.toMatchObject({
      status: "healthy",
    });
  });

  it("includes an ISO-8601 timestamp", async () => {
    const response = await getHealthStatus();

    expect(response.timestamp).toEqual(expect.any(String));
    expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
  });

  it("includes a quirky message from the approved pool", async () => {
    const response = await getHealthStatus();

    expect(response.message).toEqual(expect.any(String));
    expect(HEALTH_MESSAGES).toContain(response.message);
  });

  it("uses an injected probe instead of directly accessing a data layer", async () => {
    const probe = {
      check: jest.fn().mockResolvedValue(true),
    };

    const response = await getHealthStatus({ probe });

    expect(probe.check).toHaveBeenCalledTimes(1);
    expect(response.status).toBe("healthy");
  });
});
