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
