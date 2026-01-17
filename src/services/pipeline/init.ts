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

// Register core categories on module load
registerCoreCategories();
