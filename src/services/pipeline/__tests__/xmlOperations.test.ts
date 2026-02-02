/**
 * Unit Tests for XML Pipeline Operations
 *
 * Tests for XML format, minify, and XML/JSON conversion.
 */

import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/xml";

describe("XML Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) {
            throw new Error(result.error);
        }
        return result.output;
    };

    describe("xml.format", () => {
        it("should format compact XML", async () => {
            const input = "<root><child>text</child></root>";
            const result = await execute("xml.format", input, { indent: 2 });
            expect(result).toContain("\n");
            expect(result).toContain("  <child>");
        });

        it("should handle attributes", async () => {
            const input = '<root attr="value"><child/></root>';
            const result = await execute("xml.format", input, { indent: 2 });
            expect(result).toContain('attr="value"');
        });

        it("should preserve comments when enabled", async () => {
            const input = "<root><!-- comment --><child/></root>";
            const result = await execute("xml.format", input, { preserveComments: true });
            expect(result).toContain("<!-- comment -->");
        });

        it("should handle self-closing tags", async () => {
            const input = "<root><empty/></root>";
            const result = await execute("xml.format", input, { indent: 2 });
            expect(result).toContain("<empty/>");
        });

        it("should handle XML declaration", async () => {
            const input = '<?xml version="1.0"?><root/>';
            const result = await execute("xml.format", input, { indent: 2 });
            expect(result).toContain('<?xml version="1.0"?>');
        });

        it("should handle nested elements", async () => {
            const input = "<root><a><b><c>text</c></b></a></root>";
            const result = await execute("xml.format", input, { indent: 2 });
            const lines = result.split("\n");
            expect(lines.length).toBeGreaterThan(3);
        });
    });

    describe("xml.minify", () => {
        it("should minify formatted XML", async () => {
            const input = `<root>
  <child>text</child>
</root>`;
            const result = await execute("xml.minify", input);
            expect(result).not.toContain("\n");
            expect(result).toBe("<root><child>text</child></root>");
        });

        it("should remove comments when option enabled", async () => {
            const input = "<root><!-- comment --><child/></root>";
            const result = await execute("xml.minify", input, { removeComments: true });
            expect(result).not.toContain("comment");
        });

        it("should preserve comments when option disabled", async () => {
            const input = "<root><!-- comment --><child/></root>";
            const result = await execute("xml.minify", input, { removeComments: false });
            expect(result).toContain("<!-- comment -->");
        });
    });

    describe("xml.to-json", () => {
        it("should convert simple XML to JSON", async () => {
            const input = "<root><name>John</name></root>";
            const result = await execute("xml.to-json", input, { indent: 2 });
            const json = JSON.parse(result);
            expect(json.root.name).toBe("John");
        });

        it("should handle attributes with prefix", async () => {
            const input = '<person id="1"><name>John</name></person>';
            const result = await execute("xml.to-json", input, { attributePrefix: "@" });
            const json = JSON.parse(result);
            expect(json.person["@id"]).toBe("1");
        });

        it("should handle nested elements", async () => {
            const input = "<root><a><b>text</b></a></root>";
            const result = await execute("xml.to-json", input, { indent: 2 });
            const json = JSON.parse(result);
            expect(json.root.a.b).toBe("text");
        });

        it("should return minified JSON when indent is 0", async () => {
            const input = "<root><child>text</child></root>";
            const result = await execute("xml.to-json", input, { indent: 0 });
            expect(result).not.toContain("\n");
        });

        it("should handle self-closing tags", async () => {
            const input = '<root><empty attr="value"/></root>';
            const result = await execute("xml.to-json", input);
            const json = JSON.parse(result);
            expect(json.root.empty).toBeDefined();
        });
    });

    describe("json.to-xml", () => {
        it("should convert simple JSON to XML", async () => {
            const input = '{"root":{"name":"John"}}';
            const result = await execute("json.to-xml", input, { indent: 2 });
            expect(result).toContain("<root>");
            expect(result).toContain("<name>John</name>");
        });

        it("should handle arrays", async () => {
            // When arrays are inside objects, elements use the key name
            const input = '{"items":[1,2,3]}';
            const result = await execute("json.to-xml", input, { arrayItemName: "item" });
            // Array elements should be output
            expect(result).toContain("<items>1</items>");
            expect(result).toContain("<items>2</items>");
        });

        it("should handle root-level arrays with arrayItemName", async () => {
            const input = '[1, 2, 3]';
            const result = await execute("json.to-xml", input, { rootElement: "numbers", arrayItemName: "num" });
            expect(result).toContain("<num>");
        });

        it("should escape special XML characters", async () => {
            const input = '{"text":"<>&"}';
            const result = await execute("json.to-xml", input);
            expect(result).toContain("&lt;");
            expect(result).toContain("&gt;");
            expect(result).toContain("&amp;");
        });

        it("should handle null values", async () => {
            const input = '{"value":null}';
            const result = await execute("json.to-xml", input);
            expect(result).toContain("<value/>");
        });

        it("should wrap arrays in root element", async () => {
            const input = '[{"a":1},{"a":2}]';
            const result = await execute("json.to-xml", input, { rootElement: "items", arrayItemName: "item" });
            expect(result).toContain("<items>");
            expect(result).toContain("</items>");
        });

        it("should return minified XML when indent is 0", async () => {
            const input = '{"root":{"child":"text"}}';
            const result = await execute("json.to-xml", input, { indent: 0 });
            expect(result.split("\n").length).toBeLessThanOrEqual(2);
        });
    });
});
