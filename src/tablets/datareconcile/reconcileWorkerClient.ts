import { ReconcileInput, ReconcileResult } from "./types";

export interface ReconcileWorkerClient {
  onmessage: ((event: MessageEvent<{ result?: ReconcileResult; error?: string }>) => void) | null;
  postMessage(input: ReconcileInput): void;
  terminate(): void;
}

export const createReconcileWorker = (): ReconcileWorkerClient =>
  new Worker(new URL("../../workers/dataReconcileWorker.ts", import.meta.url), { type: "module" });
