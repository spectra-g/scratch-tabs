/**
 * Pipeline Initialization
 *
 * This file should be imported early in the application lifecycle
 * to ensure categories are registered before operations.
 *
 * Usage in App.tsx or main.tsx:
 * ```typescript
 * import '@/services/pipeline/init';
 * ```
 */

import { registerCoreCategories } from "./categories";

// 1. Register categories
registerCoreCategories();

// 2. Register core text operations (formerly BatchTools)
import "./operations/coreOperations";
import "./operations/encoding";
import "./operations/logic";
import "./operations/extraction";
import "./operations/compression";

// Auto-discovery for formats/tablets is now handled in `./operations/discovery.ts`
// which should be imported in the main application entry point (main.tsx)
// and the web worker (pipelineWorker.ts).
// Note: Individual modules can still import their own operations
// locally, as the registry handles duplicate registrations gracefully.
