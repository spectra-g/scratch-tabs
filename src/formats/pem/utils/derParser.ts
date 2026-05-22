/**
 * Minimal DER/ASN.1 parser for X.509 certificate field extraction.
 * Handles only the subset of ASN.1 needed for certificate inspection.
 */

export const TAG = {
  BOOLEAN: 0x01,
  INTEGER: 0x02,
  BIT_STRING: 0x03,
  OCTET_STRING: 0x04,
  NULL: 0x05,
  OID: 0x06,
  UTF8_STRING: 0x0c,
  SEQUENCE: 0x30,
  SET: 0x31,
  NUMERIC_STRING: 0x12,
  PRINTABLE_STRING: 0x13,
  TELETEX_STRING: 0x14,
  IA5_STRING: 0x16,
  UTC_TIME: 0x17,
  GENERALIZED_TIME: 0x18,
  BMP_STRING: 0x1e,
  // Context-specific constructed
  CTX_0: 0xa0,
  CTX_1: 0xa1,
  CTX_2: 0xa2,
  CTX_3: 0xa3,
  // Context-specific primitive
  CTX_PRIM_0: 0x80,
  CTX_PRIM_1: 0x81,
  CTX_PRIM_2: 0x82,
  CTX_PRIM_6: 0x86,
  CTX_PRIM_7: 0x87,
} as const;

export interface AsnNode {
  tag: number;
  /** Byte offset of the value within the source buffer */
  valueOffset: number;
  valueLength: number;
  /** Raw value bytes */
  value: Uint8Array;
  /** Parsed children for constructed types */
  children: AsnNode[];
}

/** Read the tag and length at `offset`; return the node and the next offset. */
function readNode(
  data: Uint8Array,
  offset: number,
): { node: AsnNode; next: number } {
  if (offset >= data.length) {
    throw new Error(`DER read past end at offset ${offset}`);
  }

  const tag = data[offset++];
  let length = data[offset++];

  if (length & 0x80) {
    const numBytes = length & 0x7f;
    if (numBytes > 4) throw new Error("DER length too large");
    length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | data[offset++];
    }
  }

  const valueOffset = offset;
  const value = data.slice(offset, offset + length);
  offset += length;

  const isConstructed = !!(tag & 0x20);
  const children: AsnNode[] = [];
  if (isConstructed) {
    let childOffset = 0;
    while (childOffset < value.length) {
      const { node: child, next } = readNode(value, childOffset);
      children.push(child);
      childOffset = next;
    }
  }

  return {
    node: { tag, valueOffset, valueLength: length, value, children },
    next: offset,
  };
}

/** Parse a DER-encoded buffer into an ASN.1 node tree. */
export function parseDer(data: Uint8Array): AsnNode {
  const { node } = readNode(data, 0);
  return node;
}

/** Decode an OID value to dot-notation string (e.g. "2.5.4.3"). */
export function decodeOid(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  const parts: number[] = [];
  const first = bytes[0];
  parts.push(Math.floor(first / 40));
  parts.push(first % 40);

  let value = 0;
  for (let i = 1; i < bytes.length; i++) {
    const b = bytes[i];
    value = (value << 7) | (b & 0x7f);
    if (!(b & 0x80)) {
      parts.push(value);
      value = 0;
    }
  }
  return parts.join(".");
}

/** Decode a DER INTEGER to a hex string. */
export function decodeInteger(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(":");
}

/** Decode a DER INTEGER to a BigInt. */
export function decodeIntegerBigInt(bytes: Uint8Array): bigint {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return n;
}

/** Decode a string tag (UTF8, PrintableString, IA5String, etc.). */
export function decodeString(tag: number, bytes: Uint8Array): string {
  try {
    if (tag === TAG.BMP_STRING) {
      // UTF-16 big-endian
      const chars: string[] = [];
      for (let i = 0; i + 1 < bytes.length; i += 2) {
        chars.push(String.fromCharCode((bytes[i] << 8) | bytes[i + 1]));
      }
      return chars.join("");
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join("");
  }
}

/** Parse a UTCTime or GeneralizedTime to a Date. */
export function decodeTime(tag: number, bytes: Uint8Array): Date {
  const s = new TextDecoder().decode(bytes).replace("Z", "");
  if (tag === TAG.UTC_TIME) {
    // YYMMDDHHMMSS
    const [yr, mo, d, h, m, sec] = [
      s.slice(0, 2),
      s.slice(2, 4),
      s.slice(4, 6),
      s.slice(6, 8),
      s.slice(8, 10),
      s.slice(10, 12),
    ];
    const year = parseInt(yr) >= 50 ? 1900 + parseInt(yr) : 2000 + parseInt(yr);
    return new Date(
      `${year}-${mo}-${d}T${h}:${m}:${sec}Z`,
    );
  } else {
    // GeneralizedTime: YYYYMMDDHHMMSS
    const year = s.slice(0, 4);
    const mo = s.slice(4, 6);
    const d = s.slice(6, 8);
    const h = s.slice(8, 10);
    const m = s.slice(10, 12);
    const sec = s.slice(12, 14);
    return new Date(`${year}-${mo}-${d}T${h}:${m}:${sec}Z`);
  }
}

/** Find the first direct child of a node with the given tag. */
export function findChild(node: AsnNode, tag: number): AsnNode | undefined {
  return node.children.find((c) => c.tag === tag);
}

/** Find all direct children of a node with the given tag. */
export function findChildren(node: AsnNode, tag: number): AsnNode[] {
  return node.children.filter((c) => c.tag === tag);
}
