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
  const [showInverse, setShowInverse] = React.useState(false);

  const handleInverseToggle = () => {
    setShowInverse((prev) => !prev);
  };

  const handleSmartBracket = () => {
    const unclosedCount = engine.getUnclosedBracketCount();
    const expression = engine.data.expression;
    const lastChar = expression[expression.length - 1];

    // Insert closing bracket if:
    // 1. There are unclosed brackets
    // 2. Last character is a number or closing bracket (makes sense to close)
    const shouldClose = unclosedCount > 0 &&
                       lastChar &&
                       (lastChar.match(/[0-9.)]/));

    engine.handleInput(shouldClose ? ")" : "(");
  };

  const unclosedBrackets = engine.getUnclosedBracketCount();
  const bracketLabel = unclosedBrackets > 0 ? `)${unclosedBrackets > 1 ? unclosedBrackets : ""}` : "(";

  return (
    <div className="grid grid-cols-5 gap-2 flex-grow text-sm">
      {/* Row 1: Top controls */}
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
        value={bracketLabel}
        onClick={handleSmartBracket}
        variant="operator"
      />
      <CalculatorButton
        value="INV"
        onClick={handleInverseToggle}
        variant={showInverse ? "equals" : "action"}
      />
      <CalculatorButton
        value={<Divide size={16} />}
        onClick={() => engine.handleInput("/")}
        variant="operator"
      />

      {/* Row 2: First function row */}
      <CalculatorButton
        value={showInverse ? "asin" : "sin"}
        onClick={() => engine.handleInput(showInverse ? "asin(" : "sin(")}
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

      {/* Row 3: Second function row */}
      <CalculatorButton
        value={showInverse ? "acos" : "cos"}
        onClick={() => engine.handleInput(showInverse ? "acos(" : "cos(")}
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

      {/* Row 4: Third function row */}
      <CalculatorButton
        value={showInverse ? "atan" : "tan"}
        onClick={() => engine.handleInput(showInverse ? "atan(" : "tan(")}
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

      {/* Row 5: Fourth function row */}
      <CalculatorButton
        value={showInverse ? "x^y" : "x²"}
        onClick={() => engine.handleInput(showInverse ? "^" : "^2")}
        variant="action"
      />
      <CalculatorButton
        value={showInverse ? "ln" : "log"}
        onClick={() => engine.handleInput(showInverse ? "log(" : "log10(")}
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
        value={
          <div className="flex items-center justify-center w-full">
            <Equal size={18} />
          </div>
        }
        onClick={engine.handleEquals}
        variant="equals"
      />

      {/* Row 6: Additional functions */}
      <CalculatorButton
        value="√"
        onClick={() => engine.handleInput("sqrt(")}
        variant="action"
      />
      <CalculatorButton
        value="abs"
        onClick={() => engine.handleInput("abs(")}
        variant="action"
      />
      <CalculatorButton
        value="π"
        onClick={() => engine.handleInput("pi")}
        variant="action"
      />
      <CalculatorButton
        value="e"
        onClick={() => engine.handleInput("e")}
        variant="action"
      />
      <CalculatorButton
        value="!"
        onClick={() => engine.handleInput("!")}
        variant="action"
      />
    </div>
  );
};