/**
 * Unit Tests for Extraction Pipeline Operations
 *
 * Tests extraction operations for patterns, IPs, URLs, emails, and regex groups.
 */

import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/extraction";

describe("Extraction Pipeline Operations", () => {
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

    describe("extract.regex-group", () => {
        it("should extract first capture group", async () => {
            const input = "ID:123 Name:John ID:456 Name:Jane";
            const result = await execute("extract.regex-group", input, {
                pattern: "ID:(\\d+)",
                group: 1,
                flags: "g"
            });

            expect(result).toBe("123\n456");
        });

        it("should extract second capture group", async () => {
            const input = "User(ID:123,Name:John) User(ID:456,Name:Jane)";
            const result = await execute("extract.regex-group", input, {
                pattern: "ID:(\\d+),Name:(\\w+)",
                group: 2,
                flags: "g"
            });

            expect(result).toBe("John\nJane");
        });

        it("should extract with square brackets", async () => {
            const input = "[INFO] Message [ERROR] Warning [DEBUG] Note";
            const result = await execute("extract.regex-group", input, {
                pattern: "\\[(.*?)\\]",
                group: 1,
                flags: "g"
            });

            expect(result).toBe("INFO\nERROR\nDEBUG");
        });

        it("should work with case-insensitive flag", async () => {
            const input = "ERROR: failed WARNING: issue error: problem";
            const result = await execute("extract.regex-group", input, {
                pattern: "(error|warning):",
                group: 1,
                flags: "gi"
            });

            expect(result).toBe("ERROR\nWARNING\nerror");
        });

        it("should remove duplicates when unique is enabled", async () => {
            const input = "ID:123 ID:456 ID:123 ID:789 ID:456";
            const result = await execute("extract.regex-group", input, {
                pattern: "ID:(\\d+)",
                group: 1,
                flags: "g",
                unique: true
            });

            expect(result).toBe("123\n456\n789");
        });

        it("should keep duplicates when unique is disabled", async () => {
            const input = "ID:123 ID:123 ID:456";
            const result = await execute("extract.regex-group", input, {
                pattern: "ID:(\\d+)",
                group: 1,
                flags: "g",
                unique: false
            });

            expect(result).toBe("123\n123\n456");
        });

        it("should extract email usernames", async () => {
            const input = "john@example.com jane@test.org bob@company.net";
            const result = await execute("extract.regex-group", input, {
                pattern: "(\\w+)@\\w+\\.\\w+",
                group: 1,
                flags: "g"
            });

            expect(result).toBe("john\njane\nbob");
        });

        it("should extract version numbers", async () => {
            const input = "v1.2.3 version-2.0.1 v10.5.7";
            const result = await execute("extract.regex-group", input, {
                pattern: "v?(\\d+\\.\\d+\\.\\d+)",
                group: 1,
                flags: "g"
            });

            expect(result).toBe("1.2.3\n2.0.1\n10.5.7");
        });

        it("should extract quoted strings", async () => {
            const input = 'name="John" age="30" city="NYC"';
            const result = await execute("extract.regex-group", input, {
                pattern: '="(.*?)"',
                group: 1,
                flags: "g"
            });

            expect(result).toBe("John\n30\nNYC");
        });

        it("should extract URLs from HTML", async () => {
            const input = '<a href="http://example.com">Link1</a> <a href="http://test.org">Link2</a>';
            const result = await execute("extract.regex-group", input, {
                pattern: 'href="(.*?)"',
                group: 1,
                flags: "g"
            });

            expect(result).toBe("http://example.com\nhttp://test.org");
        });

        it("should extract parenthesized content", async () => {
            const input = "Call (555-1234) or (555-5678)";
            const result = await execute("extract.regex-group", input, {
                pattern: "\\((.*?)\\)",
                group: 1,
                flags: "g"
            });

            expect(result).toBe("555-1234\n555-5678");
        });

        it("should work with multiline flag", async () => {
            const input = "Line1: value1\nLine2: value2\nLine3: value3";
            const result = await execute("extract.regex-group", input, {
                pattern: "Line\\d+: (\\w+)",
                group: 1,
                flags: "gm"
            });

            expect(result).toBe("value1\nvalue2\nvalue3");
        });

        it("should handle empty matches gracefully", async () => {
            const input = "no matches here";
            const result = await execute("extract.regex-group", input, {
                pattern: "ID:(\\d+)",
                group: 1,
                flags: "g"
            });

            expect(result).toBe("");
        });

        it("should throw error when pattern is missing", async () => {
            await expect(execute("extract.regex-group", "test", {
                group: 1
            })).rejects.toThrow(/required/i);
        });

        it("should throw error for invalid regex", async () => {
            await expect(execute("extract.regex-group", "test", {
                pattern: "[unclosed",
                group: 1
            })).rejects.toThrow(/invalid.*regex/i);
        });

        it("should handle non-existent capture group", async () => {
            const input = "ID:123";
            const result = await execute("extract.regex-group", input, {
                pattern: "ID:(\\d+)",
                group: 2,  // Only group 1 exists
                flags: "g"
            });

            expect(result).toBe("");
        });

        it("should extract nested groups correctly", async () => {
            const input = "func(arg1, arg2) func(arg3, arg4)";
            const result = await execute("extract.regex-group", input, {
                pattern: "func\\((\\w+),",
                group: 1,
                flags: "g"
            });

            expect(result).toBe("arg1\narg3");
        });

        it("should handle Unicode in patterns", async () => {
            const input = "用户：张三 用户：李四";
            const result = await execute("extract.regex-group", input, {
                pattern: "用户：(.*?)(?:\\s|$)",
                group: 1,
                flags: "g"
            });

            expect(result).toBe("张三\n李四");
        });

        it("should extract log levels from logs", async () => {
            const input = "[2024-01-01 10:00:00] ERROR - Something failed\n[2024-01-01 10:00:01] INFO - All good\n[2024-01-01 10:00:02] WARNING - Check this";
            const result = await execute("extract.regex-group", input, {
                pattern: "\\] (\\w+) -",
                group: 1,
                flags: "g"
            });

            expect(result).toBe("ERROR\nINFO\nWARNING");
        });

        it("should extract file extensions", async () => {
            const input = "file1.txt file2.pdf image.png document.docx";
            const result = await execute("extract.regex-group", input, {
                pattern: "\\.(\\w+)",
                group: 1,
                flags: "g"
            });

            expect(result).toBe("txt\npdf\npng\ndocx");
        });

        it("should extract numbers from mixed text", async () => {
            const input = "Price: $50.99, Quantity: 10, Total: $509.90";
            const result = await execute("extract.regex-group", input, {
                pattern: "\\$(\\d+\\.\\d+)",
                group: 1,
                flags: "g"
            });

            expect(result).toBe("50.99\n509.90");
        });

        it("should extract hashtags", async () => {
            const input = "Check out #coding and #javascript for #webdev tips";
            const result = await execute("extract.regex-group", input, {
                pattern: "#(\\w+)",
                group: 1,
                flags: "g"
            });

            expect(result).toBe("coding\njavascript\nwebdev");
        });

        it("should extract dates in specific format", async () => {
            const input = "Meeting on 2024-01-15, deadline 2024-02-20, review 2024-03-10";
            const result = await execute("extract.regex-group", input, {
                pattern: "(\\d{4}-\\d{2}-\\d{2})",
                group: 1,
                flags: "g"
            });

            expect(result).toBe("2024-01-15\n2024-02-20\n2024-03-10");
        });
    });

    describe("extract.ip", () => {
        it("should extract IPv4 addresses", async () => {
            const input = "Servers: 192.168.1.1 and 10.0.0.5";
            const result = await execute("extract.ip", input, { unique: true });

            expect(result).toContain("192.168.1.1");
            expect(result).toContain("10.0.0.5");
        });

        it("should extract unique IPs only when enabled", async () => {
            const input = "192.168.1.1 192.168.1.1 10.0.0.1";
            const result = await execute("extract.ip", input, { unique: true });

            expect(result).toBe("192.168.1.1\n10.0.0.1");
        });

        it("should keep duplicate IPs when unique is disabled", async () => {
            const input = "192.168.1.1 192.168.1.1";
            const result = await execute("extract.ip", input, { unique: false });

            expect(result).toBe("192.168.1.1\n192.168.1.1");
        });
    });

    describe("extract.urls", () => {
        it("should extract URLs", async () => {
            const input = "Visit https://example.com and http://test.org";
            const result = await execute("extract.urls", input, { unique: true });

            expect(result).toContain("https://example.com");
            expect(result).toContain("http://test.org");
        });

        it("should extract unique URLs only when enabled", async () => {
            const input = "https://example.com https://example.com";
            const result = await execute("extract.urls", input, { unique: true });

            expect(result).toBe("https://example.com");
        });
    });

    describe("extract.email", () => {
        it("should extract email addresses", async () => {
            const input = "Contact john@example.com or jane@test.org";
            const result = await execute("extract.email", input, { unique: true });

            expect(result).toContain("john@example.com");
            expect(result).toContain("jane@test.org");
        });

        it("should extract unique emails only when enabled", async () => {
            const input = "john@example.com john@example.com";
            const result = await execute("extract.email", input, { unique: true });

            expect(result).toBe("john@example.com");
        });
    });
});
