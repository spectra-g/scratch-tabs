# Sidebar Feature - E2E Test Plan

## Overview
This document outlines the E2E test scenarios for the Workspace Sidebar feature (Project Explorer). Scenarios are ordered by value, with smoke tests first.

**Feature Status:** Phase 1 Complete, Phase 2 Partial (Context Menus Complete)

**Reference:** See `/WORKSPACE_VISIBILITY.md` for feature specification.

---

## Test Scenarios (Ordered by Value)

### Smoke Tests (Critical Path - Highest Value)

#### 1. ✅ Toggle sidebar visibility with keyboard shortcut
**Priority:** P0 - Smoke Test
**Tags:** `@smoke @critical`
**Description:** Verify sidebar can be shown/hidden using Cmd+B (Ctrl+B on Windows)
**Acceptance Criteria:**
- Sidebar is visible by default on desktop
- Pressing Cmd+B hides the sidebar
- Pressing Cmd+B again shows the sidebar
- Icon rail is visible when sidebar is collapsed (desktop only)

**Value:** Most basic functionality - if this doesn't work, nothing else matters.

---

#### 2. Click workspace to expand/collapse tabs
**Priority:** P0 - Smoke Test
**Tags:** `@smoke @critical`
**Description:** Verify clicking a workspace toggles its expanded/collapsed state
**Acceptance Criteria:**
- Collapsed workspace shows arrow (▶) and tab count badge
- Clicking collapsed workspace expands it (shows tabs, arrow changes to ▼)
- Clicking expanded workspace collapses it (hides tabs, arrow changes to ▶)
- Multiple workspaces can be expanded simultaneously

**Value:** Core navigation pattern for browsing workspaces.

---

#### 3. Click tab in active workspace to activate it
**Priority:** P0 - Smoke Test
**Tags:** `@smoke @critical`
**Description:** Verify clicking a tab in the currently active workspace makes it active
**Acceptance Criteria:**
- Tab becomes active in editor
- Tab shows active indicator in sidebar
- Editor shows tab content
- No workspace switch occurs

**Value:** Most common user action - activating tabs in current workspace.

---

#### 4. Active workspace visual distinction
**Priority:** P0 - Smoke Test
**Tags:** `@smoke @critical`
**Description:** Verify active workspace has clear visual distinction from inactive workspaces
**Acceptance Criteria:**
- Active workspace has bold text
- Active workspace has colored border/icon
- Inactive workspaces have normal text and gray icons
- Only one workspace can be active at a time

**Value:** Critical UX - users must know which workspace is loaded.

---

#### 5. Click tab in inactive workspace switches workspace
**Priority:** P0 - Smoke Test
**Tags:** `@smoke @critical`
**Description:** Verify clicking a tab in an inactive workspace switches to that workspace and activates the tab
**Acceptance Criteria:**
- Clicking tab in inactive workspace shows "Switching..." feedback
- Workspace switches (becomes active in editor)
- Clicked tab becomes active
- Sidebar updates to show new active workspace with visual distinction
- Operation completes without error

**Value:** Primary cross-workspace navigation pattern.

---

### Core Workspace Management

#### 6. Create new workspace from sidebar
**Priority:** P1 - Core Functionality
**Tags:** `@core @workspace-crud`
**Description:** Verify users can create a new workspace from the sidebar
**Acceptance Criteria:**
- Click "Create Workspace" button (or context menu)
- New workspace appears in sidebar
- New workspace is empty (0 tabs badge)
- New workspace becomes active
- Workspace has default name (e.g., "Untitled Workspace")

**Value:** Essential CRUD operation for workspace management.

---

#### 7. Rename workspace from context menu
**Priority:** P1 - Core Functionality
**Tags:** `@core @workspace-crud`
**Description:** Verify workspace can be renamed via context menu
**Acceptance Criteria:**
- Right-click workspace to open context menu
- Select "Rename Workspace"
- Edit workspace name inline or in dialog
- Press Enter to confirm
- Workspace name updates in sidebar
- Name persists after page refresh

**Value:** Basic workspace customization.

---

#### 8. Delete workspace from context menu
**Priority:** P1 - Core Functionality
**Tags:** `@core @workspace-crud`
**Description:** Verify workspace can be deleted via context menu
**Acceptance Criteria:**
- Right-click workspace to open context menu
- Select "Delete Workspace"
- Confirmation dialog appears (if workspace has tabs)
- Confirm deletion
- Workspace removed from sidebar
- All tabs in workspace are deleted
- Deletion persists after page refresh

**Value:** Essential CRUD operation, includes data safety (confirmation).

---

### Core Tab Management

