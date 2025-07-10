import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { debounce } from "../utils/domUtils";

// Type for the callback function to update the ratio in the parent state (e.g., Zustand store)
type SetSplitRatioCallback = (ratio: number) => void;

interface UseSplitViewResizerOptions {
  initialRatio?: number;
  minRatio?: number; // Minimum ratio for the left pane (e.g., 0.2 for 20%)
  maxRatio?: number; // Maximum ratio for the left pane (e.g., 0.8 for 80%)
  debounceMs?: number; // Debounce delay for updating parent state
}

const DEFAULT_MIN_RATIO = 0.15; // Example: Minimum 15% width for either pane
const DEFAULT_MAX_RATIO = 0.85; // Example: Maximum 85% width
const DEFAULT_DEBOUNCE_MS = 50;

export const useSplitViewResizer = (
  isSplitEnabled: boolean, // Is the split view currently active?
  initialRatioValue: number, // The ratio controlled by the parent state
  setSplitRatioCallback: SetSplitRatioCallback, // Function to update parent state
  options: UseSplitViewResizerOptions = {},
) => {
  const {
    minRatio = DEFAULT_MIN_RATIO,
    maxRatio = DEFAULT_MAX_RATIO,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = options;

  const [isDragging, setIsDragging] = useState(false); // State for React rendering/styling
  const isDraggingRef = useRef(false); // Ref for immediate access in listeners

  // Local state for immediate visual feedback during drag
  const [currentRatio, setCurrentRatio] = useState(initialRatioValue);
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref to store the callback to avoid dependency issues in listeners
  const callbackRef = useRef(setSplitRatioCallback);
  // Ref to store the latest isSplitEnabled value for use in listeners
  const isSplitEnabledRef = useRef(isSplitEnabled);
  const latestRatioRef = useRef(initialRatioValue);

  // --- ADD HELPER TO SYNC STATE AND REF ---
  const setDragging = useCallback((dragging: boolean) => {
    setIsDragging(dragging);
    isDraggingRef.current = dragging;
  }, []); // No dependencies needed for this helper

  // Update refs when props change
  useEffect(() => {
    callbackRef.current = setSplitRatioCallback;
  }, [setSplitRatioCallback]);

  useEffect(() => {
    isSplitEnabledRef.current = isSplitEnabled;
  }, [isSplitEnabled]);

  // Sync local state AND latestRatioRef if the external initialRatioValue changes (and not dragging)
  useEffect(() => {
    // Use the ref here for the check, as state might be lagging
    if (!isDraggingRef.current) {
      setCurrentRatio(initialRatioValue);
      latestRatioRef.current = initialRatioValue; // Also sync the ratio ref
    }
  }, [initialRatioValue]); // Depend only on initialRatioValue

  // Debounced function to update the parent state
  const debouncedSetRatio = useMemo(
    () =>
      debounce((ratio: number) => {
        callbackRef.current(ratio);
      }, debounceMs),
    [debounceMs],
  );

  // Cleanup debouncer on unmount
  useEffect(() => {
    return () => {
      debouncedSetRatio.cancel();
    };
  }, [debouncedSetRatio]);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      // --- CHECK REF ---
      if (
        !isDraggingRef.current ||
        !containerRef.current ||
        !isSplitEnabledRef.current
      ) {
        return;
      }
      event.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;
      if (containerWidth <= 0) return;
      const mouseX = event.clientX - rect.left;
      let newRatio = mouseX / containerWidth;
      newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));

      setCurrentRatio(newRatio); // Update state for styles
      latestRatioRef.current = newRatio; // Update ref for final value
      debouncedSetRatio(newRatio);
    },
    [minRatio, maxRatio, debouncedSetRatio],
  );

  const handleMouseUp = useCallback(() => {
    // --- CHECK REF ---
    if (!isDraggingRef.current) return;

    const finalRatio = latestRatioRef.current;

    setDragging(false); // --- USE HELPER ---
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "";

    debouncedSetRatio.cancel();
    callbackRef.current(finalRatio);
  }, [handleMouseMove, debouncedSetRatio, setDragging]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isSplitEnabledRef.current) return;
      if (event.button !== 0) return;
      event.preventDefault();

      latestRatioRef.current = currentRatio; // Initialize latest ratio ref
      setDragging(true); // --- USE HELPER ---
      document.body.style.cursor = "col-resize";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [handleMouseMove, handleMouseUp, currentRatio, setDragging],
  );

  // Calculate pane styles based on the currentRatio STATE (for visual feedback)
  const paneStyles = useMemo(() => {
    if (!isSplitEnabled) {
      return {
        leftPaneStyle: {
          flex: "1 1 auto",
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
        },
        rightPaneStyle: {
          flex: "0 0 0",
          display: "none",
          minWidth: 0,
          width: "0%",
        },
      };
    }
    const leftPercent = Math.max(15, Math.min(85, currentRatio * 100));
    const rightPercent = 100 - leftPercent;

    return {
      leftPaneStyle: {
        flex: `0 0 ${leftPercent}%`,
        minWidth: 0,
        width: `${leftPercent}%`,
        maxWidth: `${leftPercent}%`,
        boxSizing: "border-box" as const,
      },
      rightPaneStyle: {
        flex: `0 0 ${rightPercent}%`,
        minWidth: 0,
        width: `${rightPercent}%`,
        maxWidth: `${rightPercent}%`,
        boxSizing: "border-box" as const,
      },
    };
  }, [currentRatio, isSplitEnabled]);

  // Props to be spread onto the divider element
  const dividerProps = useMemo(
    () => ({
      onMouseDown: handleMouseDown,
      style: {
        cursor: isSplitEnabled ? "col-resize" : "default",
      },
    }),
    [handleMouseDown, isSplitEnabled],
  ); // Keep handleMouseDown dependency

  return {
    containerRef,
    leftPaneStyle: paneStyles.leftPaneStyle,
    rightPaneStyle: paneStyles.rightPaneStyle,
    dividerProps,
    isDragging, // Return the STATE for external use (e.g., styling)
  };
};
