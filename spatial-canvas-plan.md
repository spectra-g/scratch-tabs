# Spatial Canvas Implementation Plan

## Summary

Add a desktop-only **Canvas** document type to Scratch Tabs. A Canvas is an infinite spatial workspace for arranging developer-oriented content such as JSON/code blocks, text notes, images, URL preview cards, and video links.

The Canvas will use `@xyflow/react` (React Flow) for its viewport, node positioning, selection, resizing, and optional connections. Shape Snap remains a separate sketching/diagram tablet; this work does not attempt to turn it into the Canvas renderer.

Canvas documents must remain local-first. Scene data and binary assets are persisted in IndexedDB, work offline after creation, participate in workspace lifecycle operations, and do not place large scene or image payloads in the normal `Tab` record, Zustand tab state, or `BroadcastChannel` messages.

## Product Scope

### Initial capabilities

- Create a Canvas as a first-class tab within a workspace.
- Pan and zoom over an effectively unlimited desktop canvas.
- Paste or drop:
  - Images.
  - JSON and other code/text blocks.
  - One or more URLs.
  - Recognized video URLs.
  - Plain text.
- Move, resize, select, multi-select, duplicate, layer, and delete cards.
- Navigate, select, inspect, and open cards without requiring a mouse.
- Use directional spatial navigation to jump to the nearest card with Arrow keys, plus deterministic Tab/Shift+Tab traversal.
- Undo and redo Canvas operations during the current editing session.
- Persist and restore the document, assets, viewport, and presentation settings.
- Open a Canvas in either side of split view.
- Send supported Scratch Tabs content into a new or existing Canvas.
- Include Canvas content in tab close protection, duplication, workspace moves, deletion, search, and workspace import/export.
- Display an explicit locally-saved/offline state.

### Non-goals for this work

- Mobile or touch-first editing. On narrow/mobile layouts, show a clear desktop-only notice instead of a broken editor.
- Real-time multi-user collaboration or CRDT-based merging.
- Freehand drawing, handwriting, or full Miro/Excalidraw parity.
- Replacing Shape Snap or the Mermaid Diagram tablet.
- Arbitrary iframe HTML supplied by users.
- Automatically loading third-party embeds when a Canvas opens.
- Storing undo history permanently.

## Architectural Decisions

### 1. Canvas is a document type, not a Smart View or tablet

Smart Views are representations of textual tab content. Tablets are utilities that serialize their complete state into `tabletState`. A Canvas is long-lived user content with a separate scene, binary assets, lifecycle, and search/export behavior.

Add an explicit content discriminator while preserving backwards compatibility:

```ts
export type TabContentKind = "text" | "rich-text" | "tablet" | "canvas";

export interface Tab {
  // Existing properties remain during migration.
  contentKind?: TabContentKind;
  documentId?: string;
}
```

Introduce `getTabContentKind(tab)` as the only compatibility boundary:

- `contentKind` wins when present.
- Otherwise `isRich` maps to `rich-text`.
- Otherwise `isTablet` maps to `tablet`.
- Everything else maps to `text`.

All new branching added by this feature must use `getTabContentKind`. Existing boolean checks can be migrated incrementally rather than rewriting the complete application in the first change.

New Canvas tabs use:

```ts
{
  contentKind: "canvas",
  documentId: tabId,
  content: "",
  language: "plaintext",
  languageLocked: true,
}
```

### 2. React Flow is a rendering and interaction layer

Add `@xyflow/react` and lazy-load the complete Canvas feature so the normal editor bundle is unaffected.

Do not persist raw React components or renderer-only state. Define a Scratch Tabs-owned Canvas schema and map it to React Flow nodes and edges. This keeps migrations under application control and avoids coupling IndexedDB/export formats to transient UI details.

### 3. Binary assets are separate Blob records

Pasted images must not be converted to base64 and embedded in a `Tab`, node, or scene JSON. Store the original or processed bytes as IndexedDB `Blob` records and reference them by asset ID.

Object URLs are created only while the asset is rendered and are revoked when no longer needed.

### 4. Only active Canvas documents are held in memory

Create a `CanvasDocumentManager`, analogous in responsibility to `modelManager`, keyed by tab ID. It loads a document when a Canvas renderer mounts, supports two simultaneously active canvases in split view, debounces saves, flushes pending writes, and disposes sessions on unmount/workspace switch.

Inactive workspaces continue to use metadata-only flows. Canvas scenes and asset blobs must not be loaded to populate the sidebar.

## Feature Layout

Place the implementation under a single feature directory:

```text
src/features/canvas/
  components/
    CanvasView.tsx
    CanvasToolbar.tsx
    CanvasStatusItems.tsx
    CanvasContextMenu.tsx
    DesktopOnlyCanvasNotice.tsx
    nodes/
      TextNode.tsx
      CodeNode.tsx
      ImageNode.tsx
      LinkNode.tsx
      VideoNode.tsx
      FrameNode.tsx
  hooks/
    useCanvasDocument.ts
    useCanvasClipboard.ts
    useCanvasDrop.ts
    useCanvasKeyboardShortcuts.ts
    useSpatialNavigation.ts
  services/
    CanvasDocumentManager.ts
    CanvasDocumentRepository.ts
    CanvasAssetRepository.ts
    CanvasIngestService.ts
    CanvasSearchIndexer.ts
    UrlMetadataService.ts
  utils/
    canvasCoordinates.ts
    canvasItemFactory.ts
    canvasMigrations.ts
    clipboardClassification.ts
    videoUrl.ts
  types.ts
  constants.ts
  index.ts
```

Keep card-specific rendering in `nodes/` and persistence/classification out of React components.

## Domain Model

Use a versioned, discriminated item model with common spatial fields:

```ts
interface CanvasDocument {
  id: string;
  tabId: string;
  workspaceId: string;
  schemaVersion: number;
  revision: number;
  items: CanvasItem[];
  edges: CanvasEdge[];
  settings: CanvasSettings;
  searchText: string;
  createdAt: number;
  updatedAt: number;
}

interface CanvasItemBase {
  id: string;
  type: CanvasItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
  createdAt: number;
  updatedAt: number;
}

type CanvasItem =
  | CanvasTextItem
  | CanvasCodeItem
  | CanvasImageItem
  | CanvasLinkItem
  | CanvasVideoItem
  | CanvasFrameItem;
```

Item-specific data:

