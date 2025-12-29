import React from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

export interface SizeIndicatorProps {
  currentSize: number;
  maxSize: number;
  className?: string;
}

/**
 * Visual indicator showing current URL size vs maximum allowed
 * Shows progress bar and status icon
 */
export const SizeIndicator: React.FC<SizeIndicatorProps> = ({
  currentSize,
  maxSize,
  className = "",
}) => {
  const percentUsed = (currentSize / maxSize) * 100;
  const fits = currentSize <= maxSize;

  // Determine color based on usage
  const getColor = () => {
    if (percentUsed > 100) return "text-danger";
    if (percentUsed > 90) return "text-warning";
    return "text-success";
  };

  const getBarColor = () => {
    if (percentUsed > 100) return "bg-danger";
    if (percentUsed > 90) return "bg-warning";
    return "bg-success";
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Status message */}
      <div className="flex items-center gap-2">
        {fits ? (
          <>
            <CheckCircle size={16} className="text-success" />
            <span className="text-sm text-main">
              Content fits in shareable URL
            </span>
          </>
        ) : (
          <>
            <AlertCircle size={16} className="text-danger" />
            <span className="text-sm text-main">
              Content too large for URL - trim required
            </span>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-secondary rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getBarColor()}`}
          style={{
            width: `${Math.min(percentUsed, 100)}%`,
          }}
        />
      </div>

      {/* Size details */}
      <div className="flex justify-between text-xs text-secondary">
        <span className={getColor()}>
          {currentSize.toLocaleString()} chars
        </span>
        <span className="text-muted">
          {percentUsed.toFixed(0)}% of {maxSize.toLocaleString()} char limit
        </span>
      </div>
    </div>
  );
};
