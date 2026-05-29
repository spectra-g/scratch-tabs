export interface DecodedJwtMetadata {
  algorithm?: string;
  issuer?: string;
  subject?: string;
  audience?: string[];
  expiresAt?: number;
  issuedAt?: number;
  notBefore?: number;
  expired?: boolean;
  algNone?: boolean;
  longLived?: boolean;
}

function decodePart(part: string): Record<string, unknown> | null {
  try {
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function decodeJwtMetadata(token: string, nowSeconds = Math.floor(Date.now() / 1000)): DecodedJwtMetadata | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);
  if (!header || !payload) return null;

  const exp = typeof payload.exp === "number" ? payload.exp : undefined;
  const iat = typeof payload.iat === "number" ? payload.iat : undefined;
  const nbf = typeof payload.nbf === "number" ? payload.nbf : undefined;
  const aud = Array.isArray(payload.aud)
    ? payload.aud.filter((item): item is string => typeof item === "string")
    : typeof payload.aud === "string"
      ? [payload.aud]
      : undefined;

  return {
    algorithm: typeof header.alg === "string" ? header.alg : undefined,
    issuer: typeof payload.iss === "string" ? payload.iss : undefined,
    subject: typeof payload.sub === "string" ? payload.sub : undefined,
    audience: aud,
    expiresAt: exp,
    issuedAt: iat,
    notBefore: nbf,
    expired: exp ? exp < nowSeconds : undefined,
    algNone: header.alg === "none",
    longLived: exp && iat ? exp - iat > 60 * 60 * 24 * 90 : undefined,
  };
}
