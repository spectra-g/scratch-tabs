# Pipeline Architecture & Implementation Plan

**Created:** 2026-01-16
**Last Updated:** 2026-01-17
**Status:** In Progress (Phases 1 & 3 Complete, Phase 2 Partial)
**Goal:** Replace BatchTools with a modular, extensible Pipeline system comparable to CyberChef

---

## Quick Status Summary

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Core engine, registry, runner, Web Worker support |
| Phase 2 | 🔄 Partial (15/30) | 15 operations migrated, unit tested |
| Phase 3 | ✅ Complete | 3-panel UI, IndexedDB persistence, save/load |
| Phase 4 | 🔄 Started | Context menu entry added, more operations needed |
| Phase 5 | ⏳ Future | Variable interpolation (types designed, not implemented) |

**Outstanding Work:**
- Migrate remaining ~15 BatchTools operations (see Section 9)
- Extract operations from tablets (checksum, jwt, uuid, datetime)
- Add "Run Last Pipeline" quick action
- Delete legacy BatchTools folder after full migration

---

## 1. Overview

### What We're Building

A **Data Processing Pipeline** system that allows users to:
- Chain multiple operations (e.g., Trim → Uppercase → Base64 Encode → JSON Format)
- Reorder operations via drag-and-drop
- Enable/disable individual steps
- Save and load named pipelines
- Apply saved pipelines to content via context menu

### Key Differentiators vs CyberChef

- **Variable interpolation** (future): Support `${varName}` syntax in parameters
- **Integration with Scratch Tabs**: Pipelines work with tabs, formats, and tablets
- **Persistent pipelines**: Save to IndexedDB, available across sessions

### Architectural Principles

1. **Pipeline engine is format/tablet agnostic** - `src/services/pipeline/` never imports from `src/formats/*` or `src/tablets/*`
2. **Self-registration pattern** - Formats and tablets register their operations to a global registry
3. **Variable interpolation designed in from the start** - Types support it even if implementation is deferred
4. **Multi-category support** - Operations can appear in multiple categories

---

## 2. Database Schema

### IndexedDB Tables

**Table: `pipelines`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID (primary key) |
| `name` | string \| null | Optional name (null = unnamed/temp) |
| `description` | string \| undefined | Optional description |
| `steps` | string | JSON serialized `PipelineStep[]` |
| `createdAt` | number | Timestamp |
| `lastModified` | number | Timestamp |
| `lastUsedAt` | number | For "recently used" sorting |
| `isFavorite` | boolean | Pin to top of list |

**Table: `pipelineSettings`**

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Setting key (primary key) |
| `value` | string | JSON value |

**Dexie Schema:**
```typescript
pipelines: '++id, name, lastUsedAt, lastModified, isFavorite',
pipelineSettings: 'key'
```

---

## 3. Type Definitions

### Core Types

```typescript
// src/services/pipeline/types.ts

/**
 * Parameter definition for an operation
 */
export interface ParameterDefinition {
  name: string;                          // Parameter key
  label: string;                         // Display label
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  default?: any;                         // Default value
  options?: { value: string; label: string }[];  // For select/multiselect
  placeholder?: string;                  // Input placeholder
  description?: string;                  // Help text
  required?: boolean;
  supportsInterpolation?: boolean;       // Can use ${var} syntax (future)
}

/**
 * Operation definition - registered by formats/tablets
 */
export interface OperationDefinition {
  id: string;                            // Unique: 'json.format', 'base64.encode'
  name: string;                          // Display: 'Format JSON'
  description: string;                   // Help text
  categories: string[];                  // ['JSON', 'Formatting'] - can be multiple!
  parameters: ParameterDefinition[];
  execute: (input: string, params: Record<string, any>, context: ExecutionContext) => string | Promise<string>;
  keywords?: string[];                   // For search
  icon?: string;                         // Lucide icon name
  source?: 'core' | 'format' | 'tablet'; // Where it came from
}

/**
 * Execution context - passed to every operation
 */
export interface ExecutionContext {
  stepIndex: number;
  totalSteps: number;
  variables: Map<string, string>;
  getVariable: (name: string) => string | undefined;
  setVariable: (name: string, value: string) => void;
  _input: string;                        // Original pipeline input
  _previousOutput: string;               // Output from previous step
  _stepIndex: number;
}

/**
 * A step in a pipeline
 */
export interface PipelineStep {
  id: string;                            // UUID for this step instance
  operationId: string;                   // References OperationDefinition.id
  params: Record<string, any>;           // User-configured parameter values
  enabled: boolean;                      // Toggle on/off
  assignTo?: string;                     // Save output to variable name (future)
}

/**
 * Pipeline definition
 */
export interface Pipeline {
  id: string;
  name: string | null;
  description?: string;
  steps: PipelineStep[];
}

/**
 * Result of running a pipeline
 */
export interface PipelineResult {
  success: boolean;
  output: string;
  error?: string;
  stepResults: StepResult[];
  totalDuration: number;
  variables: Record<string, string>;
}

export interface StepResult {
  stepId: string;
  operationId: string;
  input: string;
  output: string;
  duration: number;
  skipped: boolean;
  error?: string;
}

/**
 * Category for organizing operations
 */
export interface OperationCategory {
  id: string;
  name: string;
  icon?: string;
  order: number;
}
```

