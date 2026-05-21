import React, { useMemo, useState, useCallback, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Editor } from "@monaco-editor/react";
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Copy,
  Check,
  Globe,
  Lock,
  Hash,
  Code,
  CheckCircle,
  FileText,
  ArrowUpDown,
  Layers,
  Eraser,
  ChevronDown,
  AlertTriangle,
  X,
} from "../../../components/Icons";
import { SmartViewProps } from "../../../views/registry";
import { useDotenvData } from "./hooks/useDotenvData";
import { DotenvPair, EnvValueType } from "../utils/dotenvParser";
import { useThemeStore } from "../../../stores/themeStore";
import { useRootStore } from "../../../stores/rootStore";
import { createTab } from "../../../utils/tabUtils";

// ─── Icons by type ────────────────────────────────────────────────────────────

const TYPE_ICON: Record<EnvValueType, React.FC<{ size?: number; className?: string }>> = {
  url: Globe,
  secret: Lock,
  number: Hash,
  json: Code,
  boolean: CheckCircle,
  string: FileText,
};

const TYPE_COLOR: Record<EnvValueType, string> = {
  url: "text-info",
  secret: "text-warning",
  number: "text-success",
  json: "text-purple-400",
  boolean: "text-success",
  string: "text-secondary",
};

// ─── Toolbar dropdown ────────────────────────────────────────────────────────

interface DropdownProps {
  label: string;
  icon: React.ReactNode;
  items: Array<{ label: string; hint?: string; onClick: () => void; danger?: boolean }>;
}

