import { Shape, Point } from '../types';

// --- CORE HELPER FUNCTIONS ---
const getBoundingBox = (
  points: Point[],
): { minX: number; minY: number; maxX: number; maxY: number } => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};
const distance = (p1: Point, p2: Point): number =>
  Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
const getPathLength = (points: Point[]): number => {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
  }
  return length;
};
const isClosed = (
  points: Point[],
  box: { minX: number; minY: number; maxX: number; maxY: number },
): boolean => {
  if (points.length < 3) return false;
  const start = points[0];
  const end = points[points.length - 1];
  const diagonal = Math.sqrt(
    Math.pow(box.maxX - box.minX, 2) + Math.pow(box.maxY - box.minY, 2),
  );
  const threshold = diagonal * 0.25;
  return distance(start, end) < threshold;
};
function getCentroid(points: Point[]): Point {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / n, y: sum.y / n };
}

/**
 * Checks if a series of points represents a curve.
 * @param points The points drawn by the user.
 * @param pathLength The pre-calculated length of the path.
 * @param threshold A value between 0 and 1. A lower value requires a more pronounced curve.
 * @returns True if the path is considered a curve.
 */
const isCurved = (points: Point[], pathLength: number, threshold: number = 0.97): boolean => {
  if (points.length < 3) return false;
  const directDistance = distance(points[0], points[points.length - 1]);
  if (pathLength === 0) return false;
  // If the direct distance is much shorter than the path length, it's a curve.
  return (directDistance / pathLength) < threshold;
};

/**
 * Finds the point in a path that is furthest from the straight line connecting the start and end points.
 * This will serve as the control point for our Bézier curve.
 */
const findFurthestPoint = (points: Point[]): Point => {
    let maxDist = -1;
    let furthestPoint = points[Math.floor(points.length / 2)]; // Default to midpoint
    const start = points[0];
    const end = points[points.length - 1];

    const lineDist = distance(start, end);
    if (lineDist === 0) return furthestPoint;

    for (let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        const dist = Math.abs((end.y - start.y) * p.x - (end.x - start.x) * p.y + end.x * start.y - end.y * start.x) / lineDist;
        if (dist > maxDist) {
            maxDist = dist;
            furthestPoint = p;
        }
    }
    return furthestPoint;
};

/**
 * Analyzes corners of an open path to see if it's an orthogonal line candidate.
 * If it is, it returns a new set of points that are perfectly straight.
 * @param points The points drawn by the user.
 * @returns A new array of points for the orthogonal line, or null if it's not a match.
 */
const detectOrthogonalLine = (points: Point[]): Point[] | null => {
  if (points.length < 3) return null;

  // Simplify points to remove noise, with a slightly higher tolerance
  const simplifiedPoints = simplifyPoints(points, 8.0);
  // Use a stricter angle threshold to only find sharp corners
  const corners = getCorners(simplifiedPoints, 70);

  // We are looking for 1 or 2 corners (which means 2 or 3 segments)
  if (corners.length < 1 || corners.length > 2) {
    return null;
  }

  const startPoint = simplifiedPoints[0];
  const endPoint = simplifiedPoints[simplifiedPoints.length - 1];
  const allPoints = [startPoint, ...corners, endPoint];
  const newPoints: Point[] = [startPoint];

  for (let i = 0; i < allPoints.length - 1; i++) {
    const p1 = newPoints[i];
    const p2 = allPoints[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (dx === 0 && dy === 0) continue;

    const angleRatio = Math.abs(dx) > Math.abs(dy) ? Math.abs(dy / dx) : Math.abs(dx / dy);

    // If the angle of a segment deviates more than ~20 degrees from a cardinal axis,
    // it's probably not part of an intended orthogonal line. tan(20 deg) ~= 0.36
    if (angleRatio > 0.36) {
        return null;
    }

    // Snap to horizontal or vertical based on the dominant axis of the segment
    if (Math.abs(dx) > Math.abs(dy)) {
      // More horizontal
      newPoints.push({ x: p2.x, y: p1.y });
    } else {
      // More vertical
      newPoints.push({ x: p1.x, y: p2.y });
    }
  }

  // Final check to ensure the straightened line is valid
  if (newPoints.length < 3) return null;
  for (let i = 1; i < newPoints.length; i++) {
    if (distance(newPoints[i - 1], newPoints[i]) < 20) return null; // Ignore tiny segments
  }

  return newPoints;
};

// --- HEURISTIC CALCULATORS ---
function getDiamondScore(
  points: Point[],
  box: { minX: number; minY: number; maxX: number; maxY: number },
): number {
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  const diagonal = Math.sqrt(width * width + height * height);
  if (diagonal === 0) return 1.0;

  const midpoints = [
    { x: box.minX + width / 2, y: box.minY },
    { x: box.maxX, y: box.minY + height / 2 },
    { x: box.minX + width / 2, y: box.maxY },
    { x: box.minX, y: box.minY + height / 2 },
  ];
  let min_dists = midpoints.map((mp) =>
    Math.min(...points.map((p) => distance(p, mp))),
  );
  return min_dists.reduce((a, b) => a + b, 0) / diagonal;
}

function getCircleScore(
  points: Point[],
  box: { minX: number; minY: number; maxX: number; maxY: number },
): number {
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  const center = { x: box.minX + width / 2, y: box.minY + height / 2 };
  const radius = Math.min(width, height) / 2;

  if (radius === 0) return 1.0;

  const distances = points.map((p) => Math.abs(distance(p, center) - radius));
  const avgDeviation = distances.reduce((a, b) => a + b, 0) / distances.length;

  return avgDeviation / radius;
}

// --- STRAIGHT SEGMENT & ORIENTATION DETECTION ---
function getCorners(points: Point[], angleThresholdDeg: number): Point[] {
  if (points.length < 3) return [];

  const corners: Point[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];

    const v1 = { x: p1.x - p0.x, y: p1.y - p0.y };
    const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) continue;

    const cosAngle = dot / (mag1 * mag2);
    const angle =
      (Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180) / Math.PI;

    if (angle < 180 - angleThresholdDeg) {
      corners.push(p1);
    }
  }
  return corners;
}

