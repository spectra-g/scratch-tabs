import { useEffect } from "react";
import { CalculatorEngine } from "../useCalculatorEngine";

export const useKeyboardHandler = (engine: CalculatorEngine, tabletId: string) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const calculatorContainer = document.querySelector(
        `[data-calculator-id="${tabletId}"]`,
      );
      if (
        !calculatorContainer ||
        !calculatorContainer.contains(e.target as Node)
      )
        return;

      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        (activeElement as HTMLElement)?.contentEditable === "true"
      )
        return;

      const keyMap: Record<string, () => void> = {
        "0": () => engine.handleInput("0"),
        "1": () => engine.handleInput("1"),
        "2": () => engine.handleInput("2"),
        "3": () => engine.handleInput("3"),
        "4": () => engine.handleInput("4"),
        "5": () => engine.handleInput("5"),
        "6": () => engine.handleInput("6"),
        "7": () => engine.handleInput("7"),
        "8": () => engine.handleInput("8"),
        "9": () => engine.handleInput("9"),
        "+": () => engine.handleInput("+"),
        "-": () => engine.handleInput("-"),
        "*": () => engine.handleInput("*"),
        "/": () => engine.handleInput("/"),
        ".": () => engine.handleInput("."),
        "%": () => engine.handleInput("%"),
        "(": () => engine.handleInput("("),
        ")": () => engine.handleInput(")"),
        Enter: engine.handleEquals,
        "=": engine.handleEquals,
        Backspace: engine.handleBackspace,
        Delete: engine.handleClear,
        Escape: engine.handleClear,
      };
      if (keyMap[e.key]) {
        e.preventDefault();
        keyMap[e.key]();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [engine, tabletId]);
};