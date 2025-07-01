import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { debounce } from '../utils/domUtils';

interface UseMarkdownPreviewResizerOptions {
  minRatio?: number; // Minimum ratio for the editor pane (e.g., 0.2 for 20%)
  maxRatio?: number; // Maximum ratio for the editor pane (e.g., 0.8 for 80%)
  debounceMs?: number; // Debounce delay for visual updates
}

const DEFAULT_MIN_RATIO = 0.2; // Minimum 20% width for editor
const DEFAULT_MAX_RATIO = 0.8; // Maximum 80% width for editor
const DEFAULT_DEBOUNCE_MS = 16; // ~60fps for smooth resizing
const DEFAULT_INITIAL_RATIO = 0.5; // 50-50 split

export const useMarkdownPreviewResizer = (
  isPreviewEnabled: boolean, // Is the preview currently active?
  options: UseMarkdownPreviewResizerOptions = {}
) => {
  const {
    minRatio = DEFAULT_MIN_RATIO,
    maxRatio = DEFAULT_MAX_RATIO,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = options;

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  // Local state for the current ratio (resets to 50-50 when preview is toggled)
  const [currentRatio, setCurrentRatio] = useState(DEFAULT_INITIAL_RATIO);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPreviewEnabledRef = useRef(isPreviewEnabled);

  // Reset to 50-50 when preview is toggled on/off
  useEffect(() => {
    if (isPreviewEnabled !== isPreviewEnabledRef.current) {
      setCurrentRatio(DEFAULT_INITIAL_RATIO);
      isPreviewEnabledRef.current = isPreviewEnabled;
    }
  }, [isPreviewEnabled]);

  // Helper to sync state and ref
  const setDragging = useCallback((dragging: boolean) => {
    setIsDragging(dragging);
    isDraggingRef.current = dragging;
  }, []);

  // Debounced function for smooth visual updates during drag
  const debouncedSetRatio = useMemo(
    () => debounce((ratio: number) => {
      setCurrentRatio(ratio);
    }, debounceMs),
    [debounceMs]
  );

  // Cleanup debouncer on unmount
  useEffect(() => {
    return () => {
      debouncedSetRatio.cancel();
    };
  }, [debouncedSetRatio]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current || !isPreviewEnabledRef.current) {
      return;
    }
    event.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    if (containerWidth <= 0) return;
    
    const mouseX = event.clientX - rect.left;
    let newRatio = mouseX / containerWidth;
    newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));

    // Update immediately for smooth dragging
    setCurrentRatio(newRatio);
  }, [minRatio, maxRatio]);

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;

    setDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove, setDragging]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isPreviewEnabledRef.current) return;
    if (event.button !== 0) return; // Only left mouse button
    event.preventDefault();

    setDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection while dragging
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp, setDragging]);

  // Calculate pane styles based on the currentRatio
  const paneStyles = useMemo(() => {
    if (!isPreviewEnabled) {
      return {
        editorStyle: { 
          flex: '1 1 auto', 
          minWidth: 0,
          width: '100%'
        },
        previewStyle: { 
          flex: '0 0 0', 
          display: 'none',
          minWidth: 0,
          width: '0%'
        },
      };
    }

    const editorPercent = Math.max(minRatio * 100, Math.min(maxRatio * 100, currentRatio * 100));
    const previewPercent = 100 - editorPercent;
    
    return {
      editorStyle: { 
        flex: `0 0 ${editorPercent}%`, 
        minWidth: 0,
        width: `${editorPercent}%`,
        maxWidth: `${editorPercent}%`,
        boxSizing: 'border-box' as const
      },
      previewStyle: { 
        flex: `0 0 ${previewPercent}%`, 
        minWidth: 0,
        width: `${previewPercent}%`,
        maxWidth: `${previewPercent}%`,
        boxSizing: 'border-box' as const
      },
    };
  }, [currentRatio, isPreviewEnabled, minRatio, maxRatio]);

  // Props to be spread onto the divider element
  const dividerProps = useMemo(() => ({
    onMouseDown: handleMouseDown,
    style: {
      cursor: isPreviewEnabled ? 'col-resize' : 'default',
    }
  }), [handleMouseDown, isPreviewEnabled]);

  return {
    containerRef,
    editorStyle: paneStyles.editorStyle,
    previewStyle: paneStyles.previewStyle,
    dividerProps,
    isDragging,
  };
}; 