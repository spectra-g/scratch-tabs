import { getDetectedCanvasCodeLanguage } from "../utils/canvasItemFactory";
import type { CanvasEdge, CanvasItem } from "../types";
import {
  DERIVED_ITEM_SIZE,
  planDerivedPosition,
} from "./transformLayout";

export interface TransformOperationRef {
  id: string;
  name: string;
}

export interface QuickTransformPlan {
  items: CanvasItem[];
  edges: CanvasEdge[];
  targetId: string;
}

/** Content a transform can run on. Code cards use source, text cards use text. */
export const getTransformSourceContent = (item: CanvasItem): string | null => {
  if (item.type === "code") return item.source;
  if (item.type === "text") return item.text;
  return null;
};

export const isTransformableSource = (item: CanvasItem): boolean =>
  getTransformSourceContent(item) !== null;

/**
 * Create the derived item + edge for a quick transform output.
 * Pure: output must already be computed; IDs and clock are injectable.
 */
export const planQuickTransform = (args: {
  items: readonly CanvasItem[];
  edges: readonly CanvasEdge[];
  sourceId: string;
  operation: TransformOperationRef;
  params: Record<string, unknown>;
  output: string;
  targetId?: string;
  edgeId?: string;
  now?: number;
}): QuickTransformPlan => {
  const {
    items,
    edges,
    sourceId,
    operation,
    params,
    output,
    targetId: requestedTargetId,
    edgeId: requestedEdgeId,
    now = Date.now(),
  } = args;

  const source = items.find((item) => item.id === sourceId);
  if (!source) throw new Error("The source card is no longer available.");
  if (!isTransformableSource(source)) {
    throw new Error("Only text and code cards can be transformed.");
  }
  const targetId = requestedTargetId ?? crypto.randomUUID();
  const edgeId = requestedEdgeId ?? crypto.randomUUID();
  if (items.some((item) => item.id === targetId)) {
    throw new Error("A card with the planned id already exists.");
  }

  const siblingCount = edges.filter(
    (edge) => edge.sourceItemId === sourceId,
  ).length;
  const position = planDerivedPosition(source, siblingCount);
  const zIndex =
    items.reduce((top, item) => Math.max(top, item.zIndex), 0) + 1;
  const detected = getDetectedCanvasCodeLanguage(output);

  const target: CanvasItem = {
    id: targetId,
    type: "code",
    x: position.x,
    y: position.y,
    width: DERIVED_ITEM_SIZE.width,
    height: DERIVED_ITEM_SIZE.height,
    zIndex,
    createdAt: now,
    updatedAt: now,
    source: output,
    language: detected.language,
    languageLocked: detected.languageLocked,
    collapsed: false,
    wrap: false,
    derivedFrom: {
      sourceItemId: sourceId,
      operationId: operation.id,
      operationName: operation.name,
      params: { ...params },
    },
  };

  const edge: CanvasEdge = {
    id: edgeId,
    sourceItemId: sourceId,
    targetItemId: targetId,
    label: operation.name,
  };

  return { items: [...items, target], edges: [...edges, edge], targetId };
};

/**
 * Downstream derived items that must refresh when a source changes,
 * in execution order (parents before children). Follows derivedFrom
 * links so orphans of deleted edges are still found. Cycle-safe.
 */
export const collectRefreshOrder = (
  items: readonly CanvasItem[],
  changedSourceId: string,
): string[] => {
  const bySource = new Map<string, CanvasItem[]>();
  for (const item of items) {
    if (item.type !== "code" || !item.derivedFrom) continue;
    const list = bySource.get(item.derivedFrom.sourceItemId) ?? [];
    list.push(item);
    bySource.set(item.derivedFrom.sourceItemId, list);
  }

  const order: string[] = [];
  const visited = new Set<string>([changedSourceId]);
  const queue: string[] = [changedSourceId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const child of bySource.get(current) ?? []) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      order.push(child.id);
      queue.push(child.id);
    }
  }
  return order;
};

export type RefreshOutcome =
  | { ok: true; output: string }
  | { ok: false; error: string };

/** Apply refresh outcomes to derived items. Failures keep old output + error. */
export const applyRefreshOutcomes = (
  items: readonly CanvasItem[],
  outcomes: ReadonlyMap<string, RefreshOutcome>,
  now = Date.now(),
): CanvasItem[] =>
  items.map((item) => {
    const outcome = outcomes.get(item.id);
    if (!outcome || item.type !== "code" || !item.derivedFrom) return item;
    if (!outcome.ok) {
      return item.transformError === outcome.error
        ? item
        : { ...item, transformError: outcome.error, updatedAt: now };
    }
    if (item.source === outcome.output && item.transformError === undefined) {
      return item;
    }
    const detected = getDetectedCanvasCodeLanguage(outcome.output);
    const next = {
      ...item,
      source: outcome.output,
      language: detected.language,
      languageLocked: detected.languageLocked,
      updatedAt: now,
    };
    delete next.transformError;
    return next;
  });

/** Detach a derived card: it keeps its content, becomes editable, loses its link. */
export const detachDerivedItem = (
  items: readonly CanvasItem[],
  edges: readonly CanvasEdge[],
  targetId: string,
): { items: CanvasItem[]; edges: CanvasEdge[] } => {
  const target = items.find((item) => item.id === targetId);
  if (!target || target.type !== "code" || !target.derivedFrom) {
    return { items: [...items], edges: [...edges] };
  }
  const sourceId = target.derivedFrom.sourceItemId;
  const detached = { ...target, updatedAt: Date.now() };
  delete detached.derivedFrom;
  delete detached.transformError;
  return {
    items: items.map((item) => (item.id === targetId ? detached : item)),
    edges: edges.filter(
      (edge) =>
        !(
          edge.targetItemId === targetId && edge.sourceItemId === sourceId
        ),
    ),
  };
};

/** Remove cards and any edge touching them. Survivors keep their content. */
export const removeItemsWithEdges = (
  items: readonly CanvasItem[],
  edges: readonly CanvasEdge[],
  idsToRemove: ReadonlySet<string>,
): { items: CanvasItem[]; edges: CanvasEdge[] } => ({
  items: items.filter((item) => !idsToRemove.has(item.id)),
  edges: edges.filter(
    (edge) =>
      !idsToRemove.has(edge.sourceItemId) &&
      !idsToRemove.has(edge.targetItemId),
  ),
});

/** Duplicated cards become independent: derivation never copies over. */
export const withoutDerivation = (item: CanvasItem): CanvasItem => {
  if (item.type !== "code" || !item.derivedFrom) return item;
  const copy = { ...item };
  delete copy.derivedFrom;
  delete copy.transformError;
  return copy;
};

export const stripDerivations = (items: readonly CanvasItem[]): CanvasItem[] =>
  items.map(withoutDerivation);