- `text`: plain text, optional note color.
- `code`: source text, detected/locked language, collapsed state, wrapping preference.
- `image`: `assetId`, alt text, object-fit/crop presentation.
- `link`: canonical URL plus an optional cached metadata snapshot.
- `video`: canonical URL, allowlisted provider, provider-specific video ID, optional thumbnail asset.
- `frame`: title and presentation color; item containment can be added after basic cards are stable.

Store edges separately. Connections are optional in the initial UI, but defining the collection now prevents a breaking document-format change later.

Do not persist selection, hover, open menus, active resize state, or undo history in the document.

## IndexedDB Schema

Add a new Dexie version with:

```ts
interface CanvasDocumentRecord extends CanvasDocument {}

interface CanvasAssetRecord {
  id: string;
  workspaceId: string;
  blob: Blob;
  mimeType: string;
  originalName?: string;
  byteLength: number;
  width?: number;
  height?: number;
  sha256?: string;
  createdAt: number;
}

interface CanvasSessionRecord {
  tabId: string;
  viewport: { x: number; y: number; zoom: number };
  lastTool: string;
  updatedAt: number;
}
```

Suggested indexes:

```ts
canvasDocuments: "id, tabId, workspaceId, updatedAt"
canvasAssets: "id, workspaceId, sha256, createdAt"
canvasSessions: "tabId, updatedAt"
```

Persistence rules:

- Create the empty Canvas document before activating its tab.
- Keep one current scene snapshot per Canvas document.
- Debounce scene writes after changes, initially 500 ms trailing.
- Flush immediately before workspace switching, tab disposal, import/export, and page hiding where possible.
- Increment `revision` on every successful document save.
- Throttle updates to the parent tab's `lastModified`; do not copy the scene into the tab.
- Save viewport/session changes separately and less frequently than document changes.
- Use transactions when creating/removing a document and its tab metadata.
- Within a workspace, duplicated Canvas documents may reference the same immutable assets.
- Moving a Canvas between workspaces copies referenced assets and remaps asset IDs so workspace export/deletion remains self-contained.
- Deleting a Canvas or workspace runs reference-based asset garbage collection after the document transaction completes.
- Hashing for deduplication is optional for small assets and should run off the critical paste path.

Add storage quota handling:

- Inspect `navigator.storage.estimate()` before accepting unusually large files.
- Define configurable maximum image bytes and decoded dimensions.
- Present a visible error when an asset cannot be persisted; never leave a card that only works until reload.

## Document Lifecycle Integration

Extend the existing renderer configuration with a lazy Canvas renderer before rich-text/tablet/text fallbacks.

Add Canvas-aware lifecycle operations for:

- `hasContent`: true when a document contains at least one persisted item.
- Close confirmation.
- Duplicate tab/document.
- Delete tab/document/assets.
- Move between workspaces.
- Pin and reorder behavior using existing tab metadata.
- Split/unsplit behavior using the existing split view stores.
- Workspace switch: call `canvasDocumentManager.flushAll()` before loading another workspace.
- Cross-window sync: broadcast `{ tabId, documentId, revision }`, never a scene or Blob.

For simultaneous editing of the same Canvas in two browser windows, use optimistic revision checks. If the stored revision changed since load, stop the save and show a conflict notice with reload/take-over actions. Last-write-wins without detection is not acceptable.

Over time, centralize content-type behavior behind a small document adapter interface:

```ts
interface TabDocumentAdapter {
  hasContent(tab: Tab): Promise<boolean>;
  duplicate(tab: Tab, targetWorkspaceId: string): Promise<Tab>;
  remove(tab: Tab): Promise<void>;
  getSearchText(tab: Tab): Promise<string>;
  export(tab: Tab): Promise<DocumentExportEntry>;
}
```

Canvas should implement this interface first; other tab kinds can migrate later.

## Clipboard and Drop Ingestion

`CanvasIngestService` receives normalized clipboard/drop inputs and returns new domain items plus any required persisted assets.

Classification order:

1. Clipboard/drop image files.
2. Files whose contents can be opened as JSON/code/text cards.
3. Text that parses as complete JSON.
4. One or more standalone URLs.
5. Recognized video URLs.
6. Other text, using existing format detection to choose code versus plain text.

Placement rules:

- Use the last pointer position in Canvas coordinates.
- Fall back to the current viewport center.
- Cascade or grid multiple pasted items with a consistent gap.
- Keep new items fully reachable at the current zoom.
- Select all newly inserted items after a successful operation.

Image ingestion sequence:

1. Validate MIME type and configured limits.
2. Decode dimensions off the React render path.
3. Optionally downscale extreme images while preserving the original MIME where practical.
4. Persist the Blob.
5. Add the image item referencing the persisted asset.
6. If document persistence fails, remove the newly created asset.

Canvas paste handlers must be attached to the focused Canvas root. They must not replace the application's clipboard behavior when focus is inside an editable card field.

Canvas drop handlers must stop propagation so the global `DragDropOverlay` does not create separate tabs. Update the global handler to ignore event paths containing a stable marker such as `data-canvas-drop-zone="true"`.

## Card Behavior

### Text card

- Plain editable text.
- Enter editing on double-click or explicit edit action.
- Escape cancels the active edit; Cmd/Ctrl+Enter commits.
- Normal Canvas shortcuts do not fire while editing.

### JSON/code card

- Detect language using the existing format registry.
- Pretty-print JSON at ingestion while retaining the user's source semantically.
- Render escaped text with lightweight syntax highlighting; do not mount Monaco for every visible card.
- Actions: Copy, Format, Collapse/expand, Wrap, and Open in normal Scratch Tab.
- Large content uses preview truncation/virtualization and an explicit “Open in tab” path.

### Image card

- Render from a managed object URL.
- Preserve aspect ratio by default.
- Actions: Open in Image Smart View, download, copy, and replace.
- Missing/corrupt assets render a recoverable placeholder rather than throwing the Canvas.

### Link card

- Always function with only a canonical URL and hostname.
- Cached metadata can add title, description, site name, favicon, and preview-image asset.
- Actions: Open safely in a new tab, copy URL, refresh metadata, and convert to plain text.

### Video card

- Initial state is a lightweight provider card or locally cached thumbnail.
- Do not create an iframe until the user clicks Play.
- Allowlist providers such as YouTube and Vimeo; unknown video-like URLs remain normal link cards.
- Sandboxed iframe configuration must be defined centrally, with restrictive `allow` and `referrerPolicy="no-referrer"` values.
- Stop playback/unmount the iframe when the card leaves play mode or the Canvas unmounts.

## URL Metadata and Privacy

