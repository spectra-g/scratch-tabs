import { RegexNode, SemanticUnit } from "../types";
import { describeQuantifierNatural } from "./naturalLanguageGenerator";

// =============================================================================
// Pattern Templates - Pre-written explanations for common patterns
// =============================================================================

interface PatternTemplate {
  name: string;
  matcher: (ast: RegexNode) => boolean;
  explain: (ast: RegexNode) => string;
}

// Common pattern detection helpers
function hasAnchors(ast: RegexNode): { start: boolean; end: boolean } {
  const children = ast.children || [];
  const start = children.length > 0 && children[0].type === "anchor" && children[0].value === "^";
  const end = children.length > 0 && children[children.length - 1].type === "anchor" && children[children.length - 1].value === "$";
  return { start, end };
}

function getLookaheads(ast: RegexNode): RegexNode[] {
  const children = ast.children || [];
  return children.filter((n) => n.type === "lookahead" && n.assertion === "positive");
}

function getNegativeLookaheads(ast: RegexNode): RegexNode[] {
  const children = ast.children || [];
  return children.filter((n) => n.type === "lookahead" && n.assertion === "negative");
}

function hasLengthRequirement(ast: RegexNode): boolean {
  const children = ast.children || [];
  return children.some(
    (n) =>
      n.type === "quantified" &&
      n.quantifier &&
      (n.quantifier.min > 0 || n.quantifier.max !== null)
  );
}

function extractLengthRequirement(ast: RegexNode): string | null {
  const children = ast.children || [];
  for (const child of children) {
    if (child.type === "quantified" && child.quantifier) {
      const { min, max } = child.quantifier;
      if (max === null && min > 0) {
        return `at least ${min} characters`;
      }
      if (max !== null && min === max) {
        return `exactly ${min} characters`;
      }
      if (max !== null) {
        return `between ${min} and ${max} characters`;
      }
    }
  }
  return null;
}

function describeLookaheadTarget(node: RegexNode): string {
  const children = node.children || [];

  // Collect all non-.* elements to describe
  const meaningfulElements: RegexNode[] = [];

  let hadDots = false;

  for (const child of children) {
    // Skip .* or .+ patterns (quantified dots)
    if (child.type === "quantified" && child.children) {
      const innerChild = child.children[0];
      if (innerChild?.type === "escape" && innerChild?.value === ".") {
        hadDots = true;
        continue; // This is .* or .+, skip it
      }
    }
    if (child.type === "escape" && child.value === ".") {
      hadDots = true;
      continue;
    }
    meaningfulElements.push(child);
  }

  // If we have meaningful elements, describe them
  if (meaningfulElements.length > 0) {
    // Check for character class
    const charClass = meaningfulElements.find((c) => c.type === "character-class");
    if (charClass) {
      return describeCharacterClassNatural(charClass.value || "", charClass.negated);
    }

    // Check for escape sequence (not .)
    const escape = meaningfulElements.find(
      (c) => c.type === "escape" && c.value !== "."
    );
    if (escape) {
      return describeEscapeNatural(escape.value || "");
    }

    // Collect all literals
    const literals = meaningfulElements
      .filter((c) => c.type === "literal")
      .map((c) => c.value || "")
      .join("");
    if (literals) {
      return `'${literals}'`;
    }

    // Check quantified elements
    for (const el of meaningfulElements) {
      if (el.type === "quantified" && el.children) {
        const innerChild = el.children[0];
        if (innerChild?.type === "character-class") {
          return describeCharacterClassNatural(innerChild.value || "", innerChild.negated);
        }
        if (innerChild?.type === "escape" && innerChild?.value !== ".") {
          return describeEscapeNatural(innerChild.value || "");
        }
        // Collect literals from quantified group
        const innerLiterals = el.children
          .filter((c) => c.type === "literal")
          .map((c) => c.value || "")
          .join("");
        if (innerLiterals) {
          return `'${innerLiterals}'`;
        }
      }
    }
  }

  return hadDots ? "any character" : "the specified pattern";
}

