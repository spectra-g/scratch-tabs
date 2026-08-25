import React, { useState } from "react";

export interface SidePanelTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface SidePanelProps {
  tabs: SidePanelTab[];
}

/**
 * Presentational tab switcher for the right-hand column. Owns only the
 * active-tab selection; every tab's content is composed by the tablet.
 */
export const SidePanel: React.FC<SidePanelProps> = ({ tabs }) => {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div className="h-full flex flex-col min-h-0">
      <div
        role="tablist"
        aria-label="Wheel panels"
        className="flex-shrink-0 flex border-b border-base/30"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tab.id === active.id}
            onClick={() => setActiveId(tab.id)}
            title={tab.label}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tab.id === active.id
                ? "text-main border-b-2 border-primary bg-element-hover/50"
                : "text-muted hover:text-main hover:bg-element-hover"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={active?.label} className="flex-1 min-h-0 overflow-hidden">
        {active?.content}
      </div>
    </div>
  );
};
