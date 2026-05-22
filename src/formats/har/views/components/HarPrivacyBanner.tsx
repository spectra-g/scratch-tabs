import React, { useState } from "react";
import { ShieldAlert, X, ChevronDown, ChevronUp } from "lucide-react";

interface HarPrivacyBannerProps {
  sensitiveDataTypes: string[];
}

export const HarPrivacyBanner: React.FC<HarPrivacyBannerProps> = ({
  sensitiveDataTypes,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex-none border-b border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">
      <div className="flex items-start gap-3 px-4 py-2.5">
        <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Sensitive data detected in this HAR file.</span>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
            >
              {expanded ? (
                <>Less <ChevronUp size={12} /></>
              ) : (
                <>Details <ChevronDown size={12} /></>
              )}
            </button>
          </div>
          {expanded && (
            <div className="mt-1 text-xs space-y-1 opacity-90">
              <p>
                This file contains: <span className="font-medium">{sensitiveDataTypes.join(", ")}</span>.
              </p>
              <p>
                HAR files can expose full request/response bodies, cookies, and auth tokens.
                Every online HAR viewer is a potential data exfiltration risk.
                You are viewing this file entirely offline — no data leaves your browser.
              </p>
            </div>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss privacy notice"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
