import type {
  DatabaseHealthProbe,
  DatabaseHealthResult,
} from "../health/DatabaseHealthProbe";
import { StubbedDatabaseHealthProbe } from "../health/StubbedDatabaseHealthProbe";

describe("StubbedDatabaseHealthProbe", () => {
  it("returns a healthy database result", async () => {
    const probe = new StubbedDatabaseHealthProbe();

    await expect(probe.check()).resolves.toEqual({ healthy: true });
  });

  it("returns a stable contract shape for future probe implementations", async () => {
    const probe: DatabaseHealthProbe = new StubbedDatabaseHealthProbe();
    const result: DatabaseHealthResult = await probe.check();

    expect(result).toEqual({ healthy: true });
    expect(typeof result.healthy).toBe("boolean");
  });
});
