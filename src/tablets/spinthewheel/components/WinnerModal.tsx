import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ImageDown, PartyPopper, RotateCw, Trash2, X } from "lucide-react";
import type { ImageExportResult } from "../utils/imageExport";

interface WinnerModalProps {
  winnerLabel: string | null;
  onRemoveAndSpin: () => void;
  onSpinAgain: () => void;
  onClose: () => void;
  /** Exports the winning wheel as an image; omit to hide the action. */
  onCopyImage?: () => Promise<ImageExportResult>;
}

const COPY_FEEDBACK: Record<ImageExportResult, string> = {
  copied: "Image copied",
  downloaded: "Image saved",
  failed: "Couldn't export image",
};

/**
 * Winner announcement overlay. Big name up front, three spin actions plus
 * copy-as-image (only offered while there is a winner to celebrate).
 */
export const WinnerModal: React.FC<WinnerModalProps> = ({
  winnerLabel,
  onRemoveAndSpin,
  onSpinAgain,
  onClose,
  onCopyImage,
}) => {
  const [copyState, setCopyState] = useState<ImageExportResult | null>(null);
  const feedbackTimer = useRef<number | null>(null);

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimer.current !== null) {
      window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!winnerLabel) return undefined;
    setCopyState(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearFeedbackTimer();
    };
  }, [winnerLabel, onClose, clearFeedbackTimer]);

  const handleCopyImage = useCallback(async () => {
    if (!onCopyImage) return;
    clearFeedbackTimer();
    setCopyState(await onCopyImage());
    feedbackTimer.current = window.setTimeout(() => {
      feedbackTimer.current = null;
      setCopyState(null);
    }, 2000);
  }, [onCopyImage, clearFeedbackTimer]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {winnerLabel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="Winner announced"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-surface rounded-xl shadow-2xl w-full max-w-sm border border-base overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <div className="flex items-center gap-2 text-warning">
                <PartyPopper size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Winner
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Close winner dialog"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 pb-2 pt-3 text-center">
              <p
                data-testid="spinthewheel-winner"
                className="text-4xl font-black text-main break-words"
              >
                {winnerLabel}
              </p>
            </div>
            <div className="flex flex-col gap-2 p-4 pt-3">
              {onCopyImage && (
                <button
                  onClick={handleCopyImage}
                  className={`flex items-center justify-center gap-2 w-full px-4 py-2 border font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary ${
                    copyState === "copied" || copyState === "downloaded"
                      ? "border-success text-success"
                      : "border-base text-secondary hover:text-main hover:bg-element-hover"
                  }`}
                >
                  {copyState === "copied" || copyState === "downloaded" ? (
                    <Check size={16} />
                  ) : (
                    <ImageDown size={16} />
                  )}
                  {copyState ? COPY_FEEDBACK[copyState] : "Copy result as image"}
                </button>
              )}
              <button
                onClick={onSpinAgain}
                autoFocus
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-contrast font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
              >
                <RotateCw size={18} />
                Spin again
              </button>
              <button
                onClick={onRemoveAndSpin}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-base text-secondary hover:text-main hover:bg-element-hover font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <Trash2 size={18} />
                Remove entry &amp; spin again
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
