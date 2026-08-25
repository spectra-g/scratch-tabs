/** Browser interop for exporting a canvas as a PNG image:
 *  clipboard first, file download when ClipboardItem is unsupported. */

export type ImageExportResult = "copied" | "downloaded" | "failed";

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null);
    }
  });
}

export function supportsClipboardImages(): boolean {
  return (
    typeof ClipboardItem !== "undefined" &&
    typeof navigator.clipboard?.write === "function"
  );
}

export async function copyPngToClipboard(
  canvas: HTMLCanvasElement,
): Promise<boolean> {
  if (!supportsClipboardImages()) return false;
  const blob = await canvasToPngBlob(canvas);
  if (!blob) return false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

export async function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<boolean> {
  const blob = await canvasToPngBlob(canvas);
  if (!blob || typeof URL.createObjectURL !== "function") return false;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
}

/** Copies the PNG to the clipboard, falling back to a PNG download. */
export async function exportWheelImage(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<ImageExportResult> {
  if (await copyPngToClipboard(canvas)) return "copied";
  try {
    return (await downloadCanvasAsPng(canvas, filename)) ? "downloaded" : "failed";
  } catch {
    return "failed";
  }
}

/** Filesystem-safe name with a .png extension. */
export function sanitizeImageFilename(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${cleaned || "wheel"}.png`;
}
