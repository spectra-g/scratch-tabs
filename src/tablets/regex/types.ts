export interface RegexFlag {
  flag: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface RegexMatch {
  match: string;
  index: number;
  lastIndex: number;
  groups: RegexGroup[];
  namedGroups: Record<string, string>;
}

export interface RegexGroup {
  index: number;
  match: string;
  start: number;
  end: number;
  name?: string;
}

export interface RegexSnippet {
  id: string;
  name: string;
  pattern: string;
  description: string;
  category: string;
}

export interface RegexExplanation {
  type:
    | "literal"
    | "group"
    | "quantifier"
    | "assertion"
    | "character-class"
    | "anchor"
    | "escape";
  value: string;
  description: string;
  start: number;
  end: number;
}

export interface RegexError {
  message: string;
  position?: number;
}

export interface DiffResult {
  name: string;
  regex1Matches: RegexMatch[];
  regex2Matches: RegexMatch[];
  differences: string[];
}

export interface RegexTesterData {
  pattern: string;
  testString: string;
  flags: RegexFlag[];
  matches: RegexMatch[];
  error: RegexError | null;
  explanation: RegexExplanation[];
  selectedSnippet: string | null;
  diffMode: boolean;
  diffPattern: string;
  diffName1: string;
  diffName2: string;
  diffResult: DiffResult | null;
  notes: string;
}

export type MatchMode = "first" | "all" | "multiline";
export type ViewMode = "test" | "explain" | "diff" | "export";

// AST Node Types for Semantic Regex Analysis
export type RegexNodeType =
  | "root"
  | "group"
  | "lookahead"
  | "lookbehind"
  | "alternation"
  | "sequence"
  | "quantified"
  | "character-class"
  | "literal"
  | "anchor"
  | "escape"
  | "backreference";

export interface RegexQuantifier {
  min: number;
  max: number | null; // null means unlimited
  greedy: boolean;
}

export interface RegexNode {
  type: RegexNodeType;
  children?: RegexNode[];
  value?: string;
  quantifier?: RegexQuantifier;
  groupType?: "capturing" | "non-capturing" | "named";
  groupName?: string;
  assertion?: "positive" | "negative";
  direction?: "ahead" | "behind";
  position?: { start: number; end: number };
  negated?: boolean; // For negated character classes
}

// Semantic Unit Types
export type SemanticUnitType =
  | "requirement" // must contain X
  | "prohibition" // must not contain X
  | "constraint" // length, format constraints
  | "anchor" // position constraint (start/end)
  | "match" // what the pattern matches
  | "capture"; // capturing group

export interface SemanticUnit {
  type: SemanticUnitType;
  description: string;
  subType?: string; // e.g., "contains", "length", "format"
}
