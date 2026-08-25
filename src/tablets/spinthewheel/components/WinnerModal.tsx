import React, { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, RotateCw, Trash2, X } from "lucide-react";

interface WinnerModalProps {
  winnerLabel: string | null;
  onRemoveAndSpin: () => void;
  onSpinAgain: () => void;
  onClose: () => void;
}

/**
 * Winner announcement overlay. Big name up front, three actions:
 * remove the entry and re-spin, re-spin keeping it, or just close.
 */
export const WinnerModal: React.FC<WinnerModalProps> = ({
  winnerLabel,
  onRemoveAndSpin,
  onSpinAgain,
  onClose,
}) => {
  useEffect(() => {
    if (!winnerLabel) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [winnerLabel, onClose]);

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
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]"
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
            <div className="flex flex-col gap-2 p-4">
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
