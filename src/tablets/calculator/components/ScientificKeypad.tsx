import React from "react";
import {
  Delete,
  Divide,
  X as MultiplyIcon,
  Minus,
  Plus,
  Equal,
  Parentheses,
} from "lucide-react";
import { CalculatorButton } from "./CalculatorButton";
import { CalculatorEngine } from "../useCalculatorEngine";

interface ScientificKeypadProps {
  engine: CalculatorEngine;
}

export const ScientificKeypad: React.FC<ScientificKeypadProps> = ({ engine }) => {
  return (
    <div className="grid grid-cols-5 gap-2 flex-grow text-sm">
      <CalculatorButton
        value="AC"
        onClick={engine.handleClear}
        variant="action"
      />
      <CalculatorButton
        value={<Delete size={16} />}
        onClick={engine.handleBackspace}
        variant="action"
      />
      <CalculatorButton
        value={<Parentheses size={16} />}
        onClick={() => engine.handleInput("()")}
        variant="operator"
      />
      <CalculatorButton
        value="%"
        onClick={() => engine.handleInput("%")}
        variant="operator"
      />
      <CalculatorButton
        value={<Divide size={16} />}
        onClick={() => engine.handleInput("/")}
        variant="operator"
      />

      <CalculatorButton
        value="sin"
        onClick={() => engine.handleInput("sin(")}
        variant="action"
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
        value={<MultiplyIcon size={16} />}
        onClick={() => engine.handleInput("*")}
        variant="operator"
      />

      <CalculatorButton
        value="cos"
        onClick={() => engine.handleInput("cos(")}
        variant="action"
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
        value={<Minus size={16} />}
        onClick={() => engine.handleInput("-")}
        variant="operator"
      />

      <CalculatorButton
        value="tan"
        onClick={() => engine.handleInput("tan(")}
        variant="action"
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
        value={<Plus size={16} />}
        onClick={() => engine.handleInput("+")}
        variant="operator"
      />

      <CalculatorButton
        value="√"
        onClick={() => engine.handleInput("sqrt(")}
        variant="action"
      />
      <CalculatorButton
        value="x²"
        onClick={() => engine.handleInput("^2")}
        variant="action"
      />
      <CalculatorButton
        value="0"
        onClick={() => engine.handleInput("0")}
      />
      <CalculatorButton
        value="."
        onClick={() => engine.handleInput(".")}
      />
      <CalculatorButton
        value={<Equal size={18} />}
        onClick={engine.handleEquals}
        variant="equals"
      />
    </div>
  );
};