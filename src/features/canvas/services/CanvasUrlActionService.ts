import { canonicalizeCanvasUrl } from "../utils/canvasUrl";

type OpenWindow = (
  url?: string | URL,
  target?: string,
  features?: string,
) => Window | null;

export class CanvasUrlActionService {
  constructor(
    private readonly openWindow: OpenWindow = (url, target, features) =>
      window.open(url, target, features),
    private readonly writeClipboard: (value: string) => Promise<void> = (value) =>
      navigator.clipboard.writeText(value),
  ) {}

  open(canonicalUrl: string): void {
    const parsed = canonicalizeCanvasUrl(canonicalUrl);
    if (!parsed || parsed.canonicalUrl !== canonicalUrl) {
      throw new Error("This Canvas link is invalid.");
    }
    const opened = this.openWindow(
      parsed.canonicalUrl,
      "_blank",
      "noopener,noreferrer",
    );
    if (opened) opened.opener = null;
  }

  async copy(canonicalUrl: string): Promise<void> {
    const parsed = canonicalizeCanvasUrl(canonicalUrl);
    if (!parsed || parsed.canonicalUrl !== canonicalUrl) {
      throw new Error("This Canvas link is invalid.");
    }
    await this.writeClipboard(parsed.canonicalUrl);
  }
}

export const canvasUrlActionService = new CanvasUrlActionService();
