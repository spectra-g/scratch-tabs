import { executeSingleOperation } from "../../pipelineExecutor";
import "../coreOperations";

describe("text.strip-ansi pipeline operation", () => {
    const execute = async (
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation("text.strip-ansi", input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    // ── Passthrough ───────────────────────────────────────────────────────────

    it("passes through plain text unchanged", async () => {
        expect(await execute("plain text")).toBe("plain text");
    });

    it("returns empty string for empty input", async () => {
        expect(await execute("")).toBe("");
    });

    it("preserves tabs and newlines", async () => {
        expect(await execute("a\tb\nc")).toBe("a\tb\nc");
    });

    // ── SGR colour and style codes ────────────────────────────────────────────

    it("removes foreground colour code", async () => {
        expect(await execute("\x1b[31mred text\x1b[0m")).toBe("red text");
    });

    it("removes bold formatting", async () => {
        expect(await execute("\x1b[1mbold\x1b[0m")).toBe("bold");
    });

    it("removes underline formatting", async () => {
        expect(await execute("\x1b[4munderline\x1b[0m")).toBe("underline");
    });

    it("removes combined colour + bold (semicolon params)", async () => {
        expect(await execute("\x1b[1;32mgreen bold\x1b[0m")).toBe("green bold");
    });

    it("removes 256-colour foreground code", async () => {
        expect(await execute("\x1b[38;5;200mmagenta\x1b[0m")).toBe("magenta");
    });

    it("removes background colour code", async () => {
        expect(await execute("\x1b[41mred bg\x1b[0m")).toBe("red bg");
    });

    it("removes reset-only sequences, leaving nothing", async () => {
        expect(await execute("\x1b[0m")).toBe("");
    });

    it("removes multiple sequential SGR codes", async () => {
        expect(await execute("\x1b[0m\x1b[1m\x1b[31mtext\x1b[0m")).toBe("text");
    });

    // ── Cursor and screen control sequences ──────────────────────────────────

    it("removes cursor up sequence", async () => {
        expect(await execute("\x1b[1Atext")).toBe("text");
    });

    it("removes cursor column sequence", async () => {
        expect(await execute("\x1b[1Gtext")).toBe("text");
    });

    it("removes clear line sequence", async () => {
        expect(await execute("\x1b[2Ktext")).toBe("text");
    });

    it("removes clear screen sequence", async () => {
        expect(await execute("\x1b[2J")).toBe("");
    });

    it("removes hide/show cursor sequences", async () => {
        expect(await execute("\x1b[?25ltext\x1b[?25h")).toBe("text");
    });

    // ── OSC sequences ────────────────────────────────────────────────────────

    it("removes OSC window title sequence", async () => {
        expect(await execute("\x1b]0;terminal title\x07text")).toBe("text");
    });

    it("removes OSC sequence with no surrounding text", async () => {
        expect(await execute("\x1b]2;My Terminal\x07")).toBe("");
    });

    // ── Realistic terminal output ────────────────────────────────────────────

    it("strips coloured pass/fail lines", async () => {
        const input = "\x1b[32m✓\x1b[0m Passed\n\x1b[31m✗\x1b[0m Failed";
        expect(await execute(input)).toBe("✓ Passed\n✗ Failed");
    });

    it("strips realistic npm/jest spinner output", async () => {
        const input = "\x1b[2K\x1b[1G\x1b[36mRunning tests...\x1b[0m";
        expect(await execute(input)).toBe("Running tests...");
    });

    it("strips mixed codes across multiple lines", async () => {
        const input = [
            "\x1b[1mBuild Summary\x1b[0m",
            "\x1b[32m  ✓ 42 tests passed\x1b[0m",
            "\x1b[31m  ✗ 2 tests failed\x1b[0m",
            "\x1b[33m  ! 1 test skipped\x1b[0m",
        ].join("\n");
        const expected = [
            "Build Summary",
            "  ✓ 42 tests passed",
            "  ✗ 2 tests failed",
            "  ! 1 test skipped",
        ].join("\n");
        expect(await execute(input)).toBe(expected);
    });

    it("handles text with no codes between codes", async () => {
        // back-to-back codes with no text between
        expect(await execute("\x1b[31m\x1b[1m\x1b[4mtext\x1b[0m")).toBe("text");
    });
});
