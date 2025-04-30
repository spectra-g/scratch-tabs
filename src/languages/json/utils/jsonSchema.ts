interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: any[];
  [key: string]: any;
}

export function generateJsonSchema(json: any): JsonSchema {
  function inferType(value: any): JsonSchema {
    if (value === null) return { type: 'null' };
    
    if (Array.isArray(value)) {
      if (value.length === 0) return { type: 'array', items: { type: 'any' } };
      const itemTypes = value.map(inferType);
      return {
        type: 'array',
        items: itemTypes[0] // Use first item as template
      };
    }
    
    if (typeof value === 'object') {
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      
      Object.entries(value).forEach(([key, val]) => {
        properties[key] = inferType(val);
        if (val !== null && val !== undefined) {
          required.push(key);
        }
      });
      
      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined
      };
    }
    
    return { type: typeof value };
  }
  
  return inferType(json);
}

export function validateJsonSchema(json: any, schema: JsonSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  function validate(value: any, schema: JsonSchema, path: string = ''): boolean {
    if (schema.type === 'null') {
      if (value !== null) {
        errors.push(`${path}: expected null but got ${typeof value}`);
        return false;
      }
      return true;
    }
    
    if (schema.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`${path}: expected array but got ${typeof value}`);
        return false;
      }
      
      if (schema.items) {
        return value.every((item, index) => 
          validate(item, schema.items!, `${path}[${index}]`)
        );
      }
      return true;
    }
    
    if (schema.type === 'object') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push(`${path}: expected object but got ${typeof value}`);
        return false;
      }
      
      if (schema.required) {
        for (const required of schema.required) {
          if (!(required in value)) {
            errors.push(`${path}: missing required property "${required}"`);
            return false;
          }
        }
      }
      
      if (schema.properties) {
        return Object.entries(schema.properties).every(([key, propSchema]) => {
          if (key in value) {
            return validate(value[key], propSchema, path ? `${path}.${key}` : key);
          }
          return true;
        });
      }
      return true;
    }
    
    if (typeof value !== schema.type) {
      errors.push(`${path}: expected ${schema.type} but got ${typeof value}`);
      return false;
    }
    
    return true;
  }
  
  const isValid = validate(json, schema);
  return { valid: isValid, errors };
}
