import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/encoding";

describe("ROT13 / ROT47 Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    describe("encoding.rot13", () => {
        it("rotates uppercase letters by 13", async () => {
            expect(await execute("encoding.rot13", "ABC")).toBe("NOP");
        });

        it("rotates lowercase letters by 13", async () => {
            expect(await execute("encoding.rot13", "abc")).toBe("nop");
        });

        it("wraps around the alphabet", async () => {
            expect(await execute("encoding.rot13", "NOPnop")).toBe("ABCabc");
        });

        it("is self-inverse (applying twice returns original)", async () => {
            const original = "Hello, World!";
            const once = await execute("encoding.rot13", original);
            const twice = await execute("encoding.rot13", once);
            expect(twice).toBe(original);
        });

        it("leaves non-alphabetic characters unchanged", async () => {
            expect(await execute("encoding.rot13", "Hello, World! 123")).toBe("Uryyb, Jbeyq! 123");
        });

        it("handles empty input", async () => {
            expect(await execute("encoding.rot13", "")).toBe("");
        });
    });

    describe("encoding.rot47", () => {
        it("rotates printable ASCII characters by 47", async () => {
            expect(await execute("encoding.rot47", "Hello")).toBe("w6==@");
        });

        it("is self-inverse (applying twice returns original)", async () => {
            const original = "Hello, World! 123";
            const once = await execute("encoding.rot47", original);
            const twice = await execute("encoding.rot47", once);
            expect(twice).toBe(original);
        });

        it("leaves whitespace and non-printable characters unchanged", async () => {
            const result = await execute("encoding.rot47", "A B");
            expect(result[1]).toBe(" ");
        });

        it("handles the full printable ASCII range", async () => {
            const input = "!~";
            const result = await execute("encoding.rot47", input);
            expect(result).toHaveLength(2);
            const back = await execute("encoding.rot47", result);
            expect(back).toBe(input);
        });

        it("handles empty input", async () => {
            expect(await execute("encoding.rot47", "")).toBe("");
        });
    });
});
