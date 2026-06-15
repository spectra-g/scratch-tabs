import { operationRegistry } from "../pipeline/OperationRegistry";
import { SavedPipeline } from "../pipeline/types";
import { QuickTransformItem, RecentItem } from "./types";

const MAX_RESULTS = 5;

export function searchItems(
  query: string,
  savedPipelines: SavedPipeline[],
): QuickTransformItem[] {
  const q = query.trim();

  const operations = operationRegistry
    .search(q)
    .map(
      (op): QuickTransformItem => ({
        type: "operation",
        id: op.id,
        name: op.name,
        description: op.description,
      }),
    );

  const lq = q.toLowerCase();
  const pipelines = savedPipelines
    .filter(
      (p) =>
        p.name &&
        (!lq ||
          p.name.toLowerCase().includes(lq) ||
          (p.description ?? "").toLowerCase().includes(lq)),
    )
    .map(
      (p): QuickTransformItem => ({
        type: "pipeline",
        id: p.id,
        name: p.name!,
        description: p.description ?? "",
      }),
    );

  return [...operations, ...pipelines].slice(0, MAX_RESULTS);
}

export function filterByRecents(
  recents: RecentItem[],
  savedPipelines: SavedPipeline[],
): QuickTransformItem[] {
  const items: QuickTransformItem[] = [];

  for (const recent of recents) {
    if (items.length >= MAX_RESULTS) break;

    if (recent.type === "operation") {
      const op = operationRegistry.getById(recent.id);
      if (!op) continue;
      items.push({
        type: "operation",
        id: op.id,
        name: op.name,
        description: op.description,
      });
    } else {
      const pipeline = savedPipelines.find((p) => p.id === recent.id);
      if (!pipeline?.name) continue;
      items.push({
        type: "pipeline",
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description ?? "",
      });
    }
  }

  return items;
}
