import JSZip from "jszip";
import {
  CANVAS_IMAGE_MAX_DIMENSION,
  CANVAS_IMAGE_MAX_BYTES,
  CANVAS_IMAGE_MIME_TYPES,
  CANVAS_IMAGE_MAX_PIXELS,
} from "../canvas/constants";
import { parseCanvasAssetRecord } from "../canvas/services/CanvasAssetRepository";
import { parseCanvasDocument } from "../canvas/utils/canvasSchemas";
import type { CanvasAssetRecord, CanvasDocument } from "../canvas/types";
import {
  type ArchiveManifest,
  type ArchiveManifestEntry,
  type DecodedWorkspaceArchive,
  type ExportData,
  type ExportFileContent,
  EXPORT_FORMAT_VERSION,
  LEGACY_EXPORT_FORMAT_VERSIONS,
  WORKSPACE_DATA_PATH,
} from "./types";
import { generateSha256, stableStringifyDataBlock } from "./utils";
import { parseExportData } from "./importValidation";

const MANIFEST_PATH = "manifest.json";
const LEGACY_DATA_PATH = "export-data.json";
const LEGACY_CHECKSUM_PATH = "checksum.sha256";
const MAX_MANIFEST_BYTES = 25 * 1024 * 1024;
const MAX_WORKSPACE_DATA_BYTES = 256 * 1024 * 1024;
const MAX_CANVAS_DOCUMENT_BYTES = 256 * 1024 * 1024;
const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 512 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const supportedMimeTypes = new Set<string>(CANVAS_IMAGE_MIME_TYPES);

type ArchiveValue = string | Blob | Uint8Array | ArrayBuffer;

interface PendingEntry {
  manifest: Omit<ArchiveManifestEntry, "sha256" | "byteLength">;
  value: ArchiveValue;
}

const entrySizeLimit = (kind: ArchiveManifestEntry["kind"]): number => {
  if (kind === "canvas-asset") return CANVAS_IMAGE_MAX_BYTES;
  if (kind === "canvas-document") return MAX_CANVAS_DOCUMENT_BYTES;
  return MAX_WORKSPACE_DATA_BYTES;
};

const byteLengthOf = async (value: ArchiveValue): Promise<number> => {
  if (typeof value === "string") return new TextEncoder().encode(value).length;
  if (value instanceof Blob) return value.size;
  return value.byteLength;
};

const readBlobBytes = async (blob: Blob): Promise<Uint8Array> => {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error("Unable to read Blob"));
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error("Unable to read Blob as binary data"));
        return;
      }
      resolve(new Uint8Array(reader.result));
    };
    reader.readAsArrayBuffer(blob);
  });
};

const toBytes = async (value: ArchiveValue): Promise<Uint8Array> => {
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof Blob) return readBlobBytes(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return value;
};

const documentPath = (index: number): string =>
  `canvas/documents/${String(index).padStart(6, "0")}.json`;

const assetPath = (index: number): string =>
  `canvas/assets/${String(index).padStart(6, "0")}.bin`;

