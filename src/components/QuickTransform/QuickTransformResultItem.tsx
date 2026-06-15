import React from "react";
import { QuickTransformItem } from "../../services/quickTransform/types";

interface Props {
  item: QuickTransformItem;
  isSelected: boolean;
  onSelect: () => void;
  onExecute: () => void;
}

export const QuickTransformResultItem: React.FC<Props> = ({
  item,
  isSelected,
  onSelect,
  onExecute,
}) => (
  <div
    role="option"
    aria-selected={isSelected}
    className={`px-3 py-2 cursor-pointer flex items-start gap-2 ${
      isSelected ? "bg-accent text-white" : "hover:bg-surface-hover"
    }`}
    onMouseEnter={onSelect}
    onMouseDown={(e) => {
      e.preventDefault();
      onExecute();
    }}
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium truncate">{item.name}</span>
        {item.type === "pipeline" && (
          <span
            className={`text-xs px-1 rounded flex-shrink-0 ${
              isSelected
                ? "bg-white/20 text-white"
                : "bg-surface text-muted border border-base"
            }`}
          >
            Pipeline
          </span>
        )}
      </div>
      {item.description && (
        <p
          className={`text-xs truncate mt-0.5 ${
            isSelected ? "text-white/80" : "text-muted"
          }`}
        >
          {item.description}
        </p>
      )}
    </div>
  </div>
);
