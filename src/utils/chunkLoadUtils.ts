import React from "react";

/**
 * Utility functions for handling chunk load errors in lazy-loaded components.
 *
 * When a user leaves a browser tab open and the app is rebuilt (dev server restart
 * or new deployment), the old chunk files no longer exist. This causes lazy loading
 * to fail with network errors. These utilities detect such errors and auto-reload
 * the page to fetch the new chunk manifest.
 */

/**
 * Detects if an error is a chunk/module load failure.
 * These occur when lazy-loaded chunks are no longer available on the server.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;

  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";

  // Common patterns for chunk load failures:
  // - Vite: "Failed to fetch dynamically imported module"
  // - Webpack: "Loading chunk X failed"
  // - Generic: "Importing a module script failed"
  // - Network: "Failed to load resource", "NetworkError"
  // - Connection: "ERR_CONNECTION_REFUSED", "net::ERR_"
  // - HTTP errors: "404", "500", etc.
  // - Fetch failures: "Load failed", "fetch"
  const isChunkError = (
    name === "ChunkLoadError" ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Loading chunk") ||
    message.includes("Importing a module script failed") ||
    message.includes("Failed to load resource") ||
    message.includes("Load failed") ||
    message.includes("NetworkError") ||
    message.includes("ERR_CONNECTION_REFUSED") ||
    message.includes("ERR_ABORTED") ||
    message.includes("net::ERR_") ||
    message.includes("Failed to fetch") ||
    // TypeError with fetch-related message (common for dynamic import failures)
    (name === "TypeError" && (
      message.includes("fetch") ||
      message.includes("module") ||
      message.includes("import") ||
      message.includes("/assets/") ||
      message.includes(".js")
    ))
  );

  return isChunkError;
}

/**
 * Session storage key prefix for reload tracking.
 * Used to prevent infinite reload loops if the server is actually down.
 */
const RELOAD_ATTEMPT_KEY_PREFIX = "chunk_reload_attempt_";

/**
 * Handles a chunk load error by reloading the page.
 * Uses session storage to prevent infinite reload loops.
 *
 * @param context - A string identifying what was being loaded (for the storage key)
 * @returns true if reload was triggered, false if we've already tried reloading
 */
export function handleChunkLoadError(context: string): boolean {
  const storageKey = `${RELOAD_ATTEMPT_KEY_PREFIX}${context}`;

  // Check if we've already attempted a reload for this context
  if (sessionStorage.getItem(storageKey)) {
    // Clear the flag so future sessions can retry
    sessionStorage.removeItem(storageKey);
    console.error(`Chunk load failed for "${context}" even after reload. Server may be down.`);
    return false;
  }

  // Set flag and reload
  console.log(`Chunk load error detected for "${context}". Reloading to fetch new version...`);
  sessionStorage.setItem(storageKey, "true");
  window.location.reload();
  return true;
}

/**
 * Wraps React.lazy() with automatic reload on chunk load errors.
 *
 * Usage:
 * ```ts
 * const MyComponent = lazyWithReload(
 *   () => import("./MyComponent"),
 *   "MyComponent"
 * );
 * ```
 *
 * @param importFn - The dynamic import function
 * @param context - A string identifying the component (for error tracking)
 * @returns A lazy component that auto-reloads on chunk errors
 */
export function lazyWithReload<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  context: string
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      if (isChunkLoadError(error)) {
        const reloaded = handleChunkLoadError(context);
        if (reloaded) {
          // Return a never-resolving promise while we wait for reload
          return new Promise(() => {});
        }
      }
      // Re-throw if not a chunk error or if we've already tried reloading
      throw error;
    }
  });
}

/**
 * Wraps an async import function with chunk load error handling.
 * Use this for non-React dynamic imports (e.g., tablet loading).
 *
 * Usage:
 * ```ts
 * const module = await importWithReload(
 *   () => import("./myModule"),
 *   "myModule"
 * );
 * ```
 *
 * @param importFn - The dynamic import function
 * @param context - A string identifying what's being loaded
 * @returns The imported module, or throws if reload was already attempted
 */
export async function importWithReload<T>(
  importFn: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    if (isChunkLoadError(error)) {
      const reloaded = handleChunkLoadError(context);
      if (reloaded) {
        // Return a never-resolving promise while we wait for reload
        return new Promise(() => {});
      }
    }
    throw error;
  }
}
