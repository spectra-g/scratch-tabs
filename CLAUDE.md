# Scratch Tabs - Architecture & Developer Guide

## 1. Project Overview

**Scratch Tabs** is a feature-rich, browser-based text editor and utility workspace designed for developers who need a fast, powerful playground for code, data transformation, and various development utilities.

### Core Identity
- **Type:** Web Application (SPA - Single Page Application)
- **Purpose:** Multi-tab editor with split-screen, format detection, code execution, and specialized tools
- **Technology Stack:** React 18, TypeScript, Zustand, Monaco Editor, Vite, Tailwind CSS, IndexedDB
- **Platform:** Browser-based (works offline via IndexedDB)

### Key Capabilities
- Multi-tab editor with split-screen support
- Automatic language/format detection (40+ formats supported)
- Rich text editing with TipTap
- Specialized "Tablets" (utility tools: JSON mapper, GraphQL client, calculator, etc.)
- Workspace management (multiple isolated projects)
- Content import/export (ZIP, JSON, YAML)
- Local persistence via IndexedDB
- Advanced features: AI integration, diff viewing, search, paste from clipboard detection

---

## 2. High-Level Architecture

### Application Structure

```
src/
├── App.tsx                          # Root app component with routing
├── main.tsx                         # Entry point
├── components/                      # React components
│   ├── Layout/MainLayout.tsx        # Main UI shell
│   ├── Editor/                      # Editor UI components
│   ├── Tab/                         # Tab bar and tab management UI
│   ├── Tablet/                      # Tablet renderer
│   └── [other feature components]
├── stores/                          # Zustand state management
│   ├── rootStore.ts                 # Action coordinator
│   ├── tabsStore.ts                 # Tab metadata
│   ├── splitViewStore.ts            # UI layout state
│   ├── workspaceStore.ts            # Workspace management
│   ├── persistenceStore.ts          # Save coordination
│   └── [other stores]
├── services/                        # Business logic
│   ├── modelManager.ts              # Monaco model lifecycle & content handling (CRITICAL)
│   ├── contentProcessing/           # Content transformation pipeline
│   └── [other services]
├── db/                              # Database (IndexedDB)
│   └── index.ts                     # Storage abstraction layer
├── formats/                         # Format detection & views (40+ formats)
│   ├── index.ts                     # Format registry & detection
│   ├── json/                        # JSON with smart view
│   ├── csv/                         # CSV with table view
│   ├── markdown/                    # Markdown with preview
│   └── [many others]
├── tablets/                         # Specialized utility tools
│   ├── bridge/                      # Unified interface for tablets
│   ├── jsonmapper/                  # JSON transformation
│   ├── graphql/                     # GraphQL client
│   ├── restclient/                  # REST API client
│   ├── calculator/                  # Expression calculator
│   ├── cron/                        # Cron schedule parser
│   └── [many others]
├── utils/                           # Utility functions
└── hooks/                           # React hooks
```

---

## 3. Architectural Patterns & Design Decisions

### 3.1 State Management Architecture (CRITICAL)

**Core Philosophy:** React state is for UI state only. Large content is NOT stored in Zustand.

#### The Three-Tier Content System

1. **Monaco Editor Model** (Source of Truth for Live Content)
   - Managed by `ModelManager` singleton
   - LRU cache with max 10 models
   - NOT a React state - imperatively managed
   - Automatically synced to store on every keystroke

2. **Zustand Store** ("Last-Known-Good" State)
   - `Tab.content` property holds the last saved version
   - Used for persistence and initial model hydration
   - Updated by ModelManager's centralized change handler
   - NOT the live source of truth

3. **IndexedDB** (Persistent Storage)
   - Long-term storage for all tabs
   - Debounced saves (2.5 second intervals)
   - Automatic fallback for missing content

#### Zustand Stores

| Store | Role | Contents |
|-------|------|----------|
| `rootStore` | Action coordinator | Complex multi-store operations (no state) |
| `tabsStore` | Tab metadata store | Array of Tab objects with metadata |
| `splitViewStore` | UI layout | Which tabs on each side, active tabs |
| `workspaceStore` | Workspace management | Workspaces list, active workspace |
| `persistenceStore` | Persistence orchestration | Save coordination |
| `editorStore` | Editor UI state | Preview mode toggle |
| `clipboardStore` | Clipboard operations | Pending clipboard data |
| `searchStore` | Global search | Search query and results |
| `aiStore` | AI features | Model management, callbacks |

