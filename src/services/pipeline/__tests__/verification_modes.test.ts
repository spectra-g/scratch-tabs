import { describe, it, expect, beforeEach } from "@jest/globals";
import { operationRegistry } from "../OperationRegistry";
import { executeStep, createExecutionContext } from "../pipelineExecutor";
import { OperationDefinition, PipelineStep } from "../types";

describe("Pipeline Processing Modes - Verification", () => {
    beforeEach(() => {
        operationRegistry.clear();
    });

    it("should correctly handle 'entire' mode (JSON Format Simulation)", async () => {
        // Create a dummy operation with processingMode: 'entire' that takes a string and wraps it in braces {...}
        operationRegistry.register({
            id: 'test.entire-braces',
            name: 'Wrap in Braces',
            description: 'Simulation of JSON format',
            categories: ['test'],
            parameters: [],
            processingMode: 'entire',
            execute: async (input) => `{${input}}`,
        });

        // Run a pipeline with input line1\nline2
        const step: PipelineStep = {
            id: "s1",
            operationId: "test.entire-braces",
            params: {},
            enabled: true,
        };
        const context = createExecutionContext("line1\nline2", 0, 1, "");
        const result = await executeStep(step, "line1\nline2", context);

        // Assert the output is {line1\nline2} (treated as one block)
        expect(result.output).toBe("{line1\nline2}");
    });

    it("should correctly handle 'line' mode (Prefix Simulation)", async () => {
        // Create a dummy operation with processingMode: 'line' that adds a > prefix
        operationRegistry.register({
            id: 'test.line-prefix',
            name: 'Line Prefix',
            description: 'Simulation of per-line prefixing',
            categories: ['test'],
            parameters: [],
            processingMode: 'line',
            execute: async (input) => `> ${input}`,
        });

        // Run a pipeline with input line1\nline2
        const step: PipelineStep = {
            id: "s1",
            operationId: "test.line-prefix",
            params: {},
            enabled: true,
        };
        const context = createExecutionContext("line1\nline2", 0, 1, "");
        const result = await executeStep(step, "line1\nline2", context);

        // Assert the output is > line1\n> line2 (applied to each line individually)
        expect(result.output).toBe("> line1\n> line2");
    });

    it("should correctly handle 'configurable' mode (Suffix Simulation)", async () => {
        // Create a dummy operation with processingMode: 'configurable' that adds a * suffix
        operationRegistry.register({
            id: 'test.configurable-suffix',
            name: 'Configurable Suffix',
            description: 'Simulation of configurable processing',
            categories: ['test'],
            parameters: [],
            processingMode: 'configurable',
            execute: async (input) => `${input}*`,
        });

        const context = createExecutionContext("line1\nline2", 0, 1, "");

        // Run it once with applyPerLine: false
        const stepOff: PipelineStep = {
            id: "s1",
            operationId: "test.configurable-suffix",
            params: {},
            enabled: true,
            applyPerLine: false,
        };
        const resultOff = await executeStep(stepOff, "line1\nline2", context);
        // Assert output is line1\nline2* (one suffix at EOF)
        expect(resultOff.output).toBe("line1\nline2*");

        // Run it again with applyPerLine: true
        const stepOn: PipelineStep = {
            id: "s2",
            operationId: "test.configurable-suffix",
            params: {},
            enabled: true,
            applyPerLine: true,
        };
        const resultOn = await executeStep(stepOn, "line1\nline2", context);
        // Assert output is line1*\nline2* (suffix on every line)
        expect(resultOn.output).toBe("line1*\nline2*");
    });
});