export const createWorkspaceArchive = async (
  data: ExportData,
  documents: readonly CanvasDocument[],
  assets: readonly CanvasAssetRecord[],
  exportedAt = new Date().toISOString(),
): Promise<Blob> => {
  const pending: PendingEntry[] = [
    {
      manifest: { path: WORKSPACE_DATA_PATH, kind: "workspace-data" },
      value: JSON.stringify(data, null, 2),
    },
    ...documents.map((document, index) => ({
      manifest: {
        path: documentPath(index),
        kind: "canvas-document" as const,
        id: document.id,
        workspaceId: document.workspaceId,
      },
      value: JSON.stringify(document, null, 2),
    })),
    ...assets.map((asset, index) => ({
      manifest: {
        path: assetPath(index),
        kind: "canvas-asset" as const,
        id: asset.id,
        workspaceId: asset.workspaceId,
        mimeType: asset.mimeType,
        ...(asset.originalName ? { originalName: asset.originalName } : {}),
        ...(asset.width ? { width: asset.width } : {}),
        ...(asset.height ? { height: asset.height } : {}),
        createdAt: asset.createdAt,
      },
      value: asset.blob,
    })),
  ];

  const entries: ArchiveManifestEntry[] = [];
  for (const entry of pending) {
    const bytes = await toBytes(entry.value);
    if (bytes.byteLength > entrySizeLimit(entry.manifest.kind)) {
      throw new Error(
        `Archive entry ${entry.manifest.path} exceeds its size limit.`,
      );
    }
    entries.push({
      ...entry.manifest,
      byteLength: await byteLengthOf(entry.value),
      sha256: await generateSha256(bytes),
    });
  }
  if (
    entries.reduce((total, entry) => total + entry.byteLength, 0) >
    MAX_ARCHIVE_UNCOMPRESSED_BYTES
  ) {
    throw new Error("The selected workspaces are too large to export safely.");
  }

  const manifest: ArchiveManifest = {
    exportFormatVersion: EXPORT_FORMAT_VERSION,
    exportedAt,
    entries,
  };
  const manifestJson = JSON.stringify(manifest, null, 2);
  if (new TextEncoder().encode(manifestJson).byteLength > MAX_MANIFEST_BYTES) {
    throw new Error("The archive manifest exceeds its size limit.");
  }
  const zip = new JSZip();
  zip.file(MANIFEST_PATH, manifestJson);
  pending.forEach(({ manifest: entry, value }) => zip.file(entry.path, value));
  return zip.generateAsync({ type: "blob" });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertSafePath = (path: unknown): string => {
  if (
    typeof path !== "string" ||
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error("Archive manifest contains an unsafe file path.");
  }
  return path;
};

interface ParsedArchiveManifestEntry extends ArchiveManifestEntry {
  validationError?: string;
}

interface ParsedArchiveManifest extends Omit<ArchiveManifest, "entries"> {
  entries: ParsedArchiveManifestEntry[];
}

const parseManifest = (value: unknown): ParsedArchiveManifest => {
  if (
    !isRecord(value) ||
    value.exportFormatVersion !== EXPORT_FORMAT_VERSION ||
    typeof value.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(value.exportedAt)) ||
    !Array.isArray(value.entries)
  ) {
    throw new Error("The archive manifest is invalid or unsupported.");
  }

  const seenPaths = new Set<string>();
  const entries = value.entries.map(
    (unsafeEntry): ParsedArchiveManifestEntry => {
      if (!isRecord(unsafeEntry)) {
        throw new Error("The archive manifest contains an invalid entry.");
      }
      const path = assertSafePath(unsafeEntry.path);
      if (seenPaths.has(path)) {
        throw new Error(
          `The archive manifest contains duplicate path ${path}.`,
        );
      }
      seenPaths.add(path);
      if (
        unsafeEntry.kind !== "workspace-data" &&
        unsafeEntry.kind !== "canvas-document" &&
        unsafeEntry.kind !== "canvas-asset"
      ) {
        throw new Error(
          `The archive manifest has an unsupported entry at ${path}.`,
        );
      }
      if (
        typeof unsafeEntry.sha256 !== "string" ||
        !SHA256_PATTERN.test(unsafeEntry.sha256) ||
        !Number.isInteger(unsafeEntry.byteLength) ||
        (unsafeEntry.byteLength as number) < 0
      ) {
        throw new Error(
          `The archive manifest has invalid integrity data at ${path}.`,
        );
      }

      const common = {
        path,
        kind: unsafeEntry.kind,
        sha256: unsafeEntry.sha256,
        byteLength: unsafeEntry.byteLength as number,
      };
      if (unsafeEntry.kind === "workspace-data") return common;
      const hasInvalidIdentity =
        typeof unsafeEntry.id !== "string" ||
        !unsafeEntry.id ||
        typeof unsafeEntry.workspaceId !== "string" ||
        !unsafeEntry.workspaceId;
      if (unsafeEntry.kind === "canvas-document") {
        return {
          ...common,
          ...(typeof unsafeEntry.id === "string" ? { id: unsafeEntry.id } : {}),
          ...(typeof unsafeEntry.workspaceId === "string"
            ? { workspaceId: unsafeEntry.workspaceId }
            : {}),
          ...(hasInvalidIdentity
            ? {
                validationError: `The document manifest is missing Canvas identity at ${path}.`,
              }
            : {}),
        };
      }
      let validationError = hasInvalidIdentity
        ? `The asset manifest is missing Canvas identity at ${path}.`
        : undefined;
      if (
        typeof unsafeEntry.mimeType !== "string" ||
        !supportedMimeTypes.has(unsafeEntry.mimeType.toLowerCase()) ||
        typeof unsafeEntry.createdAt !== "number" ||
        !Number.isFinite(unsafeEntry.createdAt)
      ) {
        validationError ??= `The archive manifest has invalid asset metadata at ${path}.`;
      }
      const width = unsafeEntry.width;
      const height = unsafeEntry.height;
      for (const [field, dimension] of [
        ["width", width],
        ["height", height],
      ] as const) {
        if (
          dimension !== undefined &&
          (!Number.isInteger(dimension) ||
            (dimension as number) <= 0 ||
            (dimension as number) > CANVAS_IMAGE_MAX_DIMENSION)
        ) {
          validationError ??= `The archive manifest has an invalid asset ${field} at ${path}.`;
        }
      }
      if (
        typeof width === "number" &&
        typeof height === "number" &&
        width * height > CANVAS_IMAGE_MAX_PIXELS
      ) {
        validationError ??= `The archive manifest has excessive asset dimensions at ${path}.`;
      }
      if (
        unsafeEntry.originalName !== undefined &&
        typeof unsafeEntry.originalName !== "string"
      ) {
        validationError ??= `The archive manifest has an invalid asset filename at ${path}.`;
      }
      return {
        ...common,
        ...(typeof unsafeEntry.id === "string" ? { id: unsafeEntry.id } : {}),
        ...(typeof unsafeEntry.workspaceId === "string"
          ? { workspaceId: unsafeEntry.workspaceId }
          : {}),
        ...(typeof unsafeEntry.mimeType === "string"
          ? { mimeType: unsafeEntry.mimeType.toLowerCase() }
          : {}),
        ...(typeof unsafeEntry.originalName === "string"
          ? { originalName: unsafeEntry.originalName }
          : {}),
        ...(unsafeEntry.width === undefined
          ? {}
          : { width: unsafeEntry.width as number }),
        ...(unsafeEntry.height === undefined
          ? {}
          : { height: unsafeEntry.height as number }),
        ...(typeof unsafeEntry.createdAt === "number"
          ? { createdAt: unsafeEntry.createdAt }
          : {}),
        ...(validationError ? { validationError } : {}),
      };
    },
  );

  const workspaceEntries = entries.filter(
    (entry) => entry.kind === "workspace-data",
  );
  if (
    workspaceEntries.length !== 1 ||
    workspaceEntries[0].path !== WORKSPACE_DATA_PATH
  ) {
    throw new Error("The archive must contain one workspace data entry.");
  }
  return {
    exportFormatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: value.exportedAt,
    entries,
  };
};

