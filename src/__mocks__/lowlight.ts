/**
 * Shape-faithful stand-in for lowlight.
 *
 * The real package is ESM-only and pulls in the whole highlight.js language
 * pack, so it is mocked. `highlight` returns a hast root shaped the way callers
 * actually consume it - a wrapping span plus a text node - rather than the
 * `{ value }` string the earlier stub returned, which no caller ever reads.
 */

const REGISTERED = new Set([
  "javascript",
  "js",
  "typescript",
  "ts",
  "python",
  "json",
  "css",
  "xml",
  "bash",
  "sql",
  "markdown",
]);

const root = (className: string, value: string) => ({
  type: "root",
  children: [
    {
      type: "element",
      tagName: "span",
      properties: { className: [className] },
      children: [{ type: "text", value }],
    },
  ],
});

export const common = {};
export const all = {};

export const createLowlight = jest.fn((grammars?: Record<string, unknown>) => {
  // `createLowlight({ js, css })` registers exactly what it is handed;
  // `createLowlight(common)` passes the empty `common` sentinel and gets the
  // default set instead.
  const registered =
    grammars && Object.keys(grammars).length > 0
      ? new Set(Object.keys(grammars))
      : REGISTERED;

  return {
    registered: jest.fn((language: string) => registered.has(language)),
    highlight: jest.fn((language: string, code: string) => {
      if (!registered.has(language)) throw new Error(`Unknown language: ${language}`);
      return root("hljs-keyword", code);
    }),
    highlightAuto: jest.fn((code: string) => root("hljs-keyword", code)),
  };
});
