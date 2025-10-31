import React from "react";
import { Equal, Binary } from "lucide-react";
import { CalculatorButton } from "./CalculatorButton";
import { CalculatorEngine } from "../useCalculatorEngine";
import { LiveBaseConverter } from "./LiveBaseConverter";

interface ProgrammerKeypadProps {
  engine: CalculatorEngine;
}

export const ProgrammerKeypad: React.FC<ProgrammerKeypadProps> = ({ engine }) => {
  const { data } = engine;

  return (
    <div className="flex flex-col gap-3">
      {/* Live Base Converter */}
      <LiveBaseConverter expression={data.expression} currentBase={data.base} />

      {/* Keypad */}
      <div className="grid grid-cols-5 gap-2 flex-grow text-sm">
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