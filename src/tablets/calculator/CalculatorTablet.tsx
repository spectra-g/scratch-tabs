import React from "react";
import { Tablet, TabletState } from "../types";
import {
  CalculatorData,
  useCalculatorEngine,
} from "./useCalculatorEngine";
import { CalculatorUI } from "./CalculatorUI";

interface CalculatorTabletState extends TabletState {
  type: "calculator";
  data: CalculatorData;
}

const CalculatorTabletUIWrapper: React.FC<{
  state: CalculatorTabletState;
  onChange: (state: CalculatorTabletState) => void;
}> = React.memo(({ state, onChange }) => {
  const tabletInstanceIdRef = React.useRef(`calculator-${crypto.randomUUID()}`);
  const engine = useCalculatorEngine(state.data, (newData) =>
    onChange({ ...state, data: newData }),
  );

  return (
    <CalculatorUI engine={engine} tabletId={tabletInstanceIdRef.current} />
  );
});

export const CalculatorTablet: Tablet = {
  id: "calculator",
  label: "Calculator",
  keywords: [
    "calculator",
    "math",
    "compute",
    "numbers",
    "scientific",
    "programmer",
    "developer",
  ],

  createInitialState(): CalculatorTabletState {
    return {
      type: "calculator",
      data: {
        mode: "standard",
        expression: "0",
        display: "0",
        history: [],
        notes: "",
        base: "DEC",
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    const defaultState = this.createInitialState();
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === "calculator" && parsed.data) {
        // Merge with defaults to ensure all fields are present
        const data = { ...defaultState.data, ...parsed.data };
        return { type: "calculator", data };
      }
    } catch (e) {
      console.error("Failed to deserialize calculator state:", e);
    }
    return defaultState;
  },

  render(state: TabletState, onChange: (state: TabletState) => void) {
    const calculatorState = state as CalculatorTabletState;
    return (
      <CalculatorTabletUIWrapper
        state={calculatorState}
        onChange={onChange as (newState: CalculatorTabletState) => void}
      />
    );
  },
};
