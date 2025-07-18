import { ComparisonItem, ComparisonDiff, ResponseComparison, HttpResponse, ResponseHistoryItem } from '../types';

/**
 * Creates a comparison item from a response history item
 */
export function createComparisonItem(historyItem: ResponseHistoryItem): ComparisonItem {
  return {
    id: historyItem.id,
    label: `${historyItem.method} ${historyItem.url} (${historyItem.status})`,
    response: historyItem.response,
    timestamp: historyItem.timestamp,
    method: historyItem.method,
    url: historyItem.url,
  };
}

/**
 * Creates a comparison item from current response
 */
export function createCurrentComparisonItem(response: HttpResponse, method: string, url: string): ComparisonItem {
  return {
    id: 'current',
    label: `${method} ${url} (${response.status}) - Current`,
    response,
    timestamp: Date.now(),
    method: method as any,
    url,
  };
}

/**
 * Safely parses JSON, returning null if parsing fails
 */
function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Deep comparison of two objects to find differences
 */
function compareObjects(obj1: any, obj2: any, path: string = ''): ComparisonDiff[] {
  const diffs: ComparisonDiff[] = [];
  
  if (obj1 === null || obj2 === null || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    if (obj1 !== obj2) {
      diffs.push({
        type: 'modified',
        path,
        oldValue: obj1,
        newValue: obj2,
        description: `Value changed from ${JSON.stringify(obj1)} to ${JSON.stringify(obj2)}`,
      });
    }
    return diffs;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  const allKeys = new Set([...keys1, ...keys2]);
  
  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const hasKey1 = keys1.includes(key);
    const hasKey2 = keys2.includes(key);
    
    if (!hasKey1 && hasKey2) {
      diffs.push({
        type: 'added',
        path: currentPath,
        newValue: obj2[key],
        description: `Added property ${key}`,
      });
    } else if (hasKey1 && !hasKey2) {
      diffs.push({
        type: 'removed',
        path: currentPath,
        oldValue: obj1[key],
        description: `Removed property ${key}`,
      });
    } else if (hasKey1 && hasKey2) {
      const subDiffs = compareObjects(obj1[key], obj2[key], currentPath);
      diffs.push(...subDiffs);
    }
  }
  
  return diffs;
}

/**
 * Compares response bodies, handling JSON parsing
 */
function compareResponseBodies(body1: string, body2: string): ComparisonDiff[] {
  // First check if bodies are identical
  if (body1 === body2) {
    return [];
  }
  
  // Try to parse as JSON and compare
  const json1 = safeJsonParse(body1);
  const json2 = safeJsonParse(body2);
  
  if (json1 !== null && json2 !== null) {
    return compareObjects(json1, json2, 'body');
  }
  
  // If not JSON, compare as strings
  return [{
    type: 'modified',
    path: 'body',
    oldValue: body1,
    newValue: body2,
    description: 'Response body content changed',
  }];
}

/**
 * Compares response headers
 */
function compareHeaders(headers1: Record<string, string>, headers2: Record<string, string>): ComparisonDiff[] {
  const diffs: ComparisonDiff[] = [];
  const keys1 = Object.keys(headers1);
  const keys2 = Object.keys(headers2);
  const allKeys = new Set([...keys1, ...keys2]);
  
  for (const key of allKeys) {
    const lowerKey = key.toLowerCase();
    const hasKey1 = keys1.some(k => k.toLowerCase() === lowerKey);
    const hasKey2 = keys2.some(k => k.toLowerCase() === lowerKey);
    
    if (!hasKey1 && hasKey2) {
      diffs.push({
        type: 'added',
        path: `headers.${key}`,
        newValue: headers2[key],
        description: `Added header ${key}`,
      });
    } else if (hasKey1 && !hasKey2) {
      diffs.push({
        type: 'removed',
        path: `headers.${key}`,
        oldValue: headers1[key],
        description: `Removed header ${key}`,
      });
    } else if (hasKey1 && hasKey2) {
      const value1 = headers1[keys1.find(k => k.toLowerCase() === lowerKey)!];
      const value2 = headers2[keys2.find(k => k.toLowerCase() === lowerKey)!];
      
      if (value1 !== value2) {
        diffs.push({
          type: 'modified',
          path: `headers.${key}`,
          oldValue: value1,
          newValue: value2,
          description: `Header ${key} changed from "${value1}" to "${value2}"`,
        });
      }
    }
  }
  
  return diffs;
}

/**
 * Compares response timing information
 */
function compareTiming(timing1: any, timing2: any): ComparisonDiff[] {
  return compareObjects(timing1, timing2, 'timing');
}

/**
 * Compares two responses and returns detailed differences
 */
export function compareResponses(left: ComparisonItem, right: ComparisonItem): ResponseComparison {
  const statusDiff = left.response.status !== right.response.status ? {
    type: 'modified' as const,
    path: 'status',
    oldValue: left.response.status,
    newValue: right.response.status,
    description: `Status code changed from ${left.response.status} to ${right.response.status}`,
  } : null;
  
  const headersDiff = compareHeaders(left.response.headers, right.response.headers);
  const bodyDiff = compareResponseBodies(left.response.body, right.response.body);
  const timingDiff = compareTiming(left.response.timing, right.response.timing);
  
  const sizeDiff = left.response.size !== right.response.size ? {
    type: 'modified' as const,
    path: 'size',
    oldValue: left.response.size,
    newValue: right.response.size,
    description: `Response size changed from ${left.response.size} to ${right.response.size} bytes`,
  } : null;
  
  return {
    left,
    right,
    statusDiff,
    headersDiff,
    bodyDiff,
    timingDiff,
    sizeDiff,
  };
}

/**
 * Formats a value for display in the comparison UI
 */
export function formatValueForDisplay(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  
  return String(value);
}

/**
 * Gets the appropriate CSS class for a diff type
 */
export function getDiffTypeClass(type: ComparisonDiff['type']): string {
  switch (type) {
    case 'added':
      return 'text-green-400 bg-green-500/10';
    case 'removed':
      return 'text-red-400 bg-red-500/10';
    case 'modified':
      return 'text-yellow-400 bg-yellow-500/10';
    case 'unchanged':
      return 'text-gray-400 bg-gray-500/10';
    default:
      return 'text-gray-400';
  }
}

/**
 * Checks if two comparison items can be compared
 */
export function canCompareItems(items: ComparisonItem[]): boolean {
  return items.length === 2;
}

/**
 * Gets a summary of differences for display
 */
export function getComparisonSummary(comparison: ResponseComparison): string {
  const totalDiffs = [
    comparison.statusDiff,
    comparison.sizeDiff,
    ...comparison.headersDiff,
    ...comparison.bodyDiff,
    ...comparison.timingDiff,
  ].filter(Boolean).length;
  
  if (totalDiffs === 0) {
    return 'No differences found';
  }
  
  return `${totalDiffs} difference${totalDiffs !== 1 ? 's' : ''} found`;
}