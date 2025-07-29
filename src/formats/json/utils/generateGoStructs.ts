interface GoStruct {
  structName: string;
  code: string;
}

function toPascalCase(str: string): string {
  return str
    .split(/[^a-zA-Z0-9]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function getGoType(value: any): string {
  if (value === null) return "interface{}";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]interface{}";
    const elementType = getGoType(value[0]);
    return `[]${elementType}`;
  }
  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return Number.isInteger(value) ? "int" : "float64";
    case "boolean":
      return "bool";
    case "object":
      return toPascalCase(Object.prototype.toString.call(value).slice(8, -1));
    default:
      return "interface{}";
  }
}

function generateJsonTags(key: string): string {
  return `\`json:"${key}"\``;
}

export function generateGoStructs(
  json: any,
  rootStructName: string = "Root",
): GoStruct[] {
  const structs: GoStruct[] = [];
  const processedTypes = new Set<string>();

  function generateStruct(obj: any, structName: string) {
    if (processedTypes.has(structName)) return;
    processedTypes.add(structName);

    const fields: string[] = [];
    const nestedObjects: Array<{ obj: any; structName: string }> = [];

    Object.entries(obj).forEach(([key, value]) => {
      const pascalKey = toPascalCase(key);
      let type = getGoType(value);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const nestedStructName = toPascalCase(key);
        type = nestedStructName;
        nestedObjects.push({ obj: value, structName: nestedStructName });
      }
      fields.push(`    ${pascalKey} ${type} ${generateJsonTags(key)}`);
    });

    const structCode = `// ${structName} represents a ${structName.toLowerCase()} object
type ${structName} struct {
${fields.join("\n")}
}`;

    structs.push({ structName, code: structCode });

    nestedObjects.forEach(({ obj, structName }) => {
      generateStruct(obj, structName);
    });
  }

  generateStruct(json, rootStructName);
  return structs;
}
