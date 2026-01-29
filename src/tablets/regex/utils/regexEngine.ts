import {
  RegexMatch,
  RegexGroup,
  RegexFlag,
  RegexError,
  RegexExplanation,
  RegexNode,
  RegexQuantifier,
} from "../types";

export const DEFAULT_FLAGS: RegexFlag[] = [
  {
    flag: "g",
    name: "Global",
    description: "Find all matches rather than stopping after the first match",
    enabled: true,
  },
  {
    flag: "i",
    name: "Ignore Case",
    description: "Case-insensitive matching",
    enabled: false,
  },
  {
    flag: "m",
    name: "Multiline",
    description: "^/$ match line breaks",
    enabled: false,
  },
  {
    flag: "s",
    name: "Dot All",
    description: ". matches newline characters",
    enabled: false,
  },
  {
    flag: "u",
    name: "Unicode",
    description: "Unicode support",
    enabled: false,
  },
  {
    flag: "y",
    name: "Sticky",
    description: "Matches only from the index indicated by lastIndex",
    enabled: false,
  },
];

export function createRegexFromPattern(
  pattern: string,
  flags: RegexFlag[],
): RegExp | null {
  try {
    const flagString = flags
      .filter((f) => f.enabled)
      .map((f) => f.flag)
      .join("");
    return new RegExp(pattern, flagString);
  } catch (error) {
    return null;
  }
}

export function validateRegex(
  pattern: string,
  flags: RegexFlag[],
): RegexError | null {
  try {
    const flagString = flags
      .filter((f) => f.enabled)
      .map((f) => f.flag)
      .join("");
    new RegExp(pattern, flagString);
    return null;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Invalid regex pattern";

    // Try to extract position from error message
    const positionMatch = errorMessage.match(/at position (\d+)/);
    const position = positionMatch ? parseInt(positionMatch[1], 10) : undefined;

    return {
      message: errorMessage,
      position,
    };
  }
}

export function executeRegex(
  pattern: string,
  testString: string,
  flags: RegexFlag[],
): RegexMatch[] {
  const regex = createRegexFromPattern(pattern, flags);
  if (!regex) return [];

  const matches: RegexMatch[] = [];
  const isGlobal = flags.some((f) => f.flag === "g" && f.enabled);

  if (isGlobal) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(testString)) !== null) {
      const groups: RegexGroup[] = [];
      const namedGroups: Record<string, string> = {};

      // Process numbered groups
      for (let i = 1; i < match.length; i++) {
        if (match[i] !== undefined) {
          const groupMatch = match[i];
          const start = testString.indexOf(groupMatch, match.index!);
          groups.push({
            index: i,
            match: groupMatch,
            start,
            end: start + groupMatch.length,
          });
        }
      }

      // Process named groups
      if (match.groups) {
        Object.entries(match.groups).forEach(([name, value]) => {
          if (value !== undefined) {
            namedGroups[name] = value;
            // Find the group and add the name
            const start = testString.indexOf(value, match!.index!);
            const existingGroup = groups.find(
              (g) => g.start === start && g.match === value,
            );
            if (existingGroup) {
              existingGroup.name = name;
            } else {
              groups.push({
                index: -1, // Named groups don't have numbered index
                match: value,
                start,
                end: start + value.length,
                name,
              });
            }
          }
        });
      }

      matches.push({
        match: match[0],
        index: match.index!,
        lastIndex: regex.lastIndex,
        groups,
        namedGroups,
      });

      // Prevent infinite loop on zero-length matches
      if (match[0] === "" && regex.lastIndex === match.index!) {
        regex.lastIndex++;
      }
    }
  } else {
    const match: RegExpExecArray | null = regex.exec(testString);
    if (match) {
      const groups: RegexGroup[] = [];
      const namedGroups: Record<string, string> = {};

      // Process numbered groups
      for (let i = 1; i < match.length; i++) {
        if (match[i] !== undefined) {
          const groupMatch = match[i];
          const start = testString.indexOf(groupMatch, match.index);
          groups.push({
            index: i,
            match: groupMatch,
            start,
            end: start + groupMatch.length,
          });
        }
      }

      // Process named groups
      if (match.groups) {
        Object.entries(match.groups).forEach(([name, value]) => {
          if (value !== undefined) {
            namedGroups[name] = value;
            const start = testString.indexOf(value, match.index);
            const existingGroup = groups.find(
              (g) => g.start === start && g.match === value,
            );
            if (existingGroup) {
              existingGroup.name = name;
            } else {
              groups.push({
                index: -1,
                match: value,
                start,
                end: start + value.length,
                name,
              });
            }
          }
        });
      }

      matches.push({
        match: match[0],
        index: match.index,
        lastIndex: match.index + match[0].length,
        groups,
        namedGroups,
      });
    }
  }

  return matches;
}