Arbitrary OG metadata cannot be read reliably from the SPA because most sites do not permit cross-origin page reads. URL cards therefore have two levels:

1. **Offline/local baseline:** URL, hostname, deterministic styling, and metadata previously cached in the document.
2. **Optional enriched preview:** fetched through a controlled Scratch Tabs metadata endpoint.

Before enriched previews are implemented, decide where the endpoint will run; the current repository is a static Vite SPA. Do not silently add a third-party metadata service.

Proposed endpoint contract:

```text
GET /api/url-metadata?url=<encoded-http-or-https-url>

{
  "canonicalUrl": "...",
  "title": "...",
  "description": "...",
  "siteName": "...",
  "imageUrl": "...",
  "faviconUrl": "..."
}
```

Endpoint requirements:

- HTTP/HTTPS only.
- Block loopback, link-local, private, metadata-service, and reserved IPv4/IPv6 ranges before every request.
- Revalidate DNS results and every redirect destination.
- Restrict redirect count, body bytes, content type, and total time.
- Never forward browser cookies, authorization, or arbitrary request headers.
- Parse only required metadata; return no raw HTML.
- Sanitize and length-limit every returned field.
- Cache by canonical URL with a bounded lifetime.

Client requirements:

- Metadata fetching is user-initiated by default, or controlled by an explicit privacy setting.
- Show when a network request will be made.
- Save the returned metadata snapshot locally.
- Fetch preview images through the same controlled path or only use remote images in a way that cannot taint exports.
- Failure leaves the baseline URL card intact.

## Canvas UI

### Creation entry points

- Keep the existing `+` button's primary click creating a text tab.
- Add an adjacent dropdown with `Text Tab`, `Canvas`, and existing relevant creation choices.
- Add `New Canvas` to the workspace empty state; use a four-card desktop grid and preserve the existing stacked small-screen layout even though Canvas editing is desktop-only.
- Add a `Documents` category to the Tool Selector instead of listing Canvas as a tablet.
- Support URL creation routes consistently with current formats/tablets, using a stable identifier such as `/canvas`.
- Give Canvas tabs a board/layout icon in the tab bar, sidebar, tooltip, and search results.

### In-Canvas layout

- Floating top or left toolbar:
  - Select.
  - Hand/pan.
  - Text.
  - Code/JSON.
  - Image/file chooser.
  - Link.
  - Video.
  - Frame, once containment is implemented.
- Selection toolbar/context menu:
  - Duplicate.
  - Delete.
  - Bring forward/send backward.
  - Copy/cut.
  - Type-specific actions.
- Bottom-right controls:
  - Zoom in/out.
  - Reset to 100%.
  - Fit selection/content.
  - Optional minimap, default off for small documents.
- App status bar:
  - `Canvas` label.
  - Item/selection count.
  - Zoom percentage.
  - Saving/saved/error state.
  - Local-only indicator.

Allow a renderer to contribute status-bar content. Do not show Monaco cursor, language, font-size, or rich-text controls for Canvas tabs.

### Keyboard-first interaction and spatial navigation

Keyboard navigation is a core product feature, not an accessibility-only follow-up. A developer must be able to enter a Canvas, move between cards, inspect or edit the focused card, manipulate it, and return to navigation without reaching for the mouse.

Maintain explicit ephemeral interaction state for each active Canvas session:

```ts
interface CanvasInteractionState {
  mode: "navigation" | "editing";
  focusedItemId: string | null;
  selectedItemIds: string[];
  focusOrigin: "keyboard" | "pointer" | null;
}
```

`focusedItemId` and selection are related but not identical:

- Keyboard navigation moves focus and makes that item the primary selection.
- Pointer selection also updates the focused item so keyboard navigation can continue from it.
- Multi-selection retains one primary focused item as the directional-navigation origin.
- Focus, selection, and interaction mode are session state and are not persisted in `CanvasDocument`.

Use a roving-tabindex model:

- The Canvas root is the initial tab stop.
- Only the currently focused card has `tabIndex={0}`; other cards use `tabIndex={-1}`.
- When focus enters an empty Canvas, it remains on the root and creation shortcuts work.
- When focus enters a populated Canvas with no prior focus, choose the first card using the deterministic traversal order.
- When the focused card is deleted, choose the next traversal item, then the previous item, then the Canvas root.
- Keyboard focus must remain visible with a high-contrast focus ring distinct from the normal selection outline.

#### Directional neighbor algorithm

Arrow-key navigation must be spatial, deterministic, zoom-independent, and based on document coordinates rather than current DOM order.

For a direction from the current item's bounds:

1. Consider only candidate items in the requested directional half-plane.
2. Measure the gap along the primary axis between item bounds, not only center-to-center distance.
3. Measure perpendicular-axis distance and whether the projected bounds overlap.
4. Rank candidates using a weighted score that strongly favors forward distance, then perpendicular distance, with an alignment-overlap bonus.
5. Resolve equal scores with stable `zIndex`, then `createdAt`, then item ID ordering.
6. Do not wrap from one edge of the document to the other. If no candidate exists, keep focus in place and provide subtle edge feedback.

The scoring function must live in a pure utility with table-driven tests. It must handle cards of different sizes, negative coordinates, overlapping cards, aligned rows/columns, and diagonal layouts.

When focus moves:

- Scroll/pan only enough to reveal the complete target card with comfortable viewport padding.
- Do not recenter the Canvas if the target is already fully visible.
- Preserve zoom.
- Announce the target's type and accessible name through an ARIA live region.
- Do not persist the automatic reveal as the user's saved viewport until normal viewport persistence runs.

#### Deterministic sequential traversal

`Tab` and `Shift+Tab` traverse cards in a stable spatial reading order:

- Group cards into visual rows using a documented vertical-overlap/tolerance rule.
- Order rows top-to-bottom and cards within a row left-to-right.
- Use `zIndex`, `createdAt`, and item ID as deterministic tie-breakers.
- Recompute the order after a completed move/resize/add/delete operation, not on every pointer frame.
- `Shift+Tab` traverses the exact reverse order.

Tab traversal moves to another card while one remains in that direction. From the final card, `Tab` follows normal browser order into the surrounding Scratch Tabs chrome; from the first card, `Shift+Tab` exits in reverse. The Canvas must never become a keyboard trap. This boundary behavior must remain consistent in either split-view pane and be covered by the shortcut help and accessibility tests.

#### Keyboard command contract

