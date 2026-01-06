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
- **Structural Class**: `.tablet-sidebar`
  - **CSS Definition**: `flex-shrink-0 border-r border-base bg-surface-secondary flex flex-col`
  - **Required JSX Classes**: `w-72 overflow-y-auto custom-scrollbar` (add explicitly)
- **Purpose**: Parameter panels, history lists, or file navigators.
- **Consistency Note**: Fixed-width sidebars MUST be exactly `w-72` to prevent the UI from "jumping" when switching tabs.
- **⚠️ IMPORTANT**: Structural classes provide ONLY semantic structure. Width and overflow must be added explicitly in JSX for flexibility.

**Standard Sidebar Pattern:**
```tsx
<div className="tablet-sidebar w-72 overflow-y-auto custom-scrollbar">
  {/* sidebar content */}
</div>
```

**Dynamic/Resizable Panel Pattern:**
```tsx
<div className="border-r border-base bg-surface-secondary flex flex-col" style={{ width: `${panelWidth}%` }}>
  {/* dynamic panel content */}
</div>
```

### 5. Content Area
- **Structural Class**: `.tablet-content-area`
  - **CSS Definition**: `flex-1 flex flex-col min-w-0 bg-surface`
  - **Required JSX Classes**: `overflow-hidden` (add when needed for scroll containment)
- **Purpose**: The actual workspace. This is "Layer 1".
- **Padding**:
    - `p-4` (Standard for text-based tools).
    - `p-0` (For full-width tables/editors/canvases).

**Standard Content Area Pattern:**
```tsx
<div className="tablet-content-area overflow-hidden">
  {/* content */}
</div>
```

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

## Structural Class Philosophy

### Design Principle: Minimal & Decoupled

Structural classes (`.tablet-root`, `.tablet-sidebar`, `.tablet-content-area`, etc.) provide **ONLY semantic structure and theming**. They are intentionally minimal to support maximum flexibility.

**What Structural Classes Provide:**
- ✅ Semantic background colors (theme-aware)
- ✅ Borders and visual separation
- ✅ Flex layout direction
- ✅ Basic structural positioning

**What Structural Classes DO NOT Provide:**
- ❌ Fixed widths (add `w-72`, `w-64`, etc. explicitly)
- ❌ Overflow behavior (add `overflow-hidden`, `overflow-y-auto` explicitly)
- ❌ Scrollbar styling (add `custom-scrollbar` explicitly)
- ❌ Padding/margins (add `p-4`, `px-6`, etc. as needed)

**Why This Matters:**

1. **Flexibility for Resizable Panels**: Components can use `style={{ width: '${x}%' }}` without fighting CSS
2. **Sticky Header Support**: Developers control overflow context explicitly
3. **Custom Scroll Contexts**: Different tablets may need different scroll behaviors
4. **Performance**: Components can optimize scroll handling per use case

**Standard Pattern:**
```tsx
// ✅ CORRECT - Explicit dimensions and overflow
<div className="tablet-root">
  <div className="tablet-sidebar w-72 overflow-y-auto custom-scrollbar">
    {/* sidebar */}
  </div>
  <div className="tablet-content-area overflow-hidden">
    {/* content */}
  </div>
</div>

// ❌ WRONG - Assuming structural classes include dimensions
<div className="tablet-root">
  <div className="tablet-sidebar">  {/* Missing w-72! */}
    {/* sidebar */}
  </div>
  <div className="tablet-content-area">  {/* Missing overflow-hidden! */}
    {/* content */}
  </div>
</div>
```

---

## When to Use Structural Classes vs. Individual Classes

### Use Structural Classes (`.tablet-root`, `.tablet-sidebar`, etc.) For:
✅ **New components** being built from scratch
✅ **Simple layouts** with standard structure (header + sidebar + content)
✅ **Standard sidebars** (when you'll add `w-72` explicitly in JSX)
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

---

## Performance Best Practices

### Memoize Expensive Lookups

When using tablet metadata or registry lookups inside render cycles, wrap them in `useMemo`:

**❌ BAD - Iterates on every render:**
```tsx
const tabletMeta = tabletRegistry.getAllMetadata().find(m => m.id === tabletType);
```

**✅ GOOD - Memoized with dependency:**
```tsx
const tabletMeta = useMemo(() => {
  return tabletRegistry.getAllMetadata().find(m => m.id === tabletType);
}, [tabletType]);
```

**Why:** Registry lookups iterate through arrays and should only run when the dependency changes, not on every render cycle.