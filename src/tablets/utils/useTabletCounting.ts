import { useEffect } from 'react';

// Module-level Set to count which tablet instances have been counted
// This persists across component remounts but resets on page refresh
const countedInstances = new Set<string>();

/**
 * Privacy-respecting tablet usage counting hook
 *
 * This hook loads a 1x1 transparent counting pixel when a tablet is rendered
 * in production mode. The pixel is served from Bunny CDN, and CDN access logs
 * provide aggregate usage statistics without collecting any user data.
 *
 * Development mode: No counting (respects local development workflow)
 * Production mode: Loads pixel from https://scratchtabs.b-cdn.net/t/{tabletId}.png
 *
 * Counting behavior:
 * - Each unique tab instance (tab.id) is counted once per session
 * - Resets on page refresh
 * - Switching away and back to the same tab won't re-count
 *
 * @param tabletId - The unique identifier for the tablet (e.g., 'calculator', 'regex')
 * @param uniqueKey - A unique key for this specific instance (e.g., tab.id) to ensure counting fires for each new instance
 */
export function useTabletCounting(tabletId: string, uniqueKey?: string): void {
  useEffect(() => {
    // Only count in production builds
    if (!import.meta.env.PROD) {
      return;
    }

    // Validate tablet ID (basic sanitation)
    if (!tabletId || typeof tabletId !== 'string' || !/^[a-z0-9-]+$/.test(tabletId)) {
      return;
    }

    // Create a composite key to count this specific instance
    const instanceKey = uniqueKey ? `${tabletId}-${uniqueKey}` : tabletId;

    // If we've already counted this specific instance, skip
    if (countedInstances.has(instanceKey)) {
      return;
    }

    try {
      // Construct CDN URL for the counting pixel
      const countingUrl = `https://scratchtabs.b-cdn.net/t/${tabletId}.png`;

      // Load the pixel using Image object (doesn't add to DOM)
      const img = new Image();
      img.src = countingUrl;

      // Mark this instance as counted (persists for the session)
      countedInstances.add(instanceKey);
    } catch (error) {
      // Silent failure - don't disrupt user experience
    }
  }, [tabletId, uniqueKey]);
}