| Shortcut | Navigation-mode behavior |
| --- | --- |
| `Arrow keys` | Focus/select the nearest card in that spatial direction. |
| `Tab` / `Shift+Tab` | Move through deterministic spatial reading order. |
| `Enter` | Open the focused card's primary action or enter card editing. |
| `Escape` | Exit editing, clear multi-selection, or move focus back to the Canvas root in that order. |
| `Space` (hold) | Temporarily enable keyboard/mouse pan mode without changing the selected tool. |
| `Delete` / `Backspace` | Delete the current selection with undo support. |
| `Cmd/Ctrl+D` | Duplicate the current selection and focus the duplicate. |
| `Cmd/Ctrl+C`, `X`, `V` | Copy, cut, and paste Canvas items using Canvas-aware clipboard data. |
| `Cmd/Ctrl+A` | Select all Canvas items, not surrounding page content. |
| `Alt+Arrow` | Nudge the current selection by one grid unit. |
| `Alt+Shift+Arrow` | Nudge the current selection by ten grid units. |
| `F` | Fit the focused item or current selection into view. |
| `0` | Reset zoom to 100 percent around the focused item/viewport center. |
| `?` | Open a keyboard shortcut reference overlay. |

Editing controls take precedence over Canvas commands:

- Arrow keys, Tab, Home/End, selection shortcuts, and normal typing belong to the focused input/editor while `mode === "editing"`.
- `Escape` returns from editing to the same card in navigation mode.
- Embedded video players and link actions expose normal internal tab stops only after entering the card with `Enter`.
- Canvas-level listeners must use `event.composedPath()` and semantic editable-element checks rather than relying only on tag names.

React Flow's default keyboard behavior must be reviewed and configured so it does not also move nodes when Arrow keys are assigned to spatial navigation. The Canvas keyboard controller is the single authority for navigation and nudge commands; do not allow competing React Flow and global Scratch Tabs handlers to process the same event.

Every card supplies an accessible name derived from its content, for example `JSON card, users response`, `Image, architecture diagram`, or `Link, React Flow documentation`. Card type, selection count, navigation target, save errors, and document-edge feedback are announced without flooding the live region during key repeat.

### Desktop-only handling

- Gate the Canvas editor using the existing mobile detection approach plus a minimum usable pane width.
- On unsupported layouts, show `Canvas editing is currently available on desktop` with actions to close the tab or return to another tab.
- Do not initialize React Flow or load assets behind the unsupported-layout notice.
- Desktop split panes below the minimum usable width should show the same notice rather than a partially interactive Canvas.

## Scratch Tabs Integration Actions

Add `Send to Canvas` actions for:

- A complete text/code/JSON tab.
- The current editor selection.
- An image tab/Image Smart View.
- A URL selected in text.

The action flow asks for:

- New Canvas.
- An existing Canvas in the active workspace.

For an existing Canvas, insert near its last saved viewport center and bring that tab to the foreground. Use a dedicated Canvas action service rather than placing Canvas document mutation in `tabletActionService`.

Opening a JSON/code card in a normal tab creates a new populated tab using existing root-store actions. Editing the resulting tab does not live-sync back to the Canvas in the initial version.

## Search

Maintain a derived `searchText` in each `CanvasDocument` containing searchable text from:

- Text cards.
- Code/JSON cards.
- Link URL/title/description/site name.
- Video URL/provider/title.
- Image filename and alt text.
- Frame titles.

Rebuild it after document changes using a debounced `CanvasSearchIndexer` and save it with the document.

Extend tab search through the document-adapter boundary. Search must not load asset blobs. Search results should identify the Canvas tab and item; opening a result activates the tab, centers the item, and selects it.

## Workspace Import and Export

Bump the workspace export format version and extend the archive with:

```text
export-data.json
checksum.sha256
canvas/<document-id>.json
assets/<asset-id>
```

The manifest records each asset's ID, MIME type, byte length, checksum, and archive path.

Export requirements:

- Flush Canvas managers before reading records.
- Include only Canvas documents in selected workspaces.
- Follow document asset references; do not export unrelated assets.
- Include Canvas files/assets in integrity verification.

Import requirements:

- Validate schema versions, MIME types, sizes, and checksums before writing.
- Remap workspace, tab, document, item, edge, and asset IDs on conflict.
- Rewrite asset references after remapping.
- Save workspace/tab/document/assets transactionally where IndexedDB permits.
- Reject invalid Canvas documents without corrupting otherwise valid imported workspaces; report partial errors in the import summary.

## Security Requirements

- Render all pasted text as text, never with `dangerouslySetInnerHTML`.
- Do not accept pasted iframe/embed HTML.
- Sanitize or rasterize SVG before using it as a Canvas image; never execute scripts from SVG data.
- Validate all external URLs with the URL parser and allow only HTTP/HTTPS.
- Use `noopener,noreferrer` when opening external links.
- Centralize video provider parsing and iframe policies.
- Do not auto-fetch link previews or auto-play/load videos.
- Avoid placing raw Canvas documents or sensitive card contents in logs, analytics, URLs, or errors.
- Asset object URLs must be scoped and revoked.
- Treat imported Canvas documents as untrusted versioned data and validate every discriminated item.

## Performance Requirements

- Lazy-load React Flow, Canvas nodes, and Canvas services only for a Canvas tab.
- Use React Flow's visible-elements optimization where measurement shows a benefit.
- Memoize node components and pass minimal props.
- Keep transient drag/resize changes in the active Canvas session; do not update the global tab array on every pointer move.
- Persist after interactions/debounce rather than on every `onNodesChange` event.
- Do not mount Monaco inside Canvas cards.
- Truncate or virtualize large code previews.
- Decode/hash/resize images outside React render work; use a worker if profiling shows main-thread stalls.
- Avoid scene-sized `BroadcastChannel` messages.
- Test with at least 1,000 lightweight cards and mixed image boards before declaring the feature stable.

## Incremental Delivery Plan

### Execution contract for every increment

Each numbered increment is a mergeable vertical slice and must be implementable from a fresh context. The implementer may assume only that the preceding numbered increments are merged; they must not depend on unpublished branches, chat history, or spike code.

At the start of every increment:

1. Read `CLAUDE.md`, this plan, `tests/e2e/README.md`, and the code touched by the increment.
2. Confirm the preceding increment's Cucumber feature passes before changing its behavior.
3. Inspect current schemas and APIs rather than assuming filenames or signatures in this plan are already present.
4. Keep the change limited to the stated scope. Record newly discovered follow-up work in this plan instead of silently pulling it into the increment.

