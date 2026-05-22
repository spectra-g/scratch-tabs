import { TabletState } from "../types";
import { EditEntry } from "./utils/editHistory";

export type InputFormat = "hex" | "base64" | "raw" | "file";
export type Endianness = "le" | "be";
export type SidebarTab = "inspector" | "strings" | "histogram" | "checksums";

export interface HexFileInfo {
  name: string;
  size: number;
  type: string;
}

export interface DetectedFileType {
  type: string;
  mime: string;
  extension: string;
}

export interface HexViewerData {
  inputFormat: InputFormat;
  inputText: string;
  bytesHex: string; // Packed hex string representing the binary data
  fileInfo: HexFileInfo | null;
  detectedFileType: DetectedFileType | null;

  // Grid display settings
  bytesPerRow: number; // 8, 16, 24, 32
  pageSize: number; // 256, 512, 1024, 2048, or similar
  currentPage: number;

  // Selection
  selectedOffset: number | null;
  selectionStart: number | null;
  selectionEnd: number | null;
  hoveredOffset: number | null;

  // Search & Replace
  searchQuery: string;
  searchType: "hex" | "text";
  searchMatches: number[];
  currentSearchMatchIndex: number;
  replaceQuery: string;

  // Inspector
  endianness: Endianness;
  activeSidebarTab: SidebarTab;

  // Edit history for undo/redo
  editHistory: EditEntry[];
  editHistoryIndex: number;
}

export interface HexViewerTabletState extends TabletState {
  type: "hexviewer";
  data: HexViewerData;
}
