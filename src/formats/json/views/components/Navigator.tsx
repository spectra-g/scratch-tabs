import React from "react";
import JsonTreeView from "../../components/JsonTreeView/JsonTreeView";

interface NavigatorProps {
  content: string;
  onNodeSelect: (path: string) => void;
}

export const Navigator: React.FC<NavigatorProps> = ({
  content,
  onNodeSelect,
}) => {
  return (
    <div className="h-full">
      <JsonTreeView 
        jsonString={content}
        onNodeSelect={onNodeSelect}
      />
    </div>
  );
};