import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { debounce } from "lodash";
import {
  IniState,
  IniSection,
  IniLine,
  IniFileNode,
  IniValidationIssue,
  IniTreeNode,
  UseIniDataOptions,
  UseIniDataReturn,
} from "../types";

const DEFAULT_OPTIONS: Required<UseIniDataOptions> = {
  enableRealTimeSync: true,
  debounceMs: 300,
};

// Sensitive key patterns for masking
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passkey/i,
  /secret/i,
  /token/i,
  /api[-_ ]?key/i,
  /auth[-_ ]?key/i,
  /credential/i,
  /private[-_ ]?key/i,
  /key$/i,
  /access[-_ ]?key/i,
];

export const isSensitiveKey = (key: string): boolean => {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
};

export const useIniData = (
  content: string,
  onContentChange: (newContent: string) => void,
  options: UseIniDataOptions = {},
): UseIniDataReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Track the last content we synced to prevent circular updates
  const lastSyncedContentRef = useRef<string>("");
  
  // Core state
  const [state, setState] = useState<IniState>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [userExplicitlySelectedAll, setUserExplicitlySelectedAll] = useState(false);
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

  // Parse INI content into structured state
  const parseIniContent = useCallback((iniContent: string): IniState => {
    if (!iniContent.trim()) {
      return [];
    }

    const lines = iniContent.split('\n');
    const result: IniState = [];
    let currentSection: IniSection | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        // Blank line
        result.push({
          type: 'BLANK',
          id: `blank_${i}_${Date.now()}_${Math.random()}`,
        });
        continue;
      }

      if (trimmedLine.startsWith('#') || trimmedLine.startsWith(';')) {
        // Comment line
        const commentStyle = trimmedLine.startsWith('#') ? '#' as const : ';' as const;
        const commentValue = trimmedLine.substring(1).trim();
        
        result.push({
          type: 'COMMENT',
          id: `comment_${i}_${Date.now()}_${Math.random()}`,
          value: commentValue,
          originalCommentStyle: commentStyle,
        });
        continue;
      }

      const sectionMatch = trimmedLine.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        // Section header
        const sectionName = sectionMatch[1].trim();
        currentSection = {
          type: 'SECTION',
          id: `section_${sectionName}_${Date.now()}_${Math.random()}`,
          name: sectionName,
          lines: [],
        };
        
        result.push(currentSection);
        continue;
      }

      const keyValueMatch = trimmedLine.match(/^([^=:]+?)\s*[=:]\s*(.*)$/);
      if (keyValueMatch && currentSection) {
        // Key-value pair within a section
        const key = keyValueMatch[1].trim();
        const valueAndComment = keyValueMatch[2];
        
        // Check for inline comment
        let value = valueAndComment;
        let inlineComment: string | undefined;
        let commentStyle: '#' | ';' | undefined;
        
        const commentMatch = valueAndComment.match(/^(.*?)\s*([#;])\s*(.*)$/);
        if (commentMatch) {
          value = commentMatch[1].trim();
          commentStyle = commentMatch[2] as '#' | ';';
          inlineComment = commentMatch[3].trim();
        }

        const keyValueLine: IniLine = {
          type: 'PAIR',
          id: `pair_${key}_${Date.now()}_${Math.random()}`,
          key,
          value: value.trim(),
          comment: inlineComment,
          originalCommentStyle: commentStyle,
        };

        currentSection.lines.push(keyValueLine);
      } else if (keyValueMatch && !currentSection) {
        // Key-value pair outside of any section - create a default section
        if (!result.find(node => node.type === 'SECTION' && (node as IniSection).name === '')) {
          const defaultSection: IniSection = {
            type: 'SECTION',
            id: `section_default_${Date.now()}_${Math.random()}`,
            name: '',
            lines: [],
          };
          result.push(defaultSection);
          currentSection = defaultSection;
        } else {
          currentSection = result.find(node => node.type === 'SECTION' && (node as IniSection).name === '') as IniSection;
        }

        const key = keyValueMatch[1].trim();
        const valueAndComment = keyValueMatch[2];
        
        let value = valueAndComment;
        let inlineComment: string | undefined;
        let commentStyle: '#' | ';' | undefined;
        
        const commentMatch = valueAndComment.match(/^(.*?)\s*([#;])\s*(.*)$/);
        if (commentMatch) {
          value = commentMatch[1].trim();
          commentStyle = commentMatch[2] as '#' | ';';
          inlineComment = commentMatch[3].trim();
        }

        const keyValueLine: IniLine = {
          type: 'PAIR',
          id: `pair_${key}_${Date.now()}_${Math.random()}`,
          key,
          value: value.trim(),
          comment: inlineComment,
          originalCommentStyle: commentStyle,
        };

        currentSection.lines.push(keyValueLine);
      }
    }

    return result;
  }, []);

  // Serialize state back to INI string
  const serializeToIni = useCallback((iniState: IniState): string => {
    const lines: string[] = [];

    for (let i = 0; i < iniState.length; i++) {
      const node = iniState[i];
      const nextNode = iniState[i + 1];
      
      if (node.type === 'BLANK') {
        lines.push('');
      } else if (node.type === 'COMMENT') {
        const commentStyle = node.originalCommentStyle || '#';
        lines.push(`${commentStyle} ${node.value}`);
      } else if (node.type === 'SECTION') {
        const section = node as IniSection;
        
        // Add section header
        if (section.name) {
          lines.push(`[${section.name}]`);
        }
        
        // Add section lines
        for (const line of section.lines) {
          if (line.type === 'COMMENT') {
            const commentStyle = line.originalCommentStyle || '#';
            lines.push(`${commentStyle} ${line.value}`);
          } else if (line.type === 'PAIR') {
            let lineStr = `${line.key} = ${line.value}`;
            if (line.comment) {
              const commentStyle = line.originalCommentStyle || '#';
              lineStr += ` ${commentStyle} ${line.comment}`;
            }
            lines.push(lineStr);
          }
        }
        
        // Only add blank line after section if the next node is another section
        // and if there isn't already a blank line between them
        if (nextNode && nextNode.type === 'SECTION') {
          lines.push('');
        }
      }
    }

    return lines.join('\n');
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
      const parsedState = parseIniContent(content);
      setState(parsedState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse INI content');
    } finally {
      setLoading(false);
    }
  }, [content, parseIniContent]);

  // Sync changes back to content
  const syncToContent = useCallback((newState: IniState) => {
    const iniContent = serializeToIni(newState);
    debouncedSync(iniContent);
  }, [serializeToIni, debouncedSync]);

  // Get sections from state
  const sections = useMemo(() => {
    return state.filter(node => node.type === 'SECTION') as IniSection[];
  }, [state]);

  // Auto-select first section if none selected - separate effect
  useEffect(() => {
    if (!selectedSectionId && !userExplicitlySelectedAll && sections.length > 0) {
      const firstSection = sections[0]; // sections are already filtered to be SECTION type
      if (firstSection) {
        setSelectedSectionId(firstSection.id);
      }
    }
  }, [selectedSectionId, userExplicitlySelectedAll, sections]); // Include sections dependency

  // Custom setter for selectedSectionId that tracks explicit "All Sections" selection
  const handleSetSelectedSectionId = useCallback((sectionId: string | null) => {
    setSelectedSectionId(sectionId);
    setUserExplicitlySelectedAll(sectionId === null);
  }, []);

  // Validation
  const validationIssues = useMemo((): IniValidationIssue[] => {
    const issues: IniValidationIssue[] = [];
    const sectionNames = new Set<string>();
    
    // Check for duplicate sections
    sections.forEach(section => {
      if (sectionNames.has(section.name)) {
        issues.push({
          type: 'error',
          message: `Duplicate section: [${section.name}]`,
          sectionId: section.id,
          suggestion: 'Rename or merge duplicate sections',
        });
      }
      sectionNames.add(section.name);
      
      // Check for duplicate keys within section
      const keyNames = new Set<string>();
      section.lines.forEach(line => {
        if (line.type === 'PAIR' && line.key) {
          if (keyNames.has(line.key)) {
            issues.push({
              type: 'error',
              message: `Duplicate key in [${section.name}]: ${line.key}`,
              sectionId: section.id,
              lineId: line.id,
              suggestion: 'Remove or rename duplicate key',
            });
          }
          keyNames.add(line.key);
          
          // Check for empty values
          if (!line.value || line.value.trim() === '') {
            issues.push({
              type: 'warning',
              message: `Empty value for key: ${line.key}`,
              sectionId: section.id,
              lineId: line.id,
              suggestion: 'Provide a value or remove the key',
            });
          }
        }
      });
    });

    return issues;
  }, [sections]);

  // Generate tree nodes for navigation
  const treeNodes = useMemo((): IniTreeNode[] => {
    const nodes: IniTreeNode[] = [];
    
    // Add root node for all sections
    const totalKeys = sections.reduce((sum, section) => 
      sum + section.lines.filter(line => line.type === 'PAIR').length, 0
    );
    
    nodes.push({
      id: 'root',
      name: 'All Sections',
      type: 'root',
      keyCount: totalKeys,
      hasIssues: false,
      children: [],
    });

    // Add section nodes with their key-value pairs as children
    sections.forEach(section => {
      const keyValuePairs = section.lines.filter(line => line.type === 'PAIR');
      const keyCount = keyValuePairs.length;
      const hasIssues = validationIssues.some(issue => issue.sectionId === section.id);
      
      const children: IniTreeNode[] = keyValuePairs.map((pair) => ({
        id: pair.id,
        name: pair.key || '(empty key)', // Just show the key, not the full key=value
        type: 'key' as const,
        sectionId: section.id,
        keyCount: 0,
        hasIssues: validationIssues.some(issue => issue.lineId === pair.id),
        children: [],
        lineId: pair.id,
      }));
      
      nodes.push({
        id: section.id,
        name: section.name || '(Global)',
        type: 'section',
        sectionId: section.id,
        keyCount,
        hasIssues,
        children,
      });
    });

    return nodes;
  }, [sections, validationIssues]);


  // Section management functions
  const addSection = useCallback((name: string, afterSectionId?: string) => {
    const newSection: IniSection = {
      type: 'SECTION',
      id: `section_${name}_${Date.now()}_${Math.random()}`,
      name,
      lines: [],
    };

    setState(prevState => {
      const newState = [...prevState];
      
      if (afterSectionId) {
        const insertIndex = newState.findIndex(node => node.id === afterSectionId);
        if (insertIndex !== -1) {
          newState.splice(insertIndex + 1, 0, newSection);
        } else {
          newState.push(newSection);
        }
      } else {
        newState.push(newSection);
      }
      
      syncToContent(newState);
      return newState;
    });
    
    setSelectedSectionId(newSection.id);
    setUserExplicitlySelectedAll(false); // Reset flag when adding sections
  }, [syncToContent]);

  const deleteSection = useCallback((sectionId: string) => {
    setState(prevState => {
      const newState = prevState.filter(node => node.id !== sectionId);
      syncToContent(newState);
      return newState;
    });
    
    // Select another section if the deleted one was selected
    if (selectedSectionId === sectionId) {
      const remainingSections = sections.filter(s => s.id !== sectionId);
      setSelectedSectionId(remainingSections.length > 0 ? remainingSections[0].id : null);
      setUserExplicitlySelectedAll(false); // Reset flag when deleting sections
    }
  }, [syncToContent, selectedSectionId, sections]);

  const duplicateSection = useCallback((sectionId: string, newName: string) => {
    const sectionToDuplicate = sections.find(s => s.id === sectionId);
    if (!sectionToDuplicate) return;

    const duplicatedSection: IniSection = {
      type: 'SECTION',
      id: `section_${newName}_${Date.now()}_${Math.random()}`,
      name: newName,
      lines: sectionToDuplicate.lines.map(line => ({
        ...line,
        id: `${line.type}_${Date.now()}_${Math.random()}`,
      })),
      comment: sectionToDuplicate.comment,
    };

    setState(prevState => {
      const sectionIndex = prevState.findIndex(node => node.id === sectionId);
      const newState = [...prevState];
      newState.splice(sectionIndex + 1, 0, duplicatedSection);
      
      syncToContent(newState);
      return newState;
    });
    
    setSelectedSectionId(duplicatedSection.id);
  }, [sections, syncToContent]);

  const renameSection = useCallback((sectionId: string, newName: string) => {
    setState(prevState => {
      const newState = prevState.map(node => {
        if (node.id === sectionId && node.type === 'SECTION') {
          return { ...node, name: newName } as IniSection;
        }
        return node;
      });
      
      syncToContent(newState);
      return newState;
    });
  }, [syncToContent]);

  const reorderSections = useCallback((sectionIds: string[]) => {
    setState(prevState => {
      const sectionMap = new Map<string, IniFileNode>();
      const nonSectionNodes: IniFileNode[] = [];
      
      // Separate sections from other nodes
      prevState.forEach(node => {
        if (node.type === 'SECTION') {
          sectionMap.set(node.id, node);
        } else {
          nonSectionNodes.push(node);
        }
      });
      
      // Rebuild state with new section order
      const newState: IniState = [];
      
      // Add non-section nodes at the beginning
      const leadingNodes = nonSectionNodes.filter((_, index) => index < 3); // Keep some leading comments
      newState.push(...leadingNodes);
      
      // Add sections in new order
      sectionIds.forEach(sectionId => {
        const section = sectionMap.get(sectionId);
        if (section) {
          newState.push(section);
        }
      });
      
      syncToContent(newState);
      return newState;
    });
  }, [syncToContent]);

  // Key-value management functions
  const addKeyValue = useCallback((sectionId: string, key: string, value: string, comment?: string) => {
    setState(prevState => {
      const newState = prevState.map(node => {
        if (node.id === sectionId && node.type === 'SECTION') {
          const section = node as IniSection;
          const newLine: IniLine = {
            type: 'PAIR',
            id: `pair_${key}_${Date.now()}_${Math.random()}`,
            key,
            value,
            comment,
          };
          
          return {
            ...section,
            lines: [...section.lines, newLine],
          };
        }
        return node;
      });
      
      syncToContent(newState);
      return newState;
    });
  }, [syncToContent]);

  const updateKeyValue = useCallback((sectionId: string, lineId: string, key: string, value: string, comment?: string) => {
    setState(prevState => {
      const newState = prevState.map(node => {
        if (node.id === sectionId && node.type === 'SECTION') {
          const section = node as IniSection;
          return {
            ...section,
            lines: section.lines.map(line => {
              if (line.id === lineId) {
                return { ...line, key, value, comment };
              }
              return line;
            }),
          };
        }
        return node;
      });
      
      syncToContent(newState);
      return newState;
    });
  }, [syncToContent]);

  const deleteKeyValue = useCallback((sectionId: string, lineId: string) => {
    setState(prevState => {
      const newState = prevState.map(node => {
        if (node.id === sectionId && node.type === 'SECTION') {
          const section = node as IniSection;
          return {
            ...section,
            lines: section.lines.filter(line => line.id !== lineId),
          };
        }
        return node;
      });
      
      syncToContent(newState);
      return newState;
    });
  }, [syncToContent]);

  // Transformation functions
  const sortKeysInSection = useCallback((sectionId: string) => {
    setState(prevState => {
      const newState = prevState.map(node => {
        if (node.id === sectionId && node.type === 'SECTION') {
          const section = node as IniSection;
          const pairs = section.lines.filter(line => line.type === 'PAIR');
          const comments = section.lines.filter(line => line.type === 'COMMENT');
          
          pairs.sort((a, b) => (a.key || '').localeCompare(b.key || ''));
          
          return {
            ...section,
            lines: [...comments, ...pairs],
          };
        }
        return node;
      });
      
      syncToContent(newState);
      return newState;
    });
  }, [syncToContent]);

  const sortAllSections = useCallback(() => {
    setState(prevState => {
      const sections = prevState.filter(node => node.type === 'SECTION') as IniSection[];
      const leadingComments: IniFileNode[] = [];
      
      // Only include meaningful leading comments (before first section), not random blank lines
      for (const node of prevState) {
        if (node.type === 'SECTION') {
          break;
        }
        // Only include actual comments, not blank lines
        if (node.type === 'COMMENT') {
          leadingComments.push(node);
        }
      }
      
      sections.sort((a, b) => a.name.localeCompare(b.name));
      
      const newState: IniState = [...leadingComments, ...sections];
      syncToContent(newState);
      return newState;
    });
  }, [syncToContent]);

  const stripAllComments = useCallback(() => {
    setState(prevState => {
      const newState = prevState.map(node => {
        if (node.type === 'COMMENT') {
          return null; // Mark for removal
        } else if (node.type === 'SECTION') {
          const section = node as IniSection;
          return {
            ...section,
            comment: undefined,
            lines: section.lines.map(line => ({
              ...line,
              comment: undefined,
            })).filter(line => line.type !== 'COMMENT'),
          };
        }
        return node;
      }).filter(Boolean) as IniState;
      
      syncToContent(newState);
      return newState;
    });
  }, [syncToContent]);

  const normalizeSpacing = useCallback(() => {
    setState(prevState => {
      const newState = prevState.map(node => {
        if (node.type === 'SECTION') {
          const section = node as IniSection;
          return {
            ...section,
            lines: section.lines.map(line => {
              if (line.type === 'PAIR') {
                return {
                  ...line,
                  key: line.key?.trim(),
                  value: line.value?.trim(),
                };
              }
              return line;
            }),
          };
        }
        return node;
      });
      
      syncToContent(newState);
      return newState;
    });
  }, [syncToContent]);

  const trimWhitespace = useCallback(() => {
    setState(prevState => {
      const newState = prevState.map(node => {
        if (node.type === 'SECTION') {
          const section = node as IniSection;
          return {
            ...section,
            name: section.name.trim(),
            lines: section.lines.map(line => ({
              ...line,
              key: line.key?.trim(),
              value: line.value?.trim(),
              comment: line.comment?.trim(),
            })),
          };
        } else if (node.type === 'COMMENT') {
          return {
            ...node,
            value: node.value?.trim(),
          };
        }
        return node;
      });
      
      syncToContent(newState);
      return newState;
    });
  }, [syncToContent]);

  const ensureFinalNewline = useCallback(() => {
    const currentContent = serializeToIni(state);
    if (!currentContent.endsWith('\n')) {
      debouncedSync(currentContent + '\n');
    }
  }, [state, serializeToIni, debouncedSync]);

  const removeFinalNewline = useCallback(() => {
    const currentContent = serializeToIni(state);
    if (currentContent.endsWith('\n')) {
      debouncedSync(currentContent.slice(0, -1));
    }
  }, [state, serializeToIni, debouncedSync]);

  // Converter functions
  const convertToJson = useCallback((): string => {
    const jsonObj: Record<string, string | Record<string, string>> = {};
    
    sections.forEach(section => {
      const sectionObj: Record<string, string> = {};
      
      section.lines.forEach(line => {
        if (line.type === 'PAIR' && line.key && line.value) {
          sectionObj[line.key] = line.value;
        }
      });
      
      if (Object.keys(sectionObj).length > 0) {
        if (section.name) {
          jsonObj[section.name] = sectionObj;
        } else {
          // Global section - merge into root
          Object.assign(jsonObj, sectionObj);
        }
      }
    });
    
    return JSON.stringify(jsonObj, null, 2);
  }, [sections]);

  const convertToYaml = useCallback((): string => {
    const yamlLines: string[] = [];
    
    sections.forEach((section, index) => {
      if (index > 0) {
        yamlLines.push(''); // Blank line between sections
      }
      
      if (section.comment) {
        yamlLines.push(`# ${section.comment}`);
      }
      
      if (section.name) {
        yamlLines.push(`${section.name}:`);
        
        section.lines.forEach(line => {
          if (line.type === 'COMMENT') {
            yamlLines.push(`  # ${line.value}`);
          } else if (line.type === 'PAIR' && line.key && line.value) {
            let yamlLine = `  ${line.key}: ${line.value}`;
            if (line.comment) {
              yamlLine += ` # ${line.comment}`;
            }
            yamlLines.push(yamlLine);
          }
        });
      } else {
        // Global section - no indentation
        section.lines.forEach(line => {
          if (line.type === 'COMMENT') {
            yamlLines.push(`# ${line.value}`);
          } else if (line.type === 'PAIR' && line.key && line.value) {
            let yamlLine = `${line.key}: ${line.value}`;
            if (line.comment) {
              yamlLine += ` # ${line.comment}`;
            }
            yamlLines.push(yamlLine);
          }
        });
      }
    });
    
    return yamlLines.join('\n');
  }, [sections]);

  const toIniString = useCallback(() => {
    return serializeToIni(state);
  }, [state, serializeToIni]);

  const isValid = validationIssues.every(issue => issue.type !== 'error');

  return {
    // Data state
    state,
    sections,
    loading,
    error,

    // Navigation
    selectedSectionId,
    setSelectedSectionId: handleSetSelectedSectionId,
    treeNodes,

    // Section management
    addSection,
    deleteSection,
    duplicateSection,
    renameSection,
    reorderSections,

    // Key-value management
    addKeyValue,
    updateKeyValue,
    deleteKeyValue,

    // Transformations
    sortKeysInSection,
    sortAllSections,
    stripAllComments,
    normalizeSpacing,
    trimWhitespace,
    ensureFinalNewline,
    removeFinalNewline,

    // Converters
    convertToJson,
    convertToYaml,

    // Validation
    validationIssues,
    isValid,

    // Export
    toIniString,
  };
};