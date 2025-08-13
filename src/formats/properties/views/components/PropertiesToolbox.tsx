import React from "react";
import {
  ArrowUpDown,
  Layers,
  MessageSquareX,
  AlignLeft,
  FileDown,
  FileUp,
  Code,
  FileText,
  AlertTriangle,
  CheckCircle,
} from "../../../../components/Icons";
import { PropertiesValidation } from "../types";

interface PropertiesToolboxProps {
  onSortKeys: () => void;
  onGroupByPrefix: () => void;
  onStripComments: () => void;
  onNormalizeSpacing: () => void;
  onEnsureFinalNewline: () => void;
  onRemoveFinalNewline: () => void;
  onConvertToJson: () => void;
  onConvertToYaml: () => void;
  validation: PropertiesValidation;
  onToggleValidation: () => void;
  showValidation: boolean;
}

export const PropertiesToolbox: React.FC<PropertiesToolboxProps> = ({
  onSortKeys,
  onGroupByPrefix,
  onStripComments,
  onNormalizeSpacing,
  onEnsureFinalNewline,
  onRemoveFinalNewline,
  onConvertToJson,
  onConvertToYaml,
  validation,
  onToggleValidation,
  showValidation,
}) => {
  const hasValidationIssues = 
    validation.duplicateKeys.length > 0 ||
    validation.emptyValues.length > 0 ||
    validation.invalidKeys.length > 0;

  return (
    <div className="p-3 bg-gray-800/50">
      <div className="flex flex-wrap gap-2">
        {/* Sorting & Organization */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 font-medium">ORGANIZE:</span>
          <button
            onClick={onSortKeys}
            className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
            title="Sort all keys alphabetically"
          >
            <ArrowUpDown size={12} />
            <span>Sort Keys</span>
          </button>
          
          <button
            onClick={onGroupByPrefix}
            className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
            title="Group properties by common prefixes"
          >
            <Layers size={12} />
            <span>Group by Prefix</span>
          </button>
        </div>

        <div className="w-px h-6 bg-gray-600" />

        {/* Cleaning & Formatting */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 font-medium">CLEAN:</span>
          <button
            onClick={onStripComments}
            className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
            title="Remove all comments"
          >
            <MessageSquareX size={12} />
            <span>Strip Comments</span>
          </button>
          
          <button
            onClick={onNormalizeSpacing}
            className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
            title="Normalize spacing around equals signs"
          >
            <AlignLeft size={12} />
            <span>Normalize</span>
          </button>
        </div>

        <div className="w-px h-6 bg-gray-600" />

        {/* File Operations */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 font-medium">FILE:</span>
          <button
            onClick={onEnsureFinalNewline}
            className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
            title="Ensure file ends with newline"
          >
            <FileDown size={12} />
            <span>Add Newline</span>
          </button>
          
          <button
            onClick={onRemoveFinalNewline}
            className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
            title="Remove final newline"
          >
            <FileUp size={12} />
            <span>Remove Newline</span>
          </button>
        </div>

        <div className="w-px h-6 bg-gray-600" />

        {/* Converters */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 font-medium">CONVERT:</span>
          <button
            onClick={onConvertToJson}
            className="flex items-center space-x-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
            title="Convert to nested JSON and open in new tab"
          >
            <Code size={12} />
            <span>To JSON</span>
          </button>
          
          <button
            onClick={onConvertToYaml}
            className="flex items-center space-x-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
            title="Convert to YAML and open in new tab"
          >
            <FileText size={12} />
            <span>To YAML</span>
          </button>
        </div>

        <div className="w-px h-6 bg-gray-600" />

        {/* Validation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleValidation}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
              showValidation
                ? "bg-yellow-500/20 text-yellow-400"
                : hasValidationIssues
                ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
            }`}
            title={hasValidationIssues ? "Show validation issues" : "No validation issues"}
          >
            {hasValidationIssues ? (
              <AlertTriangle size={12} />
            ) : (
              <CheckCircle size={12} />
            )}
            <span>
              {hasValidationIssues 
                ? `${validation.duplicateKeys.length + validation.emptyValues.length + validation.invalidKeys.length} Issues`
                : "Valid"
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};