import React from "react";
import { History, Bot, Sigma, Code } from "lucide-react";
import { CalculatorEngine, CalculatorMode } from "../useCalculatorEngine";

interface CalculatorHistoryProps {
  engine: CalculatorEngine;
}

const getModeIcon = (mode: CalculatorMode) => {
  switch (mode) {
    case "standard":
      return <Bot size={12} className="text-gray-400" />;
    case "scientific":
      return <Sigma size={12} className="text-blue-400" />;
    case "programmer":
      return <Code size={12} className="text-green-400" />;
    default:
      return <Bot size={12} className="text-gray-400" />;
  }
};

export const CalculatorHistory: React.FC<CalculatorHistoryProps> = ({ engine }) => {
  const { data } = engine;

  return (
    <div className="mb-4 flex-shrink-0">
      <div className="flex items-center space-x-2 mb-2 px-1">
        <History className="text-gray-400" size={18} />
        <h3 className="text-base font-medium text-gray-200">History</h3>
      </div>
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 h-40 overflow-y-auto custom-scrollbar">
        {!data.history || data.history.length === 0 ? (
          <div className="text-gray-500 text-sm italic text-center mt-4">
            No history yet
          </div>
        ) : (
          <div className="space-y-2">
            {data.history.map((entry, i) => (
              <button
                key={i}
                onClick={() => engine.handleHistoryClick(entry)}
                className="w-full text-left p-1.5 rounded hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-mono text-xs text-gray-400 truncate flex-1">
                    {entry.expression}
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    {getModeIcon(entry.mode)}
                  </div>
                </div>
                <div className="font-mono text-sm text-gray-200 text-right truncate">
                  = {entry.result}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};