/**
 * Workspace Color Utility
 *
 * Generates deterministic colors for workspaces based on their ID.
 * Colors are chosen from a carefully curated palette that provides:
 * - Good contrast against the app's dark background
 * - Visual distinction between workspaces
 * - Consistent colors per workspace within a session
 */

// Curated color palette with good contrast for dark theme
// Using Tailwind-inspired colors with sufficient brightness
const WORKSPACE_COLOR_PALETTE = [
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#14b8a6', // teal-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#a855f7', // purple-500
  '#84cc16', // lime-500
  '#6366f1', // indigo-500
] as const;

/**
 * Simple hash function to convert string to number
 * Uses FNV-1a algorithm for deterministic hashing
 */
const hashString = (str: string): number => {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash *= 16777619; // FNV prime
  }
  return Math.abs(hash);
};

/**
 * Get color for a workspace based on its ID
 * Returns a hex color string
 */
/**
 * Get color for a workspace based on its ID
 * Returns a hex color string
 */
export const getWorkspaceColor = (workspaceId: string): string => {
  const hash = hashString(workspaceId);
  const colorIndex = hash % WORKSPACE_COLOR_PALETTE.length;
  const baseColor = WORKSPACE_COLOR_PALETTE[colorIndex];
  return toPastel(baseColor);
};

/**
 * Get the first letter of a workspace name (uppercased)
 * Falls back to '#' if name is empty
 */
export const getWorkspaceInitial = (workspaceName: string): string => {
  if (!workspaceName || workspaceName.trim().length === 0) {
    return '#';
  }
  return workspaceName.trim()[0].toUpperCase();
};

/**
 * Converts a hex color to a pastel version by mixing it with white.
 * @param hex The hex color to convert (e.g. #RRGGBB)
 * @param mixAmount The amount of white to mix in (0-1). Default 0.7 for soft pastel.
 */
export const toPastel = (hex: string, mixAmount: number = 0.5): string => {
  let r = 0, g = 0, b = 0;

  // Handle shorthand #RGB
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }

  // Mix with white (255, 255, 255)
  r = Math.round(r + (255 - r) * mixAmount);
  g = Math.round(g + (255 - g) * mixAmount);
  b = Math.round(b + (255 - b) * mixAmount);

  const toHex = (n: number) => {
    const h = n.toString(16);
    return h.length === 1 ? '0' + h : h;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
