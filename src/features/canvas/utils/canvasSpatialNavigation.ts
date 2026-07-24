import type { CanvasItem } from "../types";

export type CanvasNavigationDirection = "up" | "right" | "down" | "left";

export const CANVAS_READING_ROW_TOLERANCE = 24;

type NavigableItem = Pick<
  CanvasItem,
  "id" | "x" | "y" | "width" | "height" | "zIndex" | "createdAt"
>;

interface AxisInterval {
  start: number;
  end: number;
}

interface DirectionalScore<T extends NavigableItem> {
  item: T;
  primaryGap: number;
  perpendicularGap: number;
  projectedBoundsOverlap: boolean;
  perpendicularCenterDistance: number;
}

const PRIMARY_GAP_WEIGHT = 4;
const PERPENDICULAR_GAP_WEIGHT = 2;
const ALIGNMENT_OVERLAP_BONUS = 200;

const intervalGap = (left: AxisInterval, right: AxisInterval): number =>
  Math.max(0, left.start - right.end, right.start - left.end);

const intervalsOverlap = (left: AxisInterval, right: AxisInterval): boolean =>
  intervalGap(left, right) === 0;

const stableItemComparison = (
  left: NavigableItem,
  right: NavigableItem,
): number =>
  left.zIndex - right.zIndex ||
  left.createdAt - right.createdAt ||
  left.id.localeCompare(right.id);

const centerX = (item: NavigableItem): number => item.x + item.width / 2;
const centerY = (item: NavigableItem): number => item.y + item.height / 2;

const getDirectionalScore = <T extends NavigableItem>(
  origin: NavigableItem,
  candidate: T,
  direction: CanvasNavigationDirection,
): DirectionalScore<T> | null => {
  const horizontal = direction === "left" || direction === "right";
  const originPrimaryCenter = horizontal ? centerX(origin) : centerY(origin);
  const candidatePrimaryCenter = horizontal
    ? centerX(candidate)
    : centerY(candidate);
  const forwardCenterDistance =
    direction === "right" || direction === "down"
      ? candidatePrimaryCenter - originPrimaryCenter
      : originPrimaryCenter - candidatePrimaryCenter;

  if (forwardCenterDistance <= 0) return null;

  const originPrimary: AxisInterval = horizontal
    ? { start: origin.x, end: origin.x + origin.width }
    : { start: origin.y, end: origin.y + origin.height };
  const candidatePrimary: AxisInterval = horizontal
    ? { start: candidate.x, end: candidate.x + candidate.width }
    : { start: candidate.y, end: candidate.y + candidate.height };
  const originPerpendicular: AxisInterval = horizontal
    ? { start: origin.y, end: origin.y + origin.height }
    : { start: origin.x, end: origin.x + origin.width };
  const candidatePerpendicular: AxisInterval = horizontal
    ? { start: candidate.y, end: candidate.y + candidate.height }
    : { start: candidate.x, end: candidate.x + candidate.width };

  return {
    item: candidate,
    primaryGap: intervalGap(originPrimary, candidatePrimary),
    perpendicularGap: intervalGap(originPerpendicular, candidatePerpendicular),
    projectedBoundsOverlap: intervalsOverlap(
      originPerpendicular,
      candidatePerpendicular,
    ),
    perpendicularCenterDistance: Math.abs(
      (originPerpendicular.start + originPerpendicular.end) / 2 -
        (candidatePerpendicular.start + candidatePerpendicular.end) / 2,
    ),
  };
};

const weightedDirectionalScore = (
  score: DirectionalScore<NavigableItem>,
): number =>
  score.primaryGap * PRIMARY_GAP_WEIGHT +
  score.perpendicularGap * PERPENDICULAR_GAP_WEIGHT +
  score.perpendicularCenterDistance -
  (score.projectedBoundsOverlap ? ALIGNMENT_OVERLAP_BONUS : 0);

const compareDirectionalScores = <T extends NavigableItem>(
  left: DirectionalScore<T>,
  right: DirectionalScore<T>,
): number =>
  weightedDirectionalScore(left) - weightedDirectionalScore(right) ||
  stableItemComparison(left.item, right.item);

/**
 * Finds the nearest card in a directional half-plane. Forward bounds gaps are
 * weighted most heavily, with perpendicular distance and a fixed projected-
 * bounds alignment bonus completing the zoom-independent score.
 */
export const findDirectionalCanvasNeighbor = <T extends NavigableItem>(
  items: readonly T[],
  originItemId: string,
  direction: CanvasNavigationDirection,
): T | null => {
  const origin = items.find((item) => item.id === originItemId);
  if (!origin) return null;

  return (
    items
      .filter((item) => item.id !== originItemId)
      .map((item) => getDirectionalScore(origin, item, direction))
      .filter((score): score is DirectionalScore<T> => score !== null)
      .sort(compareDirectionalScores)[0]?.item ?? null
  );
};

interface CanvasReadingRow<T extends NavigableItem> {
  top: number;
  bottom: number;
  items: T[];
}

const compareTopThenLeft = (
  left: NavigableItem,
  right: NavigableItem,
): number =>
  left.y - right.y || left.x - right.x || stableItemComparison(left, right);

const compareLeftWithinRow = (
  left: NavigableItem,
  right: NavigableItem,
): number =>
  left.x - right.x || left.y - right.y || stableItemComparison(left, right);

/**
 * Groups cards whose vertical bounds overlap or are within 24 document units,
 * then reads rows top-to-bottom and each row left-to-right.
 */
export const getCanvasSpatialReadingOrder = <T extends NavigableItem>(
  items: readonly T[],
  rowTolerance = CANVAS_READING_ROW_TOLERANCE,
): T[] => {
  const rows: CanvasReadingRow<T>[] = [];

  for (const item of [...items].sort(compareTopThenLeft)) {
    const itemInterval = { start: item.y, end: item.y + item.height };
    const row = rows.find(
      (candidate) =>
        intervalGap(itemInterval, {
          start: candidate.top,
          end: candidate.bottom,
        }) <= rowTolerance,
    );

    if (row) {
      row.top = Math.min(row.top, item.y);
      row.bottom = Math.max(row.bottom, item.y + item.height);
      row.items.push(item);
    } else {
      rows.push({
        top: item.y,
        bottom: item.y + item.height,
        items: [item],
      });
    }
  }

  return rows
    .sort(
      (left, right) =>
        left.top - right.top ||
        Math.min(...left.items.map((item) => item.x)) -
          Math.min(...right.items.map((item) => item.x)),
    )
    .flatMap((row) => row.items.sort(compareLeftWithinRow));
};
