// Mock for jsonpath-plus
const JSONPath = ({ path, json, wrap = true }) => {
  // Simple JSONPath implementation for testing
  const resolve = () => {
    if (path === "$" || !path) return json;

    // Handle dot-bracket paths like $['tags'][*] or $.tags[*]
    if (path.includes("[*]")) {
      const parts = path.split("[*]");
      const arrayPath = parts[0]
        .replace(/^\$/, "")
        .replace(/\['([^']+)'\]/g, ".$1")
        .replace(/^\./, "");

      if (arrayPath) {
        let current = json;
        for (const segment of arrayPath.split(".")) {
          if (current && typeof current === "object" && segment in current) {
            current = current[segment];
          } else {
            return undefined;
          }
        }
        if (Array.isArray(current)) return current;
      }
      return undefined;
    }

    // Handle standard paths like $.name or $['user']['name'] or $.a.b
    const normalizedPath = path
      .replace(/^\$/, "")
      .replace(/\['([^']+)'\]/g, ".$1")
      .replace(/^\./, "");

    if (!normalizedPath) return json;

    let current = json;
    for (const segment of normalizedPath.split(".")) {
      if (current && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, segment)) {
        current = current[segment];
      } else {
        return undefined;
      }
    }
    return current;
  };

  const raw = resolve();

  if (wrap === false) return raw;

  // wrap === true (default): always return an array, matching real jsonpath-plus behavior
  if (raw === undefined || raw === null) return [];
  if (Array.isArray(raw)) return raw;
  return [raw];
};

module.exports = { JSONPath };
