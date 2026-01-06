# Scratch Tabs - Theme System Guide

**Last Updated:** 2025-11-27
**Status:** ✅ Production Ready
**Architecture:** Semantic Design Tokens with CSS Variables

**📖 Related Documentation:**
- For **structural layout patterns and when to use structural classes**, see `LAYOUT_GUIDELINES.md`
- This guide focuses on **theme colors, semantic tokens, and color refactoring**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Semantic Design Tokens](#semantic-design-tokens)
4. [How to Refactor Legacy Components](#how-to-refactor-legacy-components)
5. [Architecture & Implementation](#architecture--implementation)
6. [Troubleshooting](#troubleshooting)
7. [Migration from Old Utilities](#migration-from-old-utilities)

---

## Overview

Scratch Tabs uses a **semantic design token system** built on Tailwind CSS and CSS variables to support light/dark mode theming. This approach provides:

✅ **Single source of truth** - All theme colors defined in `src/index.css`
✅ **Opacity modifier support** - Use `bg-surface/50`, `border-base/30`, etc.
✅ **WCAG compliant** - Proper contrast ratios in both modes
✅ **Maintainable** - Change theme colors by editing CSS variables only
✅ **Type-safe** - Tailwind autocomplete works for all semantic tokens

### Key Principle

> **Use semantic tokens, not color names.**
> Write `bg-surface` instead of `bg-white dark:bg-gray-800`

---

## Quick Start

### For New Components

Use semantic design tokens from the mapping dictionary below:

```tsx
// ✅ GOOD - Semantic tokens
<div className="bg-surface border-base text-main">
  <button className="bg-element hover:bg-element-hover">
    Click me
  </button>
</div>

// ❌ BAD - Raw colors or manual dark: variants
<div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
  <button className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
    Click me
  </button>
</div>
```

### For Existing Components

Use the [refactoring guide](#how-to-refactor-legacy-components) below to convert legacy patterns.

---

## Semantic Design Tokens

### The Mapping Dictionary

This is your **single source of truth** for all theming. Memorize these patterns:

#### 1. Containers & Backgrounds

| UI Element | Token | Notes |
|------------|-------|-------|
| Main page background | `bg-canvas` | The absolute bottom layer (Body). |
| Cards, Modals, Editor Areas | `bg-surface` | Main container content. |
| Secondary Panels | `bg-surface-secondary` | Sidebars, Inner panels. |
| Toolbars / Headers | `bg-surface-raised` | High contrast headers. |
| Tab Bar background | `bg-surface-highlight` | The area *behind* the tabs. |

#### 2. Elements (Inputs, Inner Panels, Rows)

| UI Element | Token | Notes |
|------------|-------|-------|
| Input Fields | `input-themed` | **Use this utility class for all text inputs.** |
| List Item / Table Row | `bg-surface` | |
| Hover state | `bg-element-hover` | Replaces `hover:bg-gray-700`, `hover:bg-slate-200` etc. |
| Active/Selected state | `bg-element-active` | Used for active tabs or selected list items. |

#### 3. Interactive & Buttons

| UI Element | Token | Notes |
|------------|-------|-------|
| **Primary Action** (Save, Submit) | `bg-primary` | Replaces `bg-blue-500`, `bg-blue-600`. |
| **Destructive Action** (Delete) | `bg-danger` | Replaces `bg-red-500`. |
| Secondary Button | `bg-element hover:bg-element-hover` | Usually accompanied by `border-base`. |
| Ghost/Icon Button | `hover:bg-element-hover` | Transparent background, only shows on hover. |

#### 4. Text & Icons

| UI Element | Token | Notes |
|------------|-------|-------|
| Primary text (Headers, Content) | `text-main` | Replaces `text-gray-100`, `text-white`. |
| Secondary text (Labels, Desc) | `text-secondary` | Replaces `text-gray-400`, `text-gray-500`. |
| UI Icons (Lucide/SVG) | `text-secondary` | Do not make icons `text-main` unless they are active. |
| Muted/Disabled text | `text-muted` | |
| Info text | `text-info` | Replaces `text-blue-600`, `text-blue-400`. |
| Success text | `text-success` | Replaces `text-green-600`, `text-green-400`. |
| Warning text | `text-warning` | Replaces `text-yellow-600`, `text-yellow-400`. |
| Danger/Error text | `text-danger` | Replaces `text-red-600`, `text-red-400`. |

#### 5. Borders

| UI Element | Token | Notes |
|------------|-------|-------|
| **ALL Borders** | `border-base` | Replaces `border-gray-200`, `border-gray-700`. |
| Focused Input Border | `border-focus` | Replaces `border-blue-500`. |
| Info Border | `border-info` | |
| Success Border | `border-success` | |
| Warning Border | `border-warning` | |
| Danger Border | `border-danger` | |

#### 6. Status Indicators (Badges/Alerts)

| Status | Token | Note |
|--------|-------|------|
| Info Background | `bg-info-subtle` | |
| Error Background | `bg-danger-subtle` | Replaces `bg-red-900`. |
| Success Background | `bg-success-subtle` | Replaces `bg-green-900`. |
| Warning Background | `bg-warning-subtle` | Replaces `bg-yellow-900`. |

#### 7. Hierarchy (Nesting Order)

Understanding the visual layering is critical for depth perception:

1. **Bottom Layer:** `bg-canvas` (The application background)
2. **Containers/Cards:** `bg-surface` (Main content areas sitting on canvas)
3. **Sidebars/Panels:** `bg-surface-secondary` (Structural elements inside surface or canvas)
4. **Items:** `bg-element` (Interactive items inside cards/panels)

*Example:* App Body (`bg-canvas`) -> SmartView (`bg-canvas`) -> Panels (`bg-surface` or `bg-surface-secondary`) -> Items (`bg-element`)

---

## How to Refactor Legacy Components

### Step 1: Identify Legacy Patterns

Search for these anti-patterns in your component:

```bash
# Find raw dark: variants
grep -n "dark:bg-" YourComponent.tsx
grep -n "dark:text-" YourComponent.tsx
grep -n "dark:border-" YourComponent.tsx

# Find old deprecated utilities
grep -n "bg-themed" YourComponent.tsx
grep -n "text-themed" YourComponent.tsx
```

### Step 2: Apply Replacements

Use this conversion table:

| Legacy Pattern | New Semantic Token |
|----------------|-------------------|
| `bg-white dark:bg-gray-800` | `bg-surface` |
| `bg-white dark:bg-gray-900` | `bg-surface` |
| `bg-gray-50 dark:bg-gray-900` | `bg-canvas` |
| `bg-gray-100 dark:bg-gray-800` | `bg-surface-secondary` |
| `bg-gray-100 dark:bg-gray-700` | `bg-surface-secondary` |
| `hover:bg-gray-100 dark:hover:bg-gray-700` | `bg-element-hover` |
| `hover:bg-gray-200 dark:hover:bg-gray-600` | `bg-element-hover` |
| `text-gray-900 dark:text-gray-100` | `text-main` |
| `text-gray-900 dark:text-white` | `text-main` |
| `text-gray-600 dark:text-gray-400` | `text-secondary` |
| `text-gray-500 dark:text-gray-500` | `text-muted` |
| `text-gray-400 dark:text-gray-500` | `text-muted` |
| `border-gray-200 dark:border-gray-700` | `border-base` |
| `border-gray-300 dark:border-gray-600` | `border-base` |
| `bg-blue-500 dark:bg-blue-600` | `bg-primary` |
| `text-blue-600 dark:text-blue-400` | `text-info` |
| `text-red-600 dark:text-red-400` | `text-danger` |

### Step 3: Strict Cleanup Rules

1. **STRIP `dark:` PREFIXES**: The new semantic tokens handle dark mode internally.
   - *Wrong:* `bg-surface dark:bg-gray-900`
   - *Correct:* `bg-surface`

2. **Remove Accent Colors**: Remove `accent-blue-500` or similar if present.

3. **Simplify Focus Rings**: Use `focus:ring-2 focus:border-focus`. Remove manual color definitions.

4. **No Raw Colors**: Do not use `bg-white`, `bg-gray-900`, `text-blue-500` unless:
   - Component is a **documented exception** (see Exceptions section above)
   - Absolutely necessary for non-theme elements (e.g., syntax highlighting)

5. **⚠️ Preserve Layout Structure**: When refactoring, maintain existing:
   - Flex direction and arrangement
   - Dynamic width/height classes
   - Inline styles for dynamic sizing
   - Custom spacing and positioning
   - **Note:** Structural classes (`.tablet-sidebar`, `.tablet-content-area`) provide ONLY semantic structure—width and overflow must be added explicitly. See `LAYOUT_GUIDELINES.md` → "Structural Class Philosophy" for details.

6. **Modals**: Ensure `BaseModal` and custom modal containers use `bg-surface` and `border-base`.

### Step 4: Example Refactor

**Before:**
```tsx
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
  <h2 className="text-gray-900 dark:text-white">Title</h2>
  <p className="text-gray-600 dark:text-gray-400">Description</p>
  <button className="bg-blue-600 hover:bg-blue-700 text-white">
    Save
  </button>
</div>
```

**After:**
```tsx
<div className="bg-surface border border-base">
  <h2 className="text-main">Title</h2>
  <p className="text-secondary">Description</p>
  <button className="bg-primary hover:bg-blue-700 text-white">
    Save
  </button>
</div>
```

### Step 5: Test Both Modes & Functionality

1. Toggle theme using the sun/moon icon in the status bar
2. Verify the component looks correct in both light and dark modes
3. Check hover states, focus states, and text contrast
4. Use browser DevTools to inspect computed colors
5. **⚠️ CRITICAL**: Test component functionality:
   - Verify layout structure hasn't changed (no unexpected columns/rows)
   - Test dynamic features (resizing, dragging, responsive behavior)
   - Check that tablet-specific functionality still works
6. **If layout breaks**: Revert structural classes, keep only color updates

---

## Architecture & Implementation

### CSS Variables (Single Source of Truth)

All theme colors are defined as RGB triplets in `src/index.css`:

```css
:root {
  /* Light Mode */
  --color-surface: 255 255 255; /* white */
  --color-text-main: 15 23 42; /* slate-900 */
  --color-border-base: 226 232 240; /* slate-200 */
  /* ... etc */
}

.dark {
  /* Dark Mode */
  --color-surface: 31 41 55; /* gray-800 */
  --color-text-main: 243 244 246; /* gray-100 */
  --color-border-base: 55 65 81; /* gray-700 */
  /* ... etc */
}
```

### Tailwind Config (Auto-Generated Utilities)

In `tailwind.config.js`, colors reference CSS variables:

```javascript
theme: {
  extend: {
    colors: {
      // Auto-generates bg-surface, text-surface, border-surface, etc.
      // WITH opacity modifier support (bg-surface/50)
      surface: 'rgb(var(--color-surface) / <alpha-value>)',
      main: 'rgb(var(--color-text-main) / <alpha-value>)',
      base: 'rgb(var(--color-border-base) / <alpha-value>)',

      // Status colors
      primary: 'rgb(var(--color-primary) / <alpha-value>)',
      success: 'rgb(var(--color-success) / <alpha-value>)',
      danger: 'rgb(var(--color-danger) / <alpha-value>)',
    }
  }
}
```

This architecture provides:

✅ **Opacity modifiers work**: `bg-surface/50`, `border-base/30`
✅ **Single source of truth**: Change `--color-surface` in CSS, all utilities update
✅ **No circular dependencies**: Clean, maintainable configuration
✅ **Type-safe**: Tailwind IntelliSense autocomplete

### Theme State Management

**Store:** `src/stores/themeStore.ts` (Zustand)

```typescript
// Get current theme
const theme = useThemeStore((state) => state.theme);

// Toggle theme
const toggleTheme = useThemeStore((state) => state.toggleTheme);
```

**Persistence:** Theme preference saved to IndexedDB
**Default:** Dark mode
**DOM Update:** `document.documentElement.classList` automatically updated

---

## Troubleshooting

### Opacity Modifiers Not Working

**Problem:** `bg-surface/50` applies solid color instead of 50% opacity.

**Solution:** Ensure the color is defined in `tailwind.config.js` using the CSS variable format:
```javascript
surface: 'rgb(var(--color-surface) / <alpha-value>)'
```

NOT using `@apply`:
```javascript
// ❌ WRONG - opacity modifiers won't work
'.bg-surface': { '@apply bg-white dark:bg-gray-800': {} }
```

### Text Unreadable in Light Mode

**Problem:** Muted text has poor contrast on light backgrounds.

**Solution:** Ensure `--color-text-muted` uses `slate-500` (100 116 139) in light mode, not `slate-400`.

### Rich Text Editor Broken in Light Mode

**Problem:** Code blocks or tables have dark backgrounds in light mode.

**Solution:** Ensure `src/index.css` uses CSS variables:
```css
.rich-text-editor .ProseMirror pre {
  background-color: rgb(var(--code-block-bg)) !important;
  color: rgb(var(--code-block-text));
}
```

### Component Looks Identical in Both Modes

**Problem:** Component doesn't change when toggling theme.

**Diagnosis:**
1. Check if component uses semantic tokens (not raw colors)
2. Verify `useThemeStore` is initialized in `App.tsx`
3. Check if `dark` class is being added to `<html>` element

---

## Migration from Old Utilities

### Deprecated Utilities (Do Not Use)

The following utilities from the old implementation are **DEPRECATED**:

| Deprecated Utility | Replacement |
|-------------------|-------------|
| `.bg-themed` | `bg-surface` |
| `.bg-themed-hover` | `bg-element-hover` |
| `.bg-themed-secondary` | `bg-surface-secondary` |
| `.bg-themed-tertiary` | `bg-surface-highlight` |
| `.text-themed` | `text-main` |
| `.text-themed-secondary` | `text-secondary` |
| `.text-themed-tertiary` | `text-secondary` |
| `.text-themed-muted` | `text-muted` |
| `.border-themed` | `border-base` |
| `.border-themed-light` | `border-base` |
| `.icon-themed` (old) | `text-secondary` |

### Why Migrate?

The old utilities:
- ❌ Don't support opacity modifiers
- ❌ Use hardcoded color values
- ❌ Can't be customized via CSS variables
- ❌ Don't follow semantic naming

The new semantic tokens:
- ✅ Support opacity modifiers (`bg-surface/50`)
- ✅ Use CSS variables (single source of truth)
- ✅ Easy to customize
- ✅ Semantic, self-documenting names

### Automated Migration Script

```bash
# Find all usages of deprecated utilities
grep -r "bg-themed" src/ --include="*.tsx" --include="*.ts"

# Replace in bulk (review changes before committing!)
find src/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/bg-themed-secondary/bg-surface-secondary/g' {} +
find src/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/bg-themed-hover/bg-element-hover/g' {} +
find src/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/bg-themed"/bg-surface"/g' {} +
```

**⚠️ Warning:** Always review sed changes with `git diff` before committing!

---

## Exceptions to Theme System

### Non-Themed Components

⚠️ **Some components must NOT use theme colors** to maintain functionality:

| Component | Required Style | Reason |
|-----------|---------------|--------|
| **HTML Preview** | `bg-white` (always) | HTML content expects standard white canvas; theming breaks rendering |

**Example:**
```tsx
// ❌ WRONG - Breaks HTML rendering
<div className="h-full w-full bg-canvas">
  <iframe src="..." />
</div>

// ✅ CORRECT - Always white
<div className="h-full w-full bg-white">
  <iframe src="..." />
</div>
```

Document new exceptions here as they're discovered.

---

## Best Practices

### ✅ DO

1. **Use semantic tokens exclusively** (except documented exceptions)
   ```tsx
   <div className="bg-surface text-main border-base">
   ```

2. **Leverage opacity modifiers**
   ```tsx
   <div className="bg-surface/50 backdrop-blur-sm">
   ```

3. **Use utility classes for status colors**
   ```tsx
   <span className="text-success">Success!</span>
   <div className="bg-danger-subtle">Error message</div>
   ```

4. **Group related utilities**
   ```tsx
   <input className="input-themed" /> {/* Includes bg, border, text, focus */}
   ```

5. **Use structural classes with explicit dimensions**
   ```tsx
   {/* Structural classes provide semantics, NOT dimensions */}
   <div className="tablet-sidebar w-72 overflow-y-auto custom-scrollbar">
   <div className="tablet-content-area overflow-hidden">
   ```

### ❌ DON'T

1. **Don't use raw colors with dark: variants**
   ```tsx
   {/* ❌ BAD */}
   <div className="bg-white dark:bg-gray-800">
   ```

2. **Don't hardcode colors in inline styles**
   ```tsx
   {/* ❌ BAD */}
   <div style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff' }}>
   ```

3. **Don't create new `dark:` variants**
   ```tsx
   {/* ❌ BAD */}
   <div className="bg-purple-500 dark:bg-purple-700">

   {/* ✅ GOOD - use semantic token or create CSS variable */}
   <div className="bg-primary"> {/* if purple is your primary color */}
   ```

4. **Don't mix old and new utilities**
   ```tsx
   {/* ❌ BAD */}
   <div className="bg-surface text-themed">

   {/* ✅ GOOD */}
   <div className="bg-surface text-main">
   ```

---

## Quick Reference

### Common Patterns

```tsx
// Modal/Dialog
<div className="bg-surface border border-base rounded-lg shadow-lg">
  <h2 className="text-main">Title</h2>
  <p className="text-secondary">Description</p>
</div>

// Button (Primary)
<button className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded">
  Save
</button>

// Button (Secondary)
<button className="bg-element hover:bg-element-hover border border-base px-4 py-2 rounded">
  Cancel
</button>

// Input Field
<input className="input-themed rounded" />

// List Item (Interactive)
<div className="bg-surface hover:bg-element-hover border-b border-base">
  Item
</div>

// Badge (Success)
<span className="bg-success-subtle text-success px-2 py-1 rounded">
  Active
</span>

// Icon Button
<button className="text-secondary hover:bg-element-hover p-2 rounded">
  <Icon size={20} />
</button>
```

---

## Files to Edit

When adding new theme colors or modifying existing ones:

1. **`src/index.css`** - Add/modify CSS variables in `:root` and `.dark`
2. **`tailwind.config.js`** - Add color mappings in `theme.extend.colors`
3. **Components** - Use semantic tokens, never edit directly

---

## Build & Testing

### Build Status
✅ Production build passes: `npm run build` (1m 24s)
✅ No errors or warnings
✅ All opacity modifiers functional

### Testing Checklist

- [ ] Component renders correctly in light mode
- [ ] Component renders correctly in dark mode
- [ ] Hover states work in both modes
- [ ] Focus states work in both modes
- [ ] Text has sufficient contrast (use browser DevTools)
- [ ] Borders are visible in both modes
- [ ] No `dark:` prefixes in refactored code

---

## Summary

- **Architecture:** CSS Variables → Tailwind Config → Components
- **Naming:** Semantic tokens (not color names)
- **Single Source:** All colors in `src/index.css`
- **Opacity Support:** Works on all semantic tokens
- **Status:** Production Ready ✅

**Questions?** Check troubleshooting section or refer to `tailwind.config.js` for available tokens.
