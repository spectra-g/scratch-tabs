import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/dataFormats";

describe("csv.stats Pipeline Operation", () => {
    const execute = async (
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation("csv.stats", input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    it("outputs row and column summary header", async () => {
        const csv = "name,age\nAlice,30\nBob,25";
        const result = await execute(csv);
        expect(result).toContain("2 rows");
        expect(result).toContain("2 columns");
    });

    it("computes numeric stats for a numeric column", async () => {
        const csv = "value\n10\n20\n30\n40";
        const result = await execute(csv);
        expect(result).toContain("min:");
        expect(result).toContain("10");
        expect(result).toContain("max:");
        expect(result).toContain("40");
        expect(result).toContain("mean:");
        expect(result).toContain("25.0000");
        expect(result).toContain("median:");
    });

    it("computes correct median for even-length numeric column", async () => {
        const csv = "v\n10\n20\n30\n40";
        const result = await execute(csv);
        expect(result).toContain("median:   25");
    });

    it("computes correct median for odd-length numeric column", async () => {
        const csv = "v\n10\n20\n30";
        const result = await execute(csv);
        expect(result).toContain("median:   20");
    });

    it("shows top values for text columns", async () => {
        const csv = "color\nred\nblue\nred\ngreen\nred";
        const result = await execute(csv);
        expect(result).toContain('"red"');
        expect(result).toContain("(3)");
    });

    it("reports distinct count", async () => {
        const csv = "x\na\nb\na";
        const result = await execute(csv);
        expect(result).toContain("distinct: 2");
    });

    it("reports empty count", async () => {
        const csv = "x\na\n\nb";
        const result = await execute(csv);
        expect(result).toContain("empty: 1");
    });

    it("uses column indices when header option is false", async () => {
        const csv = "a,b\n1,2";
        const result = await execute(csv, { header: false });
        expect(result).toContain("Column 1");
        expect(result).toContain("Column 2");
    });

    it("handles tab delimiter", async () => {
        const csv = "name\tage\nAlice\t30";
        const result = await execute(csv, { delimiter: "tab" });
        expect(result).toContain("name");
        expect(result).toContain("age");
    });

    it("handles semicolon delimiter", async () => {
        const csv = "name;age\nAlice;30";
        const result = await execute(csv, { delimiter: "semicolon" });
        expect(result).toContain("name");
        expect(result).toContain("age");
    });

    it("throws on empty input", async () => {
        const result = await executeSingleOperation("csv.stats", "", {});
        expect(result.success).toBe(false);
    });
});