const Dropdown: React.FC<DropdownProps> = ({ label, icon, items }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-element hover:bg-element-hover rounded border border-base text-main transition-colors"
      >
        {icon}
        <span>{label}</span>
        <ChevronDown size={10} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-surface border border-base rounded-lg shadow-xl z-40 w-max py-1">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => { item.onClick(); setOpen(false); }}
                className={`w-full flex items-center gap-4 px-3 py-2 text-xs hover:bg-element transition-colors ${item.danger ? "text-danger" : "text-main"}`}
              >
                <span className="whitespace-nowrap">{item.label}</span>
                {item.hint && <span className="text-muted whitespace-nowrap ml-auto">{item.hint}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Inline editable row ─────────────────────────────────────────────────────

interface RowProps {
  pair: DotenvPair;
  isDuplicate: boolean;
  maskSecrets: boolean;
  onUpdate: (id: string, key: string, rawValue: string) => void;
  onDelete: (id: string) => void;
}

const EnvRow: React.FC<RowProps> = ({ pair, isDuplicate, maskSecrets, onUpdate, onDelete }) => {
  const [editingKey, setEditingKey] = useState(false);
  const [editingValue, setEditingValue] = useState(false);
  const [draftKey, setDraftKey] = useState(pair.key);
  const [draftValue, setDraftValue] = useState(pair.rawValue);
  const [copied, setCopied] = useState(false);
  const keyRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);

  const effectiveType = pair.isSecret ? "secret" : pair.valueType;
  const shouldMask = maskSecrets && (pair.isSecret || effectiveType === "secret");
  const Icon = TYPE_ICON[effectiveType];
  const colorClass = TYPE_COLOR[effectiveType];

  const commitKey = useCallback(() => {
    setEditingKey(false);
    if (draftKey.trim() && draftKey !== pair.key) {
      onUpdate(pair.id, draftKey.trim(), pair.rawValue);
    } else {
      setDraftKey(pair.key);
    }
  }, [draftKey, pair, onUpdate]);

  const commitValue = useCallback(() => {
    setEditingValue(false);
    if (draftValue !== pair.rawValue) {
      onUpdate(pair.id, pair.key, draftValue);
    }
  }, [draftValue, pair, onUpdate]);

  const handleCopy = useCallback(async () => {
    if (shouldMask) return;
    await navigator.clipboard.writeText(pair.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [pair.value, shouldMask]);

  return (
    <tr
      className={`border-b border-base last:border-0 group hover:bg-element/50 transition-colors ${isDuplicate ? "bg-warning/5" : ""}`}
    >
      {/* Key cell */}
      <td className="px-3 py-1.5 align-middle w-2/5">
        {editingKey ? (
          <input
            ref={keyRef}
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            onBlur={commitKey}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitKey(); valueRef.current?.focus(); }
              if (e.key === "Escape") { setDraftKey(pair.key); setEditingKey(false); }
            }}
            className="w-full text-xs font-mono bg-element border border-info rounded px-1.5 py-0.5 text-main outline-none"
            autoFocus
          />
        ) : (
          <div
            className="flex items-center gap-1.5 cursor-text"
            onClick={() => { setEditingKey(true); setDraftKey(pair.key); }}
            title="Click to edit key"
          >
            <Icon size={11} className={`flex-shrink-0 ${colorClass}`} />
            <span className={`text-xs font-mono font-medium text-main ${isDuplicate ? "text-warning" : ""}`}>
              {pair.key}
            </span>
            {isDuplicate && <AlertTriangle size={10} className="text-warning flex-shrink-0" title="Duplicate key" />}
            {pair.hasExport && <span className="text-muted text-xs font-normal font-sans">export</span>}
          </div>
        )}
      </td>

      {/* Value cell */}
      <td className="px-3 py-1.5 align-middle">
        {editingValue ? (
          <input
            ref={valueRef}
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onBlur={commitValue}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitValue(); }
              if (e.key === "Escape") { setDraftValue(pair.rawValue); setEditingValue(false); }
            }}
            className="w-full text-xs font-mono bg-element border border-info rounded px-1.5 py-0.5 text-main outline-none"
            autoFocus
          />
        ) : (
          <span
            className="text-xs font-mono text-secondary cursor-text hover:text-main transition-colors break-all"
            onClick={() => { if (!shouldMask) { setEditingValue(true); setDraftValue(pair.rawValue); } }}
            title={shouldMask ? "Masked — reveal to edit" : "Click to edit value"}
          >
            {shouldMask
              ? "••••••••"
              : pair.value || <span className="text-muted italic">empty</span>}
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="pr-2 py-1.5 align-middle">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            disabled={shouldMask}
            className="p-1 rounded hover:bg-element text-secondary hover:text-main transition-colors disabled:opacity-30"
            title="Copy value"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
          <button
            onClick={() => onDelete(pair.id)}
            className="p-1 rounded hover:bg-danger-subtle text-secondary hover:text-danger transition-colors"
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ─── Main view ────────────────────────────────────────────────────────────────

export const DotenvSmartView: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
}) => {
  const { isDarkMode } = useThemeStore();
  const { addBackgroundTab } = useRootStore();
  const [maskSecrets, setMaskSecrets] = useState(true);
  const [search, setSearch] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  const {
    state,
    pairs,
    validation,
    updatePair,
    addPair,
    deletePair,
    sortKeys,
    groupKeys,
    deduplicateKeys,
    stripAllComments,
    collapseBlankLines,
    removeBlankLines,
    convertToJson,
    convertToShell,
    convertToDockerFlags,
  } = useDotenvData(content, onContentChange);

  const duplicateSet = useMemo(
    () => new Set(validation.duplicateKeys),
    [validation.duplicateKeys],
  );

  const filtered = useMemo(() => {
    if (!search) return pairs;
    const q = search.toLowerCase();
    return pairs.filter(
      (p) => p.key.toLowerCase().includes(q) || p.value.toLowerCase().includes(q),
    );
  }, [pairs, search]);

  const hasIssues = validation.duplicateKeys.length > 0 || validation.emptyValues.length > 0;

  const openJson = useCallback(() => {
    addBackgroundTab(createTab({ title: "ENV as JSON", content: convertToJson(), language: "json" }));
  }, [convertToJson, addBackgroundTab]);

  const openShell = useCallback(() => {
    addBackgroundTab(createTab({ title: "ENV as shell exports", content: convertToShell(), language: "bash" }));
  }, [convertToShell, addBackgroundTab]);

  const openDocker = useCallback(() => {
    addBackgroundTab(createTab({ title: "Docker --env flags", content: convertToDockerFlags(), language: "bash" }));
  }, [convertToDockerFlags, addBackgroundTab]);

  const [copiedAll, setCopiedAll] = useState(false);
  const copyAll = useCallback(async () => {
    const text = pairs.map((p) => `${p.key}=${p.rawValue}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }, [pairs]);

  return (
    <div className="flex flex-col h-full bg-surface text-main" data-testid="dotenv-smart-view">
      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* Left: interactive table */}
        <Panel defaultSize={50} minSize={30} maxSize={70}>
          <div className="flex flex-col h-full border-r border-base">

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-base bg-surface-secondary flex-shrink-0 flex-wrap">
              <Dropdown
                label="Sort"
                icon={<ArrowUpDown size={12} />}
                items={[
                  { label: "Sort A → Z", hint: "keeps comment groups", onClick: sortKeys },
                  { label: "Group by prefix", hint: "DB_, API_…", onClick: groupKeys },
                  { label: "Remove duplicates", hint: "keep last", onClick: deduplicateKeys },
                ]}
              />
              <Dropdown
                label="Clean"
                icon={<Eraser size={12} />}
                items={[
                  { label: "Strip comments", onClick: stripAllComments },
                  { label: "Remove extra blank lines", hint: "2+ blanks → 1", onClick: collapseBlankLines },
                  { label: "Remove all blank lines", onClick: removeBlankLines },
                ]}
              />
              <Dropdown
                label="Convert"
                icon={<Code size={12} />}
                items={[
                  { label: "Export as JSON", hint: "new tab", onClick: openJson },
                  { label: "Export as shell", hint: "export KEY=…", onClick: openShell },
                  { label: "Export as Docker flags", hint: "-e KEY=…", onClick: openDocker },
                ]}
              />

              <div className="flex-1" />

              {hasIssues && (
                <button
                  onClick={() => setShowValidation((v) => !v)}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs rounded bg-warning/15 text-warning hover:bg-warning/25 transition-colors"
                >
                  <AlertTriangle size={11} />
                  {validation.duplicateKeys.length + validation.emptyValues.length} issues
                </button>
              )}
            </div>

            {/* Validation panel */}
            {showValidation && hasIssues && (
              <div className="px-3 py-2 bg-warning/10 border-b border-warning/30 text-xs flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-warning">Issues found</span>
                  <button onClick={() => setShowValidation(false)} className="text-muted hover:text-main">
                    <X size={12} />
                  </button>
                </div>
                {validation.duplicateKeys.length > 0 && (
                  <div className="text-warning mb-1">
                    Duplicate keys:{" "}
                    <span className="font-mono">{validation.duplicateKeys.join(", ")}</span>
                    {" · "}
                    <button onClick={deduplicateKeys} className="underline hover:no-underline">
                      remove duplicates
                    </button>
                  </div>
                )}
                {validation.emptyValues.length > 0 && (
                  <div className="text-secondary">
                    Empty values: <span className="font-mono">{validation.emptyValues.join(", ")}</span>
                  </div>
                )}
              </div>
            )}

            {/* Search + stats row */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-base bg-surface-secondary flex-shrink-0">
              <input
                type="text"
                placeholder="Search keys or values…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-xs bg-element border border-base rounded px-2 py-1 text-main placeholder-muted outline-none focus:border-info"
              />
              <button
                onClick={() => setMaskSecrets((m) => !m)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-base bg-element hover:bg-surface text-secondary hover:text-main transition-colors"
                title={maskSecrets ? "Reveal secrets" : "Mask secrets"}
              >
                {maskSecrets ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
              <button
                onClick={copyAll}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-base bg-element hover:bg-surface text-secondary hover:text-main transition-colors"
                title="Copy all"
              >
                {copiedAll ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 px-3 py-1 border-b border-base bg-surface-secondary flex-shrink-0 text-xs text-secondary">
              <span>{pairs.length} vars</span>
              {duplicateSet.size > 0 && <span className="text-warning">{duplicateSet.size} dupes</span>}
              {validation.emptyValues.length > 0 && <span className="text-muted">{validation.emptyValues.length} empty</span>}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-secondary p-8 text-center">
                  <FileText size={28} className="mb-2 opacity-40" />
                  <p className="text-sm">
                    {pairs.length === 0 ? "No variables found" : "No matches"}
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs table-fixed">
                  <colgroup>
                    <col className="w-2/5" />
                    <col />
                    <col className="w-16" />
                  </colgroup>
                  <thead className="sticky top-0 bg-surface-secondary z-10">
                    <tr>
                      <th className="text-left px-3 py-1.5 text-secondary font-medium border-b border-base">Variable</th>
                      <th className="text-left px-3 py-1.5 text-secondary font-medium border-b border-base">Value</th>
                      <th className="border-b border-base" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((pair) => (
                      <EnvRow
                        key={pair.id}
                        pair={pair}
                        isDuplicate={duplicateSet.has(pair.key)}
                        maskSecrets={maskSecrets}
                        onUpdate={updatePair}
                        onDelete={deletePair}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Add row */}
            <div className="flex-shrink-0 border-t border-base p-2">
              <button
                onClick={() => addPair()}
                className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded border border-dashed border-base text-secondary hover:text-main hover:border-info hover:bg-element transition-colors"
              >
                <Plus size={12} />
                Add variable
              </button>
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-element hover:bg-info transition-colors cursor-col-resize" />

        {/* Right: Monaco */}
        <Panel minSize={25}>
          <Editor
            height="100%"
            language="dotenv"
            value={content}
            theme={isDarkMode ? "vs-dark" : "vs"}
            onChange={(val) => onContentChange(val ?? "")}
            options={{
              minimap: { enabled: false },
              wordWrap: "on",
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              fontSize: 13,
              automaticLayout: true,
            }}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
};
