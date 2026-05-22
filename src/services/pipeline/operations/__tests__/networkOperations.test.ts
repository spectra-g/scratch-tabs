import { executeSingleOperation } from "../../pipelineExecutor";
import "../network";

describe("Network Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    // ── Defang URL ───────────────────────────────────────────────────────────

    describe("network.defang-url", () => {
        it("defangs https scheme", async () => {
            const result = await execute("network.defang-url", "https://example.com");
            expect(result).toContain("hxxps://");
        });

        it("defangs http scheme", async () => {
            const result = await execute("network.defang-url", "http://example.com");
            expect(result).toContain("hxxp://");
        });

        it("replaces dots with [.]", async () => {
            const result = await execute("network.defang-url", "https://example.com");
            expect(result).toContain("[.]");
            expect(result).not.toMatch(/(?<!\[)\.(?!\])/);
        });

        it("replaces @ with [@]", async () => {
            const result = await execute("network.defang-url", "user@example.com");
            expect(result).toContain("[@]");
        });

        it("skips scheme defang when disabled", async () => {
            const result = await execute("network.defang-url", "https://example.com", { scheme: false });
            expect(result).toContain("https://");
            expect(result).not.toContain("hxxps://");
        });

        it("skips dot defang when disabled", async () => {
            const result = await execute("network.defang-url", "example.com", { dots: false });
            expect(result).toContain("example.com");
            expect(result).not.toContain("[.]");
        });

        it("skips @ defang when disabled", async () => {
            const result = await execute("network.defang-url", "user@example.com", { at: false });
            expect(result).toContain("@");
            expect(result).not.toContain("[@]");
        });

        it("handles case-insensitive scheme matching", async () => {
            const result = await execute("network.defang-url", "HTTPS://example.com");
            expect(result).toContain("hxxps://");
        });

        it("produces a fully defanged URL", async () => {
            const result = await execute("network.defang-url", "https://evil.example.com/path");
            expect(result).toBe("hxxps://evil[.]example[.]com/path");
        });
    });

    // ── Refang URL ───────────────────────────────────────────────────────────

    describe("network.refang-url", () => {
        it("refangs hxxps scheme", async () => {
            expect(await execute("network.refang-url", "hxxps://example[.]com")).toBe(
                "https://example.com",
            );
        });

        it("refangs hxxp scheme", async () => {
            expect(await execute("network.refang-url", "hxxp://example[.]com")).toBe(
                "http://example.com",
            );
        });

        it("replaces [.] with .", async () => {
            expect(await execute("network.refang-url", "example[.]com")).toBe("example.com");
        });

        it("replaces [@] with @", async () => {
            expect(await execute("network.refang-url", "user[@]example[.]com")).toBe(
                "user@example.com",
            );
        });

        it("replaces [:] with :", async () => {
            expect(await execute("network.refang-url", "hxxps[:]//example[.]com")).toBe(
                "https://example.com",
            );
        });

        it("handles case-insensitive hxxps", async () => {
            expect(await execute("network.refang-url", "HXXPS://example[.]com")).toBe(
                "https://example.com",
            );
        });

        it("round-trips a defanged URL", async () => {
            const original = "https://evil.example.com/path?q=1";
            const defanged = await execute("network.defang-url", original);
            const refanged = await execute("network.refang-url", defanged);
            expect(refanged).toBe(original);
        });

        it("round-trips an IP indicator", async () => {
            const original = "http://192.168.1.1/malware";
            const defanged = await execute("network.defang-url", original);
            const refanged = await execute("network.refang-url", defanged);
            expect(refanged).toBe(original);
        });
    });
});
