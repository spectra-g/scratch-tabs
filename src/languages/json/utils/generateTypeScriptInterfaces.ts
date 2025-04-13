// Define the structure for the output
interface TypeScriptInterface {
  interfaceName: string;
  code: string;
}

// Define the structure to hold type information during analysis
interface TsPropertyInfo {
  name: string;       // Original JSON key
  type: string;       // TypeScript type (string, number, boolean, InterfaceName, any, null, unknown)
  isArray: boolean;   // Is the property an array?
  isObject: boolean;  // Is the property's base type an object (requiring a nested interface)?
  isNullable: boolean;// Was the original value explicitly null?
}

// Helper function for PascalCase (needed for interface names)
function toPascalCase(str: string): string {
  // Handle empty or non-string input gracefully
  if (!str || typeof str !== 'string') return 'InvalidName';

  // Improved regex to handle various separators and edge cases like leading/trailing separators
  return str
    .split(/[^a-zA-Z0-9]+/) // Split by any non-alphanumeric sequence
    .filter(word => word.length > 0) // Remove empty strings resulting from multiple separators
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Lowercase handled by split/filter logic implicitly
    .join('');
}

// Determines the TypeScript type for a given value
function getTypeScriptType(value: any, propertyName: string): TsPropertyInfo {
  const isNullable = value === null;

  if (isNullable) {
    // If null, default to 'any' but mark as nullable.
    // A more complex version could try to infer from other objects in an array.
    return { name: propertyName, type: 'any', isArray: false, isObject: false, isNullable: true };
  }

  if (Array.isArray(value)) {
    // Infer type from the first element if available, otherwise default to 'any'
    const elementTypeInfo = value.length > 0
      ? getTypeScriptType(value[0], propertyName)
      // Default for empty array elements
      : { type: 'any', isObject: false, isArray: false, isNullable: false };

    return {
      name: propertyName,
      type: elementTypeInfo.type,       // The base type of the elements
      isArray: true,                    // This property *is* an array
      isObject: elementTypeInfo.isObject, // Are the *elements* objects?
      isNullable: false                 // The array itself isn't null here
    };
  }

  switch (typeof value) {
    case 'string':
      return { name: propertyName, type: 'string', isArray: false, isObject: false, isNullable: false };
    case 'number':
      // No distinction between int/float needed in TypeScript
      return { name: propertyName, type: 'number', isArray: false, isObject: false, isNullable: false };
    case 'boolean':
      return { name: propertyName, type: 'boolean', isArray: false, isObject: false, isNullable: false };
    case 'object':
      // Ensure it's a real object (and not null, which is handled above)
      if (value && typeof value === 'object') {
        return {
          name: propertyName,
          type: toPascalCase(propertyName), // Generate PascalCase name for the nested interface
          isArray: false,
          isObject: true,                   // Mark as object type
          isNullable: false
        };
      } else {
        // Fallback for unexpected cases (shouldn't normally hit if null is handled)
        return { name: propertyName, type: 'any', isArray: false, isObject: false, isNullable: false };
      }
    default: // Catches undefined, function, symbol, etc.
      return { name: propertyName, type: 'any', isArray: false, isObject: false, isNullable: false };
  }
}

// Generates the property lines within a TypeScript interface
function generateInterfaceProperties(properties: TsPropertyInfo[]): string {
  return properties
    .map(prop => {
      let tsType = prop.type;

      // Handle array types: ElementType[]
      if (prop.isArray) {
        // If elements themselves can be null, a more complex `(ElementType | null)[]` might be needed.
        // Keeping it simpler for now:
        tsType = `${tsType}[]`;
      }

      // Handle nullability: Type | null
      if (prop.isNullable) {
        // Avoid 'any | null' which simplifies to 'any'
        tsType = tsType === 'any' ? 'any' : `${tsType} | null`;
      }

      // Quote property names if they are not valid JS/TS identifiers
      const propName = prop.name.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/)
        ? prop.name
        : `"${prop.name}"`; // Use quotes for invalid identifiers

      return `    ${propName}: ${tsType};`;
    })
    .join('\n');
}

/**
 * Generates TypeScript interface definitions from a JSON object or array.
 * @param json The input JSON data (object or array).
 * @param rootInterfaceName The desired name for the root interface (or root element interface if JSON is an array).
 * @returns An array of objects, each containing an interface name and its code string.
 */