function getOrientationScore(points: Point[]): number {
  const simplified = simplifyPoints(points, 8.0);
  const corners = getCorners(simplified, 30);

  if (corners.length < 3) return 45;

  const segments = [];
  for (let i = 0; i < corners.length; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % corners.length];
    segments.push({ p1, p2 });
  }

  let totalDeviation = 0;
  for (const seg of segments) {
    const angleRad = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);
    let angleDeg = Math.abs((angleRad * 180) / Math.PI);
    angleDeg = angleDeg % 90;
    const deviation = Math.min(angleDeg, 90 - angleDeg);
    totalDeviation += deviation;
  }

  return totalDeviation / segments.length;
}

function countStraightSegmentsAndLengths(
  points: Point[],
  angleThresholdDeg = 20,
): { count: number; lengths: number[] } {
  if (points.length < 3) return { count: 0, lengths: [] };

  const simplified = simplifyPoints(points, 8.0);
  if (simplified.length < 3) return { count: 0, lengths: [] };

  const corners = getCorners(simplified, angleThresholdDeg * 0.6);

  const mergedCorners: Point[] = [];
  const minSegmentLength = 20;

  for (let i = 0; i < corners.length; i++) {
    const currentCorner = corners[i];
    if (mergedCorners.length > 0) {
      const lastCorner = mergedCorners[mergedCorners.length - 1];
      if (distance(currentCorner, lastCorner) < minSegmentLength) continue;
    }
    mergedCorners.push(currentCorner);
  }

  let lengths: number[] = [];
  if (mergedCorners.length > 1) {
    for (let i = 0; i < mergedCorners.length; i++) {
      const a = mergedCorners[i];
      const b = mergedCorners[(i + 1) % mergedCorners.length];
      lengths.push(distance(a, b));
    }
  }

  return { count: mergedCorners.length, lengths };
}

function segmentsAreRoughlyEqual(
  lengths: number[],
  tolerance: number = 0.3,
): boolean {
  if (lengths.length < 3) return false;
  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);
  if (minLen === 0) return false;
  return maxLen / minLen < 1 + tolerance;
}

function simplifyPoints(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  const findPerpendicularDistance = (
    point: Point,
    lineStart: Point,
    lineEnd: Point,
  ): number => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    const param = dot / lenSq;
    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  let maxDistance = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = findPerpendicularDistance(
      points[i],
      points[0],
      points[points.length - 1],
    );
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }

  if (maxDistance > tolerance) {
    const firstLine = simplifyPoints(points.slice(0, index + 1), tolerance);
    const secondLine = simplifyPoints(points.slice(index), tolerance);
    return firstLine.slice(0, -1).concat(secondLine);
  } else {
    return [points[0], points[points.length - 1]];
  }
}

