import { scanSecrets } from "./scanEngine";
import type { SecretScanResult } from "../types";

interface ScanRequest {
  id: number;
  input: string;
}

interface ScanResponse {
  id: number;
  result?: SecretScanResult;
  error?: string;
}

self.onmessage = (event: MessageEvent<ScanRequest>) => {
  const { id, input } = event.data;
  try {
    const result = scanSecrets(input);
    (self as DedicatedWorkerGlobalScope).postMessage({ id, result } satisfies ScanResponse);
  } catch (err) {
    (self as DedicatedWorkerGlobalScope).postMessage({ id, error: String(err) } satisfies ScanResponse);
  }
};