export function generateTypeScriptInterfaces(json: any, rootInterfaceName: string = 'Root'): TypeScriptInterface[] {
  const interfaces: TypeScriptInterface[] = [];
  const processedTypes = new Set<string>(); // Tracks generated interface *names* to prevent duplicates/loops

  function generateInterface(obj: any, interfaceName: string) {
    // Ensure the intended interface name is PascalCase
    const pascalInterfaceName = toPascalCase(interfaceName);

    // Basic validation: Only generate for non-null objects
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      console.warn(`Skipping interface generation for non-object value provided for: ${pascalInterfaceName}`);
      return;
    }

    // Avoid re-processing the same interface name
    if (processedTypes.has(pascalInterfaceName)) {
      return;
    }
    processedTypes.add(pascalInterfaceName);

    const properties: TsPropertyInfo[] = [];
    const nestedObjects: Array<{ obj: any; interfaceName: string }> = [];

    // Analyze properties of the current object
    Object.entries(obj).forEach(([key, value]) => {
      const propertyInfo = getTypeScriptType(value, key);
      properties.push(propertyInfo);

      // If a property represents an object (or an array of objects), we need to potentially recurse
      if (propertyInfo.isObject && value !== null) {
        // Determine the actual object(s) to analyze for the nested interface
        // If it's an array, use the first element (if any)
        const nestedValue = propertyInfo.isArray ? (value.length > 0 ? value[0] : null) : value;

        // Only recurse if we have a valid, non-null, non-array object to define the nested type
        if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
          nestedObjects.push({
            obj: nestedValue,
            // Use the PascalCase name determined by getTypeScriptType
            interfaceName: propertyInfo.type
          });
        }
      }
    });

    // Generate the TypeScript code for the current interface
    const interfaceCode = `export interface ${pascalInterfaceName} {\n${generateInterfaceProperties(properties)}\n}`;
    interfaces.push({ interfaceName: pascalInterfaceName, code: interfaceCode });

    // Recursively generate interfaces for nested objects
    nestedObjects.forEach(({ obj: nestedObj, interfaceName: nestedName }) => {
      generateInterface(nestedObj, nestedName);
    });
  }

  // --- Handle the root level ---
  if (Array.isArray(json)) {
    // If the root is an array
    if (json.length > 0) {
      // Generate an interface based on the structure of the first element
      const elementInterfaceName = toPascalCase(rootInterfaceName); // e.g., "User" if rootInterfaceName is "User"
      // Attempt to generate the interface for the element type
      generateInterface(json[0], elementInterfaceName);

      // Check if the element interface was actually generated (it might have been skipped if json[0] wasn't an object)
      if (processedTypes.has(elementInterfaceName)) {
        // Add a type alias for the root array, e.g., export type Users = User[];
         const rootTypeAliasName = toPascalCase(rootInterfaceName + 'List'); // Or adjust naming convention as desired
         interfaces.push({
             interfaceName: rootTypeAliasName, // e.g., "UserList"
             code: `export type ${rootTypeAliasName} = ${elementInterfaceName}[];`
         });
      } else {
         // If element interface wasn't generated (e.g., array of primitives), create a basic type alias
         const primitiveTypeInfo = getTypeScriptType(json[0], 'arrayElement');
         interfaces.push({
             interfaceName: toPascalCase(rootInterfaceName + 'List'),
             code: `export type ${toPascalCase(rootInterfaceName + 'List')} = ${primitiveTypeInfo.type}[];`
         });
      }

    } else {
      // Root is an empty array
      interfaces.push({
        interfaceName: toPascalCase(rootInterfaceName + 'List'),
        code: `export type ${toPascalCase(rootInterfaceName + 'List')} = any[];`
      });
    }
  } else if (json && typeof json === 'object') {
    // If the root is a regular object
    generateInterface(json, rootInterfaceName);
  } else {
    // Root is not an object or array (e.g., string, number, null)
    console.error("Cannot generate TypeScript interfaces: Root JSON value is not an object or array.");
    // Optionally throw an error or return a specific message interface
     interfaces.push({
        interfaceName: 'Error',
        code: `// Cannot generate TypeScript interfaces: Root JSON value is not an object or array.`
     });
  }

  // Return the collected interface definitions
  return interfaces;
}
export default generateTypeScriptInterfaces;