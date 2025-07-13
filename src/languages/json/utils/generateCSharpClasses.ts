interface CSharpClass {
  className: string;
  code: string;
}

function toPascalCase(str: string): string {
  return str
    .split(/[^a-zA-Z0-9]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function getCSharpType(value: any): string {
  if (value === null) return "object?";
  if (Array.isArray(value)) {
    if (value.length === 0) return "List<object>";
    const elementType = getCSharpType(value[0]);
    return `List<${elementType}>`;
  }
  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return Number.isInteger(value) ? "int" : "double";
    case "boolean":
      return "bool";
    case "object":
      return toPascalCase(Object.prototype.toString.call(value).slice(8, -1));
    default:
      return "object";
  }
}

function generateJsonPropertyAttribute(key: string): string {
  return `[JsonProperty("${key}")]`;
}

export function generateCSharpClasses(
  json: any,
  rootClassName: string = "Root",
): CSharpClass[] {
  const classes: CSharpClass[] = [];
  const processedTypes = new Set<string>();

  function generateClass(obj: any, className: string) {
    if (processedTypes.has(className)) return;
    processedTypes.add(className);

    const properties: string[] = [];
    const nestedObjects: Array<{ obj: any; className: string }> = [];

    Object.entries(obj).forEach(([key, value]) => {
      const pascalKey = toPascalCase(key);
      let type = getCSharpType(value);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const nestedClassName = toPascalCase(key);
        type = nestedClassName;
        nestedObjects.push({ obj: value, className: nestedClassName });
      }
      properties.push(
        `    ${generateJsonPropertyAttribute(key)}\n    public ${type} ${pascalKey} { get; set; }`,
      );
    });

    const classCode = `using System;
using System.Collections.Generic;
using Newtonsoft.Json;

public class ${className}
{
${properties.join("\n\n")}
}`;

    classes.push({ className, code: classCode });

    nestedObjects.forEach(({ obj, className }) => {
      generateClass(obj, className);
    });
  }

  generateClass(json, rootClassName);
  return classes;
}
