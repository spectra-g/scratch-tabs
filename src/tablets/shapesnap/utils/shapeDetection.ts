import { Point, Shape } from '../types';

// --- CORE HELPER FUNCTIONS ---
const getBoundingBox = (points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } => {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
};
const distance = (p1: Point, p2: Point): number => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
const getPathLength = (points: Point[]): number => {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
  }
  return length;
};
const isClosed = (points: Point[], box: { minX: number; minY: number; maxX: number; maxY: number }): boolean => {
  if (points.length < 3) return false;
  const start = points[0];
  const end = points[points.length - 1];
  const diagonal = Math.sqrt(Math.pow(box.maxX - box.minX, 2) + Math.pow(box.maxY - box.minY, 2));
  const threshold = diagonal * 0.25;
  return distance(start, end) < threshold;
};
function getCentroid(points: Point[]): Point {
    const n = points.length;
    if (n === 0) return { x: 0, y: 0 };
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / n, y: sum.y / n };
}

// --- HEURISTIC CALCULATOR ---
function getDiamondScore(points: Point[], box: { minX: number; minY: number; maxX: number; maxY: number }): number {
    const width = box.maxX - box.minX;
    const height = box.maxY - box.minY;
    const diagonal = Math.sqrt(width*width + height*height);
    if(diagonal === 0) return 1.0;
    
    const midpoints = [
        {x: box.minX + width/2, y: box.minY},
        {x: box.maxX, y: box.minY + height/2},
        {x: box.minX + width/2, y: box.maxY},
        {x: box.minX, y: box.minY + height/2}
    ];
    let min_dists = midpoints.map(mp => Math.min(...points.map(p => distance(p, mp))));
    return min_dists.reduce((a,b) => a+b, 0) / diagonal;
}

function getCircleScore(points: Point[], box: { minX: number; minY: number; maxX: number; maxY: number }): number {
    const width = box.maxX - box.minX;
    const height = box.maxY - box.minY;
    const center = { x: box.minX + width/2, y: box.minY + height/2 };
    const radius = Math.min(width, height) / 2;
    
    if (radius === 0) return 1.0;
    
    // Calculate how well the points fit a circle
    const distances = points.map(p => Math.abs(distance(p, center) - radius));
    const avgDeviation = distances.reduce((a, b) => a + b, 0) / distances.length;
    
    // Lower score means more circular
    return avgDeviation / radius;
}

// --- STRAIGHT SEGMENT DETECTION ---
function countStraightSegmentsAndLengths(points: Point[], angleThresholdDeg = 20): { count: number, lengths: number[] } {
    if (points.length < 3) return { count: 0, lengths: [] };
    
    // Even more aggressive simplification to reduce noise
    const simplified = simplifyPoints(points, 8.0); // Increased from 5.0
    if (simplified.length < 3) return { count: 0, lengths: [] };
    
    let corners: number[] = [];
    
    // First pass: detect potential corners with a more lenient threshold
    for (let i = 1; i < simplified.length - 1; i++) {
        const p0 = simplified[i - 1];
        const p1 = simplified[i];
        const p2 = simplified[i + 1];
        
        const v1 = { x: p1.x - p0.x, y: p1.y - p0.y };
        const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };
        
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        if (mag1 === 0 || mag2 === 0) continue;
        
        const cosAngle = dot / (mag1 * mag2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;
        
        // More lenient angle threshold for initial detection
        if (angle < (180 - angleThresholdDeg * 0.6)) { // Reduced from 0.7
            corners.push(i);
        }
    }
    
    // Post-process: merge very close corners and filter by minimum segment length
    const mergedCorners: number[] = [];
    const minSegmentLength = 20; // Increased from 15
    
    for (let i = 0; i < corners.length; i++) {
        const currentCorner = corners[i];
        
        // Check if this corner is too close to the previous one
        if (mergedCorners.length > 0) {
            const lastCorner = mergedCorners[mergedCorners.length - 1];
            const segmentLength = distance(simplified[currentCorner], simplified[lastCorner]);
            
            if (segmentLength < minSegmentLength) {
                // Skip this corner - too close to previous
                continue;
            }
        }
        
        mergedCorners.push(currentCorner);
    }
    
    // Calculate segment lengths between merged corners
    let lengths: number[] = [];
    if (mergedCorners.length > 1) {
        for (let i = 0; i < mergedCorners.length; i++) {
            const a = simplified[mergedCorners[i]];
            const b = simplified[mergedCorners[(i + 1) % mergedCorners.length]];
            lengths.push(distance(a, b));
        }
    }
    
    return { count: mergedCorners.length, lengths };
}

