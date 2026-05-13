import React from "react";
import { Hash, FileText } from "../../../../components/Icons";
import { TomlNode, TomlValueType } from "../types";
import { TomlDate } from "smol-toml";

interface NodeDetailsProps {
  selectedNode: TomlNode | null;
}

const TYPE_COLORS: Record<TomlValueType, string> = {
  string: "bg-warning/20 text-warning",
  integer: "bg-info/20 text-info",
  float: "bg-info/20 text-info",
  boolean: "bg-warning/20 text-warning",
  "offset-datetime": "bg-success/20 text-success",
  "local-datetime": "bg-success/20 text-success",
  "local-date": "bg-success/20 text-success",
  "local-time": "bg-success/20 text-success",
  array: "bg-success/20 text-success",
  "inline-table": "bg-primary/20 text-primary",
  table: "bg-primary/20 text-primary",
  "array-of-tables": "bg-success/20 text-success",
};

function formatNodeValue(node: TomlNode): string {
  switch (node.type) {
    case "table":
    case "inline-table": {
      const keys = Object.keys(node.value as object ?? {});
      return `{${keys.length} ${keys.length === 1 ? "key" : "keys"}}`;
    }
    case "array":
    case "array-of-tables": {
      const len = Array.isArray(node.value) ? node.value.length : 0;
      return `[${len} ${len === 1 ? "item" : "items"}]`;
    }
    case "offset-datetime":
    case "local-datetime":
    case "local-date":
    case "local-time":
      return node.value instanceof TomlDate ? node.value.toISOString() : String(node.value);
    default:
      return String(node.value ?? "");
  }
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({ selectedNode }) => {
  if (!selectedNode) {
    return (
      <div className="flex items-center justify-center h-full text-secondary text-sm">
        <p>Select a node to view details</p>
      </div>
    );
  }

  const typeColor = TYPE_COLORS[selectedNode.type] ?? "bg-element text-secondary";

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-start space-x-2">
        <Hash size={14} className="text-info mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-secondary mb-0.5">Path</div>
          <div className="text-sm text-main font-mono break-all">{selectedNode.path}</div>
        </div>
      </div>

      <div className="flex items-start space-x-2">
        <FileText size={14} className="text-info mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-secondary mb-0.5">Type</div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${typeColor}`}>
              {selectedNode.type}
            </span>
          </div>
        </div>
      </div>

      {selectedNode.type !== "table" &&
        selectedNode.type !== "inline-table" &&
        selectedNode.type !== "array" &&
        selectedNode.type !== "array-of-tables" && (
          <div className="flex items-start space-x-2">
            <div className="w-3.5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-secondary mb-0.5">Value</div>
              <div className="text-sm text-main font-mono break-all">
                {(() => {
                  const v = formatNodeValue(selectedNode);
                  return v.length > 200 ? `${v.substring(0, 197)}...` : v;
                })()}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
