export interface HealthMessagesConfig {
  good: string[];
  notGood: string[];
}

export interface HealthMessagesConfigLoader {
  load(): Promise<HealthMessagesConfig>;
}

interface FetchLikeResponse {
  ok: boolean;
  status?: number;
  statusText?: string;
  json(): Promise<unknown>;
}

interface CreateHealthMessagesConfigLoaderOptions {
  fetcher?: (input: string, init?: RequestInit) => Promise<FetchLikeResponse>;
  url?: string;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === "string")
  );
}

function validateConfig(config: unknown): HealthMessagesConfig {
  if (typeof config !== "object" || config === null) {
    throw new Error("Invalid health messages config: expected an object");
  }

  const candidate = config as Record<string, unknown>;

  if (!isNonEmptyStringArray(candidate.good)) {
    throw new Error(
      "Invalid health messages config: 'good' must be a non-empty string array",
    );
  }

  if (!isNonEmptyStringArray(candidate.notGood)) {
    throw new Error(
      "Invalid health messages config: 'notGood' must be a non-empty string array",
    );
  }

  return {
    good: [...candidate.good],
    notGood: [...candidate.notGood],
  };
}

export function createHealthMessagesConfigLoader(
  options: CreateHealthMessagesConfigLoaderOptions = {},
): HealthMessagesConfigLoader {
  const fetcher = options.fetcher ?? globalThis.fetch?.bind(globalThis);
  const url = options.url ?? "/health-messages.json";

  if (!fetcher) {
    throw new Error("Health messages config loader requires fetch support");
  }

  return {
    async load() {
      let response: FetchLikeResponse;
      try {
        response = await fetcher(url, { cache: "no-store" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown fetch error";
        throw new Error(`Failed to load health messages config: ${message}`);
      }

      if (!response.ok) {
        throw new Error(
          `Failed to load health messages config: ${response.status ?? "unknown"} ${response.statusText ?? ""}`.trim(),
        );
      }

      let parsed: unknown;
      try {
        parsed = await response.json();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown parse error";
        throw new Error(`Failed to parse health messages config: ${message}`);
      }

      return validateConfig(parsed);
    },
  };
}
