import React, { useMemo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronRight, ChevronDown, Hash, Braces, List, Type, Binary } from '../../../../components/Icons';
import { YamlNode } from '../../utils/yamlParser';

interface YamlTreeViewProps {
  nodes: YamlNode[];
  selectedPath: string | null;
  searchQuery: string;
  onNodeSelect: (path: string) => void;
}

interface TreeItem {
  node: YamlNode;
  depth: number;
  isExpanded: boolean;
  isVisible: boolean;
}

export const YamlTreeView: React.FC<YamlTreeViewProps> = ({
  nodes,
  selectedPath,
  searchQuery,
  onNodeSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set(['root']));

  // Flatten tree structure for virtualization
  const flattenedItems = useMemo(() => {
    const items: TreeItem[] = [];

    const traverse = (nodeList: YamlNode[], depth: number = 0) => {
      nodeList.forEach(node => {
        const isExpanded = expandedNodes.has(node.path);
        const isVisible = !searchQuery ||
          node.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          JSON.stringify(node.value).toLowerCase().includes(searchQuery.toLowerCase());

        if (isVisible) {
          items.push({
            node,
            depth,
            isExpanded,
            isVisible,
          });
        }

        if (node.children && isExpanded && isVisible) {
          traverse(node.children, depth + 1);
        }
      });
    };

    traverse(nodes);
    return items;
  }, [nodes, expandedNodes, searchQuery]);

  // Set up virtualization
  const rowVirtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36, // Reduced from 48 since we're using tooltips
    overscan: 10,
  });

  // Handle node expansion
  const handleToggleExpand = useCallback((path: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  // Handle node selection
  const handleNodeClick = useCallback((path: string) => {
    onNodeSelect(path);
  }, [onNodeSelect]);

  // Get type icon
  const getTypeIcon = (type: YamlNode['type']) => {
    switch (type) {
      case 'object': return <Braces size={14} className="text-info" />;
      case 'array': return <List size={14} className="text-success" />;
      case 'string': return <Type size={14} className="text-warning" />;
      case 'number': return <Hash size={14} className="text-info" />;
      case 'boolean': return <Binary size={14} className="text-warning" />;
      case 'null': return <div className="w-3.5 h-3.5 rounded-full bg-muted" />;
      default: return <Type size={14} className="text-secondary" />;
    }
  };

  // Format value preview
  const formatValuePreview = (node: YamlNode): string => {
    if (node.isAlias) {
      return `*${node.aliasName}`;
    }

    if (node.type === 'object') {
      const keys = Object.keys(node.value || {});
      return `{${keys.length} ${keys.length === 1 ? 'key' : 'keys'}}`;
    }

    if (node.type === 'array') {
      const length = Array.isArray(node.value) ? node.value.length : 0;
      return `[${length} ${length === 1 ? 'item' : 'items'}]`;
    }

    if (node.type === 'string') {
      const str = String(node.value || '');
      return str.length > 50 ? `"${str.substring(0, 47)}..."` : `"${str}"`;
    }

    return String(node.value);
  };

  if (flattenedItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-secondary">
        <p>
          {searchQuery ? `No nodes match "${searchQuery}"` : 'No YAML structure found'}
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
        style={{ contain: 'strict' }}
        data-testid="yaml-tree-view"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const item = flattenedItems[virtualItem.index];
            const { node, depth, isExpanded } = item;
            const hasChildren = node.children && node.children.length > 0;
            const isSelected = selectedPath === node.path;

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-element-hover transition-colors ${isSelected ? 'bg-primary/20 border-l-2 border-info' : ''
                    }`}
                  style={{ paddingLeft: `${depth * 20 + 12}px` }}
                  onClick={() => handleNodeClick(node.path)}
                  data-testid="yaml-tree-node"
                >
                  {/* Expand/collapse button */}
                  <div className="w-5 flex justify-center flex-shrink-0">
                    {hasChildren ? (
                      <button
                        onClick={(e) => handleToggleExpand(node.path, e)}
                        className="text-secondary hover:text-main transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                    ) : null}
                  </div>

                  {/* Type icon */}
                  <div className="mr-2.5 flex-shrink-0">
                    {getTypeIcon(node.type)}
                  </div>

                  {/* Node content */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {/* Key name */}
                    <span className={`font-medium text-sm truncate ${node.isAnchor ? 'text-success' :
                      node.isAlias ? 'text-info' :
                        'text-main'
                      }`}>
                      {node.isAnchor && '&'}{node.key}
                    </span>

                    {/* Value preview */}
                    <span className="text-xs text-secondary truncate flex-shrink">
                      {formatValuePreview(node)}
                    </span>
                  </div>

                  {/* Anchor/alias indicator */}
                  {(node.isAnchor || node.isAlias) && (
                    <div className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${node.isAnchor ? 'bg-success/20 text-success' : 'bg-info/20 text-info'
                      }`}>
                      {node.isAnchor ? 'anchor' : 'alias'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};