---

## 4. Architecture

### Directory Structure

```
src/services/pipeline/
├── types.ts                    # ✅ All type definitions
├── OperationRegistry.ts        # ✅ Singleton registry with subscribe()
├── PipelineRunner.ts           # ✅ Execution engine + Web Worker support
├── WorkerRunner.ts             # ✅ Main thread wrapper for worker communication
├── pipelineWorker.ts           # ✅ Web Worker with operation registry copy
├── categories.ts               # ✅ Core category definitions
├── pipelineStorage.ts          # ✅ IndexedDB CRUD operations
├── loadOperations.ts           # ✅ Aggregates and registers all operations
├── index.ts                    # ✅ Public exports
└── operations/                 # ⏳ FUTURE: Core operations (currently in BatchTools)
    ├── text.ts                 # TODO: Trim, case, whitespace
    ├── lines.ts                # TODO: Sort, reverse, filter, dedupe
    ├── redaction.ts            # TODO: Sensitive data masking
    └── regex.ts                # TODO: Find/replace

src/formats/json/
├── index.ts                    # Existing format module
├── operations.ts               # ✅ JSON pipeline operations (self-registers)
└── ...

src/tablets/base64/
├── Base64Tablet.tsx            # Existing tablet component
├── operations.ts               # ✅ Base64 pipeline operations (self-registers)
└── ...

src/components/Pipeline/
├── PipelineEditorModal.tsx     # ✅ Main container (3-panel layout)
├── OperationPalette.tsx        # ✅ Left panel (categories accordion)
├── PipelineCanvas.tsx          # ✅ Middle panel (sortable steps)
├── StepCard.tsx                # ✅ Individual step with params
├── PipelinePreview.tsx         # ✅ Right panel (input/output stacked)
├── PipelineToolbar.tsx         # ✅ (merged into PipelineEditorModal header)
└── index.ts                    # ✅ Exports

src/components/BatchTools/
├── pipelineOperations.ts       # ✅ Migrated operations (15 of ~30)
├── __tests__/
│   └── pipelineOperations.test.ts  # ✅ 39 unit tests
└── transformations.ts          # ⏠LEGACY - remaining operations to port
```

### Self-Registration Pattern

**How formats register operations:**

```typescript
// src/formats/json/operations.ts
import { operationRegistry } from '../../services/pipeline/OperationRegistry';

const jsonOperations = [
  {
    id: 'json.format',
    name: 'Format JSON',
    categories: ['JSON', 'Formatting'],  // Multiple categories!
    // ...
  }
];

// Self-register on module load
jsonOperations.forEach(op => operationRegistry.register(op));
```

**Integration in format's index.ts:**
```typescript
// src/formats/json/index.ts
import './operations'; // Triggers self-registration
```

**How tablets register operations:**

