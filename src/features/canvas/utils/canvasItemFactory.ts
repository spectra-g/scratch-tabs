import {
  DEFAULT_CODE_ITEM_HEIGHT,
  DEFAULT_CODE_ITEM_WIDTH,
  DEFAULT_TEXT_ITEM_HEIGHT,
  DEFAULT_TEXT_ITEM_WIDTH,
} from "../constants";
import { detectFormat, isAmbiguousFormat } from "../../../formats";
import type { CanvasCodeItem, CanvasTextItem } from "../types";

export interface CanvasPoint {
  x: number;
  y: number;
}

export const createTextCanvasItem = ({
  position,
  zIndex,
  text = "",
  now = Date.now(),
  id = crypto.randomUUID(),
}: {
  position: CanvasPoint;
  zIndex: number;
  text?: string;
  now?: number;
  id?: string;
}): CanvasTextItem => ({
  id,
  type: "text",
  x: position.x,
  y: position.y,
  width: DEFAULT_TEXT_ITEM_WIDTH,
  height: DEFAULT_TEXT_ITEM_HEIGHT,
  zIndex,
  createdAt: now,
  updatedAt: now,
  text,
});

export const getDetectedCanvasCodeLanguage = (
  source: string,
): Pick<CanvasCodeItem, "language" | "languageLocked"> => {
  if (!source.trim()) {
    return { language: "plaintext", languageLocked: false };
  }

  const language = detectFormat(source);
  return {
    language,
    languageLocked:
      language !== "plaintext" && !isAmbiguousFormat(source),
  };
};

export const createCodeCanvasItem = ({
  position,
  zIndex,
  source = "",
  language,
  languageLocked,
  now = Date.now(),
  id = crypto.randomUUID(),
}: {
  position: CanvasPoint;
  zIndex: number;
  source?: string;
  language?: string;
  languageLocked?: boolean;
  now?: number;
  id?: string;
}): CanvasCodeItem => {
  const detected = getDetectedCanvasCodeLanguage(source);

  return {
    id,
    type: "code",
    x: position.x,
    y: position.y,
    width: DEFAULT_CODE_ITEM_WIDTH,
    height: DEFAULT_CODE_ITEM_HEIGHT,
    zIndex,
    createdAt: now,
    updatedAt: now,
    source,
    language: language ?? detected.language,
    languageLocked: languageLocked ?? detected.languageLocked,
    collapsed: false,
    wrap: false,
  };
};
