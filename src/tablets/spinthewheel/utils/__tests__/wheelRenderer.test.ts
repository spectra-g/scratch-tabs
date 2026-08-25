import {
  drawWheel,
  fitLabel,
  MAX_LABEL_FONT_PX,
  MIN_LABEL_FONT_PX,
} from '../wheelRenderer';

function createMockCtx() {
  const calls: Record<string, unknown[][]> = {};
  const record = (name: string, args: unknown[]) => {
    (calls[name] ??= []).push(args);
  };
  const ctx = {
    clearRect: jest.fn((...args: unknown[]) => record('clearRect', args)),
    beginPath: jest.fn(() => record('beginPath', [])),
    moveTo: jest.fn(),
    arc: jest.fn((...args: unknown[]) => record('arc', args)),
    closePath: jest.fn(),
    fill: jest.fn(() => record('fill', [])),
    stroke: jest.fn(),
    save: jest.fn(() => record('save', [])),
    restore: jest.fn(),
    translate: jest.fn((...args: unknown[]) => record('translate', args)),
    rotate: jest.fn((...args: unknown[]) => record('rotate', args)),
    fillText: jest.fn((...args: unknown[]) => record('fillText', args)),
    measureText: jest.fn((_text: string) => ({ width: _text.length * 6 })),
    setTransform: jest.fn(),
  } as unknown as CanvasRenderingContext2D & Record<string, jest.Mock>;
  return { ctx, calls };
}

describe('fitLabel', () => {
  // Fake measure: ~0.6px per character per font pixel.
  const measure = (text: string, fontPx: number) => text.length * fontPx * 0.6;

  it('keeps short labels at the max font size', () => {
    const result = fitLabel('Hi', 500, measure);
    expect(result).toEqual({ text: 'Hi', fontSize: MAX_LABEL_FONT_PX });
  });

  it('shrinks font size for long labels', () => {
    const label = 'A'.repeat(20);
    const { text, fontSize } = fitLabel(label, 180, measure); // fits at 15px
    expect(text).toBe(label);
    expect(fontSize).toBe(15);
    expect(fontSize).toBeLessThan(MAX_LABEL_FONT_PX);
    expect(fontSize).toBeGreaterThanOrEqual(MIN_LABEL_FONT_PX);
  });

  it('truncates with ellipsis when even minimum size overflows', () => {
    const label = 'A'.repeat(200);
    const { text, fontSize } = fitLabel(label, 50, measure);
    expect(text.endsWith('…')).toBe(true);
    expect(text.length).toBeLessThan(label.length);
    expect(fontSize).toBe(MIN_LABEL_FONT_PX);
  });

  it('never returns an empty truncated string', () => {
    const { text } = fitLabel('A'.repeat(200), 1, measure);
    expect(text.replace('…', '').length).toBeGreaterThanOrEqual(1);
  });
});

describe('drawWheel', () => {
  it('clears the canvas to its full size', () => {
    const { ctx, calls } = createMockCtx();
    drawWheel(ctx, { size: 300, slices: [{ label: 'A', color: '#ff0000' }] });
    expect(calls.clearRect[0]).toEqual([0, 0, 300, 300]);
  });

  it('draws a placeholder message for zero entries', () => {
    const { ctx, calls } = createMockCtx();
    drawWheel(ctx, { size: 300, slices: [] });
    expect(calls.fill).toHaveLength(1);
    expect(calls.arc[0].slice(3)).toEqual([0, Math.PI * 2]);
    const texts = calls.fillText.map((args) => args[0]);
    expect(texts.some((t) => String(t).includes('Add entries'))).toBe(true);
    expect(calls.rotate).toBeUndefined();
  });

  it('draws a single entry as a full circle without rotation', () => {
    const { ctx, calls } = createMockCtx();
    drawWheel(ctx, { size: 300, slices: [{ label: 'Only', color: '#00ff00' }] });
    expect(calls.arc).toHaveLength(1);
    expect(calls.arc[0].slice(3)).toEqual([0, Math.PI * 2]);
    expect(calls.rotate).toBeUndefined();
    expect(calls.fillText).toHaveLength(1);
    expect(calls.fillText[0][0]).toBe('Only');
  });

  it('draws one slice per entry for multiple entries', () => {
    const slices = [
      { label: 'A', color: '#ff0000' },
      { label: 'B', color: '#00ff00' },
      { label: 'C', color: '#0000ff' },
      { label: 'D', color: '#ffff00' },
    ];
    const { ctx, calls } = createMockCtx();
    drawWheel(ctx, { size: 400, slices });
    expect(calls.arc).toHaveLength(4);
    expect(calls.fillText).toHaveLength(4);

    // Labels are drawn radially: translate to centre then rotate per slice.
    expect(calls.translate).toHaveLength(4);
    calls.translate.forEach((args) => expect(args).toEqual([200, 200]));
    expect(calls.rotate).toHaveLength(4);

    // Slice arcs partition the circle starting at 12 o'clock (-π/2).
    const arcAngle = (Math.PI * 2) / slices.length;
    calls.arc.forEach((args, i) => {
      const [cx, cy, r, start, end] = args as number[];
      expect([cx, cy]).toEqual([200, 200]);
      expect(r).toBeCloseTo(196); // size/2 - outer padding
      expect(start).toBeCloseTo(-Math.PI / 2 + i * arcAngle);
      expect(end - start).toBeCloseTo(arcAngle);
    });
  });

  it('applies rotation to slice geometry', () => {
    const slices = [
      { label: 'A', color: '#ff0000' },
      { label: 'B', color: '#00ff00' },
    ];
    const rotationDeg = 90;
    const { ctx, calls } = createMockCtx();
    drawWheel(ctx, { size: 300, slices, rotationDeg });

    const arcAngle = (Math.PI * 2) / slices.length;
    const [firstArc] = calls.arc;
    expect((firstArc[3] as number)).toBeCloseTo(
      -Math.PI / 2 + (rotationDeg * Math.PI) / 180,
    );
    const firstRotation = calls.rotate[0][0] as number;
    expect(firstRotation).toBeCloseTo(-Math.PI / 2 + Math.PI / 2 + arcAngle / 2);
  });
});
