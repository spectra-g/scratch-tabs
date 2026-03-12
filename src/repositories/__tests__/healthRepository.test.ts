import { healthRepository } from "../healthRepository";

describe("healthRepository", () => {
  it("returns a healthy status from the stubbed health check", async () => {
    await expect(healthRepository.checkHealth()).resolves.toEqual({
      status: "healthy",
    });
  });
});
