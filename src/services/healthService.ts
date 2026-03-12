import { healthRepository as defaultRepository } from "../repositories/healthRepository";
import type { HealthRepository, HealthService } from "../types/health";
import { createHealthMessagesConfigLoader, type HealthMessagesConfig, type HealthMessagesConfigLoader } from "./health/configLoader";
import { StubbedDatabaseHealthProbe } from "./health/StubbedDatabaseHealthProbe";
import type { DatabaseHealthProbe } from "./health/DatabaseHealthProbe";

export interface CreateHealthServiceOptions {
  repository?: HealthRepository;
  databaseProbe?: DatabaseHealthProbe;
  configLoader?: HealthMessagesConfigLoader;
  random?: () => number;
}

function selectMessage(messages: string[], random: () => number): string {
  const boundedRandom = Math.min(Math.max(random(), 0), 0.9999999999999999);
  const messageIndex = Math.floor(boundedRandom * messages.length);
  return messages[messageIndex];
}

export function createHealthService(
  options: CreateHealthServiceOptions = {},
): HealthService {
  const repository = options.repository ?? defaultRepository;
  const databaseProbe =
    options.databaseProbe ?? new StubbedDatabaseHealthProbe();
  const random = options.random ?? Math.random;

  let messagePools: HealthMessagesConfig | null = null;
  let configLoader = options.configLoader ?? null;

  async function initialize() {
    configLoader ??= createHealthMessagesConfigLoader();
    messagePools = await configLoader.load();
  }

  async function ensureInitialized() {
    if (!messagePools) {
      await initialize();
    }

    return messagePools as HealthMessagesConfig;
  }

  return {
    initialize,
    async getStatus() {
      const pools = await ensureInitialized();
      const [{ status }, database] = await Promise.all([
        repository.checkHealth(),
        databaseProbe.check(),
      ]);
      const resolvedStatus = database.healthy ? status : "unhealthy";
      const messages = resolvedStatus === "healthy" ? pools.good : pools.notGood;

      return {
        status: resolvedStatus,
        database,
        timestamp: new Date().toISOString(),
        message: selectMessage(messages, random),
      };
    },
  };
}

export const healthService = createHealthService();
