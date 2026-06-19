import React from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { XmlParseResult } from "../types";

interface XmlDiagnosticsPanelProps {
  parsed: XmlParseResult;
  onJumpToLine: (line: number, column?: number) => void;
}

export const XmlDiagnosticsPanel: React.FC<XmlDiagnosticsPanelProps> = ({ parsed, onJumpToLine }) => {
  return (
    <div className="h-full overflow-auto custom-scrollbar border-t border-base bg-surface-secondary p-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase text-muted">Diagnostics</h3>
          {parsed.diagnostics.length === 0 ? (
            <div className="rounded border border-base bg-surface p-3 text-sm text-muted">No parser errors.</div>
          ) : (
            <div className="space-y-2">
              {parsed.diagnostics.map((diagnostic) => (
                <div key={diagnostic.id} className="rounded border border-danger/40 bg-surface p-3 text-sm">
                  <div className="flex items-start gap-2 text-danger">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="break-words">{diagnostic.message}</div>
                      {diagnostic.hint && <div className="mt-1 text-xs text-muted">{diagnostic.hint}</div>}
                      {diagnostic.line && (
                        <button
                          type="button"
                          onClick={() => onJumpToLine(diagnostic.line!, diagnostic.column)}
                          className="mt-2 text-xs text-info hover:underline"
                        >
                          Jump to {diagnostic.line}:{diagnostic.column ?? 1}
                        </button>
                      )}
                    </div>
                  </div>
                  {diagnostic.excerpt && (
                    <pre className="mt-2 max-h-24 overflow-auto custom-scrollbar whitespace-pre-wrap rounded bg-canvas p-2 font-mono text-xs text-main">
                      {diagnostic.excerpt}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase text-muted">Security</h3>
          {parsed.securityWarnings.length === 0 ? (
            <div className="rounded border border-base bg-surface p-3 text-sm text-muted">No XML-specific security warnings.</div>
          ) : (
            <div className="space-y-2">
              {parsed.securityWarnings.map((warning) => (
                <div key={warning.id} className="rounded border border-warning/40 bg-surface p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <ShieldAlert size={16} className="mt-0.5 shrink-0 text-warning" />
                    <div>
                      <div className="font-medium text-main">{warning.title}</div>
                      <div className="text-xs text-muted">{warning.message}</div>
                      {warning.path && <div className="mt-1 break-all font-mono text-xs text-muted">{warning.path}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase text-muted">Document</h3>
          <div className="grid grid-cols-2 gap-2 rounded border border-base bg-surface p-3 text-xs">
            <Stat label="Elements" value={parsed.stats.elementCount} />
            <Stat label="Attributes" value={parsed.stats.attributeCount} />
            <Stat label="Text nodes" value={parsed.stats.textNodeCount} />
            <Stat label="Comments" value={parsed.stats.commentCount} />
            <Stat label="CDATA" value={parsed.stats.cdataCount} />
            <Stat label="Max depth" value={parsed.stats.maxDepth} />
          </div>
          {parsed.namespaces.length > 0 && (
            <div className="mt-3 rounded border border-base bg-surface p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                <Info size={14} />
                Namespaces
              </div>
              <div className="space-y-1">
                {parsed.namespaces.map((namespace) => (
                  <div key={`${namespace.prefix}:${namespace.uri}`} className="break-all font-mono text-xs text-main">
                    {namespace.prefix} = {namespace.uri}
                    {namespace.generatedPrefix ? " (generated for XPath)" : ""}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div>
    <div className="text-muted">{label}</div>
    <div className="font-mono text-main">{value}</div>
  </div>
);
