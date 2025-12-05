import {
  GitBranch,
  Container,
  Box,
  Package,
  Terminal,
  Database,
  Cloud,
  Code,
  LucideIcon,
} from "lucide-react";

/**
 * Static icon mapping for vault categories/labels
 * This is not persisted to the database - icons are determined at runtime
 */
export const LABEL_ICON_MAP: Record<string, LucideIcon> = {
  git: GitBranch,
  docker: Container,
  k8s: Box,
  kubernetes: Box,
  mvn: Package,
  maven: Package,
  node: Terminal,
  npm: Terminal,
  sql: Database,
  postgres: Database,
  mysql: Database,
  aws: Cloud,
  azure: Cloud,
  gcp: Cloud,
  bash: Terminal,
  shell: Terminal,
  python: Code,
  javascript: Code,
  typescript: Code,
  java: Code,
  go: Code,
  rust: Code,
};

/**
 * Get icon for a label/category
 * @param label - The label name
 * @returns The Lucide icon component
 */
export function getLabelIcon(label: string): LucideIcon {
  const normalizedLabel = label.toLowerCase().trim();
  return LABEL_ICON_MAP[normalizedLabel] || Code;
}
