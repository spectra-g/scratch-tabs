---

# Application Data Flow & State Management Architecture

## 1. Overview & Guiding Philosophy

This document outlines the core architecture for state management in Scratch Tabs, specifically concerning tab content and the Monaco editor. The primary goal of this architecture is to **ensure high performance and low memory usage**, even when handling numerous tabs with very large content (e.g., >1MB files).

The core philosophy is to **decouple the editor's state from React's declarative state management**. Large strings, like tab content, should not be stored in a global state store (like Zustand) that triggers widespread component re-renders on every change (e.g., every keystroke).

## 2. Core Principles (The Golden Rules)

These are the non-negotiable principles of the architecture. Adhere to them to prevent performance regressions.

1.  **React State is for UI State, Not Document State:** Zustand stores (`tabsStore`, `splitViewStore`) should hold UI-related state and lightweight metadata (IDs, titles, settings), but **NOT** the full content of large documents.
2.  **The `ModelManager` is the Source of Truth for Live Content:** For any tab currently active or recently used, its corresponding Monaco Model, managed by the `ModelManager`, is the single source of truth for its content.
3.  **The `tabsStore` Holds "Last-Saved" Content:** The `content` property on a `Tab` object within `tabsStore` represents the last known state of the content. It is used for persistence and for re-hydrating an editor model when it's requested from the `ModelManager` after being evicted from the cache. **If `tab.content` is missing**, the `ModelManager` automatically fetches it from the database and updates the store for consistency.
4.  **Data Flow is One-Way and Imperative for Content:**
    *   **User Input:** `User` -> `Monaco Editor` -> `Monaco Model`
    *   **State Update:** `Monaco Model` (`onDidChangeContent`) -> `ModelManager` (centralized handler) -> `tabsStore` (updates `tab.content`)
    *   **Persistence:** `persistenceStore` (`saveState`) -> `IndexedDB`
5.  **Centralized Content Logic:** All content-related operations (language detection, auto-formatting, content synchronization) are handled centrally within the `ModelManager` to eliminate redundancy and ensure consistency.
6.  **Performance Testing in Progress:** Large content guardrails have been temporarily removed as an experiment to identify which features actually cause performance issues versus which ones were preemptively protected. This will help optimize only the features that truly need performance controls.

## 3. Component & Service Responsibilities

### `ModelManager` (`services/modelManager.ts`)

The `ModelManager` is a singleton responsible for managing Monaco editor models for all open tabs. **It serves as the central hub for all content-related operations**, including content synchronization, language detection, and auto-formatting.

#### Core Responsibilities

- **Model Lifecycle Management:** Creating, caching, and disposing Monaco models for each tab.
- **Memory Management:** Ensuring only a limited number of models (default: 10) are kept in memory at once (LRU eviction).
- **Content Synchronization:** Automatically syncing model content with the application store and database.
- **Language Detection:** Detecting language changes based on content and triggering appropriate updates.
- **Auto-Formatting:** Handling automatic document formatting for paste operations (while preventing unwanted formatting for programmatic changes).
- **Paste Detection:** Distinguishing between user paste operations and programmatic content changes.
- **Error Handling:** Providing robust error boundaries for all content operations.

#### Centralized Content Change Handling

The `ModelManager` implements a **centralized content change handler** that processes all content modifications through a single pathway:

1. **Content Change Detection:** `onDidChangeContent` listener captures all content modifications
2. **Store Synchronization:** Updates `tabsStore` with the latest content via `updateTabContent`
3. **Language Detection Logic:** Analyzes content changes to determine if language detection should be triggered
4. **Significant Change Analysis:** Uses heuristics to identify meaningful content changes vs. minor edits
5. **Auto-Format Triggering:** Automatically formats content only for user paste operations, not programmatic changes

#### Paste Detection System

To solve the original bug where JSON minify operations triggered unwanted auto-formatting:

- **Paste Event Capture:** `EditorInstance` captures `onDidPaste` events and marks the next change as paste-originated
- **Timeout-Based Flagging:** Paste flags are automatically cleared after 100ms to handle async operations
- **Selective Auto-Formatting:** Only paste-originated significant changes trigger auto-formatting

#### Lifecycle and Caching
- When a tab is opened, `ModelManager.get(tab)` returns a Monaco model for that tab, creating it if necessary.
- If the model already exists and is not disposed, it is returned from the cache.
- If the model is disposed or missing, a new model is created.
- If the number of models exceeds the cache limit, the least recently used model is evicted and disposed.
- When a model is disposed, its latest content is saved to the store before cleanup.

