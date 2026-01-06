# UI Layout Guidelines

This document serves as the **Single Source of Truth** for structuring layouts in Tablets and Smart Views. Consistency is key to a polished user experience.

**📖 Related Documentation:**
- For **theme colors and semantic tokens**, see `THEME_GUIDE.md`
- This guide focuses on **structural layout patterns and when to use them**

## Core Hierarchy (The "Page" Model)

All main views (Tablets, Smart Views) follow a **Canvas -> Content** hierarchy.

### 1. Root Container
- **Class**: `h-full flex flex-col bg-canvas text-main overflow-hidden`
- **Purpose**: Establishes the base "page" background (Layer 0). All top-level views start here.

### 2. Header / Chrome (Standard)
- **Container**: `flex-none flex items-center justify-between border-b border-base px-4 py-3 bg-canvas`
- **Management**: Usually managed by the shell (`TabletView.tsx`) via `showStandardHeader: true`.
- **Content**:
    - **Title**: `text-xl font-semibold text-main` (or `h2`)
    - **Icons**: `text-secondary` (default), `text-main` (active/hover)
- **Rationale**: The main header sits ON the canvas, blending with the page background.

### 3. Navigation / Secondary Toolbars (Layer 2)
- **Container**: `flex-none border-b border-base bg-surface-secondary`
- **Usage**: Used for Tab-strips (e.g., GraphQL Query/Variables) or secondary tools (e.g., CSV Action bar).
- **Rationale**: Provides a visual "utility belt" look that is distinct from the main canvas and the work surface.

### 4. Sidebars (Layer 2)
- **Class**: `tablet-sidebar` (Standardized: `w-72 flex-shrink-0 border-r border-base bg-surface-secondary`)
- **Purpose**: Parameter panels, history lists, or file navigators.
- **Consistency Note**: Sidebars MUST be exactly `w-72` to prevent the UI from "jumping" when switching tabs.
- **⚠️ IMPORTANT**: Only use `.tablet-sidebar` for **fixed-width** sidebars. For dynamic/resizable panels (e.g., GraphQL schema explorer), use individual classes with `bg-surface-secondary` instead.

### 5. Content Area
- **Container**: `flex-1 overflow-hidden bg-surface`
- **Purpose**: The actual workspace. This is "Layer 1".
- **Padding**:
    - `p-4` (Standard for text-based tools).
    - `p-0` (For full-width tables/editors/canvases).

---

## Component-Specific Patterns

### Data Tables (e.g., CSV, JSON Log, Lists)
1. **Root**: Follows Core Hierarchy (`bg-canvas`).
2. **Toolbar**: `bg-surface-secondary` (Layer 2).
3. **Content Container**: `bg-surface flex-1 flex flex-col`.
4. **Table Header (Sticky)**:
    - **Background**: `bg-surface-secondary` (Layer 2) - **Distinct from rows**.
    - **Border**: `border-b border-base`.
5. **Table Body / Grid**:
    - **Background**: `bg-canvas` (Layer 0) - This is the "Data Layer" where inputs/cells live.
    - **Rows**: `border-b border-base hover:bg-element-hover`.

### Editors (e.g., Monaco, large textareas)
1. **Root**: Follows Core Hierarchy (`bg-canvas`).
2. **Editor Background**: Always `bg-canvas`.
3. **Container/Wrapper**: `bg-surface`.

### Cards and Grouped Settings
- **Class**: `.tablet-card` (Standardized: `bg-element border border-base rounded-lg p-4 shadow-sm`)
- **Usage**: Settings panels in Password, IPDetails, or Generator parameters.

---

## State and Status Coloring

To avoid "muddy" colors in Dark Mode, **NEVER** use hardcoded opacity (e.g., `bg-primary/20`) for status indicators. Use the predefined subtle utilities:

| State | CSS Utility | Usage |
| :--- | :--- | :--- |
| **Neutral / Info** | `.bg-info-subtle` | General info boxes, help text. |
| **Ready / Success** | `.bg-success-subtle` | Validated data, ready states. |
| **Warning / Alert** | `.bg-warning-subtle` | Warnings, potential issues. |
| **Error / Critical** | `.bg-danger-subtle` | Validation errors, failed requests. |