const getDeclaredUncompressedSize = (
  file: JSZip.JSZipObject,
): number | null => {
  const internal = file as unknown as {
    _data?: { uncompressedSize?: unknown };
  };
  const size = internal._data?.uncompressedSize;
  return typeof size === "number" && Number.isFinite(size) ? size : null;
};

const readVerifiedEntry = async (
  zip: JSZip,
  entry: ArchiveManifestEntry,
): Promise<Uint8Array> => {
  const file = zip.file(entry.path);
  if (!file) throw new Error(`Archive entry ${entry.path} is missing.`);
  const limit = entrySizeLimit(entry.kind);
  if (entry.byteLength > limit) {
    throw new Error(`Archive entry ${entry.path} exceeds its size limit.`);
  }
  const declaredSize = getDeclaredUncompressedSize(file);
  if (declaredSize !== null && declaredSize !== entry.byteLength) {
    throw new Error(
      `Archive entry ${entry.path} has inconsistent size metadata.`,
    );
  }
  const bytes = await file.async("uint8array");
  if (bytes.byteLength !== entry.byteLength) {
    throw new Error(`Archive entry ${entry.path} failed its size check.`);
  }
  if ((await generateSha256(bytes)) !== entry.sha256) {
    throw new Error(`Archive entry ${entry.path} failed its checksum.`);
  }
  return bytes;
};

const decodeText = (bytes: Uint8Array): string =>
  new TextDecoder("utf-8", { fatal: true }).decode(bytes);

