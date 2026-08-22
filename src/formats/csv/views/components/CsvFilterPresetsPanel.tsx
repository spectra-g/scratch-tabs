import * as React from "react";
import { X, Bookmark, Trash2 } from "lucide-react";
import { FilterPreset } from "../hooks/useCsvData";

interface CsvFilterPresetsPanelProps {
  presets: FilterPreset[];
  /** Whether the current filter set is non-empty and can be saved. */
  canSave: boolean;
  onSave: (name: string) => void;
  onApply: (presetId: string) => void;
  onDelete: (presetId: string) => void;
  onClose: () => void;
}

export const CsvFilterPresetsPanel: React.FC<CsvFilterPresetsPanelProps> = ({
  presets,
  canSave,
  onSave,
  onApply,
  onDelete,
  onClose,
}) => {
  const [name, setName] = React.useState("");

  const handleSave = () => {
    if (name.trim() === "") return;
    onSave(name);
    setName("");
  };

  return (
    <div
      className="flex-none border-b border-base bg-surface/50 p-3"
      data-testid="filter-presets-panel"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-main flex items-center gap-2">
          <Bookmark size={16} />
          Saved filter sets ({presets.length})
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-element-hover text-secondary"
          title="Close filter presets panel"
          data-testid="close-presets-panel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex items-center gap-1 mb-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            e.stopPropagation();
          }}
          placeholder="Preset name"
          aria-label="Filter preset name"
          disabled={!canSave}
          className="bg-element text-main border border-base rounded px-2 py-1 text-xs placeholder-secondary focus:outline-none focus:border-focus flex-1 disabled:opacity-50"
          data-testid="preset-name-input"
        />
        <button
          onClick={handleSave}
          disabled={!canSave || name.trim() === ""}
          title={
            canSave
              ? "Save current filters as a preset"
              : "Apply at least one filter first"
          }
          className="px-2 py-1 text-xs bg-primary/20 text-primary hover:bg-primary/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="save-preset-button"
        >
          Save current
        </button>
      </div>

      <div className="grid gap-1 max-h-32 overflow-y-auto custom-scrollbar">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="flex items-center justify-between bg-element rounded-lg p-2 hover:bg-element-hover transition-colors"
            data-testid={`preset-row-${preset.name}`}
          >
            <div className="min-w-0">
              <div className="text-sm text-main truncate">{preset.name}</div>
              <div className="text-xs text-secondary">
                {preset.filters.length} filter
                {preset.filters.length !== 1 ? "s" : ""} •{" "}
                {preset.matchMode.toUpperCase()}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onApply(preset.id)}
                className="px-2 py-1 text-xs bg-primary/20 text-primary hover:bg-primary/30 rounded transition-colors"
                title="Apply this filter set"
                data-testid={`apply-preset-${preset.name}`}
              >
                Apply
              </button>
              <button
                onClick={() => onDelete(preset.id)}
                className="p-1 text-danger hover:text-danger hover:bg-danger/20 rounded transition-colors"
                title="Delete preset"
                aria-label={`Delete preset ${preset.name}`}
                data-testid={`delete-preset-${preset.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {presets.length === 0 && (
          <p className="text-xs text-secondary">No saved filter sets yet.</p>
        )}
      </div>
    </div>
  );
};
