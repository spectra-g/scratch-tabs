import React from 'react';

interface TabTooltipProps {
  content: {
    title: string;
    language?: string; // Ensure language is optional here too
    lineCount?: number;
  } | null;
  position: { x: number; y: number } | null;
  visible: boolean;
}

export const TabTooltip: React.FC<TabTooltipProps> = ({ content, position, visible }) => {
  if (!visible || !position || !content) {
    return null;
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'translateX(-50%)',
    zIndex: 100,
    pointerEvents: 'none',
  };

  return (
    <div
      style={style}
      className="bg-gray-900 text-gray-200 text-xs px-3 py-1.5 rounded-md shadow-lg border border-gray-700 whitespace-nowrap"
      role="tooltip"
    >
      <div className="font-semibold">{content.title}</div>
      {content.language && (
        <div className="text-gray-400">Language: {content.language}</div>
      )}
      {content.lineCount && (
          <div className="text-gray-400">Lines: {content.lineCount}</div>
      )}
    </div>
  );
};