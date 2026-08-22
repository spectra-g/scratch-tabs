import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/coreOperations";
import "../operations/dataFormats";

describe("Priority A Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    describe("text.normalize-unicode", () => {
        it("composes combining marks with NFC", async () => {
            const decomposed = "e\u0301";
            expect(await execute("text.normalize-unicode", decomposed)).toBe("\u00e9");
        });

        it("decomposes precomposed characters with NFD", async () => {
            const result = await execute("text.normalize-unicode", "\u00e9", { form: "NFD" });
            expect(result).toBe("e\u0301");
        });

        it("applies compatibility folding with NFKC", async () => {
            expect(await execute("text.normalize-unicode", "\uFB01", { form: "NFKC" })).toBe("fi");
        });

        it("applies compatibility decomposition with NFKD", async () => {
            expect(await execute("text.normalize-unicode", "\u2460", { form: "NFKD" })).toBe("1");
        });

        it("defaults to NFC", async () => {
            expect(await execute("text.normalize-unicode", "e\u0301")).toBe("\u00e9");
        });

        it("leaves already-normalized text unchanged", async () => {
            expect(await execute("text.normalize-unicode", "plain ascii")).toBe("plain ascii");
        });
    });

    describe("text.template", () => {
        it("substitutes simple placeholders", async () => {
            const result = await execute("text.template", "Hello, {{name}}!", {
                data: '{"name": "World"}',
            });
            expect(result).toBe("Hello, World!");
        });

        it("supports dot-path access to nested values", async () => {
            const result = await execute("text.template", "{{user.name}} <{{user.email}}>", {
                data: '{"user": {"name": "Ada", "email": "ada@example.com"}}',
            });
            expect(result).toBe("Ada <ada@example.com>");
        });

        it("is whitespace tolerant around placeholder names", async () => {
            expect(
                await execute("text.template", "{{  greeting }}", { data: '{"greeting": "hi"}' }),
            ).toBe("hi");
        });

        it("renders numbers and booleans as strings", async () => {
            const result = await execute("text.template", "{{n}} {{flag}}", {
                data: '{"n": 42, "flag": true}',
            });
            expect(result).toBe("42 true");
        });

        it("JSON-stringifies object values", async () => {
            const result = await execute("text.template", "{{obj}}", {
                data: '{"obj": {"a": 1}}',
            });
            expect(result).toBe('{"a":1}');
        });

        it("keeps unknown placeholders by default", async () => {
            expect(await execute("text.template", "{{missing}}", { data: "{}" })).toBe(
                "{{missing}}",
            );
        });

        it("replaces unknown placeholders with empty string when configured", async () => {
            expect(
                await execute("text.template", "a{{missing}}b", { data: "{}", missing: "empty" }),
            ).toBe("ab");
        });

        it("throws on invalid JSON variables", async () => {
            await expect(execute("text.template", "{{x}}", { data: "{not json}" })).rejects.toThrow(
                /valid JSON/i,
            );
        });

        it("throws when variables are not a JSON object", async () => {
            await expect(execute("text.template", "{{x}}", { data: "[1,2]" })).rejects.toThrow(
                /object/i,
            );
        });

        it("handles templates without any placeholders", async () => {
            expect(await execute("text.template", "no vars here", { data: "{}" })).toBe(
                "no vars here",
            );
        });
    });

    describe("text.remove-comments", () => {
        it("strips C-style line comments while preserving strings", async () => {
            const code = 'const url = "http://example.com"; // trailing comment';
            expect(await execute("text.remove-comments", code)).toBe(
                'const url = "http://example.com"; ',
            );
        });

        it("strips C-style block comments", async () => {
            const code = "const a = 1; /* block\ncomment */ const b = 2;";
            const result = await execute("text.remove-comments", code);
            expect(result).not.toContain("comment");
            expect(result).toContain("const a = 1;");
            expect(result).toContain("const b = 2;");
        });

        it("preserves line structure across removed block comments", async () => {
            const code = "a;\n/*\nmulti\nline\n*/\nb;";
            const result = await execute("text.remove-comments", code);
            expect(result.split("\n")).toHaveLength(6);
            expect(result.split("\n")[0]).toBe("a;");
            expect(result.split("\n")[5]).toBe("b;");
            expect(result).not.toContain("multi");
        });

        it("does not strip comments inside string literals", async () => {
            const code = 'const s = "// not a comment /* also not */";';
            expect(await execute("text.remove-comments", code)).toBe(code);
        });

        it("handles escaped quotes inside strings", async () => {
            const code = `const s = "quote \\" then // still string"; // real`;
            const result = await execute("text.remove-comments", code);
            expect(result).toContain("// still string");
            expect(result).not.toContain("real");
        });

        it("does not mangle URLs containing double slashes outside strings", async () => {
            const code = "const x = 1; // note";
            expect(await execute("text.remove-comments", code)).toBe("const x = 1; ");
        });

        it("strips hash comments when selected", async () => {
            const script = 'echo "hello # not a comment" # real comment\nls -la';
            const result = await execute("text.remove-comments", script, { styles: ["hash"] });
            expect(result).toContain("# not a comment");
            expect(result).not.toContain("real comment");
        });

        it("strips SQL line comments when selected", async () => {
            const sql = "SELECT 1; -- fetch one\nSELECT 2;";
            const result = await execute("text.remove-comments", sql, { styles: ["sql"] });
            expect(result).toBe("SELECT 1; \nSELECT 2;");
        });

        it("strips HTML/XML comments when selected", async () => {
            const html = "<div><!-- hidden --><p>visible</p></div>";
            const result = await execute("text.remove-comments", html, { styles: ["html"] });
            expect(result).toBe("<div><p>visible</p></div>");
        });

        it("removes leftover blank lines when squeeze is enabled", async () => {
            const code = "line1\n// gone\nline3";
            expect(await execute("text.remove-comments", code, { squeeze: true })).toBe(
                "line1\nline3",
            );
        });

        it("keeps blank lines by default", async () => {
            const code = "line1\n// gone\nline3";
            const result = await execute("text.remove-comments", code);
            expect(result).toBe("line1\n\nline3");
        });

        it("strips unterminated block comment to end of input", async () => {
            const code = "code(); /* never closed...";
            expect(await execute("text.remove-comments", code)).toBe("code(); ");
        });

        it("returns input unchanged for non-comment source", async () => {
            const code = "const x = 1 + 2;";
            expect(await execute("text.remove-comments", code)).toBe(code);
        });
    });

    describe("json.to-type-definition", () => {
        it("generates a TypeScript interface from a flat object", async () => {
            const result = await execute("json.to-type-definition", '{"name":"Ada","age":36}', {});
            expect(result).toContain("export interface Root {");
            expect(result).toContain('"name": string;');
            expect(result).toContain('"age": number;');
            expect(result).toMatch(/}\s*$/);
        });

        it("generates nested named interfaces", async () => {
            const result = await execute(
                "json.to-type-definition",
                '{"user":{"name":"Ada"},"active":true}',
            );
            expect(result).toContain("export interface Root {");
            expect(result).toContain('"user": User;');
            expect(result).toContain("export interface User {");
            expect(result).toContain('"name": string;');
            expect(result).not.toContain("export type Root");
        });

        it("singularizes array element type names", async () => {
            const result = await execute(
                "json.to-type-definition",
                '{"items":[{"id":1},{"id":2}]}',
            );
            expect(result).toContain("export interface Item {");
            expect(result).toContain('"items": Item[];');
        });

        it("marks nullable fields optional in TypeScript by default", async () => {
            const result = await execute(
                "json.to-type-definition",
                '{"nickname":null,"name":"Ada"}',
            );
            expect(result).toContain('"nickname"?:');
            expect(result).toContain('"name": string;');
        });

        it("emits union-with-null when optionality is disabled", async () => {
            const result = await execute(
                "json.to-type-definition",
                '{"nickname":null}',
                { optionalNullable: false },
            );
            expect(result).toContain('"nickname": unknown | null;');
        });

        it("merges heterogeneous array elements into one shape", async () => {
            const result = await execute(
                "json.to-type-definition",
                '[{"id":1,"extra":"x"},{"id":2}]',
            );
            expect(result).toContain('"id": number;');
            expect(result).toContain('"extra"?: string;');
        });

        it("widens conflicting types to unknown", async () => {
            const result = await execute(
                "json.to-type-definition",
                '[{"v":1},{"v":"str"}]',
            );
            expect(result).toContain('"v": unknown;');
        });

        it("generates Go structs with JSON tags", async () => {
            const result = await execute(
                "json.to-type-definition",
                '{"userName":"ada","age":36}',
                { language: "go" },
            );
            expect(result).toContain("type Root struct {");
            expect(result).toMatch(/UserName\s+string\s+`json:"userName"`/);
            expect(result).toMatch(/Age\s+float64\s+`json:"age"`/);
        });

        it("uses pointers and omitempty for nullable Go fields", async () => {
            const result = await execute(
                "json.to-type-definition",
                '{"note":null}',
                { language: "go" },
            );
            expect(result).toMatch(/Note\s+\*any\s+`json:"note,omitempty"`/);
        });

        it("generates Python TypedDicts with Optional for nulls", async () => {
            const result = await execute(
                "json.to-type-definition",
                '{"name":"Ada","tags":["x"],"note":null}',
                { language: "python" },
            );
            expect(result).toContain("from typing import Any, Optional");
            expect(result).toContain("class Root(TypedDict):");
            expect(result).toContain('"name": str');
            expect(result).toContain('"tags": list[str]');
            expect(result).toContain('"note": Optional[Any]');
        });

        it("generates Rust structs with Option for nulls and serde rename", async () => {
            const result = await execute(
                "json.to-type-definition",
                '{"firstName":"Ada","age":36}',
                { language: "rust" },
            );
            expect(result).toContain('#[derive(Debug, Clone, Serialize, Deserialize)]');
            expect(result).toContain("pub struct Root {");
            expect(result).toContain('#[serde(rename = "firstName")]');
            expect(result).toContain("first_name: String,");
            expect(result).toContain("age: f64,");
        });

        it("respects a custom root name", async () => {
            const result = await execute(
                "json.to-type-definition",
                '{"a":1}',
                { rootName: "Payload" },
            );
            expect(result).toContain("export interface Payload {");
        });

        it("aliases scalar roots", async () => {
            expect(await execute("json.to-type-definition", '"just a string"')).toBe(
                "export type Root = string;",
            );
            expect(await execute("json.to-type-definition", "[1,2,3]")).toBe(
                "export type Root = number[];",
            );
        });

        it("throws on invalid JSON", async () => {
            await expect(execute("json.to-type-definition", "{broken")).rejects.toThrow(
                /Invalid JSON/i,
            );
        });

        it("throws on unsupported language", async () => {
            await expect(
                execute("json.to-type-definition", "{}", { language: "cobol" }),
            ).rejects.toThrow(/Unsupported language/i);
        });
    });
});
