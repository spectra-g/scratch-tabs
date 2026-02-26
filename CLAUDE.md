# CLAUDE.md

This file is the single source of truth for coding-agent guidance in this repo.

## Project

- App: Scratch Tabs
- Type: React + TypeScript SPA
- Build tool: Vite
- State: Zustand
- Editor: Monaco
- Storage: IndexedDB

## Core Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run tsc
npm run test
npm run e2e
npm run e2e:full
```

Changelog generation:

```bash
cd changelog && npm run generate
```

## Code Map

- `src/components/`: UI and page composition
- `src/stores/`: Zustand stores and root actions
- `src/services/`: business logic and integrations
- `src/formats/`: format detectors and smart views
- `src/tablets/`: standalone utility tools
- `src/db/`: storage layer
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

## UI/Theming Rules

- Use semantic theme tokens (`bg-surface`, `text-main`, `border-base`, etc.).
- Avoid hardcoded light/dark color class pairs when semantic tokens exist.
- Preserve existing layout patterns (sidebar + content area, split view behavior).

## Change Expectations

- Keep edits focused and minimal.
- Prefer existing patterns over new abstractions.
- Add/update tests for behavior changes.
- For public-facing text/docs, avoid internal notes or plan-heavy content.

## Docs Policy

- Keep top-level docs minimal:
  - `README.md`: user-facing project overview
  - `CLAUDE.md`: coding-agent/developer implementation guidance
- Avoid re-introducing plan/status markdown files.
