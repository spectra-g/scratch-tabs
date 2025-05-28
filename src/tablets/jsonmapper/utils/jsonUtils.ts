import { JSONPath } from 'jsonpath-plus';
import { DataType, PathInfo } from '../types';

/**
 * Extracts all paths from a JSON object
 */
export function extractPaths(json: any, parentPath: string = '$'): PathInfo[] {
  if (json === null || json === undefined) {
    return [{ path: parentPath, type: 'null', value: null }];
  }

  const type = getDataType(json);
  
  if (type === 'object') {
    const paths: PathInfo[] = [];
    
    // Add the object itself
    paths.push({ path: parentPath, type, value: json });
    
    // Add all properties
    for (const key in json) {
      const childPath = `${parentPath}['${key}']`;
      paths.push(...extractPaths(json[key], childPath));
    }
    
    return paths;
  } else if (type === 'array') {
    const paths: PathInfo[] = [];
    
    // Add the array itself
    paths.push({ path: parentPath, type, value: json });
    
    // Add all elements
    json.forEach((item: any, index: number) => {
      const childPath = `${parentPath}[${index}]`;
      paths.push(...extractPaths(item, childPath));
    });
    
    return paths;
  } else {
    // Primitive value
    return [{ path: parentPath, type, value: json }];
  }
}

/**
 * Gets the data type of a value
 */
export function getDataType(value: any): DataType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  
  const type = typeof value;
  
  if (type === 'string') return 'string';
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'object') return 'object';
  
  return 'unknown';
}

/**
 * Gets a value from a JSON object using a JSONPath expression
 */
export function getValueByPath(json: any, path: string): any {
  try {
    const result = JSONPath({ path, json });
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error('Error getting value by path:', error);
    return undefined;
  }
}

/**
 * Sets a value in a JSON object using a JSONPath expression
 */
export function setValueByPath(json: any, path: string, value: any): any {
  try {
    // Make a deep copy of the JSON
    const result = JSON.parse(JSON.stringify(json));
    
    // Handle root path
    if (path === '$') {
      return value;
    }
    
    // Extract the parent path and the key/index to set
    const match = path.match(/(.+)\['([^']+)'\]$|(.+)\[(\d+)\]$/);
    
    if (!match) {
      throw new Error(`Invalid path: ${path}`);
    }
    
    const parentPath = match[1] || match[3];
    const key = match[2] || match[4];
    
    // Get the parent object
    const parent = JSONPath({ path: parentPath, json: result })[0];
    
    if (!parent) {
      throw new Error(`Parent not found for path: ${path}`);
    }
    
    // Set the value
    if (isNaN(Number(key))) {
      parent[key] = value;
    } else {
      parent[Number(key)] = value;
    }
    
    return result;
  } catch (error) {
    console.error('Error setting value by path:', error);
    return json;
  }
}

/**
 * Validates if a string is valid JSON
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Formats a JSON string with proper indentation
 */
export function formatJson(json: string): string {
  try {
    const parsed = JSON.parse(json);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    return json;
  }
}

/**
 * Converts a JSONPath to a human-readable path
 * e.g. $['user']['name'] -> user.name
 */
export function jsonPathToReadablePath(path: string): string {
  return path
    .replace(/^\$/, '')
    .replace(/\['([^']+)'\]/g, '.$1')
    .replace(/\[(\d+)\]/g, '[$1]')
    .replace(/^\./, '');
}

/**
 * Converts a human-readable path to a JSONPath
 * e.g. user.name -> $['user']['name']
 */
export function readablePathToJsonPath(path: string): string {
  if (!path) return '$';
  
  return '$' + path
    .split('.')
    .map(part => {
      const match = part.match(/^(\w+)(\[\d+\])$/);
      if (match) {
        return `['${match[1]}']${match[2]}`;
      }
      return `['${part}']`;
    })
    .join('');
}