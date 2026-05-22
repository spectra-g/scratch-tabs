import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "../Icons";
import { smartViewRegistry } from "../../views/registry";
import { useRootStore } from "../../stores";

interface SmartViewButtonsProps {
  language: string;
  tabId: string;
}

export const SmartViewButtons: React.FC<SmartViewButtonsProps> = ({
  language,
  tabId,
}) => {
  const { getActiveView, setActiveView } = useRootStore();
  const activeViewId = getActiveView(tabId);

  const availableViews = smartViewRegistry.getViewsForLanguage(language);

  if (availableViews.length === 0) {
    return null;
  }

  return (
    <div data-testid="smart-view-buttons">
      {availableViews.map((view) => {
        const isActive = activeViewId === view.id;
        const Icon = view.icon;

        return (
          <motion.button
            key={view.id}
            layout
            onClick={() => setActiveView(tabId, isActive ? null : view.id)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors overflow-hidden ${
              isActive
                ? "bg-surface-raised text-main border border-base shadow-sm"
                : "hover:bg-element-hover text-secondary"
            }`}
            title={`${isActive ? "Close" : "Open"} ${view.label}`}
            data-testid="table-view-button"
          >
            <Icon size={14} />
            <AnimatePresence>
              {isActive && (
                <motion.span
                  initial={{ maxWidth: 0, opacity: 0 }}
                  animate={{ maxWidth: 120, opacity: 1 }}
                  exit={{ maxWidth: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex items-center gap-1 overflow-hidden whitespace-nowrap"
                >
                  <span className="text-xs leading-none">{view.label}</span>
                  <X size={11} className="opacity-70" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
};