Every increment owns all production code, migrations, stable test selectors, Cucumber steps/action helpers, focused unit/component tests, and documentation needed for its behavior. A step is not complete if its Cucumber scenarios are `@wip`, skipped, dependent on another unmerged change, or use arbitrary timeouts.

The standard completion gate for every increment is:

```bash
npm run tsc
npm run lint
npm test -- --runInBand
npm run e2e:full -- tests/e2e/features/<feature-file>.feature
```

Run `npm run build` whenever the increment changes dependencies, lazy-loading boundaries, database schemas, workers, or production asset handling. Use the existing DOM save/cursor indicators or add a Canvas-specific DOM indicator for asynchronous persistence; never use `waitForTimeout` as a completion signal.

Keep Canvas behind one temporary experimental feature flag until Increment 17 is accepted. Cucumber setup may enable the flag explicitly. Do not create separate flags for partially completed Canvas capabilities.

### Increment 1: Canvas shell and empty-document persistence

**User outcome:** A user can create, open, pan, zoom, reload, and close an empty Canvas without affecting normal text tabs.

**Implementation scope:**

- Confirm React Flow licensing/attribution requirements, add `@xyflow/react`, and retain only production-quality spike code.
- Add `TabContentKind`, `getTabContentKind`, the initial validated Canvas document/session schemas, and the Dexie migration.
- Add the minimal document repository/manager needed to create, load, save, flush, and dispose an empty document.
- Create and remove the empty document transactionally with its tab metadata; asset-aware deletion remains in Increment 10.
- Add one creation entry point, the lazy Canvas renderer, theme integration, pan/zoom controls, local/saved status, and the desktop/narrow-pane guard.
- Keep scene data out of `Tab`, `tabletState`, and broadcast payloads. Do not add cards yet.

**Cucumber acceptance** in `canvas-foundation.feature`:

- Create an empty Canvas, reload the page, and see the same active Canvas.
- Close an empty Canvas and verify its tab and document do not return after reload.
- Create and edit a normal text tab after opening a Canvas, proving the legacy renderer still works.
- Open a Canvas in a narrow viewport and see the desktop-only notice without initializing the Canvas renderer.

**Human verification:** Pan and zoom in both themes, resize the pane across the supported-width boundary, and confirm browser focus can enter and leave the empty Canvas.

**Additional automated checks:** Unit-test all legacy/new `getTabContentKind` mappings and schema defaults. Run the production build and record the initial bundle plus lazy Canvas chunk sizes in the change description.

### Increment 2: Text-card editing and durable geometry

**Starting state:** Increment 1 is merged; an empty persisted Canvas can be created and rendered.

**User outcome:** A user can create a text card, edit it, move and resize it, and recover its content and geometry after reload.

**Implementation scope:**

- Add the common item model, item factory, React Flow/domain mapping, and `TextNode`.
- Replace Increment 1's empty-only document parser with complete `CanvasItem` and `CanvasEdge` validation while retaining schema version 1. The parser must preserve and return validated non-empty arrays; it must never accept populated arrays and normalize them back to empty. Add populated document round-trip tests before any card can be persisted.
- Add toolbar creation, navigation/editing modes for a single card, selection, move, resize, and deletion.
- Debounce scene saves, increment revisions, throttle parent-tab `lastModified`, and persist viewport separately.
- Expose item identity, bounds, selection, editing state, and save state through stable `data-testid`/ARIA contracts.

**Cucumber acceptance** in `canvas-text-cards.feature`:

- Create and edit a text card, wait for the Canvas save indicator, reload, and verify its text.
- Move and resize a card, reload, and verify its persisted bounds through the stable DOM contract.
- Delete the only card and verify the Canvas becomes empty and remains empty after reload.

**Human verification:** Create, edit, drag, resize, and delete cards at multiple zoom levels; confirm text remains readable and save-state transitions are understandable.

**Additional automated checks:** Test document/domain mapping, coordinate conversion, save debouncing, revision increments, and Strict Mode mount/unmount behavior.

### Increment 3: Flush boundaries, close protection, and split rendering

**Starting state:** Increment 2 is merged; text-card content and geometry survive a normal reload.

**User outcome:** Pending Canvas edits are safe when switching workspaces, closing a tab, or using split view.

**Implementation scope:**

- Flush pending writes before workspace switches, page hiding where possible, and manager disposal.
- Make `hasContent` and close confirmation Canvas-aware.
- Support one active Canvas in either split pane and two active Canvases simultaneously without sharing session state.
- Make the renderer contribute Canvas-specific status items instead of Monaco/rich-text controls.

**Cucumber acceptance** in `canvas-persistence.feature`:

- Edit a card and immediately switch workspaces, return, and verify no data loss.
- Close a non-empty Canvas, cancel the confirmation, and verify it remains open; then confirm closure.
- Open Canvas documents on both sides of split view, edit each, reload, and verify each document independently.

**Human verification:** Resize split panes through the minimum supported width and confirm only the narrow pane shows the desktop-only notice; verify save/error status belongs to the correct pane.

**Additional automated checks:** Test manager isolation, `flushAll`, disposal, `hasContent`, status contribution selection, and the no-scene-in-broadcast invariant.

### Increment 4: Core selection operations and session undo/redo

**Starting state:** Increment 3 is merged; active document sessions and lifecycle flushes are reliable.

**User outcome:** A user can select one or more text cards, duplicate, layer, delete, undo, and redo those operations during the current session.

**Implementation scope:**

- Add pointer multi-selection and one primary focused item.
- Add duplicate, bring-forward/send-backward, and multi-delete actions through the selection toolbar/context menu.
- Add bounded in-session undo/redo for create, edit, move, resize, duplicate, layer, and delete operations.
- Keep transient pointer frames and undo history out of persisted document state.

**Cucumber acceptance** in `canvas-editing-history.feature`:

- Multi-select two cards, duplicate them, and verify the duplicates are selected and offset.
- Move, resize, and delete cards, then undo and redo each completed operation.
- Reload and verify the latest document state persists but undo history does not.

**Human verification:** Exercise mouse and trackpad selection/context menus, including overlapping cards, and confirm each gesture produces one understandable undo step.

**Additional automated checks:** Test history boundaries, immutable snapshots, deterministic z-index changes, and selection fallback after deletion.

### Increment 5: Keyboard focus and spatial traversal

**Starting state:** Increment 4 is merged; all core card operations have stable completed-operation boundaries.

**User outcome:** A keyboard-only user can enter a populated Canvas and move predictably between cards with Arrow, Tab, and Shift+Tab.

**Implementation scope:**

