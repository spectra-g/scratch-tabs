interface PythonClass {
  className: string;
  code: string;
}

function toPascalCase(str: string): string {
  return str
    .split(/[^a-zA-Z0-9]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function getPythonType(value: any): string {
  if (value === null) return "None";
  if (Array.isArray(value)) {
    if (value.length === 0) return "list";
    const elementType = getPythonType(value[0]);
    return `list[${elementType}]`;
  }
  switch (typeof value) {
    case "string":
      return "str";
    case "number":
      return Number.isInteger(value) ? "int" : "float";
    case "boolean":
      return "bool";
    case "object":
      return toPascalCase(Object.prototype.toString.call(value).slice(8, -1));
    default:
      return "Any";
  }
}

function generateDocstring(
  className: string,
  properties: { name: string; type: string }[],
): string {
  return `"""
${className} class.

Attributes:
${properties.map((prop) => `    ${prop.name} (${prop.type})`).join("\n")}
"""`;
}

export function generatePythonClasses(
  json: any,
  rootClassName: string = "Root",
): PythonClass[] {
  const classes: PythonClass[] = [];
  const processedTypes = new Set<string>();

  function generateClass(obj: any, className: string) {
    if (processedTypes.has(className)) return;
    processedTypes.add(className);

    const properties: { name: string; type: string }[] = [];
    const nestedObjects: Array<{ obj: any; className: string }> = [];

    Object.entries(obj).forEach(([key, value]) => {
      let type = getPythonType(value);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const nestedClassName = toPascalCase(key);
        type = nestedClassName;
        nestedObjects.push({ obj: value, className: nestedClassName });
      }
      properties.push({ name: key, type });
    });

    const classCode = `from dataclasses import dataclass
from typing import List, Optional, Any

@dataclass
class ${className}:
    ${generateDocstring(className, properties)}
    ${properties.map((prop) => `${prop.name}: ${prop.type}`).join("\n    ")}`;

    classes.push({ className, code: classCode });

    nestedObjects.forEach(({ obj, className }) => {
      generateClass(obj, className);
    });
  }

  generateClass(json, rootClassName);
  return classes;
}
