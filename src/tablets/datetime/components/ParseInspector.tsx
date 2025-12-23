import React, { useState } from 'react';
import { Code, CheckCircle, XCircle, Copy, Check } from '../../../components/Icons';
import { ParseResult } from '../types';
import { simulateCrossPlatformParsing, isValidDateValue, ensureDate } from '../utils/dateUtils';
import { useClipboard } from '../hooks/useClipboard';

interface ParseInspectorProps {
  inputValue: string;
  parsedDate: Date | null;
}

export const ParseInspector: React.FC<ParseInspectorProps> = ({
  inputValue,
  parsedDate
}) => {
  const { copy, copiedId: copiedCode } = useClipboard();
  const [parseResults, setParseResults] = useState<ParseResult[]>([]);

  React.useEffect(() => {
    // Use the same validation utilities as TabbedInput to handle serialized dates
    if (isValidDateValue(parsedDate)) {
      const validDate = ensureDate(parsedDate);
      if (validDate) {
        const valueToTest = validDate.toISOString();
        const results = simulateCrossPlatformParsing(valueToTest);
        setParseResults(results);
        return;
      }
    }

    if (inputValue.trim()) {
      // Fall back to input value if no valid parsed date
      const results = simulateCrossPlatformParsing(inputValue.trim());
      setParseResults(results);
    } else {
      setParseResults([]);
    }
  }, [inputValue, parsedDate]);

  // Show empty state only if we have neither a valid parsed date nor input value
  // Use the same validation utilities as TabbedInput to handle serialized dates
  const hasValidDate = isValidDateValue(parsedDate);
  const hasInputValue = inputValue.trim();

  if (!hasValidDate && !hasInputValue) {
    return (
      <div className="bg-surface-secondary rounded-lg p-6 text-center border border-base">
        <Code size={32} className="mx-auto text-muted mb-2" />
        <p className="text-secondary">Enter a date/time to see cross-platform parsing</p>
        <p className="text-muted text-sm mt-1">
          See how different programming languages would parse your input
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-secondary rounded-lg overflow-hidden border border-base">
      <div className="bg-surface-highlight/50 px-4 py-3 border-b border-base">
        <h3 className="text-lg font-semibold text-main flex items-center">
          <Code size={18} className="mr-2" />
          Cross-Platform Parse Inspector
        </h3>
        <p className="text-sm text-secondary mt-1">
          {hasValidDate ? (
            <>
              How different languages would parse: <code className="bg-surface-highlight/50 px-1 rounded">{ensureDate(parsedDate)?.toISOString()}</code>
            </>
          ) : hasInputValue ? (
            <>
              How different languages would parse: <code className="bg-surface-highlight/50 px-1 rounded">{inputValue}</code>
            </>
          ) : null}
        </p>
      </div>

      <div className="divide-y divide-base">
        {parseResults.map((result) => (
          <div key={result.language} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-main">{result.language}</h4>
                {result.success ? (
                  <CheckCircle size={16} className="text-success" />
                ) : (
                  <XCircle size={16} className="text-danger" />
                )}
              </div>

              <button
                onClick={() => copy(result.code, result.language)}
                className="p-1 hover:bg-element-hover rounded transition-colors text-secondary hover:text-main"
                title="Copy code"
              >
                {copiedCode === result.language ? (
                  <Check size={14} className="text-success" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>

            {/* Code snippet */}
            <div className="bg-surface rounded-md p-3 mb-2 border border-base">
              <code className="text-sm text-secondary font-mono">
                {result.code}
              </code>
            </div>

            {/* Result or error */}
            {result.success ? (
              <div className="bg-success-subtle border border-success/30 rounded-md p-3">
                <div className="text-success text-sm font-medium mb-1">Success</div>
                <div className="text-success text-sm font-mono">
                  {result.result}
                </div>
              </div>
            ) : (
              <div className="bg-danger-subtle border border-danger/30 rounded-md p-3">
                <div className="text-danger text-sm font-medium mb-1">Error</div>
                <div className="text-danger text-sm">
                  {result.error}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {parseResults.length === 0 && (
        <div className="p-6 text-center">
          <p className="text-secondary">Analyzing input...</p>
        </div>
      )}
    </div>
  );
};