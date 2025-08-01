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
  if (!content.trim()) {
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
      if (doc.errors.length > 0) {
        throw new Error(`Document ${index + 1}: ${doc.errors[0].message}`);
      }

      const data = doc.toJS();
      const nodes: YamlNode[] = [];
      
      // Extract anchors first by walking the document directly
      if (doc.contents) {
        extractAnchorsFromDocument(doc, anchors, content);
      }
      
      // Extract position information and build node tree
      if (doc.contents) {
        buildNodeTreeFromContents(doc.contents, data, '', nodes, anchors, content);
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

      if (doc.errors.length > 0) {
        throw new Error(doc.errors[0].message);
      }

      const data = doc.toJS();
      const nodes: YamlNode[] = [];
      
      // Extract anchors first by walking the document directly
      if (doc.contents) {
        extractAnchorsFromDocument(doc, anchors, content);
      }
      
      if (doc.contents) {
        buildNodeTreeFromContents(doc.contents, data, '', nodes, anchors, content);
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
      throw new Error(
        fallbackError instanceof Error 
          ? fallbackError.message 
          : 'Failed to parse YAML content'
      );
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
      const value = item.value.toJS ? item.value.toJS() : item.value.value;
      
      const line = item.range ? getLineFromPos(content, item.range[0]) : 1;
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
        // Handle array items
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
          yamlNode.children.push(childNode);
        });
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
          if (childNode) {
            yamlNode.children!.push(childNode);
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
        if (childNode) {
          yamlNode.children!.push(childNode);
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
  let nodeValue = value.toJS();

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
    buildNodeTree(value, path, yamlNode.children, anchors, key, content);
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