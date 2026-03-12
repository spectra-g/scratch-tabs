export interface DatabaseHealthResult {
  healthy: boolean;
}

export interface DatabaseHealthProbe {
  check(): Promise<DatabaseHealthResult>;
}
