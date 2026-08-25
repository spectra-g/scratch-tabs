import type { RotaConfig, RotaSlot } from "../types";

export const ROTA_ORDERS = Object.freeze([
  Object.freeze({ id: "cycle", label: "Cycle" }),
  Object.freeze({ id: "shuffle", label: "Shuffle" }),
] as const);

export const ROTA_FREQUENCIES = Object.freeze([
  Object.freeze({ id: "daily", label: "Daily" }),
  Object.freeze({ id: "weekly", label: "Weekly" }),
] as const);

export const ROTA_PERIOD_OPTIONS = Object.freeze([4, 8, 12] as const);

export function toIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const d = `${date.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses a yyyy-mm-dd string into a UTC-midnight date; falls back to today. */
function parseIsoDate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return parseIsoDate(toIsoDate(new Date()));
  return new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** Moves a date forward until it lands on a weekday (no-op unless skipping). */
function skipForwardFromWeekend(date: Date, skipWeekends: boolean): Date {
  if (!skipWeekends) return date;
  while (isWeekend(date)) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Builds the name sequence — cycled order, or shuffle seeded by the names and
 *  config so output stays stable until something actually changes. */
function buildSequence(names: string[], config: RotaConfig, slotsNeeded: number): string[] {
  if (config.order === "cycle") {
    const sequence: string[] = [];
    while (sequence.length < slotsNeeded) sequence.push(...names);
    return sequence.slice(0, slotsNeeded);
  }
  const random = mulberry32(
    (hashString(names.join("\u0000")) ^ hashString(config.frequency) ^ config.seed) >>> 0,
  );
  const sequence: string[] = [];
  while (sequence.length < slotsNeeded) {
    const pool = [...names];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    sequence.push(...pool);
  }
  return sequence.slice(0, slotsNeeded);
}

/** Generates one slot per period: a change date plus the assigned name.
 *  With "skip weekends", changes landing on Sat/Sun roll to the next Monday. */
export function generateRota(names: string[], config: RotaConfig): RotaSlot[] {
  const cleanNames = names.map((name) => name.trim()).filter(Boolean);
  if (cleanNames.length === 0 || config.periods <= 0) return [];

  const start = skipForwardFromWeekend(parseIsoDate(config.startDate), config.skipWeekends);
  const stepDays = config.frequency === "weekly" ? 7 : 1;

  const dates: Date[] = [];
  let cursor = new Date(start);
  for (let i = 0; i < config.periods; i += 1) {
    dates.push(new Date(cursor));
    cursor = skipForwardFromWeekend(
      new Date(cursor.setUTCDate(cursor.getUTCDate() + stepDays)),
      config.skipWeekends,
    );
  }

  const sequence = buildSequence(cleanNames, config, config.periods);
  return dates.map((date, i) => ({ date: toIsoDate(date), name: sequence[i] }));
}

/** One "date name" line per slot, ready for the clipboard. */
export function rotaToText(slots: RotaSlot[]): string {
  return slots.map((slot) => `${slot.date} ${slot.name}`).join("\n");
}
