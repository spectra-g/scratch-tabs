import React from "react";
import { Book } from "lucide-react";
import { RegexExplanation } from "../types";
import { explainRegexNaturally } from "../utils/regexEngine";

interface ExplanationViewProps {
  explanation: RegexExplanation[];
  pattern: string;
}

const TYPE_COLORS = {
  literal: "bg-surface-secondary/20 border-base/50 text-secondary",
  group: "bg-primary/20 border-primary/50 text-primary",
  quantifier: "bg-green-500/20 border-green-500/50 text-green-300",
  assertion: "bg-purple-500/20 border-purple-500/50 text-purple-300",
  "character-class": "bg-yellow-500/20 border-yellow-500/50 text-yellow-300",
  anchor: "bg-red-500/20 border-red-500/50 text-red-300",
  escape: "bg-indigo-500/20 border-indigo-500/50 text-indigo-300",
};

export function ExplanationView({
  explanation,
  pattern,
}: ExplanationViewProps) {
  const renderPatternWithHighlight = () => {
    if (!pattern || explanation.length === 0) {
      return (
        <span className="font-mono text-muted">
          {pattern || "No pattern to explain"}
        </span>
      );
    }

    let lastIndex = 0;
    const elements: React.ReactNode[] = [];

    explanation.forEach((exp, index) => {
      // Add any characters before this explanation
      if (exp.start > lastIndex) {
        elements.push(
          <span key={`before-${index}`} className="text-secondary">
            {pattern.slice(lastIndex, exp.start)}
          </span>,
        );
      }

      // Add the highlighted explanation part
      elements.push(
        <span
          key={index}
          className={`px-1 py-0.5 rounded border text-xs font-medium ${TYPE_COLORS[exp.type]}`}
          title={exp.description}
        >
          {exp.value}
        </span>,
      );

      lastIndex = exp.end;
    });

    // Add any remaining characters
    if (lastIndex < pattern.length) {
      elements.push(
        <span key="after" className="text-secondary">
          {pattern.slice(lastIndex)}
        </span>,
      );
    }

    return (
      <span className="font-mono text-sm leading-relaxed">{elements}</span>
    );
  };

  const generateHumanReadable = () => {
    if (!pattern || explanation.length === 0) {
      return "No pattern to explain.";
    }

    // Use the new semantic natural language generator
    return explainRegexNaturally(pattern);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-base/50">
        <Book size={16} className="text-muted" />
        <div className="text-sm font-medium text-secondary">
          Pattern Explanation
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {/* Highlighted Pattern */}
        <div>
          <h3 className="text-sm font-medium text-main mb-2">
            Pattern Breakdown:
          </h3>
          <div className="bg-canvas/50 border border-base/50 rounded-md p-3 max-h-40 overflow-y-auto custom-scrollbar">
            {renderPatternWithHighlight()}
          </div>
        </div>

        {/* Human Readable */}
        <div>
          <h3 className="text-sm font-medium text-main mb-2">
            Plain English:
          </h3>
          <div className="bg-surface-raised/30 border border-base/50 rounded-md p-3">
            <p className="text-secondary text-sm leading-relaxed capitalize">
              {generateHumanReadable()}
            </p>
          </div>
        </div>

        {/* Detailed Breakdown */}
        {explanation.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-main mb-2">
              Detailed Breakdown:
            </h3>
            <div className="space-y-2">
              {explanation.map((exp, index) => (
                <div
                  key={index}
                  className="bg-surface-raised/30 border border-base/50 rounded-md p-3 flex items-start gap-3"
                >
                  <div
                    className={`px-2 py-1 rounded text-xs font-mono flex-shrink-0 ${TYPE_COLORS[exp.type]}`}
                  >
                    {exp.value}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-main">
                      {exp.description}
                    </div>
                    <div className="text-xs text-muted mt-1">
                      Type: {exp.type} • Position: {exp.start}-{exp.end - 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div>
          <h3 className="text-sm font-medium text-main mb-2">Legend:</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(TYPE_COLORS).map(([type, colorClass]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded border ${colorClass}`}></div>
                <span className="text-muted capitalize">
                  {type.replace("-", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
