import {
  DEFAULT_CODE_ITEM_HEIGHT,
  DEFAULT_CODE_ITEM_WIDTH,
  DEFAULT_IMAGE_ITEM_MAX_HEIGHT,
  DEFAULT_IMAGE_ITEM_MAX_WIDTH,
  DEFAULT_LINK_ITEM_HEIGHT,
  DEFAULT_LINK_ITEM_WIDTH,
  MIN_IMAGE_ITEM_HEIGHT,
  MIN_IMAGE_ITEM_WIDTH,
  DEFAULT_TEXT_ITEM_HEIGHT,
  DEFAULT_TEXT_ITEM_WIDTH,
  DEFAULT_VIDEO_ITEM_HEIGHT,
  DEFAULT_VIDEO_ITEM_WIDTH,
} from "../constants";
import { detectFormat, isAmbiguousFormat } from "../../../formats";
import type {
  CanvasCodeItem,
  CanvasImageItem,
  CanvasLinkItem,
  CanvasTextItem,
  CanvasVideoItem,
} from "../types";
import type { CanvasVideoMatch } from "./canvasVideoProviders";
import type { CanonicalCanvasUrl } from "./canvasUrl";

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
    languageLocked: language !== "plaintext" && !isAmbiguousFormat(source),
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

const getImageCardDimensions = (width: number, height: number) => {
  const scaleDown = Math.min(
    1,
    DEFAULT_IMAGE_ITEM_MAX_WIDTH / width,
    DEFAULT_IMAGE_ITEM_MAX_HEIGHT / height,
  );
  let cardWidth = width * scaleDown;
  let cardHeight = height * scaleDown;
  const scaleUp = Math.max(
    1,
    MIN_IMAGE_ITEM_WIDTH / cardWidth,
    MIN_IMAGE_ITEM_HEIGHT / cardHeight,
  );
  cardWidth *= scaleUp;
  cardHeight *= scaleUp;
  return {
    width: Math.round(cardWidth),
    height: Math.round(cardHeight),
  };
};

export const createImageCanvasItem = ({
  position,
  zIndex,
  assetId,
  sourceWidth,
  sourceHeight,
  altText = "",
  now = Date.now(),
  id = crypto.randomUUID(),
}: {
  position: CanvasPoint;
  zIndex: number;
  assetId: string;
  sourceWidth: number;
  sourceHeight: number;
  altText?: string;
  now?: number;
  id?: string;
}): CanvasImageItem => ({
  id,
  type: "image",
  x: position.x,
  y: position.y,
  ...getImageCardDimensions(sourceWidth, sourceHeight),
  zIndex,
  createdAt: now,
  updatedAt: now,
  assetId,
  altText,
  objectFit: "contain",
});

export const createLinkCanvasItem = ({
  position,
  zIndex,
  canonicalUrl,
  hostname,
  now = Date.now(),
  id = crypto.randomUUID(),
}: {
  position: CanvasPoint;
  zIndex: number;
  canonicalUrl: string;
  hostname: string;
  now?: number;
  id?: string;
}): CanvasLinkItem => ({
  id,
  type: "link",
  x: position.x,
  y: position.y,
  width: DEFAULT_LINK_ITEM_WIDTH,
  height: DEFAULT_LINK_ITEM_HEIGHT,
  zIndex,
  createdAt: now,
  updatedAt: now,
  canonicalUrl,
  hostname,
});

export const createVideoCanvasItem = ({
  position,
  zIndex,
  url,
  video,
  now = Date.now(),
  id = crypto.randomUUID(),
}: {
  position: CanvasPoint;
  zIndex: number;
  url: CanonicalCanvasUrl;
  video: CanvasVideoMatch;
  now?: number;
  id?: string;
}): CanvasVideoItem => ({
  id,
  type: "video",
  x: position.x,
  y: position.y,
  width: DEFAULT_VIDEO_ITEM_WIDTH,
  height: DEFAULT_VIDEO_ITEM_HEIGHT,
  zIndex,
  createdAt: now,
  updatedAt: now,
  canonicalUrl: url.canonicalUrl,
  hostname: url.hostname,
  provider: video.provider,
  videoId: video.videoId,
});