function describeCharacterClassNatural(value: string, negated?: boolean): string {
  // Remove brackets
  let content = value;
  if (content.startsWith("[") && content.endsWith("]")) {
    content = content.slice(1, -1);
  }
  if (content.startsWith("^")) {
    content = content.slice(1);
    negated = true;
  }

  if (content === "") {
    return negated ? "any character" : "nothing (empty class)";
  }

  const descriptions: Record<string, string> = {
    "a-z": "lowercase letter",
    "A-Z": "uppercase letter",
    "0-9": "digit",
    "a-zA-Z": "letter",
    "A-Za-z": "letter",
    "a-zA-Z0-9": "alphanumeric character",
    "A-Za-z0-9": "alphanumeric character",
    "a-zA-Z0-9_": "word character",
    "A-Za-z0-9_": "word character",
    "0-9a-fA-F": "hexadecimal digit",
    "a-fA-F0-9": "hexadecimal digit",
  };

  const desc = descriptions[content];
  if (desc) {
    return negated ? `non-${desc}` : desc;
  }

  // Check for common special character patterns (only if NOT letters/digits)
  if (!/[a-zA-Z0-9]/.test(content) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(content)) {
    return negated ? "non-special character" : "special character";
  }

  // Check for vowels (order-independent)
  const sortedContent = content.split("").sort().join("");
  if (sortedContent === "aeiou" || sortedContent === "AEIOUaeiou") {
    return negated ? "consonant" : "vowel";
  }

  // Check single characters
  if (content.length === 1) {
    return negated ? `any character except '${content}'` : `'${content}'`;
  }

  return negated ? `any character not in [${content}]` : `character in [${content}]`;
}

