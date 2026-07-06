export type ImageExportFormat = "png" | "jpeg" | "webp";

export interface ImageExportOption {
  id: ImageExportFormat;
  label: string;
  mimeType: string;
  extension: string;
  supportsQuality: boolean;
}

export const IMAGE_EXPORT_OPTIONS: ImageExportOption[] = [
  {
    id: "png",
    label: "PNG",
    mimeType: "image/png",
    extension: "png",
    supportsQuality: false,
  },
  {
    id: "jpeg",
    label: "JPEG",
    mimeType: "image/jpeg",
    extension: "jpg",
    supportsQuality: true,
  },
  {
    id: "webp",
    label: "WebP",
    mimeType: "image/webp",
    extension: "webp",
    supportsQuality: true,
  },
];

export function getExportOption(format: ImageExportFormat): ImageExportOption {
  return IMAGE_EXPORT_OPTIONS.find((option) => option.id === format) ?? IMAGE_EXPORT_OPTIONS[0];
}

export function makeImageFileName(title: string, extension: string): string {
  const base = title
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim() || "image";
  return `${base}.${extension}`;
}
