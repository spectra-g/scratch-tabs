import JSZip from "jszip";
import { ArchiveEntry, ArchiveStats, FilenameEncoding } from "../types";
import { mimeFromExtension, getExtension } from "./mimeFromExtension";

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "log", "sh", "bash", "py", "go", "rs", "java", "kt", "ts",
  "tsx", "js", "jsx", "css", "html", "htm", "xml", "json", "yaml", "yml",
  "toml", "ini", "properties", "env", "gitignore", "makefile", "gradle",
  "pom", "c", "cpp", "h", "hpp", "cs", "rb", "php", "swift", "scala",
  "r", "lua", "pl", "pm", "bat", "cmd", "ps1", "sql", "conf", "cfg",
  "csv", "tsv", "ndjson", "graphql", "proto", "lock", "tf", "hcl",
]);

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg"]);

const ENCODING_LABEL: Record<FilenameEncoding, string> = {
  "utf-8": "utf-8",
  "cp437": "ibm437",
  "shift-jis": "shift-jis",
  "windows-1252": "windows-1252",
};

interface ParseOptions {
  filenameEncoding: FilenameEncoding;
  onProgress?: (percent: number) => void;
}

interface ParseResult {
  entries: ArchiveEntry[];
  stats: ArchiveStats;
}

interface InternalData {
  compressedSize?: number;
  uncompressedSize?: number;
  crc32?: number;
  flags?: number;
  compressionMethod?: number;
}

export async function parseArchive(buffer: ArrayBuffer, opts: ParseOptions): Promise<ParseResult> {
  opts.onProgress?.(0);

  const loadOptions: JSZip.JSZipLoadOptions = {
    checkCRC32: false,
  };

  const encodingLabel = ENCODING_LABEL[opts.filenameEncoding];
  if (opts.filenameEncoding !== "utf-8") {
    loadOptions.decodeFileName = (bytes: Uint8Array) => {
      try {
        return new TextDecoder(encodingLabel).decode(bytes);
      } catch {
        return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      }
    };
  }

  const zip = await JSZip.loadAsync(buffer, loadOptions);
  opts.onProgress?.(50);

  const entries: ArchiveEntry[] = [];

  zip.forEach((relativePath, zipObj) => {
    const internalData = (zipObj as unknown as { _data: InternalData })._data ?? {};
    const compressedSize = internalData.compressedSize ?? 0;
    const uncompressedSize = internalData.uncompressedSize ?? 0;
    const rawCrc32 = internalData.crc32 ?? 0;

    const encryptionType = detectEncryptionType(internalData);
    const segments = relativePath.split("/").filter(Boolean);
    const name = segments[segments.length - 1] ?? relativePath;
    const depth = Math.max(0, segments.length - 1);
    const compressionRatio =
      uncompressedSize > 0 ? 1 - compressedSize / uncompressedSize : 0;
    const ext = getExtension(name);

    entries.push({
      path: relativePath,
      name,
      isDirectory: zipObj.dir,
      sizeUncompressed: uncompressedSize,
      sizeCompressed: compressedSize,
      compressionRatio: Math.max(0, compressionRatio),
      modified: zipObj.date ? zipObj.date.getTime() : null,
      comment: zipObj.comment ?? "",
      encryptionType,
      crc32: ((rawCrc32 >>> 0) as number).toString(16).toUpperCase().padStart(8, "0"),
      mimeType: mimeFromExtension(name),
      isTextPreviewable: !zipObj.dir && (TEXT_EXTENSIONS.has(ext) || TEXT_EXTENSIONS.has(name.toLowerCase())),
      isImagePreviewable: !zipObj.dir && IMAGE_EXTENSIONS.has(ext),
      depth,
    });
  });

  opts.onProgress?.(90);
  const stats = buildStats(entries, (zip as unknown as { comment?: string }).comment ?? "");
  opts.onProgress?.(100);

  return { entries, stats };
}

function detectEncryptionType(data: InternalData): "none" | "zipcrypto" | "aes" {
  if (data.compressionMethod === 99) return "aes";
  const flags = data.flags ?? 0;
  if (flags & 1) return "zipcrypto";
  return "none";
}

function buildStats(entries: ArchiveEntry[], archiveComment: string): ArchiveStats {
  const files = entries.filter((e) => !e.isDirectory);
  const dirs = entries.filter((e) => e.isDirectory);
  const totalUncompressed = files.reduce((s, e) => s + e.sizeUncompressed, 0);
  const totalCompressed = files.reduce((s, e) => s + e.sizeCompressed, 0);

  const extMap = new Map<string, { count: number; totalBytes: number }>();
  for (const e of files) {
    const ext = getExtension(e.name) || "(no ext)";
    const existing = extMap.get(ext) ?? { count: 0, totalBytes: 0 };
    extMap.set(ext, {
      count: existing.count + 1,
      totalBytes: existing.totalBytes + e.sizeUncompressed,
    });
  }

  const extensionBreakdown = Array.from(extMap.entries())
    .map(([ext, v]) => ({ ext, ...v }))
    .sort((a, b) => b.totalBytes - a.totalBytes);

  const largestFiles = [...files]
    .sort((a, b) => b.sizeUncompressed - a.sizeUncompressed)
    .slice(0, 10)
    .map((e) => ({ path: e.path, sizeUncompressed: e.sizeUncompressed }));

  const nestedDepth = entries.reduce((max, e) => Math.max(max, e.depth), 0);

  return {
    totalEntries: entries.length,
    fileCount: files.length,
    directoryCount: dirs.length,
    totalUncompressedBytes: totalUncompressed,
    totalCompressedBytes: totalCompressed,
    overallRatio: totalUncompressed > 0 ? 1 - totalCompressed / totalUncompressed : 0,
    zipCryptoCount: entries.filter((e) => e.encryptionType === "zipcrypto").length,
    aesCount: entries.filter((e) => e.encryptionType === "aes").length,
    archiveComment,
    extensionBreakdown,
    largestFiles,
    nestedDepth,
  };
}
