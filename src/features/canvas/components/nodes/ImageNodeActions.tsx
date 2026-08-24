import { useRef } from "react";
import { Check } from "lucide-react";
import { CANVAS_IMAGE_MIME_TYPES } from "../../constants";
import type { CanvasCopyState } from "../../hooks/useCanvasCopyFeedback";

interface ImageNodeActionsProps {
  disabled: boolean;
  alwaysVisible?: boolean;
  copyState: CanvasCopyState;
  onCopy: () => void;
  onDownload: () => void;
  onOpen: () => void;
  onReplace: (file: File) => void;
}

const actionClass =
  "rounded bg-surface/90 px-2 py-1 text-[11px] font-medium text-main shadow-sm hover:bg-element-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

export const ImageNodeActions = ({
  disabled,
  alwaysVisible = false,
  copyState,
  onCopy,
  onDownload,
  onOpen,
  onReplace,
}: ImageNodeActionsProps) => {
  const replaceInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`nodrag absolute right-2 top-2 z-10 flex flex-wrap justify-end gap-1 rounded p-0.5 transition-opacity duration-150 focus-within:opacity-100 ${
        alwaysVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}
    >
      <button
        type="button"
        className={actionClass}
        data-testid="canvas-image-copy"
        aria-label={
          copyState === "copied"
            ? "Copied image"
            : copyState === "failed"
              ? "Copy image failed"
              : "Copy image"
        }
        disabled={disabled}
        onClick={onCopy}
      >
        {copyState === "copied" ? (
          <Check size={14} className="text-success" aria-hidden="true" />
        ) : copyState === "failed" ? (
          "Copy failed"
        ) : (
          "Copy"
        )}
      </button>
      <button
        type="button"
        className={actionClass}
        data-testid="canvas-image-download"
        disabled={disabled}
        onClick={onDownload}
      >
        Download
      </button>
      <button
        type="button"
        className={actionClass}
        data-testid="canvas-image-open"
        disabled={disabled}
        onClick={onOpen}
      >
        Open
      </button>
      <button
        type="button"
        className={actionClass}
        data-testid="canvas-image-replace"
        onClick={() => replaceInputRef.current?.click()}
      >
        Replace
      </button>
      <input
        ref={replaceInputRef}
        type="file"
        className="sr-only"
        data-testid="canvas-image-replace-input"
        aria-label="Choose replacement image"
        accept={CANVAS_IMAGE_MIME_TYPES.join(",")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onReplace(file);
        }}
      />
    </div>
  );
};
