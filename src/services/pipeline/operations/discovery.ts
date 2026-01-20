/**
 * Pipeline Operation Discovery
 * 
 * Uses Vite's import.meta.glob to automatically discover and register
 * pipeline operations from formats and tablets.
 * 
 * This file is separate to avoid syntax errors in Jest tests which
 * do not support import.meta.
 */

// Auto-discover Format Operations
// @ts-ignore
import.meta.glob('../../../formats/**/pipelineOperations.ts', { eager: true });

// Auto-discover Tablet Operations
// @ts-ignore
import.meta.glob('../../../tablets/**/pipelineOperations.ts', { eager: true });
