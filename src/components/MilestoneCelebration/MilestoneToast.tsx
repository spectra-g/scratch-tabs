import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMilestoneCelebrationStore } from "../../stores/milestoneCelebrationStore";

export const MilestoneToast: React.FC = () => {
  const { isToastOpen, milestoneCount, handleToastClick } =
    useMilestoneCelebrationStore();

  return (
    <AnimatePresence>
      {isToastOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-10 right-6 z-40 cursor-pointer"
          onClick={handleToastClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleToastClick();
            }
          }}
          aria-label={`${milestoneCount} tabs milestone reached. Click to learn more.`}
        >
          <div className="bg-element border border-base rounded-lg shadow-xl p-4 max-w-xs hover:bg-element-hover transition-colors duration-150">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="celebration">
                🎉
              </span>
              <div>
                <p className="font-semibold text-main">
                  {milestoneCount}th Tab Milestone!
                </p>
                <p className="text-sm text-secondary">Click to celebrate</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
