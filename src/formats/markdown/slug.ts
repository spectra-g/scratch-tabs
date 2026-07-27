/**
 * GitHub-compatible heading slugs, so an anchor copied from the preview matches
 * the one a reader would get from the same document rendered on GitHub.
 */

/**
 * Lowercases, drops punctuation, and joins words with hyphens.
 * Unicode letters and digits are kept - headings are not always ASCII.
 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, (char) => (char === "-" ? char : ""))
    .replace(/\s+/g, "-");
}

/**
 * Slugger that appends `-1`, `-2`, ... to repeats, matching GitHub's behaviour
 * for documents with two headings of the same name.
 */
export function createSlugger(): (text: string) => string {
  const seen = new Map<string, number>();

  return (text: string): string => {
    const base = slugify(text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}
