import React, { useEffect, useMemo, useRef } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { XmlNodeInfo } from "../types";

interface XmlTreeViewProps {
  root: XmlNodeInfo;
  search: string;
  selectedNodeId: string;
  onSelectNode: (node: XmlNodeInfo) => void;
  expandedNodeIds: Set<string>;
  onToggleExpand: (nodeId: string, expanded: boolean) => void;
  treeScrollTop: number;
  onTreeScroll: (scrollTop: number) => void;
}

export const XmlTreeView: React.FC<XmlTreeViewProps> = ({
  root,
  search,
  selectedNodeId,
  onSelectNode,
  expandedNodeIds,
  onToggleExpand,
  treeScrollTop,
  onTreeScroll,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const forceExpand = Boolean(search);

  useEffect(() => {
    if (scrollRef.current && treeScrollTop > 0) {
      scrollRef.current.scrollTop = treeScrollTop;
    }
  // Only restore on mount — don't react to store updates while scrolling
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleRoot = useMemo(() => filterTree(root, search), [root, search]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-auto custom-scrollbar p-2"
      data-testid="xml-tree-view"
      onScroll={(e) => onTreeScroll((e.currentTarget as HTMLDivElement).scrollTop)}
    >
      {visibleRoot.children.length === 0 ? (
        <div className="p-3 text-sm text-muted">No matching XML nodes</div>
      ) : (
        visibleRoot.children.map((node) => (
          <XmlTreeNode
            key={node.id}
            node={node}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            expandedNodeIds={expandedNodeIds}
            onToggleExpand={onToggleExpand}
            forceExpand={forceExpand}
          />
        ))
      )}
    </div>
  );
};

interface XmlTreeNodeProps {
  node: XmlNodeInfo;
  selectedNodeId: string;
  onSelectNode: (node: XmlNodeInfo) => void;
  expandedNodeIds: Set<string>;
  onToggleExpand: (nodeId: string, expanded: boolean) => void;
  forceExpand: boolean;
}

const XmlTreeNode: React.FC<XmlTreeNodeProps> = ({
  node,
  selectedNodeId,
  onSelectNode,
  expandedNodeIds,
  onToggleExpand,
  forceExpand,
}) => {
  const expanded = forceExpand || expandedNodeIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedNodeId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded px-1 py-0.5 text-xs ${
          isSelected ? "bg-info-subtle text-info" : "text-main hover:bg-element-hover"
        }`}
      >
        <button
          type="button"
          onClick={() => onToggleExpand(node.id, !expanded)}
          className="h-5 w-5 shrink-0 rounded hover:bg-element"
          disabled={!hasChildren}
          title={hasChildren ? (expanded ? "Collapse node" : "Expand node") : "Leaf node"}
        >
          {hasChildren ? expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}
        </button>
        <button
          type="button"
          onClick={() => onSelectNode(node)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          title={node.path}
        >
          <span className="rounded bg-element px-1 py-0.5 text-[10px] uppercase text-muted">{node.kind}</span>
          <span className="truncate font-mono">{node.name}</span>
          {node.attributes.length > 0 && <span className="text-muted">@{node.attributes.length}</span>}
          {node.childElementCount > 0 && <span className="text-muted">{node.childElementCount} children</span>}
          {node.hasMixedContent && <span className="text-warning">mixed</span>}
          {node.isEmptyElement && <span className="text-muted">empty</span>}
        </button>
      </div>
      {expanded && hasChildren && (
        <div className="ml-4 border-l border-base pl-1">
          {node.children.map((child) => (
            <XmlTreeNode
              key={child.id}
              node={child}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              expandedNodeIds={expandedNodeIds}
              onToggleExpand={onToggleExpand}
              forceExpand={forceExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function filterTree(root: XmlNodeInfo, search: string): XmlNodeInfo {
  const needle = search.trim().toLowerCase();
  if (!needle) return root;

  const visit = (node: XmlNodeInfo): XmlNodeInfo | null => {
    const ownMatch = matchesNode(node, needle);
    const children = node.children.map(visit).filter((child): child is XmlNodeInfo => Boolean(child));
    if (ownMatch || children.length > 0 || node.kind === "document") {
      return { ...node, children };
    }
    return null;
  };

  return visit(root) ?? { ...root, children: [] };
}

function matchesNode(node: XmlNodeInfo, needle: string): boolean {
  return [
    node.name,
    node.localName,
    node.path,
    node.xpath,
    node.namespaceUri ?? "",
    node.valuePreview,
    ...node.attributes.flatMap((attr) => [attr.name, attr.value, attr.namespaceUri ?? ""]),
  ].some((value) => value.toLowerCase().includes(needle));
}
