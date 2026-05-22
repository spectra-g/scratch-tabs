export interface ExtractedString {
  offset: number;
  value: string;
  length: number;
}

export function extractStrings(bytes: Uint8Array, minLength = 4): ExtractedString[] {
  const results: ExtractedString[] = [];
  let runStart = -1;

  for (let i = 0; i <= bytes.length; i++) {
    const isPrintable = i < bytes.length && bytes[i] >= 32 && bytes[i] <= 126;

    if (isPrintable) {
      if (runStart === -1) runStart = i;
    } else if (runStart !== -1) {
      const len = i - runStart;
      if (len >= minLength) {
        const chars: string[] = new Array(len);
        for (let j = 0; j < len; j++) {
          chars[j] = String.fromCharCode(bytes[runStart + j]);
        }
        results.push({ offset: runStart, value: chars.join(""), length: len });
      }
      runStart = -1;
    }
  }

  return results;
}
