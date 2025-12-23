import React, { useState } from "react";
import { AlertTriangle, X, ArrowRight } from "lucide-react";
import { getSuspiciousUrlExamples } from "../utils/urlUtils";

interface SuspiciousUrlDemoProps {
  onSelectUrl: (url: string) => void;
  onClose: () => void;
}

export const SuspiciousUrlDemo: React.FC<SuspiciousUrlDemoProps> = ({
  onSelectUrl,
  onClose,
}) => {
  const examples = getSuspiciousUrlExamples();
  const [selectedExample, setSelectedExample] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface border border-base rounded-lg shadow-xl max-w-2xl w-full p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={18} className="text-warning" />
            <h3 className="text-lg font-medium text-main">
              Suspicious URL Examples
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-secondary hover:bg-element-hover rounded"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-main mb-4">
          These examples demonstrate common URL-based attacks and security
          issues. Select an example to analyze it with the URL Parser.
        </p>

        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {examples.map((example, index) => (
            <div
              key={index}
              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                selectedExample === index
                  ? "bg-warning-subtle border-warning text-warning"
                  : "bg-surface-secondary border-base text-main hover:border-warning"
              }`}
              onClick={() => setSelectedExample(index)}
            >
              <div className="font-mono text-sm mb-1 break-all">
                {example.url}
              </div>
              <div className="text-sm text-secondary">{example.description}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={() => {
              if (selectedExample !== null) {
                onSelectUrl(examples[selectedExample].url);
                onClose();
              }
            }}
            disabled={selectedExample === null}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
              selectedExample !== null
                ? "bg-warning/20 text-warning hover:bg-warning/30"
                : "bg-element text-muted cursor-not-allowed"
            }`}
          >
            <span>Analyze Selected URL</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