---

## Layout Comparison Matrix

| Component | Target Standard | Rationale |
| :--- | :--- | :--- |
| **Main Wrapper** | `bg-canvas` | Base layer of the page. |
| **Sidebar** | `bg-surface-secondary` | "Nav/Control" layer (Layer 2). |
| **Toolbar/Tabs** | `bg-surface-secondary` | "Utility" strip (Layer 2). |
| **Work Surface** | `bg-surface` | Primary content layer (Layer 1). |
| **Input/Editor** | `bg-canvas` | Deepest layer (Layer 0). |
| **Cards/Panels** | `bg-element` | Raised layer (Layer 3). |

## Summary of Tokens

- `bg-canvas`: Page base & High-focus input areas (Monaco).
- `bg-surface`: Main workspace background.
- `bg-surface-secondary`: Nav, Sidebars, Toolbars, Table Headers.
- `bg-element`: Cards, Buttons, Input UI Containers.
- `border-base`: Default border color.
- `...-subtle`: State/Status backgrounds.

---

## When to Use Structural Classes vs. Individual Classes

### Use Structural Classes (`.tablet-root`, `.tablet-sidebar`, etc.) For:
✅ **New components** being built from scratch
✅ **Simple layouts** with standard structure (header + sidebar + content)
✅ **Fixed-width sidebars** (always 288px)
✅ **Single-column reading tablets** (like IP Details) where layout is straightforward

### Use Individual Classes For:
⚠️ **Existing complex layouts** with specific flex arrangements
⚠️ **Dynamic/resizable panels** (e.g., GraphQL's 3-panel layout with draggable dividers)
⚠️ **Tablets with percentage-based widths** that need to maintain flexibility
⚠️ **Components with inline styles** for dynamic sizing (`style={{ width: '${x}%' }}`)

**Example - Dynamic Panel (GraphQL):**
```tsx
// ❌ DON'T - Breaks dynamic width
<div className="tablet-sidebar" style={{ width: `${panelWidth}%` }}>

// ✅ DO - Maintains functionality
<div className="border-r border-base bg-surface-secondary flex flex-col" style={{ width: `${panelWidth}%` }}>
```

### Styling-Only Refactors

When updating existing tablets, prefer **styling-only refactors** that preserve structure:

**Just update colors/semantics:**
- `bg-white dark:bg-gray-800` → `bg-surface`
- `bg-blue-500/20` → `bg-info-subtle`
- `text-green-400` → `text-success`
- `border-gray-200 dark:border-gray-700` → `border-base`

**Keep existing layout classes:**
- Keep `h-full`, `flex`, `flex-col`, `overflow-hidden`, etc.
- Keep inline styles for dynamic sizing
- Keep custom width classes if needed

---

## Exceptions to Theme Rules

### Non-Themed Components
Some components should **NOT** follow theme switching:

1. **HTML Preview** (`src/formats/html/components/HtmlPreview.tsx`)
   - **Always white background**: `bg-white` (not `bg-canvas`)
   - **Reason**: HTML content expects a standard white canvas; theming would break rendering expectations

2. **Future exceptions**: Document here as needed

---

## Migration Checklist for Existing Tablets

When standardizing an existing tablet:

1. **Analyze the layout structure first**
   - ✅ Is it a simple single-column or fixed sidebar layout?
   - ⚠️ Does it have dynamic widths, resizable panels, or complex flex arrangements?

2. **Choose your approach**
   - **Simple layout** → Apply structural classes (`.tablet-root`, `.tablet-sidebar`)
   - **Complex layout** → Styling-only refactor (colors/semantics only)

3. **Test functionality**
   - ✅ Verify layout doesn't break (no extra columns, spacing issues)
   - ✅ Test dynamic features (resizing, dragging, responsive behavior)
   - ✅ Check both light and dark modes

4. **Rollback if needed**
   - If structure breaks, revert to original layout classes
   - Keep semantic color improvements only