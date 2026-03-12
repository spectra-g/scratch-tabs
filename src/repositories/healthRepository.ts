import type { HealthRepository } from "../types/health";

export const healthRepository: HealthRepository = {
  async checkHealth() {
    return { status: "healthy" };
  },
};
