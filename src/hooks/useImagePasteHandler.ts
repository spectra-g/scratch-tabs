import { useEffect, RefObject } from "react";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import type { Tab } from "../types";

interface UseImagePasteHandlerParams {
  /** Reference to the container element to attach paste listener */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Reference to the Monaco editor instance */
  editorRef: RefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  /** The active tab (null if no tab or if tab is rich text) */
  activeTab: Tab | null;
  /** Callback to set pending image data URL */
  setPendingImageData: (dataUrl: string | null) => void;
  /** Callback to set cursor position at paste time */
  setPendingImageCursorPosition: (
    position: Monaco.IPosition | null
  ) => void;
  /** Callback to show the image paste options */
  onShowUpgradeModal: () => void;
}

/**
 * Hook that handles image paste detection in the Monaco editor container.
 * When an image is pasted:
 * 1. Prevents default paste behavior
 * 2. Captures cursor position
 * 3. Converts image to data URL
 * 4. Shows the Monaco image paste options
 *
 * @param params - Configuration for the paste handler
 */
export function useImagePasteHandler({
  containerRef,
  editorRef,
  activeTab,
  setPendingImageData,
  setPendingImageCursorPosition,
  onShowUpgradeModal,
}: UseImagePasteHandlerParams): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !activeTab || activeTab.isRich) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      const cursorPosition = editorRef.current?.getPosition() ?? null;

      const triggerImageModal = (dataUrl: string) => {
        setPendingImageData(dataUrl);
        if (cursorPosition) {
          setPendingImageCursorPosition(cursorPosition);
        }
        onShowUpgradeModal();
      };

      // Direct image item (e.g. screenshot from OS clipboard)
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          event.preventDefault();
          event.stopPropagation();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              triggerImageModal(dataUrl);
            };
            reader.readAsDataURL(file);
          }
          return;
        }
      }

      // HTML clipboard item containing an embedded image data URL
      // (e.g. an image copied from the rich text editor — TipTap serialises as text/html)
      const html = event.clipboardData?.getData("text/html") ?? "";
      if (html) {
        const match = html.match(/src=["'](data:image\/[^"']+)["']/);
        if (match) {
          event.preventDefault();
          event.stopPropagation();
          triggerImageModal(match[1]);
        }
      }
    };

    container.addEventListener("paste", handlePaste, true);

    return () => {
      container.removeEventListener("paste", handlePaste, true);
    };
  }, [
    activeTab,
    containerRef,
    editorRef,
    setPendingImageData,
    setPendingImageCursorPosition,
    onShowUpgradeModal,
  ]);
}
