import { colorForIndex, readableTextColor, WHEEL_PALETTE } from '../palette';

describe('colorForIndex', () => {
  it('returns palette colours in order', () => {
    expect(colorForIndex(0)).toBe(WHEEL_PALETTE[0]);
    expect(colorForIndex(1)).toBe(WHEEL_PALETTE[1]);
  });

  it('cycles through the palette', () => {
    expect(colorForIndex(WHEEL_PALETTE.length)).toBe(WHEEL_PALETTE[0]);
    expect(colorForIndex(WHEEL_PALETTE.length + 3)).toBe(WHEEL_PALETTE[3]);
  });

  it('prefers the entry custom colour when provided', () => {
    expect(colorForIndex(0, '#123456')).toBe('#123456');
  });

  it('falls back to palette for undefined custom colour', () => {
    expect(colorForIndex(2, undefined)).toBe(WHEEL_PALETTE[2]);
  });
});

describe('readableTextColor', () => {
  it('returns dark text on light backgrounds', () => {
    expect(readableTextColor('#ffffff')).toBe('#1f2937');
    expect(readableTextColor('#f59e0b')).toBe('#1f2937');
  });

  it('returns white text on dark backgrounds', () => {
    expect(readableTextColor('#000000')).toBe('#ffffff');
    expect(readableTextColor('#1d4ed8')).toBe('#ffffff');
  });

  it('supports 3-digit hex colours', () => {
    expect(readableTextColor('#fff')).toBe('#1f2937');
    expect(readableTextColor('#000')).toBe('#ffffff');
  });

  it('defaults to white for invalid colours', () => {
    expect(readableTextColor('not-a-colour')).toBe('#ffffff');
  });
});
