import React, { useEffect, useState } from 'react';
import { Droppable, DroppableProps } from 'react-beautiful-dnd';

export const StrictModeDroppable: React.FC<DroppableProps> = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame to wait a tick ensures mounting logic completes
    const animation = requestAnimationFrame(() => setEnabled(true));

    return () => {
      // Clean up if component unmounts before animation frame
      cancelAnimationFrame(animation);
      setEnabled(false); // Reset on unmount/remount
    };
  }, []); // Run only once on mount

  // Don't render the Droppable on the first render pass in StrictMode
  if (!enabled) {
    return null;
  }

  // Render the actual Droppable once enabled
  return <Droppable {...props}>{children}</Droppable>;
};