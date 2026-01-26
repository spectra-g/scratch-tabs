# Workspace Visibility Feature Plan

**Status:** Draft (Decisions Finalized)
**Created:** 2026-01-21
**Last Updated:** 2026-01-21
**Open Questions:** All resolved (see Section 10)

---

## 1. Problem Statement

### Current Pain Point
Users feel "trapped" inside their current workspace. They know they have other work saved across different workspaces, but the only way to access or view it is through context-switching via the workspace dropdown (`WorkspaceSwitcher.tsx`).

### User Experience Gap
- **No peripheral awareness** of other workspaces/tabs
- **Context-switching friction** - must open dropdown, select workspace, wait for load
- **Mental model burden** - users must remember what's in each workspace
- **Discovery problem** - hard to find where a specific tab/content lives

---

## 2. Proposed Solution: Project Explorer Sidebar

### Concept
Model after VS Code's Explorer sidebar or Slack's workspace sidebar - a persistent "God View" showing all workspaces and their tabs in a collapsible tree structure.

### Prior Art
| Application | Pattern | Key Features |
|-------------|---------|--------------|
| VS Code | Explorer sidebar | Tree view, icons, context menus, drag-drop |
| Slack | Workspace sidebar | Collapsible channels, unread indicators, quick actions |
| Figma | Page sidebar | Flat list with nesting, drag reorder |
| Notion | Page tree | Collapsible, drag-drop, inline rename |

---

## 3. Critical Pitfalls & Considerations

### 3.1 Screen Real Estate

**Risk:** Sidebar permanently consumes horizontal space, reducing editor width.

**Current State:**
- Main layout uses flex with TabBar (left/right) and EditorPaneWrapper
- No persistent sidebar currently exists
- Split view already divides editor space

**Mitigations:**
| Option | Pros | Cons |
|--------|------|------|
| **Collapsible sidebar** (default collapsed) | Minimal intrusion, user control | Extra click to access |
| **Overlay/drawer** (slides over) | No permanent space cost | Covers content, modal-ish |
| **Icon rail + flyout** | Minimal footprint, quick access | Requires hover/click |
| **Toggle hotkey** (Cmd+B like VS Code) | Power user friendly | Discoverability issue |

**Recommendation:** Collapsible sidebar with icon rail. Shows workspace icons when collapsed, expands to full tree on click or hotkey. Default: collapsed on small screens, expanded on large.

### 3.2 Distraction & Information Overload

**Risk:** Showing all workspaces/tabs creates visual noise, especially for users with many workspaces.

**Current State:**
- Tab management modal shows ALL tabs but is modal (temporary)
- Workspace switcher shows workspace names + tab counts only

**Mitigations:**
- **Collapsed by default** - workspaces show as single line with expand arrow
- **Search/filter** at top of sidebar
- **"Current workspace" emphasis** - highlight/expand active workspace automatically
- **Subtle styling** - inactive workspaces more muted
- **Tab count badges** instead of listing all tabs when collapsed

### 3.3 Performance

**Risk:** Loading metadata for all workspaces/tabs on sidebar render.

**Current Architecture:**
```
Active Workspace:
├── Tabs in Zustand store (tab.content populated)
├── Monaco models in ModelManager (max 10 cached)
└── Full content accessible

Inactive Workspaces:
├── Metadata only in IndexedDB
├── NO content in memory
└── Tab counts fetched lazily in WorkspaceSwitcher
```

**Critical Constraint:** DO NOT load `tab.content` for inactive workspaces into Zustand state. This is explicitly optimized out.

**Implementation Strategy:**
```typescript
// SAFE: Metadata-only query for sidebar
interface SidebarTabInfo {
  id: string;
  title: string;
  language: string;      // For icon display
  isTablet?: boolean;    // For type indicator
  isRich?: boolean;      // For rich text indicator
  isPinned?: boolean;    // For pin indicator
  lastModified: number;  // For sorting
  // NO content field!
}

// Fetch pattern (lazy, cached)
const getWorkspaceTabsMetadata = async (workspaceId: string): Promise<SidebarTabInfo[]> => {
  return storage.getTabs()
    .then(tabs => tabs
      .filter(t => t.workspaceId === workspaceId)
      .map(({ id, title, language, isTablet, isRich, isPinned, lastModified }) =>
        ({ id, title, language, isTablet, isRich, isPinned, lastModified }))
    );
};
```

**Loading Strategy:**
| Event | Action |
|-------|--------|
| Sidebar mount | Load workspace list (already in workspaceStore) |
| Workspace expand (click) | Lazy-load that workspace's tab metadata |
| Workspace collapse | Optionally clear from local state to reduce memory |
| Active workspace tabs | Use Zustand store directly (already loaded) |

### 3.4 Sync: Sidebar ↔ Editor Tabs

**Risk:** Sidebar shows stale data when tabs are created/deleted/renamed in editor.

**Current Architecture:**
- Active workspace tabs live in `useTabsStore.tabs`
- Tab operations go through `rootStore` which updates Zustand
- No separate "sidebar store" currently

**Sync Strategy:**

**Option A: Direct Store Subscription (Recommended)**
```typescript
// Sidebar subscribes directly to tabsStore for active workspace
const activeWorkspaceTabs = useTabsStore(
  state => state.tabs.filter(t => t.workspaceId === activeWorkspaceId),
  shallow
);

// For inactive workspaces: local state with refresh triggers
const [inactiveTabsCache, setInactiveTabsCache] = useState<Map<string, SidebarTabInfo[]>>();
```

