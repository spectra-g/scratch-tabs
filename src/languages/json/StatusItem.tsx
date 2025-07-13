import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { validateJson } from "./validation";
import { StatusItemProps } from "../../components/StatusBar/types";

export const JsonStatusItem: React.FC<StatusItemProps> = ({ content = "", activeTab }) => {
  // Use full tab content for validation instead of truncated content
  const fullContent = activeTab?.content || content;
  const validation = validateJson(fullContent);

  return (
    <div
      className="flex items-center space-x-1"
      title={validation.error || "Valid JSON"}
      data-testid="status-validation"
    >
      {validation.isValid ? (
        <CheckCircle2 size={14} className="text-green-400" />
      ) : (
        <XCircle size={14} className="text-red-400" />
      )}
    </div>
  );
};
