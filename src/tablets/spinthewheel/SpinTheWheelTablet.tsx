import React, { useCallback, useEffect, useMemo } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { Tablet, TabletState } from "../types";
import {
  coerceData,
  createDefaultData,
  type SpinTheWheelData,
  type SpinTheWheelState,
} from "./contentModel";
import { WheelCanvas } from "./components/WheelCanvas";
import { EntriesPanel } from "./components/EntriesPanel";
import { WinnerModal } from "./components/WinnerModal";
import { useSpin } from "./hooks/useSpin";
import { fireCelebrationConfetti } from "../../utils/confetti";
import { createTickPlayer } from "./utils/tickSound";

interface SpinTheWheelUIProps {
  state: SpinTheWheelState;
  onChange: (state: SpinTheWheelState) => void;
}

const SpinTheWheelUI: React.FC<SpinTheWheelUIProps> = ({ state, onChange }) => {
  const { data } = state;

  const updateData = useCallback(
    (patch: Partial<SpinTheWheelData>) => {
      onChange({ ...state, data: { ...state.data, ...patch } });
    },
    [onChange, state],
  );

  const enabledEntries = useMemo(
    () => data.entries.filter((entry) => entry.enabled),
    [data.entries],
  );

  const tickPlayer = useMemo(() => createTickPlayer(), []);
  useEffect(() => () => tickPlayer.dispose(), [tickPlayer]);

  const handleTick = useCallback(() => {
    if (state.data.settings.soundEnabled) tickPlayer.play();
  }, [state.data.settings.soundEnabled, tickPlayer]);

  const handleSpinEnd = useCallback(() => {
    fireCelebrationConfetti();
  }, []);

  const { phase, rotationDeg, winner, spin, reset } = useSpin({
    entries: enabledEntries,
    durationMs: data.settings.spinDurationMs,
    onSpinEnd: handleSpinEnd,
    onTick: handleTick,
  });

  const handleRemoveWinnerAndSpin = useCallback(() => {
    if (!winner) return;
    const remaining = data.entries.filter((entry) => entry.id !== winner.id);
    updateData({ entries: remaining });
    reset();
    spin(remaining.filter((entry) => entry.enabled));
  }, [winner, data.entries, updateData, reset, spin]);

  const handleSpinAgain = useCallback(() => {
    reset();
    spin();
  }, [reset, spin]);

  const toggleSound = useCallback(() => {
    updateData({ settings: { ...data.settings, soundEnabled: !data.settings.soundEnabled } });
  }, [data.settings, updateData]);

  const canSpin = enabledEntries.length > 0 && phase !== "spinning";

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
        <div className="w-[60%] p-6 min-h-0 min-w-0 flex flex-col items-center gap-4">
          <div
            className="flex-1 w-full min-h-0"
            style={{ maxWidth: "min(100%, calc(100vh - 220px))" }}
          >
            <WheelCanvas
              entries={enabledEntries}
              rotationDeg={rotationDeg}
              spinning={phase === "spinning"}
              onSpin={canSpin ? () => spin() : undefined}
            />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => spin()}
              disabled={!canSpin}
              className="px-10 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-contrast font-bold uppercase tracking-wider rounded-full shadow transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-canvas"
            >
              {phase === "spinning" ? "Spinning…" : "Spin"}
            </button>
            <button
              onClick={toggleSound}
              className="p-2 text-secondary hover:text-main hover:bg-element-hover rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={data.settings.soundEnabled ? "Mute spin sounds" : "Unmute spin sounds"}
              title={data.settings.soundEnabled ? "Mute" : "Unmute"}
            >
              {data.settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 border-l border-base/30">
          <EntriesPanel
            entries={data.entries}
            onChange={(entries) => updateData({ entries })}
          />
        </div>
      </div>
      <WinnerModal
        winnerLabel={phase === "result" && winner ? winner.label : null}
        onRemoveAndSpin={handleRemoveWinnerAndSpin}
        onSpinAgain={handleSpinAgain}
        onClose={reset}
      />
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
