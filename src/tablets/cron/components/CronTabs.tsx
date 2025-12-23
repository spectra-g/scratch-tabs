import React from "react";
import { MessageSquare, Sliders, Code } from "lucide-react";

interface CronTabsProps {
  activeTab: "natural" | "segmented" | "raw";
  onTabChange: (tab: "natural" | "segmented" | "raw") => void;
}

export const CronTabs: React.FC<CronTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="border-b border-base">
      <div className="flex">
        <button
          className={`px-4 py-2 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors ${activeTab === "natural"
              ? "border-primary text-primary"
              : "border-transparent text-secondary hover:text-main hover:border-base"
            }`}
          onClick={() => onTabChange("natural")}
        >
          <MessageSquare size={16} />
          <span>Natural Language</span>
        </button>

        <button
          className={`px-4 py-2 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors ${activeTab === "segmented"
              ? "border-primary text-primary"
              : "border-transparent text-secondary hover:text-main hover:border-base"
            }`}
          onClick={() => onTabChange("segmented")}
        >
          <Sliders size={16} />
          <span>Segmented Builder</span>
        </button>

        <button
          className={`px-4 py-2 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors ${activeTab === "raw"
              ? "border-primary text-primary"
              : "border-transparent text-secondary hover:text-main hover:border-base"
            }`}
          onClick={() => onTabChange("raw")}
        >
          <Code size={16} />
          <span>Raw Expression</span>
        </button>
      </div>
    </div>
  );
};
