import React, { useState } from "react";
import { Info, X } from "lucide-react";

interface HelpGuideProps {
  className?: string;
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export const HelpGuide: React.FC<HelpGuideProps> = ({
  className = "",
  isExpanded: externalIsExpanded,
  onToggle
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;
  const setIsExpanded = (expanded: boolean) => {
    if (onToggle) {
      onToggle(expanded);
    } else {
      setInternalIsExpanded(expanded);
    }
  };

  const steps = [
    {
      step: 1,
      title: "Add a source JSON file",
      description: "Upload or paste your source JSON data that you want to transform."
    },
    {
      step: 2,
      title: "Enter the target JSON structure",
      description: "Define what you want the output JSON to look like. Keep property values untransformed to help the auto mapper map the properties correctly."
    },
    {
      step: 3,
      title: "Click Analyse & Suggest Mappings",
      description: "Let the tool automatically analyze both JSON structures and suggest mapping rules."
    },
    {
      step: 4,
      title: "Inspect and edit mappings",
      description: "Review the suggested mappings and edit or add additional rules as required."
    },
    {
      step: 5,
      title: "Click the Test button",
      description: "Run the transformation against your source file to see the results."
    },
    {
      step: 6,
      title: "Tweak the mappings if required",
      description: "Adjust the mapping rules based on the test results to get the desired output."
    },
    {
      step: 7,
      title: "Save the mapping",
      description: "Save your mapping configuration if you wish to re-use it later."
    },
    {
      step: 8,
      title: "Run batch transformation",
      description: "Use the Batch Transform button to process multiple JSON files or ZIP archives containing JSON files with your saved mapping."
    }
  ];

  return (
    <div className={`bg-surface-secondary border border-base rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-secondary hover:text-primary hover:bg-element-hover rounded transition-colors"
            title={isExpanded ? "Hide help guide" : "Show help guide"}
          >
            <Info size={20} />
          </button>
          <h3 className="text-lg font-medium text-main">How to use JSON Mapper</h3>
        </div>
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 text-secondary hover:text-danger hover:bg-element-hover rounded transition-colors"
            title="Close help guide"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.step} className="flex space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-info-subtle text-info rounded-full flex items-center justify-center text-xs font-medium">
                {step.step}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-main mb-1">
                  {step.title}
                </h4>
                <p className="text-xs text-secondary">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 