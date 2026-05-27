import { executeSingleOperation } from "../../pipelineExecutor";
import "../coreOperations";

describe("text.reading-time pipeline operation", () => {
    const execute = async (
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation("text.reading-time", input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    it("returns reading time and word count", async () => {
        const result = await execute("word ".repeat(200).trim(), { wpm: 200 });
        expect(result).toContain("1 min");
        expect(result).toContain("200");
    });

    it("returns < 1 min for short text", async () => {
        expect(await execute("Hello world")).toContain("< 1 min");
    });

    it("handles empty input gracefully", async () => {
        expect(await execute("")).toContain("0");
    });

    it("counts code block words separately at lower rate", async () => {
        const prose = "word ".repeat(100).trim();
        const codeBlock = "```\n" + "code ".repeat(100).trim() + "\n```";
        const result = await execute(prose + "\n" + codeBlock, { wpm: 200, codeWpm: 100 });
        // 100 prose @ 200 wpm = 0.5 min, 100 code @ 100 wpm = 1 min → ~2 min
        expect(result).toMatch(/[12] min/);
        expect(result).toContain("Prose words");
        expect(result).toContain("Code words");
    });

    it("respects custom wpm parameter", async () => {
        const words = "word ".repeat(400).trim();
        expect(await execute(words, { wpm: 100 })).toContain("4 min");
        expect(await execute(words, { wpm: 400 })).toContain("1 min");
    });

    it("does not show code columns when no code blocks present", async () => {
        expect(await execute("just some prose words here")).not.toContain("Code words");
    });

    it("reports correct total word count", async () => {
        expect(await execute("one two three four five")).toContain("5");
    });
});
