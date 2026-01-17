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

// 3. Auto-discover Format & Tablet Operations via Glob Import
// This ensures all operations are registered on the main thread even if
// the format/tablet module hasn't been lazily loaded yet.
// The 'eager: true' ensures they are executed immediately.
import.meta.glob('../../formats/**/pipelineOperations.ts', { eager: true });
import.meta.glob('../../tablets/**/pipelineOperations.ts', { eager: true });

// Note: Individual modules can still import their own operations
// locally, as the registry handles duplicate registrations gracefully.