function segmentsAreRoughlyEqual(lengths: number[], tolerance: number = 0.3): boolean {
    if (lengths.length < 3) return false;
    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    if (minLen === 0) return false;
    return (maxLen / minLen) < (1 + tolerance);
}

// Helper function to simplify points using Douglas-Peucker algorithm
function simplifyPoints(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) return points;
    
    const findPerpendicularDistance = (point: Point, lineStart: Point, lineEnd: Point): number => {
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
        const distance = findPerpendicularDistance(points[i], points[0], points[points.length - 1]);
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
    private templates: { name: string, points: Point[] }[] = [];
    constructor() {
        this.addTemplate("triangle", [{"x":125,"y":23.2},{"x":22.2,"y":226.8},{"x":227.8,"y":226.8},{"x":125,"y":23.2}]);
        this.addTemplate("circle", [{"x":137.2,"y":30.2},{"x":89.4,"y":32.4},{"x":50.2,"y":51.8},{"x":25.2,"y":84.8},{"x":12.6,"y":127.8},{"x":17.6,"y":174},{"x":37.4,"y":208.6},{"x":71.4,"y":231.8},{"x":113.6,"y":241.8},{"x":156.8,"y":238.4},{"x":195.4,"y":220.6},{"x":221.2,"y":190.4},{"x":235.2,"y":153.4},{"x":235.8,"y":112.6},{"x":223.8,"y":72},{"x":198.8,"y":42.2},{"x":166.4,"y":27.2},{"x":137.2,"y":30.2}]);
    }
    public recognize(points: Point[]): { name: string; score: number } {
        const processedPoints = this.processPoints(points);
        if (processedPoints.length === 0) return { name: 'unknown', score: 0.0 };
        let b = +Infinity;
        let t = -1;
        for (let i = 0; i < this.templates.length; i++) {
            const d = this.distanceAtBestAngle(processedPoints, this.templates[i]);
            if (d < b) { b = d; t = i; }
        }
        const score = t === -1 ? 0.0 : 1.0 - b / (0.5 * Math.sqrt(SQUARE_SIZE * SQUARE_SIZE + SQUARE_SIZE * SQUARE_SIZE));
        return { name: t === -1 ? 'unknown' : this.templates[t].name, score };
    }
    private addTemplate(name: string, points: Point[]): void { this.templates.push({ name, points: this.processPoints(points) }); }
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
            if ((D + d) >= I) {
                const qx = points[i - 1].x + ((I - D) / d) * (points[i].x - points[i - 1].x);
                const qy = points[i - 1].y + ((I - D) / d) * (points[i].y - points[i - 1].y);
                const q = { x: qx, y: qy };
                newPoints.push(q);
                points.splice(i, 0, q);
                D = 0.0;
            } else { D += d; }
        }
        if (newPoints.length < n) { newPoints.push(points[points.length-1]); }
        return newPoints.slice(0, n);
    }
    private indicativeAngle(points: Point[]): number { const c = getCentroid(points); return Math.atan2(c.y - points[0].y, c.x - points[0].x); }
    private rotateBy(points: Point[], radians: number): Point[] {
        const c = getCentroid(points);
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        return points.map(p => ({
            x: (p.x - c.x) * cos - (p.y - c.y) * sin + c.x,
            y: (p.x - c.x) * sin + (p.y - c.y) * cos + c.y
        }));
    }
    private scaleTo(points: Point[], size: number): Point[] {
        const B = getBoundingBox(points);
        const scale = size / Math.max(B.maxX - B.minX, B.maxY - B.minY);
        return points.map(p => ({ x: p.x * scale, y: p.y * scale }));
    }
    private translateTo(points: Point[], pt: Point): Point[] {
        const c = getCentroid(points);
        return points.map(p => ({ x: p.x + pt.x - c.x, y: p.y + pt.y - c.y }));
    }
    private distanceAtBestAngle(points: Point[], template: { points: Point[] }): number {
        let a = -ANGLE_RANGE;
        let b = ANGLE_RANGE;
        const threshold = ANGLE_PRECISION;
        let x1 = PHI * a + (1.0 - PHI) * b;
        let f1 = this.distanceAtAngle(points, template, x1);
        let x2 = (1.0 - PHI) * a + PHI * b;
        let f2 = this.distanceAtAngle(points, template, x2);
        while (Math.abs(b - a) > threshold) {
            if (f1 < f2) { b = x2; x2 = x1; f2 = f1; x1 = PHI * a + (1.0 - PHI) * b; f1 = this.distanceAtAngle(points, template, x1); }
            else { a = x1; x1 = x2; f1 = f2; x2 = (1.0 - PHI) * a + PHI * b; f2 = this.distanceAtAngle(points, template, x2); }
        }
        return Math.min(f1, f2);
    }
    private distanceAtAngle(points: Point[], template: { points: Point[] }, radians: number): number { return this.pathDistance(this.rotateBy(points, radians), template.points); }
    private pathDistance(pts1: Point[], pts2: Point[]): number {
        let d = 0.0;
        for (let i = 0; i < pts1.length; i++) { d += distance(pts1[i], pts2[i]); }
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
    dataCollectionMode?: boolean;
    expectedShape?: string;
    straightSegmentAngleThreshold?: number;
    diamondConfidenceThreshold?: number;
}

