export function convertToYaml(json: any, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  
  if (json === null) return 'null';
  if (typeof json !== 'object') return JSON.stringify(json);
  if (Array.isArray(json)) {
    if (json.length === 0) return '[]';
    return json.map(item => `${spaces}- ${convertToYaml(item, indent + 2)}`).join('\n');
  }
  
  const entries = Object.entries(json);
  if (entries.length === 0) return '{}';
  
  return entries.map(([key, value]) => {
    const formattedValue = convertToYaml(value, indent + 2);
    return `${spaces}${key}: ${typeof value === 'object' ? '\n' + formattedValue : formattedValue}`;
  }).join('\n');
}
