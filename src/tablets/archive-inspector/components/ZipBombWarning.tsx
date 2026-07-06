import React from "react";
import { AlertTriangle } from "../../../components/Icons";

interface ZipBombWarningProps {
  onContinue: () => void;
  onDismiss: () => void;
}

export const ZipBombWarning: React.FC<ZipBombWarningProps> = ({ onContinue, onDismiss }) => (
  <div className="flex items-start gap-3 px-4 py-3 bg-warning-subtle border border-warning/40 rounded text-sm">
    <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="font-medium text-main">Potential ZIP bomb detected</p>
      <p className="text-secondary text-xs mt-0.5">
        This archive has an unusually high compression ratio (&gt;100:1) on a large file. Extraction
        may consume excessive memory.
      </p>
      <div className="flex gap-2 mt-2">
        <button
          onClick={onContinue}
          className="px-3 py-1 rounded bg-warning text-warning-content text-xs hover:bg-warning/90 transition-colors"
        >
          Extract anyway
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1 rounded border border-base text-secondary text-xs hover:bg-surface-raised transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);
