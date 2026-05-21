import { TabletState } from "../types";

export type InputFormat = "hex" | "base64" | "raw" | "file";
export type Endianness = "le" | "be";

export interface HexFileInfo {
  name: string;
  size: number;
  type: string;
}

export interface HexViewerData {
  inputFormat: InputFormat;
  inputText: string;
  bytesHex: string; // Packed hex string representing the binary data
  fileInfo: HexFileInfo | null;
  
  // Grid display settings
  bytesPerRow: number; // 8, 16, 24, 32
  pageSize: number; // 256, 512, 1024, 2048, or similar
  currentPage: number;
  
  // Selection
  selectedOffset: number | null;
  selectionStart: number | null;
  selectionEnd: number | null;
  hoveredOffset: number | null;
  
  // Search
  searchQuery: string;
  searchType: "hex" | "text";
  searchMatches: number[];
  currentSearchMatchIndex: number;
  
  // Inspector
  endianness: Endianness;
}

export interface HexViewerTabletState extends TabletState {
  type: "hexviewer";
  data: HexViewerData;
}
