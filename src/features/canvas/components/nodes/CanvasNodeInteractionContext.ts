import { createContext, useContext } from "react";
import type { CanvasFocusOrigin } from "../../types";
import type { FormatJsonResult } from "../../utils/canvasCode";

export interface CanvasNodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasNodeInteraction {
  beginEditing: (itemId: string) => void;
  commitText: (itemId: string, text: string) => void;
  commitCode: (itemId: string, source: string) => void;
  commitImageAlt: (itemId: string, altText: string) => void;
  formatCode: (itemId: string) => FormatJsonResult;
  toggleCodeCollapsed: (itemId: string) => void;
  toggleCodeWrap: (itemId: string) => void;
  openCodeInTab: (itemId: string) => Promise<void>;
  detachDerived: (itemId: string) => void;
  requestTransform: (itemId: string) => void;
  replaceImage: (itemId: string, file: File) => Promise<void>;
  copyImage: (assetId: string) => Promise<void>;
  downloadImage: (assetId: string) => Promise<void>;
  openImageInSmartView: (assetId: string) => Promise<void>;
  cancelEditing: (itemId: string) => void;
  commitResize: (itemId: string, bounds: CanvasNodeBounds) => void;
  preparePointerSelection: (itemId: string, additive: boolean) => void;
  completePointerSelection: (itemId: string) => void;
  syncFocusedItem: (itemId: string, origin: CanvasFocusOrigin) => void;
}

export const CanvasNodeInteractionContext =
  createContext<CanvasNodeInteraction | null>(null);

export const useCanvasNodeInteraction = (): CanvasNodeInteraction => {
  const interaction = useContext(CanvasNodeInteractionContext);
  if (!interaction) {
    throw new Error(
      "Canvas nodes must be rendered inside a Canvas interaction provider",
    );
  }
  return interaction;
};
