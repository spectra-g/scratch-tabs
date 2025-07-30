// Test the helper functions from JsonTreeView to uncover potential bugs
// Note: These functions are not exported, so this is a focused test on the logic patterns

interface JsonNodeData {
  key: string | number;
  value: any;
  type: "object" | "array" | "string" | "number" | "boolean" | "null";
  depth: number;
  path: string;
  childCount?: number;
}

interface VisibleJsonNode extends JsonNodeData {
  isExpanded: boolean;
  isExpandable: boolean;
}

// Re-implement the helper functions for testing
const buildTree = (
  key: string | number,
  value: any,
  depth: number,
  path: string,
): JsonNodeData => {
  const node: JsonNodeData = {
    key,
    value,
    depth,
    path,
    type: Array.isArray(value)
      ? "array"
      : value === null
        ? "null"
        : typeof value === "object"
          ? "object"
          : (typeof value as any),
  };
  if (node.type === "object" || node.type === "array") {
    node.childCount = Object.keys(value).length;
  }
  return node;
};

const buildVisibleNodes = (
  nodeData: JsonNodeData,
  expandedPaths: Set<string>,
  visibleNodesList: VisibleJsonNode[],
): void => {
  const isExpandable = nodeData.type === "object" || nodeData.type === "array";
  const isExpanded = isExpandable && expandedPaths.has(nodeData.path);
  visibleNodesList.push({ ...nodeData, isExpanded, isExpandable });

  if (isExpandable && isExpanded && nodeData.value) {
    Object.entries(nodeData.value).forEach(([key, value]) => {
      const childKey = nodeData.type === "array" ? parseInt(key, 10) : key;
      const childPath = nodeData.path
        ? nodeData.type === "array"
          ? `${nodeData.path}[${childKey}]`
          : `${nodeData.path}.${childKey}`
        : nodeData.type === "array"
          ? `[${childKey}]`
          : String(childKey);
      buildVisibleNodes(
        buildTree(childKey, value, nodeData.depth + 1, childPath),
        expandedPaths,
        visibleNodesList,
      );
    });
  }
};

const getAncestorPaths = (path: string): Set<string> => {
  const ancestors = new Set<string>([""]); // Include root
  if (!path) return ancestors;

  // Improved splitting for paths like a.b[0].c
  const segments = path.match(/[^.[\]]+/g) || [];
  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    const part = segments[i];
    const isArrayIndex = /^\d+$/.test(part);
    if (i === 0 && !isArrayIndex) {
      currentPath = part;
    } else if (isArrayIndex) {
      currentPath = currentPath ? `${currentPath}[${part}]` : `[${part}]`;
    } else {
      currentPath = currentPath ? `${currentPath}.${part}` : part;
    }
    // Add ancestor path *before* the final segment
    if (i < segments.length - 1) {
      ancestors.add(currentPath);
    }
  }
  return ancestors;
};

const findAllMatches = (
  nodeData: JsonNodeData,
  searchTerm: string,
  matchedPaths: Set<string>,
): void => {
  const lowerSearchTerm = searchTerm.toLowerCase();
  const keyMatch = String(nodeData.key).toLowerCase().includes(lowerSearchTerm);
  const valueMatch =
    nodeData.type !== "object" &&
    nodeData.type !== "array" &&
    String(nodeData.value).toLowerCase().includes(lowerSearchTerm);

  if (keyMatch || valueMatch) {
    // Add this node and all its ancestors to the matched paths
    const ancestors = getAncestorPaths(nodeData.path);
    ancestors.forEach((ancestorPath) => matchedPaths.add(ancestorPath));
    matchedPaths.add(nodeData.path);
  }

  // Recursively search in children regardless of expansion state
  if (
    (nodeData.type === "object" || nodeData.type === "array") &&
    nodeData.value
  ) {
    Object.entries(nodeData.value).forEach(([key, value]) => {
      const childKey = nodeData.type === "array" ? parseInt(key, 10) : key;
      const childPath = nodeData.path
        ? nodeData.type === "array"
          ? `${nodeData.path}[${childKey}]`
          : `${nodeData.path}.${childKey}`
        : nodeData.type === "array"
          ? `[${childKey}]`
          : String(childKey);
      const childNode = buildTree(
        childKey,
        value,
        nodeData.depth + 1,
        childPath,
      );
      findAllMatches(childNode, searchTerm, matchedPaths);
    });
  }
};