const readV2Archive = async (
  zip: JSZip,
  manifestFile: JSZip.JSZipObject,
): Promise<DecodedWorkspaceArchive> => {
  const declaredManifestSize = getDeclaredUncompressedSize(manifestFile);
  if (
    declaredManifestSize !== null &&
    declaredManifestSize > MAX_MANIFEST_BYTES
  ) {
    throw new Error("The archive manifest exceeds its size limit.");
  }
  const rawManifest = await manifestFile.async("string");
  if (new TextEncoder().encode(rawManifest).byteLength > MAX_MANIFEST_BYTES) {
    throw new Error("The archive manifest exceeds its size limit.");
  }
  const manifest = parseManifest(JSON.parse(rawManifest) as unknown);
  const totalBytes = manifest.entries.reduce(
    (total, entry) => total + entry.byteLength,
    0,
  );
  if (totalBytes > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
    throw new Error("The archive is too large to import safely.");
  }

  const expectedPaths = new Set([
    MANIFEST_PATH,
    ...manifest.entries.map((entry) => entry.path),
  ]);
  const unexpected = Object.values(zip.files).find(
    (entry) => !entry.dir && !expectedPaths.has(entry.name),
  );
  if (unexpected) {
    throw new Error(
      `The archive contains an unexpected file: ${unexpected.name}.`,
    );
  }

  const dataEntry = manifest.entries.find(
    (entry) => entry.kind === "workspace-data",
  )!;
  const data = parseExportData(
    JSON.parse(decodeText(await readVerifiedEntry(zip, dataEntry))) as unknown,
  );
  const canvasDocuments: CanvasDocument[] = [];
  const canvasAssets: CanvasAssetRecord[] = [];
  const canvasErrors: string[] = [];

  for (const entry of manifest.entries.filter(
    (candidate) => candidate.kind === "canvas-document",
  )) {
    try {
      if (entry.validationError) throw new Error(entry.validationError);
      const document = parseCanvasDocument(
        JSON.parse(decodeText(await readVerifiedEntry(zip, entry))) as unknown,
      );
      if (
        document.id !== entry.id ||
        document.workspaceId !== entry.workspaceId
      ) {
        throw new Error("document identity does not match the manifest");
      }
      canvasDocuments.push(document);
    } catch (error) {
      canvasErrors.push(
        `Canvas document ${entry.id ?? entry.path} was skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  for (const entry of manifest.entries.filter(
    (candidate) => candidate.kind === "canvas-asset",
  )) {
    try {
      if (entry.validationError) throw new Error(entry.validationError);
      const bytes = await readVerifiedEntry(zip, entry);
      const blob = new Blob([bytes], { type: entry.mimeType });
      canvasAssets.push(
        parseCanvasAssetRecord({
          id: entry.id,
          workspaceId: entry.workspaceId,
          blob,
          mimeType: entry.mimeType,
          ...(entry.originalName ? { originalName: entry.originalName } : {}),
          byteLength: entry.byteLength,
          ...(entry.width === undefined ? {} : { width: entry.width }),
          ...(entry.height === undefined ? {} : { height: entry.height }),
          sha256: entry.sha256,
          createdAt: entry.createdAt,
        }),
      );
    } catch (error) {
      canvasErrors.push(
        `Canvas asset ${entry.id ?? entry.path} was skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return {
    exportFormatVersion: EXPORT_FORMAT_VERSION,
    data,
    canvasDocuments,
    canvasAssets,
    canvasErrors,
  };
};

const readLegacyArchive = async (
  zip: JSZip,
): Promise<DecodedWorkspaceArchive> => {
  const dataFile = zip.file(LEGACY_DATA_PATH);
  const checksumFile = zip.file(LEGACY_CHECKSUM_PATH);
  if (!dataFile || !checksumFile) {
    throw new Error(
      "Missing export-data.json or checksum.sha256 in the archive.",
    );
  }
  const declaredDataSize = getDeclaredUncompressedSize(dataFile);
  const declaredChecksumSize = getDeclaredUncompressedSize(checksumFile);
  if (
    (declaredDataSize !== null &&
      declaredDataSize > MAX_WORKSPACE_DATA_BYTES) ||
    (declaredChecksumSize !== null && declaredChecksumSize > 1024)
  ) {
    throw new Error("The legacy workspace data exceeds its size limit.");
  }
  const jsonDataString = await dataFile.async("string");
  const checksum = (await checksumFile.async("string")).trim();
  if (
    new TextEncoder().encode(jsonDataString).byteLength >
    MAX_WORKSPACE_DATA_BYTES
  ) {
    throw new Error("The legacy workspace data exceeds its size limit.");
  }
  const parsed = JSON.parse(jsonDataString) as ExportFileContent;
  if (
    !isRecord(parsed) ||
    typeof parsed.exportFormatVersion !== "string" ||
    !LEGACY_EXPORT_FORMAT_VERSIONS.has(parsed.exportFormatVersion)
  ) {
    throw new Error(
      `Unsupported legacy export format version: ${String(parsed?.exportFormatVersion)}.`,
    );
  }
  const calculated = await generateSha256(
    stableStringifyDataBlock(parsed.data as ExportData),
  );
  if (calculated !== checksum) {
    throw new Error(
      "File integrity check failed. The file may be corrupted or modified.",
    );
  }
  const data = parseExportData(parsed.data);
  return {
    exportFormatVersion: parsed.exportFormatVersion,
    data,
    canvasDocuments: [],
    canvasAssets: [],
    canvasErrors: [],
  };
};

export const readWorkspaceArchive = async (
  file: Blob,
): Promise<DecodedWorkspaceArchive> => {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file, { createFolders: false });
  } catch {
    throw new Error(
      "Failed to read or unzip the archive. It might be corrupted.",
    );
  }
  const manifestFile = zip.file(MANIFEST_PATH);
  try {
    return manifestFile
      ? await readV2Archive(zip, manifestFile)
      : await readLegacyArchive(zip);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      throw new Error("The archive contains invalid JSON data.");
    }
    throw error;
  }
};
