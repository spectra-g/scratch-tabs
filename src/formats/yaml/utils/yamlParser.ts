import * as YAML from 'yaml';

export interface YamlNode {
  id: string;
  path: string;
  key: string;
  value: any;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  children?: YamlNode[];
  isAnchor?: boolean;
  isAlias?: boolean;
  anchorName?: string;
  aliasName?: string;
  comment?: string;
  commentBefore?: string;
}

export interface YamlDocument {
  index: number;
  data: any;
  nodes: YamlNode[];
  startLine: number;
  endLine: number;
}

export interface AnchorInfo {
  name: string;
  definitionLine: number;
  definitionColumn?: number;
  definitionPath: string;
  value: any;
  usages: Array<{
    line: number;
    column?: number;
    path: string;
  }>;
}

export interface ParseResult {
  documents: YamlDocument[];
  anchors: Map<string, AnchorInfo>;
}

/**
 * Parse YAML content with position information and anchor/alias tracking
 */
export function parseYamlWithPositions(content: string): ParseResult {
  if (!content || !content.trim()) {
    return { documents: [], anchors: new Map() };
  }

  // Basic validation to catch obviously non-YAML content early
  const trimmedContent = content.trim();
  if (trimmedContent.length < 2) {
    return { documents: [], anchors: new Map() };
  }

  const documents: YamlDocument[] = [];
  const anchors = new Map<string, AnchorInfo>();

  try {
    // Parse all documents in the YAML content
    const yamlDocuments = YAML.parseAllDocuments(content, {
      keepSourceTokens: true,
    });

    yamlDocuments.forEach((doc, index) => {
      if (!doc) {
        throw new Error(`Document ${index + 1}: Document is null or undefined`);
      }

      if (doc.errors && doc.errors.length > 0) {
        throw new Error(`Document ${index + 1}: ${doc.errors[0].message}`);
      }

      let data;
      try {
        data = doc.toJS();
      } catch (error) {
        throw new Error(`Document ${index + 1}: Failed to convert to JS - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const nodes: YamlNode[] = [];

      // Extract anchors first by walking the document directly
      if (doc.contents) {
        try {
          extractAnchorsFromDocument(doc, anchors, content);
        } catch (error) {
          // Continue without anchors if extraction fails
          console.warn(`Failed to extract anchors from document ${index + 1}:`, error);
        }
      }

      // Extract position information and build node tree
      if (doc.contents) {
        try {
          buildNodeTreeFromContents(doc.contents, data, '', nodes, anchors, content);
        } catch (error) {
          // Continue with empty nodes if tree building fails
          console.warn(`Failed to build node tree for document ${index + 1}:`, error);
        }
      }

      // Calculate document boundaries
      const startLine = doc.range ? doc.range[0] : 1;
      const endLine = doc.range ? doc.range[1] : content.split('\n').length;

      documents.push({
        index,
        data,
        nodes,
        startLine: getLineFromPos(content, startLine),
        endLine: getLineFromPos(content, endLine),
      });
    });

    return { documents, anchors };
  } catch (error) {
    // Fallback: try to parse as single document
    try {
      const doc = YAML.parseDocument(content, {
        keepSourceTokens: true,
      });

      if (!doc) {
        throw new Error('Failed to create YAML document');
      }

      if (doc.errors && doc.errors.length > 0) {
        throw new Error(doc.errors[0].message);
      }

      let data;
      try {
        data = doc.toJS();
      } catch (jsError) {
        throw new Error(`Failed to convert document to JS: ${jsError instanceof Error ? jsError.message : 'Unknown error'}`);
      }

      const nodes: YamlNode[] = [];

      // Extract anchors first by walking the document directly
      if (doc.contents) {
        try {
          extractAnchorsFromDocument(doc, anchors, content);
        } catch (anchorError) {
          // Continue without anchors if extraction fails
          console.warn('Failed to extract anchors:', anchorError);
        }
      }

      if (doc.contents) {
        try {
          buildNodeTreeFromContents(doc.contents, data, '', nodes, anchors, content);
        } catch (nodeError) {
          // Continue with empty nodes if tree building fails
          console.warn('Failed to build node tree:', nodeError);
        }
      }

      documents.push({
        index: 0,
        data,
        nodes,
        startLine: 1,
        endLine: content.split('\n').length,
      });

      return { documents, anchors };
    } catch (fallbackError) {
      const errorMessage = fallbackError instanceof Error
        ? fallbackError.message
        : 'Failed to parse YAML content';

      // Also include the original error for better debugging
      const originalErrorMessage = error instanceof Error ? error.message : 'Unknown original error';

      throw new Error(`${errorMessage} (Original error: ${originalErrorMessage})`);
    }
  }
}

/**
 * Get the type of a value for YAML node
 */
function getValueType(value: any): YamlNode['type'] {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

/**
 * Extract anchors from a YAML document using the visit method
 */
function extractAnchorsFromDocument(
  doc: any,
  anchors: Map<string, AnchorInfo>,
  content: string
): void {
  if (!doc || !doc.contents) return;

  // Walk through the document contents directly
  function walkDocumentNode(node: any, path: string): void {
    if (!node) return;

    // Check for anchor
    if (node.anchor) {
      const line = node.range ? getLineFromPos(content, node.range[0]) : 1;
      anchors.set(node.anchor, {
        name: node.anchor,
        definitionLine: line,
        definitionPath: path,
        value: node.toJS(doc),
        usages: [],
      });
    }

    // Check for alias
    if (node.type === 'ALIAS' && node.source) {
      const line = node.range ? getLineFromPos(content, node.range[0]) : 1;
      const anchorInfo = anchors.get(node.source);
      if (anchorInfo) {
        anchorInfo.usages.push({ line, path });
      }
    }

    // Recursively walk items
    if (node.items) {
      node.items.forEach((item: any, index: number) => {
        if (item.key && item.value) {
          const key = item.key.value || `item_${index}`;
          const childPath = path ? `${path}.${key}` : key;
          walkDocumentNode(item.value, childPath);
        }
      });
    }
  }

  walkDocumentNode(doc.contents, '');
}

/**
 * Build node tree from document contents
 */
function buildNodeTreeFromContents(
  contents: any,
  data: any,
  basePath: string,
  nodes: YamlNode[],
  anchors: Map<string, AnchorInfo>,
  content: string
): void {
  if (!contents || !contents.items) return;

  // Process each item in the contents
  contents.items.forEach((item: any, index: number) => {
    if (item.key && item.value) {
      const key = item.key.value || item.key.source || `item_${index}`;
      const path = basePath ? `${basePath}.${key}` : key;
      // Extract value directly from the YAML AST instead of relying on doc.toJS()
      let value;
      try {
        value = item.value.toJS ? item.value.toJS() : item.value.value;
      } catch (error) {
        // Fallback to getting value from the parsed data
        const keyName = item.key.value || item.key.source || `item_${index}`;
        value = data[keyName];
      }

      // Try to get line from item range, fallback to key range
      let line = 1;
      if (item.range) {
        line = getLineFromPos(content, item.range[0]);
      } else if (item.key && item.key.range) {
        line = getLineFromPos(content, item.key.range[0]);
      }

      const endLine = item.range ? getLineFromPos(content, item.range[1]) : line;

      const yamlNode: YamlNode = {
        id: `${path}-${index}`,
        path,
        key,
        value,
        type: getValueType(value),
        line,
        endLine,
      };

      // Extract comments from the key node
      if (item.key && item.key.commentBefore) {
        yamlNode.commentBefore = item.key.commentBefore;
      }
      if (item.key && item.key.comment) {
        yamlNode.comment = item.key.comment;
      }

      // Check for anchor definition - need to check the raw YAML structure
      if (item.value && (item.value as any).anchor) {
        yamlNode.isAnchor = true;
        yamlNode.anchorName = (item.value as any).anchor;

        // Register anchor
        anchors.set((item.value as any).anchor, {
          name: (item.value as any).anchor,
          definitionLine: line,
          definitionPath: path,
          value: value,
          usages: [],
        });
      }

      // Check for alias reference
      if (item.value && item.value.type === 'ALIAS') {
        yamlNode.isAlias = true;
        yamlNode.aliasName = item.value.source;

        // Register alias usage
        const anchorInfo = anchors.get(item.value.source);
        if (anchorInfo) {
          anchorInfo.usages.push({ line, path });
        }
      }

      // Handle nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        yamlNode.children = [];
        // Recursively process nested items if they exist in the YAML structure
        if (item.value && item.value.items) {
          buildNodeTreeFromContents(item.value, value, path, yamlNode.children, anchors, content);
        }

        // Also check for aliases within the object's items
        if (item.value && item.value.items) {
          item.value.items.forEach((nestedItem: any) => {
            if (nestedItem.value && nestedItem.value.type === 'ALIAS') {
              const aliasName = nestedItem.value.source;
              const anchorInfo = anchors.get(aliasName);
              if (anchorInfo) {
                const aliasLine = nestedItem.range ? getLineFromPos(content, nestedItem.range[0]) : line;
                const aliasPath = nestedItem.key ? `${path}.${nestedItem.key.value}` : path;
                anchorInfo.usages.push({ line: aliasLine, path: aliasPath });
              }
            }
          });
        }
      } else if (Array.isArray(value)) {
        yamlNode.children = [];

        // Use AST items if available to get correct line numbers
        if (item.value && item.value.items) {
          item.value.items.forEach((seqItem: any, arrayIndex: number) => {
            const childPath = `${path}[${arrayIndex}]`;

            // Get line from sequence item range
            const itemLine = seqItem.range ? getLineFromPos(content, seqItem.range[0]) : line;
            const itemEndLine = seqItem.range ? getLineFromPos(content, seqItem.range[1]) : itemLine;

            // Get value
            let itemValue;
            try {
              itemValue = seqItem.toJS ? seqItem.toJS() : (seqItem.value !== undefined ? seqItem.value : value[arrayIndex]);
            } catch (e) {
              itemValue = value[arrayIndex];
            }

            const childNode: YamlNode = {
              id: `${childPath}-${arrayIndex}`,
              path: childPath,
              key: `[${arrayIndex}]`,
              value: itemValue,
              type: getValueType(itemValue),
              line: itemLine,
              endLine: itemEndLine,
            };

            // Handle nested structures in array
            if (typeof itemValue === 'object' && itemValue !== null) {
              childNode.children = [];
              if (seqItem.items) {
                // It's a nested map or sequence
                // We need to handle the case where seqItem is a Map (has items which are pairs)
                // or Seq (has items which are nodes)
                if (seqItem.type === 'MAP' || (!seqItem.type && seqItem.items && seqItem.items[0] && seqItem.items[0].key)) {
                  buildNodeTreeFromContents(seqItem, itemValue, childPath, childNode.children!, anchors, content);
                } else if (seqItem.type === 'SEQ') {
                  // Recursive call for nested sequence would be tricky with current function signature
                  // falling back to buildNodeTree which handles generic nodes
                  buildNodeTree(seqItem, childPath, childNode.children!, anchors, `[${arrayIndex}]`, content);
                }
              }
            }

            yamlNode.children!.push(childNode);
          });
        } else {
          // Fallback to JS value iteration if AST items not available
          value.forEach((arrayItem, arrayIndex) => {
            const childPath = `${path}[${arrayIndex}]`;
            const childNode: YamlNode = {
              id: `${childPath}-${arrayIndex}`,
              path: childPath,
              key: `[${arrayIndex}]`,
              value: arrayItem,
              type: getValueType(arrayItem),
              line: line, // Arrays items don't have individual line info in this context
              endLine: endLine,
            };
            yamlNode.children!.push(childNode);
          });
        }
      }

      nodes.push(yamlNode);
    }
  });
}

/**
 * Recursively build the node tree from YAML AST
 */
function buildNodeTree(
  node: any,
  basePath: string,
  nodes: YamlNode[],
  anchors: Map<string, AnchorInfo>,
  parentKey?: string,
  content?: string
): void {
  if (!node) return;

  const nodeId = `${basePath}-${nodes.length}`;
  const line = node.range ? getLineFromPos(content || '', node.range[0]) : 1;
  const endLine = node.range ? getLineFromPos(content || '', node.range[1]) : line;

  // Handle different node types
  if (node.type === 'MAP' || (node.items && !node.type)) {
    // Object/Map node
    const yamlNode: YamlNode = {
      id: nodeId,
      path: basePath || 'root',
      key: parentKey || 'root',
      value: node.toJS(),
      type: 'object',
      line,
      endLine,
      children: [],
    };

    // Process map items
    if (node.items) {
      node.items.forEach((item: any, index: number) => {
        if (item.key && item.value) {
          const key = item.key.value || item.key.source || `item_${index}`;
          const childPath = basePath ? `${basePath}.${key}` : key;

          // Check for anchors and aliases
          const childNode = createNodeFromItem(item, childPath, key, anchors, content);
          if (childNode && yamlNode.children) {
            yamlNode.children.push(childNode);
          }
        }
      });
    }

    nodes.push(yamlNode);
  } else if (node.type === 'SEQ') {
    // Array/Sequence node
    const yamlNode: YamlNode = {
      id: nodeId,
      path: basePath || 'root',
      key: parentKey || 'root',
      value: node.toJS(),
      type: 'array',
      line,
      endLine,
      children: [],
    };

    // Process sequence items
    if (node.items) {
      node.items.forEach((item: any, index: number) => {
        const childPath = `${basePath}[${index}]`;
        const childNode = createNodeFromValue(item, childPath, `[${index}]`, anchors, content);
        if (childNode && yamlNode.children) {
          yamlNode.children.push(childNode);
        }
      });
    }

    nodes.push(yamlNode);
  } else {
    // Scalar node
    const yamlNode = createNodeFromValue(node, basePath, parentKey || 'value', anchors, content);
    if (yamlNode) {
      nodes.push(yamlNode);
    }
  }
}

/**
 * Create a YAML node from a key-value item
 */
function createNodeFromItem(
  item: any,
  path: string,
  key: string,
  anchors: Map<string, AnchorInfo>,
  content?: string
): YamlNode | null {
  if (!item.value) return null;

  return createNodeFromValue(item.value, path, key, anchors, content);
}

/**
 * Create a YAML node from a value
 */
function createNodeFromValue(
  value: any,
  path: string,
  key: string,
  anchors: Map<string, AnchorInfo>,
  content?: string
): YamlNode | null {
  if (!value) return null;

  const line = value.range ? getLineFromPos(content || '', value.range[0]) : 1;
  const endLine = value.range ? getLineFromPos(content || '', value.range[1]) : line;
  const nodeId = `${path}-${key}`;

  // Check for anchor definition
  let isAnchor = false;
  let anchorName: string | undefined;
  if (value.anchor) {
    isAnchor = true;
    anchorName = value.anchor;

    // Register anchor
    anchors.set(anchorName, {
      name: anchorName,
      definitionLine: line,
      definitionPath: path,
      value: value.toJS(),
      usages: [],
    });
  }

  // Check for alias reference
  let isAlias = false;
  let aliasName: string | undefined;
  if (value.type === 'ALIAS') {
    isAlias = true;
    aliasName = value.source;

    // Register alias usage
    const anchorInfo = anchors.get(aliasName);
    if (anchorInfo) {
      anchorInfo.usages.push({ line, path });
    }
  }

  // Determine value type and content
  let nodeType: YamlNode['type'] = 'string';
  const nodeValue = value.toJS();

  if (value.type === 'MAP') {
    nodeType = 'object';
  } else if (value.type === 'SEQ') {
    nodeType = 'array';
  } else if (typeof nodeValue === 'number') {
    nodeType = 'number';
  } else if (typeof nodeValue === 'boolean') {
    nodeType = 'boolean';
  } else if (nodeValue === null) {
    nodeType = 'null';
  }

  const yamlNode: YamlNode = {
    id: nodeId,
    path,
    key,
    value: nodeValue,
    type: nodeType,
    line,
    endLine,
    isAnchor,
    isAlias,
    anchorName,
    aliasName,
  };

  // Recursively process children for complex types
  if (value.type === 'MAP' || value.type === 'SEQ') {
    yamlNode.children = [];
    buildNodeTree(value, path, yamlNode.children!, anchors, key, content);
  }

  return yamlNode;
}

/**
 * Convert character position to line number
 */
function getLineFromPos(content: string, pos: number): number {
  if (!content) return 1;
  return content.substring(0, pos).split('\n').length;
}

/**
 * Find a node by its path
 */
export function findNodeByPath(nodes: YamlNode[], targetPath: string): YamlNode | null {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return node;
    }

    if (node.children) {
      const childNode = findNodeByPath(node.children, targetPath);
      if (childNode) return childNode;
    }
  }
  return null;
}

/**
 * Find the path of a node at a specific line
 */
export function findNodePathByLine(nodes: YamlNode[], lineNumber: number): string | null {
  for (const node of nodes) {
    // First check children for more specific matches
    if (node.children) {
      const childPath = findNodePathByLine(node.children, lineNumber);
      if (childPath) return childPath;
    }

    // Then check if this node matches
    if (node.line === lineNumber ||
      (node.endLine && lineNumber >= node.line && lineNumber <= node.endLine)) {
      return node.path;
    }
  }
  return null;
}