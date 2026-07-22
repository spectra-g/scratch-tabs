import { CANVAS_SCHEMA_VERSION } from "../constants";
import type {
  CanvasBackground,
  CanvasDocument,
  CanvasSessionRecord,
  CanvasSettings,
  CanvasViewport,
} from "../types";

const DEFAULT_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 };
const DEFAULT_SETTINGS: CanvasSettings = {
  background: "dots",
  snapToGrid: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const requireString = (
  record: Record<string, unknown>,
  key: string,
): string => {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid Canvas schema: ${key} must be a non-empty string`);
  }
  return value;
};

const requireNumber = (
  record: Record<string, unknown>,
  key: string,
): number => {
  const value = record[key];
  if (!isFiniteNumber(value)) {
    throw new Error(`Invalid Canvas schema: ${key} must be a finite number`);
  }
  return value;
};

const parseBackground = (value: unknown): CanvasBackground => {
  if (value === "dots" || value === "grid" || value === "none") return value;
  throw new Error("Invalid Canvas schema: unsupported background");
};

export const createEmptyCanvasDocument = ({
  id,
  tabId,
  workspaceId,
  now = Date.now(),
}: {
  id: string;
  tabId: string;
  workspaceId: string;
  now?: number;
}): CanvasDocument => ({
  id,
  tabId,
  workspaceId,
  schemaVersion: CANVAS_SCHEMA_VERSION,
  revision: 0,
  items: [],
  edges: [],
  settings: { ...DEFAULT_SETTINGS },
  searchText: "",
  createdAt: now,
  updatedAt: now,
});

export const createDefaultCanvasSession = (
  tabId: string,
  now = Date.now(),
): CanvasSessionRecord => ({
  tabId,
  viewport: { ...DEFAULT_VIEWPORT },
  lastTool: "select",
  updatedAt: now,
});

export const parseCanvasDocument = (value: unknown): CanvasDocument => {
  if (!isRecord(value)) {
    throw new Error("Invalid Canvas schema: document must be an object");
  }

  const schemaVersion = requireNumber(value, "schemaVersion");
  if (schemaVersion !== CANVAS_SCHEMA_VERSION) {
    throw new Error(`Unsupported Canvas schema version: ${schemaVersion}`);
  }
  if (!Array.isArray(value.items) || value.items.length !== 0) {
    throw new Error("Invalid Canvas schema: increment 1 documents must be empty");
  }
  if (!Array.isArray(value.edges) || value.edges.length !== 0) {
    throw new Error("Invalid Canvas schema: increment 1 documents cannot have edges");
  }
  if (!isRecord(value.settings)) {
    throw new Error("Invalid Canvas schema: settings must be an object");
  }

  return {
    id: requireString(value, "id"),
    tabId: requireString(value, "tabId"),
    workspaceId: requireString(value, "workspaceId"),
    schemaVersion,
    revision: requireNumber(value, "revision"),
    items: [],
    edges: [],
    settings: {
      background: parseBackground(value.settings.background),
      snapToGrid: value.settings.snapToGrid === true,
    },
    searchText: typeof value.searchText === "string" ? value.searchText : "",
    createdAt: requireNumber(value, "createdAt"),
    updatedAt: requireNumber(value, "updatedAt"),
  };
};
export const parseCanvasSession = (value: unknown): CanvasSessionRecord => {
  if (!isRecord(value) || !isRecord(value.viewport)) {
    throw new Error("Invalid Canvas schema: session and viewport must be objects");
  }

  return {
    tabId: requireString(value, "tabId"),
    viewport: {
      x: requireNumber(value.viewport, "x"),
      y: requireNumber(value.viewport, "y"),
      zoom: requireNumber(value.viewport, "zoom"),
    },
    lastTool: requireString(value, "lastTool"),
    updatedAt: requireNumber(value, "updatedAt"),
  };
};
