import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { debounce } from "lodash";
import {
  PropertiesState,
  PropertyLine,
  PropertyPair,
  PropertyComment,
  PropertyBlank,
  PropertyTreeNode,
  PropertiesValidation,
  UsePropertiesDataOptions,
  UsePropertiesDataReturn,
} from "../types";

const DEFAULT_OPTIONS: Required<UsePropertiesDataOptions> = {
  enableRealTimeSync: true,
  debounceMs: 300,
};

export const usePropertiesData = (
  content: string,
  onContentChange: (newContent: string) => void,
  options: UsePropertiesDataOptions = {},
): UsePropertiesDataReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Track the last content we synced to prevent circular updates
  const lastSyncedContentRef = useRef<string>("");
  
  // Core state
  const [state, setState] = useState<PropertiesState>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced content sync
  const debouncedSync = useMemo(
    () =>
      debounce((newContent: string) => {
        lastSyncedContentRef.current = newContent;
        onContentChange(newContent);
      }, opts.debounceMs),
    [onContentChange, opts.debounceMs],
  );

  // Parse .properties content into structured state
  const parseProperties = useCallback((content: string): PropertiesState => {
    const lines = content.split('\n');
    const state: PropertiesState = [];

    lines.forEach((line, index) => {
      const id = `line_${index}_${Date.now()}_${Math.random()}`;

      // Check for blank line
      if (line.trim() === '') {
        state.push({
          type: 'BLANK',
          id,
        } as PropertyBlank);
        return;
      }

      // Check for comment line
      if (line.trim().startsWith('#') || line.trim().startsWith('!')) {
        state.push({
          type: 'COMMENT',
          id,
          value: line,
        } as PropertyComment);
        return;
      }

      // Check for key-value pair
      const keyValueMatch = line.match(/^\s*([^#!=:]+?)\s*([:=])\s*(.*?)(\s*[#!].*)?$/);
      if (keyValueMatch) {
        const [, key, , valueAndComment, inlineComment] = keyValueMatch;
        let value = valueAndComment;
        let comment: string | undefined;

        if (inlineComment) {
          value = valueAndComment.replace(/\s*[#!].*$/, '').trim();
          comment = inlineComment.trim();
        }

        state.push({
          type: 'PAIR',
          id,
          key: key.trim(),
          value: value.trim(),
          comment,
        } as PropertyPair);
        return;
      }

      // If we can't parse it, treat it as a comment
      state.push({
        type: 'COMMENT',
        id,
        value: line,
      } as PropertyComment);
    });

    return state;
  }, []);

  // Serialize state back to .properties string
  const serializeProperties = useCallback((state: PropertiesState): string => {
    return state.map(line => {
      switch (line.type) {
        case 'BLANK':
          return '';
        case 'COMMENT':
          return (line as PropertyComment).value;
        case 'PAIR': {
          const pair = line as PropertyPair;
          const baseString = `${pair.key} = ${pair.value}`;
          if (pair.comment) {
            // Ensure comment has proper prefix (# or !) if it doesn't already
            const comment = pair.comment.trim();
            const formattedComment = comment.startsWith('#') || comment.startsWith('!') 
              ? comment 
              : `# ${comment}`;
            return `${baseString} ${formattedComment}`;
          }
          return baseString;
        }
        default:
          return '';
      }
    }).join('\n');
  }, []);

  // Build tree structure from key-value pairs
  const buildTreeData = useCallback((state: PropertiesState): PropertyTreeNode[] => {
    const pairs = state.filter(line => line.type === 'PAIR') as PropertyPair[];
    const root: PropertyTreeNode = {
      id: 'root',
      name: 'All Properties',
      children: [],
      isLeaf: false,
    };

    pairs.forEach(pair => {
      const keyParts = pair.key.split('.');
      let currentNode = root;

      keyParts.forEach((part, index) => {
        const isLastPart = index === keyParts.length - 1;
        const nodeId = keyParts.slice(0, index + 1).join('.');

        let existingChild = currentNode.children.find(child => child.name === part);

        if (!existingChild) {
          existingChild = {
            id: nodeId,
            name: part,
            children: [],
            isLeaf: isLastPart,
            fullKey: isLastPart ? pair.key : undefined,
            value: isLastPart ? pair.value : undefined,
            comment: isLastPart ? pair.comment : undefined,
            pairId: isLastPart ? pair.id : undefined,
          };
          currentNode.children.push(existingChild);
        }

        if (isLastPart) {
          existingChild.isLeaf = true;
          existingChild.fullKey = pair.key;
          existingChild.value = pair.value;
          existingChild.comment = pair.comment;
          existingChild.pairId = pair.id;
        }

        currentNode = existingChild;
      });
    });

    // Sort children alphabetically at each level
    const sortChildren = (node: PropertyTreeNode) => {
      node.children.sort((a, b) => a.name.localeCompare(b.name));
      node.children.forEach(sortChildren);
    };
    sortChildren(root);

    return [root];
  }, []);

  // Get filtered pairs based on selected tree node
  const getFilteredPairs = useCallback((state: PropertiesState, selectedNodeId: string | null): PropertyPair[] => {
    const pairs = state.filter(line => line.type === 'PAIR') as PropertyPair[];
    
    if (!selectedNodeId || selectedNodeId === 'root') {
      return pairs;
    }

    // Filter pairs that start with the selected node's path
    return pairs.filter(pair => pair.key.startsWith(selectedNodeId + '.') || pair.key === selectedNodeId);
  }, []);

  // Validate properties for duplicates and issues
  const validateProperties = useCallback((state: PropertiesState): PropertiesValidation => {
    const pairs = state.filter(line => line.type === 'PAIR') as PropertyPair[];
    const keyCount = new Map<string, number>();
    const duplicateKeys: string[] = [];
    const emptyValues: string[] = [];
    const invalidKeys: string[] = [];

    pairs.forEach(pair => {
      // Count keys for duplicate detection
      const count = keyCount.get(pair.key) || 0;
      keyCount.set(pair.key, count + 1);

      // Check for empty values
      if (!pair.value.trim()) {
        emptyValues.push(pair.key);
      }

      // Check for invalid key patterns
      if (!/^[a-zA-Z0-9._-]+$/.test(pair.key)) {
        invalidKeys.push(pair.key);
      }
    });

    // Find duplicates
    keyCount.forEach((count, key) => {
      if (count > 1) {
        duplicateKeys.push(key);
      }
    });

    return {
      duplicateKeys,
      emptyValues,
      invalidKeys,
    };
  }, []);

  // Initialize state from content
  useEffect(() => {
    // Skip re-parsing if this content change came from our own sync
    if (content === lastSyncedContentRef.current) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsedState = parseProperties(content);
      setState(parsedState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse properties');
    } finally {
      setLoading(false);
    }
  }, [content, parseProperties]);

  // Sync changes back to content
  const syncToContent = useCallback((newState: PropertiesState) => {
    const serialized = serializeProperties(newState);
    debouncedSync(serialized);
  }, [serializeProperties, debouncedSync]);

  // Memoized computed values
  const treeData = useMemo(() => buildTreeData(state), [state, buildTreeData]);
  const filteredPairs = useMemo(() => getFilteredPairs(state, selectedNodeId), [state, selectedNodeId, getFilteredPairs]);
  const validation = useMemo(() => validateProperties(state), [state, validateProperties]);

  // Data manipulation functions
  const updatePair = useCallback((pairId: string, key: string, value: string, comment?: string) => {
    const newState = state.map(line => {
      if (line.id === pairId && line.type === 'PAIR') {
        return {
          ...line,
          key: key.trim(),
          value: value.trim(),
          comment: comment?.trim(),
        } as PropertyPair;
      }
      return line;
    });
    setState(newState);
    syncToContent(newState);
  }, [state, syncToContent]);

  const addPair = useCallback((key: string, value: string, comment?: string, afterPairId?: string) => {
    const newPair: PropertyPair = {
      type: 'PAIR',
      id: `pair_${Date.now()}_${Math.random()}`,
      key: key.trim(),
      value: value.trim(),
      comment: comment?.trim(),
    };

    let newState: PropertiesState;
    if (afterPairId) {
      const insertIndex = state.findIndex(line => line.id === afterPairId);
      if (insertIndex !== -1) {
        newState = [
          ...state.slice(0, insertIndex + 1),
          newPair,
          ...state.slice(insertIndex + 1),
        ];
      } else {
        newState = [...state, newPair];
      }
    } else {
      newState = [...state, newPair];
    }

    setState(newState);
    syncToContent(newState);
  }, [state, syncToContent]);

  const deletePair = useCallback((pairId: string) => {
    const newState = state.filter(line => line.id !== pairId);
    setState(newState);
    syncToContent(newState);
  }, [state, syncToContent]);

  const addComment = useCallback((comment: string, afterPairId?: string) => {
    const newComment: PropertyComment = {
      type: 'COMMENT',
      id: `comment_${Date.now()}_${Math.random()}`,
      value: comment.startsWith('#') ? comment : `# ${comment}`,
    };

    let newState: PropertiesState;
    if (afterPairId) {
      const insertIndex = state.findIndex(line => line.id === afterPairId);
      if (insertIndex !== -1) {
        newState = [
          ...state.slice(0, insertIndex + 1),
          newComment,
          ...state.slice(insertIndex + 1),
        ];
      } else {
        newState = [...state, newComment];
      }
    } else {
      newState = [...state, newComment];
    }

    setState(newState);
    syncToContent(newState);
  }, [state, syncToContent]);

  const deleteComment = useCallback((commentId: string) => {
    const newState = state.filter(line => line.id !== commentId);
    setState(newState);
    syncToContent(newState);
  }, [state, syncToContent]);

  // Transformation functions
  const sortKeysAlphabetically = useCallback(() => {
    const pairs = state.filter(line => line.type === 'PAIR') as PropertyPair[];
    const nonPairs = state.filter(line => line.type !== 'PAIR');
    
    const sortedPairs = [...pairs].sort((a, b) => a.key.localeCompare(b.key));
    
    // Rebuild state with sorted pairs and preserve non-pair lines at the beginning
    const comments = nonPairs.filter(line => line.type === 'COMMENT');
    const blanks = nonPairs.filter(line => line.type === 'BLANK');
    
    const newState: PropertiesState = [
      ...comments,
      ...blanks,
      ...sortedPairs,
    ];

    setState(newState);
    syncToContent(newState);
  }, [state, syncToContent]);

  const groupByPrefix = useCallback(() => {
    const pairs = state.filter(line => line.type === 'PAIR') as PropertyPair[];
    const comments = state.filter(line => line.type === 'COMMENT') as PropertyComment[];
    
    // Group pairs by their first prefix
    const groups = new Map<string, PropertyPair[]>();
    
    pairs.forEach(pair => {
      const prefix = pair.key.split('.')[0];
      if (!groups.has(prefix)) {
        groups.set(prefix, []);
      }
      groups.get(prefix)!.push(pair);
    });

    // Find comments that belong to each group by analyzing the structure
    const groupComments = new Map<string, PropertyComment[]>();
    
    // Initialize empty comment arrays for each group
    Array.from(groups.keys()).forEach(prefix => {
      groupComments.set(prefix, []);
    });
    
    // Find the index of the first property to identify global header comments
    let firstPropertyIndex = -1;
    for (let i = 0; i < state.length; i++) {
      if (state[i].type === 'PAIR') {
        firstPropertyIndex = i;
        break;
      }
    }
    
    // Collect comments that appear between property groups
    let i = firstPropertyIndex;
    while (i < state.length) {
      const line = state[i];
      
      if (line.type === 'PAIR') {
        const pair = line as PropertyPair;
        const currentPrefix = pair.key.split('.')[0];
        
        // Look backward to collect comments that precede this group
        const precedingComments: PropertyComment[] = [];
        let j = i - 1;
        
        // Collect comments and blanks preceding this property
        while (j >= firstPropertyIndex && (state[j].type === 'COMMENT' || state[j].type === 'BLANK')) {
          if (state[j].type === 'COMMENT') {
            precedingComments.unshift(state[j] as PropertyComment);
          }
          j--;
        }
        
        // If we found comments and this is the first property of this prefix we've seen
        if (precedingComments.length > 0 && !groupComments.get(currentPrefix)?.length) {
          groupComments.set(currentPrefix, precedingComments);
        }
        
        // Skip ahead to the next different prefix
        while (i < state.length && state[i].type === 'PAIR') {
          const nextPair = state[i] as PropertyPair;
          if (nextPair.key.split('.')[0] !== currentPrefix) {
            break;
          }
          i++;
        }
      } else {
        i++;
      }
    }

    // Sort groups by prefix name and pairs within each group
    const sortedGroups = Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([prefix, groupPairs]) => [prefix, groupPairs.sort((a, b) => a.key.localeCompare(b.key))] as const);

    // Start with only global/header comments (comments before any properties)
    const newState: PropertiesState = [];
    
    // Find global comments that appear at the beginning before any properties
    for (let i = 0; i < state.length; i++) {
      const line = state[i];
      if (line.type === 'PAIR') {
        break; // Stop at first property
      }
      if (line.type === 'COMMENT' || line.type === 'BLANK') {
        newState.push(line);
      }
    }

    // Add grouped pairs with preserved or generated comments
    sortedGroups.forEach(([prefix, groupPairs], index) => {
      // Add blank line between groups (except before first group if we already have content)
      if (index > 0 || newState.length > 0) {
        newState.push({
          type: 'BLANK',
          id: `blank_group_${prefix}_${Date.now()}`,
        } as PropertyBlank);
      }
      
      // Add comments for this group
      const prefixComments = groupComments.get(prefix) || [];
      if (prefixComments.length > 0) {
        // Use the preserved comments
        newState.push(...prefixComments);
      } else {
        // Generate default comment only if no existing comments
        newState.push({
          type: 'COMMENT',
          id: `comment_group_${prefix}_${Date.now()}`,
          value: `# ${prefix} configuration`,
        } as PropertyComment);
      }
      
      newState.push(...groupPairs);
    });

    setState(newState);
    syncToContent(newState);
  }, [state, syncToContent]);

  const stripAllComments = useCallback(() => {
    const newState = state
      .filter(line => line.type !== 'COMMENT')
      .map(line => {
        if (line.type === 'PAIR') {
          const pair = line as PropertyPair;
          return {
            ...pair,
            comment: undefined,
          };
        }
        return line;
      });

    setState(newState);
    syncToContent(newState);
  }, [state, syncToContent]);

  const normalizeSpacing = useCallback(() => {
    const newState = state.map(line => {
      if (line.type === 'PAIR') {
        // Normalize spacing is handled in serialization
        return line;
      }
      return line;
    });

    setState(newState);
    syncToContent(newState);
  }, [state, syncToContent]);

  const ensureFinalNewline = useCallback(() => {
    const serialized = serializeProperties(state);
    if (!serialized.endsWith('\n')) {
      const newState = [
        ...state,
        {
          type: 'BLANK',
          id: `final_blank_${Date.now()}`,
        } as PropertyBlank,
      ];
      setState(newState);
      syncToContent(newState);
    }
  }, [state, serializeProperties, syncToContent]);

  const removeFinalNewline = useCallback(() => {
    if (state.length > 0 && state[state.length - 1].type === 'BLANK') {
      const newState = state.slice(0, -1);
      setState(newState);
      syncToContent(newState);
    }
  }, [state, syncToContent]);

  // Converter functions
  const convertToNestedJson = useCallback((): string => {
    const pairs = state.filter(line => line.type === 'PAIR') as PropertyPair[];
    const result: any = {};

    pairs.forEach(pair => {
      const keys = pair.key.split('.');
      let current = result;

      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          // Last key, set the value
          current[key] = pair.value;
        } else {
          // Intermediate key, ensure object exists
          if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
          }
          current = current[key];
        }
      });
    });

    return JSON.stringify(result, null, 2);
  }, [state]);

  const convertToYaml = useCallback((): string => {
    const pairs = state.filter(line => line.type === 'PAIR') as PropertyPair[];
    const result: any = {};

    pairs.forEach(pair => {
      const keys = pair.key.split('.');
      let current = result;

      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          current[key] = pair.value;
        } else {
          if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
          }
          current = current[key];
        }
      });
    });

    // Simple YAML serialization
    const yamlLines: string[] = [];
    
    const serializeObject = (obj: any, indent: number = 0) => {
      const spaces = '  '.repeat(indent);
      
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          yamlLines.push(`${spaces}${key}:`);
          serializeObject(value, indent + 1);
        } else {
          yamlLines.push(`${spaces}${key}: ${value}`);
        }
      });
    };

    serializeObject(result);
    return yamlLines.join('\n');
  }, [state]);

  const toPropertiesString = useCallback(() => {
    return serializeProperties(state);
  }, [state, serializeProperties]);

  return {
    state,
    treeData,
    validation,
    loading,
    error,
    selectedNodeId,
    filteredPairs,
    setSelectedNode: setSelectedNodeId,
    updatePair,
    addPair,
    deletePair,
    addComment,
    deleteComment,
    sortKeysAlphabetically,
    groupByPrefix,
    stripAllComments,
    normalizeSpacing,
    ensureFinalNewline,
    removeFinalNewline,
    convertToNestedJson,
    convertToYaml,
    toPropertiesString,
  };
};