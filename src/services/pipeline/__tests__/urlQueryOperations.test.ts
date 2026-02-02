/**
 * Unit Tests for URL Query String Pipeline Operations
 *
 * Tests for url.json-to-querystring and url.querystring-to-json operations.
 */

import { executeSingleOperation } from "../pipelineExecutor";
// Import the urlparser pipelineOperations to register
import "../../../tablets/urlparser/pipelineOperations";

describe("URL Query String Pipeline Operations", () => {
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

    describe("url.json-to-querystring", () => {
        it("should convert simple JSON to query string", async () => {
            const result = await execute("url.json-to-querystring", '{"name":"John","age":"30"}', {
                includeQuestionMark: true
            });
            expect(result).toContain("?");
            expect(result).toContain("name=John");
            expect(result).toContain("age=30");
        });

        it("should handle without question mark", async () => {
            const result = await execute("url.json-to-querystring", '{"key":"value"}', {
                includeQuestionMark: false
            });
            expect(result).not.toContain("?");
            expect(result).toBe("key=value");
        });

        it("should encode special characters", async () => {
            const result = await execute("url.json-to-querystring", '{"text":"hello world"}', {
                encodeValues: true
            });
            expect(result).toContain("hello%20world");
        });

        it("should handle arrays with repeat format", async () => {
            const result = await execute("url.json-to-querystring", '{"ids":[1,2,3]}', {
                arrayFormat: "repeat",
                includeQuestionMark: false
            });
            expect(result).toContain("ids=1");
            expect(result).toContain("ids=2");
            expect(result).toContain("ids=3");
        });

        it("should handle arrays with brackets format", async () => {
            const result = await execute("url.json-to-querystring", '{"ids":[1,2]}', {
                arrayFormat: "brackets",
                includeQuestionMark: false
            });
            expect(result).toContain("ids[]=1");
            expect(result).toContain("ids[]=2");
        });

        it("should handle arrays with indices format", async () => {
            const result = await execute("url.json-to-querystring", '{"ids":[1,2]}', {
                arrayFormat: "indices",
                includeQuestionMark: false
            });
            expect(result).toContain("ids[0]=1");
            expect(result).toContain("ids[1]=2");
        });

        it("should handle arrays with comma format", async () => {
            const result = await execute("url.json-to-querystring", '{"ids":[1,2,3]}', {
                arrayFormat: "comma",
                includeQuestionMark: false
            });
            expect(result).toBe("ids=1,2,3");
        });

        it("should skip null values", async () => {
            const result = await execute("url.json-to-querystring", '{"a":"1","b":null}', {
                includeQuestionMark: false
            });
            expect(result).toBe("a=1");
        });

        it("should throw error for non-object input", async () => {
            await expect(execute("url.json-to-querystring", '[1,2,3]'))
                .rejects.toThrow(/must be.*object/i);
        });

        it("should handle empty input", async () => {
            const result = await execute("url.json-to-querystring", "");
            expect(result).toBe("");
        });
    });

    describe("url.querystring-to-json", () => {
        it("should convert simple query string to JSON", async () => {
            const result = await execute("url.querystring-to-json", "name=John&age=30");
            const json = JSON.parse(result);
            expect(json.name).toBe("John");
            expect(json.age).toBe(30);
        });

        it("should handle leading question mark", async () => {
            const result = await execute("url.querystring-to-json", "?key=value");
            const json = JSON.parse(result);
            expect(json.key).toBe("value");
        });

        it("should parse numbers when enabled", async () => {
            const result = await execute("url.querystring-to-json", "count=42", {
                parseNumbers: true
            });
            const json = JSON.parse(result);
            expect(json.count).toBe(42);
        });

        it("should keep numbers as strings when disabled", async () => {
            const result = await execute("url.querystring-to-json", "count=42", {
                parseNumbers: false
            });
            const json = JSON.parse(result);
            expect(json.count).toBe("42");
        });

        it("should parse booleans when enabled", async () => {
            const result = await execute("url.querystring-to-json", "active=true", {
                parseBooleans: true
            });
            const json = JSON.parse(result);
            expect(json.active).toBe(true);
        });

        it("should keep booleans as strings when disabled", async () => {
            const result = await execute("url.querystring-to-json", "active=true", {
                parseBooleans: false
            });
            const json = JSON.parse(result);
            expect(json.active).toBe("true");
        });

        it("should handle array notation with brackets", async () => {
            const result = await execute("url.querystring-to-json", "ids[]=1&ids[]=2");
            const json = JSON.parse(result);
            expect(json.ids).toEqual([1, 2]);
        });

        it("should handle array notation with indices", async () => {
            const result = await execute("url.querystring-to-json", "ids[0]=1&ids[1]=2");
            const json = JSON.parse(result);
            expect(json.ids).toEqual([1, 2]);
        });

        it("should handle duplicate keys as array", async () => {
            const result = await execute("url.querystring-to-json", "tag=a&tag=b&tag=c");
            const json = JSON.parse(result);
            expect(json.tag).toEqual(["a", "b", "c"]);
        });

        it("should decode URL-encoded values", async () => {
            const result = await execute("url.querystring-to-json", "text=hello%20world");
            const json = JSON.parse(result);
            expect(json.text).toBe("hello world");
        });

        it("should return minified JSON when indent is 0", async () => {
            const result = await execute("url.querystring-to-json", "a=1", { indent: 0 });
            expect(result).not.toContain("\n");
        });

        it("should return empty object for empty input", async () => {
            const result = await execute("url.querystring-to-json", "");
            expect(result).toBe("{}");
        });
    });
});
