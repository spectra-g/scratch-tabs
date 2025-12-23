import React, { useState, useMemo, useEffect } from "react";
import {
  Edit,
  Trash2,
  EyeOff,
  Eye,
  RefreshCw,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Eraser,
} from "lucide-react";
import { MappingRule } from "../types";
import { TransformationRuleEditor } from "./TransformationRuleEditor";
import { jsonPathToReadablePath } from "../utils/jsonUtils";

interface MappingTableProps {
  rules: MappingRule[];
  onUpdateRule: (rule: MappingRule) => void;
  onDeleteRule: (id: string) => void;
  onIgnoreRule: (id: string) => void;
  onReEvaluateRule: (id: string) => void;
  onClearRule: (id: string) => void;
  sourceJson: string;
  targetJson: string;
  onSortedRulesChange?: (sortedRules: MappingRule[]) => void;
  autoEditRuleId?: string | null;
}

type SortField =
  | "sourcePath"
  | "targetPath"
  | "transformationType"
  | "sourceDataType"
  | "targetDataType"
  | "status"
  | "confidence";
type SortDirection = "asc" | "desc";

export const MappingTable: React.FC<MappingTableProps> = ({
  rules,
  onUpdateRule,
  onDeleteRule,
  onIgnoreRule,
  onReEvaluateRule,
  onClearRule,
  sourceJson,
  targetJson,
  onSortedRulesChange,
  autoEditRuleId,
}) => {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("sourcePath");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Automatically open editor for newly added rules
  useEffect(() => {
    if (autoEditRuleId) {
      setEditingRuleId(autoEditRuleId);
    }
  }, [autoEditRuleId]);

  const handleEditRule = (id: string) => {
    setEditingRuleId(id);
  };

  const handleSaveRule = (rule: MappingRule) => {
    onUpdateRule(rule);
    setEditingRuleId(null);
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) {
      return <ArrowUpDown size={14} className="ml-1 inline-block opacity-50" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp size={14} className="ml-1 inline-block text-info" />
    ) : (
      <ArrowDown size={14} className="ml-1 inline-block text-info" />
    );
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "mapped":
        return "bg-success-subtle text-success";
      case "unmapped":
        return "bg-warning-subtle text-warning";
      case "ignored":
        return "bg-surface-secondary text-muted";
      case "error":
        return "bg-danger-subtle text-danger";
      default:
        return "bg-surface-secondary text-muted";
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <span className="bg-success-subtle text-success px-2 py-0.5 rounded text-xs">
          High
        </span>
      );
    } else if (confidence >= 0.5) {
      return (
        <span className="bg-warning-subtle text-warning px-2 py-0.5 rounded text-xs">
          Medium
        </span>
      );
    } else if (confidence > 0) {
      return (
        <span className="bg-danger-subtle text-danger px-2 py-0.5 rounded text-xs">
          Low
        </span>
      );
    }
    return null;
  };

  // Sort the rules
  const sortedRules = useMemo(() => {
    return [...rules].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case "sourcePath":
          aValue = jsonPathToReadablePath(a.sourcePath).toLowerCase();
          bValue = jsonPathToReadablePath(b.sourcePath).toLowerCase();
          break;
        case "targetPath":
          aValue = jsonPathToReadablePath(a.targetPath || "").toLowerCase();
          bValue = jsonPathToReadablePath(b.targetPath || "").toLowerCase();
          break;
        case "transformationType":
          // Sort by transformation type first, then by transformation value
          if (a.transformationType !== b.transformationType) {
            aValue = a.transformationType;
            bValue = b.transformationType;
          } else {
            aValue = a.transformation;
            bValue = b.transformation;
          }
          break;
        case "sourceDataType":
          aValue = a.sourceDataType;
          bValue = b.sourceDataType;
          break;
        case "targetDataType":
          aValue = a.targetDataType;
          bValue = b.targetDataType;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "confidence":
          aValue = a.confidence;
          bValue = b.confidence;
          break;
        default:
          aValue = a.sourcePath;
          bValue = b.sourcePath;
      }

      // Handle numeric comparison
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      // String comparison
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [rules, sortField, sortDirection]);

  // Notify parent component when sorted rules change
  React.useEffect(() => {
    if (onSortedRulesChange) {
      onSortedRulesChange(sortedRules);
    }
  }, [sortedRules, onSortedRulesChange]);

  if (rules.length === 0) {
    return (
      <div className="bg-surface-secondary border border-base rounded-lg p-8 text-center">
        <p className="text-secondary">No mapping rules defined</p>
        <p className="text-sm text-muted mt-2">
          Click "Analyze & Suggest Mappings" to automatically generate rules, or
          "Add Rule" to create one manually.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-base rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-secondary">
          <thead className="text-xs text-muted uppercase bg-surface-raised">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 cursor-pointer hover:text-primary"
                onClick={() => handleSort("sourcePath")}
              >
                Source Path {getSortIcon("sourcePath")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 cursor-pointer hover:text-primary"
                onClick={() => handleSort("targetPath")}
              >
                Target Path {getSortIcon("targetPath")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 cursor-pointer hover:text-blue-300"
                onClick={() => handleSort("transformationType")}
              >
                Transformation {getSortIcon("transformationType")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 cursor-pointer hover:text-blue-300"
                onClick={() => handleSort("sourceDataType")}
              >
                Source Type {getSortIcon("sourceDataType")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 cursor-pointer hover:text-blue-300"
                onClick={() => handleSort("targetDataType")}
              >
                Target Type {getSortIcon("targetDataType")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 cursor-pointer hover:text-blue-300"
                onClick={() => handleSort("status")}
              >
                Status {getSortIcon("status")}
              </th>
              <th scope="col" className="px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRules.map((rule) => (
              <tr
                key={rule.id}
                className="border-b border-base hover:bg-element-hover"
              >
                <td className="px-4 py-3 font-mono text-xs">
                  {jsonPathToReadablePath(rule.sourcePath)}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  <div className="flex items-center space-x-2">
                    <span>
                      {rule.targetPath ? (
                        jsonPathToReadablePath(rule.targetPath)
                      ) : (
                        <span className="text-muted italic">Not mapped</span>
                      )}
                    </span>
                    {rule.joinCondition && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        title={`Join: ${rule.joinCondition.sourceKey} ${rule.joinCondition.matchType || "equals"} ${rule.joinCondition.targetKey}`}
                      >
                        JOIN
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {rule.transformationType === "none" ? (
                    <span className="text-muted">None</span>
                  ) : rule.transformationType === "builtin" ? (
                    <span className="text-info">{rule.transformation}</span>
                  ) : (
                    <span className="text-purple-400">Custom</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-surface-secondary text-xs">
                    {rule.sourceDataType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-surface-secondary text-xs">
                    {rule.targetDataType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(rule.status)}`}
                    >
                      {rule.status}
                    </span>
                    {!rule.isUserDefined && getConfidenceBadge(rule.confidence)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditRule(rule.id)}
                      className="p-1 text-secondary hover:text-primary hover:bg-element-hover rounded transition-colors"
                      title="Edit rule"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onIgnoreRule(rule.id)}
                      className="p-1 text-secondary hover:text-warning hover:bg-element-hover rounded transition-colors"
                      title={
                        rule.status === "ignored"
                          ? "Unignore rule"
                          : "Ignore rule"
                      }
                    >
                      {rule.status === "ignored" ? (
                        <Eye size={16} />
                      ) : (
                        <EyeOff size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => onClearRule(rule.id)}
                      className="p-1 text-secondary hover:text-warning hover:bg-element-hover rounded transition-colors"
                      title="Clear rule fields"
                    >
                      <Eraser size={16} />
                    </button>
                    <button
                      onClick={() => onReEvaluateRule(rule.id)}
                      className="p-1 text-secondary hover:text-success hover:bg-element-hover rounded transition-colors"
                      title="Re-evaluate rule"
                      disabled={!sourceJson || !targetJson}
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1 text-secondary hover:text-danger hover:bg-element-hover rounded transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingRuleId && (
        <TransformationRuleEditor
          rule={rules.find((r) => r.id === editingRuleId)!}
          onSave={handleSaveRule}
          onCancel={handleCancelEdit}
          sourceJson={sourceJson}
          targetJson={targetJson}
        />
      )}
    </div>
  );
};
