# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

- App: Scratch Tabs — local-first developer workspace for exploring and transforming text/data formats
- Type: React + TypeScript SPA
- Build tool: Vite
- State: Zustand
- Editor: Monaco
- Storage: IndexedDB (via Dexie)

## Core Commands

```bash
npm install
npm run dev          # starts on http://localhost:5173
npm run build
npm run lint
npm run tsc
npm run test
npm run test:watch
npm run coverage
npm run e2e          # excludes @wip/@bug tags; auto-starts dev server
npm run e2e:full     # all tags; use this when running a specific feature file
```

Run a single feature file:
```bash
npm run e2e:full -- tests/e2e/features/undo.feature
```

Run by tag:
```bash
npm run e2e:full -- --tags @wip
```

Changelog generation:
```bash
cd changelog && npm run generate
```

## Code Map

- `src/components/`: UI and page composition
- `src/stores/`: Zustand stores and root actions
- `src/services/`: business logic and integrations
- `src/formats/`: format detectors and smart views (self-registering)
- `src/tablets/`: standalone utility tools (self-registering)
- `src/features/`: feature-flag-gated functionality
- `src/views/`: full-page view components
- `src/hooks/`: shared React hooks
- `src/workers/`: Web Workers for heavy computation
- `src/db/`: storage layer (Dexie/IndexedDB schema)
- `tests/e2e/`: Playwright/Cucumber tests
- `landing/`: static marketing pages

## Architecture Guardrails

1. Monaco model is the live content source.
   - Use `src/services/modelManager.ts` for model lifecycle/content reads.

2. Zustand tab content is the last-known/saved state.
   - Keep store updates consistent with model changes.

3. Do not add cursor-position React state.
   - Cursor/view state belongs to Monaco and persisted storage paths.

4. Keep inactive workspace content out of active in-memory flows.
   - For cross-workspace views, prefer metadata-only reads unless full content is required.

5. Keep pipeline engine independent.
   - `src/services/pipeline/*` should stay format/tablet agnostic.

## Self-Registration Patterns

**Formats** (`src/formats/`): each format directory exports a module that calls `formatRegistry.register(...)` on import. `src/formats/index.ts` imports every format to trigger registration and exposes `detectFormat` / `isAmbiguousFormat`.

**Tablets** (`src/tablets/`): each tablet registers itself via `src/tablets/registry.ts`. Use `dynamicRegistry.ts` for lazy-loaded tablets.

**Pipeline operations** (`src/services/pipeline/operations/`): each file exports `OperationDefinition` objects and registers them with `OperationRegistry`. Operations are format/tablet agnostic — they receive plain `string` input and return `string` output. The `processingMode` field controls whole-input vs. per-line execution.

## Store Architecture

`rootStore.ts` holds **actions only** (no mirrored state). It coordinates `tabsStore`, `splitViewStore`, `workspaceStore`, etc. For cross-store tab operations (add, remove, move, duplicate) always go through `useRootStore`, not the individual stores directly.

## UI/Theming Rules

- Use semantic theme tokens (`bg-surface`, `text-main`, `border-base`, etc.).
- Avoid hardcoded light/dark color class pairs when semantic tokens exist.
- Preserve existing layout patterns (sidebar + content area, split view behavior).

## Change Expectations

- Keep edits focused and minimal.
- Prefer existing patterns over new abstractions.
- Add/update tests for behavior changes.
- For public-facing text/docs, avoid internal notes or plan-heavy content.

## E2E Testing

Full test run: ~13 minutes. Prefer running a single feature file during development.

The test suite auto-starts a Vite dev server; you do not need to pre-start one. Set `BASE_URL` to skip auto-start:
```bash
BASE_URL=http://localhost:5173 npm run e2e
```

**Stable test contract** — use `data-testid` and ARIA attributes, not CSS classes:
```tsx
// Component
<div data-testid={`tab-${tab.title}`} aria-selected={isActive} />
// Test
page.locator(`[data-testid="tab-${title}"][aria-selected="true"]`)
```

**DOM-based async detection** — never use arbitrary `waitForTimeout`. The app updates hidden DOM indicators after async operations (save, cursor persistence). Use the helpers in `tests/e2e/support/testIndicator.utils.ts`:
```typescript
await waitForSaveIndicator(page);
await waitForCursorIndicator(page);
```

See [E2E README](tests/e2e/README.md) for full action-class architecture and troubleshooting.

## Changelog Style (`changelog/releases.yml`)

- No em dashes — use plain hyphens
- `description` field: 2-3 sentences max; no walls of prose — the individual `changes` entries carry the detail
- `summary` field: one sentence

## Docs Policy

- Keep top-level docs minimal:
  - `README.md`: user-facing project overview
  - `CLAUDE.md`: coding-agent/developer implementation guidance
- Avoid re-introducing plan/status markdown files.
