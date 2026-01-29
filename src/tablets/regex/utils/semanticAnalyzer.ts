import { RegexNode, SemanticUnit } from "../types";

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

  for (const child of children) {
    // Skip .* or .+ patterns (quantified dots)
    if (child.type === "quantified" && child.children) {
      const innerChild = child.children[0];
      if (innerChild?.type === "escape" && innerChild?.value === ".") {
        continue; // This is .* or .+, skip it
      }
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

  return "the specified pattern";
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

  // Check for vowels
  if (content === "aeiou" || content === "aeiouAEIOU") {
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
    ".": "any character",
  };
  return escapes[value] || value;
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
      const requirements: string[] = [];
      const lookaheads = getLookaheads(ast);
      const negativeLookaheads = getNegativeLookaheads(ast);

      for (const la of lookaheads) {
        const target = describeLookaheadTarget(la);
        requirements.push(`contains at least one ${target}`);
      }

      for (const la of negativeLookaheads) {
        const target = describeLookaheadTarget(la);
        requirements.push(`does not contain ${target}`);
      }

      const length = extractLengthRequirement(ast);
      if (length) {
        requirements.push(`is ${length} long`);
      }

      if (requirements.length === 0) {
        return "Validates a string with multiple requirements.";
      }

      return `Checks that the string ${formatListNatural(requirements, "and")}.`;
    },
  },

  // Email pattern - must have @ followed by domain with .
  {
    name: "email",
    matcher: (ast) => {
      const str = astToString(ast);
      // Must have @ and a dot for domain, and word characters
      return str.includes("@") &&
             str.includes(".") &&
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
      return (
        anchors.start &&
        anchors.end &&
        str.includes("\\d{2}") &&
        str.includes("\\d{4}") &&
        str.includes("/")
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
      if (!anchors.start || !anchors.end || !str.includes("-") || str.includes("(")) {
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
function astToString(node: RegexNode): string {
  if (node.value) {
    return node.value;
  }
  if (node.children) {
    let result = node.children.map(astToString).join("");
    if (node.quantifier) {
      const { min, max } = node.quantifier;
      if (min === 0 && max === null) result += "*";
      else if (min === 1 && max === null) result += "+";
      else if (min === 0 && max === 1) result += "?";
      else if (max === null) result += `{${min},}`;
      else if (min === max) result += `{${min}}`;
      else result += `{${min},${max}}`;
    }
    return result;
  }
  return "";
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
    default:
      return null;
  }
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

function analyzeAlternation(node: RegexNode): SemanticUnit {
  const alternatives = (node.children || []).map((seq) => {
    if (seq.type === "sequence" && seq.children) {
      // Collect literals without extra quotes
      return seq.children.map((c) => {
        if (c.type === "literal") {
          return c.value || "";
        }
        return describeNodeNatural(c);
      }).join("");
    }
    if (seq.type === "literal") {
      return seq.value || "";
    }
    return describeNodeNatural(seq);
  });

  if (alternatives.length === 2) {
    return {
      type: "match",
      description: `'${alternatives[0]}' or '${alternatives[1]}'`,
    };
  }

  return {
    type: "match",
    description: formatListNatural(alternatives.map((a) => `'${a}'`), "or"),
  };
}

function describeNodeNatural(node: RegexNode | null | undefined): string {
  if (!node) return "unknown";

  switch (node.type) {
    case "literal":
      return `'${node.value || ""}'`;
    case "escape":
      return describeEscapeNatural(node.value || "");
    case "character-class":
      return describeCharacterClassNatural(node.value || "", node.negated);
    case "quantified":
      return describeNodeNatural((node.children || [])[0]);
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