#### 9. Create new tab in workspace from context menu
**Priority:** P1 - Core Functionality
**Tags:** `@core @tab-crud`
**Description:** Verify new tab can be created in a workspace via sidebar context menu
**Acceptance Criteria:**
- Right-click workspace to open context menu
- Select "New Tab"
- New tab appears in workspace's tab list
- Tab count badge increments
- New tab becomes active (if workspace is active)
- Tab has default title (e.g., "Untitled")

**Value:** Primary tab creation pattern from sidebar.

---

#### 10. Rename tab from context menu
**Priority:** P1 - Core Functionality
**Tags:** `@core @tab-crud`
**Description:** Verify tab can be renamed via context menu
**Acceptance Criteria:**
- Right-click tab to open context menu
- Select "Rename"
- Edit tab title inline or in dialog
- Press Enter to confirm
- Tab title updates in sidebar and tab bar
- Rename persists after page refresh

**Value:** Basic tab customization.

---

#### 11. Delete tab from context menu
**Priority:** P1 - Core Functionality
**Tags:** `@core @tab-crud`
**Description:** Verify tab can be deleted via sidebar context menu
**Acceptance Criteria:**
- Right-click tab to open context menu
- Select "Close" or "Delete"
- Tab removed from sidebar
- Tab count badge decrements
- If last tab in workspace, workspace shows 0 tabs (workspace remains)
- Deletion persists after page refresh

**Value:** Essential tab management operation.

---

#### 12. Pin/unpin tab from context menu
**Priority:** P1 - Core Functionality
**Tags:** `@core @tab-management`
**Description:** Verify tab can be pinned/unpinned via context menu
**Acceptance Criteria:**
- Right-click tab to open context menu
- Select "Pin Tab"
- Tab shows pin indicator (📌) in sidebar
- Right-click pinned tab, select "Unpin Tab"
- Pin indicator disappears
- Pin state persists after page refresh

**Value:** Tab organization feature.

---

#### 13. Duplicate tab from context menu
**Priority:** P1 - Core Functionality
**Tags:** `@core @tab-management`
**Description:** Verify tab can be duplicated via context menu
**Acceptance Criteria:**
- Right-click tab to open context menu
- Select "Duplicate"
- New tab appears in same workspace
- New tab has same content as original
- New tab title has " (copy)" suffix or similar
- Tab count badge increments

**Value:** Common workflow pattern.

---

### Navigation & Discovery

#### 14. Reveal active tab in sidebar (auto-scroll)
**Priority:** P1 - Core UX
**Tags:** `@navigation @ux`
**Description:** Verify sidebar automatically scrolls to show the active tab when it changes
**Acceptance Criteria:**
- Create many tabs (>20) in active workspace to force scrolling
- Click a tab via the top tab bar (not sidebar)
- Sidebar automatically expands the active workspace
- Sidebar scrolls to make the active tab visible
- Active tab is highlighted in sidebar

**Value:** Critical UX - prevents "lost tab" confusion.

---

#### 15. Icon rail shows workspace icons when collapsed
**Priority:** P1 - Core UX
**Tags:** `@icon-rail @ux`
**Description:** Verify icon rail displays workspace icons when sidebar is collapsed
**Acceptance Criteria:**
- Collapse sidebar (Cmd+B)
- Icon rail visible on left side (56px width)
- Each workspace shows as colored icon with first letter of name
- Active workspace icon has visual distinction (ring border)
- Hovering workspace icon shows tooltip with name + tab count

**Value:** Space-efficient navigation for power users.

---

#### 16. Click workspace icon in icon rail switches workspace
**Priority:** P1 - Core Navigation
**Tags:** `@icon-rail @navigation`
**Description:** Verify clicking a workspace icon in the icon rail switches to that workspace
**Acceptance Criteria:**
- Collapse sidebar (Cmd+B) to show icon rail
- Click an inactive workspace icon
- Workspace switches (becomes active)
- Icon rail updates to show new active workspace with ring border
- Clicking expand button in icon rail expands full sidebar

**Value:** Quick workspace switching for collapsed sidebar users.

---

#### 17. Tab count badge shows correct count
**Priority:** P2 - Data Integrity
**Tags:** `@data-integrity`
**Description:** Verify tab count badge accurately reflects number of tabs in workspace
**Acceptance Criteria:**
- Workspace shows "N tabs" badge when collapsed
- Badge updates when tabs are added
- Badge updates when tabs are deleted
- Badge shows "0 tabs" for empty workspace
- Badge is accurate across all workspaces

**Value:** User trust in UI accuracy.

---

#### 18. Search/filter tabs in sidebar
**Priority:** P2 - Discovery
**Tags:** `@search @discovery @wip`
**Description:** Verify search input filters visible tabs across all workspaces
**Acceptance Criteria:**
- Type query in "Filter tabs..." search input
- Tabs matching query remain visible
- Non-matching tabs are hidden
- Matching tabs across multiple workspaces are shown
- Clear search shows all tabs again
- Search matches tab title and language

