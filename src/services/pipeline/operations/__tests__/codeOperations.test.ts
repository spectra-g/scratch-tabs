/**
 * Unit Tests for Code Pipeline Operations
 *
 * Tests code-related operations like SQL escaping and formatting.
 */

import { executeSingleOperation } from "../../pipelineExecutor";
import "../code";

describe("Code Pipeline Operations", () => {
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

    describe("code.sql-escape", () => {
        it("should escape single quotes", async () => {
            const input = "It's a test";
            const result = await execute("code.sql-escape", input);

            expect(result).toBe("It''s a test");
        });

        it("should escape multiple single quotes", async () => {
            const input = "I'm sure it's working";
            const result = await execute("code.sql-escape", input);

            expect(result).toBe("I''m sure it''s working");
        });

        it("should escape backslashes", async () => {
            const input = "C:\\Users\\test";
            const result = await execute("code.sql-escape", input);

            expect(result).toBe("C:\\\\Users\\\\test");
        });

        it("should escape both quotes and backslashes", async () => {
            const input = "It's in C:\\path";
            const result = await execute("code.sql-escape", input);

            expect(result).toBe("It''s in C:\\\\path");
        });

        it("should use SQL Server style double quotes when specified", async () => {
            const input = 'Test "quoted" string';
            const result = await execute("code.sql-escape", input, { quoteStyle: "double" });

            expect(result).toBe('Test ""quoted"" string');
        });

        it("should handle empty input", async () => {
            const result = await execute("code.sql-escape", "");
            expect(result).toBe("");
        });

        it("should handle text without special characters", async () => {
            const input = "Normal text";
            const result = await execute("code.sql-escape", input);

            expect(result).toBe("Normal text");
        });

        it("should handle newlines and tabs", async () => {
            const input = "Line1\nLine2\tTabbed";
            const result = await execute("code.sql-escape", input);

            expect(result).toBe("Line1\nLine2\tTabbed");
        });

        it("should escape SQL injection attempts", async () => {
            const input = "'; DROP TABLE users; --";
            const result = await execute("code.sql-escape", input);

            expect(result).toBe("''; DROP TABLE users; --");
        });

        it("should handle unicode characters", async () => {
            const input = "Unicode: 你好 emoji: 😀";
            const result = await execute("code.sql-escape", input);

            expect(result).toBe("Unicode: 你好 emoji: 😀");
        });
    });

    describe("sql.prettify", () => {
        it("should format basic SELECT statement", async () => {
            const input = "SELECT * FROM users WHERE id=1";
            const result = await execute("sql.prettify", input);

            expect(result).toContain("SELECT");
            expect(result).toContain("FROM");
            expect(result).toContain("WHERE");
        });

        it("should uppercase keywords when specified", async () => {
            const input = "select * from users where id=1";
            const result = await execute("sql.prettify", input, { uppercase: true });

            expect(result).toContain("SELECT");
            expect(result).toContain("FROM");
            expect(result).toContain("WHERE");
        });

        it("should not uppercase keywords when disabled", async () => {
            const input = "select * from users where id=1";
            const result = await execute("sql.prettify", input, { uppercase: false });

            expect(result).toContain("select");
            expect(result).toContain("from");
            expect(result).toContain("where");
        });

        it("should use specified indentation", async () => {
            const input = "SELECT * FROM users WHERE id IN (SELECT id FROM active)";
            const result = await execute("sql.prettify", input, { indent: 4 });

            const lines = result.split('\n');
            const indentedLine = lines.find(line => line.startsWith('    '));
            expect(indentedLine).toBeDefined();
        });

        it("should format JOIN statements", async () => {
            const input = "SELECT u.name, o.total FROM users u JOIN orders o ON u.id=o.user_id";
            const result = await execute("sql.prettify", input);

            expect(result).toContain("SELECT");
            expect(result).toContain("JOIN");
            expect(result).toContain("ON");
        });

        it("should format INSERT statement", async () => {
            const input = "INSERT INTO users (name, age) VALUES ('John', 30)";
            const result = await execute("sql.prettify", input);

            expect(result).toContain("INSERT INTO");
            expect(result).toContain("VALUES");
        });

        it("should format UPDATE statement", async () => {
            const input = "UPDATE users SET name='Jane' WHERE id=1";
            const result = await execute("sql.prettify", input);

            expect(result).toContain("UPDATE");
            expect(result).toContain("SET");
            expect(result).toContain("WHERE");
        });

        it("should format DELETE statement", async () => {
            const input = "DELETE FROM users WHERE id=1";
            const result = await execute("sql.prettify", input);

            expect(result).toContain("DELETE");
            expect(result).toContain("FROM");
            expect(result).toContain("WHERE");
        });

        it("should handle empty input", async () => {
            const result = await execute("sql.prettify", "");
            expect(result).toBe("");
        });

        it("should preserve string literals", async () => {
            const input = "SELECT 'Hello World' FROM users";
            const result = await execute("sql.prettify", input);

            expect(result).toContain("'Hello World'");
        });

        it("should format complex nested queries", async () => {
            const input = "SELECT * FROM (SELECT id, name FROM users WHERE active=1) AS active_users";
            const result = await execute("sql.prettify", input);

            expect(result).toContain("SELECT");
            expect(result).toContain("FROM");
            // Should have proper nesting
            const lines = result.split('\n');
            expect(lines.length).toBeGreaterThan(1);
        });
    });

    describe("css.prettify", () => {
        it("should format basic CSS rule", async () => {
            const input = "body{color:red;background:white;}";
            const result = await execute("css.prettify", input);

            expect(result).toContain("body");
            expect(result).toContain("color: red");
            expect(result).toContain("background: white");
        });

        it("should use specified indentation", async () => {
            const input = "div{margin:0;}";
            const result = await execute("css.prettify", input, { indent: 4 });

            expect(result).toContain("    margin: 0"); // 4 spaces
        });

        it("should add space before brace when specified", async () => {
            const input = "div{color:red;}";
            const result = await execute("css.prettify", input, { spaceBraces: true });

            expect(result).toContain("div {");
        });

        it("should not add space before brace when disabled", async () => {
            const input = "div{color:red;}";
            const result = await execute("css.prettify", input, { spaceBraces: false });

            expect(result).toContain("div{");
        });

        it("should format multiple rules", async () => {
            const input = "body{color:red;}div{margin:0;}";
            const result = await execute("css.prettify", input);

            expect(result).toContain("body");
            expect(result).toContain("div");
            expect(result).toContain("color: red");
            expect(result).toContain("margin: 0");
        });

        it("should format nested selectors", async () => {
            const input = ".container .item{display:flex;}.container{width:100%;}";
            const result = await execute("css.prettify", input);

            expect(result).toContain(".container .item");
            expect(result).toContain("display: flex");
            expect(result).toContain(".container");
            expect(result).toContain("width: 100%");
        });

        it("should handle multiple properties", async () => {
            const input = "div{color:red;background:white;padding:10px;margin:5px;}";
            const result = await execute("css.prettify", input);

            expect(result).toContain("color: red");
            expect(result).toContain("background: white");
            expect(result).toContain("padding: 10px");
            expect(result).toContain("margin: 5px");
        });

        it("should handle empty rules", async () => {
            const input = "div{}";
            const result = await execute("css.prettify", input);

            expect(result).toContain("div");
        });

        it("should handle media queries", async () => {
            const input = "@media screen and (max-width:768px){body{font-size:14px;}}";
            const result = await execute("css.prettify", input);

            expect(result).toContain("@media");
            expect(result).toContain("body");
            expect(result).toContain("font-size: 14px");
        });

        it("should handle pseudo-selectors", async () => {
            const input = "a:hover{color:blue;}a:visited{color:purple;}";
            const result = await execute("css.prettify", input);

            expect(result).toContain("a:hover");
            expect(result).toContain("color: blue");
            expect(result).toContain("a:visited");
            expect(result).toContain("color: purple");
        });

        it("should handle comments", async () => {
            const input = "/* Comment */div{color:red;}";
            const result = await execute("css.prettify", input);

            expect(result).toContain("/* Comment */");
            expect(result).toContain("div");
            expect(result).toContain("color: red");
        });

        it("should handle empty input", async () => {
            const result = await execute("css.prettify", "");
            expect(result).toBe("");
        });

        it("should handle values with spaces", async () => {
            const input = "div{font-family:'Times New Roman',serif;}";
            const result = await execute("css.prettify", input);

            expect(result).toContain("font-family: 'Times New Roman', serif");
        });

        it("should handle important declarations", async () => {
            const input = "div{color:red!important;}";
            const result = await execute("css.prettify", input);

            expect(result).toContain("color: red !important");
        });

        it("should handle complex selectors", async () => {
            const input = "div > p + span[data-attr='value']{color:blue;}";
            const result = await execute("css.prettify", input);

            expect(result).toContain("div > p + span[data-attr='value']");
            expect(result).toContain("color: blue");
        });

        it("should handle CSS variables", async () => {
            const input = ":root{--primary-color:#007bff;}div{color:var(--primary-color);}";
            const result = await execute("css.prettify", input);

            expect(result).toContain(":root");
            expect(result).toContain("--primary-color: #007bff");
            expect(result).toContain("color: var(--primary-color)");
        });
    });
});
