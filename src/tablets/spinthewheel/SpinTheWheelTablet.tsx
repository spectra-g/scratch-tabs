import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, Eye, History as HistoryIcon, ListChecks, Settings as SettingsIcon, Volume2, VolumeX } from "lucide-react";
import type { Tablet, TabletState } from "../types";
import type { WheelSettings } from "./types";
import {
  coerceData,
  createDefaultData,
  type SpinTheWheelData,
  type SpinTheWheelState,
} from "./contentModel";
import { WheelCanvas } from "./components/WheelCanvas";
import { EntriesPanel } from "./components/EntriesPanel";
import { WinnerModal } from "./components/WinnerModal";
import { SidePanel, type SidePanelTab } from "./components/SidePanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { SnapshotsPanel } from "./components/SnapshotsPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { useSpin } from "./hooks/useSpin";
import { fireCelebrationConfetti } from "../../utils/confetti";
import { createTickPlayer } from "./utils/tickSound";
import { recordWinner } from "./utils/historyModel";
import { createSnapshot } from "./utils/snapshotModel";

interface SpinTheWheelUIProps {
  state: SpinTheWheelState;
  onChange: (state: SpinTheWheelState) => void;
}

const SpinTheWheelUI: React.FC<SpinTheWheelUIProps> = ({ state, onChange }) => {
  const { data } = state;
  const [winnerRevealed, setWinnerRevealed] = useState(false);

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

  const handleSpinEnd = useCallback(
    (winner: { id: string; label: string }) => {
      fireCelebrationConfetti();
      setWinnerRevealed(false);
      // Record the win and (optionally) drop the winner from the wheel in a
      // single state update so both land together.
      updateData({
        winnerHistory: recordWinner(data.winnerHistory, winner),
        ...(data.settings.removeWinnerAfterSpin
          ? { entries: data.entries.filter((entry) => entry.id !== winner.id) }
          : {}),
      });
    },
    [data.entries, data.winnerHistory, data.settings.removeWinnerAfterSpin, updateData],
  );

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

  const updateSettings = useCallback(
    (patch: Partial<WheelSettings>) => {
      updateData({ settings: { ...data.settings, ...patch } });
    },
    [data.settings, updateData],
  );

  const toggleSound = useCallback(() => {
    updateSettings({ soundEnabled: !data.settings.soundEnabled });
  }, [data.settings.soundEnabled, updateSettings]);

  const handleSaveSnapshot = useCallback(
    (name: string) => {
      updateData({
        snapshots: [...data.snapshots, createSnapshot(name, data.entries)],
      });
    },
    [data.entries, data.snapshots, updateData],
  );

  const handleRestoreSnapshot = useCallback(
    (id: string) => {
      const snapshot = data.snapshots.find((snap) => snap.id === id);
      if (snapshot) updateData({ entries: snapshot.entries.map((entry) => ({ ...entry })) });
    },
    [data.snapshots, updateData],
  );

  const handleDeleteSnapshot = useCallback(
    (id: string) => {
      updateData({ snapshots: data.snapshots.filter((snap) => snap.id !== id) });
    },
    [data.snapshots, updateData],
  );

  const canSpin = enabledEntries.length > 0 && phase !== "spinning";

  const hideWinner =
    phase === "result" && winner !== null && data.settings.hideWinnerUntilClick && !winnerRevealed;

  const tabs: SidePanelTab[] = [
    {
      id: "entries",
      label: "Names",
      icon: <ListChecks size={14} />,
      content: (
        <EntriesPanel entries={data.entries} onChange={(entries) => updateData({ entries })} />
      ),
    },
    {
      id: "history",
      label: "History",
      icon: <HistoryIcon size={14} />,
      content: (
        <HistoryPanel history={data.winnerHistory} onClear={() => updateData({ winnerHistory: [] })} />
      ),
    },
    {
      id: "snapshots",
      label: "Wheels",
      icon: <Camera size={14} />,
      content: (
        <SnapshotsPanel
          snapshots={data.snapshots}
          entryCount={data.entries.length}
          onSave={handleSaveSnapshot}
          onRestore={handleRestoreSnapshot}
          onDelete={handleDeleteSnapshot}
        />
      ),
    },
    {
      id: "settings",
      label: "Options",
      icon: <SettingsIcon size={14} />,
      content: <SettingsPanel settings={data.settings} onChange={updateSettings} />,
    },
  ];

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
            {hideWinner ? (
              <button
                onClick={() => setWinnerRevealed(true)}
                className="flex items-center gap-2 px-6 py-2.5 border border-base text-main hover:bg-element-hover font-bold uppercase tracking-wider rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Reveal winner"
              >
                <Eye size={18} />
                Reveal
              </button>
            ) : null}
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
          <SidePanel tabs={tabs} />
        </div>
      </div>
      <WinnerModal
        winnerLabel={
          phase === "result" && winner && !hideWinner ? winner.label : null
        }
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
