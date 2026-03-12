import { HEALTH_MESSAGES } from "../constants/healthMessages";

export interface HealthProbe {
  check: () => Promise<boolean>;
}

export interface GetHealthStatusOptions {
  probe?: HealthProbe;
}

export interface HealthResponse {
  status: "healthy";
  timestamp: string;
  message: (typeof HEALTH_MESSAGES)[number];
}

export async function getHealthStatus(
  options: GetHealthStatusOptions = {},
): Promise<HealthResponse> {
  await options.probe?.check();

  const message =
    HEALTH_MESSAGES[Math.floor(Math.random() * HEALTH_MESSAGES.length)];

  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    message,
  };
}
