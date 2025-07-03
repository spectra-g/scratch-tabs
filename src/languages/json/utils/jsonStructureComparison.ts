export interface ComparisonOptions {
  arraySampleCount?: number;
  strictArrayLength?: boolean;
  caseSensitiveKeys?: boolean;
}

export interface DiffItem {
  path: string;
  type: 'MISSING_KEY_LEFT' | 'MISSING_KEY_RIGHT' | 'TYPE_MISMATCH' | 'ARRAY_LENGTH_MISMATCH' | 'POLYMORPHIC_ARRAY';
  message: string;
  leftValueType?: string;
  rightValueType?: string;
  leftValue?: any;
  rightValue?: any;
}

export interface DiffTreeNode {
  path: string;
  name: string;
  type: 'object' | 'array' | 'primitive';
  hasDiff: boolean;
  diffType?: DiffItem['type'];
  children?: DiffTreeNode[];
  leftValue?: any;
  rightValue?: any;
  leftValueType?: string;
  rightValueType?: string;
}

export interface ComparisonResult {
  matches: boolean;
  diffTree: DiffTreeNode;
  diffList: DiffItem[];
  summary: {
    totalDifferences: number;
    missingKeysLeft: number;
    missingKeysRight: number;
    typeMismatches: number;
    arrayLengthMismatches: number;
    polymorphicArrays: number;
  };
}

const DEFAULT_OPTIONS: Required<ComparisonOptions> = {
  arraySampleCount: 3,
  strictArrayLength: false,
  caseSensitiveKeys: true,
};

/**
 * Get the type of a value as a string
 */
function getValueType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return typeof value;
}

/**
 * Check if an array has uniform structure (all elements have the same structure)
 */
