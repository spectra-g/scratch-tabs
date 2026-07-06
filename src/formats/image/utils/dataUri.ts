export interface ParsedImageDataUri {
  mimeType: string;
  mediaSubtype: string;
  base64: string;
  decodedBytes: number;
  encodedBytes: number;
}

const IMAGE_DATA_URI_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/svg+xml",
]);

export function isSupportedImageMimeType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_MIME_TYPES.has(mimeType.toLowerCase());
}

export function isValidBase64Payload(payload: string): boolean {
  const normalized = payload.replace(/\s/g, "");
  if (!normalized || normalized.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) return false;
  if (/=.+[^=]/.test(normalized)) return false;

  try {
    atob(normalized);
    return true;
  } catch {
    return false;
  }
}

export function estimateDecodedBytes(base64: string): number {
  const normalized = base64.replace(/\s/g, "");
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

export function parseImageDataUri(content: string): ParsedImageDataUri | null {
  const trimmed = content.trim();
  const match = IMAGE_DATA_URI_PATTERN.exec(trimmed);
  if (!match) return null;

  const mimeType = match[1].toLowerCase();
  const base64 = match[2].replace(/\s/g, "");
  if (!isSupportedImageMimeType(mimeType) || !isValidBase64Payload(base64)) {
    return null;
  }

  return {
    mimeType,
    mediaSubtype: mimeType.slice("image/".length),
    base64,
    decodedBytes: estimateDecodedBytes(base64),
    encodedBytes: new Blob([trimmed]).size,
  };
}

export function imageMimeTypeToExtension(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/svg+xml":
      return "svg";
    case "image/x-icon":
    case "image/vnd.microsoft.icon":
      return "ico";
    default:
      return mimeType.split("/")[1]?.replace(/[^a-z0-9]+/gi, "") || "img";
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let i = 1; i < units.length && value >= 1024; i += 1) {
    value /= 1024;
    unit = units[i];
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}
