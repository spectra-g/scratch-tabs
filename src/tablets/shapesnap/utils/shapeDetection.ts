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


// --- $1 GESTURE RECOGNIZER IMPLEMENTATION (for non-box shapes) ---

const NUM_POINTS = 64;
const SQUARE_SIZE = 250.0;
const ANGLE_RANGE = 45.0; 
const ANGLE_PRECISION = 2.0;
const PHI = 0.5 * (-1.0 + Math.sqrt(5.0)); // Golden Ratio

class DollarRecognizer {
    private templates: { name: string, points: Point[] }[] = [];

    constructor() {
        this.addTemplate("triangle", [{"x":125,"y":23.2},{"x":22.2,"y":226.8},{"x":227.8,"y":226.8},{"x":125,"y":23.2}]);
        this.addTemplate("circle", [{"x":137.2,"y":30.2},{"x":89.4,"y":32.4},{"x":50.2,"y":51.8},{"x":25.2,"y":84.8},{"x":12.6,"y":127.8},{"x":17.6,"y":174},{"x":37.4,"y":208.6},{"x":71.4,"y":231.8},{"x":113.6,"y":241.8},{"x":156.8,"y":238.4},{"x":195.4,"y":220.6},{"x":221.2,"y":190.4},{"x":235.2,"y":153.4},{"x":235.8,"y":112.6},{"x":223.8,"y":72},{"x":198.8,"y":42.2},{"x":166.4,"y":27.2},{"x":137.2,"y":30.2}]);
        this.addTemplate("diamond", [{"x":126,"y":16},{"x":236,"y":125},{"x":126,"y":235},{"x":16,"y":125},{"x":126,"y":16}]);
    }

    public recognize(points: Point[]): { name: string; score: number } {
        const processedPoints = this.processPoints(points);
        if (processedPoints.length === 0) return { name: 'unknown', score: 0.0 };

        let b = +Infinity;
        let t = -1;

        for (let i = 0; i < this.templates.length; i++) {
            const d = this.distanceAtBestAngle(processedPoints, this.templates[i]);
            if (d < b) {
                b = d;
                t = i;
            }
        }
        
        const score = t === -1 ? 0.0 : 1.0 - b / (0.5 * Math.sqrt(SQUARE_SIZE * SQUARE_SIZE + SQUARE_SIZE * SQUARE_SIZE));
        return { name: t === -1 ? 'unknown' : this.templates[t].name, score };
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
            if ((D + d) >= I) {
                const qx = points[i - 1].x + ((I - D) / d) * (points[i].x - points[i - 1].x);
                const qy = points[i - 1].y + ((I - D) / d) * (points[i].y - points[i - 1].y);
                const q = { x: qx, y: qy };
                newPoints.push(q);
                points.splice(i, 0, q);
                D = 0.0;
            } else {
                D += d;
            }
        }
        if (newPoints.length < n) {
             newPoints.push(points[points.length-1]);
        }
        return newPoints.slice(0, n);
    }
    
    private indicativeAngle(points: Point[]): number {
        const centroid = getCentroid(points);
        return Math.atan2(centroid.y - points[0].y, centroid.x - points[0].x);
    }

    private rotateBy(points: Point[], radians: number): Point[] {
        const centroid = getCentroid(points);
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const newPoints: Point[] = [];
        for (let i = 0; i < points.length; i++) {
            const qx = (points[i].x - centroid.x) * cos - (points[i].y - centroid.y) * sin + centroid.x;
            const qy = (points[i].x - centroid.x) * sin + (points[i].y - centroid.y) * cos + centroid.y;
            newPoints.push({ x: qx, y: qy });
        }
        return newPoints;
    }

    private scaleTo(points: Point[], size: number): Point[] {
        const B = getBoundingBox(points);
        const newPoints: Point[] = [];
        const scale = size / Math.max(B.maxX - B.minX, B.maxY - B.minY);
        for (let i = 0; i < points.length; i++) {
            const qx = points[i].x * scale;
            const qy = points[i].y * scale;
            newPoints.push({ x: qx, y: qy });
        }
        return newPoints;
    }

    private translateTo(points: Point[], pt: Point): Point[] {
        const centroid = getCentroid(points);
        const newPoints: Point[] = [];
        for (let i = 0; i < points.length; i++) {
            const qx = points[i].x + pt.x - centroid.x;
            const qy = points[i].y + pt.y - centroid.y;
            newPoints.push({ x: qx, y: qy });
        }
        return newPoints;
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

    private distanceAtAngle(points: Point[], template: { points: Point[] }, radians: number): number {
        const newPoints = this.rotateBy(points, radians);
        return this.pathDistance(newPoints, template.points);
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

// --- SHAPE DETECTION ENGINE ---

export const detectShape = (points: Point[]): any | null => {
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

  // ** HIERARCHICAL DETECTION LOGIC **

  // Step 1: Check for box-like shapes using a strong heuristic FIRST.
  const pathLength = getPathLength(points);
  const boxPerimeter = 2 * (width + height);
  const perimeterRatio = pathLength / boxPerimeter;
  
  // *** THE FINAL TUNED THRESHOLD ***
  if (perimeterRatio > 0.89) { 
      console.log(`...High perimeter ratio detected (${perimeterRatio.toFixed(2)}). Classifying as box.`);
      const aspectRatio = Math.max(width, height) / Math.min(width, height);
      if(aspectRatio > 1.4) {
          detectedType = 'rectangle';
      } else {
          detectedType = 'square';
      }
  } else {
      // Step 2: If not a box, use the $1 recognizer for more complex shapes.
      const result = recognizer.recognize(points);
      console.log(`...Recognized ${result.name} with score ${result.score.toFixed(2)}`);

      const SCORE_THRESHOLD = 0.75; 
      if (result.name !== 'unknown' && result.score >= SCORE_THRESHOLD) {
          detectedType = result.name as Shape['type'];
      }
  }
  
  if (detectedType === 'unknown') {
      console.log(`🏆 Final decision: UNKNOWN`);
      return { type: 'line', points };
  }

  console.log(`🏆 Final decision: ${detectedType.toUpperCase()}`);

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