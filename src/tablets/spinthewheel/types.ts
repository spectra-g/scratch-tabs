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

export interface SpinTheWheelData {
  entries: WheelEntry[];
  title: string;
  winnerHistory: WinnerHistoryItem[];
  snapshots: WheelSnapshot[];
  settings: WheelSettings;
}

export interface SpinTheWheelState extends TabletState {
  type: "spinthewheel";
  data: SpinTheWheelData;
}
