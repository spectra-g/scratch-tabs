import {
  RegexMatch,
  RegexGroup,
  RegexFlag,
  RegexError,
  RegexExplanation,
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
          "Zero or more of the preceding element",
          start,
          pos + 1,
        );
        break;
      case "+":
        explainToken(
          char,
          "quantifier",
          "One or more of the preceding element",
          start,
          pos + 1,
        );
        break;
      case "?":
        explainToken(
          char,
          "quantifier",
          "Zero or one of the preceding element",
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
            `Character class: ${charClass}`,
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
  if (group.startsWith("(?:")) return "Non-capturing group";
  if (group.startsWith("(?=")) return "Positive lookahead";
  if (group.startsWith("(?!")) return "Negative lookahead";
  if (group.startsWith("(?<=")) return "Positive lookbehind";
  if (group.startsWith("(?<!")) return "Negative lookbehind";
  if (group.startsWith("(?<")) return "Named capturing group";
  return "Capturing group";
}
