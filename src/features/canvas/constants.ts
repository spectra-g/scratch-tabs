export const CANVAS_SCHEMA_VERSION = 1;
export const MIN_CANVAS_PANE_WIDTH = 640;
export const CANVAS_FEATURE_SETTING_KEY = "features.canvas.enabled";
export const CANVAS_DOCUMENT_SAVE_DEBOUNCE_MS = 500;
export const CANVAS_TAB_MODIFIED_THROTTLE_MS = 2000;
export const DEFAULT_TEXT_ITEM_WIDTH = 280;
export const DEFAULT_TEXT_ITEM_HEIGHT = 180;
export const MIN_TEXT_ITEM_WIDTH = 180;
export const MIN_TEXT_ITEM_HEIGHT = 120;
export const DEFAULT_CODE_ITEM_WIDTH = 480;
export const DEFAULT_CODE_ITEM_HEIGHT = 320;
export const MIN_CODE_ITEM_WIDTH = 280;
export const MIN_CODE_ITEM_HEIGHT = 160;
export const DEFAULT_IMAGE_ITEM_MAX_WIDTH = 480;
export const DEFAULT_IMAGE_ITEM_MAX_HEIGHT = 360;
export const MIN_IMAGE_ITEM_WIDTH = 160;
export const MIN_IMAGE_ITEM_HEIGHT = 120;
export const CANVAS_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const CANVAS_IMAGE_MAX_DIMENSION = 16_384;
export const CANVAS_IMAGE_MAX_PIXELS = 40_000_000;
export const CANVAS_IMAGE_QUOTA_RESERVE_BYTES = 5 * 1024 * 1024;
export const CANVAS_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/svg+xml",
] as const;
export const COLLAPSED_CODE_ITEM_HEIGHT = 40;
export const COPY_FEEDBACK_DURATION_MS = 2000;
export const CODE_PREVIEW_MAX_CHARACTERS = 12_000;
export const CODE_PREVIEW_MAX_LINES = 120;
export const CANVAS_DUPLICATE_OFFSET = 32;
export const CANVAS_HISTORY_LIMIT = 100;
export const CANVAS_NUDGE_GRID_SIZE = 10;
export const CANVAS_NUDGE_LARGE_MULTIPLIER = 10;