// --- $1 GESTURE RECOGNIZER IMPLEMENTATION ---
const NUM_POINTS = 64;
const SQUARE_SIZE = 250.0;
const ANGLE_RANGE = 45.0;
const ANGLE_PRECISION = 2.0;
const PHI = 0.5 * (-1.0 + Math.sqrt(5.0));

class DollarRecognizer {
  private templates: { name: string; points: Point[] }[] = [];
  constructor() {
    this.addTemplate("triangle", [
      { x: 125, y: 23.2 },
      { x: 22.2, y: 226.8 },
      { x: 227.8, y: 226.8 },
      { x: 125, y: 23.2 },
    ]);
    this.addTemplate("circle", [
      { x: 137.2, y: 30.2 },
      { x: 89.4, y: 32.4 },
      { x: 50.2, y: 51.8 },
      { x: 25.2, y: 84.8 },
      { x: 12.6, y: 127.8 },
      { x: 17.6, y: 174 },
      { x: 37.4, y: 208.6 },
      { x: 71.4, y: 231.8 },
      { x: 113.6, y: 241.8 },
      { x: 156.8, y: 238.4 },
      { x: 195.4, y: 220.6 },
      { x: 221.2, y: 190.4 },
      { x: 235.2, y: 153.4 },
      { x: 235.8, y: 112.6 },
      { x: 223.8, y: 72 },
      { x: 198.8, y: 42.2 },
      { x: 166.4, y: 27.2 },
      { x: 137.2, y: 30.2 },
    ]);
  }
  public recognize(points: Point[]): { name: string; score: number } {
    const processedPoints = this.processPoints(points);
    if (processedPoints.length === 0) return { name: "unknown", score: 0.0 };
    let b = +Infinity;
    let t = -1;
    for (let i = 0; i < this.templates.length; i++) {
      const d = this.distanceAtBestAngle(processedPoints, this.templates[i]);
      if (d < b) {
        b = d;
        t = i;
      }
    }
    const score =
      t === -1
        ? 0.0
        : 1.0 -
          b /
            (0.5 *
              Math.sqrt(SQUARE_SIZE * SQUARE_SIZE + SQUARE_SIZE * SQUARE_SIZE));
    return { name: t === -1 ? "unknown" : this.templates[t].name, score };
  }
  private addTemplate(name: string, points: Point[]): void {
    this.templates.push({ name, points: this.processPoints(points) });
  }
  private processPoints(points: Point[]): Point[] {
    let resampled = this.resample(points, NUM_POINTS);
    if (resampled.length === 0) return [];
    const radians = this.indicativeAngle(resampled);
    resampled = this.rotateBy(resampled, -radians);
    resampled = this.scaleTo(resampled, SQUARE_SIZE);
    resampled = this.translateTo(resampled, { x: 0, y: 0 });
    return resampled;
  }
  private resample(points: Point[], n: number): Point[] {
    const pathLen = getPathLength(points);
    if (pathLen === 0) return [];
    const I = pathLen / (n - 1);
    let D = 0.0;
    const newPoints: Point[] = [points[0]];
    for (let i = 1; i < points.length && newPoints.length < n; i++) {
      const d = distance(points[i - 1], points[i]);
      if (D + d >= I) {
        const qx =
          points[i - 1].x + ((I - D) / d) * (points[i].x - points[i - 1].x);
        const qy =
          points[i - 1].y + ((I - D) / d) * (points[i].y - points[i - 1].y);
        const q = { x: qx, y: qy };
        newPoints.push(q);
        points.splice(i, 0, q);
        D = 0.0;
      } else {
        D += d;
      }
    }
    if (newPoints.length < n) {
      newPoints.push(points[points.length - 1]);
    }
    return newPoints.slice(0, n);
  }
  private indicativeAngle(points: Point[]): number {
    const c = getCentroid(points);
    return Math.atan2(c.y - points[0].y, c.x - points[0].x);
  }
  private rotateBy(points: Point[], radians: number): Point[] {
    const c = getCentroid(points);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return points.map((p) => ({
      x: (p.x - c.x) * cos - (p.y - c.y) * sin + c.x,
      y: (p.x - c.x) * sin + (p.y - c.y) * cos + c.y,
    }));
  }
  private scaleTo(points: Point[], size: number): Point[] {
    const B = getBoundingBox(points);
    const scale = size / Math.max(B.maxX - B.minX, B.maxY - B.minY);
    return points.map((p) => ({ x: p.x * scale, y: p.y * scale }));
  }
  private translateTo(points: Point[], pt: Point): Point[] {
    const c = getCentroid(points);
    return points.map((p) => ({ x: p.x + pt.x - c.x, y: p.y + pt.y - c.y }));
  }
  private distanceAtBestAngle(
    points: Point[],
    template: { points: Point[] },
  ): number {
    let a = -ANGLE_RANGE;
    let b = ANGLE_RANGE;
    const threshold = ANGLE_PRECISION;
    let x1 = PHI * a + (1.0 - PHI) * b;
    let f1 = this.distanceAtAngle(points, template, x1);
    let x2 = (1.0 - PHI) * a + PHI * b;
    let f2 = this.distanceAtAngle(points, template, x2);
    while (Math.abs(b - a) > threshold) {
      if (f1 < f2) {
        b = x2;
        x2 = x1;
        f2 = f1;
        x1 = PHI * a + (1.0 - PHI) * b;
        f1 = this.distanceAtAngle(points, template, x1);
      } else {
        a = x1;
        x1 = x2;
        f1 = f2;
        x2 = (1.0 - PHI) * a + PHI * b;
        f2 = this.distanceAtAngle(points, template, x2);
      }
    }
    return Math.min(f1, f2);
  }
  private distanceAtAngle(
    points: Point[],
    template: { points: Point[] },
    radians: number,
  ): number {
    return this.pathDistance(this.rotateBy(points, radians), template.points);
  }
  private pathDistance(pts1: Point[], pts2: Point[]): number {
    let d = 0.0;
    for (let i = 0; i < pts1.length; i++) {
      d += distance(pts1[i], pts2[i]);
    }
    return d / pts1.length;
  }
}

