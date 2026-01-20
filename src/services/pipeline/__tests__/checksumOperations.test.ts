import { operationRegistry } from "../OperationRegistry";
import { runPipeline, createStep, createPipeline } from "../PipelineRunner";
import "../init"; // Ensure common categories are registered
import "../../../tablets/checksum/pipelineOperations"; // Ensure checksum operations are registered

// Mock Web Crypto API for testing
const mockSubtle = {
    digest: jest.fn(),
};

Object.defineProperty(global, 'crypto', {
    value: {
        subtle: mockSubtle,
        randomUUID: () => 'test-uuid'
    },
    writable: true
});

describe("Checksum Pipeline Operations", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should register checksum.calculate operation", () => {
        const op = operationRegistry.getById("checksum.calculate");
        expect(op).toBeDefined();
        expect(op?.name).toBe("Calculate Checksum");
        expect(op?.categories).toContain("hashing");
    });

    describe("checksum.calculate", () => {
        it("should calculate SHA-256 for entire text", async () => {
            const mockHash = new ArrayBuffer(32);
            const mockView = new Uint8Array(mockHash);
            mockView.fill(0xAB);
            mockSubtle.digest.mockResolvedValue(mockHash);

            const step = createStep("checksum.calculate", {
                algorithm: "SHA-256",
                mode: "entire-text"
            });
            const pipeline = createPipeline();
            pipeline.steps = [step];

            const result = await runPipeline("test content", pipeline);

            expect(mockSubtle.digest).toHaveBeenCalledWith("SHA-256", expect.any(Uint8Array));
            expect(result.output).toBe("ABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABAB");
        });

        it("should calculate MD5 line by line", async () => {
            const step = createStep("checksum.calculate", {
                algorithm: "MD5",
            });
            step.applyPerLine = true;
            const pipeline = createPipeline();
            pipeline.steps = [step];

            const input = "test\nline";
            // MD5 of 'test' = '098F6BCD4621D373CADE4E832627B4F6'
            // MD5 of 'line' = '6438C669E0D0DE98E6929C2CC0FAC474'

            const result = await runPipeline(input, pipeline);

            const lines = result.output.split("\n");
            expect(lines).toHaveLength(2);
            expect(lines[0]).toBe("098F6BCD4621D373CADE4E832627B4F6");
            expect(lines[1]).toBe("6438C669E0D0DE98E6929C2CC0FAC474");
        });

        it("should handle CRC32 for entire text", async () => {
            const step = createStep("checksum.calculate", {
                algorithm: "CRC32",
                mode: "entire-text"
            });
            const pipeline = createPipeline();
            pipeline.steps = [step];

            const result = await runPipeline("test", pipeline);
            expect(result.output).toMatch(/^[0-9A-F]{8}$/);
        });

        it("should skip empty lines in line-by-line mode", async () => {
            const step = createStep("checksum.calculate", {
                algorithm: "MD5",
            });
            step.applyPerLine = true;
            const pipeline = createPipeline();
            pipeline.steps = [step];

            const input = "test\n\nline";
            const result = await runPipeline(input, pipeline);

            const lines = result.output.split("\n");
            expect(lines).toHaveLength(3);
            expect(lines[0]).toBe("098F6BCD4621D373CADE4E832627B4F6");
            expect(lines[1]).toBe("");
            expect(lines[2]).toBe("6438C669E0D0DE98E6929C2CC0FAC474");
        });
    });
});
