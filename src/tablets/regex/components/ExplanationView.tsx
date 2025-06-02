import React from 'react';
import { Book } from 'lucide-react';
import { RegexExplanation } from '../types';

interface ExplanationViewProps {
  explanation: RegexExplanation[];
  pattern: string;
}

const TYPE_COLORS = {
  literal: 'bg-gray-500/20 border-gray-500/50 text-gray-300',
  group: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  quantifier: 'bg-green-500/20 border-green-500/50 text-green-300',
  assertion: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
  'character-class': 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
  anchor: 'bg-red-500/20 border-red-500/50 text-red-300',
  escape: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300',
};

export function ExplanationView({ explanation, pattern }: ExplanationViewProps) {
  const renderPatternWithHighlight = () => {
    if (!pattern || explanation.length === 0) {
      return <span className="font-mono text-gray-400">{pattern || 'No pattern to explain'}</span>;
    }

    let lastIndex = 0;
    const elements: React.ReactNode[] = [];

    explanation.forEach((exp, index) => {
      // Add any characters before this explanation
      if (exp.start > lastIndex) {
        elements.push(
          <span key={`before-${index}`} className="text-gray-300">
            {pattern.slice(lastIndex, exp.start)}
          </span>
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
        </span>
      );

      lastIndex = exp.end;
    });

    // Add any remaining characters
    if (lastIndex < pattern.length) {
      elements.push(
        <span key="after" className="text-gray-300">
          {pattern.slice(lastIndex)}
        </span>
      );
    }

    return <span className="font-mono text-sm leading-relaxed">{elements}</span>;
  };

  const generateHumanReadable = () => {
    if (explanation.length === 0) {
      return 'No pattern to explain';
    }

    const parts: string[] = [];
    
    explanation.forEach(exp => {
      switch (exp.type) {
        case 'anchor':
          if (exp.value === '^') {
            parts.push('at the start of string/line');
          } else if (exp.value === '$') {
            parts.push('at the end of string/line');
          }
          break;
        case 'literal':
          parts.push(`match "${exp.value}"`);
          break;
        case 'character-class':
          if (exp.value === '.') {
            parts.push('match any character');
          } else {
            parts.push(`match any character in ${exp.value}`);
          }
          break;
        case 'quantifier':
          if (exp.value === '*') {
            parts.push('zero or more times');
          } else if (exp.value === '+') {
            parts.push('one or more times');
          } else if (exp.value === '?') {
            parts.push('zero or one time');
          } else {
            parts.push(`repeat ${exp.value}`);
          }
          break;
        case 'group':
          if (exp.value.includes('?<')) {
            const nameMatch = exp.value.match(/\?\<(\w+)\>/);
            if (nameMatch) {
              parts.push(`capture as "${nameMatch[1]}"`);
            }
          } else if (exp.value.startsWith('(?:')) {
            parts.push('group without capturing');
          } else {
            parts.push('capture group');
          }
          break;
        case 'escape':
          parts.push(exp.description.toLowerCase());
          break;
        case 'assertion':
          if (exp.value === '|') {
            parts.push('OR');
          } else {
            parts.push(exp.description.toLowerCase());
          }
          break;
      }
    });

    return parts.join(', ');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-gray-700/50">
        <Book size={16} className="text-gray-400" />
        <div className="text-sm font-medium text-gray-300">Pattern Explanation</div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {/* Highlighted Pattern */}
        <div>
          <h3 className="text-sm font-medium text-gray-200 mb-2">Pattern Breakdown:</h3>
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-md p-3 max-h-40 overflow-y-auto custom-scrollbar">
            {renderPatternWithHighlight()}
          </div>
        </div>

        {/* Human Readable */}
        <div>
          <h3 className="text-sm font-medium text-gray-200 mb-2">Plain English:</h3>
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-md p-3">
            <p className="text-gray-300 text-sm leading-relaxed capitalize">
              {generateHumanReadable()}
            </p>
          </div>
        </div>

        {/* Detailed Breakdown */}
        {explanation.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-200 mb-2">Detailed Breakdown:</h3>
            <div className="space-y-2">
              {explanation.map((exp, index) => (
                <div
                  key={index}
                  className="bg-gray-800/30 border border-gray-700/50 rounded-md p-3 flex items-start gap-3"
                >
                  <div className={`px-2 py-1 rounded text-xs font-mono flex-shrink-0 ${TYPE_COLORS[exp.type]}`}>
                    {exp.value}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-200">{exp.description}</div>
                    <div className="text-xs text-gray-400 mt-1">
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
          <h3 className="text-sm font-medium text-gray-200 mb-2">Legend:</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(TYPE_COLORS).map(([type, colorClass]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded border ${colorClass}`}></div>
                <span className="text-gray-400 capitalize">{type.replace('-', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 