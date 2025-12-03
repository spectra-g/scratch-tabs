import React, { useState } from "react";
import {
  ArrowUpDown,
  Layers,
  Eraser,
  AlignLeft,
  Scissors,
  FileText,
  Code,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Settings,
} from "../../../../components/Icons";
import { IniValidationIssue } from "../types";

interface IniToolboxProps {
  selectedSectionId: string | null;
  validationIssues: IniValidationIssue[];
  isValid: boolean;
  onShowValidation: () => void;
  onSortKeysInSection?: () => void;
  onSortAllSections: () => void;
  onStripAllComments: () => void;
  onNormalizeSpacing: () => void;
  onTrimWhitespace: () => void;
  onEnsureFinalNewline: () => void;
  onRemoveFinalNewline: () => void;
  onConvertToJson: () => void;
  onConvertToYaml: () => void;
  sectionCount: number;
  totalKeyCount: number;
}

export const IniToolbox: React.FC<IniToolboxProps> = ({
  selectedSectionId,
  validationIssues,
  isValid,
  onShowValidation,
  onSortKeysInSection,
  onSortAllSections,
  onStripAllComments,
  onNormalizeSpacing,
  onTrimWhitespace,
  onEnsureFinalNewline,
  onRemoveFinalNewline,
  onConvertToJson,
  onConvertToYaml,
  sectionCount,
  totalKeyCount,
}) => {
  const [showSortingMenu, setShowSortingMenu] = useState(false);
  const [showCleaningMenu, setShowCleaningMenu] = useState(false);
  const [showConvertersMenu, setShowConvertersMenu] = useState(false);

  const errorCount = validationIssues.filter(issue => issue.type === 'error').length;
  const warningCount = validationIssues.filter(issue => issue.type === 'warning').length;

  return (
    <div className="flex-none border-b border-base p-3 bg-surface-secondary">
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
                    {selectedSectionId && onSortKeysInSection && (
                      <button
                        onClick={() => {
                          onSortKeysInSection();
                          setShowSortingMenu(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                      >
                        <ArrowUpDown size={14} />
                        <span>Sort Keys in Section</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onSortAllSections();
                        setShowSortingMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <Layers size={14} />
                      <span>Sort All Sections</span>
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
                        onStripAllComments();
                        setShowCleaningMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <Eraser size={14} />
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
                    <button
                      onClick={() => {
                        onTrimWhitespace();
                        setShowCleaningMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <Scissors size={14} />
                      <span>Trim Whitespace</span>
                    </button>
                    <div className="border-t border-base my-1" />
                    <button
                      onClick={() => {
                        onEnsureFinalNewline();
                        setShowCleaningMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <FileText size={14} />
                      <span>Ensure Final Newline</span>
                    </button>
                    <button
                      onClick={() => {
                        onRemoveFinalNewline();
                        setShowCleaningMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <FileText size={14} />
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
                      <span className="text-xs text-muted">config.json</span>
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
            onClick={onShowValidation}
            className={`flex items-center space-x-2 px-3 py-2 rounded text-sm transition-colors ${validationIssues.length > 0
              ? errorCount > 0
                ? "bg-danger/20 text-danger hover:bg-danger/30"
                : "bg-warning/20 text-warning hover:bg-warning/30"
              : "bg-success/20 text-success hover:bg-success/30"
              }`}
          >
            {isValid ? (
              <CheckCircle size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            <span>
              {validationIssues.length === 0
                ? "Valid"
                : `${errorCount} errors, ${warningCount} warnings`}
            </span>
          </button>
        </div>

        {/* Right side - Stats */}
        <div className="flex items-center space-x-4 text-sm text-secondary">
          <div className="flex items-center space-x-2">
            <Settings size={14} />
            <span>{sectionCount} sections</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>{totalKeyCount} keys</span>
          </div>
          {selectedSectionId && (
            <div className="text-info">
              Section selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
};