export const defaultConfig: DetectionConfig = {
    scoreThreshold: 0.80,
    aspectRatioThreshold: 1.4,
    perimeterRatioThreshold: 0.90,
    diamondScoreThreshold: 0.3,
    dataCollectionMode: true,
    straightSegmentAngleThreshold: 20,
    diamondConfidenceThreshold: 0.3,
};

// --- MAIN SHAPE DETECTION ENGINE ---
export const detectShape = (points: Point[], config: DetectionConfig = defaultConfig): any | null => {
  if (points.length < 10) return null;

  const box = getBoundingBox(points);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  
  if (width < 20 || height < 20) return null;

  if (!isClosed(points, box)) {
    const straightness = distance(points[0], points[points.length - 1]) / getPathLength(points);
    if (straightness > 0.95) return { type: 'line', points: [points[0], points[points.length-1]] };
    return { type: 'line', points };
  }

  let detectedType: Shape['type'] | 'unknown' = 'unknown';

  const pathLength = getPathLength(points);
  const boxPerimeter = 2 * (width + height);
  const perimeterRatio = pathLength / boxPerimeter;
  
  // Step 1: Check for box-like shapes using perimeter ratio heuristic
  if (perimeterRatio > config.perimeterRatioThreshold) { 
      console.log(`...High perimeter ratio detected (${perimeterRatio.toFixed(2)}). Classifying as box.`);
      const aspectRatio = Math.max(width, height) / Math.min(width, height);
      if(aspectRatio > config.aspectRatioThreshold) {
          detectedType = 'rectangle';
      } else {
          detectedType = 'square';
      }
  } else {
      // Step 2: Check for circles and diamonds using intelligent confidence scoring
      const angleThreshold = (config as any).straightSegmentAngleThreshold ?? 20;
      const { count: straightSegments, lengths: segmentLengths } = countStraightSegmentsAndLengths(points, angleThreshold);
      console.log(`...Straight segments detected: ${straightSegments} (threshold: ${angleThreshold}°), segment lengths: [${segmentLengths.map(l => l.toFixed(1)).join(', ')}]`);
      
      // Calculate diamond confidence using multiple heuristics
      const diamondConfidence = calculateDiamondConfidence(points, box, config);
      console.log(`...Diamond confidence: ${diamondConfidence.toFixed(3)}`);
      
      // Lower threshold for real-world drawings - be more lenient
      const confidenceThreshold = (config as any).diamondConfidenceThreshold ?? 0.3; // Reduced from 0.4
      if (diamondConfidence > confidenceThreshold) { // Use configurable threshold
          console.log(`...High diamond confidence (${diamondConfidence.toFixed(3)}). Classifying as diamond.`);
          detectedType = 'diamond';
      } else {
          const circleScore = getCircleScore(points, box);
          const circleScoreThreshold = (config as any).circleScoreThreshold ?? 0.15;
          
          // Additional check: if we have 3-5 segments and moderate diamond confidence, prefer diamond over circle
          if (straightSegments >= 3 && straightSegments <= 5 && diamondConfidence > 0.2 && circleScore > 0.1) {
              console.log(`...Moderate diamond confidence with ${straightSegments} segments. Preferring diamond over circle.`);
              detectedType = 'diamond';
          } else if (circleScore < circleScoreThreshold) {
              console.log(`...Circle score detected (${circleScore.toFixed(3)}). Classifying as circle.`);
              detectedType = 'circle';
          } else {
              // Step 3: Use the $1 recognizer for triangles and other shapes
              const result = recognizer.recognize(points);
              console.log(`...Recognized ${result.name} with score ${result.score.toFixed(2)}`);

              // Special case: if $1 recognizer says triangle but we have moderate diamond confidence, prefer diamond
              if (result.name === 'triangle' && diamondConfidence > 0.4) {
                  console.log(`...Overriding triangle classification with diamond (confidence: ${diamondConfidence.toFixed(3)})`);
                  detectedType = 'diamond';
              } else if (result.name !== 'unknown' && result.score >= config.scoreThreshold) {
                  detectedType = result.name as Shape['type'];
              } else {
                  detectedType = 'unknown';
              }
          }
      }
  }
  
  if (detectedType === 'unknown') {
      console.log(`🏆 Final decision: UNKNOWN`);
      return { type: 'line', points };
  }

  console.log(`🏆 Final decision: ${detectedType.toUpperCase()}`);

  // Data collection mode - output points in test data format
  if (config.dataCollectionMode) {
    const roundedPoints = points.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
    console.log(`📊 TEST_DATA: ${JSON.stringify({ expected: "RENAME_TO_EXPECTED_SHAPE", points: roundedPoints })}`);
  }

  const centroid = getCentroid(points);

  switch (detectedType) {
    case 'circle':
      return { type: 'circle', x: centroid.x, y: centroid.y, radius: (width + height) / 4 };
    case 'triangle':
      return { type: 'triangle', x: centroid.x, y: centroid.y, width, height };
    case 'diamond':
      return { type: 'diamond', x: centroid.x, y: centroid.y, width, height };
    case 'square':
      const size = Math.max(width, height);
      return { type: 'square', x: box.minX + (width - size) / 2, y: box.minY + (height - size) / 2, width: size, height: size };
    case 'rectangle':
      return { type: 'rectangle', x: box.minX, y: box.minY, width, height };
    default:
      return { type: 'line', points };
  }
};

