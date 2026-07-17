import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, Database, Plus } from "../../components/Icons";
import { useRootStore } from "../../stores/rootStore";
import { useTabsStore } from "../../stores/tabsStore";
import { Tablet, TabletState } from "../types";
import { DataReconcilePayload, DataReconcileStateData, ReconcileInput, ReconcileResult } from "./types";
import { createReconcileWorker } from "./reconcileWorkerClient";

type ResultKind = DataReconcileStateData["selectedResult"];

const defaultOptions = (csvMode = false) => ({
  mode: csvMode ? "csv" as const : "line" as const,
  normalization: { trim: true, ignoreCase: false, collapseWhitespace: false },
  scopeA: { kind: "all" as const }, scopeB: { kind: "all" as const }, keyPairs: [],
});

const emptyResult: ReconcileResult = { inBoth: [], changed: [], onlyA: [], onlyB: [] };

function useReconciliation(input: ReconcileInput | null) {
  const [result, setResult] = useState<ReconcileResult>(emptyResult);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!input) { setResult(emptyResult); setError(null); return; }
    const worker = createReconcileWorker();
    worker.onmessage = ({ data }) => { if (data.error) setError(data.error); else { setError(null); setResult(data.result); } };
    worker.postMessage(input);
    return () => worker.terminate();
  }, [input]);
  return { result, error };
}

const ResultButton: React.FC<{ label: string; count: number; active: boolean; onClick: () => void }> = ({ label, count, active, onClick }) => (
  <button onClick={onClick} className={`rounded border px-3 py-2 text-left ${active ? "border-accent bg-surface-secondary" : "border-base bg-surface"}`}>
    <span className="block text-lg font-semibold">{count}</span><span className="text-xs text-secondary">{label}</span>
  </button>
);

