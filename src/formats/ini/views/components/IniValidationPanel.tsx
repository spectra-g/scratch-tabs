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
    const issueText = `${issue.type.toUpperCase()}: ${issue.message}${
      issue.suggestion ? `\nSuggestion: ${issue.suggestion}` : ''
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
    <div className="flex-none border-b border-gray-700 bg-gray-800/50 max-h-64 overflow-hidden">
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-200 flex items-center space-x-2">
            <AlertTriangle size={16} className={errorIssues.length > 0 ? "text-red-400" : "text-yellow-400"} />
            <span>
              Validation Issues ({errorIssues.length} errors, {warningIssues.length} warnings)
            </span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700 text-gray-400"
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
              className="bg-red-500/10 border border-red-500/30 rounded-lg p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-red-400">Error</span>
                  </div>
                  <p className="text-sm text-gray-200 mb-1">{issue.message}</p>
                  {issue.suggestion && (
                    <p className="text-xs text-gray-400 italic">
                      Suggestion: {issue.suggestion}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={() => handleCopyIssue(issue)}
                    className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
                    title="Copy issue details"
                  >
                    <Copy size={12} />
                  </button>
                  {issue.sectionId && (
                    <button
                      onClick={() => handleGoToIssue(issue)}
                      className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
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
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-yellow-400">Warning</span>
                  </div>
                  <p className="text-sm text-gray-200 mb-1">{issue.message}</p>
                  {issue.suggestion && (
                    <p className="text-xs text-gray-400 italic">
                      Suggestion: {issue.suggestion}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={() => handleCopyIssue(issue)}
                    className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
                    title="Copy issue details"
                  >
                    <Copy size={12} />
                  </button>
                  {issue.sectionId && (
                    <button
                      onClick={() => handleGoToIssue(issue)}
                      className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
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