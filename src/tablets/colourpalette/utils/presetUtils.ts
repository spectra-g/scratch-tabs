import { ColorInfo, UIPreviewMapping } from '../types';

/**
 * Creates a safe color accessor that wraps around the available colors
 */
const createColorAccessor = (colors: ColorInfo[]) =>
  (index: number) => {
    const normalizedIndex = ((index % colors.length) + colors.length) % colors.length;
    return colors[normalizedIndex].hex;
  };

/**
 * Generates varied UI color mapping presets from available colors
 * Uses different algorithmic patterns to ensure color variety across presets
 */
export const generateMappingPresets = (colors: ColorInfo[], fallbackMapping: UIPreviewMapping): UIPreviewMapping[] => {
  if (colors.length === 0) return [fallbackMapping];

  const getColorAtIndex = createColorAccessor(colors);

  const presets: UIPreviewMapping[] = [
    // Sequential forward
    {
      background: getColorAtIndex(0),
      text: getColorAtIndex(1),
      primary: getColorAtIndex(2),
      secondary: getColorAtIndex(3),
      accent: getColorAtIndex(4),
      border: getColorAtIndex(5),
    },
    // Sequential backward
    {
      background: getColorAtIndex(colors.length - 1),
      text: getColorAtIndex(colors.length - 2),
      primary: getColorAtIndex(colors.length - 3),
      secondary: getColorAtIndex(colors.length - 4),
      accent: getColorAtIndex(colors.length - 5),
      border: getColorAtIndex(colors.length - 6),
    },
    // Every other color pattern (even indices first)
    {
      background: getColorAtIndex(0),
      text: getColorAtIndex(2),
      primary: getColorAtIndex(4),
      secondary: getColorAtIndex(1),
      accent: getColorAtIndex(3),
      border: getColorAtIndex(5),
    },
    // Every other color pattern (odd indices first)
    {
      background: getColorAtIndex(1),
      text: getColorAtIndex(3),
      primary: getColorAtIndex(5),
      secondary: getColorAtIndex(0),
      accent: getColorAtIndex(2),
      border: getColorAtIndex(4),
    },
    // Mathematical split pattern
    {
      background: getColorAtIndex(Math.floor(colors.length / 2)),
      text: getColorAtIndex(0),
      primary: getColorAtIndex(Math.floor(colors.length / 3)),
      secondary: getColorAtIndex(Math.floor(colors.length * 2 / 3)),
      accent: getColorAtIndex(colors.length - 1),
      border: getColorAtIndex(Math.floor(colors.length / 4)),
    },
    // Reverse mathematical split
    {
      background: getColorAtIndex(Math.floor(colors.length / 3)),
      text: getColorAtIndex(colors.length - 1),
      primary: getColorAtIndex(Math.floor(colors.length / 2)),
      secondary: getColorAtIndex(0),
      accent: getColorAtIndex(Math.floor(colors.length * 2 / 3)),
      border: getColorAtIndex(1),
    },
    // Fibonacci-inspired sequence
    {
      background: getColorAtIndex(0),
      text: getColorAtIndex(1),
      primary: getColorAtIndex(1),
      secondary: getColorAtIndex(2),
      accent: getColorAtIndex(3),
      border: getColorAtIndex(5 % colors.length),
    },
    // Mixed distribution pattern
    {
      background: getColorAtIndex(2),
      text: getColorAtIndex(4),
      primary: getColorAtIndex(1),
      secondary: getColorAtIndex(5),
      accent: getColorAtIndex(0),
      border: getColorAtIndex(3),
    },
  ];

  return presets;
};

/**
 * Creates a new mapping preserving locked elements from the current mapping
 */
export const applyPresetWithLocks = (
  newMapping: UIPreviewMapping,
  currentMapping: UIPreviewMapping,
  lockedElements: Set<keyof UIPreviewMapping>
): UIPreviewMapping => {
  const finalMapping: UIPreviewMapping = { ...newMapping };

  lockedElements.forEach(element => {
    finalMapping[element] = currentMapping[element];
  });

  return finalMapping;
};