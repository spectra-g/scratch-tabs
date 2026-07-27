/**
 * Syntax highlighting for fenced code blocks.
 *
 * The grammars live in `highlightGrammars.ts` and are pulled in on demand the
 * first time a fenced block renders, keeping ~130KB of language definitions out
 * of the eager bundle. Until the chunk resolves, fences render as plain text,
 * so nothing waits on it.
 *
 * The emitted `hljs-*` classes are mapped onto the app's own syntax tokens in
 * index.css rather than a highlight.js theme, so fenced code matches the colours
 * used everywhere else and follows the light/dark switch for free.
 */

import type { Root } from "hast";

type Lowlight = {
  highlight: (language: string, value: string) => Root;
  registered: (language: string) => boolean;
};

let highlighter: Lowlight | null = null;
let loading: Promise<Lowlight | null> | null = null;

/** Resolves once the grammar chunk is ready; null if it failed to load. */
export function loadHighlighter(): Promise<Lowlight | null> {
  if (highlighter) return Promise.resolve(highlighter);

  loading ??= import("./highlightGrammars")
    .then((module) => {
      highlighter = module.default as unknown as Lowlight;
      return highlighter;
    })
    .catch(() => null);

  return loading;
}

/** The highlighter if it has already loaded, without triggering a load. */
export function getLoadedHighlighter(): Lowlight | null {
  return highlighter;
}

/**
 * Highlights `code` as `language`.
 *
 * Returns null when the grammars are not loaded yet, the language is unknown,
 * or highlight.js throws - all of which mean "render it as plain text". Unknown
 * languages are deliberately not auto-detected: guessing on a three-line
 * snippet is unreliable, and a wrong guess colours the code with nothing to
 * tell the reader it was a guess.
 */
export function highlightCode(code: string, language: string | null): Root | null {
  if (!highlighter || !language) return null;

  const normalised = language.toLowerCase();
  if (!highlighter.registered(normalised)) return null;

  try {
    return highlighter.highlight(normalised, code);
  } catch {
    return null;
  }
}

/** Whether a fence's language will actually highlight. */
export function isLanguageSupported(language: string | null): boolean {
  if (!highlighter || !language) return false;
  return highlighter.registered(language.toLowerCase());
}
