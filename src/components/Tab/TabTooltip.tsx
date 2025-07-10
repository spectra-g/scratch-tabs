import React from "react";

interface TabTooltipProps {
  content: {
    title: string;
    language?: string;
    lineCount?: number;
    dateCreated: number;
    lastModified: number;
  } | null;
  position: { x: number; y: number } | null;
  visible: boolean;
}

export const TabTooltip: React.FC<TabTooltipProps> = ({
  content,
  position,
  visible,
}) => {
  if (!visible || !position || !content) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "medium",
    });
  };

  const style: React.CSSProperties = {
    position: "fixed",
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: "translateX(-50%) translateY(10px)",
    zIndex: 100,
    pointerEvents: "none",
  };

  return (
    <div
      style={style}
      className="bg-gray-900 text-gray-200 text-xs rounded-md shadow-lg border border-gray-700 whitespace-nowrap overflow-hidden" // Added overflow-hidden for clean corners
      role="tooltip"
    >
      <div className="px-3 pt-2 pb-1.5">
        <div className="font-semibold text-center mb-1.5 text-gray-100">
          {content.title}
        </div>

        <div className="space-y-0.5">
          {content.lineCount !== undefined && (
            <div>
              <span className="text-gray-400 mr-1">Lines:</span>
              <span className="text-gray-100 font-medium">
                {content.lineCount}
              </span>{" "}
              {/* Brighter Value */}
            </div>
          )}
          <div>
            <span className="text-gray-400 mr-1">Created:</span>
            <span className="text-gray-100 font-medium">
              {formatDate(content.dateCreated)}
            </span>{" "}
            {/* Brighter Value */}
          </div>
          <div>
            <span className="text-gray-400 mr-1">Modified:</span>
            <span className="text-gray-100 font-medium">
              {formatDate(content.lastModified)}
            </span>{" "}
            {/* Brighter Value */}
          </div>
        </div>
      </div>

      {content.language && (
        <div className="bg-gray-800 px-3 py-1 text-center border-t border-gray-700">
          <span className="text-gray-300 font-medium">{content.language}</span>
        </div>
      )}
    </div>
  );
};
