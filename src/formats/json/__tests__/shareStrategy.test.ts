import { jsonShareStrategy } from "../shareStrategy";

describe("jsonShareStrategy", () => {
    const sampleObject = JSON.stringify({
        a: 1,
        b: 2,
        c: 3
    }, null, 2);

    const sampleArray = JSON.stringify([
        { id: 1 },
        { id: 2 },
        { id: 3 }
    ], null, 2);

    describe("encodeMetadata", () => {
        test("should return 'full' for empty selection", () => {
            expect(jsonShareStrategy.encodeMetadata([])).toBe("full");
            expect(jsonShareStrategy.encodeMetadata(null)).toBe("full");
        });

        test("should encode array of keys", () => {
            expect(jsonShareStrategy.encodeMetadata(["a", "b"])).toBe("keys=a,b");
        });

        test("should encode from selection object", () => {
            expect(jsonShareStrategy.encodeMetadata({ keys: ["a", "c"] })).toBe("keys=a,c");
        });
    });

    describe("decodeMetadata", () => {
        test("should return null for 'full'", () => {
            expect(jsonShareStrategy.decodeMetadata("full")).toBeNull();
            expect(jsonShareStrategy.decodeMetadata("")).toBeNull();
        });

        test("should decode keys string", () => {
            expect(jsonShareStrategy.decodeMetadata("keys=a,b,c")).toEqual(["a", "b", "c"]);
        });
    });

    describe("applyTrim", () => {
        test("should return original content if no keys", () => {
            expect(jsonShareStrategy.applyTrim(sampleObject, [])).toBe(sampleObject);
        });

        test("should filter object keys", () => {
            const trimmed = jsonShareStrategy.applyTrim(sampleObject, ["a", "c"]);
            const parsed = JSON.parse(trimmed);
            expect(parsed).toEqual({ a: 1, c: 3 });
            expect(parsed.b).toBeUndefined();
        });

        test("should filter array indices", () => {
            const trimmed = jsonShareStrategy.applyTrim(sampleArray, ["0", "2"]);
            const parsed = JSON.parse(trimmed);
            expect(parsed).toHaveLength(2);
            expect(parsed[0].id).toBe(1);
            expect(parsed[1].id).toBe(3);
        });

        test("should handle invalid JSON gracefully", () => {
            const invalid = "{ not json }";
            expect(jsonShareStrategy.applyTrim(invalid, ["a"])).toBe(invalid);
        });

        test("should handle primitive roots", () => {
            const primitive = "123";
            expect(jsonShareStrategy.applyTrim(primitive, ["a"])).toBe(primitive);
        });

        test("should ignore non-existent keys", () => {
            const trimmed = jsonShareStrategy.applyTrim(sampleObject, ["nonexistent"]);
            const parsed = JSON.parse(trimmed);
            expect(parsed).toEqual({});
        });
    });

    describe("validateTrimmedContent", () => {
        test("should return true for valid JSON", () => {
            expect(jsonShareStrategy.validateTrimmedContent?.('{"a":1}')).toBe(true);
        });

        test("should return false for invalid JSON", () => {
            expect(jsonShareStrategy.validateTrimmedContent?.('{ invalid }')).toBe(false);
        });
    });
});
