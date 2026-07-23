import { formatRegistry } from "../../../formats";
import { CANVAS_TEXT_FILE_MAX_BYTES } from "../constants";
import type { CanvasVideoProvider } from "../types";
import type { CanvasPoint } from "./canvasItemFactory";
import { getDetectedCanvasCodeLanguage } from "./canvasItemFactory";
import { canonicalizeCanvasUrl } from "./canvasUrl";
import { parseCanvasVideoUrl } from "./canvasVideoProviders";

export type CanvasNormalizedInput =
  | { kind: "file"; file: File }
  | { kind: "text"; text: string };

export type CanvasClassifiedInput =
  | { kind: "image"; file: File }
  | { kind: "text"; text: string }
  | { kind: "link"; canonicalUrl: string; hostname: string }
  | {
      kind: "video";
      canonicalUrl: string;
      hostname: string;
      provider: CanvasVideoProvider;
      videoId: string;
    }
  | {
      kind: "code";
      source: string;
      language: string;
      languageLocked: boolean;
    };

export interface CanvasIngestAnchor {
  point: CanvasPoint;
  source: "pointer" | "viewport-center";
}

const isImageFile = (file: File): boolean =>
  file.type.toLowerCase().startsWith("image/");

const getFileLanguage = (fileName: string): string | null => {
  const lowerName = fileName.toLowerCase();
  const detector = formatRegistry.getAll().find((candidate) =>
    candidate.extensions.some((extension) => {
      const normalized = extension.toLowerCase().replace(/^\./, "");
      return lowerName === normalized || lowerName.endsWith(`.${normalized}`);
    }),
  );
  return detector?.id ?? null;
};

const formatCompleteJson = (text: string): string | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return null;
  }
};

export const classifyCanvasText = (
  text: string,
  fileName?: string,
): Exclude<CanvasClassifiedInput, { kind: "image" }> => {
  const formattedJson = formatCompleteJson(text);
  if (formattedJson !== null) {
    return {
      kind: "code",
      source: formattedJson,
      language: "json",
      languageLocked: true,
    };
  }

  const url = canonicalizeCanvasUrl(text);
  if (url) {
    const video = parseCanvasVideoUrl(url.canonicalUrl);
    return video
      ? {
          kind: "video",
          canonicalUrl: url.canonicalUrl,
          hostname: url.hostname,
          provider: video.provider,
          videoId: video.videoId,
        }
      : { kind: "link", ...url };
  }

  const fileLanguage = fileName ? getFileLanguage(fileName) : null;
  if (fileLanguage && fileLanguage !== "plaintext") {
    return {
      kind: "code",
      source: text,
      language: fileLanguage,
      languageLocked: true,
    };
  }

  const detected = getDetectedCanvasCodeLanguage(text);
  return detected.languageLocked
    ? { kind: "code", source: text, ...detected }
    : { kind: "text", text };
};

export const readCanvasTextFile = async (file: File): Promise<string> => {
  if (file.size > CANVAS_TEXT_FILE_MAX_BYTES) {
    throw new Error(
      `Text files added to Canvas must be ${Math.floor(
        CANVAS_TEXT_FILE_MAX_BYTES / (1024 * 1024),
      )} MB or smaller.`,
    );
  }

  const text = await file.text();
  if (text.includes("\0")) {
    throw new Error(`${file.name || "This file"} does not appear to be text.`);
  }
  return text;
};

export const classifyCanvasInputs = async (
  inputs: readonly CanvasNormalizedInput[],
  readTextFile: (file: File) => Promise<string> = readCanvasTextFile,
): Promise<CanvasClassifiedInput[]> => {
  const classified: CanvasClassifiedInput[] = [];
  for (const input of inputs) {
    if (input.kind === "text") {
      if (input.text.length > 0)
        classified.push(classifyCanvasText(input.text));
      continue;
    }
    if (isImageFile(input.file)) {
      classified.push({ kind: "image", file: input.file });
      continue;
    }
    const text = await readTextFile(input.file);
    classified.push(classifyCanvasText(text, input.file.name));
  }
  return classified;
};

export const normalizeCanvasDataTransfer = (
  dataTransfer: DataTransfer,
): CanvasNormalizedInput[] => {
  const files = Array.from(dataTransfer.files);
  const orderedFiles = [
    ...files.filter(isImageFile),
    ...files.filter((file) => !isImageFile(file)),
  ];
  const inputs: CanvasNormalizedInput[] = orderedFiles.map((file) => ({
    kind: "file",
    file,
  }));
  const text = dataTransfer.getData("text/plain");
  if (text) inputs.push({ kind: "text", text });
  return inputs;
};