**Option B: Unified Sidebar Store**
```typescript
// New store that aggregates all sidebar data
// Risk: Duplicates state, sync bugs
// Not recommended
```

**Sync Points:**
| Event | Sidebar Behavior |
|-------|------------------|
| Tab created (active workspace) | Auto-updates via Zustand subscription |
| Tab deleted (active workspace) | Auto-updates via Zustand subscription |
| Tab renamed (active workspace) | Auto-updates via Zustand subscription |
| Tab moved to different workspace | Refetch target workspace metadata |
| Workspace switched | Highlight new active workspace |
| Tab created (from sidebar for inactive WS) | Refetch that workspace's metadata |

### 3.5 Broadcast Channel: Multi-Window Sync

**Risk:** User has multiple browser windows open. Sidebar must stay in sync across all.

**Current Architecture:**
```typescript
// BroadcastManager handles these messages:
- WORKSPACE_STATE_UPDATED  // tabs + splitView for a workspace
- WORKSPACE_LIST_UPDATED   // workspace created/renamed
- WORKSPACE_DELETED        // workspace deleted
- REQUEST_FULL_SYNC        // new tab requests state
- FULL_SYNC_RESPONSE       // existing tab responds
```

**Key Insight:** Current broadcast ONLY syncs active workspace state. Inactive workspace changes are NOT broadcast.

**Required Changes:**

1. **New message type for cross-workspace tab changes:**
```typescript
type BroadcastMessage =
  | { type: "WORKSPACE_TABS_METADATA_UPDATED"; workspaceId: string; tabsMetadata: SidebarTabInfo[] }
  | ... existing types
```

2. **Sidebar must listen for:**
   - `WORKSPACE_STATE_UPDATED` → refresh active workspace in sidebar
   - `WORKSPACE_LIST_UPDATED` → refresh workspace list
   - `WORKSPACE_DELETED` → remove from sidebar
   - `WORKSPACE_TABS_METADATA_UPDATED` → update specific workspace's tab list

3. **When to broadcast:**
   - Tab created/deleted (even in inactive workspace via sidebar)
   - Tab moved between workspaces
   - Tab renamed

**Complexity Warning:** Moving a tab from inactive workspace A to inactive workspace B requires:
1. Read tab from IndexedDB
2. Update tab's workspaceId
3. Save to IndexedDB
4. Broadcast metadata update for both workspaces
5. Handle in all open browser tabs

---

## 4. Tab Management Modal: Deprecation Analysis

### Current Features in TabManagementModal

| Feature | Usage Likelihood | Migrate to Sidebar? |
|---------|-----------------|---------------------|
| **Search tabs** | High | Yes - add search input |
| **Filter by language** | Medium | Maybe - could be filter chips |
| **Sort options** (title, created, modified) | Medium | Maybe - sort dropdown |
| **Group by** (type, workspace) | Low | No - tree structure replaces this |
| **Bulk select** | Low | No - too complex for sidebar |
| **Bulk close** | Low | Partial - context menu "Close all" |
| **Bulk pin/unpin** | Low | No |
| **Bulk rename** | Very Low | No |
| **Merge tabs** | Very Low | No |
| **Duplicate detection** | Low | Maybe - badge indicator? |
| **Empty tab detection** | Low | Maybe - badge indicator? |
| **Drag reorder within workspace** | High | Yes - essential |
| **Drag between workspaces** | Medium | Yes - essential |
| **Workspace CRUD** | High | Yes - context menus |
| **Move tab to workspace** | High | Yes - drag-drop or context menu |

### Recommendation

**Phase 1:** Keep TabManagementModal but mark as "advanced" or move to menu
**Phase 2:** Evaluate usage after sidebar launch
**Phase 3:** Deprecate if sidebar covers 90%+ of use cases

**Must migrate to sidebar:**
- Workspace CRUD (create, rename, delete)
- Tab drag-drop reorder within workspace
- Tab drag-drop between workspaces
- Basic search
- Context menu actions (close, rename, duplicate, pin)

**Keep in modal (power users):**
- Bulk operations
- Merge tabs
- Pattern-based rename
- Duplicate detection tools

---

## 5. Split View Representation in Sidebar

### Current Split View State
```typescript
interface SplitViewState {
  isSplit: boolean;
  leftTabs: string[];       // Tab IDs on left pane
  rightTabs: string[];      // Tab IDs on right pane
  activeLeftTabId: string;
  activeRightTabId: string;
  activeSide: "left" | "right";
}
```

### Representation Options

**Option A: Flat list with pane indicators**
```
▼ My Workspace
    📄 Tab A          [L]      ← indicator badge
    📄 Tab B          [L][●]   ← active left
    📄 Tab C          [R]
    📄 Tab D          [R][●]   ← active right
    📄 Tab E                   ← not in split view
```

**Option B: Nested pane groups**
```
▼ My Workspace
  ▼ Left Pane
      📄 Tab A
      📄 Tab B (active)
  ▼ Right Pane
      📄 Tab C
      📄 Tab D (active)
  ▼ Other Tabs
      📄 Tab E
```