```typescript
// src/tablets/base64/operations.ts
import { operationRegistry } from '../../services/pipeline/OperationRegistry';
import { encodeBase64, decodeBase64 } from './utils/base64Utils';

const base64Operations = [
  {
    id: 'base64.encode',
    name: 'Base64 Encode',
    categories: ['Encoding', 'Base64'],
    execute: (input, params) => encodeBase64(input, params.format, params.encoding),
    // ...
  }
];

base64Operations.forEach(op => operationRegistry.register(op));
```

---

## 5. UI Layout (3-Panel)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Pipeline Editor                    [Load ▼] [Save] [Save As...]  [✕ Close] │
├──────────────────┬──────────────────────────┬───────────────────────────────┤
│  Operations      │  Pipeline Steps          │  Input                        │
│  ────────────    │  ─────────────           │  ─────                        │
│  🔍 Search...    │                          │  ┌───────────────────────────┐│
│                  │  ┌──────────────────┐    │  │ (Monaco editor or         ││
│  ▼ Text          │  │ 1. Trim          │←───┤  │  textarea for input)      ││
│    Trim          │  │    Whitespace    │drag│  │                           ││
│    Uppercase     │  │    [✓] [⚙] [✕]  │    │  │                           ││
│    Lowercase     │  └──────────────────┘    │  └───────────────────────────┘│
│    ...           │           ↓              │                               │
│                  │  ┌──────────────────┐    │  Output                       │
│  ▼ JSON          │  │ 2. Base64 Encode │    │  ──────                       │
│    Format        │  │    Format: std   │    │  ┌───────────────────────────┐│
│    Minify        │  │    [✓] [⚙] [✕]  │    │  │ (Read-only output         ││
│    Sort Keys     │  └──────────────────┘    │  │  with diff highlighting)  ││
│    ...           │           ↓              │  │                           ││
│                  │  ┌──────────────────┐    │  │                           ││
│  ▼ Encoding      │  │ 3. JSON Format   │    │  └───────────────────────────┘│
│    Base64 Enc    │  │    Indent: 2     │    │                               │
│    Base64 Dec    │  │    [✓] [⚙] [✕]  │    │  Stats: 1,234 → 2,567 chars  │
│    URL Encode    │  └──────────────────┘    │  Duration: 12ms               │
│    ...           │                          │                               │
│                  │  [+ Add Step]            │                               │
├──────────────────┴──────────────────────────┴───────────────────────────────┤
│                                                      [Cancel]  [Apply]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step Controls

- `[✓]` - Enable/disable toggle
- `[⚙]` - Expand/collapse parameter configuration
- `[✕]` - Remove step
- Drag handle for reordering

---

## 6. Execution Model

```
Input String
    ↓
┌───────────────────┐
│ Step 1: Trim      │ → params: {}
└───────────────────┘
    ↓ (output becomes input)
┌───────────────────┐
│ Step 2: Uppercase │ → params: {}
└───────────────────┘
    ↓
┌───────────────────┐
│ Step 3: Base64    │ → params: { format: 'standard' }
│ (disabled)        │ → SKIP
└───────────────────┘
    ↓
┌───────────────────┐
│ Step 4: JSON      │ → params: { indent: 2 }
│ Format            │
└───────────────────┘
    ↓
Output String
```

Each step: `output = operation.execute(previousOutput, params, context)`

### Future: Variable Interpolation

```
Input: "hello world"
    ↓
Step 1: Uppercase → output: "HELLO WORLD"
         assignTo: "upper"
    ↓
Step 2: Snake Case → output: "hello_world"
         assignTo: "snake"
    ↓
Step 3: Template
         template: "private static final String ${upper} = \"${snake}\";"
    ↓
Output: "private static final String HELLO WORLD = "hello_world";"
```

---

## 7. Implementation Phases

### Phase 1: Core Engine & Registry (Proof of Concept)

**Goal:** Build the registry, runner, and prove the pattern works with ONE format and ONE tablet.

