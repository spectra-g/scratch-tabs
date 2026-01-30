/**
 * Unit Tests for Data Format Pipeline Operations
 *
 * Tests data format conversions like YAML/JSON and CSV column extraction.
 */

import { executeSingleOperation } from "../../pipelineExecutor";
import "../dataFormats";

describe("Data Format Pipeline Operations", () => {
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

    describe("yaml.to-json", () => {
        it("should convert simple YAML to JSON", async () => {
            const input = "name: John\nage: 30";
            const result = await execute("yaml.to-json", input);
            const parsed = JSON.parse(result);

            expect(parsed.name).toBe("John");
            expect(parsed.age).toBe(30);
        });

        it("should convert nested YAML to JSON", async () => {
            const input = `
person:
  name: John
  address:
    city: New York
    zip: 10001
`;
            const result = await execute("yaml.to-json", input);
            const parsed = JSON.parse(result);

            expect(parsed.person.name).toBe("John");
            expect(parsed.person.address.city).toBe("New York");
            expect(parsed.person.address.zip).toBe(10001);
        });

        it("should convert YAML arrays to JSON", async () => {
            const input = `
fruits:
  - apple
  - banana
  - orange
`;
            const result = await execute("yaml.to-json", input);
            const parsed = JSON.parse(result);

            expect(parsed.fruits).toEqual(["apple", "banana", "orange"]);
        });

        it("should use specified indentation", async () => {
            const input = "name: John";
            const result = await execute("yaml.to-json", input, { indent: 4 });

            expect(result).toContain("    "); // 4 spaces
        });

        it("should minify JSON when indent is 0", async () => {
            const input = "name: John\nage: 30";
            const result = await execute("yaml.to-json", input, { indent: 0 });

            expect(result).toBe('{"name":"John","age":30}');
        });

        it("should handle YAML with boolean values", async () => {
            const input = "active: true\ndeleted: false";
            const result = await execute("yaml.to-json", input);
            const parsed = JSON.parse(result);

            expect(parsed.active).toBe(true);
            expect(parsed.deleted).toBe(false);
        });

        it("should handle YAML with null values", async () => {
            const input = "value: null";
            const result = await execute("yaml.to-json", input);
            const parsed = JSON.parse(result);

            expect(parsed.value).toBeNull();
        });

        it("should throw error for invalid YAML", async () => {
            const input = "invalid:\n  - unbalanced";
            await expect(execute("yaml.to-json", "name: [unclosed")).rejects.toThrow(/YAML/);
        });

        it("should handle empty YAML", async () => {
            const result = await execute("yaml.to-json", "");
            expect(result).toBe("null");
        });

        it("should handle YAML with special characters", async () => {
            const input = 'message: "Hello: World"';
            const result = await execute("yaml.to-json", input);
            const parsed = JSON.parse(result);

            expect(parsed.message).toBe("Hello: World");
        });
    });

    describe("json.to-yaml", () => {
        it("should convert simple JSON to YAML", async () => {
            const input = '{"name":"John","age":30}';
            const result = await execute("json.to-yaml", input);

            expect(result).toContain("name: John");
            expect(result).toContain("age: 30");
        });

        it("should convert nested JSON to YAML", async () => {
            const input = '{"person":{"name":"John","address":{"city":"New York"}}}';
            const result = await execute("json.to-yaml", input);

            expect(result).toContain("person:");
            expect(result).toContain("  name: John");
            expect(result).toContain("  address:");
            expect(result).toContain("    city: New York");
        });

        it("should convert JSON arrays to YAML", async () => {
            const input = '{"fruits":["apple","banana","orange"]}';
            const result = await execute("json.to-yaml", input);

            expect(result).toContain("fruits:");
            expect(result).toContain("  - apple");
            expect(result).toContain("  - banana");
            expect(result).toContain("  - orange");
        });

        it("should use specified indentation", async () => {
            const input = '{"person":{"name":"John"}}';
            const result = await execute("json.to-yaml", input, { indent: 4 });

            expect(result).toContain("    name: John"); // 4 spaces
        });

        it("should handle JSON with boolean values", async () => {
            const input = '{"active":true,"deleted":false}';
            const result = await execute("json.to-yaml", input);

            expect(result).toContain("active: true");
            expect(result).toContain("deleted: false");
        });

        it("should handle JSON with null values", async () => {
            const input = '{"value":null}';
            const result = await execute("json.to-yaml", input);

            expect(result).toContain("value: null");
        });

        it("should throw error for invalid JSON", async () => {
            await expect(execute("json.to-yaml", "{invalid}")).rejects.toThrow(/JSON/);
        });

        it("should handle empty object", async () => {
            const result = await execute("json.to-yaml", "{}");
            expect(result.trim()).toBe("{}");
        });

        it("should handle JSON with strings containing special characters", async () => {
            const input = '{"message":"Hello: World"}';
            const result = await execute("json.to-yaml", input);

            expect(result).toContain('message: "Hello: World"');
        });

        it("should handle complex nested structures", async () => {
            const input = JSON.stringify({
                users: [
                    { name: "John", roles: ["admin", "user"] },
                    { name: "Jane", roles: ["user"] }
                ]
            });
            const result = await execute("json.to-yaml", input);

            expect(result).toContain("users:");
            expect(result).toContain("- name: John");
            expect(result).toContain("  roles:");
            expect(result).toContain("    - admin");
        });
    });

    describe("csv.extract-column", () => {
        it("should extract column by index", async () => {
            const input = "name,age,city\nJohn,30,NYC\nJane,25,LA";
            const result = await execute("csv.extract-column", input, {
                column: "1",
                hasHeaders: true
            });

            expect(result).toBe("30\n25");
        });

        it("should extract column by header name", async () => {
            const input = "name,age,city\nJohn,30,NYC\nJane,25,LA";
            const result = await execute("csv.extract-column", input, {
                column: "city",
                hasHeaders: true
            });

            expect(result).toBe("NYC\nLA");
        });

        it("should handle case-insensitive header names", async () => {
            const input = "Name,Age,City\nJohn,30,NYC\nJane,25,LA";
            const result = await execute("csv.extract-column", input, {
                column: "name",
                hasHeaders: true
            });

            expect(result).toBe("John\nJane");
        });

        it("should work without headers", async () => {
            const input = "John,30,NYC\nJane,25,LA";
            const result = await execute("csv.extract-column", input, {
                column: "0",
                hasHeaders: false
            });

            expect(result).toBe("John\nJane");
        });

        it("should handle tab-delimited data", async () => {
            const input = "name\tage\tcity\nJohn\t30\tNYC\nJane\t25\tLA";
            const result = await execute("csv.extract-column", input, {
                column: "age",
                delimiter: "\t",
                hasHeaders: true
            });

            expect(result).toBe("30\n25");
        });

        it("should handle semicolon delimiter", async () => {
            const input = "name;age;city\nJohn;30;NYC\nJane;25;LA";
            const result = await execute("csv.extract-column", input, {
                column: "1",
                delimiter: ";",
                hasHeaders: true
            });

            expect(result).toBe("30\n25");
        });

        it("should handle pipe delimiter", async () => {
            const input = "name|age|city\nJohn|30|NYC\nJane|25|LA";
            const result = await execute("csv.extract-column", input, {
                column: "age",
                delimiter: "|",
                hasHeaders: true
            });

            expect(result).toBe("30\n25");
        });

        it("should throw error for non-existent header", async () => {
            const input = "name,age,city\nJohn,30,NYC";
            await expect(execute("csv.extract-column", input, {
                column: "country",
                hasHeaders: true
            })).rejects.toThrow(/not found/);
        });

        it("should throw error for non-numeric column when no headers", async () => {
            const input = "John,30,NYC";
            await expect(execute("csv.extract-column", input, {
                column: "name",
                hasHeaders: false
            })).rejects.toThrow(/numeric/);
        });

        it("should handle empty cells", async () => {
            const input = "name,age,city\nJohn,,NYC\nJane,25,";
            const result = await execute("csv.extract-column", input, {
                column: "age",
                hasHeaders: true
            });

            expect(result).toBe("\n25");
        });

        it("should handle single column extraction", async () => {
            const input = "name\nJohn\nJane\nBob";
            const result = await execute("csv.extract-column", input, {
                column: "0",
                hasHeaders: false
            });

            expect(result).toBe("name\nJohn\nJane\nBob");
        });

        it("should handle empty input", async () => {
            const result = await execute("csv.extract-column", "", {
                column: "0",
                hasHeaders: false
            });

            expect(result).toBe("");
        });

        it("should skip rows with missing columns", async () => {
            const input = "name,age,city\nJohn,30,NYC\nJane\nBob,35,LA";
            const result = await execute("csv.extract-column", input, {
                column: "2",
                hasHeaders: true
            });

            expect(result).toBe("NYC\nLA");
        });

        it("should extract first column (index 0)", async () => {
            const input = "name,age,city\nJohn,30,NYC\nJane,25,LA";
            const result = await execute("csv.extract-column", input, {
                column: "0",
                hasHeaders: true
            });

            expect(result).toBe("John\nJane");
        });

        it("should trim whitespace from cells", async () => {
            const input = "name, age, city\n John , 30 , NYC \n Jane , 25 , LA ";
            const result = await execute("csv.extract-column", input, {
                column: "age",
                hasHeaders: true
            });

            expect(result).toBe("30\n25");
        });

        it("should handle quoted fields containing delimiters", async () => {
            const input = 'name,age,address\n"Doe, John",30,"123 Main St, Apt 4"\n"Smith, Jane",25,"456 Oak Ave, Unit 2"';
            const result = await execute("csv.extract-column", input, {
                column: "name",
                hasHeaders: true
            });

            expect(result).toBe("Doe, John\nSmith, Jane");
        });

        it("should handle quoted fields with escaped quotes", async () => {
            const input = 'name,message\n"John","He said ""Hello"""\n"Jane","She said ""Goodbye"""';
            const result = await execute("csv.extract-column", input, {
                column: "message",
                hasHeaders: true
            });

            expect(result).toBe('He said "Hello"\nShe said "Goodbye"');
        });

        it("should handle mixed quoted and unquoted fields", async () => {
            const input = 'name,age,city\n"Doe, John",30,NYC\nJane,25,"Los Angeles, CA"';
            const result = await execute("csv.extract-column", input, {
                column: "city",
                hasHeaders: true
            });

            expect(result).toBe("NYC\nLos Angeles, CA");
        });

        it("should handle semicolon delimiter with quoted fields", async () => {
            const input = 'name;description\n"Product A";"Contains; semicolons"\n"Product B";"Normal text"';
            const result = await execute("csv.extract-column", input, {
                column: "description",
                delimiter: ";",
                hasHeaders: true
            });

            expect(result).toBe("Contains; semicolons\nNormal text");
        });

        it("should handle empty quoted fields", async () => {
            const input = 'name,middle,last\n"John","","Doe"\n"Jane","M","Smith"';
            const result = await execute("csv.extract-column", input, {
                column: "middle",
                hasHeaders: true
            });

            expect(result).toBe("\nM");
        });

        it("should handle tab delimiter with quoted fields", async () => {
            const input = 'name\tdescription\n"Item 1"\t"Contains\ttabs"\n"Item 2"\t"Normal"';
            const result = await execute("csv.extract-column", input, {
                column: "description",
                delimiter: "\t",
                hasHeaders: true
            });

            expect(result).toBe("Contains\ttabs\nNormal");
        });
    });
});
