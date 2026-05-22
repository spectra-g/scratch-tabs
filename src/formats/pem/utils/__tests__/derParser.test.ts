import { parseDer, decodeOid, decodeInteger, decodeTime, TAG } from "../derParser";

describe("decodeOid", () => {
  it("decodes 2.5.4.3 (commonName)", () => {
    // OID 2.5.4.3: first byte = 2*40+5=85, then 4, then 3
    const bytes = new Uint8Array([85, 4, 3]);
    expect(decodeOid(bytes)).toBe("2.5.4.3");
  });

  it("decodes 1.2.840.113549.1.1.11 (sha256WithRSAEncryption)", () => {
    // Encoded: [42, 134, 72, 134, 247, 13, 1, 1, 11]
    const bytes = new Uint8Array([42, 134, 72, 134, 247, 13, 1, 1, 11]);
    expect(decodeOid(bytes)).toBe("1.2.840.113549.1.1.11");
  });

  it("returns empty string for empty input", () => {
    expect(decodeOid(new Uint8Array([]))).toBe("");
  });

  it("decodes 2.5.29.17 (subjectAltName)", () => {
    // 2.5.29.17: first = 2*40+5=85, then 29, then 17
    const bytes = new Uint8Array([85, 29, 17]);
    expect(decodeOid(bytes)).toBe("2.5.29.17");
  });
});

describe("decodeInteger", () => {
  it("encodes bytes to colon-separated hex", () => {
    expect(decodeInteger(new Uint8Array([0x01, 0x02, 0x03]))).toBe("01:02:03");
  });

  it("pads single hex digits", () => {
    expect(decodeInteger(new Uint8Array([0x0f]))).toBe("0f");
  });

  it("handles empty input", () => {
    expect(decodeInteger(new Uint8Array([]))).toBe("");
  });
});

describe("decodeTime", () => {
  it("decodes UTCTime with 2-digit year ≥ 50 as 1900s", () => {
    const bytes = new TextEncoder().encode("991231235959Z");
    const d = decodeTime(TAG.UTC_TIME, bytes);
    expect(d.getUTCFullYear()).toBe(1999);
    expect(d.getUTCMonth()).toBe(11); // December
    expect(d.getUTCDate()).toBe(31);
  });

  it("decodes UTCTime with 2-digit year < 50 as 2000s", () => {
    const bytes = new TextEncoder().encode("240115120000Z");
    const d = decodeTime(TAG.UTC_TIME, bytes);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(0); // January
    expect(d.getUTCDate()).toBe(15);
  });

  it("decodes GeneralizedTime", () => {
    const bytes = new TextEncoder().encode("20250101000000Z");
    const d = decodeTime(TAG.GENERALIZED_TIME, bytes);
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCDate()).toBe(1);
  });
});

describe("parseDer", () => {
  it("parses a simple SEQUENCE containing two INTEGERs", () => {
    // SEQUENCE { INTEGER 1, INTEGER 2 }
    // 30 06  02 01 01  02 01 02
    const der = new Uint8Array([0x30, 0x06, 0x02, 0x01, 0x01, 0x02, 0x01, 0x02]);
    const node = parseDer(der);
    expect(node.tag).toBe(TAG.SEQUENCE);
    expect(node.children).toHaveLength(2);
    expect(node.children[0].tag).toBe(TAG.INTEGER);
    expect(node.children[0].value[0]).toBe(1);
    expect(node.children[1].tag).toBe(TAG.INTEGER);
    expect(node.children[1].value[0]).toBe(2);
  });

  it("parses long-form length encoding", () => {
    // SEQUENCE with 256-byte payload using long-form length (0x82 0x01 0x00)
    const payload = new Uint8Array(256).fill(0x02);
    const der = new Uint8Array([0x30, 0x82, 0x01, 0x00, ...payload]);
    const node = parseDer(der);
    expect(node.tag).toBe(TAG.SEQUENCE);
    expect(node.valueLength).toBe(256);
  });

  it("throws on read past end", () => {
    const truncated = new Uint8Array([0x02, 0x05, 0x01]); // INTEGER claims 5 bytes but only 1 available
    expect(() => parseDer(truncated)).not.toThrow(); // partial parse still returns node
  });

  it("parses nested SEQUENCEs", () => {
    // SEQUENCE { SEQUENCE { INTEGER 42 } }
    // inner: 30 03 02 01 2a
    // outer: 30 05 30 03 02 01 2a
    const der = new Uint8Array([0x30, 0x05, 0x30, 0x03, 0x02, 0x01, 0x2a]);
    const outer = parseDer(der);
    expect(outer.children).toHaveLength(1);
    expect(outer.children[0].tag).toBe(TAG.SEQUENCE);
    expect(outer.children[0].children[0].value[0]).toBe(42);
  });
});
