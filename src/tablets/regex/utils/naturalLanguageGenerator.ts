import { RegexNode, SemanticUnit } from "../types";
import {
  analyzeSemantics,
  tryMatchPattern,
  formatListNatural,
} from "./semanticAnalyzer";

// =============================================================================
// Natural Language Generation from Semantic Units
// =============================================================================

export function generateNaturalLanguage(
  ast: RegexNode,
  semanticUnits: SemanticUnit[]
): string {
  // Try pattern matching first
  const patternMatch = tryMatchPattern(ast);
  if (patternMatch) {
    return patternMatch;
  }

  // Fallback to semantic analysis
  return generateFromSemanticUnits(semanticUnits);
}

function generateFromSemanticUnits(
  units: SemanticUnit[]
): string {
  if (units.length === 0) {
    return "No pattern to explain.";
  }

  const requirements = units.filter((u) => u.type === "requirement");
  const prohibitions = units.filter((u) => u.type === "prohibition");
  const constraints = units.filter((u) => u.type === "constraint");
  const anchors = units.filter((u) => u.type === "anchor");
  const matches = units.filter((u) => u.type === "match");
  const captures = units.filter((u) => u.type === "capture");

  const parts: string[] = [];

  // Check for full-string matching
  const hasStartAnchor = anchors.some((a) =>
    a.description.includes("start")
  );
  const hasEndAnchor = anchors.some((a) => a.description.includes("end"));
  const isFullStringMatch = hasStartAnchor && hasEndAnchor;

  // Build the sentence
  if (requirements.length > 0 || prohibitions.length > 0) {
    // Validation-style pattern
    const allReqs = [
      ...requirements.map((r) => r.description),
      ...prohibitions.map((p) => p.description),
    ];

    const reqPart = formatListNatural(allReqs, "and");

    if (constraints.length > 0) {
      const constraintPart = formatListNatural(constraints.map((c) => c.description), "and");
      parts.push(`Checks that the string ${reqPart}, and then ensures it ${constraintPart}`);
    } else if (matches.length > 0) {
      const matchPart = combineMatchDescriptions(matches.map(m => m.description));
      parts.push(`Checks that the string ${reqPart}, and then matches ${matchPart}`);
    } else {
      parts.push(`Checks that the string ${reqPart}`);
    }
  } else if (matches.length > 0) {
    // Match-style pattern
    const matchDescs = matches.map((m) => m.description);

    if (isFullStringMatch && matchDescs.length > 0) {
      // Full string match
      const combined = combineMatchDescriptions(matchDescs);
      parts.push(`Matches ${combined}`);
    } else if (matchDescs.length > 0) {
      const combined = combineMatchDescriptions(matchDescs);
      parts.push(`Matches ${combined}`);
    }

    if (constraints.length > 0) {
      parts.push(formatListNatural(constraints.map((c) => c.description), "and"));
    }
  } else if (constraints.length > 0) {
    parts.push(
      `Matches a string that ${formatListNatural(
        constraints.map((c) => c.description),
        "and"
      )}`
    );
  }

  // Add capture information
  if (captures.length > 0) {
    const captureDescs = captures
      .filter((c) => c.description !== "captured")
      .map((c) => c.description);
    if (captureDescs.length > 0) {
      parts.push(`with ${formatListNatural(captureDescs, "and")}`);
    }
  }

  let result = parts.join(", ");

  // Ensure proper ending
  if (result && !result.endsWith(".")) {
    result += ".";
  }

  // Capitalize first letter
  if (result) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result || "No pattern to explain.";
}

function combineMatchDescriptions(descriptions: string[]): string {
  if (descriptions.length === 0) return "";
  if (descriptions.length === 1) return descriptions[0];

  // Try to combine consecutive literals
  const combined: string[] = [];
  let currentLiteral = "";

  for (const desc of descriptions) {
    if (desc.startsWith("'") && desc.endsWith("'")) {
      currentLiteral += desc.slice(1, -1);
    } else {
      if (currentLiteral) {
        combined.push(`'${currentLiteral}'`);
        currentLiteral = "";
      }
      combined.push(desc);
    }
  }

  if (currentLiteral) {
    combined.push(`'${currentLiteral}'`);
  }

  if (combined.length === 1) {
    return combined[0];
  }

  // Join with appropriate connectors
  return combined.join(" followed by ");
}

// =============================================================================
// Special Case Handlers
// =============================================================================

// (describeOptionalPattern was unused and removed)

// =============================================================================
// Utility Functions for Common Descriptions
// =============================================================================

export function describeQuantifierNatural(
  min: number,
  max: number | null
): string {
  if (min === 0 && max === null) {
    return "zero or more";
  }
  if (min === 1 && max === null) {
    return "one or more";
  }
  if (min === 0 && max === 1) {
    return "optional";
  }
  if (max === null) {
    return `${min} or more`;
  }
  if (min === max) {
    return `exactly ${min}`;
  }
  return `${min} to ${max}`;
}

export function describeCharacterClassHuman(
  content: string,
  negated: boolean
): string {
  // Common patterns
  const patterns: Record<string, string> = {
    "a-z": "lowercase letter",
    "A-Z": "uppercase letter",
    "0-9": "digit",
    "a-zA-Z": "letter",
    "A-Za-z": "letter",
    "a-zA-Z0-9": "letter or digit",
    "0-9a-zA-Z": "letter or digit",
    "\\w": "word character",
    "\\d": "digit",
    "\\s": "whitespace",
  };

  const desc = patterns[content];
  if (desc) {
    return negated ? `non-${desc}` : desc;
  }

  // Check for vowels
  if (/^[aeiouAEIOU]+$/.test(content)) {
    return negated ? "consonant" : "vowel";
  }

  // Simple character list
  if (content.length <= 3 && !/[-\\]/.test(content)) {
    const chars = content.split("");
    return negated
      ? `any character except ${formatListNatural(
        chars.map((c) => `'${c}'`),
        "or"
      )}`
      : formatListNatural(
        chars.map((c) => `'${c}'`),
        "or"
      );
  }

  return negated ? `any character not in [${content}]` : `character in [${content}]`;
}

// =============================================================================
// Main Export Function
// =============================================================================

export function explainRegexNaturally(
  ast: RegexNode
): string {
  // Handle empty pattern
  if (!ast.children || ast.children.length === 0) {
    return "No pattern to explain.";
  }

  // Check for empty string match
  const children = ast.children;
  if (
    children.length === 2 &&
    children[0].type === "anchor" &&
    children[0].value === "^" &&
    children[1].type === "anchor" &&
    children[1].value === "$"
  ) {
    return "Matches an empty string.";
  }

  // Analyze semantics
  const semanticUnits = analyzeSemantics(ast);

  // Generate natural language
  return generateNaturalLanguage(ast, semanticUnits);
}
