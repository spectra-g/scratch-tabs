import {
  attachPersistedContent,
  canPersistSourceKind,
  createSourceFromFile,
  createRegisteredSource,
  createUniqueTableName,
  detectSourceKind,
  PERSISTED_SOURCE_SIZE_LIMIT_BYTES,
  quoteIdentifier,
  sanitizeIdentifier,
} from "../engine/sourceRegistry";

describe("SQL sandbox source registry", () => {
  it("detects supported file kinds", () => {
    expect(detectSourceKind("orders.csv")).toBe("csv");
    expect(detectSourceKind("events.jsonl")).toBe("ndjson");
    expect(detectSourceKind("warehouse.parquet")).toBe("parquet");
    expect(detectSourceKind("notes.txt")).toBeNull();
  });

  it("sanitizes source names into safe table identifiers", () => {
    expect(sanitizeIdentifier("2026 Revenue.csv")).toBe("data_2026_revenue");
    expect(sanitizeIdentifier("customer-events.ndjson")).toBe("customer_events");
    expect(sanitizeIdentifier("!@#.csv")).toBe("data");
  });

  it("creates unique table names case-insensitively", () => {
    expect(createUniqueTableName("orders", ["Orders", "orders_2"])).toBe("orders_3");
  });

  it("quotes identifiers by escaping embedded quotes", () => {
    expect(quoteIdentifier('bad"name')).toBe('"bad""name"');
  });

  it("creates a source from a supported File", () => {
    const file = new File(["id,name\n1,Ada"], "people.csv", { type: "text/csv" });
    const source = createSourceFromFile(file, ["people"]);

    expect(source.kind).toBe("csv");
    expect(source.tableName).toBe("people_2");
    expect(source.file).toBe(file);
  });

  it("persists text source content under the size cap", async () => {
    const file = new File(["id,name\n1,Ada"], "people.csv", { type: "text/csv" });
    const source = createSourceFromFile(file);
    const registered = await attachPersistedContent(createRegisteredSource(source), file);

    expect(registered.restoreStatus).toBe("available");
    expect(registered.persistedContent?.content).toBe("id,name\n1,Ada");
  });

  it("marks oversized text sources as too large to restore automatically", async () => {
    const file = new File(["x".repeat(PERSISTED_SOURCE_SIZE_LIMIT_BYTES + 1)], "large.csv");
    const source = createSourceFromFile(file);
    const registered = await attachPersistedContent(createRegisteredSource(source), file);

    expect(registered.restoreStatus).toBe("too-large");
    expect(registered.persistedContent).toBeUndefined();
  });

  it("does not persist unsupported binary source content", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "data.parquet");
    const source = createSourceFromFile(file);
    const registered = await attachPersistedContent(createRegisteredSource(source), file);

    expect(canPersistSourceKind("parquet")).toBe(false);
    expect(registered.restoreStatus).toBe("unsupported");
    expect(registered.persistedContent).toBeUndefined();
  });

  it("rejects unsupported files", () => {
    const file = new File(["hello"], "notes.txt");
    expect(() => createSourceFromFile(file)).toThrow("Unsupported source type");
  });
});