### 3.2 ModelManager - The Content Authority (CRITICAL)

**Location:** `src/services/modelManager.ts`

**Purpose:** Central hub for ALL content-related operations

#### Key Responsibilities
- **Model Lifecycle:** Create, cache, dispose Monaco models
- **Memory Management:** LRU eviction (max 10 models in memory)
- **Content Synchronization:** Auto-sync model content to Zustand store
- **Language Detection:** Intelligent format detection
- **Paste Detection:** Distinguish user pastes from programmatic changes
- **Auto-Formatting:** Format only on user paste, not programmatic changes
- **Cursor Position:** Debounced database persistence (NOT React state)

#### Critical Architecture Decisions

1. **Content Change Handler** (Centralized)
   - Single `onDidChangeContent` listener per model
   - All content logic flows through this point
   - Updates store, detects language, triggers formatting

2. **No React State for Cursor Position**
   - Cursor position stored in Monaco's view state
   - Debounced database persistence only (1-second delay)
   - NO React state updates = NO performance issues
   - Solves the undo functionality bug

3. **Paste Detection System**
   - `EditorInstance` calls `modelManager.markNextChangeAsPaste()` on paste
   - Timeout-based flag (clears after 500ms)
   - Auto-format only triggered for paste-originated changes

#### API
```typescript
modelManager.get(tab)                           // Get/create model
modelManager.dispose(tabId)                     // Dispose model
modelManager.disposeAll()                       // Clear all models
modelManager.updateModelContent(tabId, content) // Programmatic update
modelManager.updateModelLanguage(tabId, lang)   // Language update
modelManager.getContent(tabId)                  // Get current content
modelManager.markNextChangeAsPaste(tabId)       // Flag for paste
modelManager.registerCursorPositionListener()   // Cursor tracking
modelManager.unregisterCursorPositionListener() // Cleanup
```

### 3.3 Component Architecture

#### Smart Component Hierarchy

```
App
├── BrowserRouter (React Router)
└── MainLayout (Content shell)
    ├── TabBar (left)
    │   ├── SortableTab (draggable tab)
    │   └── TabContextMenu
    ├── EditorPaneWrapper (left)
    │   └── EditorInstance
    │       └── Monaco Editor
    ├── SplitViewDivider (resizable)
    ├── TabBar (right)
    └── EditorPaneWrapper (right)

Modals (conditionally rendered):
├── DiffModal
├── SummarizeModal
├── SearchModal
├── AIModelManagementModal
└── ConfirmationDialog
```

#### Key Components

| Component | Location | Role |
|-----------|----------|------|
| `EditorInstance` | `components/Editor/` | Monaco editor host (view component) |
| `EditorPaneWrapper` | `components/Editor/` | Pane container logic |
| `MainLayout` | `components/Layout/` | App shell, orchestration |
| `TabBar` | `components/Tab/` | Tab list UI |
| `SortableTab` | `components/Tab/` | Individual tab (draggable) |
| `TabletRenderer` | `components/Tablet/` | Renders tablet UI |
| `DiffModal` | `components/DiffModal/` | Two-tab diff viewer |

### 3.4 Data Flow Architecture

#### User Types a Character
```
User input in Editor
  ↓
Monaco Editor updates model
  ↓
onDidChangeContent listener fires
  ↓
ModelManager.handleLanguageDetection()
  ├─ updateTabsStore (tab.content)
  ├─ detectFormat() if significant change
  └─ triggerAutoFormat() if from paste
  ↓
periodically: persistenceStore.saveState()
  ↓
IndexedDB save (debounced 2.5s)
```

#### User Pastes Content
```
User pastes in Editor
  ↓
EditorInstance calls modelManager.markNextChangeAsPaste()
  ↓
Monaco Editor updates model
  ↓
onDidChangeContent listener fires
  ↓
ModelManager.handleLanguageDetection()
  ├─ recognizes paste flag
  ├─ triggers contentProcessingService
  ├─ auto-formats document
  ├─ detects language from content
  └─ updates tab language
```

