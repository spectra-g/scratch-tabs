import { RequestConverter } from '../types';
import { curlConverter } from './curlConverter';
import { httpConverter } from './httpConverter';
import { postmanConverter } from './postmanConverter';

// Register all converters here
export const converters: RequestConverter[] = [
  curlConverter,
  httpConverter,
  postmanConverter
];

// Get a converter by ID
export function getConverter(id: string): RequestConverter | undefined {
  return converters.find(converter => converter.id === id);
}

// Get all converter IDs
export function getConverterIds(): string[] {
  return converters.map(converter => converter.id);
}