**Files created:**
1. ✅ `src/services/pipeline/types.ts` - All type definitions
2. ✅ `src/services/pipeline/OperationRegistry.ts` - Singleton registry with subscribe()
3. ✅ `src/services/pipeline/PipelineRunner.ts` - Execution engine + async worker support
4. ✅ `src/services/pipeline/WorkerRunner.ts` - Web Worker wrapper
5. ✅ `src/services/pipeline/pipelineWorker.ts` - Worker with operation registry
6. ✅ `src/services/pipeline/categories.ts` - Core categories
7. ✅ `src/services/pipeline/loadOperations.ts` - Operation aggregation
8. ✅ `src/services/pipeline/index.ts` - Public exports
9. ✅ `src/formats/json/operations.ts` - JSON operations (proof of concept)
10. ✅ `src/tablets/base64/operations.ts` - Base64 operations (proof of concept)

**Verification:**
- ✅ Registry accepts registrations from different sources
- ✅ Operations appear in correct categories (multi-category support works)
- ✅ PipelineRunner executes steps in order
- ✅ JSON format → Base64 encode pipeline works end-to-end
- ✅ Web Worker execution with true timeout support

**Status:** ✅ Complete

---

### Phase 2: Core Operations Migration

**Goal:** Port all BatchTools transformations as core operations.

**Current location:** `src/components/BatchTools/pipelineOperations.ts`
(Note: Operations are temporarily in BatchTools folder. Move to `src/services/pipeline/operations/` when complete.)

**Migrated operations (15):**
| Operation | ID | Status |
|-----------|-----|--------|
| Trim | `batch.trim` | ✅ |
| Uppercase | `batch.uppercase` | ✅ |
| Lowercase | `batch.lowercase` | ✅ |
| Title Case | `batch.titlecase` | ✅ |
| Remove Extra Whitespace | `batch.remove-extra-whitespace` | ✅ |
| Remove Blank Lines | `batch.remove-blank-lines` | ✅ |
| Sort Lines (Asc) | `batch.sort-lines-asc` | ✅ |
| Sort Lines (Desc) | `batch.sort-lines-desc` | ✅ |
| Reverse Lines | `batch.reverse-lines` | ✅ |
| Remove Duplicates | `batch.remove-duplicates` | ✅ |
| Add Line Numbers | `batch.add-line-numbers` | ✅ |
| Add Prefix | `batch.add-prefix` | ✅ |
| Add Suffix | `batch.add-suffix` | ✅ |
| Find and Replace | `batch.find-replace` | ✅ |
| Wrap Lines | `batch.wrap-lines` | ✅ |

**Remaining operations (~15):**
- Sentence Case, camelCase, PascalCase, kebab-case, snake_case, SCREAMING_SNAKE
- Shuffle Lines, Join Lines, Split Lines
- Filter by Regex, Filter by Keyword, Keep First N, Keep Last N
- Pad Lines, Change Indentation, Convert Tabs/Spaces
- Normalize Line Endings, Redaction, JavaScript Snippet

**Unit tests:** ✅ `src/components/BatchTools/__tests__/pipelineOperations.test.ts` (39 tests)

**Status:** 🔄 Partial (15 of ~30 operations)

---

### Phase 3: UI Implementation

**Goal:** Build the 3-panel UI.

**Components created:**
- ✅ `src/components/Pipeline/PipelineEditorModal.tsx` - Main container (3-panel layout)
- ✅ `src/components/Pipeline/OperationPalette.tsx` - Left panel (accordion categories, search)
- ✅ `src/components/Pipeline/PipelineCanvas.tsx` - Middle panel (sortable steps, auto-expand)
- ✅ `src/components/Pipeline/StepCard.tsx` - Individual step with params (expand/collapse)
- ✅ `src/components/Pipeline/PipelinePreview.tsx` - Right panel (input/output stacked)
- ✅ `src/components/Pipeline/index.ts` - Exports

**Database integration:**
- ✅ `pipelines` and `pipelineSettings` tables added to Dexie schema
- ✅ `src/services/pipeline/pipelineStorage.ts` - CRUD operations (savePipeline, getAllPipelines, deletePipeline, toPipeline)

**UI Features:**
- ✅ Drag-and-drop step reordering (dnd-kit)
- ✅ Enable/disable individual steps
- ✅ Save named pipelines (inline dropdown, not browser prompt)
- ✅ Load saved pipelines (dropdown with delete option)
- ✅ Click-outside closes dropdowns
- ✅ Real-time preview (debounced 150ms)
- ✅ Auto-expand steps with parameters when added
- ✅ Custom scrollbar styling
- ✅ Execution stats (duration, character counts)

