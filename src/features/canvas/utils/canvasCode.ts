import {
  COLLAPSED_CODE_ITEM_HEIGHT,
  CODE_PREVIEW_MAX_CHARACTERS,
  CODE_PREVIEW_MAX_LINES,
  MIN_CODE_ITEM_HEIGHT,
} from "../constants";
import type { CanvasCodeItem } from "../types";

export type CanvasCodeTokenKind =
  | "plain"
  | "comment"
  | "keyword"
  | "string"
  | "number"
  | "literal"
  | "punctuation";

export interface CanvasCodeToken {
  kind: CanvasCodeTokenKind;
  value: string;
}

export interface CanvasCodePreview {
  source: string;
  isTruncated: boolean;
}

const JSON_TOKEN_PATTERN =
  /("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*")|(-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\b(?:true|false|null)\b)|([{}[\],:])/gi;
const GENERIC_TOKEN_PATTERN =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(-?\b\d+(?:\.\d+)?\b)|(\b(?:true|false|null|undefined)\b)|(\b(?:async|await|break|case|catch|class|const|continue|def|do|else|enum|export|extends|finally|for|from|function|if|import|in|interface|let|new|of|package|private|public|return|static|switch|throw|try|type|var|while|yield)\b)|([{}[\]();,.=:<>+*/-])/gi;

const tokenKindForMatch = (
  match: RegExpExecArray,
  language: string,
): CanvasCodeTokenKind => {
  if (language === "json") {
    if (match[1] || match[2]) return "string";
    if (match[3]) return "number";
    if (match[4]) return "literal";
    return "punctuation";
  }

  if (match[1]) return "comment";
  if (match[2]) return "string";
  if (match[3]) return "number";
  if (match[4]) return "literal";
  if (match[5]) return "keyword";
  return "punctuation";
};

export const tokenizeCanvasCode = (
  source: string,
  language: string,
): CanvasCodeToken[] => {
  const pattern =
    language === "json" ? JSON_TOKEN_PATTERN : GENERIC_TOKEN_PATTERN;
  pattern.lastIndex = 0;
  const tokens: CanvasCodeToken[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    pattern.lastIndex = cursor;
    const match = pattern.exec(source);
    if (!match) {
      tokens.push({ kind: "plain", value: source.slice(cursor) });
      break;
    }
    if (match.index > cursor) {
      tokens.push({
        kind: "plain",
        value: source.slice(cursor, match.index),
      });
    }
    tokens.push({
      kind: tokenKindForMatch(match, language),
      value: match[0],
    });
    cursor = pattern.lastIndex;
  }

  return tokens;
};

export const getCanvasCodePreview = (
  source: string,
  maxCharacters = CODE_PREVIEW_MAX_CHARACTERS,
  maxLines = CODE_PREVIEW_MAX_LINES,
): CanvasCodePreview => {
  const lines = source.split("\n");
  const lineLimited = lines.slice(0, maxLines).join("\n");
  const preview = lineLimited.slice(0, maxCharacters);
  return {
    source: preview,
    isTruncated:
      lines.length > maxLines || lineLimited.length > maxCharacters,
  };
};

export type FormatJsonResult =
  | { ok: true; source: string }
  | { ok: false; error: string };

export const formatCanvasJson = (source: string): FormatJsonResult => {
  try {
    return { ok: true, source: JSON.stringify(JSON.parse(source), null, 2) };
  } catch {
    return { ok: false, error: "This card does not contain valid JSON." };
  }
};

export const toggleCanvasCodeCollapsed = (
  item: CanvasCodeItem,
): CanvasCodeItem => {
  if (!item.collapsed) {
    return {
      ...item,
      collapsed: true,
      expandedHeight: Math.max(item.height, MIN_CODE_ITEM_HEIGHT),
      height: COLLAPSED_CODE_ITEM_HEIGHT,
    };
  }

  const { expandedHeight, ...expandedItem } = item;
  return {
    ...expandedItem,
    collapsed: false,
    height: expandedHeight ?? Math.max(item.height, MIN_CODE_ITEM_HEIGHT),
  };
};
