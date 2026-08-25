# Spin the Wheel Tablet — Implementation Plan

A "Wheel of Names"-style tablet (`spinthewheel`) that must be **better** than Wheel of Names:
colourful spinning wheel, names text field on the right, copy-as-image, shareable URL,
click-to-spin, confetti on result, history, snapshots, and more.

Naming rule: call it **"Spin the Wheel"** everywhere (never "Wheel of Names").

---

## Research Summary (verified against codebase — no need to re-explore)

### Tablet registration (automatic lazy loading)
- Create `src/tablets/spinthewheel/SpinTheWheelTablet.tsx`. The dynamic registry
  (`src/tablets/dynamicRegistry.ts`) auto-discovers via
  `import.meta.glob("./*/*Tablet.tsx")`; directory name = tablet id.
- Tablet object shape (see `src/tablets/wordcount/WordCountTablet.tsx` and
  `src/tablets/qrcode/QRCodeTablet.tsx` as canonical examples):
  ```ts
  interface TabletState { type: string; data: any }
  const SpinTheWheelTablet: Tablet = {
    id: 'spinthewheel', label: 'Spin the Wheel',
    keywords: [...], description: '...',
    createInitialState(payload?: any): TabletState,
    serializeState(state): string,
    deserializeState(json): TabletState,   // defensive: merge defaults like qrcode does
    render(state, onChange): ReactNode,
  };
  ```
- Rendering host: `src/components/Tab/TabletView.tsx` parses `tab.tabletState`, loads
  registry by type, calls `render(state, handleChange)`.

### Metadata entry (required)
- Add an entry to `tabletMetadata` array in `src/tablets/tabletMetadata.ts`.
  This powers the Tool Selector listing AND the tab context-menu "Open in..." submenu
  (`src/components/Tab/OpenInSubmenu.tsx`) via `getActionsForContext`.
- Existing unit-test template: `src/tablets/__tests__/tabletMetadata.test.ts`.

### "Open in" dispatch
- `src/services/tabletActionService.ts` handles actions; for `'new-tab'` it calls
  `createInitialState(payload)` and creates a Tab (`isTablet: true`,
  title = `titleHint || label`). Payload passes through untouched.

### Confetti (100-tabs milestone)
- `canvas-confetti` (^1.9.4) is already a dependency.
- Burst logic lives module-private in
  `src/components/MilestoneCelebration/MilestoneModal.tsx` (`fireConfetti()`, lines ~12–42):
  3s interval, bursts both sides, `{ startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 }`.

### Shareable URLs — IMPORTANT (bridge requirement)
- Tablets may ONLY reach app code through the tablet bridge
  (`src/tablets/bridge/{types,implementation,hook,context}.tsx,index.ts`). The bridge
  currently has NO share API.
- Share logic exists in `src/services/shareService.ts` (singleton):
  - `generateShareUrl(type, content, metadata='full')` → `#/s/v1/{type}/{metadata}/{LZ-compressed}`
  - `parseShareUrl(pathname)`, `canFitInUrl(content, type)` (MAX_URL_LENGTH = 1800),
    `compress/decompress/getMaxContentSize`.
- Inbound links handled by `src/components/Share/ShareURLHandler.tsx`.
- NOTE: `tests/e2e/features/sharing.feature` has a scenario "Cannot share a tablet" —
  we are NOT using the tab Share button; the tablet generates its own URL via the bridge.

### Persistence patterns
- Primary: keep everything inside tablet state (`serializeState`/`deserializeState`) —
  persists automatically with workspace tabs (qrcode history works this way).
- Secondary: direct localStorage for cross-tab-recall lists (emoji tablet pattern,
  e.g. `localStorage.getItem("emoji-tablet-favorites")`).

### Testing patterns
- Unit (Jest, colocated `__tests__/`): metadata/action test template at
  `src/tablets/__tests__/tabletMetadata.test.ts`; tablet-object test at
  `src/tablets/wordcount/__tests__/WordCountTabletActions.test.ts`.
- E2E (Cucumber+Playwright): smoke template in `tests/e2e/features/tablets.feature`
  ("I select X from the tablet selector", etc.). Run single feature:
  `npm run e2e:full -- tests/e2e/features/<file>.feature`.

