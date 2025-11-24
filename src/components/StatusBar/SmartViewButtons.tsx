import React from "react";
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
          <button
            key={view.id}
            onClick={() => setActiveView(tabId, isActive ? null : view.id)}
            className={`flex items-center p-0.75 rounded transition-colors ${
              isActive
                ? "bg-primary text-white"
                : "hover:bg-element text-secondary"
            }`}
            title={`${isActive ? "Close" : "Open"} ${view.label}`}
            data-testid="table-view-button"
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
};
