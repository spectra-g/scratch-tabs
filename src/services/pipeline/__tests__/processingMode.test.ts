import { describe, it, expect, beforeEach } from "@jest/globals";
import { operationRegistry } from "../OperationRegistry";
import { executeStep, createExecutionContext } from "../pipelineExecutor";
import { OperationDefinition, PipelineStep } from "../types";

describe("Pipeline Processing Modes", () => {
    beforeEach(() => {
        operationRegistry.clear();

        const testOps: OperationDefinition[] = [
            {
                id: "test.entire",
                name: "Entire Mode",
                description: "Processes entire input",
                categories: ["test"],
                parameters: [],
                processingMode: "entire",
                execute: (input) => `[${input}]`,
            },
            {
                id: "test.line",
                name: "Line Mode",
                description: "Processes each line",
                categories: ["test"],
                parameters: [],
                processingMode: "line",
                execute: (input, _params, context) => `${(context.lineIndex ?? 0) + 1}:${input}`,
            },
            {
                id: "test.configurable",
                name: "Configurable Mode",
                description: "Toggle between modes",
                categories: ["test"],
                parameters: [],
                processingMode: "configurable",
                execute: (input, _params, context) => {
                    if (context.lineIndex !== undefined) {
                        return `${context.lineIndex}:${input}`;
                    }
                    return `entire:${input}`;
                },
            },
        ];

        testOps.forEach((op) => operationRegistry.register(op));
    });

    it("should process in 'entire' mode by default", async () => {
        const step: PipelineStep = {
            id: "s1",
            operationId: "test.entire",
            params: {},
            enabled: true,
        };
        const context = createExecutionContext("line1\nline2", 0, 1, "");
        const result = await executeStep(step, "line1\nline2", context);

        expect(result.output).toBe("[line1\nline2]");
    });

    it("should process in 'line' mode automatically", async () => {
        const step: PipelineStep = {
            id: "s1",
            operationId: "test.line",
            params: {},
            enabled: true,
        };
        const context = createExecutionContext("line1\nline2", 0, 1, "");
        const result = await executeStep(step, "line1\nline2", context);

        expect(result.output).toBe("1:line1\n2:line2");
    });

    it("should respect 'applyPerLine' for 'configurable' mode (off)", async () => {
        const step: PipelineStep = {
            id: "s1",
            operationId: "test.configurable",
            params: {},
            enabled: true,
            applyPerLine: false,
        };
        const context = createExecutionContext("line1\nline2", 0, 1, "");
        const result = await executeStep(step, "line1\nline2", context);

        expect(result.output).toBe("entire:line1\nline2");
    });

    it("should respect 'applyPerLine' for 'configurable' mode (on)", async () => {
        const step: PipelineStep = {
            id: "s1",
            operationId: "test.configurable",
            params: {},
            enabled: true,
            applyPerLine: true,
        };
        const context = createExecutionContext("line1\nline2", 0, 1, "");
        const result = await executeStep(step, "line1\nline2", context);

        expect(result.output).toBe("0:line1\n1:line2");
    });

    it("should provide totalLines in context during 'line' mode", async () => {
        operationRegistry.register({
            id: "test.total",
            name: "Total Lines",
            description: "Uses total lines",
            categories: ["test"],
            parameters: [],
            processingMode: "line",
            execute: (_input, _params, context) => `${context.totalLines}`,
        });

        const step: PipelineStep = {
            id: "s1",
            operationId: "test.total",
            params: {},
            enabled: true,
        };
        const context = createExecutionContext("a\nb\nc", 0, 1, "");
        const result = await executeStep(step, "a\nb\nc", context);

        expect(result.output).toBe("3\n3\n3");
    });
});
