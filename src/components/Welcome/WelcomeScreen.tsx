import React, { useRef, useEffect, useCallback } from 'react';
import { useRootStore } from '../../stores';
import { useTabletSelector } from '../../hooks/useTabletSelector';
import { TabletSelector } from '../../tablets';
import { Tablet } from '../../tablets';

export const WelcomeScreen: React.FC = () => {
  const {handleNewTab, addTab} = useRootStore(); // Get actions from the store
  const welcomeRef = useRef<HTMLDivElement>(null);

  // Use the hook for managing the TabletSelector state and interactions
  // Pass null/undefined for editor-specific arguments
  const {
    showTabletSelector,
    selectorPosition,
    tabletSelectorContainerRef,
    openTabletSelector,
    closeTabletSelector,
  } = useTabletSelector(
    null, // No editorRef
    welcomeRef, // Pass the ref for positioning context
    null, // No activeTabId
    undefined // No updateTabContent function needed here
  );

  // --- Event Handlers ---

  const handleDoubleClick = useCallback(() => {
    handleNewTab(false); // Create a new blank tab
  }, [handleNewTab]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      handleNewTab(false, text); // Create a new tab with pasted content
    }
  }, [handleNewTab]);

  // Handle tablet selection from the selector shown on the welcome screen
  const handleTabletSelect = useCallback((tablet: Tablet) => {
    // Create initial tablet state
    const state = tablet.createInitialState();
    const serializedState = tablet.serializeState ? tablet.serializeState(state) : JSON.stringify(state);

    // Add a new tab directly using the addTab action
    addTab({
      id: crypto.randomUUID(),
      title: tablet.label,
      content: '', // Tablets start with no editor content
      language: 'plaintext',
      languageLocked: true, // Lock language for tablets
      isTablet: true,
      tabletState: serializedState,
      cursorPosition: {lineNumber: 1, column: 1},
    });

    closeTabletSelector(false); // Close selector, don't need to clear editor content
  }, [addTab, closeTabletSelector]);

  // --- Global Keydown Listener for '/' ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only trigger if the welcome screen is visible (implicitly true if this component is mounted)
      // and the selector isn't already shown, and the target isn't an input field
      if (
        e.key === '/' &&
        !showTabletSelector &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault(); // Prevent typing '/' into other potential inputs
        if (welcomeRef.current) {
          // Calculate position relative to the welcome container
          const rect = welcomeRef.current.getBoundingClientRect();
          // Center the selector horizontally, position below the title area
          const position = {
            x: rect.left + rect.width / 2 - 150, // Adjust horizontal offset as needed (150 is approx half width of selector)
            y: rect.top + 150, // Adjust vertical offset as needed
          };
          openTabletSelector(position); // Open the selector at the calculated position
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    // Cleanup listener when the WelcomeScreen component unmounts
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
    // Re-run effect if dependencies change (though they likely won't here)
  }, [showTabletSelector, openTabletSelector]);

  return (
    <div
      ref={welcomeRef}
      className="h-full w-full flex flex-col items-center pt-24 md:pt-32 text-gray-400 cursor-pointer relative outline-none"
      onDoubleClick={handleDoubleClick}
      onPaste={handlePaste}
      tabIndex={-1} // Make div focusable for paste, but not via tab key
    >
      <img
        src="/favicon-gray.svg" // Ensure this path is correct relative to your public folder
        alt="Scratch Tabs Logo"
        className="w-16 h-16 mb-6"
      />
      <h1 className="text-2xl font-semibold mb-8 text-gray-200">Welcome to Scratch Tabs!</h1>
      <div className="text-center max-w-md"> {/* Added max-width */}
        <p className="mb-8 text-lg text-gray-300">To get started:</p>
        <ol
          className="list-decimal list-inside text-left space-y-3 text-gray-400 mx-auto inline-block"> {/* Centered list */}
          <li>Double-click anywhere here</li>
          <li>Click the '+' icon <span className="text-xs">(top right)</span></li>
          <li>Paste text from your clipboard</li>
          <li>Type <span className="font-mono bg-gray-700 px-1 rounded text-gray-300">/</span> to select a Tablet</li>
        </ol>
      </div>

      {/* Render Tablet Selector conditionally */}
      {showTabletSelector && (
        <div
          ref={tabletSelectorContainerRef} // Attach ref for click-outside detection
          style={{
            position: 'absolute', // Use absolute positioning relative to welcomeRef
            left: `${selectorPosition.x}px`,
            top: `${selectorPosition.y}px`,
            zIndex: 50, // Ensure it's above other welcome content
          }}
        >
          <TabletSelector
            searchQuery="" // Welcome screen selector doesn't need a query initially
            onSelect={handleTabletSelect}
            onClose={() => closeTabletSelector(false)} // Close without clearing content
            showSearch={true} // Allow searching within the selector
          />
        </div>
      )}
    </div>
  );
};