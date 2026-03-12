import { GOOD_HEALTH_MESSAGES } from "../data/healthMessages";
import { healthRepository as defaultRepository } from "../repositories/healthRepository";
import type { HealthRepository, HealthService } from "../types/health";

export interface CreateHealthServiceOptions {
  repository?: HealthRepository;
  random?: () => number;
}

export function createHealthService(
  options: CreateHealthServiceOptions = {},
): HealthService {
  const repository = options.repository ?? defaultRepository;
  const random = options.random ?? Math.random;

  return {
    async getStatus() {
      const { status } = await repository.checkHealth();
      const messageIndex = Math.floor(random() * GOOD_HEALTH_MESSAGES.length);

      return {
        status,
        timestamp: new Date().toISOString(),
        message: GOOD_HEALTH_MESSAGES[messageIndex],
      };
    },
  };
}

export const healthService = createHealthService();
