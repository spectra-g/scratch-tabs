import type { DatabaseHealthResult } from "../services/health/DatabaseHealthProbe";

export type HealthStatus = "healthy" | "unhealthy";

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
}

export interface HealthResult {
  status: HealthStatus;
  timestamp: string;
  message: string;
  database: DatabaseHealthResult;
}

export interface HealthRepository {
  checkHealth(): Promise<HealthCheckResult>;
}

export interface HealthService {
  initialize(): Promise<void>;
  getStatus(): Promise<HealthResult>;
}
