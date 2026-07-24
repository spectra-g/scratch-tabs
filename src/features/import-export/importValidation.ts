import type { SplitViewState, Tab, Workspace } from "../../types";
import type { ExportData } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireString = (
  record: Record<string, unknown>,
  field: string,
): string => {
  const value = record[field];
  if (typeof value !== "string" || !value) {
    throw new Error(`Workspace data has an invalid ${field}.`);
  }
  return value;
};

const requireFiniteNumber = (
  record: Record<string, unknown>,
  field: string,
): number => {
  const value = record[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Workspace data has an invalid ${field}.`);
  }
  return value;
};

const requireBoolean = (
  record: Record<string, unknown>,
  field: string,
): boolean => {
  const value = record[field];
  if (typeof value !== "boolean") {
    throw new Error(`Workspace data has an invalid ${field}.`);
  }
  return value;
};

const requireStringArray = (
  record: Record<string, unknown>,
  field: string,
): string[] => {
  const value = record[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Workspace data has an invalid ${field}.`);
  }
  return [...value];
};

const parseWorkspace = (value: unknown): Workspace => {
  if (!isRecord(value) || !Array.isArray(value.links)) {
    throw new Error("Workspace data contains an invalid workspace.");
  }
  const links = value.links.map((link) => {
    if (!isRecord(link)) {
      throw new Error("Workspace data contains an invalid workspace link.");
    }
    return {
      id: requireString(link, "id"),
      url: requireString(link, "url"),
      ...(typeof link.title === "string" ? { title: link.title } : {}),
    };
  });
  return {
    id: requireString(value, "id"),
    name: requireString(value, "name"),
    ...(typeof value.notes === "string" ? { notes: value.notes } : {}),
    links,
    createdAt: requireFiniteNumber(value, "createdAt"),
    lastAccessed: requireFiniteNumber(value, "lastAccessed"),
    ...(typeof value.displayOrder === "number" &&
    Number.isFinite(value.displayOrder)
      ? { displayOrder: value.displayOrder }
      : {}),
  };
};

const parseTab = (value: unknown): Tab => {
  if (!isRecord(value)) {
    throw new Error("Workspace data contains an invalid tab.");
  }
  if (
    value.contentKind !== undefined &&
    value.contentKind !== "text" &&
    value.contentKind !== "rich-text" &&
    value.contentKind !== "tablet" &&
    value.contentKind !== "canvas"
  ) {
    throw new Error("Workspace data contains an unsupported tab content kind.");
  }
  if (
    value.contentKind === "canvas" &&
    (typeof value.documentId !== "string" || !value.documentId)
  ) {
    throw new Error("A Canvas tab is missing its document ID.");
  }
  if (
    value.richContent !== undefined &&
    value.richContent !== null &&
    (!isRecord(value.richContent) ||
      value.richContent.type !== "doc" ||
      !Array.isArray(value.richContent.content))
  ) {
    throw new Error("Workspace data contains invalid rich text content.");
  }
  const cursor = isRecord(value.cursorPosition)
    ? {
        lineNumber: requireFiniteNumber(value.cursorPosition, "lineNumber"),
        column: requireFiniteNumber(value.cursorPosition, "column"),
      }
    : { lineNumber: 1, column: 1 };
  return {
    id: requireString(value, "id"),
    title: requireString(value, "title"),
    ...(typeof value.content === "string" ? { content: value.content } : {}),
    ...(value.richContent === undefined || value.richContent === null
      ? {}
      : { richContent: value.richContent as Tab["richContent"] }),
    language: requireString(value, "language"),
    languageLocked: requireBoolean(value, "languageLocked"),
    ...(typeof value.isTablet === "boolean"
      ? { isTablet: value.isTablet }
      : {}),
    ...(typeof value.tabletState === "string"
      ? { tabletState: value.tabletState }
      : {}),
    ...(typeof value.isRich === "boolean" ? { isRich: value.isRich } : {}),
    ...(value.contentKind ? { contentKind: value.contentKind } : {}),
    ...(typeof value.documentId === "string"
      ? { documentId: value.documentId }
      : {}),
    cursorPosition: cursor,
    ...(typeof value.isPinned === "boolean"
      ? { isPinned: value.isPinned }
      : {}),
    dateCreated: requireFiniteNumber(value, "dateCreated"),
    lastModified: requireFiniteNumber(value, "lastModified"),
    ...(typeof value.lastAccessed === "number" &&
    Number.isFinite(value.lastAccessed)
      ? { lastAccessed: value.lastAccessed }
      : {}),
    workspaceId: requireString(value, "workspaceId"),
    ...(value.activeViewId === null || typeof value.activeViewId === "string"
      ? { activeViewId: value.activeViewId }
      : {}),
    ...(typeof value.previewMode === "boolean"
      ? { previewMode: value.previewMode }
      : {}),
    ...(typeof value.fontSize === "number" && Number.isFinite(value.fontSize)
      ? { fontSize: value.fontSize }
      : {}),
    ...(typeof value.smartViewIndicatorDismissed === "boolean"
      ? {
          smartViewIndicatorDismissed: value.smartViewIndicatorDismissed,
        }
      : {}),
  };
};

