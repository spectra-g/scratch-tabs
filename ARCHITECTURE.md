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
    *   **State Update:** `Monaco Model` (`onDidChangeContent`) -> `tabsStore` (updates `tab.content`)
    *   **Persistence:** `persistenceStore` (`saveState`) -> `IndexedDB`
5.  **Performance Guardrails are Intentional:** Code that checks for content size (e.g., `LARGE_CONTENT_THRESHOLD`) is a deliberate performance optimization. It disables expensive features (like JSON validation or auto-formatting) for large files to keep the UI responsive. **Do not remove these checks without a clear performance-conscious alternative.**

## 3. Component & Service Responsibilities

### `ModelManager` (`services/modelManager.ts`)

This is the most critical piece of the architecture.

*   **Role:** Manages a **Least Recently Used (LRU) cache** of active Monaco editor models and acts as a **Content Gateway** between the store and database.
*   **Purpose:** To limit the number of memory-intensive Monaco models that exist at any given time, regardless of how many tabs are open, and to ensure reliable access to tab content.
*   **Responsibilities:**
    *   Maintain a map of `tabId -> ITextModel`.
    *   Limit the number of stored models to `MAX_MODELS`.
    *   **Content Gateway Functionality (NEW):**
        *   When a model is requested via `get(tab)`, it first checks if `tab.content` is available.
        *   If content is missing (undefined/null), it fetches the content from the database as a fallback.
        *   Updates the `tabsStore` with fetched content to maintain consistency across the application.
        *   Handles database errors gracefully, falling back to empty content if necessary.
        *   Prevents duplicate database fetches through promise caching.
    *   When a model is requested via `get(tab)`:
        *   If it's in the cache, return it and mark it as recently used.
        *   If not, ensure the tab has content (fetch from database if needed), then create a new model.
    *   When the cache is full, it **evicts** the least recently used model. Before disposing the model, it ensures the `tabsStore` has its latest content.
    *   It is the **ONLY** part of the application that should attach an `onDidChangeContent` listener to a model. This listener is responsible for updating the `tabsStore` with the latest content.
    *   Provides a `dispose(tabId)` method to be called when a tab is permanently closed.
    *   Provides a `disposeAll()` method to be called when switching workspaces to prevent memory leaks.

### `EditorInstance.tsx`

*   **Role:** A "dumb" view component that hosts a Monaco editor.
*   **Purpose:** To render the editor UI and connect it to the correct model from the `ModelManager`.
*   **Responsibilities:**
    *   It receives an `activeTabId` as a prop.
    *   In a `useEffect` hook that runs when `activeTabId` changes, it:
        1.  Saves the view state (scroll position, cursor) of the *previous* tab's model.
        2.  Asks the `ModelManager` for the model corresponding to the *new* `activeTabId`.
        3.  Sets this new model on its internal Monaco editor instance (`editor.setModel(newModel)`).
        4.  Restores the view state for the new tab, if it exists.
    *   **MUST NOT** receive `tab.content` as a prop and pass it to the `<Editor>` component's `value` prop. The model is managed imperatively.
    *   It can receive the full `activeTab` object for metadata (like language, title) but should rely on the model for content.

### Zustand Stores

#### `tabsStore.ts`

*   **Role:** Holds an array of `Tab` objects representing all tabs in the *current workspace*.
*   **Purpose:** To provide a lightweight, reactive list of tab metadata for UI components like the `TabBar`.
*   **The `Tab.content` Property:** This property **IS NOT THE LIVE SOURCE OF TRUTH**. It is a "last-known-good" state that is updated by the `ModelManager`'s listeners. Its primary uses are:
    1.  To provide the initial content when creating a new model in `ModelManager`.
    2.  To be the content that gets written to `IndexedDB` by the `persistenceStore`.

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
    *   Before saving, it **must** get the latest content from any "hot" models in the `ModelManager` cache and update the `tabsStore` state to ensure the most recent changes are persisted.

#### `rootStore.ts`

*   **Role:** An action coordinator. It does not hold significant state itself.
*   **Purpose:** To provide a single, unified API for components to perform complex actions that span multiple stores.
*   **Example Action (`removeTab`):**
    1.  Calls `modelManager.dispose(tabId)` to free memory.
    2.  Calls `splitViewStore.removeTabFromSide(tabId)` to update the UI layout.
    3.  Calls `tabsStore.removeTab(id)` to remove the tab's metadata.
    4.  Calls `storage.deleteTab(id)` to remove from the database.

## 4. Key Data Flow Example: User Typing

This flow is critical to the performance of the application.

1.  **User types a character** in an `EditorInstance`.
2.  The Monaco editor updates its internal `ITextModel`.
3.  The `onDidChangeContent` listener (attached by `ModelManager` when the model was created) fires.
4.  The listener calls `tabsStore.getState().updateTabContent(tabId, newContent)`.
5.  The `content` property in the `tabsStore` for that specific tab is updated.
6.  **Crucially, no major re-renders occur.** The `EditorInstance` is not re-rendered because it doesn't depend on `tab.content`. The `TabBar` might re-render if it depends on `tab.content` for something like a line count indicator, but this is a small, localized update.
7.  Periodically, `persistenceStore.saveState()` runs, reads the up-to-date content from `tabsStore`, and saves it to `IndexedDB`.

This flow ensures that typing is always responsive, as it's handled entirely by Monaco, with only a lightweight state update happening in the background.

## 5. Database Fallback Flow: Content Recovery

This flow is crucial for handling edge cases where tab content might be missing from the store.

1.  **Tab Switch or Model Request:** Component requests a model for a tab from `ModelManager`.
2.  **Content Validation:** `ModelManager` checks if `tab.content` is available and valid.
3.  **Database Fallback (if needed):**
    *   If `tab.content` is undefined or null, `ModelManager` fetches content from `IndexedDB`.
    *   Promise caching prevents duplicate fetches for the same tab.
4.  **Store Synchronization:** Fetched content is immediately updated in `tabsStore` to maintain consistency.
5.  **Model Creation:** Monaco model is created using either store content or database-fetched content.
6.  **Error Handling:** If database fetch fails, an empty string is used as fallback to prevent crashes.

This flow ensures that:
*   **Silent failures are prevented** - Empty tabs due to missing content are recovered automatically.
*   **Data consistency is maintained** - Store is updated with fetched content for future use.
*   **Performance is optimized** - Content is only fetched when actually needed (lazy loading).
*   **Memory usage is reduced** - Not all tab content needs to be loaded upfront in the store.
