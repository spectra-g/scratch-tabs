import { executeSingleOperation } from "@/services/pipeline/pipelineExecutor";
import "@/formats/json/pipelineOperations";

describe("json.sortKeys pipeline operation", () => {
    const execute = async (
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation("json.sortKeys", input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    it("sorts top-level keys alphabetically (deep by default)", async () => {
        expect(Object.keys(JSON.parse(await execute('{"z":1,"a":2,"m":3}')))).toEqual(["a", "m", "z"]);
    });

    it("sorts nested keys recursively in deep mode", async () => {
        const parsed = JSON.parse(await execute('{"z":{"b":2,"a":1},"a":{"d":4,"c":3}}', { mode: "deep" }));
        expect(Object.keys(parsed)).toEqual(["a", "z"]);
        expect(Object.keys(parsed.a)).toEqual(["c", "d"]);
        expect(Object.keys(parsed.z)).toEqual(["a", "b"]);
    });

    it("does not sort nested keys in shallow mode", async () => {
        const parsed = JSON.parse(await execute('{"z":{"b":2,"a":1},"a":{"d":4,"c":3}}', { mode: "shallow" }));
        expect(Object.keys(parsed)).toEqual(["a", "z"]);
        expect(Object.keys(parsed.z)).toEqual(["b", "a"]);
        expect(Object.keys(parsed.a)).toEqual(["d", "c"]);
    });

    it("produces minified output when output=minified", async () => {
        expect(await execute('{"b":2,"a":1}', { output: "minified" })).toBe('{"a":1,"b":2}');
    });

    it("uses custom indent size", async () => {
        expect(await execute('{"b":2,"a":1}', { output: "pretty", indent: 4 })).toContain("    ");
    });

    it("handles arrays by preserving element order", async () => {
        const parsed = JSON.parse(await execute('{"b":[3,1,2],"a":1}'));
        expect(Object.keys(parsed)).toEqual(["a", "b"]);
        expect(parsed.b).toEqual([3, 1, 2]);
    });

    it("handles arrays of objects in deep mode", async () => {
        const parsed = JSON.parse(await execute('{"items":[{"z":1,"a":2}]}', { mode: "deep" }));
        expect(Object.keys(parsed.items[0])).toEqual(["a", "z"]);
    });

    it("throws on invalid JSON input", async () => {
        await expect(execute("{invalid}")).rejects.toThrow();
    });

    it("handles empty object", async () => {
        expect(JSON.parse(await execute("{}"))).toEqual({});
    });
});