**Option C: Visual split (horizontal line)**
```
▼ My Workspace
    📄 Tab A
    📄 Tab B (●)
    ─────────────
    📄 Tab C
    📄 Tab D (●)
    ─────────────
    📄 Tab E
```

**Recommendation:** Option A (flat with indicators)
- Simpler implementation
- Less visual complexity
- Indicators are optional/subtle
- Drag-drop remains straightforward
- Single list matches mental model

### Drag-Drop with Split View

| Drag Action | Result |
|-------------|--------|
| Drag tab within same pane section | Reorder within that pane |
| Drag tab from left to right section | Move to right pane |
| Drag tab from pane to "no pane" area | Remove from split, keep in workspace |
| Drag tab from inactive workspace to pane | Load tab, add to that pane |

**Complexity:** High. Requires drop zones and intent detection.

**Simpler Alternative:** Context menu "Move to Left Pane" / "Move to Right Pane" / "Remove from Split View"

---

## 6. Content Loading for Inactive Workspaces

### Architecture Principle (MUST MAINTAIN)

```
┌─────────────────────────────────────────────────────────────┐
│  DO NOT load tab.content for inactive workspaces into       │
│  Zustand state. This is a critical performance optimization.│
└─────────────────────────────────────────────────────────────┘
```

### What Sidebar Can Access

| Data | Source | When |
|------|--------|------|
| Workspace list | `workspaceStore.workspaces` | Always available |
| Active workspace tabs (full) | `tabsStore.tabs` | Always available |
| Inactive workspace tabs (metadata only) | IndexedDB query | Lazy on expand |

### Implementation Pattern

```typescript
// sidebarStore.ts (new store for sidebar-specific state)
interface SidebarStore {
  // Expanded/collapsed state
  expandedWorkspaceIds: Set<string>;

  // Cached metadata for inactive workspaces (NO CONTENT)
  workspaceTabsMetadata: Map<string, SidebarTabInfo[]>;

  // Loading states
  loadingWorkspaceIds: Set<string>;

  // Actions
  expandWorkspace: (id: string) => Promise<void>;
  collapseWorkspace: (id: string) => void;
  refreshWorkspaceMetadata: (id: string) => Promise<void>;
}

// On workspace expand
expandWorkspace: async (workspaceId: string) => {
  if (workspaceId === activeWorkspaceId) {
    // Just expand UI - data comes from tabsStore
    set(state => ({ expandedWorkspaceIds: new Set([...state.expandedWorkspaceIds, workspaceId]) }));
    return;
  }

  // Inactive workspace - fetch metadata only
  set(state => ({ loadingWorkspaceIds: new Set([...state.loadingWorkspaceIds, workspaceId]) }));

  const tabs = await storage.getTabs();
  const metadata = tabs
    .filter(t => t.workspaceId === workspaceId)
    .map(({ id, title, language, isTablet, isRich, isPinned, lastModified }) =>
      ({ id, title, language, isTablet, isRich, isPinned, lastModified }));

  set(state => ({
    expandedWorkspaceIds: new Set([...state.expandedWorkspaceIds, workspaceId]),
    workspaceTabsMetadata: new Map([...state.workspaceTabsMetadata, [workspaceId, metadata]]),
    loadingWorkspaceIds: new Set([...state.loadingWorkspaceIds].filter(id => id !== workspaceId))
  }));
};
```

### Tab Operations on Inactive Workspaces

| Operation | Implementation |
|-----------|----------------|
| **View tab** | Switch to workspace first, then open tab |
| **Delete tab** | Delete from IndexedDB directly, update metadata cache. Empty workspaces are allowed. |
| **Rename tab** | Update IndexedDB directly, update metadata cache |
| **Duplicate tab** | Create in IndexedDB, update metadata cache |
| **Move to active workspace** | Load content from IndexedDB, add to tabsStore, delete from IndexedDB. Source workspace remains even if empty. |
| **Move from active to inactive** | Save content to IndexedDB, remove from tabsStore, update metadata |

> **Key Behavior (Updated 2026-01-23):** Empty workspaces ARE allowed. Moving or deleting the last tab from a workspace leaves an empty workspace. This allows users to organize their workspaces before adding content.

### Warning: Content on Demand

When user clicks a tab in an inactive workspace:
```typescript
const handleTabClick = async (tabId: string, workspaceId: string) => {
  if (workspaceId === activeWorkspaceId) {
    // Normal tab switch
    setActiveTab(tabId);
  } else {
    // Must switch workspace first (loads content)
    await switchWorkspace(workspaceId);
    setActiveTab(tabId);
  }
};
```

---

## 7. UI/UX Design Decisions

### 7.1 Overall Structure

**Recommended: Collapsible Tree Sidebar**

```
┌──────────────────────────────────────────────────────────────────────┐
│ [🔍] Search tabs...                                    [+ Workspace] │
├──────────────────────────────────────────────────────────────────────┤
│ ▼ 📁 Current Project (active)                               3 tabs  │
│     📄 index.ts                                            [L][●]   │
│     📄 utils.ts                                            [L]      │
│     📄 README.md                                           [R][●]   │
│ ▶ 📁 Side Project                                          5 tabs  │
│ ▶ 📁 Notes                                                12 tabs  │
│ ▶ 📁 Archived                                             24 tabs  │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.2 Workspace Row

```
┌─────────────────────────────────────────────────────────────────┐
│ ▼ 📁 Workspace Name                                    12 tabs  │
│ ↑   ↑       ↑                                            ↑      │
│ │   │       └─ Editable on double-click                  │      │
│ │   └─ Icon (folder, or custom?)                         │      │
│ └─ Expand/collapse arrow                                 │      │
│                                                  Tab count badge │
└─────────────────────────────────────────────────────────────────┘

