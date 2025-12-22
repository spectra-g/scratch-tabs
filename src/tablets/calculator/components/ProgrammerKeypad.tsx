import React from "react";
import { Equal, Binary, ToggleLeft, ToggleRight } from "lucide-react";
import { CalculatorButton } from "./CalculatorButton";
import { CalculatorEngine } from "../useCalculatorEngine";
import { LiveBaseConverter } from "./LiveBaseConverter";
import { BitToggler } from "./BitToggler";
import { extractCurrentNumber } from "../utils/baseConverter";

interface ProgrammerKeypadProps {
  engine: CalculatorEngine;
}

export const ProgrammerKeypad: React.FC<ProgrammerKeypadProps> = ({ engine }) => {
  const { data } = engine;
  const [showBitToggler, setShowBitToggler] = React.useState(false);

  /**
   * Handles bit toggle from BitToggler component
   * Replaces the current number in the expression with the new value
   */
  const handleBitToggle = (newValue: string) => {
    const currentExpression = data.expression;
    const currentNumber = extractCurrentNumber(currentExpression);

    // Determine what the new expression should be
    let newExpression: string;

    if (currentExpression === currentNumber || currentExpression === "0") {
      // Expression is just a single number, replace with new value
      newExpression = newValue;
    } else {
      // Expression has operators, replace the last number
      const expressionWithoutNumber = currentExpression.slice(
        0,
        currentExpression.length - currentNumber.length
      );
      newExpression = expressionWithoutNumber + newValue;
    }

    // Directly set the new expression (avoids async state update issues)
    engine.setExpression(newExpression);
  };

  const currentNumber = extractCurrentNumber(data.expression);

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto custom-scrollbar">
      {/* Bit Toggler Toggle Button */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => setShowBitToggler(!showBitToggler)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
            transition-all duration-200
            ${showBitToggler
              ? "bg-primary/20 text-info hover:bg-primary/30"
              : "bg-element text-secondary hover:bg-element-hover"
            }
          `}
        >
          {showBitToggler ? (
            <ToggleRight size={18} />
          ) : (
            <ToggleLeft size={18} />
          )}
          <span>Bit Toggler</span>
        </button>
        <div className="text-xs text-muted">
          {showBitToggler ? "Click bits to toggle" : "Show bit editor"}
        </div>
      </div>

      {/* Bit Toggler */}
      {showBitToggler && (
        <div className="flex-shrink-0">
          <BitToggler
            currentNumber={currentNumber}
            currentBase={data.base}
            onBitToggle={handleBitToggle}
            bitWidth={32}
          />
        </div>
      )}

      {/* Live Base Converter */}
      <div className="flex-shrink-0">
        <LiveBaseConverter expression={data.expression} currentBase={data.base} />
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-5 gap-2 flex-shrink-0 text-sm">
        <CalculatorButton
          value="AC"
          onClick={engine.handleClear}
          variant="action"
        />
        <CalculatorButton
          value="NOT"
          onClick={() => engine.handleInput("~")}
          variant="action"
        />
        <CalculatorButton
          value="AND"
          onClick={() => engine.handleInput(" & ")}
          variant="operator"
        />
        <CalculatorButton
          value="OR"
          onClick={() => engine.handleInput(" | ")}
          variant="operator"
        />
        <CalculatorButton
          value="XOR"
          onClick={() => engine.handleInput(" ^ ")}
          variant="operator"
        />

        <CalculatorButton
          value="A"
          onClick={() => engine.handleInput("A")}
        />
        <CalculatorButton
          value="B"
          onClick={() => engine.handleInput("B")}
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
          value="C"
          onClick={() => engine.handleInput("C")}
        />
        <CalculatorButton
          value="D"
          onClick={() => engine.handleInput("D")}
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
          value="E"
          onClick={() => engine.handleInput("E")}
        />
        <CalculatorButton
          value="F"
          onClick={() => engine.handleInput("F")}
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
          value="HEX"
          onClick={() => engine.handleBaseChange("HEX")}
          variant="mode"
          isActive={data.base === "HEX"}
        />
        <CalculatorButton
          value="DEC"
          onClick={() => engine.handleBaseChange("DEC")}
          variant="mode"
          isActive={data.base === "DEC"}
        />
        <CalculatorButton
          value="OCT"
          onClick={() => engine.handleBaseChange("OCT")}
          variant="mode"
          isActive={data.base === "OCT"}
        />
        <CalculatorButton
          value={<Binary size={16} />}
          onClick={() => engine.handleBaseChange("BIN")}
          variant="mode"
          isActive={data.base === "BIN"}
        />
        <CalculatorButton
          value="0"
          onClick={() => engine.handleInput("0")}
        />

        <div className="col-span-5 grid grid-cols-1">
          <CalculatorButton
            value={
              <div className="flex items-center justify-center w-full">
                <Equal size={18} />
              </div>
            }
            onClick={engine.handleEquals}
            variant="equals"
          />
        </div>
      </div>
    </div>
  );
};