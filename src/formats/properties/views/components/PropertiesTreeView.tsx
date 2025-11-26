import React, { useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen, Key, AlertTriangle } from "../../../../components/Icons";
import { PropertyTreeNode, PropertiesValidation } from "../types";

interface PropertiesTreeViewProps {
  treeData: PropertyTreeNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  validation: PropertiesValidation;
}

interface TreeNodeProps {
  node: PropertyTreeNode;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  validation: PropertiesValidation;
  depth: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  selectedNodeId,
  onSelectNode,
  validation,
  depth,
}) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-expand first two levels
  const isSelected = selectedNodeId === node.id;
  const hasChildren = node.children.length > 0;
  const indentPx = depth * 16;

  // Check if this node or its children have validation issues
  const hasValidationIssues = node.isLeaf && node.fullKey && (
    validation.duplicateKeys.includes(node.fullKey) ||
    validation.emptyValues.includes(node.fullKey) ||
    validation.invalidKeys.includes(node.fullKey)
  );

  const handleClick = () => {
    onSelectNode(node.id);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer hover:bg-element-hover transition-colors ${isSelected ? "bg-primary/20 text-primary" : "text-main"
          }`}
        style={{ paddingLeft: `${8 + indentPx}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={handleToggleExpand}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center mr-1 hover:bg-element-hover rounded"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )
          ) : (
            <div className="w-3" />
          )}
        </button>

        {/* Icon */}
        <div className="flex-shrink-0 mr-2">
          {node.isLeaf ? (
            <Key size={14} className="text-secondary" />
          ) : isExpanded ? (
            <FolderOpen size={14} className="text-info" />
          ) : (
            <Folder size={14} className="text-secondary" />
          )}
        </div>

        {/* Node Name */}
        <span className="flex-1 text-sm truncate">{node.name}</span>

        {/* Validation Issues */}
        {hasValidationIssues && (
          <AlertTriangle size={12} className="text-warning flex-shrink-0 ml-1" />
        )}

        {/* Child Count */}
        {!node.isLeaf && node.children.length > 0 && (
          <span className="text-xs text-muted ml-2">
            ({node.children.length})
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              validation={validation}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const PropertiesTreeView: React.FC<PropertiesTreeViewProps> = ({
  treeData,
  selectedNodeId,
  onSelectNode,
  validation,
}) => {
  return (
    <div className="p-2">
      {treeData.map(node => (
        <TreeNode
          key={node.id}
          node={node}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          validation={validation}
          depth={0}
        />
      ))}
    </div>
  );
};