#### Content Recovery (Database Fallback)
```
Tab switch → Component requests model from ModelManager
  ↓
ModelManager.ensureTabContent()
  ├─ Check if content in store
  └─ If missing: fetch from IndexedDB
  ↓
Update store with fetched content
  ↓
Create/return Monaco model
```

### 3.5 Split View Management

**Store:** `splitViewStore.ts`

Manages the two-pane UI layout:
- `leftTabs[]` / `rightTabs[]` - Tab IDs on each side
- `activeLeftTabId` / `activeRightTabId` - Currently active
- `isSplit` - Boolean for split/unsplit state
- `splitRatio` - Resize handle position
- `leftTabHistory[]` / `rightTabHistory[]` - Recent tabs for diff

**Operations:**
- `splitScreen()` - Activate split view
- `unsplitScreen()` - Collapse to single pane
- `moveTabToRight()` / `moveTabToLeft()` - Move between sides
- `addTabToSide()` - Add tab to a side
- `setActiveLeftTab()` / `setActiveRightTab()` - Change active

### 3.6 Workspace Architecture

**Store:** `workspaceStore.ts`

Multi-project/context management:
- Each workspace has isolated tabs and split view
- Workspaces listed in sidebar, sorted by last accessed
- Workspace switching triggers: save state, clear models, load target workspace

**Features:**
- Create/rename/delete workspaces
- Workspace notes
- Workspace links (URLs)
- Auto-save before switching

### 3.7 Format Detection System

**Location:** `src/formats/`

**Registry Pattern:**
```typescript
formatRegistry.register(detector)        // Register a format
formatRegistry.getById(id)               // Get by ID
formatRegistry.getAll()                  // All formats
formatRegistry.getPotentialMatches()     // Detection
```

**40+ Supported Formats:**
- Languages: JavaScript, Python, Java, Go, Rust, C++, etc.
- Data: JSON, YAML, XML, CSV, NDJSON, etc.
- Web: HTML, CSS, HTTP/GraphQL, etc.
- Infrastructure: Docker, Terraform/HCL, Bash, etc.
- Specialized: Diff, Logs, Stacktraces, etc.

**Smart Views:**
- JSON → Table/formatted view
- CSV → Spreadsheet-like table
- Markdown → Live preview
- Diff → Side-by-side comparison
- SVG → Visual rendering

### 3.8 Tablets System

**Location:** `src/tablets/`

Specialized utility tools integrated into tabs.

#### Bridge Pattern
`tablets/bridge/` provides unified interface:
```typescript
tabletBridge.createTab()              // Create new tab
tabletBridge.getActiveTab()           // Get current tab
tabletBridge.getDeviceInfo()          // Device metadata
tabletBridge.detectLanguage()         // Language detection
```

#### Available Tablets (40+)
| Category | Tools |
|----------|-------|
| Conversion | Base64, URL, Checksum |
| Utilities | Calculator, Regex, UUID, Password |
| API Tools | GraphQL Client, REST Client |
| Content | JSON Mapper, YAML Viewer, CSV Editor |
| Productivity | Pomodoro Timer, Cron Parser, Lorem Ipsum |
| Special | Shapesnap (shape recognition), Emoji picker |

#### Tablet Structure
```
tablets/[name]/
├── index.ts          # Register tablet
├── hooks/            # Tablet-specific hooks
├── utils/            # Tablet utilities
├── components/       # Tablet UI
└── types.ts          # Tablet types
```

---

## 4. Key Technical Patterns

### 4.1 Persistence Strategy

**Goal:** Save work with minimal blocking

**Implementation:**
- **Debounced Saves:** Content saved every 2.5 seconds (batch)
- **Lazy Loading:** Content only fetched when needed
- **Metadata First:** Tab metadata always loaded upfront
- **Cursor Position:** Debounced 1-second database save (not React state)

**Persistence Flow:**
```
React component changes
  ↓
Zustand store updates
  ↓
persistenceStore.saveState() (periodic)
  ↓
ModelManager content
  ↓
IndexedDB (debounced)
```

### 4.2 Performance Optimizations

1. **Cursor Position Not in React State**
   - Stored only in Monaco's view state
   - Debounced database persistence
   - Eliminates render cascades

