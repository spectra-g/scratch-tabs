const BASE64ISH = /^[A-Za-z0-9+/_=\-]+$/;
const HEX = /^[a-f0-9]+$/i;

export function calculateShannonEntropy(value: string): number {
  if (!value) return 0;

  const counts = new Map<string, number>();
  for (const char of value) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }

  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

export function isHighEntropy(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 20) return false;

  const entropy = calculateShannonEntropy(trimmed);
  if (HEX.test(trimmed)) {
    return trimmed.length >= 32 && entropy >= 3.25;
  }

  if (BASE64ISH.test(trimmed)) {
    return trimmed.length >= 24 && entropy >= 4.1;
  }

  return trimmed.length >= 24 && entropy >= 4.4;
}

export function decodeBase64Candidate(value: string): string | null {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  if (!BASE64ISH.test(value) || normalized.length < 24) return null;

  try {
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    return /[\x09\x0a\x0d\x20-\x7e]/.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}
