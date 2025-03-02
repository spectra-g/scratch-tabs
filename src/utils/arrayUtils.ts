/**
 * Groups items by a key function and returns a flattened array
 * @param items Array of items to group
 * @param keyFn Function to extract the key for grouping
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): T[] {
  // Create a map of key -> items
  const groups: Record<string, T[]> = {};
  
  // Group items by key
  items.forEach(item => {
    const key = keyFn(item);
    if (!groups[key as string]) {
      groups[key as string] = [];
    }
    groups[key as string].push(item);
  });
  
  // Flatten the map back to an array, preserving the order of keys
  const keys = Object.keys(groups);
  const result: T[] = [];
  
  keys.forEach(key => {
    result.push(...groups[key]);
  });
  
  return result;
}

/**
 * Moves an item from one index to another in an array
 * @param array The array to modify
 * @param fromIndex The index of the item to move
 * @param toIndex The index to move the item to
 */
export function moveItem<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 || 
    fromIndex >= array.length || 
    toIndex < 0 || 
    toIndex >= array.length ||
    fromIndex === toIndex
  ) {
    return [...array]; // Return a copy if indices are invalid
  }
  
  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  
  return result;
}

/**
 * Removes items from an array by index
 * @param array The array to modify
 * @param indices The indices of items to remove
 */
export function removeItemsByIndex<T>(array: T[], indices: number[]): T[] {
  const sortedIndices = [...indices].sort((a, b) => b - a); // Sort in descending order
  const result = [...array];
  
  sortedIndices.forEach(index => {
    if (index >= 0 && index < result.length) {
      result.splice(index, 1);
    }
  });
  
  return result;
}

/**
 * Removes items from an array by predicate
 * @param array The array to modify
 * @param predicate Function to test each item
 */
export function removeItems<T>(array: T[], predicate: (item: T) => boolean): T[] {
  return array.filter(item => !predicate(item));
}

/**
 * Inserts an item into an array at a specific index
 * @param array The array to modify
 * @param item The item to insert
 * @param index The index to insert at
 */
export function insertItem<T>(array: T[], item: T, index: number): T[] {
  if (index < 0 || index > array.length) {
    return [...array]; // Return a copy if index is invalid
  }
  
  const result = [...array];
  result.splice(index, 0, item);
  
  return result;
} 