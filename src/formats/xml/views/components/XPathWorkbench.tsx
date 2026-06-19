import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Play } from "lucide-react";
import { evaluateXPath } from "../../utils/xmlXPath";
import { XPathEvaluationResult, XmlParseResult } from "../types";

interface XPathWorkbenchProps {
  parsed: XmlParseResult;
  onOpenBackgroundTab: (title: string, content: string, language: string) => void;
  expression: string;
  onExpressionChange: (value: string) => void;
}

type ExportFormat = "json" | "csv" | "xml";

export const XPathWorkbench: React.FC<XPathWorkbenchProps> = ({
  parsed,
  onOpenBackgroundTab,
  expression,
  onExpressionChange,
}) => {
  const [debouncedExpression, setDebouncedExpression] = useState(expression);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedExpression(expression), 300);
    return () => clearTimeout(timer);
  }, [expression]);


  const result = useMemo(
    () => evaluateXPath(parsed.document, debouncedExpression, parsed.namespaces),
    [debouncedExpression, parsed.document, parsed.namespaces],
  );

  const hasDefaultNamespace = parsed.namespaces.some((ns) => ns.generatedPrefix);

  const copyText = async () => {
    await navigator.clipboard.writeText(resultToText(result));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const exportResult = (format: ExportFormat) => {
    const exportContent = serializeResult(result, format);
    onOpenBackgroundTab(`XPath Result.${format}`, exportContent, format === "xml" ? "xml" : format);
  };

  return (
    <div className="flex h-full flex-col bg-surface" data-testid="xml-xpath-workbench">
      <div className="flex items-center gap-2 border-b border-base p-3">
        <Play size={14} className="text-muted" />
        <input
          value={expression}
          onChange={(event) => onExpressionChange(event.target.value)}
          className="min-w-0 flex-1 rounded border border-base bg-element px-2 py-1 font-mono text-sm text-main focus:border-focus focus:outline-none"
          placeholder="XPath expression"
        />
        <button
          type="button"
          onClick={copyText}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-main hover:bg-element-hover"
          title="Copy XPath results"
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
        <button
          type="button"
          onClick={() => exportResult("json")}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-main hover:bg-element-hover"
          title="Open JSON result in a new background tab"
        >
          <ExternalLink size={14} />
          JSON
        </button>
        <button
          type="button"
          onClick={() => exportResult("csv")}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-main hover:bg-element-hover"
          title="Open CSV result in a new background tab"
        >
          <ExternalLink size={14} />
          CSV
        </button>
        <button
          type="button"
          onClick={() => exportResult("xml")}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-main hover:bg-element-hover"
          title="Open XML fragments in a new background tab"
        >
          <ExternalLink size={14} />
          XML
        </button>
      </div>

      {hasDefaultNamespace && (
        <div className="border-b border-base bg-warning-subtle px-3 py-2 text-xs text-warning">
          Default namespace detected — use the <code className="font-mono">d:</code> prefix in XPath (e.g.{" "}
          <code className="font-mono">d:elementName</code>).
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        {!result.ok ? (
          <div className="p-3 text-sm text-danger">{result.error}</div>
        ) : result.rows.length === 0 ? (
          <div className="p-3 text-sm text-muted">No XPath matches.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-secondary text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Value</th>
                <th className="px-3 py-2 font-medium">Path</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id} className="border-t border-base">
                  <td className="px-3 py-2 text-muted">{row.type}</td>
                  <td className="px-3 py-2 font-mono text-main">{row.name}</td>
                  <td className="max-w-sm truncate px-3 py-2 font-mono text-main">{row.valuePreview}</td>
                  <td className="max-w-md truncate px-3 py-2 font-mono text-muted">{row.path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

function resultToText(result: XPathEvaluationResult): string {
  if (!result.ok) return result.error ?? "";
  if (result.scalarValue !== undefined) return result.scalarValue;
  return result.rows.map((row) => row.valuePreview).join("\n");
}

function serializeResult(result: XPathEvaluationResult, format: ExportFormat): string {
  if (format === "json") {
    return JSON.stringify(
      result.rows.map((row) => ({
        type: row.type,
        name: row.name,
        value: row.valuePreview,
        path: row.path,
        xml: row.nodeXml,
      })),
      null,
      2,
    );
  }

  if (format === "csv") {
    const rows = [["type", "name", "value", "path"], ...result.rows.map((row) => [row.type, row.name, row.valuePreview, row.path])];
    return rows.map((row) => row.map(csvCell).join(",")).join("\n");
  }

  return `<results>\n${result.rows.map((row) => row.nodeXml ?? `<value>${escapeXml(row.valuePreview)}</value>`).join("\n")}\n</results>`;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