// --- INTELLIGENT HEURISTIC COMBINATION ---
function calculateDiamondConfidence(points: Point[], box: { minX: number; minY: number; maxX: number; maxY: number }, config: DetectionConfig): number {
    const angleThreshold = (config as any).straightSegmentAngleThreshold ?? 20;
    const { count: straightSegments, lengths: segmentLengths } = countStraightSegmentsAndLengths(points, angleThreshold);
    const diamondScore = getDiamondScore(points, box);
    
    // Use configurable weights or defaults
    const weights = (config as any).diamondWeights ?? { segment: 0.4, length: 0.3, score: 0.3 };
    
    let confidence = 0;
    
    // Factor 1: Straight segment count (configurable weight)
    if (straightSegments >= 3 && straightSegments <= 6) {
        const segmentScore = 1.0 - Math.abs(straightSegments - 4) / 4; // 4 segments = perfect score
        confidence += segmentScore * weights.segment;
    }
    
    // Factor 2: Segment length similarity (configurable weight)
    if (segmentsAreRoughlyEqual(segmentLengths, 0.7)) { // More lenient tolerance
        confidence += weights.length;
    }
    
    // Factor 3: Diamond score heuristic (configurable weight)
    const normalizedDiamondScore = Math.max(0, 1 - diamondScore / config.diamondScoreThreshold);
    confidence += normalizedDiamondScore * weights.score;
    
    return confidence;
}