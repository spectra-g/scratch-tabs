import type { DatabaseHealthProbe, DatabaseHealthResult } from "./DatabaseHealthProbe";

export class StubbedDatabaseHealthProbe implements DatabaseHealthProbe {
  async check(): Promise<DatabaseHealthResult> {
    return { healthy: true };
  }
}
