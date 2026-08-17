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

  // The status bar exposes one consistent choice between the source editor and
  // the format's primary smart view. Some formats have more than one view, so
  // an already-active secondary view still counts as Data View here.
  const primaryView = availableViews[0];
  const isDataViewActive = availableViews.some((view) => view.id === activeViewId);

  return (
    <div
      data-testid="smart-view-buttons"
      role="group"
      aria-label="View mode"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-base bg-element/60 p-0.5 shadow-sm"
    >
      <button
        type="button"
        onClick={() => {
          if (isDataViewActive) setActiveView(tabId, null);
        }}
        className={`rounded-[3px] px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          !isDataViewActive
            ? "bg-surface-raised text-main shadow-sm ring-1 ring-inset ring-primary/25"
            : "text-secondary hover:bg-element-hover hover:text-main"
        }`}
        title="Text View"
        aria-label="Text View"
        aria-pressed={!isDataViewActive}
        data-testid="text-view-button"
      >
        Text View
      </button>
      <span aria-hidden="true" className="px-0.5 text-muted/70 text-[10px] leading-4">
        |
      </span>
      <button
        type="button"
        onClick={() => {
          if (!isDataViewActive) setActiveView(tabId, primaryView.id);
        }}
        className={`rounded-[3px] px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          isDataViewActive
            ? "bg-surface-raised text-main shadow-sm ring-1 ring-inset ring-primary/25"
            : "text-secondary hover:bg-element-hover hover:text-main"
        }`}
        title={isDataViewActive ? `Data View (${primaryView.label})` : `Open Data View (${primaryView.label})`}
        aria-label={`Data View (${primaryView.label})`}
        aria-pressed={isDataViewActive}
        data-testid="data-view-button"
      >
        Data View
      </button>
    </div>
  );
};
