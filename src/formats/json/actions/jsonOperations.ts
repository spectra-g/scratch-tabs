import * as monaco from "monaco-editor";
import { unstringifyJson } from "../utils/unstringify";
import { extractJsonFromText } from "../utils/extractJson";

/**
 * Core JSON operations that can be used across the application
 */

// Helper function to apply edits to Monaco editor while preserving undo stack
export const applyEditToEditor = (
  editor: monaco.editor.IStandaloneCodeEditor,
  newContent: string,
  source: string,
): void => {
  const model = editor.getModel();
  if (!model) return;

  // Focus the editor to ensure proper undo context
  editor.focus();
  
  // Select all content using Monaco's built-in action
  editor.trigger('keyboard', 'editor.action.selectAll', null);
  
  // Small delay to ensure the selection is processed before typing
  setTimeout(() => {
    // Replace content by simulating typing - this creates proper undo boundaries
    editor.trigger(source, 'type', { text: newContent });
  }, 1);
};

export const formatJson = (content: string, indentation: number = 2): string => {
  const json = JSON.parse(content);
  return JSON.stringify(json, null, indentation);
};

export const minifyJson = (content: string): string => {
  const json = JSON.parse(content);
  return JSON.stringify(json);
};

export const sortJsonKeys = (content: string, indentation: number = 2): string => {
  const json = JSON.parse(content);

  const sortObjectKeys = (obj: any): any => {
    if (obj === null) return null;
    if (Array.isArray(obj)) {
      return obj.map(sortObjectKeys);
    }
    if (obj && typeof obj === "object") {
      return Object.keys(obj)
        .sort()
        .reduce((acc: any, key) => {
          acc[key] = sortObjectKeys(obj[key]);
          return acc;
        }, {});
    }
    return obj;
  };

  const sorted = sortObjectKeys(json);
  return JSON.stringify(sorted, null, indentation);
};

export const flattenJson = (content: string, indentation: number = 2): string => {
  const json = JSON.parse(content);
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new Error("Flatten requires a JSON object.");
  }

  const flatten = (obj: any, prefix = "", res: any = {}): any => {
    for (const key in obj) {
      const newKey = prefix ? prefix + "." + key : key;
      if (
        typeof obj[key] === "object" &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        flatten(obj[key], newKey, res);
      } else {
        res[newKey] = obj[key];
      }
    }
    return res;
  };

  const flattened = flatten(json);
  return JSON.stringify(flattened, null, indentation);
};

export const unflattenJson = (content: string, indentation: number = 2): string => {
  const json = JSON.parse(content);
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new Error("Unflatten requires a flat JSON object.");
  }

  const unflatten = (data: any): any => {
    if (Object(data) !== data || Array.isArray(data)) return data;
    const regex = /\.?([^.[\]]+)|\[(\d+)\]/g;
    const result: any = {};
    for (const p in data) {
      let cur = result;
      let prop = "";
      let m;
      while ((m = regex.exec(p))) {
        cur = cur[prop] || (cur[prop] = m[2] ? [] : {});
        prop = m[2] || m[1];
      }
      cur[prop] = data[p];
    }
    return result[""] || result;
  };

  const unflattened = unflatten(json);
  return JSON.stringify(unflattened, null, indentation);
};

export const removeEmptyValues = (content: string, indentation: number = 2): string => {
  const json = JSON.parse(content);

  const removeEmpty = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj
        .map(removeEmpty)
        .filter(
          (item) => item !== null && item !== undefined && item !== "",
        );
    }

    if (obj && typeof obj === "object") {
      const newObj: any = {};
      for (const key in obj) {
        const value = removeEmpty(obj[key]);
        if (
          value !== null &&
          value !== undefined &&
          value !== "" &&
          !(Array.isArray(value) && value.length === 0) &&
          !(
            typeof value === "object" &&
            !Array.isArray(value) &&
            Object.keys(value).length === 0
          )
        ) {
          newObj[key] = value;
        }
      }
      return Object.keys(newObj).length === 0 ? null : newObj;
    }

    return obj === "" || obj === null || obj === undefined ? null : obj;
  };

  const cleaned = removeEmpty(json) ?? {};
  return JSON.stringify(cleaned, null, indentation);
};

export const removeComments = (content: string): string => {
  const removeJsonComments = (text: string): string => {
    let result = "";
    let inString = false;
    let escaped = false;
    let i = 0;

    while (i < text.length) {
      const current = text[i];
      const next = text[i + 1];

      if (escaped) {
        result += current;
        escaped = false;
        i++;
        continue;
      }

      if (current === "\\" && inString) {
        escaped = true;
        result += current;
        i++;
        continue;
      }

      if (current === '"') {
        inString = !inString;
        result += current;
        i++;
        continue;
      }

      if (!inString) {
        if (current === "/" && next === "/") {
          while (i < text.length && text[i] !== "\n") {
            i++;
          }
          if (i < text.length && text[i] === "\n") {
            result += text[i];
            i++;
          }
          continue;
        }

        if (current === "/" && next === "*") {
          i += 2;
          while (i < text.length - 1) {
            if (text[i] === "*" && text[i + 1] === "/") {
              i += 2;
              break;
            }
            i++;
          }
          continue;
        }
      }

      result += current;
      i++;
    }

    return result;
  };

  const noComments = removeJsonComments(content);
  const noEmptyLines = noComments
    .split("\n")
    .filter((line) => line.trim())
    .join("\n");

  return noEmptyLines;
};

export const stringifyJson = (content: string): string => {
  try {
    JSON.parse(content);
  } catch (parseError) {
    throw new Error("Cannot stringify invalid JSON");
  }

  return JSON.stringify(content);
};

export const unstringifyJsonContent = (content: string): string => {
  return unstringifyJson(content);
};

export const extractJsonFromContent = (content: string): string[] => {
  const extractedJsons = extractJsonFromText(content);
  
  if (extractedJsons.length === 0) {
    return [];
  }

  return extractedJsons.map((jsonExtract) => {
    if (jsonExtract.isStringified) {
      return jsonExtract.content;
    } else {
      try {
        const parsed = JSON.parse(jsonExtract.content);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        return jsonExtract.content;
      }
    }
  });
};