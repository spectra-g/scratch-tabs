import React from "react";
import type { Tablet, TabletState } from "../types";
import {
  coerceData,
  createDefaultData,
  type SpinTheWheelData,
  type SpinTheWheelState,
} from "./contentModel";
import { WheelCanvas } from "./components/WheelCanvas";
import { EntriesPanel } from "./components/EntriesPanel";

interface SpinTheWheelUIProps {
  state: SpinTheWheelState;
  onChange: (state: SpinTheWheelState) => void;
}

const SpinTheWheelUI: React.FC<SpinTheWheelUIProps> = ({ state, onChange }) => {
  const { data } = state;

  const updateData = (patch: Partial<SpinTheWheelData>) => {
    onChange({ ...state, data: { ...data, ...patch } });
  };

  const wheelEntries = data.entries.filter((entry) => entry.enabled);

  return (
    <div className="h-full flex flex-col bg-canvas text-main">
      <div className="flex-shrink-0 px-4 pt-3">
        <input
          type="text"
          value={data.title}
          onChange={(e) => updateData({ title: e.target.value })}
          placeholder="Untitled wheel"
          aria-label="Wheel title"
          className="w-full px-3 py-1.5 text-sm font-medium bg-surface border border-base/50 rounded text-main placeholder-muted/50 focus:outline-none focus:border-primary/50 text-center"
        />
      </div>
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="w-[60%] p-6 min-h-0 min-w-0">
          <WheelCanvas entries={wheelEntries} />
        </div>
        <div className="flex-1 min-h-0 border-l border-base/30">
          <EntriesPanel
            entries={data.entries}
            onChange={(entries) => updateData({ entries })}
          />
        </div>
      </div>
    </div>
  );
};

function createInitialState(payload?: {
  content?: string;
  title?: string;
}): SpinTheWheelState {
  return { type: "spinthewheel", data: createDefaultData(payload) };
}

export default {
  id: "spinthewheel",
  label: "Spin the Wheel",
  keywords: [
    "wheel",
    "spin",
    "random",
    "picker",
    "names",
    "raffle",
    "roulette",
    "lottery",
    "prize",
    "decision",
  ],
  description:
    "Colourful spinning wheel for random picks, raffles, and decisions — with history, snapshots, sharing, and confetti.",

  createInitialState,

  serializeState: (state: TabletState) => JSON.stringify(state),

  deserializeState: (json: string): SpinTheWheelState => {
    try {
      const parsed = JSON.parse(json);
      if (parsed && parsed.type === "spinthewheel") {
        return { type: "spinthewheel", data: coerceData(parsed.data) };
      }
    } catch {
      // fall through to default
    }
    return createInitialState();
  },

  render: (state: TabletState, onChange: (s: TabletState) => void) =>
    React.createElement(SpinTheWheelUI, {
      state: state as SpinTheWheelState,
      onChange: onChange as (s: SpinTheWheelState) => void,
    }),
} satisfies Tablet;