On hover:
┌─────────────────────────────────────────────────────────────────┐
│ ▼ 📁 Workspace Name                           [➕] [✏️] [🗑️]   │
│                                                ↑    ↑    ↑      │
│                                     New tab ───┘    │    │      │
│                                     Rename ─────────┘    │      │
│                                     Delete ──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

**Context Menu (right-click):**
- New Tab
- New Tablet → (submenu)
- Rename Workspace
- Duplicate Workspace
- Export Workspace
- Delete Workspace

> **Note:** "Delete Workspace" deletes all tabs within it. Empty workspaces remain after all tabs are closed, allowing users to organize workspace structure independently of content.

### 7.3 Tab Row

```
┌─────────────────────────────────────────────────────────────────┐
│   📄 filename.ts                                                │
│   ↑     ↑                                                       │
│   │     └─ Title (truncated if long)                           │
│   └─ Language icon (from format registry)                       │
└─────────────────────────────────────────────────────────────────┘

With indicators:
┌─────────────────────────────────────────────────────────────────┐
│   📌 📝 filename.ts                               [L][●]  [×]   │
│   ↑  ↑                                             ↑  ↑    ↑    │
│   │  └─ Rich text indicator                        │  │    │    │
│   └─ Pinned indicator                              │  │    │    │
│                           Split pane indicator ────┘  │    │    │
│                           Active indicator ───────────┘    │    │
│                           Close button (on hover) ─────────┘    │
└─────────────────────────────────────────────────────────────────┘

Tablet row:
┌─────────────────────────────────────────────────────────────────┐
│   🧮 Calculator                                           [×]   │
│   ↑                                                             │
│   └─ Tablet icon (distinct from file icon)                     │
└─────────────────────────────────────────────────────────────────┘
```

**Context Menu (right-click):**
- Open
- Open in Split View → Left Pane / Right Pane
- Pin / Unpin
- Rename
- Duplicate
- Copy Contents (active workspace only)
- Move to Workspace → (submenu of workspaces)
- Close

### 7.4 Visual Indicators Summary

| Indicator | Icon/Badge | Purpose |
|-----------|------------|---------|
| Language/type | 📄 📝 🧮 | File type (from format registry icon) |
| Tablet | 🧮 or specific | Distinguish tablets from files |
| Rich text | 📝 | Tab has TipTap rich content |
| Pinned | 📌 | Tab is pinned |
| Active (left) | [L][●] | Active in left pane |
| Active (right) | [R][●] | Active in right pane |
| In split (not active) | [L] or [R] | In split view but not active |
| Modified/unsaved | • | Has unsaved changes |
| Loading | ⟳ | Fetching metadata |

### 7.5 Interaction Patterns

| Action | Behavior |
|--------|----------|
| **Single click workspace** | Expand/collapse |
| **Double click workspace** | Switch to workspace |
| **Single click tab (active WS)** | Make tab active |
| **Single click tab (inactive WS)** | Switch workspace, then activate tab |
| **Double click tab** | Open in editor (same as single click) |
| **Drag tab** | Reorder or move to different workspace |
| **Right click** | Context menu |
| **Hover** | Show action buttons |
| **Cmd/Ctrl + Click** | Multi-select (future enhancement) |

### 7.6 Collapsed Sidebar State

When collapsed to icon rail:
```
┌────┐
│ 🔍 │  ← Search button (expands sidebar with focus on search)
├────┤
│ 📁 │  ← Active workspace (highlighted)
│ 📁 │
│ 📁 │
│ 📁 │
├────┤
│ ➕ │  ← New workspace
└────┘
```

Hover on workspace icon: tooltip with workspace name + tab count

---

## 8. Additional Considerations

### 8.1 Keyboard Navigation

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + B` | Toggle sidebar |
| `Cmd/Ctrl + Shift + E` | Focus sidebar |
| `↑/↓` | Navigate items |
| `←/→` | Collapse/expand workspace |
| `Enter` | Activate selected item |
| `Delete/Backspace` | Delete selected (with confirmation) |
| `F2` | Rename selected |
| `/` or `Cmd+F` (when focused) | Focus search |

### 8.2 Accessibility

- ARIA tree role for workspace list
- ARIA treeitem role for workspaces and tabs
- Proper focus management
- Screen reader announcements for state changes
- Sufficient color contrast for indicators

### 8.3 Mobile/Responsive

- On narrow screens: sidebar becomes overlay drawer
- Touch targets: minimum 44px height for tap
- Swipe gesture to open/close on touch devices

### 8.4 Empty States

**No workspaces:** (shouldn't happen - always have default)
```
No workspaces yet.
[Create Workspace]
```

**Empty workspace:**
```
📁 My Empty Workspace          0 tabs

