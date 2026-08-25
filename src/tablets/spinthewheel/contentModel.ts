import type {
  SpinTheWheelData,
  WheelEntry,
  WinnerHistoryItem,
  WheelSnapshot,
  WheelSettings,
} from "./types";

export const SPIN_DURATION_PRESETS = Object.freeze([
  Object.freeze({ id: "fast", label: "Fast", ms: 2500 }),
  Object.freeze({ id: "normal", label: "Normal", ms: 5000 }),
  Object.freeze({ id: "slow", label: "Slow", ms: 8000 }),
] as const);

export type SpinDurationPresetId = (typeof SPIN_DURATION_PRESETS)[number]["id"];

export const DEFAULT_SETTINGS: Readonly<WheelSettings> = Object.freeze({
  soundEnabled: true,
  spinDurationMs: 5000,
  removeWinnerAfterSpin: false,
  hideWinnerUntilClick: false,
});

const DEFAULT_ENTRY_LABELS = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona"];

export function createEntryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Parses free-form text into entries — one name per line, blanks ignored.
 *  When `previous` is given, entries keep their id/color/weight/enabled
 *  attributes if a line with the same (trimmed, case-sensitive) label exists. */
export function parseEntriesText(text: string, previous?: WheelEntry[]): WheelEntry[] {
  const byLabel = previous
    ? new Map(previous.map((entry) => [entry.label.trim(), entry]))
    : undefined;
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((label) => label.length > 0)
    .map((label) => {
      const carried = byLabel?.get(label);
      return {
        id: carried?.id ?? createEntryId(),
        label,
        color: carried?.color,
        weight: carried?.weight,
        enabled: carried?.enabled ?? true,
      };
    });
}

export function entriesToText(entries: WheelEntry[]): string {
  return entries.map((entry) => entry.label).join("\n");
}

function defaultEntries(): WheelEntry[] {
  return parseEntriesText(DEFAULT_ENTRY_LABELS.join("\n"));
}

export function createDefaultData(payload?: {
  content?: string;
  title?: string;
}): SpinTheWheelData {
  const content = payload?.content?.trim();
  return {
    entries: content ? parseEntriesText(content) : defaultEntries(),
    title: payload?.title ?? "",
    winnerHistory: [],
    snapshots: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function coerceEntry(raw: unknown): WheelEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const label = typeof record.label === "string" ? record.label.trim() : "";
  if (!label) return null;
  return {
    id: typeof record.id === "string" && record.id ? record.id : createEntryId(),
    label,
    color: typeof record.color === "string" && record.color ? record.color : undefined,
    weight:
      typeof record.weight === "number" && Number.isFinite(record.weight) && record.weight > 0
        ? record.weight
        : undefined,
    enabled: record.enabled !== false,
  };
}

function coerceArray<T>(raw: unknown, coerceItem: (item: unknown) => T | null): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(coerceItem).filter((item): item is T => item !== null);
}

export function coerceSettings(raw: unknown): WheelSettings {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const duration = typeof input.spinDurationMs === "number" ? input.spinDurationMs : NaN;
  return {
    soundEnabled: input.soundEnabled === undefined ? DEFAULT_SETTINGS.soundEnabled : input.soundEnabled === true,
    spinDurationMs: Number.isFinite(duration)
      ? nearestDurationPreset(duration).ms
      : DEFAULT_SETTINGS.spinDurationMs,
    removeWinnerAfterSpin:
      input.removeWinnerAfterSpin === undefined
        ? DEFAULT_SETTINGS.removeWinnerAfterSpin
        : input.removeWinnerAfterSpin === true,
    hideWinnerUntilClick:
      input.hideWinnerUntilClick === undefined
        ? DEFAULT_SETTINGS.hideWinnerUntilClick
        : input.hideWinnerUntilClick === true,
  };
}

function nearestDurationPreset(ms: number): (typeof SPIN_DURATION_PRESETS)[number] {
  return SPIN_DURATION_PRESETS.reduce((best, preset) =>
    Math.abs(preset.ms - ms) < Math.abs(best.ms - ms) ? preset : best,
  );
}

export function coerceData(raw: unknown): SpinTheWheelData {
  if (!raw || typeof raw !== "object") return createDefaultData();
  const input = raw as Record<string, unknown>;
  return {
    entries: coerceArray(input.entries, coerceEntry),
    title: typeof input.title === "string" ? input.title : "",
    winnerHistory: coerceArray(input.winnerHistory, (item): WinnerHistoryItem | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      if (typeof record.label !== "string" || !record.label) return null;
      return {
        id: typeof record.id === "string" && record.id ? record.id : createEntryId(),
        entryId: typeof record.entryId === "string" ? record.entryId : null,
        label: record.label,
        timestamp: typeof record.timestamp === "number" ? record.timestamp : Date.now(),
      };
    }),
    snapshots: coerceArray(input.snapshots, (item): WheelSnapshot | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      if (typeof record.name !== "string" || !record.name) return null;
      const entries = Array.isArray(record.entries)
        ? record.entries.map(coerceEntry).filter((e): e is WheelEntry => e !== null)
        : [];
      return {
        id: typeof record.id === "string" && record.id ? record.id : createEntryId(),
        name: record.name,
        createdAt: typeof record.createdAt === "number" ? record.createdAt : Date.now(),
        entries,
      };
    }),
    settings: coerceSettings(input.settings),
  };
}
