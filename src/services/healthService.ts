import { GOOD_HEALTH_MESSAGES } from "../data/healthMessages";
import { healthRepository as defaultRepository } from "../repositories/healthRepository";
import { StubbedDatabaseHealthProbe } from "./health/StubbedDatabaseHealthProbe";
import type { DatabaseHealthProbe } from "./health/DatabaseHealthProbe";
import type { HealthRepository, HealthService } from "../types/health";

export interface CreateHealthServiceOptions {
  repository?: HealthRepository;
  databaseProbe?: DatabaseHealthProbe;
  random?: () => number;
}

export function createHealthService(
  options: CreateHealthServiceOptions = {},
): HealthService {
  const repository = options.repository ?? defaultRepository;
  const databaseProbe =
    options.databaseProbe ?? new StubbedDatabaseHealthProbe();
  const random = options.random ?? Math.random;

  return {
    async getStatus() {
      const [{ status }, database] = await Promise.all([
        repository.checkHealth(),
        databaseProbe.check(),
      ]);
      const messageIndex = Math.floor(random() * GOOD_HEALTH_MESSAGES.length);

      return {
        status,
        database,
        timestamp: new Date().toISOString(),
        message: GOOD_HEALTH_MESSAGES[messageIndex],
      };
    },
  };
}

export const healthService = createHealthService();
