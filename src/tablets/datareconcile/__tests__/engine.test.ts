import { reconcile } from "../engine";
import { ReconcileInput } from "../types";

const input = (a: string, b: string, overrides: Partial<ReconcileInput["options"]> = {}): ReconcileInput => ({
  a, b, options: { mode: "line", normalization: { trim: true, ignoreCase: false, collapseWhitespace: false }, scopeA: { kind: "all" }, scopeB: { kind: "all" }, keyPairs: [], ...overrides },
});

describe("reconcile", () => {
  it("matches unordered lines and preserves duplicate occurrences", () => {
    const result = reconcile(input("one\ntwo\none", "one\nthree"));
    expect(result.inBoth).toHaveLength(1);
    expect(result.onlyA.map((row) => row.text)).toEqual(["two", "one"]);
    expect(result.onlyB.map((row) => row.text)).toEqual(["three"]);
  });

  it("applies normalisation and regex scopes", () => {
    const result = reconcile(input(" Alpha   beta \nignore", "alpha beta", {
      normalization: { trim: true, ignoreCase: true, collapseWhitespace: true },
      scopeA: { kind: "matching", pattern: "Alpha" },
    }));
    expect(result.inBoth).toHaveLength(1);
    expect(result.onlyA).toHaveLength(0);
  });

  it("reports invalid regex scopes as actionable errors", () => {
    expect(() => reconcile(input("a", "a", { scopeA: { kind: "matching", pattern: "[" } }))).toThrow("scope regular expression");
  });

  it("compares CSV rows by independently mapped key columns and reports changed fields", () => {
    const result = reconcile(input("email,name,role\na@example.com,Ada,admin\nb@example.com,Bob,user", "user_email,name,role\nb@example.com,Bob,editor\na@example.com,Ada,admin\nc@example.com,Cia,user", {
      mode: "csv", keyPairs: [{ a: "email", b: "user_email" }],
    }));
    expect(result.inBoth).toHaveLength(1);
    expect(result.changed).toHaveLength(1);
    expect(result.changed[0].differences).toEqual([{ column: "role", a: "user", b: "editor" }]);
    expect(result.onlyB.map((row) => row.values?.user_email)).toEqual(["c@example.com"]);
  });

  it("validates malformed or ambiguous CSV headers", () => {
    expect(() => reconcile(input("email,email\na,b", "email\na", { mode: "csv" }))).toThrow("duplicate header");
  });

  it("treats non-key columns present on only one CSV source as changes", () => {
    const result = reconcile(input("id,name,extra\n1,Ada,yes", "id,name\n1,Ada", { mode: "csv", keyPairs: [{ a: "id", b: "id" }] }));
    expect(result.changed[0].differences).toEqual([{ column: "extra", a: "yes", b: "" }]);
  });

  it("supports set semantics when requested", () => {
    const result = reconcile(input("same\nsame", "same\nsame", { treatDuplicatesAsOne: true }));
    expect(result.inBoth).toHaveLength(1);
    expect(result.onlyA).toHaveLength(0);
    expect(result.onlyB).toHaveLength(0);
  });
});