(Click to create new tab)
```

> **Current Behavior (Updated 2026-01-23):** Empty workspaces are now allowed. Deleting the last tab in a workspace leaves the workspace empty, allowing users to organize workspace structure independently of content.

**Sidebar implication:** When user deletes the last tab in a workspace via sidebar context menu:
1. Tab is deleted
2. Workspace becomes empty (remains in sidebar with "0 tabs" badge)
3. Sidebar refreshes to show updated tab count
4. Workspace can be used to add new tabs or deleted manually if no longer needed

**Search/filter no results:**
```
No tabs matching "query"
[Clear filter]
```

### 8.5 Performance Budgets

| Metric | Target |
|--------|--------|
| Sidebar initial render | < 50ms |
| Workspace expand (cached) | < 10ms |
| Workspace expand (fetch) | < 200ms |
| Tab drag start | < 16ms (60fps) |
| Search filter | < 50ms |

### 8.6 Future Enhancements (Out of Scope for V1)

- Multi-select tabs
- Bulk operations from sidebar
- Tab preview on hover
- Recent tabs section
- Favorites/bookmarks
- Tags/labels for tabs
- Tab grouping within workspace
- Custom workspace icons/colors
- Workspace templates

---

## 9. Implementation Phases

### Phase 1: Foundation ✅ COMPLETE
- [x] Create `sidebarStore.ts` for sidebar-specific state
- [x] Create `Sidebar` component structure
- [x] Implement collapsible workspace tree with **virtualization (`react-window`) from Day 1**
- [x] Implement tab list within workspace (virtualized)
- [x] Add basic click-to-activate behavior
- [x] Add expand/collapse for workspaces
- [x] Implement Active vs Expanded visual distinction (bold, colored border)
- [x] Add "Switching..." feedback for inactive workspace tab clicks

### Phase 2: Core Features (PARTIAL - Context Menus Complete)
- [x] Add workspace context menu (create, rename, delete)
- [x] Add tab context menu (rename, delete, pin, duplicate)
- [x] Implement drag-drop reorder within workspace
- [x] Implement drag-drop between workspaces (Copy-then-Delete pattern)
- [x] Add visual indicators (language, pinned, rich, active) - Already present
- [x] Implement "Reveal in Sidebar" (auto-scroll to active tab)

### Phase 3: Split View Integration
- [ ] Add split pane indicators [L] [R]
- [ ] Add "Open in Split View" context menu
- [ ] Handle drag-drop to split pane sections

### Phase 4: Broadcast & Sync ✅ COMPLETE
- [x] Add `WORKSPACE_TABS_METADATA_UPDATED` broadcast message
- [x] Implement cross-window sync for sidebar
- [x] Test multi-window scenarios

### Phase 5: Polish (PARTIAL - Icon Rail & Display Order Complete)
- [ ] Add filter functionality (`"Filter tabs..."` placeholder)
- [x] Add keyboard navigation (Cmd+B toggle - already implemented)
- [x] Add collapsed icon rail mode
- [x] Add responsive/mobile behavior (already implemented)
- [x] Add stable workspace ordering (displayOrder property)
- [x] Add workspace drag-to-reorder
- [ ] Performance profiling
- [ ] Accessibility audit

### Phase 6: Tab Management Modal (COMPLETE)
- [x] Evaluate sidebar usage vs modal usage
- [x] Decide deprecation path (Full removal)
- [x] Migrate remaining essential features if needed (None required)
- [x] Code removal and cleanup

---

## 10. Open Questions (RESOLVED)

| # | Question | Answer | Notes |
|---|----------|--------|-------|
| 1 | Should workspace order be customizable? | **Yes** | Allow drag-to-reorder workspaces in sidebar |
| 2 | Should we show tab preview on hover? | **No** | Adds complexity, performance overhead |
| 3 | Should search include tab content? | **No** | Search filters metadata only (see Section 10.2) |
| 4 | How to handle very large workspaces (100+ tabs)? | **Virtualization** | Use `react-window` from Day 1 (see Section 10.1) |
| 5 | Should we support nested workspaces/folders? | **No** | Too complex, flat structure sufficient |
| 6 | Should inactive workspace tabs be draggable? | **Yes** | Does NOT require loading content - only metadata needed for drag; content loaded only on drop to active workspace |
| 7 | Should we add "Recent tabs" section? | **No** | Keep simple for V1 |

### 10.1 Gotcha: Virtualization Required

**Problem:** A user with 5 workspaces × 20 tabs = 100 DOM nodes (fine). But a "Log Dump" workspace with 500 tabs will lag the sidebar.

**Decision:** Use `react-window` for list rendering from Day 1.

- `react-window` is already available in the codebase
- Future-proofs the "God View" for heavy users
- Adds implementation complexity but prevents performance cliffs

**Implementation:**
```tsx
import { FixedSizeList } from 'react-window';

// Virtualized tab list within expanded workspace
<FixedSizeList
  height={Math.min(tabs.length * ROW_HEIGHT, MAX_VISIBLE_HEIGHT)}
  itemCount={tabs.length}
  itemSize={ROW_HEIGHT}
  width="100%"
>
  {({ index, style }) => (
    <TabItem tab={tabs[index]} style={style} />
  )}
