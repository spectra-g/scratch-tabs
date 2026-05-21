import {
  parseToState,
  serializeState,
  sortAlphabetically,
  groupByPrefix,
  removeDuplicates,
  stripComments,
  removeExtraBlankLines,
  removeAllBlankLines,
  validateState,
  toJson,
  toShellExport,
  toDockerFlags,
  DotenvPair,
} from "../dotenvParser";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pairs(state: ReturnType<typeof parseToState>): DotenvPair[] {
  return state.filter((l) => l.type === "PAIR") as DotenvPair[];
}

function commentTexts(state: ReturnType<typeof parseToState>): string[] {
  return state.filter((l) => l.type === "COMMENT").map((l) => (l as { text: string }).text);
}

// ─── parseToState ─────────────────────────────────────────────────────────────

describe("parseToState", () => {
  it("parses PAIR, COMMENT, and BLANK lines", () => {
    const state = parseToState("# header\nAPP=test\n\nDB=val");
    expect(state[0].type).toBe("COMMENT");
    expect(state[1].type).toBe("PAIR");
    expect(state[2].type).toBe("BLANK");
    expect(state[3].type).toBe("PAIR");
  });

  it("parses export prefix", () => {
    const state = parseToState("export KEY=value\nNORMAL=x");
    const kv = state[0] as DotenvPair;
    expect(kv.hasExport).toBe(true);
    expect(kv.key).toBe("KEY");
    expect(kv.value).toBe("value");
  });

  it("strips quotes from values", () => {
    const state = parseToState('A="hello"\nB=\'world\'');
    expect((state[0] as DotenvPair).value).toBe("hello");
    expect((state[1] as DotenvPair).value).toBe("world");
    expect((state[0] as DotenvPair).rawValue).toBe('"hello"');
  });

  it("marks secret keys", () => {
    const state = parseToState("API_KEY=abc\nNAME=public");
    expect((state[0] as DotenvPair).isSecret).toBe(true);
    expect((state[1] as DotenvPair).isSecret).toBe(false);
  });

  it("infers value types", () => {
    const state = parseToState(
      "URL=https://example.com\nFLAG=true\nPORT=3000\nNAME=app",
    );
    const types = (state.filter((l) => l.type === "PAIR") as DotenvPair[]).map((p) => p.valueType);
    expect(types).toEqual(["url", "boolean", "number", "string"]);
  });
});

// ─── serializeState ───────────────────────────────────────────────────────────

describe("serializeState", () => {
  it("round-trips a simple file", () => {
    const original = "# comment\nAPP=test\n\nDB=val";
    const state = parseToState(original);
    expect(serializeState(state)).toBe(original);
  });

  it("preserves export prefix", () => {
    const state = parseToState("export KEY=value");
    expect(serializeState(state)).toBe("export KEY=value");
  });

  it("preserves quoted values", () => {
    const state = parseToState('APP="my app"');
    expect(serializeState(state)).toBe('APP="my app"');
  });
});

// ─── sortAlphabetically ───────────────────────────────────────────────────────

describe("sortAlphabetically", () => {
  it("sorts keys alphabetically within a flat file", () => {
    const state = parseToState("ZZZ=z\nAAA=a\nMMM=m");
    const sorted = sortAlphabetically(state);
    expect(pairs(sorted).map((p) => p.key)).toEqual(["AAA", "MMM", "ZZZ"]);
  });

  it("keeps comments with the block that follows them", () => {
    const content = `# section B
BETA=b
BAR=bar

# section A
ALPHA=a
APPLE=apple`;
    const state = parseToState(content);
    const sorted = sortAlphabetically(state);
    // Within each section, keys should be sorted; sections should stay separate
    const p = pairs(sorted);
    expect(p[0].key).toBe("BAR");
    expect(p[1].key).toBe("BETA");
    expect(p[2].key).toBe("ALPHA");
    expect(p[3].key).toBe("APPLE");
    // Comments should still be present
    expect(commentTexts(sorted)).toHaveLength(2);
  });

  it("removes consecutive blank lines", () => {
    const state = parseToState("A=1\n\n\n\nB=2");
    const sorted = sortAlphabetically(state);
    const blanks = sorted.filter((l) => l.type === "BLANK");
    expect(blanks.length).toBeLessThanOrEqual(1);
  });
});

