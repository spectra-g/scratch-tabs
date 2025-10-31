import React from "react";
import {
  Delete,
  Divide,
  X as MultiplyIcon,
  Minus,
  Plus,
  Equal,
  Dot,
} from "lucide-react";
import { CalculatorButton } from "./CalculatorButton";
import { CalculatorEngine } from "../useCalculatorEngine";

interface StandardKeypadProps {
  engine: CalculatorEngine;
}

export const StandardKeypad: React.FC<StandardKeypadProps> = ({ engine }) => {
  return (
    <div className="grid grid-cols-4 gap-2 flex-grow">
      <CalculatorButton
        value="AC"
        onClick={engine.handleClear}
        variant="action"
      />
      <CalculatorButton
        value={<Delete size={18} />}
        onClick={engine.handleBackspace}
        variant="action"
      />
      <CalculatorButton
        value="%"
        onClick={() => engine.handleInput("%")}
        variant="operator"
      />
      <CalculatorButton
        value={<Divide size={18} />}
        onClick={() => engine.handleInput("/")}
        variant="operator"
      />
      <CalculatorButton
        value="7"
        onClick={() => engine.handleInput("7")}
      />
      <CalculatorButton
        value="8"
        onClick={() => engine.handleInput("8")}
      />
      <CalculatorButton
        value="9"
        onClick={() => engine.handleInput("9")}
      />
      <CalculatorButton
        value={<MultiplyIcon size={18} />}
        onClick={() => engine.handleInput("*")}
        variant="operator"
      />
      <CalculatorButton
        value="4"
        onClick={() => engine.handleInput("4")}
      />
      <CalculatorButton
        value="5"
        onClick={() => engine.handleInput("5")}
      />
      <CalculatorButton
        value="6"
        onClick={() => engine.handleInput("6")}
      />
      <CalculatorButton
        value={<Minus size={18} />}
        onClick={() => engine.handleInput("-")}
        variant="operator"
      />
      <CalculatorButton
        value="1"
        onClick={() => engine.handleInput("1")}
      />
      <CalculatorButton
        value="2"
        onClick={() => engine.handleInput("2")}
      />
      <CalculatorButton
        value="3"
        onClick={() => engine.handleInput("3")}
      />
      <CalculatorButton
        value={<Plus size={18} />}
        onClick={() => engine.handleInput("+")}
        variant="operator"
      />
      <CalculatorButton
        value="0"
        onClick={() => engine.handleInput("0")}
        className="col-span-2"
      />
      <CalculatorButton
        value={<Dot size={18} />}
        onClick={() => engine.handleInput(".")}
      />
      <CalculatorButton
        value={
          <div className="flex items-center justify-center w-full">
            <Equal size={20} />
          </div>
        }
        onClick={engine.handleEquals}
        variant="equals"
      />
    </div>
  );
};