</FixedSizeList>
```

### 10.2 Gotcha: Search Scope

**Problem:** Does the sidebar search input filter *visual items* (the tree), or run a *database query* for content?

**Decision:** Filter the **metadata tree only**. Do NOT search file content.

- Content search = `Cmd+Shift+F` (global search feature)
- Sidebar search = quick filter by tab title/type

**UX Clarification:**
- Placeholder text: `"Filter tabs..."` (NOT `"Search..."`)
- Filters visible tree items
- Searches across all workspaces (expanded or not)
- Matches against: `title`, `language`

---

## 11. UX & Design Refinements

### 11.1 Active vs Expanded Distinction (CRITICAL)

**Problem:** User must distinguish between:
1. **Active Workspace** - Currently loaded in editor, content in memory
2. **Expanded Workspace** - Just browsing in sidebar, content NOT loaded

Without clear distinction, users will be confused when clicking a tab in an expanded (but inactive) workspace causes a full workspace switch with loading delay.

**Visual Design:**

| State | Styling |
|-------|---------|
| **Active Workspace** | Bold text, colored left-border (emerald/blue), colored folder icon |
| **Inactive Expanded** | Normal text, gray folder icon, slightly muted |
| **Inactive Collapsed** | Normal text, gray folder icon |

**Example:**
```
┌────────────────────────────────────────────────────────────────┐
│ ▼ 📁 Current Project                              3 tabs  │ ← Bold, blue border, blue icon
│     📄 index.ts                                  [L][●]   │
│     📄 utils.ts                                  [L]      │
│ ▼ 📁 Side Project                                5 tabs  │ ← Normal text, gray icon
│     📄 app.py                                            │
│     📄 tests.py                                          │
│ ▶ 📁 Notes                                      12 tabs  │ ← Normal text, gray icon
└────────────────────────────────────────────────────────────────┘
```

### 11.2 "Reveal in Sidebar" (Auto-scroll to Active Tab)

**Problem:** If user switches tabs via the top tab bar, the sidebar should automatically scroll to and highlight that tab.

**VS Code Reference:** `explorer.autoReveal` setting

**Decision:** Implement auto-reveal **by default**.

**Behavior:**
1. Active tab changes (via tab bar, keyboard shortcut, etc.)
2. Sidebar expands the active workspace (if collapsed)
3. Scrolls the tab into view
4. Highlights the active tab row

**Implementation:**
```typescript
// In Sidebar component
useEffect(() => {
  const activeTabId = splitViewStore.activeLeftTabId || splitViewStore.activeRightTabId;
  if (activeTabId && autoRevealEnabled) {
    // Expand active workspace
    sidebarStore.expandWorkspace(activeWorkspaceId);
    // Scroll tab into view
    scrollToTab(activeTabId);
  }
}, [activeLeftTabId, activeRightTabId]);
```

**Future consideration:** Make this configurable if users find it distracting.

### 11.3 "Jarring Switch" Warning

**Problem:** In Section 7.5, single-click on tab in inactive workspace triggers workspace switch. This can feel aggressive if user just wanted to select/highlight the row.

**Current Design:**
> `Single click tab (inactive WS) → Switch workspace, then activate tab`

**Risk:** Workspace switch involves serializing current state, deserializing new state, and can have a visible loading period.

**Mitigation Options:**

| Option | Pros | Cons |
|--------|------|------|
| **A. Double-click to switch** | Explicit intent, less accidental | Extra click, inconsistent with active WS |
| **B. "Jump" icon on hover** | Clear affordance, optional action | Extra visual clutter |
| **C. Instant feedback ("Switching...")** | User knows what's happening | Still jarring if unintended |
| **D. Single-click select, Enter to open** | Keyboard-friendly, explicit | Requires two actions |

**Decision:** **Option C + visual feedback**

- Keep single-click behavior for consistency
- Show immediate visual feedback: dim the sidebar, show "Switching to [Workspace]..." toast or inline indicator
- Workspace switch should be fast (<500ms typical)

**Implementation:**
```typescript
const handleTabClick = async (tabId: string, workspaceId: string) => {
  if (workspaceId === activeWorkspaceId) {
    setActiveTab(tabId);
  } else {
    // Show instant feedback
    setSwitchingToWorkspace(workspaceId);
    await switchWorkspace(workspaceId);
    setActiveTab(tabId);
    setSwitchingToWorkspace(null);
  }
};
```

**Visual during switch:**
```
┌────────────────────────────────────────────────────────────────┐
│ ▼ 📁 Current Project                              3 tabs  │
│     📄 index.ts                                            │
│ ▼ 📁 Side Project ← Switching...                 5 tabs  │ ← Pulsing/highlighted
│     📄 app.py     ← [clicked]                            │
└────────────────────────────────────────────────────────────────┘
```

---

## 12. Architecture Refinements

### 12.1 Sidebar Store Pattern (Confirmed)

**Decision:** Use **Option A (Direct Subscription)** from Section 3.4.

**Do NOT duplicate active tabs into sidebar state.**

```tsx
// Correct pattern
const SidebarWorkspace = ({ workspaceId }: { workspaceId: string }) => {
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);

  // For active workspace: read directly from tabsStore
  const activeTabs = useTabsStore(
    state => state.tabs.filter(t => t.workspaceId === workspaceId),
    shallow
  );

  // For inactive workspaces: read from sidebarStore cache
  const inactiveMetadata = useSidebarStore(
    state => state.workspaceTabsMetadata.get(workspaceId)
  );

  const tabsToRender = workspaceId === activeWorkspaceId
    ? activeTabs
    : inactiveMetadata;

  return <TabList tabs={tabsToRender} />;
};
```

### 12.2 Drag & Drop: Copy-Then-Delete Pattern

**Problem:** Dragging tab from Inactive Workspace A to Active Workspace B is an "import" operation with multiple async steps.

**Risk:** If step 4 (add to tabsStore) succeeds but step 5 (delete from IndexedDB) fails, user has duplicate tabs.

**Solution:** Treat as **Copy first, then Delete** with atomic-like semantics.

**Flow:**
```
User drags tab T from Inactive WS-A to Active WS-B
                    │
                    ▼