- Implement roving tabindex, visible focus, navigation/editing mode transitions, and primary-focus synchronization after pointer actions.
- Implement the pure directional-neighbor and stable spatial-reading-order utilities exactly as specified above.
- Reveal offscreen targets without changing zoom or unnecessarily recentering visible targets.
- Add concise live-region announcements and edge feedback. Disable conflicting React Flow/global keyboard handling.

**Cucumber acceptance** in `canvas-keyboard-navigation.feature`:

- Traverse a fixed irregular layout in all four Arrow directions and verify the focused/selected card.
- Traverse the same layout forward with Tab and backward with Shift+Tab, then exit into surrounding chrome at each boundary.
- Navigate to an offscreen card and verify it becomes visible without a zoom change.
- Enter and leave card editing with Enter/Escape and verify text-editing keys do not trigger Canvas navigation.

**Human verification:** Complete the scenarios with no mouse in a normal pane and each side of split view; inspect focus rings and announcements with a screen reader.

**Additional automated checks:** Use table-driven tests for aligned, diagonal, overlapping, differently sized, negative-coordinate, tied, and no-candidate layouts; test reading-order recomputation and focus fallback after deletion.

### Increment 6: Keyboard manipulation and shortcut help

**Starting state:** Increment 5 is merged; navigation and editing modes have one keyboard-routing authority.

**User outcome:** A keyboard-only user can manipulate cards, fit/reset the viewport, and discover the available shortcuts.

**Implementation scope:**

- Add Delete/Backspace, Cmd/Ctrl+D, Cmd/Ctrl+A, Alt+Arrow, Alt+Shift+Arrow, `F`, `0`, Space-to-pan, and `?` behavior.
- Make every mutating shortcut use the undo/redo boundaries from Increment 4.
- Add the keyboard shortcut overlay and selection-count announcements.
- Reserve Cmd/Ctrl+C/X/V for Increment 9; list them as unavailable until Canvas clipboard data exists rather than intercepting them incompletely.

**Cucumber acceptance** in `canvas-keyboard-commands.feature`:

- Create, select all, nudge, duplicate, delete, undo, and redo using only the keyboard.
- Fit a selection, reset zoom, temporarily pan, and return to the previously selected tool.
- Open and close shortcut help, and verify Canvas shortcuts do not run while editing a text card.

**Human verification:** Run the keyboard-only editing loop on macOS and one Ctrl-based platform/browser; check that repeated key presses do not flood announcements.

**Additional automated checks:** Test platform modifier mapping, editable-element detection through `composedPath()`, nudge distances, and global-shortcut suppression.

### Increment 7: JSON/code cards and opening in a text tab

**Starting state:** Increment 6 is merged; text cards have complete pointer and keyboard interaction.

**User outcome:** A user can add JSON/code, format and inspect it efficiently, then open it in a normal Scratch Tab.

**Implementation scope:**

- Add `CodeNode`, JSON parsing/pretty-printing, existing format detection, lightweight escaped highlighting, preview truncation, wrap, and collapse state.
- Add Copy, Format, Collapse/expand, Wrap, and Open in tab actions.
- Use existing root-store actions for created text tabs; do not introduce live synchronization.
- Apply the established focus, selection, persistence, history, and accessibility contracts to code cards.

**Cucumber acceptance** in `canvas-code-cards.feature`:

- Add JSON, format it, reload, and verify formatted content and card settings.
- Add non-JSON code and verify the detected language and escaped rendering.
- Open a code card in a normal tab and verify later tab edits do not alter the Canvas card.

**Human verification:** Inspect a large code preview, toggle wrap/collapse, copy it, and confirm navigation remains responsive without mounting Monaco per card.

**Additional automated checks:** Test JSON formatting, language detection/locking, truncation thresholds, escaping, and item-schema validation.

### Increment 8: Blob-backed image cards

**Starting state:** Increment 7 is merged; heterogeneous card types are supported by the domain/renderer mapping.

**User outcome:** A user can choose an image file, see a durable image card, and recover gracefully from an invalid or missing asset.

**Implementation scope:**

- Add the asset repository/schema, image validation and configured byte/dimension limits, quota preflight, and transactional image-item creation.
- Add `ImageNode`, managed object URL creation/revocation, aspect-ratio resizing, alt text, download/copy/replace, and Open in Image Smart View.
- Sanitize or rasterize SVG according to the security requirements.
- Add rollback for failed document persistence and missing/corrupt-asset UI.

**Cucumber acceptance** in `canvas-images.feature`:

- Add an image through the file chooser, save, reload, and verify its dimensions and rendered asset.
- Replace an image and open it in the Image Smart View.
- Attempt an oversized/unsupported image and verify a visible error with no broken card.
- Simulate a missing asset record and verify the recoverable placeholder.

**Human verification:** Add several image formats, resize at different zooms, reload offline, and confirm object URLs are released when cards/Canvases unmount.

**Additional automated checks:** Test limits, MIME validation, SVG handling, object URL lifecycle, transaction rollback, and missing-asset behavior. Run the production build.

### Increment 9: Paste, drop, and Canvas clipboard ingestion

**Starting state:** Increment 8 is merged; text, code, and image item factories persist independently.

**User outcome:** A user can paste or drop text, JSON, files, and multiple mixed items at a predictable Canvas location, and can copy/cut/paste Canvas selections.

**Implementation scope:**

- Add normalized clipboard/drop inputs, classification precedence, coordinate placement, multi-item cascading/grid layout, and post-ingest selection.
- Attach handlers only to the focused Canvas root and preserve native editing behavior inside card editors.
- Stop Canvas drops from reaching `DragDropOverlay` via the stable drop-zone marker.
- Add Canvas-aware clipboard serialization for Cmd/Ctrl+C/X/V with a safe plain-text fallback.

**Cucumber acceptance** in `canvas-ingestion.feature`:

- Paste plain text and complete JSON and verify they become the correct card types.
- Drop an image and a text/code file and verify no unintended normal tabs are created.
- Paste multiple inputs at a known pointer position and verify deterministic placement and selection.
- Copy, cut, paste, undo, and redo a multi-card selection; verify native paste still works while editing a card.

**Human verification:** Exercise browser clipboard permissions, drag from the desktop, and paste at several pan/zoom positions.

**Additional automated checks:** Test classification precedence, file decoding, coordinate conversion, layout determinism, clipboard validation, rollback, and global-overlay suppression.

### Increment 10: Canvas tab duplication, deletion, and workspace moves

**Starting state:** Increment 9 is merged; documents can reference persisted assets and contain mixed cards.