**Status:** ✅ Complete

---

### Phase 4: Full Operations & Polish

**Goal:** Migrate remaining operations, integrate with editor.

**Completed tasks:**
- ✅ Add "Pipeline" to editor context menu (right-click → Tools → Pipeline)
- ✅ `usePipelineStore` hook for opening pipeline editor

**Remaining tasks:**
- ⏳ Extract operations from remaining tablets (checksum, jwt, uuid, datetime)
- ⏳ Migrate remaining ~15 BatchTools operations (see Phase 2)
- ⏳ Add "Run Last Pipeline" quick action
- ⏳ Move operations from `BatchTools/pipelineOperations.ts` to `services/pipeline/operations/`
- ⏳ Delete `src/components/BatchTools/` folder (after full migration)
- ⏳ Delete `src/stores/batchToolsStore.ts`

**Status:** 🔄 Started

---

### Phase 5: Variable Interpolation (Future)

**Goal:** Implement the variable system.

**Tasks:**
- Implement `Interpolator` class for `${var}` syntax resolution
- Add `assignTo` field to step UI
- Add "Context Viewer" panel for debugging variables
- Update documentation

**Status:** ⏳ Planned (Future)

---

## 8. Core Categories

| ID | Name | Icon | Order |
|----|------|------|-------|
| `text` | Text Processing | Type | 1 |
| `lines` | Line Operations | List | 2 |
| `sorting` | Sorting | ArrowDownAZ | 3 |
| `formatting` | Formatting | AlignLeft | 4 |
| `encoding` | Encoding | Binary | 5 |
| `json` | JSON | Braces | 6 |
| `filtering` | Filtering | Filter | 7 |
| `redaction` | Redaction | EyeOff | 8 |
| `advanced` | Advanced | Code | 99 |

---

## 9. Operations Inventory

### From BatchTools (to become Core Operations)

| Operation | Category | Parameters |
|-----------|----------|------------|
| Trim | Text | - |
| Remove Extra Whitespace | Text | mode: preserve-single \| remove-all |
| Remove Blank Lines | Lines | mode: extra \| all |
| Uppercase | Text | - |
| Lowercase | Text | - |
| Title Case | Text | - |
| Sentence Case | Text | - |
| camelCase | Text | - |
| PascalCase | Text | - |
| kebab-case | Text | - |
| snake_case | Text | - |
| SCREAMING_SNAKE | Text | - |
| Sort Lines | Sorting | mode: asc \| desc \| natural \| numeric \| length |
| Reverse Lines | Lines | - |
| Remove Duplicates | Lines | - |
| Shuffle Lines | Lines | - |
| Add Prefix | Text | prefix: string |
| Add Suffix | Text | suffix: string |
| Number Lines | Lines | style: numeric \| roman \| alpha |
| Join Lines | Lines | separator: string |
| Split Lines | Lines | delimiter: string |
| Filter by Regex | Filtering | pattern, caseSensitive |
| Filter by Keyword | Filtering | keyword, action, position |
| Keep First N | Filtering | count: number |
| Keep Last N | Filtering | count: number |
| Duplicate Lines | Lines | count: number |
| Pad Lines | Text | length, align, char |
| Change Indentation | Text | action, amount, type |
| Wrap Lines | Text | width: number |
| Convert Tabs/Spaces | Text | mode |
| Normalize Line Endings | Text | style: lf \| crlf |
| Redaction | Redaction | patterns, mode, customPatterns |
| Regex Find/Replace | Advanced | find, replace, flags |
| JavaScript Snippet | Advanced | code: string |

### From JSON Format

| Operation | Category | Parameters |
|-----------|----------|------------|
| Format JSON | JSON, Formatting | indent: number |
| Minify JSON | JSON, Formatting | - |
| Sort JSON Keys | JSON, Sorting | - |
| Flatten JSON | JSON | - |
| Unflatten JSON | JSON | - |
| Remove Empty Values | JSON | - |
| Remove Comments | JSON | - |
| Stringify JSON | JSON | - |
| Unstringify JSON | JSON | - |

