// Pre-built CRC32 lookup table using the standard IEEE 802.3 polynomial
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    table[i] = crc;
  }
  return table;
})();

export function computeCRC32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function digestHex(bytes: Uint8Array, algorithm: "SHA-1" | "SHA-256"): Promise<string> {
  const buf = await crypto.subtle.digest(algorithm, bytes);
  const view = new Uint8Array(buf);
  const parts = new Array<string>(view.length);
  for (let i = 0; i < view.length; i++) {
    parts[i] = view[i].toString(16).padStart(2, "0");
  }
  return parts.join("");
}

export interface ChecksumResult {
  crc32: string;
  sha1: string;
  sha256: string;
}

export async function computeChecksums(bytes: Uint8Array): Promise<ChecksumResult> {
  const crc32 = computeCRC32(bytes).toString(16).toUpperCase().padStart(8, "0");
  const [sha1, sha256] = await Promise.all([
    digestHex(bytes, "SHA-1"),
    digestHex(bytes, "SHA-256"),
  ]);
  return { crc32, sha1, sha256 };
}
