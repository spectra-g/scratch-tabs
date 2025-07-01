import React from 'react';
import clsx from 'clsx';

interface PreviewDividerProps {
  dividerProps: {
    onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
    style: {
      cursor: string;
    };
  };
  isDragging: boolean;
  isPreviewEnabled: boolean;
}

export const PreviewDivider: React.FC<PreviewDividerProps> = ({
  dividerProps,
  isDragging,
  isPreviewEnabled,
}) => {
  return (
    <div
      {...dividerProps}
      className={clsx(
        'flex-shrink-0',
        'w-1.5',
        'relative',
        'group',
        isPreviewEnabled ? 'cursor-col-resize' : 'cursor-default',
        {
          'bg-blue-500': isDragging,
          'bg-gray-700 group-hover:bg-blue-500': !isDragging,
        },
        'transition-colors duration-100 ease-in-out'
      )}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Visual handle in the middle */}
      {isPreviewEnabled && (
        <div
          className={clsx(
            'absolute top-1/2 left-1/2',
            'transform -translate-x-1/2 -translate-y-1/2',
            'w-4 h-8',
            'flex items-center justify-center',
            'pointer-events-none'
          )}
        >
          <div className={clsx(
            'w-0.5 h-4',
            'rounded-full',
            isDragging ? 'bg-white' : 'bg-gray-400 group-hover:bg-white'
          )}></div>
        </div>
      )}
    </div>
  );
}; 