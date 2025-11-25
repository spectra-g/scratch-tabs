## Refactoring Instructions

**Goal**: Standardize application styling using Semantic Design Tokens defined in `tailwind.config.js`.

### ⚠️ Current State Warning
Files may contain a mix of:
- **Raw Dark Mode colors** (e.g., `bg-gray-900`, `text-gray-200`, `border-gray-700`).
- **Manual Light/Dark toggles** (e.g., `bg-white dark:bg-gray-900`).
- **Deprecated tokens** (e.g., `bg-themed`, `bg-themed-secondary`, `border-themed`, `text-themed`).

**Rule**: Treat ALL of the above as 'Legacy Code'. You must replace them with the Semantic Tokens below.

### 🎨 The New Mapping Dictionary

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

---

### 🧹 Strict Cleanup Rules

1.  **STRIP `dark:` PREFIXES**: The new semantic tokens handle dark mode internally.
    *   *Wrong:* `bg-surface dark:bg-gray-900`
    *   *Correct:* `bg-surface`
2.  **Remove Accent Colors**: Remove `accent-blue-500` or similar if present.
3.  **Simplify Focus Rings**: Use `focus:ring-2 focus:border-focus`. Remove manual color definitions in rings if possible.
4.  **No Raw Colors**: Do not use `bg-white`, `bg-gray-900`, `text-blue-500` unless absolutely necessary for a specific non-theme element (e.g., a color picker or syntax highlighting).
5.  **Modals**: Ensure `BaseModal` and custom modal containers use `bg-surface` and `border-base`.

### 📝 Output Format
Please output the full, refactored code for the file. Do not output partial snippets.