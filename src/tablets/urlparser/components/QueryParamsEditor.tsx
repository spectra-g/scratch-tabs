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
        <h3 className="text-sm font-medium text-gray-200">Query Parameters</h3>
        <div className="text-xs text-gray-400">
          {Object.keys(params).length} parameters
        </div>
      </div>

      {queryWarnings.length > 0 && (
        <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-900/30 rounded-md">
          {queryWarnings.map((warning, index) => (
            <div
              key={index}
              className={`flex items-start mt-1 text-xs ${
                warning.type === "error" ? "text-red-400" : "text-yellow-400"
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

      <div className="bg-gray-800/50 border border-gray-700 rounded-md overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr,1fr,auto] gap-2 p-2 border-b border-gray-700 bg-gray-800">
          <div className="text-xs font-medium text-gray-400">Key</div>
          <div className="text-xs font-medium text-gray-400">Value</div>
          <div></div>
        </div>

        {/* Parameter rows */}
        {Object.keys(params).length > 0 ? (
          Object.entries(params).map(([key, value], index) => (
            <div
              key={key + index}
              className="grid grid-cols-[1fr,1fr,auto] gap-2 p-2 border-b border-gray-700 last:border-b-0"
            >
              <input
                type="text"
                value={isEncoded ? key : decodeURIComponent(key)}
                onChange={(e) => handleKeyChange(key, e.target.value)}
                className="bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
              />
              <input
                type="text"
                value={isEncoded ? value : decodeURIComponent(value)}
                onChange={(e) => handleValueChange(key, e.target.value)}
                className="bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
              />
              <div className="flex items-center">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${key}=${value}`);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
                  title="Copy parameter"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => handleRemoveParam(key)}
                  className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                  title="Remove parameter"
                >
                  <Minus size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm">
            No query parameters
          </div>
        )}

        {/* Add new parameter row */}
        <div className="grid grid-cols-[1fr,1fr,auto] gap-2 p-2 bg-gray-800/50 border-t border-gray-700">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="New key"
            className="bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 placeholder-gray-500"
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Value"
            className="bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 placeholder-gray-500"
          />
          <button
            onClick={handleAddParam}
            disabled={!newKey.trim()}
            className={`p-1 ${
              newKey.trim()
                ? "text-green-400 hover:bg-gray-700"
                : "text-gray-600 cursor-not-allowed"
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
