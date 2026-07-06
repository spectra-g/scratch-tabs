import { TabletState } from "../types";

export type FilenameEncoding = "utf-8" | "cp437" | "shift-jis" | "windows-1252";
export type EncryptionType = "none" | "zipcrypto" | "aes";
export type SortBy = "name" | "size" | "compressedSize" | "modified";
export type SortDir = "asc" | "desc";
export type SearchScope = "name" | "path" | "content";
export type ViewMode = "tree" | "flat";
export type PreviewType = "text" | "image" | "json" | "xml" | "binary-hex";

export interface ArchiveEntry {
  path: string;
  name: string;
  isDirectory: boolean;
  sizeUncompressed: number;
  sizeCompressed: number;
  compressionRatio: number;
  modified: number | null;
  comment: string;
  encryptionType: EncryptionType;
  crc32: string;
  mimeType: string;
  isTextPreviewable: boolean;
  isImagePreviewable: boolean;
  depth: number;
}

export interface PreviewResult {
  path: string;
  type: PreviewType;
  content: string;
  truncated: boolean;
  hexPage: number;
  originalSize: number;
}

export interface ArchiveStats {
  totalEntries: number;
  fileCount: number;
  directoryCount: number;
  totalUncompressedBytes: number;
  totalCompressedBytes: number;
  overallRatio: number;
  zipCryptoCount: number;
  aesCount: number;
  archiveComment: string;
  extensionBreakdown: Array<{ ext: string; count: number; totalBytes: number }>;
  largestFiles: Array<{ path: string; sizeUncompressed: number }>;
  nestedDepth: number;
}

export interface ArchiveInspectorData {
  inputMethod: "file" | "base64";
  fileName: string | null;
  fileSizeBytes: number | null;
  base64Input: string;
  filenameEncoding: FilenameEncoding;

  entries: ArchiveEntry[];
  parseError: string | null;
  isParsing: boolean;

  expandedPaths: string[];
  selectedPath: string | null;
  searchQuery: string;
  searchScope: SearchScope;
  sortBy: SortBy;
  sortDir: SortDir;
  activePanel: "tree" | "preview";
  previewContent: PreviewResult | null;
  isLoadingPreview: boolean;
  previewError: string | null;
  sidebarWidth: number;
  viewMode: ViewMode;
  showDotFiles: boolean;
  filterExtensions: string[];

  stats: ArchiveStats | null;

  showStats: boolean;
  zipBombDetected: boolean;
  zipBombOverridden: boolean;
  garbledFilenamesWarning: boolean;
  blobMissing: boolean;

  contentSearchResults: ContentSearchMatch[] | null;
  contentSearchProgress: number | null;
  contentSearchSkipped: number;
  contentSearchLimited: boolean;
  openedEntryPath: string | null;
}

export interface ContentSearchMatch {
  path: string;
  excerpt: string;
  offset: number;
}

export interface ArchiveInspectorState extends TabletState {
  type: "archive-inspector";
  data: ArchiveInspectorData;
}