// ─── groupByPrefix ────────────────────────────────────────────────────────────

describe("groupByPrefix", () => {
  it("groups variables by first prefix component", () => {
    const state = parseToState("DB_HOST=localhost\nAPP_NAME=test\nDB_PORT=5432\nAPP_PORT=3000");
    const grouped = groupByPrefix(state);
    const p = pairs(grouped);
    // APP_NAME, APP_PORT should be adjacent; DB_HOST, DB_PORT should be adjacent
    const appIdx = p.findIndex((x) => x.key.startsWith("APP_"));
    const dbIdx = p.findIndex((x) => x.key.startsWith("DB_"));
    expect(p[appIdx + 1].key.startsWith("APP_")).toBe(true);
    expect(p[dbIdx + 1].key.startsWith("DB_")).toBe(true);
  });

  it("generates group comment headers", () => {
    const state = parseToState("DB_HOST=localhost\nAPP_NAME=test");
    const grouped = groupByPrefix(state);
    const comments = commentTexts(grouped);
    expect(comments.some((c) => c.includes("APP"))).toBe(true);
    expect(comments.some((c) => c.includes("DB"))).toBe(true);
  });

  it("preserves global header comments", () => {
    const state = parseToState("# Global header\nDB_HOST=localhost\nAPP_NAME=test");
    const grouped = groupByPrefix(state);
    expect(commentTexts(grouped)[0]).toBe("# Global header");
  });
});

// ─── removeDuplicates ─────────────────────────────────────────────────────────

describe("removeDuplicates", () => {
  it("removes earlier occurrences of a duplicate key", () => {
    const state = parseToState("KEY=first\nOTHER=x\nKEY=second");
    const deduped = removeDuplicates(state);
    const kept = pairs(deduped).filter((p) => p.key === "KEY");
    expect(kept).toHaveLength(1);
    expect(kept[0].value).toBe("second");
  });

  it("keeps non-duplicate keys untouched", () => {
    const state = parseToState("A=1\nB=2\nC=3");
    const deduped = removeDuplicates(state);
    expect(pairs(deduped)).toHaveLength(3);
  });

  it("preserves comments adjacent to non-duplicate lines", () => {
    const state = parseToState("# comment\nA=1\nB=2");
    const deduped = removeDuplicates(state);
    expect(commentTexts(deduped)).toHaveLength(1);
  });

  it("handles triple duplicates — keeps only the last", () => {
    const state = parseToState("K=1\nK=2\nK=3");
    const deduped = removeDuplicates(state);
    const kept = pairs(deduped).filter((p) => p.key === "K");
    expect(kept).toHaveLength(1);
    expect(kept[0].value).toBe("3");
  });
});

// ─── stripComments ────────────────────────────────────────────────────────────

describe("stripComments", () => {
  it("removes all COMMENT lines", () => {
    const state = parseToState("# header\nAPP=test\n# another\nDB=val");
    const stripped = stripComments(state);
    expect(commentTexts(stripped)).toHaveLength(0);
    expect(pairs(stripped)).toHaveLength(2);
  });

  it("does not remove PAIR or BLANK lines", () => {
    const state = parseToState("A=1\n\nB=2");
    const stripped = stripComments(state);
    expect(stripped.filter((l) => l.type === "PAIR")).toHaveLength(2);
  });
});

// ─── removeExtraBlankLines ────────────────────────────────────────────────────

