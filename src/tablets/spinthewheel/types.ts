import type { TabletState } from "../types";

export interface WheelEntry {
  id: string;
  label: string;
  color?: string;
  weight?: number;
  enabled: boolean;
}

export interface WinnerHistoryItem {
  id: string;
  entryId: string | null;
  label: string;
  timestamp: number;
}

export interface WheelSnapshot {
  id: string;
  name: string;
  createdAt: number;
  entries: WheelEntry[];
}

export interface WheelSettings {
  soundEnabled: boolean;
  spinDurationMs: number;
  removeWinnerAfterSpin: boolean;
  hideWinnerUntilClick: boolean;
}

export type RotaOrder = "cycle" | "shuffle";
export type RotaFrequency = "daily" | "weekly";

/** Config for the generated rota (who is on duty for each period). */
export interface RotaConfig {
  order: RotaOrder;
  frequency: RotaFrequency;
  skipWeekends: boolean;
  /** ISO date (yyyy-mm-dd) the rota starts from. */
  startDate: string;
  periods: number;
  seed: number;
}

export interface RotaSlot {
  /** ISO date (yyyy-mm-dd) of the change. */
  date: string;
  name: string;
}

export interface SpinTheWheelData {
  entries: WheelEntry[];
  title: string;
  winnerHistory: WinnerHistoryItem[];
  snapshots: WheelSnapshot[];
  settings: WheelSettings;
  rota: RotaConfig;
}

export interface SpinTheWheelState extends TabletState {
  type: "spinthewheel";
  data: SpinTheWheelData;
}