**User outcome:** Canvas tabs behave safely under the existing duplicate, delete, and move-to-workspace actions.

**Implementation scope:**

- Introduce the document-adapter boundary and route Canvas lifecycle actions through it.
- Duplicate scenes while sharing immutable assets within a workspace.
- Delete documents and run reference-based asset garbage collection after the document transaction.
- Move a Canvas between workspaces by copying/remapping assets and updating document/tab ownership transactionally.

**Cucumber acceptance** in `canvas-tab-lifecycle.feature`:

- Duplicate a mixed Canvas, edit the duplicate, and verify the original is unchanged.
- Delete one of two Canvases sharing an image and verify the survivor still renders; delete the survivor and verify cleanup.
- Move a Canvas to another workspace, reload, and verify all text and image cards there.

**Human verification:** Exercise the tab bar and sidebar context-menu variants and cancel each destructive confirmation once.

**Additional automated checks:** Test reference collection, asset ID remapping, garbage collection, transaction failures, and legacy tab adapters.

### Increment 11: Offline link and click-to-load video cards

**Starting state:** Increment 10 is merged; lifecycle operations support heterogeneous card data and assets.

**User outcome:** URLs always produce useful offline cards, while recognized videos load an allowlisted embed only after explicit Play.

**Implementation scope:**

- Add URL validation/canonicalization, baseline `LinkNode`, and link actions.
- Add the centrally configured provider parser, `VideoNode`, iframe sandbox/allow/referrer policy, and play/stop lifecycle.
- Extend ingestion so standalone URLs use link/video cards after the stated classification precedence.
- Do not add metadata network requests in this increment.

**Cucumber acceptance** in `canvas-links-video.feature`:

- Paste a normal URL, reload offline, and verify its URL/hostname and open/copy actions.
- Paste recognized and unrecognized video-like URLs and verify their respective card types.
- Verify no iframe exists before Play, one allowlisted iframe exists after Play, and it is removed on Stop or Canvas unmount.
- Reject non-HTTP(S) URLs without creating unsafe links.

**Human verification:** Inspect keyboard entry/exit for link and video controls and confirm no third-party request occurs merely by opening the Canvas.

**Additional automated checks:** Test canonicalization, every supported provider, deceptive/invalid URLs, iframe policies, HTML escaping, and unmount cleanup.

### Increment 12: Optional privacy-gated link enrichment

**Starting state:** Increment 11 is merged and the metadata endpoint decisions at the end of this plan are resolved. If no endpoint is approved, skip this increment and retain baseline link cards as the shipped behavior.

**User outcome:** A user can explicitly fetch, cache, refresh, and recover from enriched link metadata without weakening offline behavior.

**Implementation scope:**

- Implement the approved metadata endpoint and all SSRF, redirect, DNS, size, timeout, parsing, and sanitization requirements.
- Add the user-consent/privacy setting, client request state, cached snapshot, preview-image asset path, refresh, and failure UI.
- Ensure enrichment failure never damages or removes the baseline link card.

**Cucumber acceptance** in `canvas-link-metadata.feature`:

- Verify a link makes no metadata request before explicit consent/action.
- Fetch approved fixture metadata, reload offline, and verify the cached preview.
- Exercise timeout/error/malformed responses and verify the baseline card remains usable.
- Verify refresh replaces the cached snapshot without duplicating assets.

**Human verification:** Review every network-triggering label and privacy setting, and inspect failure/retry behavior with the endpoint unavailable.

**Additional automated checks:** Test private/reserved address blocking, DNS/redirect revalidation, response limits, sanitization, cache expiry, and preview-asset cleanup.

### Increment 13: Creation surfaces and Send to Canvas

**Starting state:** Increment 11 is merged; Increment 12 is optional and must not be required for this work.

**User outcome:** Canvas is discoverable in the expected creation surfaces, and supported existing content can be sent to a new or existing Canvas.

**Implementation scope:**

- Add the adjacent creation dropdown, welcome/empty-state card, `Documents` Tool Selector category, `/canvas` route, icons, and tooltips.
- Add `Send to Canvas` for a full text/code/JSON tab, editor selection, image view, and selected URL.
- Add the dedicated Canvas action service; insert into an existing Canvas near its last saved viewport center and activate it.
- Preserve the existing primary `+` behavior and small-screen welcome layout.

**Cucumber acceptance** in `canvas-entry-points.feature`:

- Create a Canvas from each entry point and verify the existing `+` still creates a text tab.
- Send a full text tab and a selection to new and existing Canvases.
- Send an image and a selected URL, then reload and verify the resulting cards.
- Navigate directly to `/canvas` and verify consistent creation/activation behavior.

**Human verification:** Inspect icon/label consistency in tab bar, sidebar, tooltip, Tool Selector, welcome screen, and mobile/narrow layouts.

**Additional automated checks:** Test action-service routing and target placement. Re-run existing welcome, tab creation, and tablet Cucumber features as regressions.

### Increment 14: Search indexing and item-result navigation

**Starting state:** Increment 13 is merged; all shipping card types have stable searchable fields.

**User outcome:** Search finds Canvas card content without loading asset blobs and opens the matching item in context.

**Implementation scope:**

- Add the derived debounced `searchText` index for every card type and frame title if frames exist.
- Extend the document adapter and search result model with Canvas item identity.
- On result activation, open the Canvas, center/reveal the item, select it, and move keyboard focus to it.
- Keep inactive-workspace search metadata-only and blob-free.

**Cucumber acceptance** in `canvas-search.feature`:

- Find text, code, link metadata, image filename/alt text, and video title/provider in a Canvas.
- Activate a result for an offscreen item and verify the correct Canvas/item is visible, selected, and focused.
- Edit/delete indexed content, wait for save, and verify stale results disappear.
- Search another workspace and verify no Canvas asset blobs are read.

**Human verification:** Inspect result labels/icons and keyboard flow from global search into the Canvas and back.

**Additional automated checks:** Test index normalization, every item type, debounce/flush behavior, item-result mapping, and repository calls that exclude blobs.

### Increment 15: Workspace export and import

**Starting state:** Increment 14 is merged; the Canvas schema, assets, and search data are stable enough to serialize.

**User outcome:** A workspace containing Canvases can be exported, cleared, imported, and recovered with content and assets intact.

**Implementation scope:**

- Bump the export format and add Canvas documents/assets plus manifest checksums and paths.
- Flush managers before export and include only referenced records from selected workspaces.
- Validate untrusted imports, remap all conflicting IDs/references, and report partial Canvas errors without corrupting otherwise valid workspaces.
- Preserve compatibility with earlier non-Canvas exports.

