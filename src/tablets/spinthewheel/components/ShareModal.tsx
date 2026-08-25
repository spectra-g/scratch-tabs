import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, Copy, Link2, X } from "lucide-react";

interface ShareModalProps {
  /** Full shareable URL, or null when the payload does not fit in a URL. */
  url: string | null;
  /** Percent of the URL budget used — shown on the too-large warning. */
  percentUsed?: number;
  /** Entries as text; offered as a copy fallback when the URL is too large. */
  entriesText: string;
  onClose: () => void;
}

/**
 * Shows the generated share link with a copy button, or — when the wheel is
 * too big for a URL — a size warning plus a "copy names instead" fallback.
 */
export const ShareModal: React.FC<ShareModalProps> = ({
  url,
  percentUsed = 0,
  entriesText,
  onClose,
}) => {
  const [copied, setCopied] = useState<"url" | "names" | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const flashCopied = useCallback((which: "url" | "names") => {
    setCopied(which);
    window.setTimeout(() => setCopied(null), 1500);
  }, []);

  const handleCopyUrl = useCallback(() => {
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => flashCopied("url"))
      .catch(() => {});
  }, [url, flashCopied]);

  const handleCopyNames = useCallback(() => {
    navigator.clipboard
      .writeText(entriesText)
      .then(() => flashCopied("names"))
      .catch(() => {});
  }, [entriesText, flashCopied]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="Share this wheel"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-surface rounded-xl shadow-2xl w-full max-w-md border border-base p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-main">
                <Link2 size={18} />
                <span className="text-sm font-semibold">Share this wheel</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Close share dialog"
              >
                <X size={18} />
              </button>
            </div>

            {url ? (
              <>
                <p className="text-xs text-muted mb-2">
                  Anyone with this link opens a copy of your wheel in a new tab.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={url}
                    data-testid="spinthewheel-share-url"
                    onFocus={(e) => e.target.select()}
                    aria-label="Shareable link"
                    className="flex-1 min-w-0 px-3 py-2 text-xs bg-canvas border border-base/50 rounded text-secondary truncate focus:outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={handleCopyUrl}
                    autoFocus
                    className={`flex items-center gap-1.5 px-3 py-2 flex-shrink-0 font-medium rounded-lg border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary ${
                      copied === "url"
                        ? "border-success text-success"
                        : "border-base text-main hover:bg-element-hover"
                    }`}
                  >
                    {copied === "url" ? <Check size={14} /> : <Copy size={14} />}
                    {copied === "url" ? "Copied" : "Copy"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p
                  className="flex items-start gap-2 text-sm text-warning mb-3"
                  role="alert"
                >
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>
                    This wheel is too large for a shareable link (
                    {Math.round(percentUsed)}% of the limit). Copy the names and
                    paste them into a new wheel instead.
                  </span>
                </p>
                <button
                  onClick={handleCopyNames}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-contrast font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
                >
                  {copied === "names" ? <Check size={16} /> : <Copy size={16} />}
                  {copied === "names" ? "Names copied" : "Copy names instead"}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
    </AnimatePresence>
  );
};