**Value:** Essential for users with many tabs. (Note: Not yet implemented - Phase 5)

---

### Edge Cases & Data Integrity

#### 19. Empty workspace remains after deleting last tab
**Priority:** P2 - Data Integrity
**Tags:** `@data-integrity @edge-case`
**Description:** Verify empty workspaces are allowed and remain after all tabs deleted
**Acceptance Criteria:**
- Create workspace with one tab
- Delete the tab via sidebar context menu
- Workspace remains in sidebar
- Workspace shows "0 tabs" badge
- Empty workspace can receive new tabs
- Empty workspace persists after page refresh

**Value:** Validates architectural decision (empty workspaces allowed).

---

#### 20. Workspace order persists across page refresh
**Priority:** P2 - Data Integrity
**Tags:** `@data-integrity @persistence`
**Description:** Verify workspace display order is stable across page refreshes
**Acceptance Criteria:**
- Note the order of workspaces in sidebar
- Refresh the page
- Workspace order remains the same
- Clicking a workspace does NOT reorder the list
- New workspaces appear at the bottom

**Value:** Validates displayOrder migration and stable sorting.

---

### Advanced Interactions (Future)

#### 21. Drag tab to reorder within workspace
**Priority:** P3 - Enhancement
**Tags:** `@drag-drop @enhancement @wip`
**Description:** Verify tabs can be reordered via drag-and-drop within a workspace
**Status:** Not yet implemented (Phase 2)

---

#### 22. Drag tab between workspaces
**Priority:** P3 - Enhancement
**Tags:** `@drag-drop @enhancement @wip`
**Description:** Verify tabs can be moved between workspaces via drag-and-drop
**Status:** Not yet implemented (Phase 2)

---

#### 23. Multiple browser windows sync sidebar state
**Priority:** P3 - Multi-Window
**Tags:** `@broadcast @multi-window @wip`
**Description:** Verify sidebar state syncs across multiple browser windows
**Status:** Requires broadcast channel implementation (Phase 4)

---

## Test Data Requirements

### Workspace Setup
- **Minimal:** 1 active workspace with 3 tabs
- **Standard:** 3 workspaces (active + 2 inactive) with 3-5 tabs each
- **Heavy:** 5+ workspaces with 10-20 tabs each (for scrolling/performance tests)

### Tab Types
- Regular tabs with different languages (JS, JSON, Markdown)
- Tablets (Calculator, JSON Mapper)
- Rich text tabs
- Pinned tabs
- Empty tabs (no content)

---

## Implementation Priority

### Session 1 (This Session)
- ✅ Create test plan
- ✅ Implement Scenario 1: Toggle sidebar visibility

### Session 2
- Scenarios 2-5 (Smoke tests)

### Session 3
- Scenarios 6-8 (Workspace CRUD)

### Session 4
- Scenarios 9-13 (Tab CRUD)

### Session 5
- Scenarios 14-17 (Navigation)

### Session 6
- Scenarios 18-20 (Edge cases)

---

## Notes

### Stable Selectors Required
Based on E2E guidelines, the following `data-testid` attributes are needed:

**Sidebar:**
- `[data-testid="sidebar"]` - Main sidebar container
- `[data-testid="sidebar-toggle"]` - Collapse/expand button
- `[data-testid="sidebar-search"]` - Search/filter input

**Workspaces:**
- `[data-testid="workspace-{id}"]` - Workspace row
- `[data-testid="workspace-{id}-expand"]` - Expand/collapse arrow
- `[data-testid="workspace-{id}-badge"]` - Tab count badge
- `[data-testid="workspace-{id}-actions"]` - Workspace action buttons

**Tabs in Sidebar:**
- `[data-testid="sidebar-tab-{id}"]` - Tab row in sidebar
- `[data-testid="sidebar-tab-{id}-close"]` - Close button

**Icon Rail:**
- `[data-testid="icon-rail"]` - Icon rail container
- `[data-testid="icon-rail-workspace-{id}"]` - Workspace icon
- `[data-testid="icon-rail-expand"]` - Expand sidebar button
- `[data-testid="icon-rail-create"]` - Create workspace button

### DOM-Based Operation Detection
Per E2E guidelines, no arbitrary timeouts are allowed. Use:
- Playwright's built-in waits (`expect().toBeVisible()`, `waitForSelector()`)
- DOM-based indicators (`#test-save-indicator`) for async operations
- `waitForSaveIndicator()` for workspace switches

---

**Last Updated:** 2026-01-24
**Total Scenarios:** 23 (20 prioritized, 3 future)
**Estimated Implementation:** 6 sessions
