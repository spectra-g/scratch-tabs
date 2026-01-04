import { useState, useCallback } from "react";

// Define the type for the update function from the store for better type safety
type UpdateTabContentFn = (tabId: string, content: string) => void;

export const useToolSelector = (
    // Current tab ID (optional, needed for clearing content)
    activeTabId: string | null | undefined,
    // Store action to update content (optional, needed for clearing content)
    updateTabContent?: UpdateTabContentFn,
) => {
    const [showToolSelector, setShowToolSelector] = useState(false);
    const [toolQuery, setToolQuery] = useState("");

    const openToolSelector = useCallback(
        (query: string = "") => {
            setToolQuery(query);
            setShowToolSelector(true);
        },
        [],
    );

    const closeToolSelector = useCallback(
        (clearTriggerContent: boolean = false) => {
            setShowToolSelector(false);
            setToolQuery("");

            // Optionally clear the trigger text (e.g., '/') from the editor
            if (clearTriggerContent && activeTabId && updateTabContent) {
                updateTabContent(activeTabId, "");
            }
        },
        [activeTabId, updateTabContent],
    );

    const updateToolQuery = useCallback((query: string) => {
        setToolQuery(query);
    }, []);

    return {
        showToolSelector,
        toolQuery,
        openToolSelector,
        closeToolSelector,
        updateToolQuery,
    };
};
