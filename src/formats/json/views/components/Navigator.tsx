import React from "react";
import JsonTreeView from "../../components/JsonTreeView/JsonTreeView";

interface NavigatorProps {
  content: string;
  onNodeSelect: (path: string) => void;
  tabId: string;
}

export const Navigator: React.FC<NavigatorProps> = ({
  content,
  onNodeSelect,
  tabId,
}) => {
  return (
    <div className="h-full">
      <JsonTreeView
        jsonString={content}
        onNodeSelect={onNodeSelect}
        tabId={tabId}
      />
    </div>
  );
};