import React from 'react';
import clsx from 'clsx'; // Using clsx for cleaner conditional classes (npm install clsx)

interface SplitViewDividerProps {
  // Props provided by the useSplitViewResizer hook (includes onMouseDown, style.cursor)
  dividerProps: React.HTMLAttributes<HTMLDivElement>;
  // State indicating if the divider is currently being dragged
  isDragging: boolean;
  // State indicating if split view is enabled (might affect appearance/cursor)
  isSplitEnabled: boolean;
}

export const SplitViewDivider: React.FC<SplitViewDividerProps> = ({
                                                                    dividerProps,
                                                                    isDragging,
                                                                    isSplitEnabled, // Although cursor style is likely handled in dividerProps.style
                                                                  }) => {
  return (
    <div
      {...dividerProps} // Spread the props from the hook (onMouseDown, style, etc.)
      className={clsx(
        'flex-shrink-0', // Prevent the divider itself from shrinking
        'w-1.5',         // Width of the divider drag area
        'relative',      // For positioning the inner handle
        'group',         // For hover effects on the parent/handle
        // Apply cursor only when split is enabled (also handled by hook's style prop)
        isSplitEnabled ? 'cursor-col-resize' : 'cursor-default',
        // Background colors based on state
        {
          'bg-blue-500': isDragging, // Blue when dragging
          'bg-gray-700 group-hover:bg-blue-500': !isDragging, // Gray normally, blue on hover
        },
        'transition-colors duration-100 ease-in-out' // Smooth color transition
      )}
      // Prevent browser's default drag behavior for the element itself
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Optional: Visual handle in the middle */}
      {isSplitEnabled && ( // Only show handle if split is enabled
        <div
          className={clsx(
            'absolute top-1/2 left-1/2',
            'transform -translate-x-1/2 -translate-y-1/2',
            'w-4 h-8', // Hit area for the visual handle (can be larger than visual part)
            'flex items-center justify-center',
            'pointer-events-none' // Ensure handle doesn't interfere with mouse events on the parent
          )}
        >
          <div className={clsx(
            'w-0.5 h-4', // Visual size of the handle line
            'rounded-full',
            // Handle color changes with dragging/hover state of the parent
            isDragging ? 'bg-white' : 'bg-gray-400 group-hover:bg-white'
          )}></div>
        </div>
      )}
    </div>
  );
};