const DataReconcileUI: React.FC<{ state: TabletState; onChange: (state: TabletState) => void }> = ({ state, onChange }) => {
  const data = state.data as DataReconcileStateData;
  const tabs = useTabsStore((store) => store.tabs.filter((tab) => !tab.isTablet && !tab.isRich));
  const addTab = useRootStore((store) => store.handleNewPopulatedTab);
  const [scopePatterns, setScopePatterns] = useState({ a: data.options.scopeA.pattern ?? "", b: data.options.scopeB.pattern ?? "" });
  const [copied, setCopied] = useState(false);
  const sourceA = tabs.find((tab) => tab.id === data.sourceAId);
  const sourceB = tabs.find((tab) => tab.id === data.sourceBId);
  const input = useMemo<ReconcileInput | null>(() => sourceA && sourceB ? { a: sourceA.content ?? "", b: sourceB.content ?? "", options: data.options } : null, [sourceA?.content, sourceB?.content, data.options]);
  const { result, error } = useReconciliation(input);
  const update = (patch: Partial<DataReconcileStateData>) => onChange({ ...state, data: { ...data, ...patch } });
  const updateOptions = (patch: Partial<DataReconcileStateData["options"]>) => update({ options: { ...data.options, ...patch } });
  const aHeaders = result.headers?.a ?? [];
  const bHeaders = result.headers?.b ?? [];
  const selectedRows = data.selectedResult === "inBoth" ? result.inBoth.map((pair) => pair.a) : data.selectedResult === "changed" ? result.changed.map((item) => item.a) : data.selectedResult === "onlyA" ? result.onlyA : result.onlyB;
  const output = () => {
    const source = data.selectedResult === "onlyB" ? "B" : "A";
    const headers = source === "A" ? result.headers?.a : result.headers?.b;
    const content = [headers?.join(","), ...selectedRows.map((row) => row.text)].filter(Boolean).join("\n");
    return { content, source };
  };
  const createOutput = async () => {
    const { content, source } = output();
    await addTab({ id: crypto.randomUUID(), title: `${data.selectedResult} - ${source === "A" ? sourceA?.title : sourceB?.title}`, content, language: data.options.mode === "csv" ? "csv" : "plaintext", languageLocked: true, cursorPosition: { lineNumber: 1, column: 1 }, workspaceId: "", dateCreated: Date.now(), lastModified: Date.now() });
  };
  const createCleanedCopy = async (source: "A" | "B") => {
    const headers = source === "A" ? result.headers?.a : result.headers?.b;
    const rows = source === "A" ? result.onlyA : result.onlyB;
    const title = source === "A" ? sourceA?.title : sourceB?.title;
    const content = [headers?.join(","), ...rows.map((row) => row.text)].filter(Boolean).join("\n");
    await addTab({ id: crypto.randomUUID(), title: `${title ?? source} (cleaned)`, content, language: data.options.mode === "csv" ? "csv" : "plaintext", languageLocked: true, cursorPosition: { lineNumber: 1, column: 1 }, workspaceId: "", dateCreated: Date.now(), lastModified: Date.now() });
  };
  const copyOutput = async () => {
    try {
      await navigator.clipboard?.writeText(output().content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return <div className="h-full overflow-auto custom-scrollbar bg-canvas text-main p-5" data-testid="data-reconcile-tablet">
    <div className="mb-5 flex items-center gap-3"><Database className="text-accent" /><div><h2 className="text-xl font-semibold">Data Reconcile</h2><p className="text-sm text-secondary">Compare rows from two tabs without changing either source.</p></div></div>
    <div className="grid gap-4 md:grid-cols-2">
      {(["A", "B"] as const).map((side) => <label key={side} className="text-sm font-medium">Source {side}
        <select aria-label={`Source ${side}`} value={side === "A" ? data.sourceAId ?? "" : data.sourceBId ?? ""} onChange={(e) => update(side === "A" ? { sourceAId: e.target.value || undefined } : { sourceBId: e.target.value || undefined })} className="mt-1 w-full rounded border border-base bg-surface p-2 text-main">
          <option value="">Choose tab</option>{tabs.map((tab) => <option key={tab.id} value={tab.id}>{tab.title}</option>)}
        </select></label>)}
    </div>
    <section className="mt-5 rounded border border-base bg-surface p-4"><div className="flex flex-wrap gap-4 text-sm">
      <label><input type="radio" checked={data.options.mode === "line"} onChange={() => updateOptions({ mode: "line" })} /> Whole row / line</label>
      <label><input type="radio" checked={data.options.mode === "csv"} onChange={() => updateOptions({ mode: "csv" })} /> CSV columns</label>
      {(["trim", "ignoreCase", "collapseWhitespace"] as const).map((key) => <label key={key}><input type="checkbox" checked={data.options.normalization[key]} onChange={(e) => updateOptions({ normalization: { ...data.options.normalization, [key]: e.target.checked } })} /> {key === "trim" ? "Trim whitespace" : key === "ignoreCase" ? "Ignore case" : "Collapse internal whitespace"}</label>)}
    </div>
    {data.options.mode === "csv" && <div className="mt-4 space-y-2"><p className="text-sm text-secondary">Key columns pair headers independently. Without a pair, shared header names are used.</p>{data.options.keyPairs.map((pair, index) => <div key={index} className="flex gap-2"><select value={pair.a} onChange={(e) => updateOptions({ keyPairs: data.options.keyPairs.map((item, i) => i === index ? { ...item, a: e.target.value } : item) })}>{aHeaders.map((header) => <option key={header}>{header}</option>)}</select><span>→</span><select value={pair.b} onChange={(e) => updateOptions({ keyPairs: data.options.keyPairs.map((item, i) => i === index ? { ...item, b: e.target.value } : item) })}>{bHeaders.map((header) => <option key={header}>{header}</option>)}</select></div>)}<button className="text-sm text-accent" onClick={() => updateOptions({ keyPairs: [...data.options.keyPairs, { a: aHeaders[0] ?? "", b: bHeaders[0] ?? "" }] })}><Plus size={14} className="inline" /> Add column</button></div>}
    <div className="mt-4 grid gap-3 md:grid-cols-2">{(["A", "B"] as const).map((side) => { const scope = side === "A" ? data.options.scopeA : data.options.scopeB; const pattern = side === "A" ? scopePatterns.a : scopePatterns.b; return <div key={side}><label className="text-sm">Scope {side}<select value={scope.kind} onChange={(e) => { const kind = e.target.value as typeof scope.kind; updateOptions(side === "A" ? { scopeA: { kind, pattern: kind === "all" ? undefined : pattern } } : { scopeB: { kind, pattern: kind === "all" ? undefined : pattern } }); }} className="ml-2 rounded border border-base bg-canvas p-1"><option value="all">All rows</option><option value="matching">Rows matching a regex</option><option value="not-matching">Rows not matching a regex</option></select></label>{scope.kind !== "all" && <input aria-label={`Scope ${side} regex`} value={pattern} onChange={(e) => { const next = e.target.value; setScopePatterns((current) => ({ ...current, [side.toLowerCase()]: next })); updateOptions(side === "A" ? { scopeA: { ...scope, pattern: next } } : { scopeB: { ...scope, pattern: next } }); }} className="mt-1 w-full rounded border border-base bg-canvas p-1" placeholder="Regular expression" />}</div>; })}</div></section>
    {!input && <p className="mt-5 text-secondary">Choose two source tabs to start comparing.</p>}{error && <p role="alert" className="mt-4 text-danger">{error}</p>}
    {input && !error && <><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><ResultButton label="In both" count={result.inBoth.length} active={data.selectedResult === "inBoth"} onClick={() => update({ selectedResult: "inBoth" })} />{data.options.mode === "csv" && <ResultButton label="Changed" count={result.changed.length} active={data.selectedResult === "changed"} onClick={() => update({ selectedResult: "changed" })} />}<ResultButton label="Only in A" count={result.onlyA.length} active={data.selectedResult === "onlyA"} onClick={() => update({ selectedResult: "onlyA" })} /><ResultButton label="Only in B" count={result.onlyB.length} active={data.selectedResult === "onlyB"} onClick={() => update({ selectedResult: "onlyB" })} /></div>
    <div className="mt-4 flex flex-wrap gap-2"><button onClick={createOutput} className="rounded bg-accent px-3 py-2 text-sm text-white">Open result in new tab</button><button onClick={copyOutput} className={`rounded border border-base px-3 py-2 text-sm ${copied ? "text-success" : ""}`}>{copied ? <Check size={14} className="mr-1 inline" /> : <Copy size={14} className="mr-1 inline" />}{copied ? "Copied" : "Copy"}</button><button onClick={() => createCleanedCopy("A")} className="rounded border border-base px-3 py-2 text-sm">Create cleaned copy of A</button><button onClick={() => createCleanedCopy("B")} className="rounded border border-base px-3 py-2 text-sm">Create cleaned copy of B</button></div>
    <div className="mt-4 overflow-hidden rounded border border-base"><table className="w-full text-sm"><thead className="bg-surface-secondary text-left"><tr><th className="p-2">Source</th><th className="p-2">Row</th><th className="p-2">Preview</th></tr></thead><tbody>{selectedRows.map((row) => <tr key={`${row.source}-${row.rowNumber}`} className="border-t border-base"><td className="p-2">{row.source}</td><td className="p-2">{row.rowNumber}</td><td className="max-w-0 truncate p-2 font-mono">{row.text}</td></tr>)}</tbody></table></div></>}</div>;
};

function createState(payload?: DataReconcilePayload): TabletState { return { type: "datareconcile", data: { sourceAId: payload?.sourceAId, sourceBId: payload?.sourceBId, options: defaultOptions(payload?.csvMode), selectedResult: "inBoth" } }; }

export const DataReconcileTablet: Tablet = {
  id: "datareconcile", label: "Data Reconcile", description: "Compare rows between two tabs, including CSV key-column matching.", keywords: ["compare", "reconcile", "csv", "diff", "rows", "duplicate"], config: { showStandardHeader: false },
  createInitialState: createState,
  serializeState: (state) => JSON.stringify(state),
  deserializeState: (json) => { try { const parsed = JSON.parse(json) as TabletState; return parsed.type === "datareconcile" ? { ...createState(), ...parsed, data: { ...(createState().data as DataReconcileStateData), ...(parsed.data as DataReconcileStateData) } } : createState(); } catch { return createState(); } },
  render: (state, onChange) => <DataReconcileUI state={state} onChange={onChange} />,
};

export default DataReconcileTablet;