export function explainRegex(pattern: string): RegexExplanation[] {
  const explanations: RegexExplanation[] = [];
  let pos = 0;

  const explainToken = (
    token: string,
    type: RegexExplanation["type"],
    description: string,
    start: number,
    end: number,
  ) => {
    explanations.push({ type, value: token, description, start, end });
  };

  while (pos < pattern.length) {
    const char = pattern[pos];
    const start = pos;

    switch (char) {
      case "^":
        explainToken(char, "anchor", "Start of string/line", start, pos + 1);
        break;
      case "$":
        explainToken(char, "anchor", "End of string/line", start, pos + 1);
        break;
      case ".":
        explainToken(
          char,
          "character-class",
          "Any character except newline",
          start,
          pos + 1,
        );
        break;
      case "*":
        explainToken(
          char,
          "quantifier",
          "Match zero or more repetitions",
          start,
          pos + 1,
        );
        break;
      case "+":
        explainToken(
          char,
          "quantifier",
          "Match one or more repetitions",
          start,
          pos + 1,
        );
        break;
      case "?":
        explainToken(
          char,
          "quantifier",
          "Match zero or one occurrence (optional)",
          start,
          pos + 1,
        );
        break;
      case "\\":
        if (pos + 1 < pattern.length) {
          const nextChar = pattern[pos + 1];
          const escapeSequence = char + nextChar;
          explainToken(
            escapeSequence,
            "escape",
            getEscapeDescription(nextChar),
            start,
            pos + 2,
          );
          pos++; // Skip the next character
        } else {
          explainToken(char, "literal", `Literal "${char}"`, start, pos + 1);
        }
        break;
      case "[":
        // Character class
        const classEnd = findMatchingBracket(pattern, pos);
        if (classEnd !== -1) {
          const charClass = pattern.slice(pos, classEnd + 1);
          explainToken(
            charClass,
            "character-class",
            `Match ${explainCharacterClass(charClass)}`,
            start,
            classEnd + 1,
          );
          pos = classEnd;
        } else {
          explainToken(char, "literal", `Literal "${char}"`, start, pos + 1);
        }
        break;
      case "(":
        // Group
        const groupEnd = findMatchingParen(pattern, pos);
        if (groupEnd !== -1) {
          const group = pattern.slice(pos, groupEnd + 1);
          const groupType = getGroupType(group);
          explainToken(group, "group", groupType, start, groupEnd + 1);
          pos = groupEnd;
        } else {
          explainToken(char, "literal", `Literal "${char}"`, start, pos + 1);
        }
        break;
      case "{":
        // Quantifier
        const quantEnd = findMatchingBrace(pattern, pos);
        if (quantEnd !== -1) {
          const quantifier = pattern.slice(pos, quantEnd + 1);
          explainToken(
            quantifier,
            "quantifier",
            `Repeat ${quantifier}`,
            start,
            quantEnd + 1,
          );
          pos = quantEnd;
        } else {
          explainToken(char, "literal", `Literal "${char}"`, start, pos + 1);
        }
        break;
      case "|":
        explainToken(char, "assertion", "Alternation (OR)", start, pos + 1);
        break;
      default:
        explainToken(char, "literal", `Literal "${char}"`, start, pos + 1);
        break;
    }
    pos++;
  }

  return explanations;
}