#### Content Synchronization
- Model content is kept in sync with the store via centralized `onDidChangeContent` listeners.
- If a tab's content is missing, ModelManager fetches it from the database and updates the store.
- All content changes flow through the centralized handler to ensure consistency.

#### Language Detection Integration
- **Significant Change Detection:** Uses length differences, line count changes, and content similarity to identify meaningful changes
- **Language Detection Logic:** Automatically detects language based on content patterns
- **Auto-Format Integration:** Triggers document formatting only for paste operations that result in language changes
- **Ambiguity Handling:** Respects language detection confidence levels and user language locks

#### Error Handling
- ModelManager methods are designed to be robust: if an error occurs (e.g., model creation fails), it logs a warning and returns a fallback (empty) model or does nothing, rather than throwing.
- Methods like `updateModelContent` and `updateModelLanguage` are no-ops if the model does not exist or is disposed.
- Language detection errors are caught and logged without disrupting the user experience.

#### Singleton Usage
- ModelManager is a singleton. Its state is global for the app session.
- Tests and consumers should call `disposeAll()` to reset state if needed.

#### API
- `get(tab: Tab): Promise<ITextModel>`: Returns or creates a model for the tab.
- `dispose(tabId: string)`: Disposes a model and its listener, saving final content first.
- `disposeAll()`: Disposes all models.
- `updateModelContent(tabId, content)`: Updates the model's content if it exists.
- `updateModelLanguage(tabId, language)`: Updates the model's language if it exists.
- `getContent(tabId)`: Gets the current content of a model.
- `markNextChangeAsPaste(tabId)`: Marks the next content change as originating from a paste operation.
- `registerCursorPositionListener(tabId, editor)`: Sets up cursor position listening and debounced persistence for a tab.
- `unregisterCursorPositionListener(tabId)`: Cleans up cursor position listening for a tab.
- `getDebugInfo()`: Returns cache and LRU state for debugging.

#### Cursor Position Management

**CRITICAL ARCHITECTURAL DECISION:** Cursor position is **NOT stored in React state** to prevent performance issues and undo functionality disruption.

**The Architecture:**
1. **Monaco Editor's Native View State:** Primary source of truth for cursor position, scroll, selection, and folded regions
2. **ModelManager Persistence:** Debounced database persistence (1-second delay) for cursor position recovery across sessions
3. **No React State:** Cursor position changes do not trigger React re-renders or Zustand state updates

**Implementation Details:**
- **View State Management:** `EditorInstance` uses Monaco's native `saveViewState()` and `restoreViewState()` for immediate UI needs (tab switching)
- **Persistence Layer:** `ModelManager.registerCursorPositionListener()` sets up debounced persistence to database via `storage.updateTabCursor()`
- **Performance Benefit:** Eliminates cursor-position-triggered re-render cascades that were interfering with Monaco's undo system
- **Undo Fix:** The removal of cursor position from React state resolved the critical undo functionality issue

**Previous Architecture Issue:**
Before this fix, cursor position was stored in React state, causing:
- High-frequency state updates on every cursor movement
- React re-renders cascading through the component tree
- Interference with Monaco Editor's internal undo operations
- Performance degradation from unnecessary component updates

**Data Flow:**
```
User moves cursor → Monaco Editor (immediate UI update)
                  ↓
                  onDidChangeCursorPosition → ModelManager (debounced)
                  ↓
                  Database persistence (1-second delay)
```

**View State Recovery:**
```
Tab Switch → EditorInstance.saveViewState() → tabViewStates Map (immediate)
Tab Restore → EditorInstance.restoreViewState() → Monaco Editor (immediate)
Session Restore → Database → Monaco Editor (on startup)
```

#### Notes
- **Single Source of Truth:** ModelManager is the definitive source for Monaco models, their lifecycle, and all content-related operations.
- **Centralized Logic:** All content change handling, language detection, and auto-formatting logic is consolidated within ModelManager.
- **No Redundant Pathways:** The previous callback system has been eliminated; all content changes flow through the centralized handler.
- **Preserved Functionality:** Paste detection and significant change analysis are maintained to prevent unwanted auto-formatting.
- **Performance Optimized:** Eliminates duplicate operations and provides efficient content synchronization.

### `EditorInstance.tsx`

