export interface CanonicalCanvasUrl {
  canonicalUrl: string;
  hostname: string;
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export const canonicalizeCanvasUrl = (
  input: string,
): CanonicalCanvasUrl | null => {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  try {
    const url = new URL(trimmed);
    if (
      !ALLOWED_PROTOCOLS.has(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null;
    }

    url.hash = "";
    return {
      canonicalUrl: url.toString(),
      hostname: url.hostname.toLowerCase(),
    };
  } catch {
    return null;
  }
};
