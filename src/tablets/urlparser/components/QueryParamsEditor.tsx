import React, { useState, useCallback } from "react";
import { Plus, Minus, Copy, AlertTriangle, Info } from "lucide-react";
import { UrlWarning } from "../types";

interface QueryParamsEditorProps {
  params: Record<string, string>;
  warnings: UrlWarning[];
  isEncoded: boolean;
  onChange: (params: Record<string, string>) => void;
}

export const QueryParamsEditor: React.FC<QueryParamsEditorProps> = ({
  params,
  warnings,
  isEncoded,
  onChange,
}) => {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const handleAddParam = useCallback(() => {
    if (newKey.trim()) {
      const updatedParams = { ...params, [newKey]: newValue };
      onChange(updatedParams);
      setNewKey("");
      setNewValue("");
    }
  }, [newKey, newValue, params, onChange]);

  const handleRemoveParam = useCallback(
    (key: string) => {
      const updatedParams = { ...params };
      delete updatedParams[key];
      onChange(updatedParams);
    },
    [params, onChange],
  );

  const handleKeyChange = useCallback(
    (oldKey: string, newKey: string) => {
      if (newKey === oldKey) return;

      const updatedParams = { ...params };
      const value = updatedParams[oldKey];
      delete updatedParams[oldKey];
      updatedParams[newKey] = value;
      onChange(updatedParams);
    },
    [params, onChange],
  );

  const handleValueChange = useCallback(
    (key: string, value: string) => {
      const updatedParams = { ...params };
      updatedParams[key] = value;
      onChange(updatedParams);
    },
    [params, onChange],
  );

  // Get warnings specific to query parameters
  const queryWarnings = warnings.filter((w) => w.component === "query");

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-main">Query Parameters</h3>
        <div className="text-xs text-secondary">
          {Object.keys(params).length} parameters
        </div>
      </div>

      {queryWarnings.length > 0 && (
        <div className="mb-3 p-2 bg-warning-subtle border border-warning rounded-md">
          {queryWarnings.map((warning, index) => (
            <div
              key={index}
              className={`flex items-start mt-1 text-xs ${
                warning.type === "error" ? "text-danger" : "text-warning"
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {warning.type === "error" ? (
                  <AlertTriangle size={12} />
                ) : (
                  <Info size={12} />
                )}
              </div>
              <div className="ml-1">{warning.message}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface-secondary border border-base rounded-md overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr,1fr,auto] gap-2 p-2 border-b border-base bg-surface-raised">
          <div className="text-xs font-medium text-secondary">Key</div>
          <div className="text-xs font-medium text-secondary">Value</div>
          <div></div>
        </div>

        {/* Parameter rows */}
        {Object.keys(params).length > 0 ? (
          Object.entries(params).map(([key, value], index) => (
            <div
              key={key + index}
              className="grid grid-cols-[1fr,1fr,auto] gap-2 p-2 border-b border-base last:border-b-0"
            >
              <input
                type="text"
                value={isEncoded ? key : decodeURIComponent(key)}
                onChange={(e) => handleKeyChange(key, e.target.value)}
                className="bg-element border border-base rounded px-2 py-1 text-sm text-main"
              />
              <input
                type="text"
                value={isEncoded ? value : decodeURIComponent(value)}
                onChange={(e) => handleValueChange(key, e.target.value)}
                className="bg-element border border-base rounded px-2 py-1 text-sm text-main"
              />
              <div className="flex items-center">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${key}=${value}`);
                  }}
                  className="p-1 text-secondary hover:bg-element-hover rounded"
                  title="Copy parameter"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => handleRemoveParam(key)}
                  className="p-1 text-secondary hover:text-danger hover:bg-element-hover rounded"
                  title="Remove parameter"
                >
                  <Minus size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-muted text-sm">
            No query parameters
          </div>
        )}

        {/* Add new parameter row */}
        <div className="grid grid-cols-[1fr,1fr,auto] gap-2 p-2 bg-surface-secondary border-t border-base">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="New key"
            className="bg-element border border-base rounded px-2 py-1 text-sm text-main placeholder-muted"
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Value"
            className="bg-element border border-base rounded px-2 py-1 text-sm text-main placeholder-muted"
          />
          <button
            onClick={handleAddParam}
            disabled={!newKey.trim()}
            className={`p-1 ${
              newKey.trim()
                ? "text-green-400 hover:bg-element-hover"
                : "text-muted cursor-not-allowed"
            } rounded`}
            title="Add parameter"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