describe("removeExtraBlankLines", () => {
  it("collapses consecutive blank lines to one", () => {
    const state = parseToState("A=1\n\n\n\nB=2");
    const result = removeExtraBlankLines(state);
    const blanks = result.filter((l) => l.type === "BLANK");
    expect(blanks).toHaveLength(1);
    expect(pairs(result)).toHaveLength(2);
  });

  it("leaves a single blank line untouched", () => {
    const state = parseToState("A=1\n\nB=2");
    const result = removeExtraBlankLines(state);
    expect(result.filter((l) => l.type === "BLANK")).toHaveLength(1);
  });

  it("preserves all pairs and comments", () => {
    const state = parseToState("# h\n\n\nA=1\n\n\n\nB=2");
    const result = removeExtraBlankLines(state);
    expect(pairs(result)).toHaveLength(2);
    expect(commentTexts(result)).toHaveLength(1);
  });
});

// ─── removeAllBlankLines ──────────────────────────────────────────────────────

describe("removeAllBlankLines", () => {
  it("removes all blank lines", () => {
    const state = parseToState("A=1\n\nB=2\n\n\nC=3");
    const result = removeAllBlankLines(state);
    expect(result.filter((l) => l.type === "BLANK")).toHaveLength(0);
    expect(pairs(result)).toHaveLength(3);
  });

  it("keeps pairs and comments", () => {
    const state = parseToState("# comment\n\nA=1\n\nB=2");
    const result = removeAllBlankLines(state);
    expect(commentTexts(result)).toHaveLength(1);
    expect(pairs(result)).toHaveLength(2);
  });
});

// ─── validateState ────────────────────────────────────────────────────────────

describe("validateState", () => {
  it("detects duplicate keys", () => {
    const state = parseToState("KEY=a\nKEY=b\nOTHER=c");
    const v = validateState(state);
    expect(v.duplicateKeys).toContain("KEY");
    expect(v.duplicateKeys).not.toContain("OTHER");
  });

  it("detects empty values", () => {
    const state = parseToState("KEY=\nFULL=value");
    const v = validateState(state);
    expect(v.emptyValues).toContain("KEY");
    expect(v.emptyValues).not.toContain("FULL");
  });

  it("returns empty arrays when file is valid", () => {
    const state = parseToState("A=1\nB=2\nC=3");
    const v = validateState(state);
    expect(v.duplicateKeys).toHaveLength(0);
    expect(v.emptyValues).toHaveLength(0);
  });
});

// ─── converters ───────────────────────────────────────────────────────────────

describe("toJson", () => {
  it("outputs valid JSON with all key-value pairs", () => {
    const state = parseToState("APP=test\nPORT=3000");
    const json = JSON.parse(toJson(state));
    expect(json.APP).toBe("test");
    expect(json.PORT).toBe("3000");
  });

  it("ignores comments and blanks", () => {
    const state = parseToState("# comment\nA=1\n\nB=2");
    const json = JSON.parse(toJson(state));
    expect(Object.keys(json)).toHaveLength(2);
  });

  it("uses unquoted values", () => {
    const state = parseToState('APP="My Application"');
    const json = JSON.parse(toJson(state));
    expect(json.APP).toBe("My Application");
  });
});

describe("toShellExport", () => {
  it("wraps every value in export KEY=… format", () => {
    const state = parseToState("APP=test\nPORT=3000");
    const shell = toShellExport(state);
    expect(shell).toContain('export APP="test"');
    expect(shell).toContain('export PORT="3000"');
  });

  it("escapes double quotes in values", () => {
    const state = parseToState('MSG=say "hello"');
    const shell = toShellExport(state);
    expect(shell).toContain('\\"hello\\"');
  });
});

describe("toDockerFlags", () => {
  it("outputs -e KEY=VALUE flags", () => {
    const state = parseToState("APP=test\nPORT=3000");
    const flags = toDockerFlags(state);
    expect(flags).toContain('-e APP="test"');
    expect(flags).toContain('-e PORT="3000"');
  });
});
