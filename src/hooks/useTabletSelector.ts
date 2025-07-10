import React, { useState, useRef, useCallback, useEffect } from "react";
import * as Monaco from "monaco-editor/esm/vs/editor/editor.api";

// Define the type for the update function from the store for better type safety
type UpdateTabContentFn = (tabId: string, content: string) => void;

// Estimated line height for position calculation fallback
const ESTIMATED_LINE_HEIGHT = 18;

export const useTabletSelector = (
  // Ref to the Monaco editor instance (optional, needed for editor-based positioning)
  editorRef: React.RefObject<Monaco.editor.IStandaloneCodeEditor | null>,
  // Ref to the container *around* the editor/trigger area (for getBoundingClientRect)
  triggerContainerRef: React.RefObject<HTMLDivElement | null>,
  // Current tab ID (optional, needed for clearing content)
  activeTabId: string | null | undefined,
  // Store action to update content (optional, needed for clearing content)
  updateTabContent?: UpdateTabContentFn,
) => {
  const [showTabletSelector, setShowTabletSelector] = useState(false);
  const [tabletQuery, setTabletQuery] = useState("");
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });

  // Ref for the TabletSelector component's outermost div (for click outside detection)
  const tabletSelectorContainerRef = useRef<HTMLDivElement>(null);

  // --- Positioning Logic ---
  const calculateEditorPosition = useCallback(() => {
    const editor = editorRef.current;
    const container = triggerContainerRef.current;
    if (!editor || !container) {
      console.warn(
        "TabletSelector: Editor or container ref not available for positioning.",
      );
      return null; // Cannot calculate
    }

    try {
      const position = editor.getPosition();
      if (!position) return null;

      const scrolledVisiblePosition =
        editor.getScrolledVisiblePosition(position);
      if (!scrolledVisiblePosition) return null; // Might happen if editor is hidden

      const containerRect = container.getBoundingClientRect();
      const editorLineHeight = editor.getOption(
        Monaco.editor.EditorOption.lineHeight,
      );

      return {
        x: containerRect.left + scrolledVisiblePosition.left,
        // Add line height (or estimate) to position below the current line
        y:
          containerRect.top +
          scrolledVisiblePosition.top +
          (editorLineHeight || ESTIMATED_LINE_HEIGHT),
      };
    } catch (error) {
      // Monaco might throw if editor is disposed or in a weird state
      console.error(
        "Error calculating editor position for tablet selector:",
        error,
      );
      return null;
    }
  }, [editorRef, triggerContainerRef]);

  // --- Control Functions ---

  const openTabletSelector = useCallback(
    (position?: { x: number; y: number }) => {
      let finalPosition = position;

      // If no explicit position is given, try to calculate from editor
      if (!finalPosition) {
        finalPosition = calculateEditorPosition();
      }

      // If we have a position (either provided or calculated), show the selector
      if (finalPosition) {
        setSelectorPosition(finalPosition);
        // Use setTimeout to ensure state update happens in the next tick,
        // allowing query updates in the same handler to settle first.
        setTimeout(() => setShowTabletSelector(true), 0);
      } else {
        // If position couldn't be determined, don't show the selector
        setShowTabletSelector(false);
      }
    },
    [calculateEditorPosition],
  ); // Dependency: the calculation function

  const closeTabletSelector = useCallback(
    (clearTriggerContent: boolean) => {
      setShowTabletSelector(false);
      setTabletQuery(""); // Always clear query on close

      // Optionally clear the trigger text (e.g., '/') from the editor
      if (clearTriggerContent && activeTabId && updateTabContent) {
        // Check current content before clearing, maybe only clear if it starts with '/'?
        // This prevents clearing unrelated content if the selector was closed unexpectedly.
        // Note: Accessing editor content directly here might be complex.
        // Relying on the caller (EditorInstance/WelcomeScreen) to manage
        // content state might be safer. For now, we just clear.
        updateTabContent(activeTabId, "");
      }
    },
    [activeTabId, updateTabContent],
  );

  const updateTabletQuery = useCallback((query: string) => {
    setTabletQuery(query);
  }, []);

  const clearTabletSelector = useCallback(
    () => {
      setShowTabletSelector(false);
      setTabletQuery("");
      setSelectorPosition({ x: 0, y: 0 });
      // Optionally clear content - maybe delegate this decision to the caller?
      // if (activeTabId && updateTabContent) {
      //     updateTabContent(activeTabId, '');
      // }
    },
    [
      /* activeTabId, updateTabContent */
    ],
  ); // Dependencies removed if content clearing is delegated

  // --- Click Outside Detection ---
  useEffect(() => {
    if (!showTabletSelector) {
      return; // Only run if selector is visible
    }

    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click target is outside the TabletSelector's container
      if (
        tabletSelectorContainerRef.current &&
        !tabletSelectorContainerRef.current.contains(event.target as Node)
      ) {
        // Also check if the click was outside the trigger area (optional, might be complex)
        // For simplicity, we assume any click outside the selector itself should close it.
        closeTabletSelector(true); // Clear content when clicking outside
      }
    };

    // Use mousedown to catch the click earlier than 'click'
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup function
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
    // Rerun this effect if showTabletSelector changes or closeTabletSelector function identity changes
  }, [showTabletSelector, closeTabletSelector]);

  // Return state and control functions
  return {
    showTabletSelector,
    tabletQuery,
    selectorPosition,
    tabletSelectorContainerRef, // The ref for the component to attach
    openTabletSelector,
    closeTabletSelector,
    updateTabletQuery,
    clearTabletSelector,
  };
};
