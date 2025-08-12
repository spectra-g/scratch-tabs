// Mock for jsonpath-plus
const JSONPath = ({ path, json }) => {
  // Simple JSONPath implementation for testing
  if (path === "$" || !path) return json;
  
  // Handle wildcard paths like $['tags'][*]
  if (path.includes("[*]")) {
    const parts = path.split("[*]");
    const arrayPath = parts[0].replace(/^\$/, "").replace(/\['([^']+)'\]/g, ".$1").replace(/^\./, "");
    
    if (arrayPath) {
      let current = json;
      const segments = arrayPath.split(".");
      for (const segment of segments) {
        if (current && typeof current === "object" && current[segment]) {
          current = current[segment];
        } else {
          return undefined;
        }
      }
      
      if (Array.isArray(current)) {
        return current;
      }
    }
    return undefined;
  }
  
  // Handle standard paths like $['name'] or $['user']['name']
  const normalizedPath = path.replace(/^\$/, "").replace(/\['([^']+)'\]/g, ".$1").replace(/^\./, "");
  
  if (!normalizedPath) return json;
  
  let current = json;
  const segments = normalizedPath.split(".");
  
  for (const segment of segments) {
    if (current && typeof current === "object" && current.hasOwnProperty(segment)) {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  
  return current;
};

module.exports = { JSONPath };