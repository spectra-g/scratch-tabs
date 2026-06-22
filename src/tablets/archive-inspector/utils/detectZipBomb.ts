const RATIO_THRESHOLD = 100;
const COMPRESSED_SIZE_THRESHOLD = 1_000_000; // 1 MB

export function isZipBomb(compressedBytes: number, uncompressedBytes: number): boolean {
  if (compressedBytes < COMPRESSED_SIZE_THRESHOLD) return false;
  if (uncompressedBytes === 0) return false;
  return uncompressedBytes / compressedBytes > RATIO_THRESHOLD;
}
