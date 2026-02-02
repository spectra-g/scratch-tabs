/**
 * Unit Tests for Data Format Pipeline Operations
 *
 * Tests for CSV/JSON conversion and Markdown table generation.
 */

import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/dataFormats";

describe("Data Format Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) {
            throw new Error(result.error);
        }
        return result.output;
    };

    describe("csv.to-json", () => {
        it("should convert simple CSV to JSON", async () => {
            const input = "name,age\nJohn,30\nJane,25";
            const result = await execute("csv.to-json", input, { hasHeaders: true });
            const json = JSON.parse(result);
            expect(json).toHaveLength(2);
            expect(json[0].name).toBe("John");
            expect(json[0].age).toBe(30);
        });

        it("should handle CSV without headers", async () => {
            const input = "John,30\nJane,25";
            const result = await execute("csv.to-json", input, { hasHeaders: false });
            const json = JSON.parse(result);
            expect(json[0].col0).toBe("John");
            expect(json[0].col1).toBe(30);
        });

        it("should handle quoted fields", async () => {
            const input = 'name,bio\nJohn,"Hello, World"';
            const result = await execute("csv.to-json", input, { hasHeaders: true });
            const json = JSON.parse(result);
            expect(json[0].bio).toBe("Hello, World");
        });

        it("should handle different delimiters", async () => {
            const input = "name;age\nJohn;30";
            const result = await execute("csv.to-json", input, { hasHeaders: true, delimiter: ";" });
            const json = JSON.parse(result);
            expect(json[0].name).toBe("John");
        });

        it("should parse booleans and nulls", async () => {
            const input = "active,value\ntrue,null";
            const result = await execute("csv.to-json", input, { hasHeaders: true });
            const json = JSON.parse(result);
            expect(json[0].active).toBe(true);
            expect(json[0].value).toBe(null);
        });

        it("should return minified JSON when indent is 0", async () => {
            const input = "name\nJohn";
            const result = await execute("csv.to-json", input, { hasHeaders: true, indent: 0 });
            expect(result).not.toContain("\n");
        });

        it("should handle empty input", async () => {
            const result = await execute("csv.to-json", "");
            expect(result).toBe("[]");
        });
    });

    describe("json.to-csv", () => {
        it("should convert JSON array to CSV", async () => {
            const input = '[{"name":"John","age":30},{"name":"Jane","age":25}]';
            const result = await execute("json.to-csv", input, { includeHeaders: true });
            expect(result).toContain("name");
            expect(result).toContain("age");
            expect(result).toContain("John");
            expect(result).toContain("30");
        });

        it("should handle nested objects with flattening", async () => {
            const input = '[{"user":{"name":"John"}}]';
            const result = await execute("json.to-csv", input, { flattenObjects: true });
            expect(result).toContain("user.name");
        });

        it("should handle different delimiters", async () => {
            const input = '[{"a":1,"b":2}]';
            const result = await execute("json.to-csv", input, { delimiter: ";" });
            expect(result).toContain(";");
        });

        it("should exclude headers when option disabled", async () => {
            const input = '[{"name":"John"}]';
            const result = await execute("json.to-csv", input, { includeHeaders: false });
            expect(result).not.toContain("name\n");
            expect(result).toBe("John");
        });

        it("should escape special characters", async () => {
            const input = '[{"text":"Hello, World"}]';
            const result = await execute("json.to-csv", input);
            expect(result).toContain('"Hello, World"');
        });

        it("should handle single object (not array)", async () => {
            const input = '{"name":"John","age":30}';
            const result = await execute("json.to-csv", input);
            expect(result).toContain("name");
            expect(result).toContain("John");
        });

        it("should handle null values", async () => {
            const input = '[{"name":null}]';
            const result = await execute("json.to-csv", input);
            expect(result).toContain("name\n");
        });
    });

    describe("csv.to-markdown", () => {
        it("should convert CSV to markdown table", async () => {
            const input = "name,age\nJohn,30\nJane,25";
            const result = await execute("csv.to-markdown", input);
            expect(result).toContain("| name | age |");
            expect(result).toContain("| --- | --- |");
            expect(result).toContain("| John | 30 |");
        });

        it("should handle left alignment", async () => {
            const input = "a,b\n1,2";
            const result = await execute("csv.to-markdown", input, { alignment: "left" });
            expect(result).toContain("| --- |");
        });

        it("should handle center alignment", async () => {
            const input = "a,b\n1,2";
            const result = await execute("csv.to-markdown", input, { alignment: "center" });
            expect(result).toContain("| :---: |");
        });

        it("should handle right alignment", async () => {
            const input = "a,b\n1,2";
            const result = await execute("csv.to-markdown", input, { alignment: "right" });
            expect(result).toContain("| ---: |");
        });

        it("should handle different delimiters", async () => {
            const input = "a;b\n1;2";
            const result = await execute("csv.to-markdown", input, { delimiter: ";" });
            expect(result).toContain("| a | b |");
        });

        it("should escape pipe characters in content", async () => {
            const input = "text\nvalue|with|pipes";
            const result = await execute("csv.to-markdown", input);
            expect(result).toContain("\\|");
        });
    });

    describe("json.to-markdown", () => {
        it("should convert JSON array to markdown table", async () => {
            const input = '[{"name":"John","age":30}]';
            const result = await execute("json.to-markdown", input);
            expect(result).toContain("| name | age |");
            expect(result).toContain("| John | 30 |");
        });

        it("should handle nested objects with flattening", async () => {
            const input = '[{"user":{"name":"John"}}]';
            const result = await execute("json.to-markdown", input, { flattenObjects: true });
            expect(result).toContain("user.name");
        });

        it("should handle different alignments", async () => {
            const input = '[{"a":1}]';
            const result = await execute("json.to-markdown", input, { alignment: "center" });
            expect(result).toContain(":---:");
        });

        it("should handle single object", async () => {
            const input = '{"name":"John"}';
            const result = await execute("json.to-markdown", input);
            expect(result).toContain("| name |");
        });

        it("should escape special markdown characters", async () => {
            const input = '[{"text":"value|pipe"}]';
            const result = await execute("json.to-markdown", input);
            expect(result).toContain("\\|");
        });

        it("should handle null values", async () => {
            const input = '[{"name":null}]';
            const result = await execute("json.to-markdown", input);
            expect(result).toContain("|  |");
        });
    });
});
