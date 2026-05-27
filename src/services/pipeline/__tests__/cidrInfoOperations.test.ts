import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/network";

describe("network.cidr-info Pipeline Operation", () => {
    const execute = async (
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation("network.cidr-info", input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    it("shows network address for /24", async () => {
        const result = await execute("192.168.1.5/24");
        expect(result).toContain("192.168.1.0");
    });

    it("shows broadcast address for /24", async () => {
        const result = await execute("192.168.1.5/24");
        expect(result).toContain("192.168.1.255");
    });

    it("shows subnet mask for /24", async () => {
        const result = await execute("192.168.1.0/24");
        expect(result).toContain("255.255.255.0");
    });

    it("shows wildcard mask for /24", async () => {
        const result = await execute("192.168.1.0/24");
        expect(result).toContain("0.0.0.255");
    });

    it("shows correct usable host count for /24 (254 hosts)", async () => {
        const result = await execute("192.168.1.0/24");
        expect(result).toContain("254");
    });

    it("shows total address count of 256 for /24", async () => {
        const result = await execute("192.168.1.0/24");
        expect(result).toContain("256");
    });

    it("shows correct first usable host for /24", async () => {
        const result = await execute("192.168.1.0/24");
        expect(result).toContain("192.168.1.1");
    });

    it("shows correct last usable host for /24", async () => {
        const result = await execute("192.168.1.0/24");
        expect(result).toContain("192.168.1.254");
    });

    it("handles /32 (single host)", async () => {
        const result = await execute("10.0.0.1/32");
        expect(result).toContain("10.0.0.1");
        expect(result).toContain("1");
    });

    it("handles /16", async () => {
        const result = await execute("172.16.0.0/16");
        expect(result).toContain("172.16.0.0");
        expect(result).toContain("172.16.255.255");
        expect(result).toContain("255.255.0.0");
    });

    it("returns empty string for empty input", async () => {
        expect(await execute("")).toBe("");
    });

    it("throws on missing prefix", async () => {
        const result = await executeSingleOperation("network.cidr-info", "192.168.1.0", {});
        expect(result.success).toBe(false);
    });

    it("throws on invalid prefix length", async () => {
        const result = await executeSingleOperation("network.cidr-info", "192.168.1.0/33", {});
        expect(result.success).toBe(false);
    });
});