const parseSplitView = (value: unknown): SplitViewState => {
  if (!isRecord(value)) {
    throw new Error("Workspace data contains an invalid split view.");
  }
  const nullableTabId = (field: string): string | null => {
    const candidate = value[field];
    if (candidate === null || candidate === undefined) return null;
    if (typeof candidate !== "string") {
      throw new Error(`Workspace data has an invalid ${field}.`);
    }
    return candidate;
  };
  if (
    value.activeSide !== null &&
    value.activeSide !== undefined &&
    value.activeSide !== "left" &&
    value.activeSide !== "right"
  ) {
    throw new Error("Workspace data has an invalid activeSide.");
  }
  return {
    id: requireString(value, "id"),
    isSplit: requireBoolean(value, "isSplit"),
    leftTabs: requireStringArray(value, "leftTabs"),
    rightTabs: requireStringArray(value, "rightTabs"),
    activeLeftTabId: nullableTabId("activeLeftTabId"),
    activeRightTabId: nullableTabId("activeRightTabId"),
    activeSide:
      value.activeSide === "left" || value.activeSide === "right"
        ? value.activeSide
        : null,
    splitRatio: requireFiniteNumber(value, "splitRatio"),
    leftTabHistory: Array.isArray(value.leftTabHistory)
      ? requireStringArray(value, "leftTabHistory")
      : [],
    rightTabHistory: Array.isArray(value.rightTabHistory)
      ? requireStringArray(value, "rightTabHistory")
      : [],
    workspaceId: requireString(value, "workspaceId"),
    ...(typeof value.leftScrollPosition === "number"
      ? { leftScrollPosition: value.leftScrollPosition }
      : {}),
    ...(typeof value.rightScrollPosition === "number"
      ? { rightScrollPosition: value.rightScrollPosition }
      : {}),
  };
};

const assertUnique = (ids: readonly string[], label: string): void => {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Workspace data contains duplicate ${label} IDs.`);
  }
};

export const parseExportData = (value: unknown): ExportData => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.workspaces) ||
    !Array.isArray(value.tabs) ||
    !Array.isArray(value.splitViews)
  ) {
    throw new Error("The archive workspace data is invalid.");
  }
  const workspaces = value.workspaces.map(parseWorkspace);
  const tabs = value.tabs.map(parseTab);
  const splitViews = value.splitViews.map(parseSplitView);
  assertUnique(
    workspaces.map((workspace) => workspace.id),
    "workspace",
  );
  assertUnique(
    tabs.map((tab) => tab.id),
    "tab",
  );
  assertUnique(
    splitViews.map((splitView) => splitView.id),
    "split view",
  );
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  tabs.forEach((tab) => {
    if (!workspaceIds.has(tab.workspaceId)) {
      throw new Error(`Tab ${tab.id} references a missing workspace.`);
    }
  });
  splitViews.forEach((splitView) => {
    if (!workspaceIds.has(splitView.workspaceId)) {
      throw new Error(
        `Split view ${splitView.id} references a missing workspace.`,
      );
    }
  });
  return { workspaces, tabs, splitViews };
};