function getEscapeDescription(char: string): string {
  const escapes: Record<string, string> = {
    d: "Digit (0-9)",
    D: "Non-digit",
    w: "Word character (a-zA-Z0-9_)",
    W: "Non-word character",
    s: "Whitespace character",
    S: "Non-whitespace character",
    n: "Newline",
    r: "Carriage return",
    t: "Tab",
    b: "Word boundary",
    B: "Non-word boundary",
    f: "Form feed",
    v: "Vertical tab",
    "0": "Null character",
  };

  return escapes[char] || `Escaped "${char}"`;
}

function findMatchingBracket(pattern: string, start: number): number {
  let depth = 0;
  for (let i = start; i < pattern.length; i++) {
    if (pattern[i] === "[") depth++;
    if (pattern[i] === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findMatchingParen(pattern: string, start: number): number {
  let depth = 0;
  for (let i = start; i < pattern.length; i++) {
    if (pattern[i] === "(") depth++;
    if (pattern[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findMatchingBrace(pattern: string, start: number): number {
  for (let i = start; i < pattern.length; i++) {
    if (pattern[i] === "}") return i;
  }
  return -1;
}

function getGroupType(group: string): string {
  if (group.startsWith("(?:")) {
    const content = group.slice(3, -1);
    return `Non-capturing group containing: ${summarizeGroupContent(content)}`;
  }
  if (group.startsWith("(?=")) return "Positive lookahead";
  if (group.startsWith("(?!")) return "Negative lookahead";
  if (group.startsWith("(?<=")) return "Positive lookbehind";
  if (group.startsWith("(?<!")) return "Negative lookbehind";
  if (group.startsWith("(?<")) {
    const nameEnd = group.indexOf('>', 3);
    if (nameEnd > 0) {
      const name = group.slice(3, nameEnd);
      const content = group.slice(nameEnd + 1, -1);
      return `Named capturing group "${name}" containing: ${summarizeGroupContent(content)}`;
    }
    return "Named capturing group";
  }

  // Regular capturing group - explain what's inside
  const content = group.slice(1, -1);
  return `Capturing group containing: ${summarizeGroupContent(content)}`;
}

function summarizeGroupContent(content: string): string {
  if (content.includes('|')) {
    return summarizeAlternation(content);
  }

  const charClassWithQuantifierMatch = content.match(/^(\[.+?\])([*+?]?)(.*)$/);
  if (charClassWithQuantifierMatch) {
    return summarizeCharacterClassWithQuantifier(charClassWithQuantifierMatch);
  }

  if (content.match(/^\[.+\]$/)) {
    return explainCharacterClass(content);
  }

  return isSimpleLiteral(content) ? `"${content}"` : `"${content}"`;
}

function summarizeAlternation(content: string): string {
  const alternatives = content.split('|');

  if (alternatives.length === 2) {
    return summarizeBinaryAlternation(alternatives);
  }

  return summarizeMultipleAlternatives(alternatives);
}

function summarizeBinaryAlternation(alternatives: string[]): string {
  const [alt1, alt2] = alternatives.map(alt => alt.trim());

  if (isHyphenAndCharacterClass(alt1, alt2)) {
    return `either a hyphen (-) or ${explainCharacterClass(alt2)}`;
  }

  return `either "${alt1}" or "${alt2}"`;
}

function summarizeMultipleAlternatives(alternatives: string[]): string {
  const quotedAlternatives = alternatives.map(alt => `"${alt.trim()}"`).join(', ');
  return `one of ${alternatives.length} alternatives: ${quotedAlternatives}`;
}

function summarizeCharacterClassWithQuantifier(match: RegExpMatchArray): string {
  const [, charClass, quantifier, rest] = match;
  let explanation = explainCharacterClass(charClass);

  if (quantifier) {
    explanation += getQuantifierDescription(quantifier);
  }

  if (rest) {
    explanation += ` followed by "${rest}"`;
  }

  return explanation;
}

function isHyphenAndCharacterClass(alt1: string, alt2: string): boolean {
  return alt1 === '-' && /^\[.+\]$/.test(alt2);
}

function isSimpleLiteral(content: string): boolean {
  return content.length <= 10 && !/[\\.*+?^${}()|[\]]/.test(content);
}

function getQuantifierDescription(quantifier: string): string {
  const quantifierMap: Record<string, string> = {
    '+': ' (one or more)',
    '*': ' (zero or more)',
    '?': ' (optional)'
  };
  return quantifierMap[quantifier] || '';
}

function explainCharacterClass(charClass: string): string {
  const inside = charClass.slice(1, -1);

  // Handle negated character classes
  if (inside.startsWith('^')) {
    const negatedContent = inside.slice(1);
    return `any character except ${explainCharacterClassContent(negatedContent)}`;
  }

  return explainCharacterClassContent(inside);
}

function explainCharacterClassContent(content: string): string {
  const commonPatterns = getCommonCharacterClassPatterns();

  if (commonPatterns.has(content)) {
    return commonPatterns.get(content)!;
  }

  const rangeMatch = content.match(/^([a-z])-([a-z])$|^([A-Z])-([A-Z])$|^([0-9])-([0-9])$/);
  if (rangeMatch) {
    return describeCharacterRange(rangeMatch, content);
  }

  if (isSimpleCharacterList(content)) {
    return describeSimpleCharacterList(content);
  }

  return `characters matching [${content}]`;
}

function getCommonCharacterClassPatterns(): Map<string, string> {
  return new Map([
    ['a-z', 'lowercase letters'],
    ['A-Z', 'uppercase letters'],
    ['0-9', 'digits'],
    ['a-zA-Z', 'letters'],
    ['a-zA-Z0-9', 'alphanumeric characters'],
    ['A-Za-z0-9', 'alphanumeric characters'],
    ['0-9a-fA-F', 'hexadecimal digits']
  ]);
}

function describeCharacterRange(rangeMatch: RegExpMatchArray, content: string): string {
  if (rangeMatch[1] && rangeMatch[2]) {
    return `letters from ${content[0]} to ${content[2]}`;
  }
  if (rangeMatch[3] && rangeMatch[4]) {
    return `uppercase letters from ${content[0]} to ${content[2]}`;
  }
  if (rangeMatch[5] && rangeMatch[6]) {
    return `digits from ${content[0]} to ${content[2]}`;
  }
  return `characters matching [${content}]`;
}

function isSimpleCharacterList(content: string): boolean {
  return content.length <= 5 && !content.includes('-') && !content.includes('\\');
}

function describeSimpleCharacterList(content: string): string {
  const chars = content.split('').map(c => `"${c}"`);

  if (chars.length === 1) {
    return chars[0];
  }

  if (chars.length === 2) {
    return `${chars[0]} or ${chars[1]}`;
  }

  return `one of ${chars.join(', ')}`;
}

// =============================================================================
// AST Parser - Builds a structured tree from regex patterns
// =============================================================================

interface ParseContext {
  pattern: string;
  pos: number;
}

export function parseRegexToAST(pattern: string): RegexNode {
  if (!pattern) {
    return { type: "root", children: [] };
  }

  const ctx: ParseContext = { pattern, pos: 0 };
  const children = parseSequence(ctx, null);

  return {
    type: "root",
    children,
    position: { start: 0, end: pattern.length },
  };
}

function parseSequence(ctx: ParseContext, stopChar: string | null): RegexNode[] {
  const nodes: RegexNode[] = [];
  let currentAlternatives: RegexNode[][] | null = null;

  while (ctx.pos < ctx.pattern.length) {
    const char = ctx.pattern[ctx.pos];

    // Stop at closing paren or end
    if (stopChar && char === stopChar) {
      break;
    }

    // Handle alternation
    if (char === "|") {
      if (!currentAlternatives) {
        currentAlternatives = [nodes.slice()];
        nodes.length = 0;
      } else {
        currentAlternatives.push(nodes.slice());
        nodes.length = 0;
      }
      ctx.pos++;
      continue;
    }

    const node = parseNode(ctx);
    if (node) {
      nodes.push(node);
    }
  }

  // Handle alternation
  if (currentAlternatives) {
    currentAlternatives.push(nodes);
    return [
      {
        type: "alternation",
        children: currentAlternatives.map((alt) => ({
          type: "sequence" as const,
          children: alt,
        })),
      },
    ];
  }

  return nodes;
}

function parseNode(ctx: ParseContext): RegexNode | null {
  const char = ctx.pattern[ctx.pos];
  const start = ctx.pos;

  let node: RegexNode | null = null;

  switch (char) {
    case "^":
      ctx.pos++;
      node = { type: "anchor", value: "^", position: { start, end: ctx.pos } };
      break;

    case "$":
      ctx.pos++;
      node = { type: "anchor", value: "$", position: { start, end: ctx.pos } };
      break;

    case ".":
      ctx.pos++;
      node = { type: "escape", value: ".", position: { start, end: ctx.pos } };
      break;

    case "\\":
      node = parseEscape(ctx);
      break;

    case "[":
      node = parseCharacterClass(ctx);
      break;

    case "(":
      node = parseGroup(ctx);
      break;

    case "{":
      // Quantifier without preceding element - treat as literal
      ctx.pos++;
      node = { type: "literal", value: "{", position: { start, end: ctx.pos } };
      break;

    case "*":
    case "+":
    case "?":
      // Quantifier without preceding element - treat as literal
      ctx.pos++;
      node = { type: "literal", value: char, position: { start, end: ctx.pos } };
      break;

    default:
      ctx.pos++;
      node = { type: "literal", value: char, position: { start, end: ctx.pos } };
      break;
  }

  // Check for quantifier
  if (node && ctx.pos < ctx.pattern.length) {
    const quantifier = tryParseQuantifier(ctx);
    if (quantifier) {
      node = {
        type: "quantified",
        children: [node],
        quantifier,
        position: { start, end: ctx.pos },
      };
    }
  }

  return node;
}

function parseEscape(ctx: ParseContext): RegexNode {
  const start = ctx.pos;
  ctx.pos++; // Skip backslash

  if (ctx.pos >= ctx.pattern.length) {
    return { type: "literal", value: "\\", position: { start, end: ctx.pos } };
  }

  const char = ctx.pattern[ctx.pos];

  // Handle \p{...} and \P{...} unicode properties
  if ((char === "p" || char === "P") && ctx.pattern[ctx.pos + 1] === "{") {
    const endBrace = ctx.pattern.indexOf("}", ctx.pos + 2);
    if (endBrace !== -1) {
      const value = ctx.pattern.slice(start, endBrace + 1);
      ctx.pos = endBrace + 1;
      return {
        type: "escape",
        value,
        position: { start, end: ctx.pos },
      };
    }
  }

  // Handle \xHH hex escapes
  if (char === "x") {
    const hex = ctx.pattern.slice(ctx.pos + 1, ctx.pos + 3);
    if (/^[0-9a-fA-F]{2}$/.test(hex)) {
      const value = ctx.pattern.slice(start, ctx.pos + 3);
      ctx.pos += 3;
      return {
        type: "escape",
        value,
        position: { start, end: ctx.pos },
      };
    }
  }

  // Handle \uHHHH unicode escapes
  if (char === "u") {
    if (ctx.pattern[ctx.pos + 1] === "{") {
      const endBrace = ctx.pattern.indexOf("}", ctx.pos + 2);
      if (endBrace !== -1) {
        const value = ctx.pattern.slice(start, endBrace + 1);
        ctx.pos = endBrace + 1;
        return {
          type: "escape",
          value,
          position: { start, end: ctx.pos },
        };
      }
    } else {
      const hex = ctx.pattern.slice(ctx.pos + 1, ctx.pos + 5);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        const value = ctx.pattern.slice(start, ctx.pos + 5);
        ctx.pos += 5;
        return {
          type: "escape",
          value,
          position: { start, end: ctx.pos },
        };
      }
    }
  }

  // Handle \k<name> named backreferences
  if (char === "k" && ctx.pattern[ctx.pos + 1] === "<") {
    const endAngle = ctx.pattern.indexOf(">", ctx.pos + 2);
    if (endAngle !== -1) {
      const value = ctx.pattern.slice(start, endAngle + 1);
      ctx.pos = endAngle + 1;
      return {
        type: "backreference",
        value,
        position: { start, end: ctx.pos },
      };
    }
  }

  ctx.pos++;
  return {
    type: "escape",
    value: "\\" + char,
    position: { start, end: ctx.pos },
  };
}

function parseCharacterClass(ctx: ParseContext): RegexNode {
  const start = ctx.pos;
  ctx.pos++; // Skip '['

  let negated = false;
  if (ctx.pos < ctx.pattern.length && ctx.pattern[ctx.pos] === "^") {
    negated = true;
    ctx.pos++;
  }

  // Find the closing bracket, handling escaped brackets
  while (ctx.pos < ctx.pattern.length) {
    if (ctx.pattern[ctx.pos] === "\\") {
      ctx.pos += 2; // Skip escaped character
    } else if (ctx.pattern[ctx.pos] === "]") {
      ctx.pos++;
      break;
    } else {
      ctx.pos++;
    }
  }

  const value = ctx.pattern.slice(start, ctx.pos);

  return {
    type: "character-class",
    value,
    negated,
    position: { start, end: ctx.pos },
  };
}

function parseGroup(ctx: ParseContext): RegexNode {
  const start = ctx.pos;
  ctx.pos++; // Skip '('

  let groupType: "capturing" | "non-capturing" | "named" = "capturing";
  let assertion: "positive" | "negative" | undefined;
  let direction: "ahead" | "behind" | undefined;
  let groupName: string | undefined;

  // Check for group modifiers
  if (ctx.pos < ctx.pattern.length && ctx.pattern[ctx.pos] === "?") {
    ctx.pos++;
    if (ctx.pos < ctx.pattern.length) {
      const modifier = ctx.pattern[ctx.pos];

      switch (modifier) {
        case ":":
          groupType = "non-capturing";
          ctx.pos++;
          break;
        case "=":
          assertion = "positive";
          direction = "ahead";
          ctx.pos++;
          break;
        case "!":
          assertion = "negative";
          direction = "ahead";
          ctx.pos++;
          break;
        case "<":
          ctx.pos++;
          if (ctx.pos < ctx.pattern.length) {
            const nextChar = ctx.pattern[ctx.pos];
            if (nextChar === "=") {
              assertion = "positive";
              direction = "behind";
              ctx.pos++;
            } else if (nextChar === "!") {
              assertion = "negative";
              direction = "behind";
              ctx.pos++;
            } else {
              // Named group: (?<name>...)
              groupType = "named";
              const nameEnd = ctx.pattern.indexOf(">", ctx.pos);
              if (nameEnd > ctx.pos) {
                groupName = ctx.pattern.slice(ctx.pos, nameEnd);
                ctx.pos = nameEnd + 1;
              }
            }
          }
          break;
      }
    }
  }

  // Parse children
  const children = parseSequence(ctx, ")");

  // Skip closing paren
  if (ctx.pos < ctx.pattern.length && ctx.pattern[ctx.pos] === ")") {
    ctx.pos++;
  }

  const node: RegexNode = {
    type: direction ? (direction === "ahead" ? "lookahead" : "lookbehind") : "group",
    children,
    position: { start, end: ctx.pos },
  };

  if (assertion) {
    node.assertion = assertion;
    node.direction = direction;
  }

  if (groupType !== "capturing" || groupName) {
    node.groupType = groupType;
    if (groupName) {
      node.groupName = groupName;
    }
  }

  return node;
}

function tryParseQuantifier(ctx: ParseContext): RegexQuantifier | null {
  const char = ctx.pattern[ctx.pos];

  let quantifier: RegexQuantifier | null = null;

  switch (char) {
    case "*":
      ctx.pos++;
      quantifier = { min: 0, max: null, greedy: true };
      break;
    case "+":
      ctx.pos++;
      quantifier = { min: 1, max: null, greedy: true };
      break;
    case "?":
      ctx.pos++;
      quantifier = { min: 0, max: 1, greedy: true };
      break;
    case "{":
      quantifier = parseBraceQuantifier(ctx);
      break;
  }

  // Check for lazy modifier
  if (quantifier && ctx.pos < ctx.pattern.length && ctx.pattern[ctx.pos] === "?") {
    quantifier.greedy = false;
    ctx.pos++;
  }

  return quantifier;
}

function parseBraceQuantifier(ctx: ParseContext): RegexQuantifier | null {
  const start = ctx.pos;
  ctx.pos++; // Skip '{'

  let numStr = "";
  while (ctx.pos < ctx.pattern.length && /\d/.test(ctx.pattern[ctx.pos])) {
    numStr += ctx.pattern[ctx.pos];
    ctx.pos++;
  }

  if (numStr === "") {
    ctx.pos = start;
    return null;
  }

  const min = parseInt(numStr, 10);
  let max: number | null = min;

  if (ctx.pos < ctx.pattern.length && ctx.pattern[ctx.pos] === ",") {
    ctx.pos++;
    let maxStr = "";
    while (ctx.pos < ctx.pattern.length && /\d/.test(ctx.pattern[ctx.pos])) {
      maxStr += ctx.pattern[ctx.pos];
      ctx.pos++;
    }
    max = maxStr === "" ? null : parseInt(maxStr, 10);
  }

  if (ctx.pos < ctx.pattern.length && ctx.pattern[ctx.pos] === "}") {
    ctx.pos++;
    return { min, max, greedy: true };
  }

  // Invalid brace quantifier, reset
  ctx.pos = start;
  return null;
}

// =============================================================================
// Natural Language Explanation Entry Point
// =============================================================================

import { explainRegexNaturally as generateNaturalExplanation } from "./naturalLanguageGenerator";

/**
 * Generates a human-readable, natural language explanation of a regex pattern.
 * Uses semantic analysis to understand the pattern's purpose rather than
 * just describing individual tokens.
 *
 * @example
 * explainRegexNaturally("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$")
 * // Returns: "Checks that the string contains at least one lowercase letter,
 * //          one uppercase letter, one digit, and is at least 8 characters long."
 */
export function explainRegexNaturally(pattern: string): string {
  if (!pattern) {
    return "No pattern to explain.";
  }

  try {
    const ast = parseRegexToAST(pattern);

    // Fidelity check: Verify reconstruction matches original (optional but helpful for debugging)
    // We don't block on this, but it ensures our parser/generator are in sync
    // In production, we might log this or just proceed if it's close enough
    try {
      const { astToString } = require("./semanticAnalyzer");
      const reconstructed = astToString(ast);
      if (reconstructed !== pattern) {
        console.warn(`AST reconstruction differs: "${reconstructed}" vs "${pattern}"`);
      }
    } catch {
      // Ignore errors in fidelity check
    }

    return generateNaturalExplanation(ast);
  } catch (error) {
    // Fallback to basic explanation if parsing fails
    return generateFallbackExplanation(pattern);
  }
}

function generateFallbackExplanation(pattern: string): string {
  const explanations = explainRegex(pattern);
  if (explanations.length === 0) {
    return "No pattern to explain.";
  }

  const parts = explanations.map((exp) => exp.description.toLowerCase());
  return "Matches: " + parts.join(", ") + ".";
}
