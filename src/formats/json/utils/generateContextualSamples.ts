/**
 * Generate contextual JMESPath sample queries based on actual JSON content
 */

// Constants
const MAX_SAMPLES = 7;
const MAX_PROPERTY_NAME_LENGTH = 50;

export interface SampleQuery {
  label: string;
  query: string;
  description: string;
}

/**
 * Sanitizes a property name for use in JMESPath queries
 * Handles special characters and limits length
 */
function sanitizePropertyName(name: string): string {
  // Truncate if too long
  const truncated = name.length > MAX_PROPERTY_NAME_LENGTH
    ? `${name.slice(0, MAX_PROPERTY_NAME_LENGTH)}...`
    : name;

  // Check if property name needs quoting (has special chars or spaces)
  const needsQuoting = /[^a-zA-Z0-9_]/.test(truncated);

  return needsQuoting ? `"${truncated}"` : truncated;
}

/**
 * Analyzes JSON content and generates relevant sample queries
 */
export function generateContextualSamples(jsonString: string): SampleQuery[] {
  try {
    const data = JSON.parse(jsonString);
    const samples: SampleQuery[] = [];

    // Analyze structure and generate relevant samples
    if (Array.isArray(data)) {
      // It's an array
      if (data.length > 0) {
        samples.push({
          label: 'Get first item',
          query: '[0]',
          description: 'Access the first element in the array',
        });

        const firstItem = data[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          // Array of objects - analyze properties
          const keys = Object.keys(firstItem);

          if (keys.length > 0) {
            // Project first property
            const firstKey = keys[0];
            const sanitizedFirstKey = sanitizePropertyName(firstKey);
            samples.push({
              label: `Get all "${firstKey}" values`,
              query: `[*].${sanitizedFirstKey}`,
              description: `Extract "${firstKey}" from all items`,
            });

            // If there are numeric or boolean properties, suggest filters
            for (const key of keys) {
              const value = firstItem[key];
              const sanitizedKey = sanitizePropertyName(key);

              if (typeof value === 'number') {
                samples.push({
                  label: `Filter by ${key}`,
                  query: `[?${sanitizedKey} > \`${value}\`]`,
                  description: `Get items where ${key} is greater than ${value}`,
                });
                break; // Only add one numeric filter example
              }

              if (typeof value === 'boolean') {
                samples.push({
                  label: `Filter by ${key}`,
                  query: `[?${sanitizedKey}==\`${value}\`]`,
                  description: `Get items where ${key} is ${value}`,
                });
                break; // Only add one boolean filter example
              }

              if (typeof value === 'string' && value.length > 0) {
                samples.push({
                  label: `Filter by ${key}`,
                  query: `[?${sanitizedKey}==\`'${value}'\`]`,
                  description: `Get items where ${key} equals "${value}"`,
                });
                break; // Only add one string filter example
              }
            }

            // Multi-field projection
            if (keys.length >= 2) {
              const firstTwo = keys.slice(0, 2);
              const sanitized1 = sanitizePropertyName(firstTwo[0]);
              const sanitized2 = sanitizePropertyName(firstTwo[1]);
              samples.push({
                label: 'Select specific fields',
                query: `[*].{${sanitized1}: ${sanitized1}, ${sanitized2}: ${sanitized2}}`,
                description: `Create objects with only ${firstTwo[0]} and ${firstTwo[1]}`,
              });
            }
          }
        }

        // Array length
        samples.push({
          label: 'Count items',
          query: 'length(@)',
          description: `Count total items (currently ${data.length})`,
        });
      }
    } else if (typeof data === 'object' && data !== null) {
      // It's an object
      const keys = Object.keys(data);

      if (keys.length > 0) {
        // Get first property
        const firstKey = keys[0];
        const sanitizedFirstKey = sanitizePropertyName(firstKey);
        samples.push({
          label: `Get "${firstKey}"`,
          query: sanitizedFirstKey,
          description: `Access the "${firstKey}" property`,
        });

        // Check for nested arrays
        for (const key of keys) {
          if (Array.isArray(data[key]) && data[key].length > 0) {
            const sanitizedKey = sanitizePropertyName(key);
            samples.push({
              label: `Get all items in "${key}"`,
              query: `${sanitizedKey}[*]`,
              description: `Get all elements from the "${key}" array`,
            });

            // If nested array has objects, suggest projection
            if (typeof data[key][0] === 'object' && data[key][0] !== null) {
              const nestedKeys = Object.keys(data[key][0]);
              if (nestedKeys.length > 0) {
                const nestedKey = nestedKeys[0];
                const sanitizedNestedKey = sanitizePropertyName(nestedKey);
                samples.push({
                  label: `Get "${nestedKey}" from "${key}"`,
                  query: `${sanitizedKey}[*].${sanitizedNestedKey}`,
                  description: `Extract "${nestedKey}" from all items in "${key}"`,
                });
              }
            }
            break; // Only show examples for first array found
          }
        }

        // Get all keys
        samples.push({
          label: 'List all keys',
          query: 'keys(@)',
          description: 'Get array of all property names',
        });
      }
    }

    // If we generated samples, return them (limit to MAX_SAMPLES)
    if (samples.length > 0) {
      return samples.slice(0, MAX_SAMPLES);
    }

    // Fallback to generic samples if we couldn't analyze
    return getGenericSamples();
  } catch (error) {
    // If JSON parsing fails, return generic samples
    return getGenericSamples();
  }
}

/**
 * Generic fallback samples when content can't be analyzed
 */
function getGenericSamples(): SampleQuery[] {
  return [
    { label: 'Get first item', query: '[0]', description: 'Access first element of array' },
    { label: 'Get all names', query: '[*].name', description: 'Project name field from all items' },
    { label: 'Filter by property', query: '[?age > `25`]', description: 'Filter items where age > 25' },
    { label: 'Filter active items', query: '[?status==`active`]', description: 'Filter by status field' },
    { label: 'Get nested property', query: 'data.results[0].id', description: 'Access nested property' },
    { label: 'Array length', query: 'length(@)', description: 'Count items in array' },
    { label: 'Select fields', query: '[*].{name: name, id: id}', description: 'Create new objects with selected fields' },
  ];
}
