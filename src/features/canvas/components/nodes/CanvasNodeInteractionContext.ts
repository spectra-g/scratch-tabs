import { createContext, useContext } from "react";

export interface CanvasNodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasNodeInteraction {
  beginEditing: (itemId: string) => void;
  commitText: (itemId: string, text: string) => void;
  cancelEditing: (itemId: string) => void;
  commitResize: (itemId: string, bounds: CanvasNodeBounds) => void;
  preparePointerSelection: (itemId: string, additive: boolean) => void;
  completePointerSelection: (itemId: string) => void;
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
