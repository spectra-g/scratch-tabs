import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Coffee, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { useMilestoneCelebrationStore } from "../../stores/milestoneCelebrationStore";

const KOFI_URL = "https://ko-fi.com/scratchtabs";

/**
 * Fires a celebration confetti effect
 */
const fireConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

  const randomInRange = (min: number, max: number) =>
    Math.random() * (max - min) + min;

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    // Fire confetti from both sides
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
};

export const MilestoneModal: React.FC = () => {
  const { isModalOpen, milestoneCount, closeModal } =
    useMilestoneCelebrationStore();

  // Fire confetti when modal opens
  useEffect(() => {
    if (isModalOpen) {
      fireConfetti();
    }
  }, [isModalOpen]);

  const handleSupportClick = useCallback(() => {
    window.open(KOFI_URL, "_blank", "noopener,noreferrer");
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        closeModal();
      }
    },
    [closeModal]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    },
    [closeModal]
  );

  return (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="milestone-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-surface rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-base"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-base">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-warning" />
                <h2
                  id="milestone-modal-title"
                  className="text-lg font-medium text-main"
                >
                  Milestone Reached!
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              {/* Large milestone number */}
              <div className="mb-4">
                <span className="text-7xl font-black text-primary">
                  {milestoneCount}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-main mb-3">
                tabs created!
              </h3>

              <p className="text-secondary mb-4">
                Your local browser storage indicates you&apos;ve created{" "}
                <span className="font-semibold text-main">{milestoneCount}</span>{" "}
                tabs!
              </p>

              <p className="text-secondary mb-6">
                I hope the app has saved you time. If you&apos;d like to support
                the development, a coffee is always appreciated.
              </p>

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSupportClick}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary hover:bg-primary-hover text-primary-contrast font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
                >
                  <Coffee size={20} />
                  Support the Dev (Ko-fi)
                </button>

                <button
                  onClick={closeModal}
                  className="w-full px-4 py-2 text-secondary hover:text-main font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                >
                  Keep Scratching
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
