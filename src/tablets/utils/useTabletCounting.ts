import { useEffect, useRef } from 'react';

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
 * @param tabletId - The unique identifier for the tablet (e.g., 'calculator', 'regex')
 */
export function useTabletCounting(tabletId: string): void {
  const hasCounted = useRef(false);

  useEffect(() => {
    // Only count once per tablet mount
    if (hasCounted.current) {
      return;
    }

    // Only count in production builds
    if (!import.meta.env.PROD) {
      return;
    }

    // Validate tablet ID (basic sanitation)
    if (!tabletId || typeof tabletId !== 'string' || !/^[a-z0-9-]+$/.test(tabletId)) {
      return;
    }

    try {
      // Construct CDN URL for the counting pixel
      const countingUrl = `https://scratchtabs.b-cdn.net/t/${tabletId}.png`;

      // Load the pixel using Image object (doesn't add to DOM)
      const img = new Image();
      img.src = countingUrl;

      // Silent success/failure - no logging needed in production
      hasCounted.current = true;
    } catch (error) {
      // Silent failure - don't disrupt user experience
    }
  }, [tabletId]);
}
