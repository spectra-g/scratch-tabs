import { CsvColumn } from "../types";

export type InferableColumnType = CsvColumn["type"];

export const DEFAULT_TYPE_INFERENCE_SAMPLE_SIZE = 1000;

const TYPE_CONFIDENCE_THRESHOLD = 0.9;

const BOOLEAN_PATTERN = /^(true|false)$/i;
const NUMBER_PATTERN = /^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/;

type ValueKind = InferableColumnType | "empty";

function classifyValue(value: string): ValueKind {
  const trimmed = value.trim();
  if (!trimmed) return "empty";
  if (BOOLEAN_PATTERN.test(trimmed)) return "boolean";
  if (NUMBER_PATTERN.test(trimmed)) return "number";
  if (!Number.isNaN(Date.parse(trimmed))) return "date";
  return "text";
}

export function inferColumnType(values: string[]): InferableColumnType {
  const counts: Record<Exclude<ValueKind, "empty">, number> = {
    boolean: 0,
    number: 0,
    date: 0,
    text: 0,
  };
  let total = 0;

  for (const value of values) {
    const kind = classifyValue(value);
    if (kind === "empty") continue;
    counts[kind] += 1;
    total += 1;
  }

  if (total === 0) return "text";
  if (counts.boolean / total >= TYPE_CONFIDENCE_THRESHOLD) return "boolean";
  if (counts.number / total >= TYPE_CONFIDENCE_THRESHOLD) return "number";
  if (counts.date / total >= TYPE_CONFIDENCE_THRESHOLD) return "date";
  return "text";
}

export function inferColumnTypes(
  rows: string[][],
  sampleSize: number = DEFAULT_TYPE_INFERENCE_SAMPLE_SIZE,
): InferableColumnType[] {
  const size =
    Number.isFinite(sampleSize) && sampleSize > 0
      ? sampleSize
      : DEFAULT_TYPE_INFERENCE_SAMPLE_SIZE;
  const sampledRows = rows.slice(0, size);

  let columnCount = 0;
  for (const row of sampledRows) {
    columnCount = Math.max(columnCount, row.length);
  }

  const columns: string[][] = Array.from({ length: columnCount }, () => []);
  for (const row of sampledRows) {
    row.forEach((cell, index) => columns[index].push(cell));
  }

  return columns.map((values) => inferColumnType(values));
}