*   **Role:** A "dumb" view component that hosts a Monaco editor and handles user interaction events.
*   **Purpose:** To render the editor UI, connect it to the correct model from the `ModelManager`, and capture user interaction events.
*   **Responsibilities:**
    *   It receives an `activeTabId` as a prop.
    *   In a `useEffect` hook that runs when `activeTabId` changes, it:
        1.  Saves the view state (scroll position, cursor, selection, folded regions) of the *previous* tab's model using Monaco's native `saveViewState()`.
        2.  Asks the `ModelManager` for the model corresponding to the *new* `activeTabId`.
        3.  Sets this new model on its internal Monaco editor instance (`editor.setModel(newModel)`).
        4.  Restores the view state for the new tab using Monaco's native `restoreViewState()`, if it exists.
    *   **Cursor Position Management:** Registers cursor position listening with `ModelManager` for debounced database persistence (does NOT update React state).
    *   **Paste Detection:** Captures `onDidPaste` events and notifies `ModelManager` via `markNextChangeAsPaste()`.
    *   **MUST NOT** receive `tab.content` as a prop and pass it to the `<Editor>` component's `value` prop. The model is managed imperatively.
    *   **MUST NOT** handle content change callbacks directly. All content logic is centralized in `ModelManager`.
    *   **MUST NOT** store cursor position in React state. All cursor position logic is handled by Monaco's view state and ModelManager's persistence layer.
    *   It can receive the full `activeTab` object for metadata (like language, title) but should rely on the model for content.

### Zustand Stores

#### `tabsStore.ts`

*   **Role:** Holds an array of `Tab` objects representing all tabs in the *current workspace*.
*   **Purpose:** To provide a lightweight, reactive list of tab metadata for UI components like the `TabBar`.
*   **The `Tab.content` Property:** This property **IS NOT THE LIVE SOURCE OF TRUTH**. It is a "last-known-good" state that is updated by the `ModelManager`'s centralized content handler. Its primary uses are:
    1.  To provide the initial content when creating a new model in `ModelManager`.
    2.  To be the content that gets written to `IndexedDB` by the `persistenceStore`.
    3.  To serve as the source of truth for persistence operations.

#### `splitViewStore.ts`

*   **Role:** Manages the UI layout of the tab panes.
*   **Purpose:** To track which tabs are on which side, which side is active, and the split ratio.
*   **Responsibilities:**
    *   Holds `leftTabs` and `rightTabs` (arrays of `tabId` strings).
    *   Holds `activeLeftTabId` and `activeRightTabId`.
    *   Contains all logic for moving tabs between panes, splitting, and unsplitting.

#### `persistenceStore.ts`

*   **Role:** Handles saving the application state to `IndexedDB`.
*   **Purpose:** To periodically and reliably persist user work.
*   **Responsibilities:**
    *   The `saveState` function is the main entry point.
    *   **Simplified Logic:** Trusts `tabsStore` as the source of truth for content, as the `ModelManager`'s centralized handler ensures the store is always up-to-date.
    *   **No ModelManager Polling:** No longer needs to poll `ModelManager` for latest content, as the centralized content handler maintains store consistency.

#### `rootStore.ts`

*   **Role:** An action coordinator. It does not hold significant state itself.
*   **Purpose:** To provide a single, unified API for components to perform complex actions that span multiple stores.
*   **Example Action (`removeTab`):**
    1.  Calls `modelManager.dispose(tabId)` to free memory.
    2.  Calls `splitViewStore.removeTabFromSide(tabId)` to update the UI layout.
    3.  Calls `tabsStore.removeTab(id)` to remove the tab's metadata.
    4.  Calls `storage.deleteTab(id)` to remove from the database.

## 4. Key Data Flow Example: User Typing

This flow is critical to the performance of the application and demonstrates the centralized architecture.

1.  **User types a character** in an `EditorInstance`.
2.  The Monaco editor updates its internal `ITextModel`.
3.  The `onDidChangeContent` listener (attached by `ModelManager` when the model was created) fires.
4.  **Centralized Content Handler** in `ModelManager` processes the change:
    *   Updates `tabsStore` via `updateTabContent(tabId, newContent)`
    *   Analyzes the change for language detection triggers
    *   Handles auto-formatting if appropriate (paste operations only)
    *   Updates internal content tracking for future comparisons
