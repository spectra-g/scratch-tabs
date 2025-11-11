// src/tablets/calculator/CalculatorUI.tsx

import React, { useEffect, useRef } from "react";
import { Calculator } from "lucide-react";
import { CalculatorEngine } from "./useCalculatorEngine";
import { useKeyboardHandler } from "./hooks/useKeyboardHandler";
import { CalculatorDisplay } from "./components/CalculatorDisplay";
import { CalculatorHistory } from "./components/CalculatorHistory";
import { CalculatorNotes } from "./components/CalculatorNotes";
import { ModeSelector } from "./components/ModeSelector";
import { StandardKeypad } from "./components/StandardKeypad";
import { ScientificKeypad } from "./components/ScientificKeypad";
import { ProgrammerKeypad } from "./components/ProgrammerKeypad";
import { humanizeExpressionHybrid } from "./utils/formatters";

interface CalculatorUIProps {
  engine: CalculatorEngine;
  tabletId: string;
}

export const CalculatorUI: React.FC<CalculatorUIProps> = ({
  engine,
  tabletId,
}) => {
  const { data } = engine;
  const calculatorRef = useRef<HTMLDivElement>(null);

  useKeyboardHandler(engine, tabletId);

  useEffect(() => {
    calculatorRef.current?.focus();
  }, []);

  const renderKeypad = () => {
    switch (data.mode) {
      case "standard": return <StandardKeypad engine={engine} />;
      case "scientific": return <ScientificKeypad engine={engine} />;
      case "programmer": return <ProgrammerKeypad engine={engine} />;
      default: return <StandardKeypad engine={engine} />;
    }
  };

  const shouldShowHumanized = data.mode === 'standard' || data.mode === 'scientific';
  const hybridHumanized = shouldShowHumanized ? humanizeExpressionHybrid(data.expression) : "";

  return (
    <div
      ref={calculatorRef}
      className="flex flex-col md:flex-row h-full bg-gray-900 text-gray-200"
      tabIndex={-1}
      style={{ outline: "none" }}
      data-calculator-id={tabletId}
    >
      <div className="w-full md:w-8/12 p-4 flex flex-col border-b md:border-b-0 md:border-r border-gray-700/50 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4 px-2 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Calculator className="text-gray-400" size={20} />
            <h2 className="text-lg font-semibold text-gray-100">Calculator</h2>
          </div>
          <ModeSelector engine={engine} currentMode={data.mode} />
        </div>

        <div className="flex-shrink-0">
          <CalculatorDisplay
            expression={data.expression}
            display={data.display}
            mode={data.mode}
          />
        </div>

        {/* New dedicated space for the detailed humanized text */}
        <div className="h-12 flex items-center justify-center text-center p-2 mb-4 text-gray-400 text-sm italic flex-shrink-0">
          <span>{hybridHumanized}</span>
        </div>

        <div className="flex-1 min-h-0">
          {renderKeypad()}
        </div>
      </div>

      <div className="w-full md:w-4/12 p-4 flex flex-col">
        <CalculatorHistory engine={engine} />
        <CalculatorNotes engine={engine} tabletId={tabletId} />
      </div>
    </div>
  );
};