2. **Efficient Model Caching**
   - Max 10 models in memory
   - LRU eviction for memory management
   - Models disposed when switching workspaces

3. **Content Sampling for Detection**
   - Format detection on first 100 lines only
   - Prevents performance issues with huge files
   - Configurable in FORMAT_DETECTION_CONFIG

4. **Selective Store Subscriptions**
   - Components use targeted selectors
   - `useStoreWithEqualityFn` with shallow comparison
   - Prevents unnecessary re-renders

### 4.3 Error Boundaries

ModelManager provides robust error handling:
- Failed operations log warnings, don't throw
- Graceful fallbacks (empty models, default values)
- Content recovery from database
- Database connection retry logic (3 attempts)

---

## 5. Data Structures

### Tab Object
```typescript
interface Tab {
  id: string;                              // UUID
  title: string;                           // User-visible name
  content?: string;                        // Text content (last-saved)
  richContent?: RichContent;               // TipTap JSON for rich text
  language: string;                        // Format/language ID
  languageLocked: boolean;                 // User locked language
  isTablet?: boolean;                      // Is a tablet tool
  tabletState?: string;                    // Serialized tablet state
  isRich?: boolean;                        // Rich text mode enabled
  cursorPosition: EditorPosition;          // Line + column
  isPinned?: boolean;                      // Pinned to top of list
  dateCreated: number;                     // Timestamp
  lastModified: number;                    // Timestamp
  workspaceId: string;                     // Parent workspace
  activeViewId?: string | null;            // CSV table view ID
  previewMode?: boolean;                   // Markdown preview toggle
  fontSize?: number;                       // Editor font size
}

interface Workspace {
  id: string;
  name: string;
  notes?: string;                          // Workspace notes
  links: WorkspaceLink[];                  // Reference URLs
  createdAt: number;
  lastAccessed: number;
}

interface SplitViewState {
  id: string;
  isSplit: boolean;
  leftTabs: string[];                      // Tab IDs
  rightTabs: string[];
  activeLeftTabId: string | null;
  activeRightTabId: string | null;
  activeSide: "left" | "right" | null;
  splitRatio: number;                      // 0.5 = 50/50
  leftTabHistory: string[];                // For diff feature
  rightTabHistory: string[];
  workspaceId: string;
}
```

---

## 6. Database Schema (IndexedDB)

**Database:** `ScratchTabsDB` (Dexie.js wrapper)

**Tables:**

| Table | Key | Indexes |
|-------|-----|---------|
| `tabs` | `id` | `workspaceId, lastModified` |
| `splitView` | `id` | `workspaceId, lastModified` |
| `workspaces` | `id` | `lastAccessed` |
| `settings` | `key` | - |

**Migrations:**
- **v1:** Initial schema
- **v2:** Workspace support (migration from flat structure)
- **v3:** Settings table for analytics

---

## 7. Routing & Navigation

**Framework:** React Router v6

**Routes:**
```
/                    # Main workspace (default)
/:identifier         # Open tab by identifier (URL share feature)
```

**Navigation:**
- Click workspace in sidebar → `switchWorkspace()`
- Click tab → `setActiveTab()` or `setActiveLeftTab()`/`setActiveRightTab()`
- Share URL → URL handler detects and opens tab

---

## 8. Build & Development Configuration

### Vite Configuration
- **Entry:** `src/main.tsx`
- **Output:** `dist/`
- **Plugins:** React Fast Refresh
- **Optimization:** Code splitting (separate chunks for Monaco, AI libs, UI libs)

### Chunk Strategy
```
monaco           // @monaco-editor/react
ai               // @xenova/transformers
ui               // framer-motion, recharts
math             // mathjs
utils            // lodash, date-fns
dnd              // drag-and-drop kit
table            // @tanstack table/virtual
router           // react-router-dom
markdown         // markdown & remark
```

### Tailwind CSS
- **Config:** `tailwind.config.js`
- **Plugins:** Scrollbar plugin
- **Typography:** Typography plugin for rich text

### TypeScript
- **Config:** `tsconfig.json` with references
- **Strict Mode:** Enabled
- **Target:** ES2020

---

## 9. Testing Infrastructure

### Unit Tests
- **Framework:** Jest
- **Location:** `**/__tests__/*.test.ts(x)`
- **Mocks:** `src/__mocks__/`

