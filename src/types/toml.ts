export type TomlPrimitive = string | number | boolean | Date;

export type TomlValue =
  | TomlPrimitive
  | TomlValue[]
  | {
      [key: string]: TomlValue;
    };

export interface TomlTable {
  [key: string]: TomlValue | TomlTable | TomlTable[];
}

export interface TomlParseSuccess {
  data: TomlTable;
  error: null;
}

export interface TomlParseFailure {
  data: TomlTable;
  error: string;
}

export type TomlParseResult = TomlParseSuccess | TomlParseFailure;

export interface UseTomlDataOptions {
  enableRealTimeSync?: boolean;
  debounceMs?: number;
}

export interface UseTomlDataReturn {
  data: TomlTable;
  loading: boolean;
  error: string | null;
  setData: (next: TomlTable | ((previous: TomlTable) => TomlTable)) => void;
  setValue: (path: string[], value: TomlValue | TomlTable | TomlTable[]) => void;
  removeValue: (path: string[]) => void;
  serialize: (dataOverride?: TomlTable) => string;
  reparse: (nextContent: string) => void;
}
