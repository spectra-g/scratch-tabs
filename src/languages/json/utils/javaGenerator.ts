interface JavaClass {
  className: string;
  code: string;
}

interface PropertyInfo {
  name: string;
  type: string;
  isArray: boolean;
  isObject: boolean;
}

function toPascalCase(str: string): string {
  return str
    .split(/[^a-zA-Z0-9]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function getJavaType(value: any, propertyName: string): PropertyInfo {
  if (value === null) return { name: propertyName, type: 'Object', isArray: false, isObject: false };
  
  if (Array.isArray(value)) {
    const elementType = value.length > 0 ? getJavaType(value[0], propertyName) : { type: 'Object', isObject: false };
    return {
      name: propertyName,
      type: elementType.type,
      isArray: true,
      isObject: elementType.isObject
    };
  }

  switch (typeof value) {
    case 'string':
      return { name: propertyName, type: 'String', isArray: false, isObject: false };
    case 'number':
      return {
        name: propertyName,
        type: Number.isInteger(value) ? 'Integer' : 'Double',
        isArray: false,
        isObject: false
      };
    case 'boolean':
      return { name: propertyName, type: 'Boolean', isArray: false, isObject: false };
    case 'object':
      return {
        name: propertyName,
        type: toPascalCase(propertyName),
        isArray: false,
        isObject: true
      };
    default:
      return { name: propertyName, type: 'Object', isArray: false, isObject: false };
  }
}

function generateImports(properties: PropertyInfo[]): string {
  const imports = new Set<string>();

  // Add imports based on property types
  properties.forEach(prop => {
    if (prop.isArray) {
      imports.add('import java.util.List;');
      imports.add('import java.util.ArrayList;');
    }
  });

  // Add common imports
  imports.add('import java.util.Objects;');

  return Array.from(imports).sort().join('\n');
}

function generateProperties(properties: PropertyInfo[]): string {
  return properties
    .map(prop => {
      const type = prop.isArray ? `List<${prop.type}>` : prop.type;
      return `    private ${type} ${toCamelCase(prop.name)};`;
    })
    .join('\n');
}

function generateGettersAndSetters(properties: PropertyInfo[]): string {
  return properties
    .map(prop => {
      const pascalName = toPascalCase(prop.name);
      const camelName = toCamelCase(prop.name);
      const type = prop.isArray ? `List<${prop.type}>` : prop.type;

      return `
    public ${type} get${pascalName}() {
        return ${camelName};
    }

    public void set${pascalName}(${type} ${camelName}) {
        this.${camelName} = ${camelName};
    }`;
    })
    .join('\n');
}

function generateEqualsAndHashCode(className: string, properties: PropertyInfo[]): string {
  const equalsComparisons = properties
    .map(prop => `Objects.equals(${toCamelCase(prop.name)}, that.${toCamelCase(prop.name)})`)
    .join(' &&\n                ');

  const hashCodeFields = properties
    .map(prop => toCamelCase(prop.name))
    .join(', ');

  return `
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ${className} that = (${className}) o;
        return ${equalsComparisons};
    }

    @Override
    public int hashCode() {
        return Objects.hash(${hashCodeFields});
    }`;
}

function generateToString(className: string, properties: PropertyInfo[]): string {
  const fields = properties
    .map(prop => `"${toCamelCase(prop.name)}=" + ${toCamelCase(prop.name)}`)
    .join(' + ", " + ');

  return `
    @Override
    public String toString() {
        return "${className}{" + ${fields} + "}";
    }`;
}

export function generateJavaClasses(json: any, rootClassName: string = 'Root'): JavaClass[] {
  const classes: JavaClass[] = [];
  const processedTypes = new Set<string>();

  function generateClass(obj: any, className: string) {
    if (processedTypes.has(className)) return;
    processedTypes.add(className);

    const properties: PropertyInfo[] = [];
    const nestedObjects: Array<{ obj: any; className: string }> = [];

    // Analyze properties
    Object.entries(obj).forEach(([key, value]) => {
      const propertyInfo = getJavaType(value, key);
      properties.push(propertyInfo);

      // Collect nested objects for processing
      if (propertyInfo.isObject) {
        const nestedValue = propertyInfo.isArray ? value[0] : value;
        if (nestedValue && typeof nestedValue === 'object') {
          nestedObjects.push({
            obj: nestedValue,
            className: propertyInfo.type
          });
        }
      }
    });

    // Generate class code
    const classCode = `${generateImports(properties)}

public class ${className} {
${generateProperties(properties)}
${generateGettersAndSetters(properties)}
${generateEqualsAndHashCode(className, properties)}
${generateToString(className, properties)}
}`;

    classes.push({ className, code: classCode });

    // Process nested classes
    nestedObjects.forEach(({ obj, className }) => {
      generateClass(obj, className);
    });
  }

  generateClass(json, rootClassName);
  return classes;
}