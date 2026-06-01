import { executeSingleOperation } from "@/services/pipeline/pipelineExecutor";
import "@/formats/json/pipelineOperations";

describe("json.merge pipeline operation", () => {
    const execute = async (
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation("json.merge", input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    // ── Flat object merging ───────────────────────────────────────────────────

    it("second document wins on key conflict", async () => {
        const result = JSON.parse(await execute('{"a":1,"b":2}', { patch: '{"b":99,"c":3}' }));
        expect(result).toEqual({ a: 1, b: 99, c: 3 });
    });

    it("adds keys present in patch but absent in base", async () => {
        const result = JSON.parse(await execute('{"a":1}', { patch: '{"b":2}' }));
        expect(result).toEqual({ a: 1, b: 2 });
    });

    it("preserves base keys not present in patch", async () => {
        const result = JSON.parse(await execute('{"a":1,"b":2}', { patch: '{"c":3}' }));
        expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it("empty patch returns base object unchanged", async () => {
        const result = JSON.parse(await execute('{"a":1}', { patch: '{}' }));
        expect(result).toEqual({ a: 1 });
    });

    it("merging two empty objects returns empty object", async () => {
        expect(JSON.parse(await execute('{}', { patch: '{}' }))).toEqual({});
    });

    // ── Deep / recursive merging ──────────────────────────────────────────────

    it("deep merges one level of nesting", async () => {
        const base = '{"user":{"name":"Alice","age":30}}';
        const patch = '{"user":{"age":31,"role":"admin"}}';
        const result = JSON.parse(await execute(base, { patch }));
        expect(result).toEqual({ user: { name: "Alice", age: 31, role: "admin" } });
    });

    it("deep merges three levels of nesting", async () => {
        const base = '{"a":{"b":{"c":1,"d":2}}}';
        const patch = '{"a":{"b":{"d":99,"e":3}}}';
        const result = JSON.parse(await execute(base, { patch }));
        expect(result).toEqual({ a: { b: { c: 1, d: 99, e: 3 } } });
    });

    it("deep merges sibling nested objects independently", async () => {
        const base = '{"x":{"val":1},"y":{"val":2}}';
        const patch = '{"x":{"extra":10}}';
        const result = JSON.parse(await execute(base, { patch }));
        expect(result).toEqual({ x: { val: 1, extra: 10 }, y: { val: 2 } });
    });

    // ── Type-replacement rules ────────────────────────────────────────────────

    it("patch array replaces base array (not merged)", async () => {
        const result = JSON.parse(await execute('{"items":[1,2,3]}', { patch: '{"items":[4,5]}' }));
        expect(result.items).toEqual([4, 5]);
    });

    it("patch null overwrites non-null base value", async () => {
        const result = JSON.parse(await execute('{"a":"value"}', { patch: '{"a":null}' }));
        expect(result.a).toBeNull();
    });

    it("patch string replaces nested object in base", async () => {
        const base = '{"config":{"host":"localhost","port":5432}}';
        const patch = '{"config":"override"}';
        const result = JSON.parse(await execute(base, { patch }));
        expect(result.config).toBe("override");
    });

    it("patch object replaces primitive base value", async () => {
        const result = JSON.parse(await execute('{"a":42}', { patch: '{"a":{"nested":true}}' }));
        expect(result.a).toEqual({ nested: true });
    });

    it("patch false overwrites truthy base value", async () => {
        const result = JSON.parse(await execute('{"flag":true}', { patch: '{"flag":false}' }));
        expect(result.flag).toBe(false);
    });

    it("patch zero overwrites non-zero base value", async () => {
        const result = JSON.parse(await execute('{"count":5}', { patch: '{"count":0}' }));
        expect(result.count).toBe(0);
    });

    it("patch empty string overwrites non-empty base string", async () => {
        const result = JSON.parse(await execute('{"name":"Alice"}', { patch: '{"name":""}' }));
        expect(result.name).toBe("");
    });

    // ── Output formatting ────────────────────────────────────────────────────

    it("default indent is 2 spaces", async () => {
        const output = await execute('{"a":1}', { patch: '{}' });
        expect(output).toMatch(/^\{\n {2}"a"/);
    });

    it("respects custom indent of 4", async () => {
        const output = await execute('{"a":1}', { patch: '{}', indent: 4 });
        expect(output).toMatch(/^\{\n {4}"a"/);
    });

    it("output is valid JSON", async () => {
        const output = await execute('{"a":1,"b":{"c":2}}', { patch: '{"b":{"d":3}}' });
        expect(() => JSON.parse(output)).not.toThrow();
    });

    // ── Default patch behaviour ───────────────────────────────────────────────

    it("uses empty object as default patch when param omitted", async () => {
        const result = JSON.parse(await execute('{"a":1}'));
        expect(result).toEqual({ a: 1 });
    });

    // ── Error cases ──────────────────────────────────────────────────────────

    it("throws on invalid base JSON", async () => {
        await expect(execute("{invalid}", { patch: '{}' })).rejects.toThrow();
    });

    it("throws on invalid patch JSON", async () => {
        await expect(execute('{"a":1}', { patch: "{invalid}" })).rejects.toThrow();
    });
});
