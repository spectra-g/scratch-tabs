import React from "react";
import { X, AlertTriangle, Copy, ExternalLink } from "../../../../components/Icons";
import { IniValidationIssue } from "../types";

interface IniValidationPanelProps {
  issues: IniValidationIssue[];
  onClose: () => void;
  onSelectSection: (sectionId: string | null) => void;
}

export const IniValidationPanel: React.FC<IniValidationPanelProps> = ({
  issues,
  onClose,
  onSelectSection,
}) => {
  const errorIssues = issues.filter(issue => issue.type === 'error');
  const warningIssues = issues.filter(issue => issue.type === 'warning');

  const handleCopyIssue = async (issue: IniValidationIssue) => {
    const issueText = `${issue.type.toUpperCase()}: ${issue.message}${issue.suggestion ? `\nSuggestion: ${issue.suggestion}` : ''
      }`;

    try {
      await navigator.clipboard.writeText(issueText);
    } catch {
      // Silently fail if clipboard access is not available
      // This is common in some browser environments
    }
  };

  const handleGoToIssue = (issue: IniValidationIssue) => {
    if (issue.sectionId) {
      onSelectSection(issue.sectionId);
    }
  };

  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="flex-none border-b border-base bg-surface/50 max-h-64 overflow-hidden">
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-main flex items-center space-x-2">
            <AlertTriangle size={16} className={errorIssues.length > 0 ? "text-danger" : "text-warning"} />
            <span>
              Validation Issues ({errorIssues.length} errors, {warningIssues.length} warnings)
            </span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-element-hover text-secondary"
            title="Close validation panel"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {/* Errors first */}
          {errorIssues.map((issue, index) => (
            <div
              key={`error-${index}`}
              className="bg-danger/10 border border-danger/30 rounded-lg p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertTriangle size={14} className="text-danger flex-shrink-0" />
                    <span className="text-sm font-medium text-danger">Error</span>
                  </div>
                  <p className="text-sm text-main mb-1">{issue.message}</p>
                  {issue.suggestion && (
                    <p className="text-xs text-secondary italic">
                      Suggestion: {issue.suggestion}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={() => handleCopyIssue(issue)}
                    className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
                    title="Copy issue details"
                  >
                    <Copy size={12} />
                  </button>
                  {issue.sectionId && (
                    <button
                      onClick={() => handleGoToIssue(issue)}
                      className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
                      title="Go to section"
                    >
                      <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Then warnings */}
          {warningIssues.map((issue, index) => (
            <div
              key={`warning-${index}`}
              className="bg-warning/10 border border-warning/30 rounded-lg p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertTriangle size={14} className="text-warning flex-shrink-0" />
                    <span className="text-sm font-medium text-warning">Warning</span>
                  </div>
                  <p className="text-sm text-main mb-1">{issue.message}</p>
                  {issue.suggestion && (
                    <p className="text-xs text-secondary italic">
                      Suggestion: {issue.suggestion}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={() => handleCopyIssue(issue)}
                    className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
                    title="Copy issue details"
                  >
                    <Copy size={12} />
                  </button>
                  {issue.sectionId && (
                    <button
                      onClick={() => handleGoToIssue(issue)}
                      className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
                      title="Go to section"
                    >
                      <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};