const evaluateJsonPath = (
  data: any,
  path: string,
): { value: any } | { error: string } => {
  if (!path.trim()) return { value: data };
  try {
    let current: any = data;
    const parts = path.match(/[^.[\]]+/g) || [];
    for (const part of parts) {
      if (current === null || typeof current !== "object")
        return {
          error: `Cannot access property "${part}" on non-object/array value.`,
        };
      const index = parseInt(part, 10);
      if (Array.isArray(current) && !isNaN(index)) {
        if (index >= 0 && index < current.length) current = current[index];
        else
          return {
            error: `Index ${index} out of bounds for path segment "${part}".`,
          };
      } else if (typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return { error: `Path segment "${part}" not found or invalid.` };
      }
    }
    return { value: current };
  } catch (err: any) {
    return { error: err.message || "Invalid path or error during evaluation." };
  }
};

describe('JsonTreeView Helper Functions', () => {
  describe('buildTree', () => {
    it('should build correct node for primitive values', () => {
      const stringNode = buildTree('name', 'John', 1, 'name');
      expect(stringNode).toEqual({
        key: 'name',
        value: 'John',
        type: 'string',
        depth: 1,
        path: 'name'
      });

      const numberNode = buildTree('age', 30, 1, 'age');
      expect(numberNode).toEqual({
        key: 'age',
        value: 30,
        type: 'number',
        depth: 1,
        path: 'age'
      });
    });

    it('should build correct node for objects with childCount', () => {
      const objectNode = buildTree('user', { name: 'John', age: 30 }, 0, 'user');
      expect(objectNode).toEqual({
        key: 'user',
        value: { name: 'John', age: 30 },
        type: 'object',
        depth: 0,
        path: 'user',
        childCount: 2
      });
    });

    it('should build correct node for arrays with childCount', () => {
      const arrayNode = buildTree('items', [1, 2, 3], 0, 'items');
      expect(arrayNode).toEqual({
        key: 'items',
        value: [1, 2, 3],
        type: 'array',
        depth: 0,
        path: 'items',
        childCount: 3
      });
    });

    it('should handle null values correctly', () => {
      const nullNode = buildTree('data', null, 1, 'data');
      expect(nullNode).toEqual({
        key: 'data',
        value: null,
        type: 'null',
        depth: 1,
        path: 'data'
      });
    });
  });

  describe('getAncestorPaths', () => {
    it('should return empty set for empty path', () => {
      const ancestors = getAncestorPaths('');
      expect(ancestors).toEqual(new Set(['']));
    });

    it('should return correct ancestors for simple object path', () => {
      const ancestors = getAncestorPaths('user.name');
      expect(ancestors).toEqual(new Set(['', 'user']));
    });

    it('should return correct ancestors for nested object path', () => {
      const ancestors = getAncestorPaths('user.profile.name');
      expect(ancestors).toEqual(new Set(['', 'user', 'user.profile']));
    });

    it('should return correct ancestors for array index path', () => {
      const ancestors = getAncestorPaths('users[0]');
      expect(ancestors).toEqual(new Set(['', 'users']));
    });

    it('should return correct ancestors for mixed array/object path', () => {
      const ancestors = getAncestorPaths('users[0].name');
      expect(ancestors).toEqual(new Set(['', 'users', 'users[0]']));
    });

    it('should return correct ancestors for complex nested path', () => {
      const ancestors = getAncestorPaths('data.users[0].profile.settings');
      expect(ancestors).toEqual(new Set(['', 'data', 'data.users', 'data.users[0]', 'data.users[0].profile']));
    });

    it('should handle root array access', () => {
      const ancestors = getAncestorPaths('[0]');
      expect(ancestors).toEqual(new Set(['']));
    });

    it('should handle nested arrays', () => {
      const ancestors = getAncestorPaths('matrix[0][1]');
      expect(ancestors).toEqual(new Set(['', 'matrix', 'matrix[0]']));
    });
  });

  describe('evaluateJsonPath', () => {
    const testData = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'Boston'
      },
      hobbies: ['reading', 'coding'],
      matrix: [[1, 2], [3, 4]],
      nullValue: null
    };

    it('should return root data for empty path', () => {
      const result = evaluateJsonPath(testData, '');
      expect(result).toEqual({ value: testData });
    });

    it('should evaluate simple property paths', () => {
      const result = evaluateJsonPath(testData, 'name');
      expect(result).toEqual({ value: 'John' });
    });

    it('should evaluate nested object paths', () => {
      const result = evaluateJsonPath(testData, 'address.city');
      expect(result).toEqual({ value: 'Boston' });
    });

    it('should evaluate array index paths', () => {
      const result = evaluateJsonPath(testData, 'hobbies[0]');
      expect(result).toEqual({ value: 'reading' });
    });

    it('should evaluate nested array paths', () => {
      const result = evaluateJsonPath(testData, 'matrix[1][0]');
      expect(result).toEqual({ value: 3 });
    });

    it('should handle null values', () => {
      const result = evaluateJsonPath(testData, 'nullValue');
      expect(result).toEqual({ value: null });
    });

    it('should return error for non-existent properties', () => {
      const result = evaluateJsonPath(testData, 'nonexistent');
      expect(result).toEqual({ error: 'Path segment "nonexistent" not found or invalid.' });
    });

    it('should return error for out-of-bounds array access', () => {
      const result = evaluateJsonPath(testData, 'hobbies[10]');
      expect(result).toEqual({ error: 'Index 10 out of bounds for path segment "10".' });
    });

    it('should return error when accessing property on primitive', () => {
      const result = evaluateJsonPath(testData, 'name.length');
      expect(result).toEqual({ error: 'Cannot access property "length" on non-object/array value.' });
    });

    it('should return error for negative array indices', () => {
      const result = evaluateJsonPath(testData, 'hobbies[-1]');
      expect(result).toEqual({ error: 'Index -1 out of bounds for path segment "-1".' });
    });
  });

  describe('findAllMatches', () => {
    const testData = {
      name: 'John',
      email: 'john@example.com',
      profile: {
        username: 'john_doe',
        settings: {
          theme: 'dark',
          notifications: true
        }
      },
      tags: ['user', 'admin'],
      metadata: {
        lastLogin: '2024-01-01',
        preferences: {
          language: 'en'
        }
      }
    };

    it('should find matches by key name', () => {
      const rootNode = buildTree('', testData, 0, '');
      const matchedPaths = new Set<string>();
      
      findAllMatches(rootNode, 'name', matchedPaths);
      
      expect(matchedPaths.has('name')).toBe(true);
      expect(matchedPaths.has('profile.username')).toBe(true);
      expect(matchedPaths.has('')).toBe(true); // Root should be included
      expect(matchedPaths.has('profile')).toBe(true); // Ancestors should be included
    });

    it('should find matches by value', () => {
      const rootNode = buildTree('', testData, 0, '');
      const matchedPaths = new Set<string>();
      
      findAllMatches(rootNode, 'john', matchedPaths);
      
      expect(matchedPaths.has('name')).toBe(true); // 'John' contains 'john'
      expect(matchedPaths.has('email')).toBe(true); // 'john@example.com' contains 'john'
      expect(matchedPaths.has('profile.username')).toBe(true); // 'john_doe' contains 'john'
    });

    it('should be case insensitive', () => {
      const rootNode = buildTree('', testData, 0, '');
      const matchedPaths = new Set<string>();
      
      findAllMatches(rootNode, 'JOHN', matchedPaths);
      
      expect(matchedPaths.has('name')).toBe(true);
      expect(matchedPaths.has('email')).toBe(true);
      expect(matchedPaths.has('profile.username')).toBe(true);
    });

    it('should include all ancestor paths when match is found', () => {
      const rootNode = buildTree('', testData, 0, '');
      const matchedPaths = new Set<string>();
      
      findAllMatches(rootNode, 'language', matchedPaths);
      
      expect(matchedPaths.has('metadata.preferences.language')).toBe(true);
      expect(matchedPaths.has('metadata.preferences')).toBe(true);
      expect(matchedPaths.has('metadata')).toBe(true);
      expect(matchedPaths.has('')).toBe(true);
    });

    it('should find matches in array elements', () => {
      const rootNode = buildTree('', testData, 0, '');
      const matchedPaths = new Set<string>();
      
      findAllMatches(rootNode, 'admin', matchedPaths);
      
      expect(matchedPaths.has('tags[1]')).toBe(true);
      expect(matchedPaths.has('tags')).toBe(true);
      expect(matchedPaths.has('')).toBe(true);
    });

    it('should not match against object/array values', () => {
      const rootNode = buildTree('', { users: [{ name: 'test' }] }, 0, '');
      const matchedPaths = new Set<string>();
      
      // Should not match the object itself, only its contents
      findAllMatches(rootNode, 'object', matchedPaths);
      
      expect(matchedPaths.size).toBe(0);
    });

    it('should handle deeply nested structures', () => {
      const deepData = {
        level1: {
          level2: {
            level3: {
              level4: {
                target: 'found'
              }
            }
          }
        }
      };
      
      const rootNode = buildTree('', deepData, 0, '');
      const matchedPaths = new Set<string>();
      
      findAllMatches(rootNode, 'found', matchedPaths);
      
      expect(matchedPaths.has('level1.level2.level3.level4.target')).toBe(true);
      expect(matchedPaths.has('level1.level2.level3.level4')).toBe(true);
      expect(matchedPaths.has('level1.level2.level3')).toBe(true);
      expect(matchedPaths.has('level1.level2')).toBe(true);
      expect(matchedPaths.has('level1')).toBe(true);
      expect(matchedPaths.has('')).toBe(true);
    });
  });

  describe('buildVisibleNodes - potential expansion bugs', () => {
    const testData = {
      users: [
        { name: 'John', active: true },
        { name: 'Jane', active: false }
      ],
      config: {
        theme: 'dark'
      }
    };

    it('should only show root level when nothing is expanded', () => {
      const rootNode = buildTree('', testData, 0, '');
      const expandedPaths = new Set<string>(['']); // Only root expanded
      const visibleNodes: VisibleJsonNode[] = [];
      
      buildVisibleNodes(rootNode, expandedPaths, visibleNodes);
      
      expect(visibleNodes).toHaveLength(3); // root, users, config
      expect(visibleNodes.map(n => n.path)).toEqual(['', 'users', 'config']);
    });

    it('should show array children when array is expanded', () => {
      const rootNode = buildTree('', testData, 0, '');
      const expandedPaths = new Set<string>(['', 'users']);
      const visibleNodes: VisibleJsonNode[] = [];
      
      buildVisibleNodes(rootNode, expandedPaths, visibleNodes);
      
      expect(visibleNodes.find(n => n.path === 'users[0]')).toBeTruthy();
      expect(visibleNodes.find(n => n.path === 'users[1]')).toBeTruthy();
    });

    it('should show deeply nested nodes when all ancestors are expanded', () => {
      const rootNode = buildTree('', testData, 0, '');
      const expandedPaths = new Set<string>(['', 'users', 'users[0]']);
      const visibleNodes: VisibleJsonNode[] = [];
      
      buildVisibleNodes(rootNode, expandedPaths, visibleNodes);
      
      expect(visibleNodes.find(n => n.path === 'users[0].name')).toBeTruthy();
      expect(visibleNodes.find(n => n.path === 'users[0].active')).toBeTruthy();
    });

    it('should NOT show child nodes when parent is collapsed', () => {
      const rootNode = buildTree('', testData, 0, '');
      const expandedPaths = new Set<string>(['', 'users[0]']); // Note: 'users' is NOT expanded
      const visibleNodes: VisibleJsonNode[] = [];
      
      buildVisibleNodes(rootNode, expandedPaths, visibleNodes);
      
      // Should not see users[0] children because users itself is not expanded
      expect(visibleNodes.find(n => n.path === 'users[0].name')).toBeFalsy();
      expect(visibleNodes.find(n => n.path === 'users[0].active')).toBeFalsy();
    });

    it('should handle mixed expansion states correctly', () => {
      const rootNode = buildTree('', testData, 0, '');
      const expandedPaths = new Set<string>(['', 'users', 'users[0]', 'config']);
      const visibleNodes: VisibleJsonNode[] = [];
      
      buildVisibleNodes(rootNode, expandedPaths, visibleNodes);
      
      // Should see users[0] children but NOT users[1] children
      expect(visibleNodes.find(n => n.path === 'users[0].name')).toBeTruthy();
      expect(visibleNodes.find(n => n.path === 'users[1].name')).toBeFalsy();
      
      // Should see config children
      expect(visibleNodes.find(n => n.path === 'config.theme')).toBeTruthy();
    });

    it('should correctly set isExpandable and isExpanded flags', () => {
      const rootNode = buildTree('', testData, 0, '');
      const expandedPaths = new Set<string>(['', 'users']);
      const visibleNodes: VisibleJsonNode[] = [];
      
      buildVisibleNodes(rootNode, expandedPaths, visibleNodes);
      
      const usersNode = visibleNodes.find(n => n.path === 'users');
      expect(usersNode?.isExpandable).toBe(true);
      expect(usersNode?.isExpanded).toBe(true);
      
      const configNode = visibleNodes.find(n => n.path === 'config');
      expect(configNode?.isExpandable).toBe(true);
      expect(configNode?.isExpanded).toBe(false);
      
      const userNode = visibleNodes.find(n => n.path === 'users[0]');
      expect(userNode?.isExpandable).toBe(true);
      expect(userNode?.isExpanded).toBe(false);
    });

    it('should handle empty objects and arrays', () => {
      const emptyData = {
        emptyObject: {},
        emptyArray: [],
        value: 'test'
      };
      
      const rootNode = buildTree('', emptyData, 0, '');
      const expandedPaths = new Set<string>(['', 'emptyObject', 'emptyArray']);
      const visibleNodes: VisibleJsonNode[] = [];
      
      buildVisibleNodes(rootNode, expandedPaths, visibleNodes);
      
      const emptyObjectNode = visibleNodes.find(n => n.path === 'emptyObject');
      expect(emptyObjectNode?.isExpandable).toBe(true);
      expect(emptyObjectNode?.isExpanded).toBe(true);
      expect(emptyObjectNode?.childCount).toBe(0);
      
      const emptyArrayNode = visibleNodes.find(n => n.path === 'emptyArray');
      expect(emptyArrayNode?.isExpandable).toBe(true);
      expect(emptyArrayNode?.isExpanded).toBe(true);
      expect(emptyArrayNode?.childCount).toBe(0);
    });
  });
});