### From Tablets

| Tablet | Operations | Category |
|--------|------------|----------|
| Base64 | Encode, Decode | Encoding |
| Checksum | MD5, SHA1, SHA256, SHA512 | Encoding |
| JWT | Decode Header, Decode Payload | Encoding |
| UUID | Generate v1, v4, v5 | Utilities |
| URL | Encode, Decode, Parse | Encoding |
| DateTime | Parse, Format, Convert TZ | Utilities |

---

## 10. Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Chunk load errors | Reuse existing `handleChunkLoadError()` from `chunkLoadUtils.ts` |
| Large content | Add input size check before running (warn if > 1MB) |
| Infinite loops | Linear-only execution, no jumps, max 50 steps limit |
| Slow operations | Add timeout per step (5s default), show progress indicator |
| Undo break | Apply final result via Monaco's edit API (preserves undo stack) |
| Variable collisions | Reserve `_` prefix for system variables (`_input`, `_index`) |

---

## 11. Web Worker Architecture

### Overview

Pipeline execution runs in a dedicated Web Worker to prevent UI blocking. This provides:

- **Non-blocking execution**: UI remains responsive during heavy operations
- **True timeout support**: Workers can be terminated via `worker.terminate()`
- **Large file handling**: Can process 100MB+ files without freezing browser

### Implementation

**Files:**
- `src/services/pipeline/pipelineWorker.ts` - Worker code with operation registry
- `src/services/pipeline/WorkerRunner.ts` - Main thread wrapper for worker communication

**Usage:**
```typescript
import { runPipelineAsync } from '@/services/pipeline';

// Runs in Web Worker with 30s timeout (falls back to main thread if needed)
const result = await runPipelineAsync(input, pipeline, {
  timeout: 30000,
  onProgress: (step, total) => console.log(`Step ${step}/${total}`),
});
```

**Timeout Behavior:**
- If an operation exceeds the timeout, the worker is terminated
- A new worker is automatically created for subsequent operations
- Fallback to main thread execution if workers aren't available

### Fallback Strategy

The system automatically falls back to main thread execution when:
- Web Workers aren't supported (older browsers, SSR)
- Worker creation fails
- Worker throws an unrecoverable error

---

## 12. Future Enhancements

### Medium Priority

- **Pipeline templates**: Pre-built pipelines for common tasks
- **Import/Export**: Share pipelines as JSON files
- **Keyboard shortcuts**: Quick access to recent pipelines
- **Operation preview**: Show sample input/output in palette

### Lower Priority

- **Conditional steps**: Skip steps based on content/variable conditions
- **Looping**: Apply operation to each line/item separately
- **Streaming execution**: Process large files in chunks

---

## 13. Migration from BatchTools

When Phase 4 is complete:

1. Remove menu item pointing to BatchTools
2. Update all references to use Pipeline instead
3. Delete `src/components/BatchTools/` folder
4. Delete `src/stores/batchToolsStore.ts`
5. Update documentation

---

## Appendix: Key Files Reference

### Pipeline Core (src/services/pipeline/)

| File | Purpose | Status |
|------|---------|--------|
| `types.ts` | All type definitions | ✅ |
| `OperationRegistry.ts` | Singleton registry with subscribe() | ✅ |
| `pipelineExecutor.ts` | Pure execution logic (testable without browser) | ✅ |
| `PipelineRunner.ts` | Main thread API, delegates to executor | ✅ |
| `WorkerRunner.ts` | Web Worker wrapper (main thread) | ✅ |
| `pipelineWorker.ts` | Web Worker (thin wrapper around executor) | ✅ |
| `categories.ts` | Core category definitions | ✅ |
| `pipelineStorage.ts` | IndexedDB CRUD operations | ✅ |
| `loadOperations.ts` | Aggregates all operation registrations | ✅ |
| `index.ts` | Public exports | ✅ |

### Pipeline UI (src/components/Pipeline/)

