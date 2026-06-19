import React, { useCallback, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { XmlNodeInfo } from "../types";
import { getCssLikePath } from "../../utils/xmlPath";

interface XmlNodeDetailsProps {
  node: XmlNodeInfo | null;
  content: string;
}

type CopyKind = "node" | "inner" | "text" | "xpath" | "clark" | "css";

export const XmlNodeDetails: React.FC<XmlNodeDetailsProps> = ({ node, content }) => {
  const [copied, setCopied] = useState<CopyKind | null>(null);

  const copyValues = useMemo(() => {
    if (!node) return null;
    return {
      node: getNodeXml(node, content),
      inner: getInnerXml(node, content),
      text: node.valuePreview,
      xpath: node.xpath,
      clark: node.clarkName,
      css: getCssLikePath(node),
    };
  }, [content, node]);

  const copyValue = useCallback(
    async (kind: CopyKind) => {
      if (!copyValues) return;
      await navigator.clipboard.writeText(copyValues[kind]);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    },
    [copyValues],
  );

  if (!node || !copyValues) {
    return <div className="p-4 text-sm text-muted">Select a node to inspect details.</div>;
  }

  return (
    <div className="h-full overflow-auto custom-scrollbar p-4" data-testid="xml-node-details">
      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-element px-1.5 py-0.5 text-[10px] uppercase text-muted">{node.kind}</span>
            <h3 className="min-w-0 truncate font-mono text-sm font-medium text-main">{node.name}</h3>
          </div>
          <div className="break-all font-mono text-xs text-muted">{node.path}</div>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs">
          <Detail label="Children" value={String(node.childElementCount)} />
          <Detail label="Attributes" value={String(node.attributes.length)} />
          <Detail label="Text length" value={String(node.textLength)} />
          <Detail label="Namespace" value={node.namespaceUri ?? "none"} />
          <Detail label="Line" value={node.range ? `${node.range.startLine}:${node.range.startColumn}` : "unknown"} />
          <Detail label="Mixed" value={node.hasMixedContent ? "yes" : "no"} />
        </dl>

        {node.attributes.length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-medium uppercase text-muted">Attributes</h4>
            <div className="space-y-1">
              {node.attributes.map((attr) => (
                <div key={attr.id} className="rounded border border-base bg-surface p-2 text-xs">
                  <div className="font-mono text-main">{attr.name}</div>
                  <div className="break-all font-mono text-muted">{attr.value}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h4 className="mb-2 text-xs font-medium uppercase text-muted">Copy</h4>
          <div className="grid grid-cols-2 gap-2">
            <CopyButton label="Node XML" kind="node" copied={copied} onCopy={copyValue} />
            <CopyButton label="Inner XML" kind="inner" copied={copied} onCopy={copyValue} />
            <CopyButton label="Text" kind="text" copied={copied} onCopy={copyValue} />
            <CopyButton label="XPath" kind="xpath" copied={copied} onCopy={copyValue} />
            <CopyButton label="Clark" kind="clark" copied={copied} onCopy={copyValue} />
            <CopyButton label="CSS Path" kind="css" copied={copied} onCopy={copyValue} />
          </div>
        </section>
      </div>
    </div>
  );
};

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded border border-base bg-surface p-2">
    <dt className="text-muted">{label}</dt>
    <dd className="mt-1 break-all font-mono text-main">{value}</dd>
  </div>
);

const CopyButton: React.FC<{
  label: string;
  kind: CopyKind;
  copied: CopyKind | null;
  onCopy: (kind: CopyKind) => void;
}> = ({ label, kind, copied, onCopy }) => {
  const isCopied = copied === kind;
  return (
    <button
      type="button"
      onClick={() => onCopy(kind)}
      className="flex items-center justify-center gap-2 rounded border border-base px-2 py-1.5 text-xs text-main hover:bg-element-hover"
    >
      {isCopied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
      <span>{isCopied ? "Copied" : label}</span>
    </button>
  );
};

function getNodeXml(node: XmlNodeInfo, content: string): string {
  if (!node.range) return node.valuePreview;
  return content.slice(node.range.startOffset, node.range.endOffset);
}

function getInnerXml(node: XmlNodeInfo, content: string): string {
  const xml = getNodeXml(node, content);
  const firstClose = xml.indexOf(">");
  const lastOpen = xml.lastIndexOf("</");
  if (firstClose < 0 || lastOpen <= firstClose) return "";
  return xml.slice(firstClose + 1, lastOpen);
}

