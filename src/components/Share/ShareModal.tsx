import React, { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import { X, Copy, Check, AlertCircle } from "lucide-react";
import { Tab } from "../../types";
import { shareService } from "../../services/shareService";
import { SizeIndicator } from "./SizeIndicator";
import { DefaultTextRangeTrimUI } from "./DefaultTextRangeTrimUI";
import { formatRegistry } from "../../formats/registry";

interface ShareModalProps {
  tab: Tab;
  onClose: () => void;
}

type ShareStatus = "checking" | "fits" | "needs-trim" | "too-large";

/**
 * Modal for generating shareable URLs for tabs
 * Handles compression, size checking, and format-specific trimming
 */
export const ShareModal: React.FC<ShareModalProps> = ({ tab, onClose }) => {
  const [status, setStatus] = useState<ShareStatus>("checking");
  const [url, setUrl] = useState<string>("");
  const [currentSize, setCurrentSize] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [selection, setSelection] = useState<any>(null);

  const format = formatRegistry.getById(tab.language);
  const shareStrategy = format?.shareStrategy;
  // Use maxSize from size check to ensure UI and status calculations are consistent
  const [maxSize, setMaxSize] = useState<number>(shareService.getMaxContentSize());

  // Check initial size
  useEffect(() => {
    if (!tab.content) {
      setStatus("fits");
      setUrl(shareService.generateShareUrl(tab.language, ""));
      setCurrentSize(0);
      return;
    }

    const sizeCheck = shareService.canFitInUrl(tab.content, tab.language);
    setCurrentSize(sizeCheck.size);
    setMaxSize(sizeCheck.maxSize); // Use the same maxSize for consistency

    if (sizeCheck.fits) {
      const generatedUrl = shareService.generateShareUrl(
        tab.language,
        tab.content
      );
      setUrl(generatedUrl);
      setStatus("fits");
    } else {
      setStatus("needs-trim");
    }
  }, [tab]);

  // Update URL when selection changes
  useEffect(() => {
    if (status === "needs-trim" && selection) {
      const { content, size } = selection;
      setCurrentSize(size);

      if (size <= maxSize) {
        const metadata = shareStrategy
          ? shareStrategy.encodeMetadata(selection)
          : `r${selection.start}-${selection.end}`;

        const generatedUrl = shareService.generateShareUrl(
          tab.language,
          content,
          metadata
        );
        setUrl(generatedUrl);
      }
    }
  }, [selection, status]);

  const handleCopy = async () => {
    try {
      const fullUrl = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const handleSelectionChange = useCallback((newSelection: any) => {
    setSelection(newSelection);
  }, []);

  // Determine which trim UI to use - memoized to prevent re-creation on every render
  // IMPORTANT: Only use custom trim UI if ALL conditions are met:
  // 1. The format has a shareStrategy defined (e.g., JSON does, curl doesn't)
  // 2. The strategy supports custom trimming (supportsCustomTrim === true)
  // 3. The strategy has a canTrim function AND it returns true for this content
  // 4. The strategy has a getTrimUI function to provide the custom UI
  // Otherwise, always use the default line range selector
  const TrimUI = useMemo(() => {
    // Check if we can use custom trim UI for this format
    const hasShareStrategy = shareStrategy?.supportsCustomTrim &&
      shareStrategy.getTrimUI &&
      shareStrategy.canTrim;

    // Only use custom trim if the strategy exists AND can trim this specific content
    const canUseCustom = hasShareStrategy && shareStrategy.canTrim(tab.content || "");

    if (canUseCustom && shareStrategy.getTrimUI) {
      return React.lazy(shareStrategy.getTrimUI);
    }

    // Default to line range selector for all other cases
    return DefaultTextRangeTrimUI;
  }, [shareStrategy, tab.content]);

  const canCopy = currentSize <= maxSize;

  return (
    <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface border border-base rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base">
          <div>
            <h2 className="text-lg font-semibold text-main">Share Tab</h2>
            <p className="text-sm text-secondary mt-1">
              {tab.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-element-hover rounded transition-colors"
          >
            <X size={20} className="text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Size Indicator */}
          <SizeIndicator currentSize={currentSize} maxSize={maxSize} />

          {/* URL Display (when fits) */}
          {status === "fits" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-main block">
                Shareable URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}${url}`}
                  readOnly
                  className="input-themed flex-1 text-sm font-mono"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-secondary">
                Anyone with this link can open this content in a new tab
              </p>
            </div>
          )}

          {/* Trim UI (when content too large) */}
          {status === "needs-trim" && (
            <div className="space-y-4">
              {/* URL display for trimmed content - always visible to prevent layout shift */}
              <div className="space-y-2 pb-4 border-b border-base">
                <label className="text-sm font-medium text-main block">
                  Shareable URL (Trimmed Content)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={canCopy && url ? `${window.location.origin}${url}` : "Content too large - adjust selection to fit"}
                    readOnly
                    className={`input-themed flex-1 text-sm font-mono ${!canCopy || !url ? 'opacity-50' : ''}`}
                    onClick={(e) => {
                      if (canCopy && url) e.currentTarget.select();
                    }}
                  />
                  <button
                    onClick={handleCopy}
                    disabled={!canCopy || !url}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                  >
                    {copied ? (
                      <>
                        <Check size={16} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                {canCopy && url ? (
                  <div className="flex items-start gap-2 text-xs text-warning bg-warning-subtle p-2 rounded">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <p>
                      This URL contains only the selected portion of your content.
                      The recipient will see a trimmed version.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-xs text-danger bg-danger-subtle p-2 rounded">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <p>
                      Selection is too large. Reduce the number of lines to generate a shareable URL.
                    </p>
                  </div>
                )}
              </div>

              <Suspense
                fallback={
                  <div className="text-center py-8 text-secondary">
                    Loading trimming interface...
                  </div>
                }
              >
                <TrimUI
                  content={tab.content || ""}
                  onSelectionChange={handleSelectionChange}
                  maxSize={maxSize}
                  currentSize={currentSize}
                />
              </Suspense>
            </div>
          )}

          {/* Too large message */}
          {status === "too-large" && (
            <div className="text-center py-8 space-y-3">
              <AlertCircle size={48} className="text-danger mx-auto" />
              <h3 className="text-lg font-medium text-main">
                Content Too Large
              </h3>
              <p className="text-sm text-secondary max-w-md mx-auto">
                This content is too large to share via URL. Consider using the
                Tab Split feature to break it into smaller pieces, or use the
                Export/Import feature instead.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-element hover:bg-element-hover border border-base rounded transition-colors text-main"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
