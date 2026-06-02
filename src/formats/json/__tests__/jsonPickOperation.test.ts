import { executeSingleOperation } from "@/services/pipeline/pipelineExecutor";
import "@/formats/json/pipelineOperations";

describe("json.pick pipeline operation", () => {
  const execute = async (
    input: string,
    params: Record<string, unknown> = {},
  ): Promise<string> => {
    const result = await executeSingleOperation("json.pick", input, params);
    if (!result.success) throw new Error(result.error);
    return result.output;
  };

  it("picks top-level and nested object paths", async () => {
    const result = await execute(
      '{"user":{"name":"Ada","email":"ada@example.com","token":"secret"},"meta":{"id":"m1"},"extra":true}',
      { paths: "user.name,user.email,meta.id" },
    );

    expect(JSON.parse(result)).toEqual({
      user: { name: "Ada", email: "ada@example.com" },
      meta: { id: "m1" },
    });
  });

  it("supports array indexes in dot paths", async () => {
    const result = await execute(
      '{"items":[{"id":1,"name":"first"},{"id":2,"name":"second"}]}',
      { paths: "items.1.name" },
    );

    expect(JSON.parse(result)).toEqual({ items: { "1": { name: "second" } } });
  });

  it("skips missing paths by default", async () => {
    const result = await execute('{"user":{"name":"Ada"}}', {
      paths: "user.name,user.email",
    });

    expect(JSON.parse(result)).toEqual({ user: { name: "Ada" } });
  });

  it("can include missing paths as null", async () => {
    const result = await execute('{"user":{"name":"Ada"}}', {
      paths: "user.name,user.email",
      includeMissing: true,
    });

    expect(JSON.parse(result)).toEqual({ user: { name: "Ada", email: null } });
  });

  it("supports minified output with indent 0", async () => {
    const result = await execute('{"a":1,"b":2}', { paths: "b", indent: 0 });
    expect(result).toBe('{"b":2}');
  });

  it("throws when no paths are provided", async () => {
    await expect(execute('{"a":1}', { paths: "" })).rejects.toThrow("path");
  });

  it("throws on invalid JSON input", async () => {
    await expect(execute("{invalid}", { paths: "a" })).rejects.toThrow();
  });

  it("does not write unsafe prototype paths", async () => {
    const prototype = Object.prototype as Record<string, unknown>;
    delete prototype.polluted;

    const result = await execute('{"safe":true}', {
      paths: "__proto__.polluted,constructor.polluted,prototype.polluted",
      includeMissing: true,
    });

    expect(JSON.parse(result)).toEqual({});
    expect(prototype.polluted).toBeUndefined();
  });
});
