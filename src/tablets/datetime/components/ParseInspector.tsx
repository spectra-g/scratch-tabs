import React from 'react';
import { Code, CheckCircle, XCircle, Copy } from '../../../components/Icons';
import { ParseResult } from '../types';
import { simulateCrossPlatformParsing } from '../utils/dateUtils';
import { useState } from 'react';

interface ParseInspectorProps {
  inputValue: string;
  parsedDate: Date | null;
}

export const ParseInspector: React.FC<ParseInspectorProps> = ({
  inputValue,
  parsedDate
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [parseResults, setParseResults] = useState<ParseResult[]>([]);

  React.useEffect(() => {
    if (inputValue.trim()) {
      const results = simulateCrossPlatformParsing(inputValue.trim());
      setParseResults(results);
    } else {
      setParseResults([]);
    }
  }, [inputValue]);

  const copyCode = async (code: string, language: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(language);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  if (!inputValue.trim()) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <Code size={32} className="mx-auto text-gray-600 mb-2" />
        <p className="text-gray-400">Enter a date/time to see cross-platform parsing</p>
        <p className="text-gray-500 text-sm mt-1">
          See how different programming languages would parse your input
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
        <h3 className="text-lg font-semibold text-gray-200 flex items-center">
          <Code size={18} className="mr-2" />
          Cross-Platform Parse Inspector
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          How different languages would parse: <code className="bg-gray-600 px-1 rounded">{inputValue}</code>
        </p>
      </div>

      <div className="divide-y divide-gray-700">
        {parseResults.map((result) => (
          <div key={result.language} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-gray-200">{result.language}</h4>
                {result.success ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <XCircle size={16} className="text-red-400" />
                )}
              </div>
              
              <button
                onClick={() => copyCode(result.code, result.language)}
                className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-200"
                title="Copy code"
              >
                {copiedCode === result.language ? (
                  <CheckCircle size={14} className="text-green-400" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>

            {/* Code snippet */}
            <div className="bg-gray-900 rounded-md p-3 mb-2">
              <code className="text-sm text-gray-300 font-mono">
                {result.code}
              </code>
            </div>

            {/* Result or error */}
            {result.success ? (
              <div className="bg-green-900/20 border border-green-700/50 rounded-md p-3">
                <div className="text-green-400 text-sm font-medium mb-1">Success</div>
                <div className="text-green-300 text-sm font-mono">
                  {result.result}
                </div>
              </div>
            ) : (
              <div className="bg-red-900/20 border border-red-700/50 rounded-md p-3">
                <div className="text-red-400 text-sm font-medium mb-1">Error</div>
                <div className="text-red-300 text-sm">
                  {result.error}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {parseResults.length === 0 && (
        <div className="p-6 text-center">
          <p className="text-gray-400">Analyzing input...</p>
        </div>
      )}
    </div>
  );
};