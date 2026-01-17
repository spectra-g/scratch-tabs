# Pipeline Architecture & Implementation Plan

**Created:** 2026-01-16
**Status:** In Progress
**Goal:** Replace BatchTools with a modular, extensible Pipeline system comparable to CyberChef

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
├── types.ts                    # All type definitions
├── OperationRegistry.ts        # Singleton registry
├── PipelineRunner.ts           # Execution engine
├── categories.ts               # Core category definitions
├── pipelineStorage.ts          # IndexedDB CRUD operations
├── index.ts                    # Public exports
└── operations/                 # Core operations (self-register)
    ├── text.ts                 # Trim, case, whitespace
    ├── lines.ts                # Sort, reverse, filter, dedupe
    ├── redaction.ts            # Sensitive data masking
    ├── regex.ts                # Find/replace
    └── index.ts                # Aggregates and registers all

src/formats/[format]/
├── index.ts                    # Existing format module
├── operations.ts               # NEW: Pipeline operations (self-registers)
└── ...

src/tablets/[tablet]/
├── [Name]Tablet.tsx            # Existing tablet component
├── operations.ts               # NEW: Pipeline operations (self-registers)
└── ...

src/components/Pipeline/
├── PipelineEditorModal.tsx     # Main container
├── OperationPalette.tsx        # Left panel (categories accordion)
├── PipelineCanvas.tsx          # Middle panel (sortable steps)
├── StepCard.tsx                # Individual step with params
├── PipelinePreview.tsx         # Right panel (input/output)
├── PipelineToolbar.tsx         # Save/Load/Delete buttons
└── index.ts                    # Exports
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

**Files to create:**
1. `src/services/pipeline/types.ts` - All type definitions
2. `src/services/pipeline/OperationRegistry.ts` - Singleton registry
3. `src/services/pipeline/PipelineRunner.ts` - Execution engine
4. `src/services/pipeline/categories.ts` - Core categories
5. `src/services/pipeline/index.ts` - Public exports
6. `src/formats/json/operations.ts` - JSON operations (proof of concept)
7. `src/tablets/base64/operations.ts` - Base64 operations (proof of concept)

**Verification:**
- Unit test: Registry accepts registrations from different sources
- Unit test: Operations appear in correct categories
- Unit test: PipelineRunner executes steps in order
- Unit test: JSON format → Base64 encode pipeline works end-to-end

**Status:** 🔄 In Progress

---

### Phase 2: Core Operations Migration

**Goal:** Port all BatchTools transformations as core operations.

**Files to create:**
- `src/services/pipeline/operations/text.ts` - Trim, case conversion, whitespace
- `src/services/pipeline/operations/lines.ts` - Sort, reverse, dedupe, filter
- `src/services/pipeline/operations/redaction.ts` - Sensitive data masking
- `src/services/pipeline/operations/regex.ts` - Find/replace, filter by regex
- `src/services/pipeline/operations/index.ts` - Exports and self-registers all

**Each operation must:**
- Have identical output to existing BatchTools
- Be unit tested

**Status:** ⏳ Pending

---

### Phase 3: UI Implementation

**Goal:** Build the 3-panel UI.

**Components:**
- `src/components/Pipeline/PipelineEditorModal.tsx` - Main container
- `src/components/Pipeline/OperationPalette.tsx` - Left panel (accordion categories)
- `src/components/Pipeline/PipelineCanvas.tsx` - Middle panel (sortable steps)
- `src/components/Pipeline/StepCard.tsx` - Individual step with params
- `src/components/Pipeline/PipelinePreview.tsx` - Right panel (input/output)
- `src/components/Pipeline/PipelineToolbar.tsx` - Save/Load/Delete buttons

**Database integration:**
- Add `pipelines` and `pipelineSettings` tables to Dexie schema
- Create `src/services/pipeline/pipelineStorage.ts` for CRUD operations

**Status:** ⏳ Pending

---

### Phase 4: Full Operations & Polish

**Goal:** Migrate remaining operations, integrate with editor.

**Tasks:**
- Extract operations from remaining tablets (checksum, jwt, uuid, etc.)
- Add "Apply Pipeline" to editor context menu
- Add "Run Last Pipeline" quick action
- Delete `src/components/BatchTools/` folder

**Status:** ⏳ Pending

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

## 11. Future Enhancements

- **Pipeline templates**: Pre-built pipelines for common tasks
- **Import/Export**: Share pipelines as JSON files
- **Keyboard shortcuts**: Quick access to recent pipelines
- **Operation preview**: Show sample input/output in palette
- **Conditional steps**: Skip steps based on content/variable conditions
- **Looping**: Apply operation to each line/item separately

---

## 12. Migration from BatchTools

When Phase 4 is complete:

1. Remove menu item pointing to BatchTools
2. Update all references to use Pipeline instead
3. Delete `src/components/BatchTools/` folder
4. Delete `src/stores/batchToolsStore.ts`
5. Update documentation

---

## Appendix: Key Files Reference

| File | Purpose |
|------|---------|
| `src/services/pipeline/types.ts` | All type definitions |
| `src/services/pipeline/OperationRegistry.ts` | Singleton registry |
| `src/services/pipeline/PipelineRunner.ts` | Execution engine |
| `src/components/BatchTools/transformations.ts` | **Legacy** - operations to port |
| `src/formats/json/actions/jsonOperations.ts` | JSON operations (already extracted) |
| `src/tablets/base64/utils/base64Utils.ts` | Base64 logic (to wrap) |