| File | Purpose | Status |
|------|---------|--------|
| `PipelineEditorModal.tsx` | Main 3-panel container | ✅ |
| `OperationPalette.tsx` | Left panel - operations by category | ✅ |
| `PipelineCanvas.tsx` | Middle panel - sortable steps | ✅ |
| `StepCard.tsx` | Individual step with parameters | ✅ |
| `PipelinePreview.tsx` | Right panel - input/output | ✅ |
| `index.ts` | Exports | ✅ |

### Operations

| File | Purpose | Status |
|------|---------|--------|
| `src/formats/json/operations.ts` | JSON operations | ✅ |
| `src/tablets/base64/operations.ts` | Base64 encode/decode | ✅ |
| `src/components/BatchTools/pipelineOperations.ts` | Migrated text operations (15) | ✅ |
| `src/components/BatchTools/__tests__/pipelineOperations.test.ts` | Unit tests (39) | ✅ |
| `src/components/BatchTools/transformations.ts` | **LEGACY** - remaining operations to port | ⏳ |

### State Management

| File | Purpose | Status |
|------|---------|--------|
| `src/stores/pipelineStore.ts` | Pipeline editor state (open/close) | ✅ |

### Integration Points

| File | Change Made | Status |
|------|-------------|--------|
| `src/db/index.ts` | Added `pipelines` and `pipelineSettings` tables | ✅ |
| `src/components/Editor/EditorContextMenu.tsx` | Added "Pipeline" menu item | ✅ |
| `src/components/Icons.tsx` | Added `GripVertical` icon | ✅ |

---

## Handover Notes for Next Developer

### To Continue This Work

1. **Remaining operations** - Port the ~15 remaining operations from `transformations.ts` to `pipelineOperations.ts`:
   - Follow the existing pattern in `pipelineOperations.ts`
   - Use `name` for parameter key, `label` for display (not `id`/`name`)
   - Add unit tests to `pipelineOperations.test.ts`

2. **Tablet operations** - Extract from tablets to pipeline:
   - `src/tablets/checksum/` → MD5, SHA1, SHA256, SHA512
   - `src/tablets/jwt/` → Decode header, Decode payload
   - `src/tablets/uuid/` → Generate v1, v4, v5
   - `src/tablets/url/` → Encode, Decode, Parse

3. **Final cleanup** - After all operations migrated:
   - Move `pipelineOperations.ts` to `src/services/pipeline/operations/text.ts`
   - Delete `src/components/BatchTools/` folder
   - Delete `src/stores/batchToolsStore.ts`

### Key Gotchas

1. **Parameter definition format** (critical - got this wrong initially):
   ```typescript
   // CORRECT:
   { name: "prefix", label: "Prefix Text", type: "string", ... }

   // WRONG (will silently fail):
   { id: "prefix", name: "Prefix Text", type: "string", ... }
   ```

2. **Web Worker has its own operation registry** - Operations must be registered in BOTH:
   - Main thread (via `loadOperations.ts`)
   - Worker (via `pipelineWorker.ts` imports)

3. **Vite worker import syntax**:
   ```typescript
   import PipelineWorker from "./pipelineWorker?worker";
   ```

4. **Testing with Jest** - `crypto.randomUUID()` not available, use fallback `generateUUID()`

### How to Test

```bash
# Run unit tests for operations
npm test -- --testPathPattern=pipelineOperations

# Manual testing
1. Open app in browser
2. Right-click in editor → Tools → Pipeline
3. Add operations from left panel
4. Configure parameters (steps auto-expand if they have params)
5. Verify output in right panel
6. Save/load pipelines using header buttons
```

### Architecture Decisions to Preserve

1. **Self-registration pattern** - Pipeline engine never imports from formats/tablets
2. **Web Worker for execution** - Prevents UI blocking on large files
3. **Multi-category support** - Operations can appear in multiple categories
4. **Variable interpolation types** - Already in place, implementation deferred to Phase 5
5. **Executor pattern for testability** - All execution logic is in `pipelineExecutor.ts` (pure functions, no browser APIs). Both `PipelineRunner.ts` (main thread) and `pipelineWorker.ts` (Web Worker) delegate to the executor. This allows 100% unit test coverage of execution logic without needing browser/worker mocks.
