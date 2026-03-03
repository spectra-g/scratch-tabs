import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import debounce from "lodash.debounce";
import { parseToml } from "../parsers/tomlParser";
import { serializeToml } from "../serializers/tomlSerializer";
import { TomlTable, TomlValue, UseTomlDataOptions, UseTomlDataReturn } from "../types";

const DEFAULT_OPTIONS: Required<UseTomlDataOptions> = {
  enableRealTimeSync: true,
  debounceMs: 300,
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
};

const clone = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as T;
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, objectValue]) => [key, clone(objectValue)]),
    ) as T;
  }

  if (value instanceof Date) {
    return new Date(value.valueOf()) as T;
  }

  return value;
};

const setValueAtPath = (
  source: TomlTable,
  path: string[],
  value: TomlValue | TomlTable | TomlTable[],
): TomlTable => {
  if (path.length === 0) {
    return source;
  }

  const next = clone(source);
  let cursor: Record<string, unknown> = next;

  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    const current = cursor[key];

    if (!isPlainObject(current)) {
      cursor[key] = {};
    }

    cursor = cursor[key] as Record<string, unknown>;
  }

  cursor[path[path.length - 1]] = value;
  return next;
};

const removeValueAtPath = (source: TomlTable, path: string[]): TomlTable => {
  if (path.length === 0) {
    return source;
  }

  const next = clone(source);
  let cursor: Record<string, unknown> = next;

  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    const current = cursor[key];

    if (!isPlainObject(current)) {
      return next;
    }

    cursor = current;
  }

  delete cursor[path[path.length - 1]];
  return next;
};

export const useTomlData = (
  content: string,
  onContentChange: (newContent: string) => void,
  options: UseTomlDataOptions = {},
): UseTomlDataReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lastSyncedContentRef = useRef<string>("");

  const [data, setDataState] = useState<TomlTable>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSync = useMemo(
    () =>
      debounce((nextContent: string) => {
        lastSyncedContentRef.current = nextContent;
        onContentChange(nextContent);
      }, opts.debounceMs),
    [onContentChange, opts.debounceMs],
  );

  useEffect(() => {
    return () => {
      debouncedSync.cancel();
    };
  }, [debouncedSync]);

  const reparse = useCallback((nextContent: string) => {
    setLoading(true);
    const result = parseToml(nextContent);
    setDataState(result.data);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (content === lastSyncedContentRef.current) {
      return;
    }

    reparse(content);
  }, [content, reparse]);

  const serialize = useCallback(
    (dataOverride?: TomlTable) => {
      const contentToSerialize = dataOverride ?? data;
      return serializeToml(contentToSerialize);
    },
    [data],
  );

  const syncToContent = useCallback(
    (nextData: TomlTable) => {
      if (!opts.enableRealTimeSync) {
        return;
      }

      try {
        const nextContent = serializeToml(nextData);
        setError(null);
        debouncedSync(nextContent);
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : "Failed to serialize TOML");
      }
    },
    [debouncedSync, opts.enableRealTimeSync],
  );

  const setData = useCallback(
    (next: TomlTable | ((previous: TomlTable) => TomlTable)) => {
      setDataState((previous) => {
        const resolved = typeof next === "function" ? (next as (previous: TomlTable) => TomlTable)(previous) : next;
        syncToContent(resolved);
        return resolved;
      });
    },
    [syncToContent],
  );

  const setValue = useCallback(
    (path: string[], value: TomlValue | TomlTable | TomlTable[]) => {
      setData((previous) => setValueAtPath(previous, path, value));
    },
    [setData],
  );

  const removeValue = useCallback(
    (path: string[]) => {
      setData((previous) => removeValueAtPath(previous, path));
    },
    [setData],
  );

  return {
    data,
    loading,
    error,
    setData,
    setValue,
    removeValue,
    serialize,
    reparse,
  };
};
