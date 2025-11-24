import React, { useState } from "react";
import {
  ArrowUpDown,
  Layers,
  MessageSquare,
  FileDown,
  FileUp,
  Code,
  FileText,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Eraser,
  AlignLeft,
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
  const [showSortingMenu, setShowSortingMenu] = useState(false);
  const [showCleaningMenu, setShowCleaningMenu] = useState(false);
  const [showConvertersMenu, setShowConvertersMenu] = useState(false);

  const hasValidationIssues =
    validation.duplicateKeys.length > 0 ||
    validation.emptyValues.length > 0 ||
    validation.invalidKeys.length > 0;

  const totalIssues = validation.duplicateKeys.length + validation.emptyValues.length + validation.invalidKeys.length;

  return (
    <div className="flex-none border-b border-base p-3 bg-surface/30">
      <div className="flex items-center justify-between">
        {/* Left side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Sorting Actions */}
          <div className="relative">
            <button
              onClick={() => setShowSortingMenu(!showSortingMenu)}
              className="flex items-center space-x-2 px-3 py-2 bg-element hover:bg-element-hover rounded text-sm transition-colors"
            >
              <ArrowUpDown size={14} />
              <span>Sort</span>
              <ChevronDown size={12} />
            </button>

            {showSortingMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowSortingMenu(false)}
                />
                <div className="absolute top-full left-0 mt-1 bg-surface border border-base rounded-lg shadow-xl z-40 min-w-[200px]">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onSortKeys();
                        setShowSortingMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <ArrowUpDown size={14} />
                      <span>Sort Keys Alphabetically</span>
                    </button>
                    <button
                      onClick={() => {
                        onGroupByPrefix();
                        setShowSortingMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <Layers size={14} />
                      <span>Group by Prefix</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Cleaning Actions */}
          <div className="relative">
            <button
              onClick={() => setShowCleaningMenu(!showCleaningMenu)}
              className="flex items-center space-x-2 px-3 py-2 bg-element hover:bg-element-hover rounded text-sm transition-colors"
            >
              <Eraser size={14} />
              <span>Clean</span>
              <ChevronDown size={12} />
            </button>

            {showCleaningMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowCleaningMenu(false)}
                />
                <div className="absolute top-full left-0 mt-1 bg-surface border border-base rounded-lg shadow-xl z-40 min-w-[200px]">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onStripComments();
                        setShowCleaningMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <MessageSquare size={14} />
                      <span>Strip All Comments</span>
                    </button>
                    <button
                      onClick={() => {
                        onNormalizeSpacing();
                        setShowCleaningMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <AlignLeft size={14} />
                      <span>Normalize Spacing</span>
                    </button>
                    <div className="border-t border-base my-1" />
                    <button
                      onClick={() => {
                        onEnsureFinalNewline();
                        setShowCleaningMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <FileDown size={14} />
                      <span>Ensure Final Newline</span>
                    </button>
                    <button
                      onClick={() => {
                        onRemoveFinalNewline();
                        setShowCleaningMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <FileUp size={14} />
                      <span>Remove Final Newline</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Converters */}
          <div className="relative">
            <button
              onClick={() => setShowConvertersMenu(!showConvertersMenu)}
              className="flex items-center space-x-2 px-3 py-2 bg-element hover:bg-element-hover rounded text-sm transition-colors"
            >
              <Code size={14} />
              <span>Convert</span>
              <ChevronDown size={12} />
            </button>

            {showConvertersMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowConvertersMenu(false)}
                />
                <div className="absolute top-full left-0 mt-1 bg-surface border border-base rounded-lg shadow-xl z-40 min-w-[200px]">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onConvertToJson();
                        setShowConvertersMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Code size={14} className="text-info" />
                        <span>Convert to JSON</span>
                      </div>
                      <span className="text-xs text-muted">nested</span>
                    </button>
                    <button
                      onClick={() => {
                        onConvertToYaml();
                        setShowConvertersMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText size={14} className="text-primary" />
                        <span>Convert to YAML</span>
                      </div>
                      <span className="text-xs text-muted">config.yaml</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Validation Button */}
          <button
            onClick={onToggleValidation}
            className={`flex items-center space-x-2 px-3 py-2 rounded text-sm transition-colors ${hasValidationIssues
                ? "bg-warning/20 text-warning hover:bg-warning/30"
                : "bg-success/20 text-success hover:bg-success/30"
              }`}
          >
            {hasValidationIssues ? (
              <AlertTriangle size={14} />
            ) : (
              <CheckCircle size={14} />
            )}
            <span>
              {hasValidationIssues
                ? `${totalIssues} issues`
                : "Valid"}
            </span>
          </button>
        </div>

        {/* Right side - Stats (similar to INI view) */}
        <div className="flex items-center space-x-4 text-sm text-secondary">
          <div className="flex items-center space-x-2">
            <span>{validation.duplicateKeys.length + validation.emptyValues.length + validation.invalidKeys.length > 0 ? totalIssues + ' issues' : 'No issues'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};