**Cucumber acceptance** in `canvas-import-export.feature`:

- Export a mixed workspace, import it into clean storage, and verify geometry, settings, content, and images.
- Import the archive alongside colliding IDs and verify references are remapped correctly.
- Import an archive with a corrupt Canvas asset/document and verify a clear partial-error summary and intact valid tabs.
- Import an older workspace archive and verify normal tabs still work.

**Human verification:** Inspect archive layout/manifest and perform a round trip in a fresh browser profile, including offline image rendering.

**Additional automated checks:** Test checksums, schema/MIME/size validation, remapping, asset reachability, selection filtering, and transaction failure behavior. Run the production build.

### Increment 16: Cross-window revision conflicts

**Starting state:** Increment 15 is merged; save/flush and import/export use stable document revisions.

**User outcome:** Simultaneous edits in two windows are detected and recoverable rather than silently overwritten.

**Implementation scope:**

- Broadcast only `{ tabId, documentId, revision }` and perform optimistic revision checks before save.
- Stop a conflicting save and show reload/take-over actions with an unsaved-local-state warning.
- Define deterministic take-over revision behavior and ensure unrelated documents/windows continue saving.

**Cucumber acceptance** in `canvas-conflicts.feature`:

- Open one Canvas in two browser contexts, save in the first, then edit in the second and verify conflict detection.
- Choose Reload and verify the stored version replaces the stale session.
- Recreate the conflict, choose Take over, reload both contexts, and verify the chosen version persists.
- Verify broadcast messages contain no scene, card content, or Blob payload.

**Human verification:** Read the conflict copy as a user with unsaved work and confirm both recovery choices and their consequences are clear.

**Additional automated checks:** Test compare-and-save races, revision monotonicity, message validation, conflict isolation, and reload/take-over state transitions.

### Increment 17: Accessibility, resilience, performance, and release gate

**Starting state:** Increments 1-16 are merged, or Increment 12 is explicitly skipped by product decision. No new product capability belongs in this increment.

**User outcome:** The complete Canvas feature is reliable, keyboard-accessible, offline-capable, and ready to leave the experimental flag.

**Implementation scope:**

- Fix issues found by keyboard/screen-reader audits across large scenes, overlaps, split view, browser zoom, and surrounding-app shortcut conflicts.
- Profile and tune 1,000 lightweight cards and mixed-image boards without changing the persisted model.
- Exercise quota exhaustion, failed writes, corrupt documents, missing assets, offline PWA caching, and lazy chunk failures.
- Complete release notes, landing-page content, and privacy documentation; remove the feature flag only after all gates pass.

**Cucumber acceptance** in `canvas-release-regression.feature`:

- Run the primary create/edit/navigate/reload workflow using only the keyboard.
- Verify mixed text/code/image/link/video content survives reload and works offline within its documented limits.
- Inject a failed save/quota condition and verify visible error, retry, and no false "saved" state.
- Verify Canvas in both split panes and a narrow pane without cross-pane shortcuts or renderer initialization behind the notice.

Also run all Canvas feature files together, followed by the full non-`@wip` E2E suite.

**Human verification:** Complete the browser/accessibility matrix, test a representative 1,000-card board and mixed-image board, inspect production chunk loading, and perform the release checklist in a clean profile.

**Additional automated checks:** Add targeted performance budgets, corrupted-record migration tests, offline cache checks, and accessibility checks. Run `npm run build`, the complete Jest suite, all Canvas Cucumber features, and `npm run e2e`.

## Test Ownership and Regression Rules

- Put Canvas-specific Cucumber interactions in a dedicated `canvas.actions.ts` (and smaller asset/search helpers only when responsibilities become distinct), then expose them through the existing World dependency-injection pattern.
- Prefer user-observable assertions. Geometry, revision, network, blob-read, or broadcast assertions may use explicit test-only DOM indicators/hooks when no accessible UI representation exists; they must expose metadata, never scene content.
- Every bug found after an increment gets a focused test in the earliest relevant feature file, so later increments inherit the regression.
- Unit tests own pure algorithms and failure matrices: schema migrations, classification, coordinate math, spatial navigation, reading order, indexing, URL/provider parsing, asset references, ID remapping, checksums, and revision comparison.
- Component tests own interaction boundaries that are costly or brittle in Cucumber: object URL cleanup, Strict Mode behavior, shortcut routing, React Flow default suppression, renderer non-initialization, live-region throttling, and iframe unmounting.
- Cucumber owns complete user outcomes across real IndexedDB and browser lifecycle boundaries. Mock only external metadata/video services and deliberate failure injection.
- Use stable `data-testid` and ARIA contracts rather than CSS classes. Async scenarios must wait on visible state or dedicated DOM indicators, never elapsed time.

## Definition of Done

- Canvas is a first-class, desktop-only tab type, visible through normal creation and navigation flows.
- React Flow is lazy-loaded and does not materially regress the initial editor bundle.
- Text, JSON/code, images, links, and video links have defined card behavior.
- Arrow keys provide deterministic spatial card navigation, Tab/Shift+Tab provide stable sequential traversal, and the primary Canvas workflow is operable without a mouse.
- Keyboard focus, card editing, multi-selection, nudge commands, viewport reveal, shortcut help, and screen-reader announcements have tested behavior.
- Scene JSON and Blob assets persist separately in IndexedDB with migrations.
- Reload, workspace switch, split view, duplicate, move, delete, search, export, and import are tested.
- No large Canvas state is stored in normal tab state or sent through full workspace broadcasts.
- Link preview network behavior is explicit, privacy-preserving, and failure-tolerant.
- Video providers are allowlisted and embeds load only after a user action.
- Unsupported mobile/narrow layouts fail clearly and safely.
- Existing Shape Snap, Smart Views, rich text, Monaco tabs, and tablets continue to behave as before.

## Decisions Required Before Dependent Increments

1. Before Increment 8: initial image byte/dimension limits and whether large images should be downscaled automatically.
2. Before Increment 11: which video providers are supported initially.
3. Before Increment 12: hosting location and operational ownership of the URL metadata endpoint.
4. Before Increment 12: whether link enrichment is always click-to-fetch or can be enabled globally by a privacy preference.
5. Before Increment 17: whether connections and frames ship in the first public Canvas release or immediately afterward. If they must ship initially, add separate vertical increments with their own Cucumber and human acceptance criteria rather than expanding an existing increment.
