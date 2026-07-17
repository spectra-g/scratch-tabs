import { reconcile } from "../tablets/datareconcile/engine";
import { ReconcileInput } from "../tablets/datareconcile/types";

self.onmessage = ({ data }: MessageEvent<ReconcileInput>) => {
  try { self.postMessage({ result: reconcile(data) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : "Comparison failed." }); }
};