5.  The `content` property in the `tabsStore` for that specific tab is updated.
6.  **Crucially, no major re-renders occur.** The `EditorInstance` is not re-rendered because it doesn't depend on `tab.content`. Cursor position changes also do not trigger re-renders as they are handled by Monaco's native view state. The `TabBar` might re-render if it depends on `tab.content` for something like a line count indicator, but this is a small, localized update.
7.  Periodically, `persistenceStore.saveState()` runs, reads the up-to-date content from `tabsStore`, and saves it to `IndexedDB`.

This flow ensures that typing is always responsive, as it's handled entirely by Monaco, with only a lightweight state update happening in the background through the centralized handler.

## 5. Key Data Flow Example: Paste Operation

This flow demonstrates how the centralized architecture handles the critical paste detection and auto-formatting logic.

1.  **User pastes content** in an `EditorInstance`.
2.  **Paste Detection:** `EditorInstance` captures the `onDidPaste` event and calls `modelManager.markNextChangeAsPaste(tabId)`.
3.  The Monaco editor updates its internal `ITextModel` with the pasted content.
4.  The `onDidChangeContent` listener fires immediately after the paste.
5.  **Centralized Content Handler** processes the paste-originated change:
    *   Recognizes the change as paste-originated via the paste flag
    *   Updates `tabsStore` with the new content
    *   Analyzes the change as "significant" due to the large content difference
    *   Triggers language detection based on the new content
    *   **Auto-formats the document** because it was a paste operation (not a programmatic change)
    *   Clears the paste flag after processing
6.  The document is automatically formatted and the language is updated if detected.
7.  **Contrast with Programmatic Changes:** If the same content change had been made programmatically (e.g., JSON minify operation), the paste flag would not be set, and auto-formatting would be skipped, preventing the original bug.

This flow ensures that auto-formatting only occurs for user-initiated paste operations, solving the original performance issue with unwanted formatting.

## 6. Database Fallback Flow: Content Recovery

This flow is crucial for handling edge cases where tab content might be missing from the store.

1.  **Tab Switch or Model Request:** Component requests a model for a tab from `ModelManager`.
2.  **Content Validation:** `ModelManager` checks if `tab.content` is available and valid.
3.  **Database Fallback (if needed):**
    *   If `tab.content` is undefined or null, `ModelManager` fetches content from `IndexedDB`.
    *   Promise caching prevents duplicate fetches for the same tab.
4.  **Store Synchronization:** Fetched content is immediately updated in `tabsStore` to maintain consistency.
5.  **Model Creation:** Monaco model is created using either store content or database-fetched content.
6.  **Centralized Handler Setup:** The centralized content change handler is attached to the new model.
7.  **Error Handling:** If database fetch fails, an empty string is used as fallback to prevent crashes.

This flow ensures that:
*   **Silent failures are prevented** - Empty tabs due to missing content are recovered automatically.
*   **Data consistency is maintained** - Store is updated with fetched content for future use.
*   **Performance is optimized** - Content is only fetched when actually needed (lazy loading).
*   **Memory usage is reduced** - Not all tab content needs to be loaded upfront in the store.
*   **Centralized Logic Applied** - All content operations flow through the same centralized handler.

## 7. Architecture Benefits

The centralized ModelManager architecture provides several key benefits:

### Performance Benefits
- **Eliminates Redundant Operations:** Single pathway for all content changes prevents duplicate processing
- **Reduces Component Complexity:** EditorInstance is simplified to focus only on view concerns
- **Optimizes Memory Usage:** Efficient model caching with LRU eviction
- **Prevents Unnecessary Re-renders:** Content changes don't trigger React re-renders
- **Cursor Position Optimization:** Cursor movements no longer trigger React state updates or component re-renders
- **Undo System Restoration:** Removing cursor position from React state fixed Monaco Editor's undo functionality

### Maintainability Benefits  
- **Single Source of Truth:** All content logic centralized in ModelManager
- **Clear Separation of Concerns:** Each component has a focused responsibility
- **Consistent Error Handling:** Centralized error boundaries and logging
- **Simplified Testing:** Centralized logic is easier to test and mock

### Reliability Benefits
- **Robust Error Recovery:** Graceful handling of edge cases and failures
- **Data Consistency:** Automatic synchronization between model, store, and database
- **Paste Detection:** Prevents unwanted auto-formatting on programmatic changes
- **Language Detection:** Intelligent content analysis for appropriate language switching

### Scalability Benefits
- **Clean Extension Points:** New content-related features can be added to the centralized handler
- **Performance Monitoring:** Centralized location for performance instrumentation
- **Memory Management:** Automatic cleanup and disposal of unused resources
- **Database Integration:** Seamless fallback to persistent storage when needed
