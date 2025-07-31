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
      keepCstNodes: true,
    });

    yamlDocuments.forEach((doc, index) => {
      if (doc.errors.length > 0) {
        throw new Error(`Document ${index + 1}: ${doc.errors[0].message}`);
      }

      const data = doc.toJS();
      const nodes: YamlNode[] = [];
      
      // Extract position information and build node tree
      if (doc.contents) {
        buildNodeTree(doc.contents, '', nodes, anchors);
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
        keepCstNodes: true,
      });

      if (doc.errors.length > 0) {
        throw new Error(doc.errors[0].message);
      }

      const data = doc.toJS();
      const nodes: YamlNode[] = [];
      
      if (doc.contents) {
        buildNodeTree(doc.contents, '', nodes, anchors);
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
 * Recursively build the node tree from YAML AST
 */
function buildNodeTree(
  node: any,
  basePath: string,
  nodes: YamlNode[],
  anchors: Map<string, AnchorInfo>,
  parentKey?: string
): void {
  if (!node) return;

  const nodeId = `${basePath}-${nodes.length}`;
  const line = node.range ? getLineFromPos('', node.range[0]) : 1;
  const endLine = node.range ? getLineFromPos('', node.range[1]) : line;

  // Handle different node types
  if (node.type === 'MAP') {
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
          const childNode = createNodeFromItem(item, childPath, key, anchors);
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
        const childNode = createNodeFromValue(item, childPath, `[${index}]`, anchors);
        if (childNode) {
          yamlNode.children!.push(childNode);
        }
      });
    }

    nodes.push(yamlNode);
  } else {
    // Scalar node
    const yamlNode = createNodeFromValue(node, basePath, parentKey || 'value', anchors);
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
  anchors: Map<string, AnchorInfo>
): YamlNode | null {
  if (!item.value) return null;

  return createNodeFromValue(item.value, path, key, anchors);
}

/**
 * Create a YAML node from a value
 */
function createNodeFromValue(
  value: any,
  path: string,
  key: string,
  anchors: Map<string, AnchorInfo>
): YamlNode | null {
  if (!value) return null;

  const line = value.range ? getLineFromPos('', value.range[0]) : 1;
  const endLine = value.range ? getLineFromPos('', value.range[1]) : line;
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
    buildNodeTree(value, path, yamlNode.children, anchors, key);
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
    if (node.line === lineNumber || 
        (node.endLine && lineNumber >= node.line && lineNumber <= node.endLine)) {
      return node.path;
    }
    
    if (node.children) {
      const childPath = findNodePathByLine(node.children, lineNumber);
      if (childPath) return childPath;
    }
  }
  return null;
}