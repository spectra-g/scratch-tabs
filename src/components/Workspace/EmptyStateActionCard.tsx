import React from "react";
import { Plus, Upload, File } from "../Icons";
import type { LucideProps } from "lucide-react";

type IconType = "plus" | "upload" | "file";
type ColorScheme = "primary" | "info" | "warning";

interface EmptyStateActionCardProps {
  /** Display label for the action */
  label: string;
  /** Secondary description text */
  description: string;
  /** Icon to display */
  icon: IconType;
  /** Color scheme for the action card */
  colorScheme: ColorScheme;
  /** Click handler for the action */
  onClick: () => void;
  /** Test ID for component testing */
  testId?: string;
}

const iconMap: Record<IconType, React.ComponentType<LucideProps>> = {
  plus: Plus,
  upload: Upload,
  file: File,
};

const colorSchemeMap: Record<ColorScheme, { bg: string; hoverBg: string; border: string; iconBg: string; iconHoverBg: string; iconColor: string }> = {
  primary: {
    bg: "bg-surface",
    hoverBg: "hover:bg-surface-highlight",
    border: "hover:border-primary/50",
    iconBg: "bg-primary/10",
    iconHoverBg: "group-hover:bg-primary/20",
    iconColor: "text-primary",
  },
  info: {
    bg: "bg-surface",
    hoverBg: "hover:bg-surface-highlight",
    border: "hover:border-info/50",
    iconBg: "bg-info/10",
    iconHoverBg: "group-hover:bg-info/20",
    iconColor: "text-info",
  },
  warning: {
    bg: "bg-surface",
    hoverBg: "hover:bg-surface-highlight",
    border: "hover:border-warning/50",
    iconBg: "bg-warning/10",
    iconHoverBg: "group-hover:bg-warning/20",
    iconColor: "text-warning",
  },
};

/**
 * EmptyStateActionCard
 *
 * Displays a single action card for the WorkspaceEmptyState.
 * Follows SRP by handling only the rendering of one action option.
 *
 * Design follows LAYOUT_GUIDELINES.md:
 * - Uses semantic color tokens (bg-surface, bg-primary/10, etc.)
 * - Applies consistent hover states
 * - Provides visual feedback on interaction
 *
 * @see LAYOUT_GUIDELINES.md - State and Status Coloring
 */
export const EmptyStateActionCard: React.FC<EmptyStateActionCardProps> = ({
  label,
  description,
  icon,
  colorScheme,
  onClick,
  testId,
}) => {
  const IconComponent = iconMap[icon];
  const colors = colorSchemeMap[colorScheme];

  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`
        group flex flex-col items-center justify-center p-4
        ${colors.bg} ${colors.hoverBg}
        border border-base ${colors.border}
        rounded-xl transition-all duration-200
        hover:-translate-y-1 hover:shadow-md
      `}
    >
      <div
        className={`
          p-2 ${colors.iconBg} ${colors.iconHoverBg}
          rounded-lg mb-3 transition-colors
        `}
      >
        <IconComponent size={20} className={colors.iconColor} />
      </div>
      <span className="text-sm font-medium text-main">{label}</span>
      <span className="text-xs text-muted mt-1">{description}</span>
    </button>
  );
};
