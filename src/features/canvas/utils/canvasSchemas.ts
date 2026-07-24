import { CANVAS_SCHEMA_VERSION } from "../constants";
import type {
  CanvasBackground,
  CanvasDocument,
  CanvasEdge,
  CanvasItem,
  CanvasSessionRecord,
  CanvasSettings,
  CanvasViewport,
} from "../types";
import { canonicalizeCanvasUrl } from "./canvasUrl";
import { parseCanvasVideoUrl } from "./canvasVideoProviders";

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

const requireNonNegativeInteger = (
  record: Record<string, unknown>,
  key: string,
): number => {
  const value = requireNumber(record, key);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `Invalid Canvas schema: ${key} must be a non-negative integer`,
    );
  }
  return value;
};

const parseBackground = (value: unknown): CanvasBackground => {
  if (value === "dots" || value === "grid" || value === "none") return value;
  throw new Error("Invalid Canvas schema: unsupported background");
};

const parseOptionalString = (
  record: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`Invalid Canvas schema: ${key} must be a string`);
  }
  return value;
};

const requireBoolean = (
  record: Record<string, unknown>,
  key: string,
): boolean => {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error(`Invalid Canvas schema: ${key} must be a boolean`);
  }
  return value;
};

const parseCanvasItemBase = (value: Record<string, unknown>) => {
  const width = requireNumber(value, "width");
  const height = requireNumber(value, "height");
  if (width <= 0 || height <= 0) {
    throw new Error("Invalid Canvas schema: item dimensions must be positive");
  }

  const rotation = value.rotation;
  if (rotation !== undefined && !isFiniteNumber(rotation)) {
    throw new Error("Invalid Canvas schema: rotation must be a finite number");
  }

  return {
    id: requireString(value, "id"),
    x: requireNumber(value, "x"),
    y: requireNumber(value, "y"),
    width,
    height,
    zIndex: requireNumber(value, "zIndex"),
    ...(rotation === undefined ? {} : { rotation }),
    createdAt: requireNumber(value, "createdAt"),
    updatedAt: requireNumber(value, "updatedAt"),
  };
};

export const parseCanvasItem = (value: unknown): CanvasItem => {
  if (!isRecord(value)) {
    throw new Error("Invalid Canvas schema: item must be an object");
  }
  if (
    value.type !== "text" &&
    value.type !== "code" &&
    value.type !== "image" &&
    value.type !== "link" &&
    value.type !== "video"
  ) {
    throw new Error(
      `Invalid Canvas schema: unsupported item type ${String(value.type)}`,
    );
  }
  const base = parseCanvasItemBase(value);

  if (value.type === "text") {
    if (typeof value.text !== "string") {
      throw new Error("Invalid Canvas schema: text item text must be a string");
    }
    return {
      ...base,
      type: "text",
      text: value.text,
      ...(value.noteColor === undefined
        ? {}
        : { noteColor: parseOptionalString(value, "noteColor") }),
    };
  }

  if (value.type === "code") {
    if (typeof value.source !== "string") {
      throw new Error(
        "Invalid Canvas schema: code item source must be a string",
      );
    }
    const expandedHeight =
      value.expandedHeight === undefined
        ? undefined
        : requireNumber(value, "expandedHeight");
    if (expandedHeight !== undefined && expandedHeight <= 0) {
      throw new Error("Invalid Canvas schema: expandedHeight must be positive");
    }
    return {
      ...base,
      type: "code",
      source: value.source,
      language: requireString(value, "language"),
      languageLocked: requireBoolean(value, "languageLocked"),
      collapsed: requireBoolean(value, "collapsed"),
      ...(expandedHeight === undefined ? {} : { expandedHeight }),
      wrap: requireBoolean(value, "wrap"),
    };
  }

  if (value.type === "image") {
    const objectFit = value.objectFit;
    if (objectFit !== "contain" && objectFit !== "cover") {
      throw new Error("Invalid Canvas schema: unsupported image object fit");
    }
    if (typeof value.altText !== "string") {
      throw new Error("Invalid Canvas schema: image alt text must be a string");
    }
    return {
      ...base,
      type: "image",
      assetId: requireString(value, "assetId"),
      altText: value.altText,
      ...(value.originalName === undefined
        ? {}
        : { originalName: parseOptionalString(value, "originalName") }),
      objectFit,
    };
  }

  if (value.type === "link") {
    const canonicalUrl = requireString(value, "canonicalUrl");
    const parsed = canonicalizeCanvasUrl(canonicalUrl);
    const hostname = requireString(value, "hostname");
    if (
      !parsed ||
      parsed.canonicalUrl !== canonicalUrl ||
      parsed.hostname !== hostname
    ) {
      throw new Error("Invalid Canvas schema: link URL is not canonical");
    }
    const metadata = value.metadata;
    if (metadata !== undefined && !isRecord(metadata)) {
      throw new Error("Invalid Canvas schema: link metadata must be an object");
    }
    return {
      ...base,
      type: "link",
      canonicalUrl,
      hostname,
      ...(metadata
        ? {
            metadata: {
              ...(metadata.title === undefined
                ? {}
                : { title: parseOptionalString(metadata, "title") }),
              ...(metadata.description === undefined
                ? {}
                : {
                    description: parseOptionalString(metadata, "description"),
                  }),
              ...(metadata.siteName === undefined
                ? {}
                : { siteName: parseOptionalString(metadata, "siteName") }),
            },
          }
        : {}),
    };
  }

  if (value.type === "video") {
    const canonicalUrl = requireString(value, "canonicalUrl");
    const parsedUrl = canonicalizeCanvasUrl(canonicalUrl);
    const hostname = requireString(value, "hostname");
    const video = parseCanvasVideoUrl(canonicalUrl);
    if (
      !parsedUrl ||
      parsedUrl.canonicalUrl !== canonicalUrl ||
      parsedUrl.hostname !== hostname ||
      !video ||
      video.provider !== value.provider ||
      video.videoId !== value.videoId
    ) {
      throw new Error("Invalid Canvas schema: video provider data is invalid");
    }
    return {
      ...base,
      type: "video",
      canonicalUrl,
      hostname,
      provider: video.provider,
      videoId: video.videoId,
      ...(value.title === undefined
        ? {}
        : { title: parseOptionalString(value, "title") }),
    };
  }

  // The type guard above makes this branch unreachable.
  throw new Error("Invalid Canvas schema: unsupported item type");
};

