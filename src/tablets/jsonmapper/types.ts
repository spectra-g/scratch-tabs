import { TabletState } from "../types";

export type MappingDirection = "sourceToTarget" | "targetToSource";
export type MappingStatus = "mapped" | "unmapped" | "ignored" | "error";
export type DataType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null"
  | "unknown";
export type TransformationType = "none" | "builtin" | "custom";
export type TargetLanguage = "javascript" | "typescript" | "python" | "java";

export interface MappingRule {
  id: string;
  sourcePath: string;
  targetPath: string;
  transformationType: TransformationType;
  transformation: string;
  sourceDataType: DataType;
  targetDataType: DataType;
  status: MappingStatus;
  confidence: number; // 0-1, for auto-suggested mappings
  isUserDefined: boolean;
}

export interface MappingConfig {
  id: string;
  name: string;
  description: string;
  sourceJson: string;
  targetJson: string;
  rules: MappingRule[];
  createdAt: number;
  updatedAt: number;
}

export interface JsonMapperState extends TabletState {
  type: "jsonmapper";
  data: {
    mappings: MappingConfig[];
    activeMappingId: string | null;
    isEditingMapping: boolean;
    isCreatingMapping: boolean;
    isTestingMapping: boolean;
    isGeneratingCode: boolean;
    testInput: string;
    testOutput: string;
    testError: string | null;
    selectedLanguage: TargetLanguage;
    selectedDirection: MappingDirection;
    generatedCode: string;
    searchQuery: string;
    _transientMappingForModal?: MappingConfig;
  };
}

export interface PathInfo {
  path: string;
  type: DataType;
  value: any;
}

export interface SuggestionResult {
  sourcePath: string;
  targetPath: string;
  confidence: number;
  sourceType: DataType;
  targetType: DataType;
}

export type FilenameTransformType = "prefix" | "suffix" | "replace";

export interface FilenameTransformRule {
  type: FilenameTransformType;
  search?: string; // For 'replace' type
  value: string; // The prefix, suffix, or replacement value
}

export interface BatchProcessingOptions {
  filePattern?: string; // e.g., "data*.json" or "*.json"
  preserveOriginals: boolean; // If true, keep original files in the output zip
  filenameRule?: FilenameTransformRule; // How to transform output filenames
  preserveEmptyFolders: boolean; // If true, keep empty folders in output
}