┌─────────────────────────────────────────┐
│ 1. Fetch T.content from IndexedDB       │
│    (async, may take a few ms)           │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ 2. Add T to tabsStore (Active WS-B)     │
│    - T now visible in editor            │
│    - T.workspaceId = WS-B               │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ 3. Delete T from IndexedDB (WS-A)       │
│    - Only after step 2 confirmed        │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ 4. Update sidebar metadata cache        │
│    - Remove from WS-A cache             │
│    - WS-B updates automatically via     │
│      Zustand subscription               │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ 5. Broadcast change to other windows    │
│    - WORKSPACE_TABS_METADATA_UPDATED    │
│      for WS-A                           │
└─────────────────────────────────────────┘
```

**Error Handling:**
- If step 1 fails: Show error, no state change
- If step 2 fails: Show error, no state change
- If step 3 fails: Log warning, user has duplicate (recoverable, not data loss)
- If step 5 fails: Log warning, other windows may be stale until refresh

**Edge Case - Last Tab Move (Updated 2026-01-23):**
If the moved tab was the last tab in the source workspace:
- After step 3 (delete from source), the source workspace is now empty
- **The source workspace remains** (empty workspaces are allowed)
- Sidebar shows the workspace with "0 tabs" badge
- Broadcast `WORKSPACE_TABS_METADATA_UPDATED` to update the tab count in all windows

**No spinner needed:** Operation is fast (milliseconds). Only show error states if something fails.

**Implementation:**
```typescript
const moveTabToActiveWorkspace = async (tabId: string, sourceWorkspaceId: string) => {
  try {
    // 1. Fetch full tab from IndexedDB
    const fullTab = await storage.getTab(tabId);
    if (!fullTab) throw new Error('Tab not found');

    // 2. Add to active workspace (tabsStore)
    const newTab = { ...fullTab, workspaceId: activeWorkspaceId };
    useTabsStore.getState().addTab(newTab);

    // 3. Delete from source (only after successful add)
    await storage.deleteTab(tabId);

    // 4. Update sidebar cache
    useSidebarStore.getState().removeTabFromCache(sourceWorkspaceId, tabId);

    // 5. Broadcast
    broadcastManager.broadcastWorkspaceTabsMetadataUpdated(sourceWorkspaceId);

  } catch (error) {
    console.error('Failed to move tab:', error);
    // Show user-facing error
    toast.error('Failed to move tab. Please try again.');
  }
};
```

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance degradation with many tabs | High | Virtualized list (`react-window`) from Day 1, lazy loading, metadata-only |
| Sync bugs across windows | High | Comprehensive broadcast testing, conflict resolution |
| User confusion with two UIs (sidebar + dropdown) | Medium | Consolidate or clearly differentiate purposes |
| Screen real estate on small screens | Medium | Responsive design, collapsible by default |
| Drag-drop complexity with split view | Medium | Start with context menu, add DnD later |
| IndexedDB query performance | Low | Indexed queries, caching |
| Duplicate tabs on failed move | Low | Copy-then-Delete pattern, only delete after confirmed add |

---

## 14. Success Metrics

| Metric | Target |
|--------|--------|
| Time to find a tab in different workspace | Reduce by 50% |
| Workspace switches per session | May increase (good - more fluid) |
| Tab management modal usage | Decrease by 70% |
| User satisfaction (if measured) | Increase |
| Performance regression | None |
| Sidebar initial render (100 tabs visible) | < 50ms |

---

## 15. Appendix A: Related Files

| File | Relevance |
|------|-----------|
| `src/stores/workspaceStore.ts` | Workspace CRUD, switching logic, sorting |
| `src/stores/tabsStore.ts` | Tab metadata store |
| `src/stores/splitViewStore.ts` | Split view state |
| `src/stores/sidebarStore.ts` | Sidebar state management |
| `src/stores/broadcastStore.ts` | Cross-window sync |
| `src/components/Layout/Sidebar.tsx` | Main sidebar component |
| `src/components/Layout/IconRail.tsx` | Collapsed sidebar icon rail |
| `src/components/Layout/workspaceColors.ts` | Workspace color utility |
| `src/components/Workspace/WorkspaceSwitcher.tsx` | Current workspace UI |
| `src/components/Tab/Management/*` | Tab management modal |
| `src/db/index.ts` | IndexedDB operations, migrations |
| `src/services/modelManager.ts` | Content authority |
| `src/types.ts` | Type definitions (Workspace, Tab, etc.) |

---

## 16. Appendix B: Component Structure (Actual)

```
src/components/Layout/
├── Sidebar.tsx                    # Main sidebar container (virtualized)
├── IconRail.tsx                   # Collapsed sidebar icon rail
├── workspaceColors.ts             # Color generation utility
├── WorkspaceContextMenu.tsx       # Workspace context menu
├── SidebarTabContextMenu.tsx      # Tab context menu
└── __tests__/
    ├── Sidebar.test.tsx           # Sidebar component tests
    ├── IconRail.test.tsx          # Icon rail tests
    └── workspaceColors.test.ts    # Color utility tests

src/stores/
├── sidebarStore.ts                # Sidebar-specific state
├── workspaceStore.ts              # Workspace management & sorting
└── __tests__/
    ├── sidebarStore.test.ts       # Sidebar store tests
    └── workspaceStore.sorting.test.ts  # Sorting logic tests
```

---

## 17. Implementation Details: Icon Rail & Display Order

**Status:** ✅ COMPLETE (2026-01-22)

### 17.1 Display Order Property

**Problem:** Workspace order was changing on every page refresh because workspaces were sorted by `lastAccessed`, which updates when you click a workspace. This caused workspaces to jump around unexpectedly.

**Solution:** Added `displayOrder` property to `Workspace` interface.

```typescript
export interface Workspace {
  id: string;
  name: string;
  notes?: string;
  links: WorkspaceLink[];
  createdAt: number;
  lastAccessed: number;
  displayOrder?: number; // NEW: Persistent sort order
}
```

**Database Migration (v5):**
- Assigns `displayOrder` to existing workspaces based on current `lastAccessed` order
- Preserves user's existing workspace order on first load after update
- New workspaces get `displayOrder = max + 1` (appears at bottom of list)

**Sorting Logic:**
```typescript
const sortWorkspaces = (workspaces: Workspace[]): Workspace[] => {
  return [...workspaces].sort((a, b) => {
    // Primary: Use displayOrder if both have it
    if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
      return a.displayOrder - b.displayOrder;
    }
    // If only one has displayOrder, it comes first
    if (a.displayOrder !== undefined) return -1;
    if (b.displayOrder !== undefined) return 1;
    // Fallback: Use lastAccessed (for backward compatibility)
    return b.lastAccessed - a.lastAccessed;
  });
};
```

**Benefits:**
- Workspaces stay in the same order across page refreshes
- Clicking a workspace no longer reorders the list
- Backward compatible with workspaces created before this feature
- Foundation for future drag-to-reorder feature

### 17.2 Icon Rail (Collapsed Sidebar)

**Problem:** Desktop users had no way to collapse the sidebar, wasting 288px of horizontal space when not needed.

**Solution:** Implemented collapsible sidebar with icon rail (VS Code pattern).

**Components:**
- `IconRail.tsx` - Minimal 56px-wide rail showing workspace icons
- `workspaceColors.ts` - Deterministic color generation utility

**Icon Rail Features:**
1. **Workspace Icons:** First letter of workspace name in colored square
2. **Color Generation:** Deterministic hash-based colors from curated palette
3. **Visual Feedback:**
   - Active workspace: ring-2 border with primary color
   - Hover: scale-105 transform, increased opacity
4. **Actions:**
   - Click workspace icon → Switch to that workspace
   - Expand button (top) → Show full sidebar
   - Create button (bottom) → New workspace

**Color Palette:**
```typescript
// 12 carefully chosen colors with good contrast on dark backgrounds
const WORKSPACE_COLOR_PALETTE = [
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#14b8a6', // teal-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#a855f7', // purple-500
  '#84cc16', // lime-500
  '#6366f1', // indigo-500
];
```

**Keyboard Shortcut:** `Cmd+B` / `Ctrl+B` to toggle (already implemented in `useGlobalHotkeys`)

**Responsive Behavior:**
- **Desktop:** Collapsible sidebar with icon rail
- **Mobile:** Unchanged off-canvas drawer pattern (no icon rail)

**Theme Consistency:**
- All classes use existing theme tokens (`bg-surface-secondary`, `border-base`, etc.)
- 100% consistent with app's design system

### 17.3 Implementation Files

**New Files:**
- `src/components/Layout/IconRail.tsx` - Icon rail component
- `src/components/Layout/workspaceColors.ts` - Color utility
- `src/components/Layout/__tests__/IconRail.test.tsx` - Icon rail tests
- `src/components/Layout/__tests__/workspaceColors.test.ts` - Color utility tests
- `src/stores/__tests__/workspaceStore.sorting.test.ts` - Sorting logic tests

**Modified Files:**
- `src/types.ts` - Added `displayOrder` to `Workspace` interface
- `src/db/index.ts` - Added v5 migration for `displayOrder`
- `src/stores/workspaceStore.ts` - Updated sorting logic
- `src/components/Layout/Sidebar.tsx` - Added collapse toggle and IconRail integration

**Test Coverage:**
- ✅ 25 new tests (all passing)
- ✅ All existing tests still pass
- ✅ Unit tests for color generation
- ✅ Unit tests for IconRail component
- ✅ Unit tests for workspace sorting logic

### 17.4 Migration Path

**Upgrade from previous version:**
1. Database automatically migrates to v5 on first load
2. Existing workspaces assigned `displayOrder` based on current `lastAccessed` order
3. User sees no change in workspace order
4. From that point forward, order is stable (no more jumping on refresh)

**New workspaces:**
- Assigned `displayOrder = max(existing) + 1`
- Always appear at bottom of list
- Future drag-to-reorder will update `displayOrder` values

---

*This document will be updated as decisions are made and implementation progresses.*
