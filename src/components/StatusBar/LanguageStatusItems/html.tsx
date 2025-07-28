import React from "react";
import { Eye, Edit2 } from "../../Icons";
import { useRootStore } from "../../../stores";
import { StatusItemProps } from "../types";

export const HtmlStatusItem: React.FC<StatusItemProps> = ({
  content,
  activeTab,
}) => {
  const { updateTabState } = useRootStore();

  const togglePreviewMode = () => {
    if (activeTab) {
      updateTabState(activeTab.id, { previewMode: !activeTab.previewMode });
    }
  };

  return (
    <button
      onClick={togglePreviewMode}
      className="p-0.75 hover:bg-gray-700 rounded transition-colors"
      title={activeTab?.previewMode ? "Switch to editor" : "Switch to preview"}
    >
      {activeTab?.previewMode ? <Edit2 size={14} /> : <Eye size={14} />}
    </button>
  );
};
