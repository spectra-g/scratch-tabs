import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import debounce from "lodash.debounce";
import {
  DotenvState,
  DotenvPair,
  DotenvComment,
  DotenvBlank,
  DotenvValidation,
  parseToState,
  serializeState,
  sortAlphabetically,
  groupByPrefix,
  removeDuplicates,
  stripComments,
  removeExtraBlankLines,
  removeAllBlankLines,
  validateState,
  toJson,
  toShellExport,
  toDockerFlags,
  inferType,
  isSecretKey,
  stripQuotes,
} from "../../utils/dotenvParser";

let _idSeq = 0;
const uid = () => `env_${++_idSeq}_${Date.now()}`;

export interface UseDotenvDataReturn {
  state: DotenvState;
  pairs: DotenvPair[];
  validation: DotenvValidation;
  // Row operations
  updatePair: (id: string, key: string, rawValue: string) => void;
  addPair: (key?: string, value?: string) => void;
  deletePair: (id: string) => void;
  // Bulk transforms
  sortKeys: () => void;
  groupKeys: () => void;
  deduplicateKeys: () => void;
  stripAllComments: () => void;
  collapseBlankLines: () => void;
  removeBlankLines: () => void;
  // Converters (return string, caller creates tab)
  convertToJson: () => string;
  convertToShell: () => string;
  convertToDockerFlags: () => string;
}

export function useDotenvData(
  content: string,
  onContentChange: (v: string) => void,
): UseDotenvDataReturn {
  const lastSyncedRef = useRef<string>("");
  const [state, setState] = useState<DotenvState>(() => parseToState(content));

  const debouncedSync = useMemo(
    () =>
      debounce((s: DotenvState) => {
        const serialized = serializeState(s);
        lastSyncedRef.current = serialized;
        onContentChange(serialized);
      }, 250),
    [onContentChange],
  );

  // Re-parse when the editor changes content from outside
  useEffect(() => {
    if (content === lastSyncedRef.current) return;
    setState(parseToState(content));
  }, [content]);

  const mutate = useCallback(
    (next: DotenvState) => {
      setState(next);
      debouncedSync(next);
    },
    [debouncedSync],
  );

  const updatePair = useCallback(
    (id: string, key: string, rawValue: string) => {
      const value = stripQuotes(rawValue);
      mutate(
        state.map((line) =>
          line.type === "PAIR" && line.id === id
            ? {
                ...line,
                key: key.trim(),
                rawValue: rawValue.trim(),
                value,
                valueType: inferType(key, value),
                isSecret: isSecretKey(key),
              }
            : line,
        ),
      );
    },
    [state, mutate],
  );

  const addPair = useCallback(
    (key = "NEW_KEY", value = "") => {
      const newPair: DotenvPair = {
        type: "PAIR",
        id: uid(),
        key,
        rawValue: value,
        value,
        hasExport: false,
        valueType: inferType(key, value),
        isSecret: isSecretKey(key),
      };
      mutate([...state, newPair]);
    },
    [state, mutate],
  );

  const deletePair = useCallback(
    (id: string) => {
      mutate(state.filter((l) => !(l.type === "PAIR" && l.id === id)));
    },
    [state, mutate],
  );

  const sortKeys = useCallback(() => mutate(sortAlphabetically(state)), [state, mutate]);
  const groupKeys = useCallback(() => mutate(groupByPrefix(state)), [state, mutate]);
  const deduplicateKeys = useCallback(() => mutate(removeDuplicates(state)), [state, mutate]);
  const stripAllComments = useCallback(() => mutate(stripComments(state)), [state, mutate]);
  const collapseBlankLines = useCallback(() => mutate(removeExtraBlankLines(state)), [state, mutate]);
  const removeBlankLines = useCallback(() => mutate(removeAllBlankLines(state)), [state, mutate]);

  const convertToJson = useCallback(() => toJson(state), [state]);
  const convertToShell = useCallback(() => toShellExport(state), [state]);
  const convertToDockerFlags = useCallback(() => toDockerFlags(state), [state]);

  const pairs = useMemo(
    () => state.filter((l) => l.type === "PAIR") as DotenvPair[],
    [state],
  );
  const validation = useMemo(() => validateState(state), [state]);

  return {
    state,
    pairs,
    validation,
    updatePair,
    addPair,
    deletePair,
    sortKeys,
    groupKeys,
    deduplicateKeys,
    stripAllComments,
    collapseBlankLines,
    removeBlankLines,
    convertToJson,
    convertToShell,
    convertToDockerFlags,
  };
}
