/**
 * Workspace Color Utility
 *
 * Generates deterministic colors for workspaces based on their ID.
 * Colors are chosen from a curated palette of dark blues and cool tones
 * to match the application theme while remaining distinct.
 */

// Curated palette of Dark Blues, Slates, and Cool tones (700-800 weights)
// These provide good contrast for white text and match the app's dark blue theme.
const WORKSPACE_COLOR_PALETTE = [
  '#334155', // Slate 700
  '#1d4ed8', // Blue 700
  '#4338ca', // Indigo 700
  '#0369a1', // Sky 700
  '#0e7490', // Cyan 700
  '#6d28d9', // Violet 700
  '#1e293b', // Slate 800
  '#1e40af', // Blue 800
  '#3730a3', // Indigo 800
  '#075985', // Sky 800
  '#155e75', // Cyan 800
  '#5b21b6', // Violet 800
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
 * Returns a hex color string from the dark blue palette
 */
export const getWorkspaceColor = (workspaceId: string): string => {
  const hash = hashString(workspaceId);
  const colorIndex = hash % WORKSPACE_COLOR_PALETTE.length;
  return WORKSPACE_COLOR_PALETTE[colorIndex];
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