---

## Step 1 — Core tablet skeleton: state, layout, static wheel rendering

**Goal:** A working tablet tab with the two-pane layout and a correctly rendered
static wheel (no spin yet).

1. Create `src/tablets/spinthewheel/` with:
   - `SpinTheWheelTablet.tsx` — the `Tablet` object export (id `'spinthewheel'`).
   - Define full state model now (even if UI comes later):
     ```ts
     data: {
       entries: { id: string; label: string; color?: string; weight?: number; enabled: boolean }[],
       title: string;
       // placeholders for later steps:
       winnerHistory: ...[]; snapshots: ...[]; settings: {...}
     }
     ```
   - Robust `deserializeState` merging defaults (copy qrcode's approach).
   - `createInitialState(payload?: { content?: string; title?: string })`: split
     payload content into entries (one per line); sensible default entry set when empty.
   - Split UI into components: `components/WheelCanvas.tsx` (canvas-drawn wheel),
     `components/EntriesPanel.tsx` (textarea, one name per line).
2. Layout: wheel left (~60%), entries textarea right, matching Wheel of Names' mental
   model. Two-way binding: editing textarea updates `entries` live.
3. Canvas wheel rendering (`utils/wheelRenderer.ts`, pure functions so they're testable):
   - Draw N slices with a colour palette (define `utils/palette.ts` with a vibrant
     palette + auto-cycling; allow per-entry custom colour later).
   - Labels drawn radially along each slice, auto font-size/shrink for long labels,
     truncate if needed.
   - Handle edge cases: 0 entries → placeholder message; 1 entry; 100+ entries.
   - Crisp rendering on HiDPI (`devicePixelRatio` scaling).
4. Add the metadata entry to `src/tablets/tabletMetadata.ts`
   (label "Spin the Wheel", keywords: wheel, spin, random, picker, names, raffle,
   roulette, lottery, prize, decision). No `getActionsForContext` yet (Step 5).

**Verify:** `npm run dev`, open Tool Selector → Spin the Wheel → renders, textarea edits
update wheel. `npm run tsc && npm run lint` pass.

---

## Step 2 — Spin mechanics, winner selection, confetti ✅ DONE

**Goal:** Click-to-spin with realistic easing, correct weighted-random winner, and the
same confetti celebration used for the 100-tabs milestone.

1. `hooks/useSpin.ts`: spin state machine (idle → spinning → result).
   - Physics: random target rotation = current rotation + 4–7 full turns +
     random offset landing inside winning slice. Animate with
     `easeOutCubic`/`easeOutQuart` over 4–6 s via `requestAnimationFrame`.
   - Winner chosen FIRST via crypto-quality RNG respecting entry `weight`s, then
     animation targets that slice under the pointer. (This is how you guarantee
     visual honesty — never derive winner from where animation happens to stop.)
   - Pointer at 3 o'clock or top — match Wheel of Names convention (top-right).
   - Support cancel/re-spin mid-spin (ignore clicks while spinning).
2. Wire click-on-wheel AND a big "SPIN" button to trigger.
3. Confetti: extract/adapt `fireConfetti()` from
   `src/components/MilestoneCelebration/MilestoneModal.tsx` into a shared helper
   (suggest `src/utils/confetti.ts`, exported, so MilestoneModal can optionally reuse
   it later — do NOT refactor MilestoneModal in this step unless trivial). Fire on
   wheel stop. zIndex ≥ 100 so it shows over the modal.
4. Winner announcement overlay/modal: big winner name, buttons:
   - Remove entry & spin again
   - Spin again (keep entry)
   - Close
5. Sound: optional tick sound during spin via WebAudio oscillator (no asset files);
   mute toggle stored in `data.settings.soundEnabled`. Keep it simple/fail-silent.

**Verify:** spin repeatedly, winners are plausible, confetti fires once per stop,
winner modal works, remove-entry updates textarea + wheel. `npm run tsc && npm run lint`.

> Implemented (SRP split): `utils/spinMath.ts` (pure easing/landing geometry —
> whole-turn fix so landing congruence holds), `utils/winnerSelection.ts`
> (weighted crypto-RNG draw before animation), `hooks/useSpin.ts` (idle→spinning→result
> state machine, rAF + easeOutQuart, tick events, override entries for remove-&-respin),
> `utils/tickSound.ts` (fail-silent WebAudio ticks), shared `src/utils/confetti.ts`
> (MilestoneModal now reuses it), `components/WinnerModal.tsx`, clickable WheelCanvas
> with top pointer, SPIN button + mute toggle. Unit tests for all of the above.

---

## Step 3 — Better-than-Wheel-of-Naames feature set #1: history, snapshots, entries UX ✅ DONE

**Goal:** The differentiating features, persisted in tablet state (pattern 1).

1. **Spin history** (`data.winnerHistory`): append `{ id, label, timestamp }` per spin;
   side panel/tab showing results with count summary ("Alice × 3"); clear-history;
   copy-history-to-clipboard; cap at e.g. 200 entries.
2. **Snapshots** (`data.snapshots`): save named snapshots of the full entries list
   (`{ id, name, createdAt, entries }`), restore/delete snapshot. Lets users keep
   multiple wheels (classrooms, teams, prizes).
3. **Entries panel upgrades**:
   - Shuffle entries, sort A→Z, dedupe, remove-blank-lines buttons.
   - Per-entry enable/disable checkbox (disabled entries stay in list, greyed out of
     wheel) and delete button.
   - Paste-bulk handling already free via textarea; add "one per line" hint.
   - Entry count display ("23 entries").
4. **Settings** (`data.settings`): spin duration slider (fast/normal/slow),
   remove-winner-after-spin toggle, sound on/off, hide-winner-until-click option.
5. All of the above persisted via serializeState; verify survives reload.

**Verify:** create snapshot, mutate entries, restore; history records spins across
reload; toggles persist. `npm run tsc && npm run lint`.

> Implemented (SRP split): `utils/historyModel.ts` (prepend + 200-cap record,
> count summary, clipboard text), `utils/entryOperations.ts` (shuffle/sort/dedupe,
> pure), `utils/snapshotModel.ts` (defensive-copy snapshot creation),
> `utils/settingsModel` folded into `contentModel.ts` (`SPIN_DURATION_PRESETS`,
> strict `coerceSettings` with boolean sanitisation + nearest-preset duration
> clamping; `parseEntriesText(text, previous)` now carries id/color/weight/enabled
> through label matches). UI: tabbed `SidePanel` (Names / History / Wheels /
> Options) hosting `HistoryPanel` (summary chips "Alice × 3", newest-first list,
> clear, copy), `SnapshotsPanel` (named save / restore / delete),
> `EntriesPanel` upgraded with toolbar (shuffle, sort A→Z, dedupe, remove-blank-
> lines) and a list mode with per-entry enable checkbox + delete, active/total
> count. Tablet records winners into history on spin end, honours
> remove-winner-after-spin in the same state update, and gates the winner modal
> behind a Reveal button when hide-winner-until-click is on. Unit tests for all
> models and components (164 tests green).

---

## Step 4 — Copy-as-image + shareable URL via tablet bridge

**Goal:** The two export features.

1. **Copy wheel as image:**
   - Render the wheel canvas to a PNG blob (`canvas.toBlob`) composited onto a
     background card (title + winner if present) using an offscreen canvas.
   - `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])` with
     fallback: download link if ClipboardItem unsupported. Toast feedback
     (match existing toast usage patterns in the app).
2. **Bridge extension (required — tablets can't import app services directly):**
   - Add to `src/tablets/bridge/types.ts`:
     ```ts
     sharing: {
       generateUrl: (type: string, content: string, metadata?: string) => string;
       canFitInUrl: (content: string, type?: string, metadata?: string) => { fits: boolean; ... };
     };
     ```
     implemented in `implementation.ts` by delegating to `shareService`
     (`generateShareUrl` / `canFitInUrl`). Update `__tests__/implementation.test.ts`.
   - In the tablet: build shareable URL containing a JSON payload of entries +
     settings (LZ-compressed by shareService). Show modal with the URL, copy button,
     size warning when `canFitInUrl` fails (offer "copy entries text instead").
3. **Inbound shared links:** extend `src/components/Share/ShareURLHandler.tsx` to
   recognise the spinthewheel payload type and open a new Spin the Wheel tab with
   those entries (route through existing share-open flow; follow how existing types
   are dispatched there). Keep backward compat with existing share routes.
4. Also update the E2E note-check: `sharing.feature`'s "Cannot share a tablet"
   scenario should still pass (tab-level Share stays disabled; our sharing is
   inside the tablet UI).

**Verify:** copy image → paste into a viewer works; generate URL → open in new
browser profile → wheel opens with same entries. `npm run tsc && npm run lint`.

---

## Step 5 — "Open in → Spin the wheel" wiring + polish

**Goal:** Plain-text tabs get "Spin the wheel" in Open in..., plus UX polish.

1. Add `getActionsForContext` to the `spinthewheel` metadata entry:
   - Condition: `context.source === 'editor-tab'` and non-empty content.
   - Action id `"spinthewheel.new-tab-from-content"`, label **"Spin the wheel"**,
     icon: a lucide icon (e.g. `LoaderPinwheel` or similar wheel-ish icon — verify
     what's available in the installed lucide-react version).
   - Dispatch via `tabletActionService.handleAction({ targetTablet: 'spinthewheel',
     action: 'new-tab', payload: { content, title }, source: { tabId, titleHint:
     `${title} (Wheel)`, side } })` — mirror hexviewer/wordcount entries.
2. Polish pass:
   - Empty-state and error states; TabletErrorBoundary compatibility.
   - Responsive/mobile layout (check other tablets' patterns; `bridge.getDeviceInfo()`
     if needed).
   - Theme-token compliance (`bg-surface`, `text-main`, `border-base`) — no hardcoded
     colours outside the wheel palette itself (wheel colours are content, allowed).
   - Keyboard: Space/Enter spins when wheel focused; focus-visible rings.
3. Unit tests:
   - `src/tablets/spinthewheel/__tests__/` — createInitialState payload splitting,
     serialize/deserialize round-trip + corrupt-input fallback, weighted winner
     selection (mock Math.random / seeded), wheelRenderer geometry basics.
   - Metadata action test mirroring `src/tablets/__tests__/tabletMetadata.test.ts`.
4. Run full gates: `npm run lint && npm run tsc && npm run test`.

**Verify:** right-click a plain-text tab → Open in... → "Spin the wheel" creates a
populated wheel tab. All tests green.

---

## Step 6 — E2E tests + changelog + final QA

**Goal:** Ship-ready.

1. E2E scenarios appended to `tests/e2e/features/tablets.feature` (or new
   `spinthewheel.feature` following house style):
   - Smoke: tool selector → tab exists → interface visible.
   - Enter names → wheel reflects count → spin → winner shown (deterministic bits:
     assert overlay appears after spin completes; consider a reduced-duration setting
     injected via tablet state for test speed).
   - Open-in flow from a plain-text tab.
2. Run: `npm run e2e:full -- tests/e2e/features/<new>.feature`; fix flakes.
3. Changelog: follow `changelog/` conventions (`cd changelog && npm run generate` only
   if that's the documented flow for adding entries — read changelog README first).
4. Final full gate: `npm run lint && npm run tsc && npm run test && npm run build`.
5. Manual QA checklist: 2 entries, 1 entry, 500 entries, very long names, unicode/emoji
   names, rapid double-spin clicks, reload persistence, share URL size limit banner.

---

## Future ideas (post-MVP, not scheduled)

- Import entries from other tabs via `bridge.getTabsInWorkspace()/getTabContent()`.
- Multiple saved wheels sidebar (snapshots gallery with mini wheel previews).
- Weighted entries UI (star = more likely).
- Export/import wheel config as JSON file.
- Team/tournament mode (bracket from wheel picks).

## Session protocol

Each step above is sized for one context window. When starting a new session:
1. Read this file.
2. Open the step marked next, plus the Research Summary section.
3. Complete that step only, run its Verify commands, mark progress by checking off
   items here before ending the session.
