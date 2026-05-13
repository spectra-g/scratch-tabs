import React, { useMemo, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronRight,
  ChevronDown,
  Hash,
  Braces,
  List,
  Type,
  Binary,
  Clock,
} from "../../../../components/Icons";
import { TomlNode, TomlValueType } from "../types";
import { TomlDate } from "smol-toml";

interface TomlTreeViewProps {
  nodes: TomlNode[];
  selectedPath: string | null;
  searchQuery: string;
  onNodeSelect: (path: string) => void;
}

interface TreeItem {
  node: TomlNode;
  depth: number;
  isExpanded: boolean;
}

export const TomlTreeView: React.FC<TomlTreeViewProps> = ({
  nodes,
  selectedPath,
  searchQuery,
  onNodeSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set(["root"]));

  const flattenedItems = useMemo(() => {
    const items: TreeItem[] = [];

    const traverse = (nodeList: TomlNode[], depth = 0) => {
      for (const node of nodeList) {
        const matchesSearch =
          !searchQuery ||
          node.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(node.value ?? "").toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) continue;

        const isExpanded = expandedNodes.has(node.path);
        items.push({ node, depth, isExpanded });

        if (node.children && isExpanded) {
          traverse(node.children, depth + 1);
        }
      }
    };

    traverse(nodes);
    return items;
  }, [nodes, expandedNodes, searchQuery]);

  const rowVirtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  const handleToggleExpand = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const getTypeIcon = (type: TomlValueType) => {
    switch (type) {
      case "table":
      case "inline-table":
        return <Braces size={14} className="text-info" />;
      case "array":
      case "array-of-tables":
        return <List size={14} className="text-success" />;
      case "string":
        return <Type size={14} className="text-warning" />;
      case "integer":
      case "float":
        return <Hash size={14} className="text-info" />;
      case "boolean":
        return <Binary size={14} className="text-warning" />;
      case "offset-datetime":
      case "local-datetime":
      case "local-date":
      case "local-time":
        return <Clock size={14} className="text-success" />;
      default:
        return <Type size={14} className="text-secondary" />;
    }
  };

  const formatValuePreview = (node: TomlNode): string => {
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
      case "string": {
        const s = String(node.value ?? "");
        return s.length > 50 ? `"${s.substring(0, 47)}..."` : `"${s}"`;
      }
      case "offset-datetime":
      case "local-datetime":
      case "local-date":
      case "local-time":
        return node.value instanceof TomlDate ? node.value.toISOString() : String(node.value);
      default:
        return String(node.value ?? "");
    }
  };

  if (flattenedItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-secondary">
        <p className="text-sm">
          {searchQuery ? `No nodes match "${searchQuery}"` : "No TOML structure found"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-base">
        <h3 className="text-sm font-medium text-main">Structure</h3>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto custom-scrollbar"
        style={{ contain: "strict" }}
        data-testid="toml-tree-view"
      >
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const { node, depth, isExpanded } = flattenedItems[virtualItem.index];
            const hasChildren = node.children && node.children.length > 0;
            const isSelected = selectedPath === node.path;

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-element-hover transition-colors ${
                    isSelected ? "bg-primary/20 border-l-2 border-info" : ""
                  }`}
                  style={{ paddingLeft: `${depth * 20 + 12}px` }}
                  onClick={() => onNodeSelect(node.path)}
                  data-testid="toml-tree-node"
                >
                  <div className="w-5 flex justify-center flex-shrink-0">
                    {hasChildren ? (
                      <button
                        onClick={(e) => handleToggleExpand(node.path, e)}
                        className="text-secondary hover:text-main transition-colors"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    ) : null}
                  </div>

                  <div className="mr-2.5 flex-shrink-0">{getTypeIcon(node.type)}</div>

                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-medium text-sm truncate text-main">{node.key}</span>
                    <span className="text-xs text-secondary truncate flex-shrink">
                      {formatValuePreview(node)}
                    </span>
                  </div>

                  <div className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 bg-element text-secondary ml-1">
                    {node.type}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