### E2E Tests
- **Framework:** Playwright + Cucumber
- **Location:** `tests/e2e/`
- **Commands:**
  ```bash
  npm run e2e           # Run tests
  npm run e2e:compile   # Compile TypeScript
  npm run e2e:full      # Full suite
  npm run e2e:report    # View report
  ```

---

## 10. Common Development Tasks

### Adding a New Format
1. Create `src/formats/[name].ts`
2. Implement `FormatDetector` interface
3. Register in format registry
4. Add smart view if needed (e.g., `json/views/`)

### Adding a New Tablet
1. Create `src/tablets/[name]/index.ts`
2. Export config: `{ id, name, component }`
3. Implement tablet component
4. Use `useTabletBridge()` hook for external access
5. Register in tablets registry

### Adding a New Store
1. Create `src/stores/[name]Store.ts`
2. Use `create<Store>()` from Zustand
3. Export hook and types
4. Import in `rootStore` if needed

### Debugging
- **ModelManager:** `modelManager.getDebugInfo()`
- **Store State:** Browser console: `useTabsStore.getState()`
- **E2E Tests:** Use `updateSaveIndicator()` to detect saves

---

## 11. Common Gotchas & Anti-Patterns

### ❌ DON'T:
- Store large content in React state (use ModelManager)
- Update cursor position in Zustand (use Monaco view state + debounced DB)
- Call `getValue()` on Monaco model from render phase (async/lazy only)
- Create models without LRU eviction consideration (max 10)
- Update `tab.content` directly (use `updateTabContent()` action)
- Auto-format programmatic changes (only on user paste)

### ✅ DO:
- Fetch content from ModelManager when needed
- Use centralized content handler in ModelManager
- Subscribe selectively to stores (avoid full store subscription)
- Dispose models when switching workspaces
- Use paste flag detection for paste-specific logic
- Route all tab modifications through rootStore
- Debounce database operations

---

## 12. Performance Characteristics

### Memory Usage
- **Baseline:** ~5-10MB
- **Per Tab (cached):** ~500KB - 2MB (depending on content)
- **Max Cached:** 10 tabs (LRU eviction after)
- **Typical Working Set:** 50-100MB (all tabs + DB)

### Response Times
- **Tab Switch:** < 50ms (view state restore)
- **Paste:** < 200ms (detection + formatting)
- **Format Detection:** < 100ms (sampling only first 100 lines)
- **Save to DB:** 2.5 seconds (debounced batch)
- **Cursor Save:** 1 second (debounced)

### Constraints
- **Max Tabs:** Unlimited (only limited by IndexedDB size)
- **Max Tab Size:** Tested with 100MB+ files (sampling mitigates)
- **Max Content Length:** No hard limit (IndexedDB limits to ~50MB per db)

---

## 13. Key Files to Know

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root component, routing setup |
| `src/services/modelManager.ts` | CRITICAL: content authority |
| `src/stores/rootStore.ts` | Action coordinator |
| `src/components/Layout/MainLayout.tsx` | App shell |
| `src/db/index.ts` | Storage abstraction |
| `src/formats/index.ts` | Format registry |
| `vite.config.ts` | Build config |
| `ARCHITECTURE.md` | Detailed architecture (cursor position, undo fix) |

---

## 14. Getting Started

### First Time Setup
```bash
npm install
npm run dev          # Start dev server
```

### Understanding the Flow
1. Read this document
2. Review `ARCHITECTURE.md` (deep dive on content & cursor)
3. Trace: User types → `EditorInstance` → `ModelManager` → `tabsStore` → `persistenceStore`
4. Check `modelManager.ts` (it's the heart of the system)

### Making Your First Change
1. Add a console.log in `ModelManager.handleLanguageDetection()`
2. Type in the editor → See it log
3. Explore ModelManager API to understand content flow

---

## 15. Resources

- **React:** https://react.dev
- **Zustand:** https://zustand-demo.vercel.app
- **Monaco Editor:** https://microsoft.github.io/monaco-editor/
- **Vite:** https://vitejs.dev
- **Dexie (IndexedDB):** https://dexie.org
- **TipTap (Rich Text):** https://tiptap.dev

---

**Last Updated:** 2025-10-16
**Version:** 0.1.0
