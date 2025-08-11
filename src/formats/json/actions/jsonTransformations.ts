/**
 * JSON key transformation utilities
 */

export const transformKeys = (obj: any, transform: (key: string) => string): any => {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item, transform));
  }

  if (obj && typeof obj === "object") {
    return Object.entries(obj).reduce((acc: any, [key, value]) => {
      acc[transform(key)] = transformKeys(value, transform);
      return acc;
    }, {});
  }

  return obj;
};

export const toCamelCase = (str: string): string => {
  return str
    .replace(/[-_]+/g, '-') // Normalize consecutive separators to single dash
    .replace(/^[-_]+|[-_]+$/g, '') // Remove leading and trailing separators
    .replace(/[-_]([a-z])/gi, (_, char) => char.toUpperCase()) // Convert to camelCase
    .replace(/^[A-Z]/, char => char.toLowerCase()); // Ensure first char is lowercase for camelCase
};

export const toSnakeCase = (str: string): string => {
  return str
    // Convert kebab-case to snake_case
    .replace(/-/g, '_')
    // Handle the pattern of acronym followed by word: XMLHttp -> XML_Http
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1_$2')
    // Handle normal camelCase: someWord -> some_Word
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    // Convert to lowercase
    .toLowerCase()
    // Clean up multiple underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_|_$/g, '');
};

export const toKebabCase = (str: string): string => {
  return str
    // Convert snake_case to kebab-case
    .replace(/_/g, '-')
    // Handle the pattern of acronym followed by word: XMLHttp -> XML-Http
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1-$2')
    // Handle normal camelCase: someWord -> some-Word
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    // Convert to lowercase
    .toLowerCase()
    // Clean up multiple dashes
    .replace(/-+/g, '-')
    // Remove leading/trailing dashes
    .replace(/^-|-$/g, '');
};

export const transformJsonKeys = (content: string, transformFn: (key: string) => string): string => {
  const json = JSON.parse(content);
  const transformed = transformKeys(json, transformFn);
  return JSON.stringify(transformed, null, 2);
};

export const transformToCamelCase = (content: string): string => {
  return transformJsonKeys(content, toCamelCase);
};

export const transformToSnakeCase = (content: string): string => {
  return transformJsonKeys(content, toSnakeCase);
};

export const transformToKebabCase = (content: string): string => {
  return transformJsonKeys(content, toKebabCase);
};