function hasUniformArrayStructure(arr: any[], sampleCount: number): boolean {
  if (arr.length === 0) return true;
  if (arr.length === 1) return true;

  const sampleSize = Math.min(sampleCount, arr.length);
  const firstElement = arr[0];
  const firstElementType = getValueType(firstElement);

  // Check if all sampled elements have the same type
  for (let i = 1; i < sampleSize; i++) {
    const elementType = getValueType(arr[i]);
    if (elementType !== firstElementType) {
      return false;
    }
  }

  // If they're objects, check if they have the same keys
  if (firstElementType === 'object' && firstElement !== null) {
    const firstKeys = Object.keys(firstElement).sort();
    for (let i = 1; i < sampleSize; i++) {
      const element = arr[i];
      if (element === null || typeof element !== 'object') {
        return false;
      }
      const elementKeys = Object.keys(element).sort();
      if (elementKeys.length !== firstKeys.length) {
        return false;
      }
      for (let j = 0; j < firstKeys.length; j++) {
        if (firstKeys[j] !== elementKeys[j]) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Compare two values structurally
 */
function compareValues(
  left: any,
  right: any,
  path: string,
  options: Required<ComparisonOptions>,
  diffList: DiffItem[]
): DiffTreeNode {
  const leftType = getValueType(left);
  const rightType = getValueType(right);

  // Type mismatch
  if (leftType !== rightType) {
    const diffItem: DiffItem = {
      path,
      type: 'TYPE_MISMATCH',
      message: `Type mismatch: Source is '${leftType}', Target is '${rightType}'.`,
      leftValueType: leftType,
      rightValueType: rightType,
      leftValue: left,
      rightValue: right,
    };
    diffList.push(diffItem);

    return {
      path,
      name: path.split('/').pop() || '',
      type: leftType === 'object' || leftType === 'array' ? leftType : 'primitive',
      hasDiff: true,
      diffType: 'TYPE_MISMATCH',
      leftValue: left,
      rightValue: right,
      leftValueType: leftType,
      rightValueType: rightType,
    };
  }

  // Handle null values
  if (leftType === 'null') {
    return {
      path,
      name: path.split('/').pop() || '',
      type: 'primitive',
      hasDiff: false,
      leftValue: left,
      rightValue: right,
      leftValueType: leftType,
      rightValueType: rightType,
    };
  }

  // Handle primitives
  if (leftType !== 'object' && leftType !== 'array') {
    return {
      path,
      name: path.split('/').pop() || '',
      type: 'primitive',
      hasDiff: false,
      leftValue: left,
      rightValue: right,
      leftValueType: leftType,
      rightValueType: rightType,
    };
  }

  // Handle arrays
  if (leftType === 'array') {
    const leftArray = left as any[];
    const rightArray = right as any[];

    // Check array length if strict mode is enabled
    if (options.strictArrayLength && leftArray.length !== rightArray.length) {
      const diffItem: DiffItem = {
        path,
        type: 'ARRAY_LENGTH_MISMATCH',
        message: `Array length mismatch: Source has ${leftArray.length} elements, Target has ${rightArray.length} elements.`,
        leftValueType: leftType,
        rightValueType: rightType,
        leftValue: leftArray.length,
        rightValue: rightArray.length,
      };
      diffList.push(diffItem);

      return {
        path,
        name: path.split('/').pop() || '',
        type: 'array' as const,
        hasDiff: true,
        diffType: 'ARRAY_LENGTH_MISMATCH',
        leftValue: leftArray.length,
        rightValue: rightArray.length,
        leftValueType: leftType,
        rightValueType: rightType,
      };
    }

    // Check for polymorphic arrays
    if (!hasUniformArrayStructure(leftArray, options.arraySampleCount)) {
      const diffItem: DiffItem = {
        path,
        type: 'POLYMORPHIC_ARRAY',
        message: `Polymorphic array found at path ${path}. Structural comparison is limited.`,
        leftValueType: leftType,
        rightValueType: rightType,
        leftValue: leftArray,
        rightValue: rightArray,
      };
      diffList.push(diffItem);

      return {
        path,
        name: path.split('/').pop() || '',
        type: 'array' as const,
        hasDiff: true,
        diffType: 'POLYMORPHIC_ARRAY',
        leftValue: leftArray,
        rightValue: rightArray,
        leftValueType: leftType,
        rightValueType: rightType,
      };
    }

    // Compare array elements (use the first element as representative)
    const children: DiffTreeNode[] = [];
    const maxLength = Math.max(leftArray.length, rightArray.length);
    const sampleSize = Math.min(options.arraySampleCount, maxLength);

    for (let i = 0; i < sampleSize; i++) {
      const leftElement = i < leftArray.length ? leftArray[i] : undefined;
      const rightElement = i < rightArray.length ? rightArray[i] : undefined;
      const elementPath = `${path}/[${i}]`;

      if (leftElement !== undefined && rightElement !== undefined) {
        const childNode = compareValues(leftElement, rightElement, elementPath, options, diffList);
        children.push(childNode);
      } else if (leftElement !== undefined) {
        // Missing in right
        const diffItem: DiffItem = {
          path: elementPath,
          type: 'MISSING_KEY_RIGHT',
          message: `Array element at index ${i} is missing in the Target JSON.`,
          leftValueType: getValueType(leftElement),
          rightValueType: 'undefined',
          leftValue: leftElement,
          rightValue: undefined,
        };
        diffList.push(diffItem);

        const elementType = getValueType(leftElement);
        const nodeType: 'object' | 'array' | 'primitive' = 
          elementType === 'object' ? 'object' : 
          elementType === 'array' ? 'array' : 'primitive';

        children.push({
          path: elementPath,
          name: `[${i}]`,
          type: nodeType,
          hasDiff: true,
          diffType: 'MISSING_KEY_RIGHT',
          leftValue: leftElement,
          rightValue: undefined,
          leftValueType: getValueType(leftElement),
          rightValueType: 'undefined',
        });
      } else if (rightElement !== undefined) {
        // Missing in left
        const diffItem: DiffItem = {
          path: elementPath,
          type: 'MISSING_KEY_LEFT',
          message: `Array element at index ${i} is missing in the Source JSON.`,
          leftValueType: 'undefined',
          rightValueType: getValueType(rightElement),
          leftValue: undefined,
          rightValue: rightElement,
        };
        diffList.push(diffItem);

        const elementType = getValueType(rightElement);
        const nodeType: 'object' | 'array' | 'primitive' = 
          elementType === 'object' ? 'object' : 
          elementType === 'array' ? 'array' : 'primitive';

        children.push({
          path: elementPath,
          name: `[${i}]`,
          type: nodeType,
          hasDiff: true,
          diffType: 'MISSING_KEY_LEFT',
          leftValue: undefined,
          rightValue: rightElement,
          leftValueType: 'undefined',
          rightValueType: getValueType(rightElement),
        });
      }
    }

    const hasDiff = children.some(child => child.hasDiff);

    return {
      path,
      name: path.split('/').pop() || '',
      type: 'array' as const,
      hasDiff,
      children,
      leftValue: leftArray,
      rightValue: rightArray,
      leftValueType: leftType,
      rightValueType: rightType,
    };
  }

  // Handle objects
  const leftObj = left as Record<string, any>;
  const rightObj = right as Record<string, any>;

  const leftKeys = Object.keys(leftObj);
  const rightKeys = Object.keys(rightObj);

  // Normalize keys if case-insensitive comparison is enabled
  const normalizeKey = (key: string) => options.caseSensitiveKeys ? key : key.toLowerCase();
  const leftKeyMap = new Map(leftKeys.map(key => [normalizeKey(key), key]));
  const rightKeyMap = new Map(rightKeys.map(key => [normalizeKey(key), key]));

  const allKeys = new Set([...leftKeyMap.keys(), ...rightKeyMap.keys()]);
  const children: DiffTreeNode[] = [];

  for (const normalizedKey of allKeys) {
    const leftKey = leftKeyMap.get(normalizedKey);
    const rightKey = rightKeyMap.get(normalizedKey);
    const displayKey = leftKey || rightKey || normalizedKey;
    const keyPath = path === '/' ? `/${displayKey}` : `${path}/${displayKey}`;

    if (leftKey && rightKey) {
      // Key exists in both objects
      const childNode = compareValues(leftObj[leftKey], rightObj[rightKey], keyPath, options, diffList);
      children.push(childNode);
    } else if (leftKey) {
      // Key missing in right object
      const diffItem: DiffItem = {
        path: keyPath,
        type: 'MISSING_KEY_RIGHT',
        message: `Key '${displayKey}' is missing in the Target JSON.`,
        leftValueType: getValueType(leftObj[leftKey]),
        rightValueType: 'undefined',
        leftValue: leftObj[leftKey],
        rightValue: undefined,
      };
      diffList.push(diffItem);

        const leftValueType = getValueType(leftObj[leftKey]);
        const leftNodeType: 'object' | 'array' | 'primitive' = 
          leftValueType === 'object' ? 'object' : 
          leftValueType === 'array' ? 'array' : 'primitive';

        children.push({
          path: keyPath,
          name: displayKey,
          type: leftNodeType,
          hasDiff: true,
          diffType: 'MISSING_KEY_RIGHT',
          leftValue: leftObj[leftKey],
          rightValue: undefined,
          leftValueType: getValueType(leftObj[leftKey]),
          rightValueType: 'undefined',
        });
    } else if (rightKey) {
      // Key missing in left object
      const diffItem: DiffItem = {
        path: keyPath,
        type: 'MISSING_KEY_LEFT',
        message: `Key '${displayKey}' is missing in the Source JSON.`,
        leftValueType: 'undefined',
        rightValueType: getValueType(rightObj[rightKey]),
        leftValue: undefined,
        rightValue: rightObj[rightKey],
      };
      diffList.push(diffItem);

        const rightValueType = getValueType(rightObj[rightKey]);
        const rightNodeType: 'object' | 'array' | 'primitive' = 
          rightValueType === 'object' ? 'object' : 
          rightValueType === 'array' ? 'array' : 'primitive';

        children.push({
          path: keyPath,
          name: displayKey,
          type: rightNodeType,
          hasDiff: true,
          diffType: 'MISSING_KEY_LEFT',
          leftValue: undefined,
          rightValue: rightObj[rightKey],
          leftValueType: 'undefined',
          rightValueType: getValueType(rightObj[rightKey]),
        });
    }
  }

  const hasDiff = children.some(child => child.hasDiff);

  return {
    path,
    name: path.split('/').pop() || '',
    type: 'object',
    hasDiff,
    children,
    leftValue: leftObj,
    rightValue: rightObj,
    leftValueType: leftType,
    rightValueType: rightType,
  };
}

/**
 * Main function to compare JSON structures
 */
export function compareStructures(
  jsonA: any,
  jsonB: any,
  options: ComparisonOptions = {}
): ComparisonResult {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const diffList: DiffItem[] = [];

  // Parse JSON if strings are provided
  let parsedA: any, parsedB: any;
  
  try {
    parsedA = typeof jsonA === 'string' ? JSON.parse(jsonA) : jsonA;
  } catch (error) {
    throw new Error(`Invalid JSON A: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    parsedB = typeof jsonB === 'string' ? JSON.parse(jsonB) : jsonB;
  } catch (error) {
    throw new Error(`Invalid JSON B: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Start comparison from root
  const diffTree = compareValues(parsedA, parsedB, '/', mergedOptions, diffList);

  // Calculate summary
  const summary = {
    totalDifferences: diffList.length,
    missingKeysLeft: diffList.filter(d => d.type === 'MISSING_KEY_LEFT').length,
    missingKeysRight: diffList.filter(d => d.type === 'MISSING_KEY_RIGHT').length,
    typeMismatches: diffList.filter(d => d.type === 'TYPE_MISMATCH').length,
    arrayLengthMismatches: diffList.filter(d => d.type === 'ARRAY_LENGTH_MISMATCH').length,
    polymorphicArrays: diffList.filter(d => d.type === 'POLYMORPHIC_ARRAY').length,
  };

  return {
    matches: diffList.length === 0,
    diffTree,
    diffList,
    summary,
  };
} 