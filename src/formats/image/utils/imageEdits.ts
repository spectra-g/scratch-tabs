export type ImageEdit =
  | { type: "rotate"; degrees: 90 | 180 | 270 }
  | { type: "flip"; axis: "horizontal" | "vertical" }
  | { type: "crop"; x: number; y: number; width: number; height: number }
  | { type: "resize"; width: number; height: number; algorithm: "browser" }
  | { type: "adjust"; brightness?: number; contrast?: number; saturation?: number }
  | { type: "filter"; name: "grayscale" | "invert" | "sepia" };

export interface ImageEditState {
  past: ImageEdit[];
  future: ImageEdit[];
}

export type ImageEditAction =
  | { type: "apply"; edit: ImageEdit }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset" };

export const emptyImageEditState: ImageEditState = {
  past: [],
  future: [],
};

export function imageEditReducer(
  state: ImageEditState,
  action: ImageEditAction,
): ImageEditState {
  switch (action.type) {
    case "apply":
      return { past: [...state.past, action.edit], future: [] };
    case "undo": {
      if (state.past.length === 0) return state;
      const nextPast = state.past.slice(0, -1);
      const undone = state.past[state.past.length - 1];
      return { past: nextPast, future: [undone, ...state.future] };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [redone, ...nextFuture] = state.future;
      return { past: [...state.past, redone], future: nextFuture };
    }
    case "reset":
      return emptyImageEditState;
    default:
      return state;
  }
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export function getEditedDimensions(
  original: ImageDimensions,
  edits: ImageEdit[],
): ImageDimensions {
  return edits.reduce<ImageDimensions>((dimensions, edit) => {
    switch (edit.type) {
      case "rotate":
        return edit.degrees === 180
          ? dimensions
          : { width: dimensions.height, height: dimensions.width };
      case "crop":
      case "resize":
        return {
          width: Math.max(1, Math.round(edit.width)),
          height: Math.max(1, Math.round(edit.height)),
        };
      default:
        return dimensions;
    }
  }, original);
}

export function constrainResize(
  original: ImageDimensions,
  width: number,
  height: number,
  lockAspectRatio: boolean,
): ImageDimensions {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  if (!lockAspectRatio || original.width <= 0 || original.height <= 0) {
    return { width: safeWidth, height: safeHeight };
  }

  const ratio = original.width / original.height;
  return {
    width: safeWidth,
    height: Math.max(1, Math.round(safeWidth / ratio)),
  };
}