function describeEscapeNatural(value: string): string {
  const escapes: Record<string, string> = {
    "\\d": "digit",
    "\\D": "non-digit",
    "\\w": "word character",
    "\\W": "non-word character",
    "\\s": "whitespace",
    "\\S": "non-whitespace",
    "\\b": "word boundary",
    "\\B": "non-word boundary",
    "\\n": "newline",
    "\\r": "carriage return",
    "\\t": "tab",
    "\\v": "vertical tab",
    "\\f": "form feed",
    "\\0": "null character",
    ".": "any character",
  };

  if (escapes[value]) return escapes[value];

  // Handle control characters \cX
  if (value.startsWith("\\c") && value.length === 3) {
    return `control-${value[2].toUpperCase()}`;
  }

  // Handle hex and unicode escapes (simplified)
  if (value.startsWith("\\x") || value.startsWith("\\u")) {
    try {
      const hexPart = value.startsWith("\\x") ? value.substring(2) : value.substring(2).replace(/[\{\}]/g, "");
      const code = parseInt(hexPart, 16);
      if (!isNaN(code)) {
        const char = String.fromCharCode(code);
        // Normalize common printable characters
        if (/[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(char)) {
          return `'${char}'`;
        }
      }
    } catch {
      // Ignore errors in normalization
    }
    return value;
  }

  // Handle unicode property escapes \p{...}
  if (value.startsWith("\\p{") || value.startsWith("\\P{")) {
    return value;
  }

  return value;
}

// =============================================================================
// Pattern Templates
// =============================================================================

const patternTemplates: PatternTemplate[] = [
  // Password validation pattern
  {
    name: "password-validation",
    matcher: (ast) => {
      const lookaheads = getLookaheads(ast);
      return lookaheads.length >= 2 && hasLengthRequirement(ast);
    },
    explain: (ast) => {
      const lookaheads = getLookaheads(ast);
      const negativeLookaheads = getNegativeLookaheads(ast);
      const targets = lookaheads.map(describeLookaheadTarget);
      const negativeTargets = negativeLookaheads.map(describeLookaheadTarget);

      let parts: string[] = [];
      if (targets.length > 0) {
        parts.push(`contains at least one ${formatListNatural(targets, "and")}`);
      }
      if (negativeTargets.length > 0) {
        parts.push(`does not contain ${formatListNatural(negativeTargets, "and")}`);
      }

      if (parts.length === 0) {
        return "Validates a string with multiple requirements.";
      }

      let result = `Checks that the string ${formatListNatural(parts, "and")}`;

      const length = extractLengthRequirement(ast);
      if (length) {
        result += `, and then ensures it is ${length} long`;
      }

      return result + ".";
    },
  },

  // Email pattern - must have @ followed by domain with .
  {
    name: "email",
    matcher: (ast) => {
      const str = astToString(ast);
      // Traditional string matching check
      const hasAt = findLiteralInAST(ast, "@") ||
        findLiteralInAST(ast, "\\@") ||
        findLiteralInAST(ast, "\\x40") ||
        findLiteralInAST(ast, "\\u0040");
      const hasDot = str.includes(".");

      // Tighten: @ must not be the first thing (basic check for word chars before @)
      // We look for @ in various forms: @, \@, \x40, \u0040
      const atMatch = str.match(/@|\\@|\\x40|\\u0040/);
      const atIndex = atMatch ? atMatch.index || 0 : -1;
      const hasLeadingContent = atIndex > 0 && /[\w\.%+-]/.test(str.substring(0, atIndex));

      return hasAt &&
        hasDot &&
        hasLeadingContent &&
        (str.includes("\\w") || str.includes("[\\w")) &&
        !str.startsWith("(?<");  // Don't match lookbehinds like (?<=@)
    },
    explain: () => "Matches an email address format.",
  },

  // URL pattern
  {
    name: "url",
    matcher: (ast) => {
      const str = astToString(ast);
      return str.includes("http") && (str.includes("://") || str.includes(":\\/\\/"));
    },
    explain: (ast) => {
      const str = astToString(ast);
      if (str.includes("https?")) {
        return "Matches URLs starting with http:// or https://.";
      }
      if (str.includes("https")) {
        return "Matches URLs starting with https://.";
      }
      return "Matches URLs starting with http://.";
    },
  },

  // Date patterns - must have the specific format YYYY-MM-DD (4-2-2)
  {
    name: "date-iso",
    matcher: (ast) => {
      const str = astToString(ast);
      const anchors = hasAnchors(ast);
      if (!anchors.start || !anchors.end || !str.includes("-")) {
        return false;
      }

      // Must have ONLY digits and dashes (no letters) to avoid false positives with product IDs
      if (hasLiteralLetters(ast)) {
        return false;
      }

      // Check for exactly 4-2-2 pattern (date) vs 3-2-4 pattern (SSN) or 3-3-4 (phone)
      const matches = str.match(/\\d\{(\d+)\}/g);
      if (!matches || matches.length !== 3) {
        return false;
      }
      const lengths = matches.map(m => parseInt(m.match(/\d+/)?.[0] || "0"));
      // ISO date: 4-2-2
      return lengths[0] === 4 && lengths[1] === 2 && lengths[2] === 2;
    },
    explain: () => "Matches a date in YYYY-MM-DD format.",
  },

  {
    name: "date-us",
    matcher: (ast) => {
      const str = astToString(ast);
      const anchors = hasAnchors(ast);
      if (!anchors.start || !anchors.end || !str.includes("/") || hasLiteralLetters(ast)) {
        return false;
      }
      return (
        str.includes("\\d{2}") &&
        str.includes("\\d{4}")
      );
    },
    explain: () => "Matches a date in MM/DD/YYYY format.",
  },

  // Time pattern
  {
    name: "time",
    matcher: (ast) => {
      const str = astToString(ast);
      const anchors = hasAnchors(ast);
      return anchors.start && anchors.end && str.includes("\\d{2}") && str.includes(":");
    },
    explain: (ast) => {
      const str = astToString(ast);
      if (str.includes("?") || str.includes("(")) {
        return "Matches a time in HH:MM or HH:MM:SS format.";
      }
      if ((str.match(/:/g) || []).length >= 2) {
        return "Matches a time in HH:MM:SS format.";
      }
      return "Matches a time in HH:MM format.";
    },
  },

  // SSN pattern - must come before phone pattern
  {
    name: "ssn",
    matcher: (ast) => {
      const str = astToString(ast);
      const anchors = hasAnchors(ast);
      if (!anchors.start || !anchors.end || !str.includes("-")) {
        return false;
      }

      // Tighten SSN to avoid false positives (should be mostly digits and dashes)
      if (hasLiteralLetters(ast)) {
        return false;
      }

      const matches = str.match(/\\d\{(\d+)\}/g);
      if (!matches || matches.length !== 3) {
        return false;
      }
      const lengths = matches.map(m => parseInt(m.match(/\d+/)?.[0] || "0"));
      // SSN: 3-2-4
      return lengths[0] === 3 && lengths[1] === 2 && lengths[2] === 4;
    },
    explain: () => "Matches a US Social Security Number format.",
  },

  // US Phone patterns
  {
    name: "phone-dashes",
    matcher: (ast) => {
      const str = astToString(ast);
      const anchors = hasAnchors(ast);
      if (!anchors.start || !anchors.end || !str.includes("-") || str.includes("(") || hasLiteralLetters(ast)) {
        return false;
      }
      const matches = str.match(/\\d\{(\d+)\}/g);
      if (!matches || matches.length !== 3) {
        return false;
      }
      const lengths = matches.map(m => parseInt(m.match(/\d+/)?.[0] || "0"));
      // Phone: 3-3-4
      return lengths[0] === 3 && lengths[1] === 3 && lengths[2] === 4;
    },
    explain: () => "Matches a US phone number in XXX-XXX-XXXX format.",
  },

  {
    name: "phone-parens",
    matcher: (ast) => {
      const str = astToString(ast);
      const anchors = hasAnchors(ast);
      return (
        anchors.start &&
        anchors.end &&
        str.includes("\\d{3}") &&
        str.includes("\\d{4}") &&
        (str.includes("(") || str.includes("\\("))
      );
    },
    explain: () => "Matches a US phone number in (XXX) XXX-XXXX format.",
  },

  // Simple exact match
  {
    name: "exact-match",
    matcher: (ast) => {
      const anchors = hasAnchors(ast);
      const children = (ast.children || []).filter(
        (c) => c.type !== "anchor"
      );
      return (
        anchors.start &&
        anchors.end &&
        children.every((c) => c.type === "literal")
      );
    },
    explain: (ast) => {
      const literals = (ast.children || [])
        .filter((c) => c.type === "literal")
        .map((c) => c.value)
        .join("");
      return `Matches exactly '${literals}'.`;
    },
  },

  // Simple literal (no anchors)
  {
    name: "simple-literal",
    matcher: (ast) => {
      const children = ast.children || [];
      return children.every((c) => c.type === "literal");
    },
    explain: (ast) => {
      const text = (ast.children || []).map((c) => c.value).join("");
      return `Matches the literal text '${text}'.`;
    },
  },
];

// Helper to convert AST back to string for pattern matching
export function astToString(node: RegexNode): string {
  if (node.value && node.type !== "character-class") {
    return node.value;
  }

  let result = "";

  if (node.type === "character-class") {
    result = node.value || "";
  } else if (node.type === "alternation") {
    result = (node.children || []).map(astToString).join("|");
  } else if (node.type === "group" || node.type === "lookahead" || node.type === "lookbehind") {
    let prefix = "(";
    if (node.type === "lookahead") {
      prefix += node.assertion === "positive" ? "?=" : "?!";
    } else if (node.type === "lookbehind") {
      prefix += node.assertion === "positive" ? "?<=" : "?<!";
    } else if (node.groupType === "non-capturing") {
      prefix += "?:";
    } else if (node.groupType === "named" && node.groupName) {
      prefix += `?<${node.groupName}>`;
    }
    result = prefix + (node.children || []).map(astToString).join("") + ")";
  } else if (node.children) {
    result = node.children.map(astToString).join("");
  }

  if (node.quantifier) {
    const { min, max, greedy } = node.quantifier;
    if (min === 0 && max === null) result += "*";
    else if (min === 1 && max === null) result += "+";
    else if (min === 0 && max === 1) result += "?";
    else if (max === null) result += `{${min},}`;
    else if (min === max) result += `{${min}}`;
    else result += `{${min},${max}}`;

    if (greedy === false) {
      result += "?";
    }
  }

  return result;
}

/**
 * Traverses the AST to find if there are any literal letters.
 * This is used to prevent false positives in strict numeric patterns.
 * It ignores letters used in escape sequences (\d, \w) or group names.
 */
export function hasLiteralLetters(node: RegexNode): boolean {
  if (node.type === "literal" && /[a-zA-Z]/.test(node.value || "")) {
    return true;
  }

  if (node.type === "character-class") {
    // Check for letters in character class ranges/list
    // This is a bit simplified - ideally we'd parse the class content
    const content = node.value || "";
    if (/[a-zA-Z]/.test(content.replace(/\\d|\\s|\\w/g, ""))) {
      return true;
    }
  }

  if (node.children) {
    return node.children.some(child => hasLiteralLetters(child));
  }
  return false;
}

/**
 * Traverses the AST to find a literal node with the specified value.
 * This is more robust than string matching as it handles escaped vs unescaped
 * characters and character classes correctly.
 */
export function findLiteralInAST(node: RegexNode, value: string): boolean {
  if (node.type === "literal" && node.value === value) return true;
  if (node.type === "escape" && node.value === value) return true;

  // Also check inside character classes (if not negated)
  if (node.type === "character-class" && !node.negated && node.value?.includes(value)) {
    return true;
  }

  if (node.children) {
    return node.children.some(child => findLiteralInAST(child, value));
  }
  return false;
}

// =============================================================================
// Semantic Analysis
// =============================================================================

export function analyzeSemantics(ast: RegexNode): SemanticUnit[] {
  const units: SemanticUnit[] = [];
  const children = ast.children || [];

  for (const child of children) {
    const unit = analyzeNode(child);
    if (unit) {
      units.push(unit);
    }
  }

  return units;
}

function analyzeNode(node: RegexNode): SemanticUnit | null {
  switch (node.type) {
    case "anchor":
      return analyzeAnchor(node);
    case "lookahead":
      return analyzeLookahead(node);
    case "lookbehind":
      return analyzeLookbehind(node);
    case "quantified":
      return analyzeQuantified(node);
    case "character-class":
      return analyzeCharacterClass(node);
    case "escape":
      return analyzeEscape(node);
    case "literal":
      return analyzeLiteral(node);
    case "group":
      return analyzeGroup(node);
    case "alternation":
      return analyzeAlternation(node);
    case "backreference":
      return analyzeBackreference(node);
    default:
      return null;
  }
}

function analyzeBackreference(node: RegexNode): SemanticUnit {
  return { type: "match", description: node.value || "backreference" };
}

function analyzeAnchor(node: RegexNode): SemanticUnit {
  if (node.value === "^") {
    return { type: "anchor", description: "at the start of the string" };
  }
  if (node.value === "$") {
    return { type: "anchor", description: "at the end of the string" };
  }
  return { type: "anchor", description: "at a boundary" };
}

function analyzeLookahead(node: RegexNode): SemanticUnit {
  const target = describeLookaheadTarget(node);
  if (node.assertion === "negative") {
    return {
      type: "prohibition",
      description: `does not contain ${target}`,
      subType: "contains",
    };
  }
  return {
    type: "requirement",
    description: `contains at least one ${target}`,
    subType: "contains",
  };
}

function analyzeLookbehind(node: RegexNode): SemanticUnit {
  const target = describeLookaheadTarget(node);
  if (node.assertion === "negative") {
    return {
      type: "prohibition",
      description: `not preceded by ${target}`,
      subType: "preceded",
    };
  }
  return {
    type: "requirement",
    description: `preceded by ${target}`,
    subType: "preceded",
  };
}

function analyzeQuantified(node: RegexNode): SemanticUnit {
  const child = (node.children || [])[0];
  const { min, max } = node.quantifier || { min: 0, max: null };

  // .{n,} pattern at the end = length requirement
  if (child?.type === "escape" && child?.value === ".") {
    if (max === null && min > 0) {
      return {
        type: "constraint",
        description: `is at least ${min} characters long`,
        subType: "length",
      };
    }
    if (max !== null && min === max) {
      return {
        type: "constraint",
        description: `is exactly ${min} characters long`,
        subType: "length",
      };
    }
    if (max !== null) {
      return {
        type: "constraint",
        description: `is between ${min} and ${max} characters long`,
        subType: "length",
      };
    }
  }

  // Other quantified patterns
  const what = describeNodeNatural(child);
  if (max === null && min === 0) {
    return { type: "match", description: `zero or more ${what}` };
  }
  if (max === null && min === 1) {
    return { type: "match", description: `one or more ${what}` };
  }
  if (max === 1 && min === 0) {
    return { type: "match", description: `optional ${what}` };
  }
  if (max !== null && min === max) {
    return { type: "match", description: `exactly ${min} ${what}` };
  }
  if (max !== null) {
    return { type: "match", description: `${min} to ${max} ${what}` };
  }
  return { type: "match", description: `${min} or more ${what}` };
}

function analyzeCharacterClass(node: RegexNode): SemanticUnit {
  const desc = describeCharacterClassNatural(node.value || "", node.negated);
  return { type: "match", description: desc };
}

function analyzeEscape(node: RegexNode): SemanticUnit {
  const desc = describeEscapeNatural(node.value || "");
  return { type: "match", description: desc };
}

function analyzeLiteral(node: RegexNode): SemanticUnit {
  return { type: "match", description: `'${node.value}'` };
}

function analyzeGroup(node: RegexNode): SemanticUnit {
  // Analyze children first
  const childDescriptions = (node.children || [])
    .map((c) => analyzeNode(c))
    .filter(Boolean)
    .map((u) => u!.description);

  const childDesc = childDescriptions.length > 0 ? childDescriptions.join(" ") : "group";

  if (node.groupType === "named" && node.groupName) {
    return {
      type: "capture",
      description: `${childDesc} (captured as '${node.groupName}')`,
    };
  }
  if (node.groupType === "non-capturing") {
    return { type: "match", description: childDesc };
  }
  // Regular capturing group
  return { type: "match", description: childDesc };
}

function analyzeAlternationSequence(nodes: RegexNode[]): string {
  const descriptions: string[] = [];
  let currentLiteral = "";

  for (const node of nodes) {
    if (node.type === "anchor") continue;

    if (node.type === "literal") {
      currentLiteral += node.value || "";
    } else {
      if (currentLiteral) {
        descriptions.push(`'${currentLiteral}'`);
        currentLiteral = "";
      }
      descriptions.push(describeNodeNatural(node));
    }
  }

  if (currentLiteral) {
    descriptions.push(`'${currentLiteral}'`);
  }

  if (descriptions.length === 0) return "";
  if (descriptions.length === 1) return descriptions[0];

  // Join with "followed by" for mixed sequences
  return descriptions.join(" followed by ");
}

function analyzeAlternation(node: RegexNode): SemanticUnit {
  const alternatives = (node.children || []).map((seq) => {
    if (seq.type === "sequence" && seq.children) {
      const startAnchor = seq.children.find(c => c.type === "anchor" && c.value === "^");
      const endAnchor = seq.children.find(c => c.type === "anchor" && c.value === "$");

      const sequenceDesc = analyzeAlternationSequence(seq.children);

      if (startAnchor && endAnchor) return `${sequenceDesc} (full string match)`;
      if (startAnchor) return `${sequenceDesc} at the start of the string`;
      if (endAnchor) return `${sequenceDesc} at the end of the string`;
      return sequenceDesc;
    }

    // Fallback for single-node alternatives
    const desc = describeNodeNatural(seq);
    return desc.startsWith("'") || desc.includes(" ") ? desc : `'${desc}'`;
  });

  if (alternatives.length === 2) {
    return {
      type: "match",
      description: `${alternatives[0]} or ${alternatives[1]}`,
    };
  }

  return {
    type: "match",
    description: formatListNatural(alternatives, "or"),
  };
}

function describeNodeNatural(node: RegexNode | null | undefined): string {
  if (!node) return "unknown";

  switch (node.type) {
    case "anchor":
      if (node.value === "^") return "at the start of the string";
      if (node.value === "$") return "at the end of the string";
      return "at a boundary";
    case "literal":
      return `'${node.value || ""}'`;
    case "escape":
      return describeEscapeNatural(node.value || "");
    case "character-class":
      return describeCharacterClassNatural(node.value || "", node.negated);
    case "quantified":
      const childDesc = describeNodeNatural((node.children || [])[0]);
      if (node.quantifier) {
        const qDesc = describeQuantifierNatural(node.quantifier.min, node.quantifier.max);
        // If childDesc is already a phrase like "at the start", handle it
        if (childDesc.startsWith("at the")) return `${childDesc} (${qDesc})`;
        return `${qDesc} ${childDesc}`;
      }
      return childDesc;
    case "group":
      // Handle groups with alternation or sequence inside
      if (node.children && node.children.length > 0) {
        const child = node.children[0];
        if (child.type === "alternation") {
          const unit = analyzeAlternation(child);
          return unit.description;
        }
        // Collect all children as literals if possible
        const literals = node.children
          .filter((c) => c.type === "literal")
          .map((c) => c.value || "")
          .join("");
        if (literals) {
          return `'${literals}'`;
        }
      }
      return "group";
    case "alternation":
      const unit = analyzeAlternation(node);
      return unit.description;
    case "backreference":
      return node.value || "backreference";
    default:
      return node.value || "pattern";
  }
}

// =============================================================================
// Main Export
// =============================================================================

export function tryMatchPattern(ast: RegexNode): string | null {
  for (const template of patternTemplates) {
    if (template.matcher(ast)) {
      return template.explain(ast);
    }
  }
  return null;
}

export function formatListNatural(
  items: string[],
  conjunction: "and" | "or"
): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items[items.length - 1]}`;
}