const parseCanvasEdge = (value: unknown): CanvasEdge => {
  if (!isRecord(value)) {
    throw new Error("Invalid Canvas schema: edge must be an object");
  }
  return {
    id: requireString(value, "id"),
    sourceItemId: requireString(value, "sourceItemId"),
    targetItemId: requireString(value, "targetItemId"),
  };
};

const assertUniqueIds = (values: Array<{ id: string }>, label: string) => {
  const ids = new Set<string>();
  for (const value of values) {
    if (ids.has(value.id)) {
      throw new Error(
        `Invalid Canvas schema: duplicate ${label} id ${value.id}`,
      );
    }
    ids.add(value.id);
  }
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

  const schemaVersion = requireNonNegativeInteger(value, "schemaVersion");
  if (schemaVersion !== CANVAS_SCHEMA_VERSION) {
    throw new Error(`Unsupported Canvas schema version: ${schemaVersion}`);
  }
  if (!Array.isArray(value.items)) {
    throw new Error("Invalid Canvas schema: items must be an array");
  }
  if (!Array.isArray(value.edges)) {
    throw new Error("Invalid Canvas schema: edges must be an array");
  }
  if (!isRecord(value.settings)) {
    throw new Error("Invalid Canvas schema: settings must be an object");
  }

  const items = value.items.map(parseCanvasItem);
  const edges = value.edges.map(parseCanvasEdge);
  assertUniqueIds(items, "item");
  assertUniqueIds(edges, "edge");

  const itemIds = new Set(items.map((item) => item.id));
  for (const edge of edges) {
    if (!itemIds.has(edge.sourceItemId) || !itemIds.has(edge.targetItemId)) {
      throw new Error(
        `Invalid Canvas schema: edge ${edge.id} references a missing item`,
      );
    }
  }

  return {
    id: requireString(value, "id"),
    tabId: requireString(value, "tabId"),
    workspaceId: requireString(value, "workspaceId"),
    schemaVersion,
    revision: requireNonNegativeInteger(value, "revision"),
    items,
    edges,
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
    throw new Error(
      "Invalid Canvas schema: session and viewport must be objects",
    );
  }

  const zoom = requireNumber(value.viewport, "zoom");
  if (zoom <= 0) {
    throw new Error("Invalid Canvas schema: viewport zoom must be positive");
  }

  return {
    tabId: requireString(value, "tabId"),
    viewport: {
      x: requireNumber(value.viewport, "x"),
      y: requireNumber(value.viewport, "y"),
      zoom,
    },
    lastTool: requireString(value, "lastTool"),
    updatedAt: requireNumber(value, "updatedAt"),
  };
};
