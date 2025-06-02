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
  type: 'literal' | 'group' | 'quantifier' | 'assertion' | 'character-class' | 'anchor' | 'escape';
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

export type MatchMode = 'first' | 'all' | 'multiline';
export type ViewMode = 'test' | 'explain' | 'diff' | 'export'; 