/// <reference lib="webworker" />

import JSZip from "jszip";
import { parseArchive } from "../tablets/archive-inspector/utils/archiveParser";
import { FilenameEncoding } from "../tablets/archive-inspector/types";

const HEX_PAGE_SIZE = 64 * 1024; // 64 KB
const CONTENT_SEARCH_MAX_FILES = 500;
const CONTENT_SEARCH_MAX_FILE_BYTES = 256 * 1024; // 256 KB
const CONTENT_SEARCH_BATCH = 10;

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data as WorkerRequest;

  try {
    switch (msg.type) {
      case "parse":
        await handleParse(msg);
        break;
      case "extract":
        await handleExtract(msg);
        break;
      case "extract-batch":
        await handleExtractBatch(msg);
        break;
      case "zip-subtree":
        await handleZipSubtree(msg);
        break;
      case "content-search":
        await handleContentSearch(msg);
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (msg.type === "parse") {
      self.postMessage({ type: "parse-error", message });
    }
  }
};

type WorkerRequest =
  | { type: "parse"; buffer: ArrayBuffer; fileName: string; filenameEncoding: FilenameEncoding }
  | { type: "extract"; buffer: ArrayBuffer; path: string; offset?: number; maxBytes?: number }
  | { type: "extract-batch"; buffer: ArrayBuffer; paths: string[] }
  | { type: "zip-subtree"; buffer: ArrayBuffer; folderPath: string }
  | { type: "content-search"; buffer: ArrayBuffer; query: string; caseSensitive: boolean };

async function handleParse(msg: {
  buffer: ArrayBuffer;
  fileName: string;
  filenameEncoding: FilenameEncoding;
}) {
  const result = await parseArchive(msg.buffer, {
    filenameEncoding: msg.filenameEncoding,
    onProgress: (percent) => {
      self.postMessage({ type: "parse-progress", percent });
    },
  });
  self.postMessage({ type: "parse-result", entries: result.entries, stats: result.stats });
}

async function handleExtract(msg: {
  buffer: ArrayBuffer;
  path: string;
  offset?: number;
  maxBytes?: number;
}) {
  const zip = await JSZip.loadAsync(msg.buffer);
  const file = zip.file(msg.path);
  if (!file) throw new Error(`Entry not found: ${msg.path}`);

  const allBytes = await file.async("uint8array");
  const offset = msg.offset ?? 0;
  const maxBytes = msg.maxBytes ?? allBytes.length;
  const slice = allBytes.slice(offset, offset + maxBytes);
  const truncated = offset + maxBytes < allBytes.length;

  self.postMessage({ type: "extract-result", path: msg.path, bytes: slice, truncated });
}

async function handleExtractBatch(msg: { buffer: ArrayBuffer; paths: string[] }) {
  const zip = await JSZip.loadAsync(msg.buffer);
  const results: Array<{ path: string; bytes: Uint8Array }> = [];

  for (const path of msg.paths) {
    const file = zip.file(path);
    if (!file) continue;
    const bytes = await file.async("uint8array");
    results.push({ path, bytes });
  }

  self.postMessage({ type: "extract-batch-result", results });
}

async function handleZipSubtree(msg: { buffer: ArrayBuffer; folderPath: string }) {
  const zip = await JSZip.loadAsync(msg.buffer);
  const newZip = new JSZip();
  const prefix = msg.folderPath.endsWith("/") ? msg.folderPath : msg.folderPath + "/";

  const promises: Promise<void>[] = [];
  zip.forEach((path, file) => {
    if (path.startsWith(prefix)) {
      const relativePath = path.slice(prefix.length);
      if (!relativePath) return;

      if (file.dir) {
        newZip.folder(relativePath);
      } else {
        promises.push(
          file.async("uint8array").then((bytes) => {
            newZip.file(relativePath, bytes);
          }),
        );
      }
    }
  });

  await Promise.all(promises);
  const bytes = await newZip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const folderName = prefix.split("/").filter(Boolean).pop() ?? "subtree";
  self.postMessage({ type: "zip-subtree-result", bytes, fileName: `${folderName}.zip` });
}

async function handleContentSearch(msg: {
  buffer: ArrayBuffer;
  query: string;
  caseSensitive: boolean;
}) {
  const zip = await JSZip.loadAsync(msg.buffer);
  const q = msg.caseSensitive ? msg.query : msg.query.toLowerCase();
  const matches: Array<{ path: string; excerpt: string; offset: number }> = [];
  const textPaths: string[] = [];

  zip.forEach((path, file) => {
    if (!file.dir) textPaths.push(path);
  });

  const total = Math.min(textPaths.length, CONTENT_SEARCH_MAX_FILES);
  let scanned = 0;
  let skipped = 0;

  for (let i = 0; i < total; i += CONTENT_SEARCH_BATCH) {
    const batch = textPaths.slice(i, i + CONTENT_SEARCH_BATCH);

    for (const path of batch) {
      const file = zip.file(path);
      if (!file) continue;

      const bytes = await file.async("uint8array");

      if (bytes.length > CONTENT_SEARCH_MAX_FILE_BYTES) {
        skipped++;
        continue;
      }

      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        continue;
      }

      const searchIn = msg.caseSensitive ? text : text.toLowerCase();
      const idx = searchIn.indexOf(q);
      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + q.length + 40);
        matches.push({
          path,
          excerpt: text.slice(start, end),
          offset: idx,
        });
      }

      scanned++;
    }

    self.postMessage({ type: "search-progress", scanned, total, skipped });
  }

  self.postMessage({ type: "search-result", matches });
}
