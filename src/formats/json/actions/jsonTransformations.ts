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
  return str.replace(/[-_]([a-z])/g, (g) => g[1].toUpperCase());
};

export const toSnakeCase = (str: string): string => {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
};

export const toKebabCase = (str: string): string => {
  return str
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "")
    .replace(/_/g, "-");
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