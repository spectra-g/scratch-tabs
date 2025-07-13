import { useCallback } from "react";
import * as monaco from "monaco-editor";

export const useJsonTransformations = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
) => {
  const transformKeys = useCallback(
    (obj: any, transform: (key: string) => string): any => {
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
    },
    [],
  );

  const handleToCamelCase = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();

      const json = JSON.parse(content);

      const toCamelCase = (str: string): string => {
        return str.replace(/[-_]([a-z])/g, (g) => g[1].toUpperCase());
      };

      const transformed = transformKeys(json, toCamelCase);
      editor.setValue(JSON.stringify(transformed, null, 2));
    } catch (error) {
      console.error("Failed to convert to camelCase:", error);
    }
  }, [editor, transformKeys]);

  const handleToSnakeCase = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();

      const json = JSON.parse(content);

      const toSnakeCase = (str: string): string => {
        return str
          .replace(/([A-Z])/g, "_$1")
          .toLowerCase()
          .replace(/^_/, "");
      };

      const transformed = transformKeys(json, toSnakeCase);
      editor.setValue(JSON.stringify(transformed, null, 2));
    } catch (error) {
      console.error("Failed to convert to snake_case:", error);
    }
  }, [editor, transformKeys]);

  const handleToKebabCase = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();

      const json = JSON.parse(content);

      const toKebabCase = (str: string): string => {
        return str
          .replace(/([A-Z])/g, "-$1")
          .toLowerCase()
          .replace(/^-/, "")
          .replace(/_/g, "-");
      };

      const transformed = transformKeys(json, toKebabCase);
      editor.setValue(JSON.stringify(transformed, null, 2));
    } catch (error) {
      console.error("Failed to convert to kebab-case:", error);
    }
  }, [editor, transformKeys]);

  return {
    handleToCamelCase,
    handleToSnakeCase,
    handleToKebabCase,
  };
};
