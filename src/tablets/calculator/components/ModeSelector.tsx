import React from "react";
import { Bot, Code, Sigma } from "lucide-react";
import { CalculatorButton } from "./CalculatorButton";
import { CalculatorMode, CalculatorEngine } from "../useCalculatorEngine";

interface ModeSelectorProps {
  engine: CalculatorEngine;
  currentMode: CalculatorMode;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ engine, currentMode }) => {
  return (
    <div className="flex items-center space-x-1 bg-element p-1 rounded-lg">
      <CalculatorButton
        value={<Bot size={16} />}
        onClick={() => engine.handleModeChange("standard")}
        variant="mode"
        ariaLabel="Standard Mode"
        isActive={currentMode === "standard"}
      />
      <CalculatorButton
        value={<Sigma size={16} />}
        onClick={() => engine.handleModeChange("scientific")}
        variant="mode"
        ariaLabel="Scientific Mode"
        isActive={currentMode === "scientific"}
      />
      <CalculatorButton
        value={<Code size={16} />}
        onClick={() => engine.handleModeChange("programmer")}
        variant="mode"
        ariaLabel="Programmer Mode"
        isActive={currentMode === "programmer"}
      />
    </div>
  );
};