const recognizer = new DollarRecognizer();

// --- CONFIGURATION ---
export interface DetectionConfig {
  scoreThreshold: number;
  aspectRatioThreshold: number;
  perimeterRatioThreshold: number;
  diamondScoreThreshold: number;
  circleScoreThreshold: number;
  orientationScoreThreshold: number;
  dataCollectionMode?: boolean;
  straightSegmentAngleThreshold?: number;
  diamondConfidenceThreshold?: number;
  diamondWeights?: { segment: number; length: number; score: number };
}

export const defaultConfig: DetectionConfig = {
  scoreThreshold: 0.8,
  aspectRatioThreshold: 1.4,
  perimeterRatioThreshold: 0.85,
  diamondScoreThreshold: 0.3,
  circleScoreThreshold: 0.13,
  orientationScoreThreshold: 25,
  dataCollectionMode: true,
  straightSegmentAngleThreshold: 20,
  diamondConfidenceThreshold: 0.4,
  diamondWeights: { segment: 0.4, length: 0.3, score: 0.3 },
};

// --- MAIN SHAPE DETECTION ENGINE ---
export const detectShape = (
  points: Point[],
  config: DetectionConfig = defaultConfig,
): any | null => {
  if (points.length < 10) return null;

  const box = getBoundingBox(points);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  const pathLength = getPathLength(points);

  // --- OPEN PATH LOGIC (Lines and Arrows) ---
  if (!isClosed(points, box)) {
    if (pathLength < 20) return null; // Ignore tiny drawings

    // 1. Check for ORTHOGONAL ARROW first (most specific open shape)
    const orthogonalPoints = detectOrthogonalLine(points);
    if (orthogonalPoints) {
      return {
        type: 'orthogonal-arrow',
        points: orthogonalPoints,
      };
    }

    // 2. Check for CURVED ARROW second
    if (isCurved(points, pathLength)) {
      return {
        type: "curved-arrow",
        from: points[0],
        to: points[points.length - 1],
        control: findFurthestPoint(points),
      };
    }

    // 3. Default to a STRAIGHT ARROW if it's not curved or orthogonal
    // A simple straight line is a straight-arrow without a visible tip by default.
    return {
      type: 'straight-arrow',
      from: points[0],
      to: points[points.length - 1],
    };
  }

  // --- CLOSED PATH LOGIC (Polygons) ---
  if (width < 20 || height < 20) return null;

  let detectedType: Shape["type"] | "unknown" = "unknown";

  const boxPerimeter = 2 * (width + height);
  const perimeterRatio = pathLength / boxPerimeter;
  const angleThreshold = config.straightSegmentAngleThreshold ?? 20;
  const { count: straightSegments } = countStraightSegmentsAndLengths(
    points,
    angleThreshold,
  );
  const circleScore = getCircleScore(points, box);
  const dollarResult = recognizer.recognize(points);
  const diamondConfidence = calculateDiamondConfidence(points, box, config);

  if (
    perimeterRatio > config.perimeterRatioThreshold &&
    straightSegments >= 3 &&
    straightSegments <= 5
  ) {
    const orientationScore = getOrientationScore(points);

    if (
      orientationScore > config.orientationScoreThreshold &&
      diamondConfidence > 0.7
    ) {
      detectedType = "diamond";
    } else {
      const aspectRatio = Math.max(width, height) / Math.min(width, height);
      detectedType =
        aspectRatio > config.aspectRatioThreshold ? "rectangle" : "square";
    }
  } else {
    const isCircleCandidate = circleScore < config.circleScoreThreshold;
    const isTriangleCandidate =
      dollarResult.name === "triangle" && dollarResult.score > 0.85;
    const isDiamondCandidate =
      diamondConfidence > (config.diamondConfidenceThreshold ?? 0.4);

    const candidates = [
      isCircleCandidate && {
        type: "circle",
        score: 1 - circleScore / config.circleScoreThreshold,
      },
      isDiamondCandidate && { type: "diamond", score: diamondConfidence },
      isTriangleCandidate && { type: "triangle", score: dollarResult.score },
    ].filter(Boolean) as { type: Shape["type"]; score: number }[];

    if (candidates.length === 1) {
      detectedType = candidates[0].type;
    } else if (candidates.length > 1) {
      if (isCircleCandidate && isDiamondCandidate) {
        if (circleScore < config.circleScoreThreshold * 0.6) {
          detectedType = "circle";
        } else if (straightSegments >= 3 && straightSegments <= 5) {
          detectedType = "diamond";
        } else {
          detectedType = "circle";
        }
      } else {
        candidates.sort((a, b) => b.score - a.score);
        detectedType = candidates[0].type;
      }
    }
  }

  if (
    detectedType === "unknown" &&
    dollarResult.score > config.scoreThreshold
  ) {
    detectedType = dollarResult.name as Shape["type"];
  }

  if (detectedType === "unknown") {
    return null;
  }

  const centroid = getCentroid(points);

  switch (detectedType) {
    case "circle":
      return {
        type: "circle",
        x: centroid.x,
        y: centroid.y,
        radius: (width + height) / 4,
      };
    case "triangle":
      return { type: "triangle", x: centroid.x, y: centroid.y, width, height };
    case "diamond":
      return { type: "diamond", x: centroid.x, y: centroid.y, width, height };
    case "square":
      const size = Math.max(width, height);
      return {
        type: "square",
        x: box.minX + (width - size) / 2,
        y: box.minY + (height - size) / 2,
        width: size,
        height: size,
      };
    case "rectangle":
      return { type: "rectangle", x: box.minX, y: box.minY, width, height };
    default:
      return null;
  }
};

// --- INTELLIGENT HEURISTIC COMBINATION ---
function calculateDiamondConfidence(
  points: Point[],
  box: { minX: number; minY: number; maxX: number; maxY: number },
  config: DetectionConfig,
): number {
  const angleThreshold = config.straightSegmentAngleThreshold ?? 20;
  const { count: straightSegments, lengths: segmentLengths } =
    countStraightSegmentsAndLengths(points, angleThreshold);
  const diamondScore = getDiamondScore(points, box);

  const weights = config.diamondWeights ?? {
    segment: 0.4,
    length: 0.3,
    score: 0.3,
  };

  let confidence = 0;

  if (straightSegments >= 3 && straightSegments <= 6) {
    const segmentScore = 1.0 - Math.abs(straightSegments - 4) / 4;
    confidence += segmentScore * weights.segment;
  }

  if (segmentsAreRoughlyEqual(segmentLengths, 0.7)) {
    confidence += weights.length;
  }

  const normalizedDiamondScore = Math.max(
    0,
    1 - diamondScore / config.diamondScoreThreshold,
  );
  confidence += normalizedDiamondScore * weights.score;

  return confidence;
}
