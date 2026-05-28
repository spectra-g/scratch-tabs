export function getLocalRefName(ref: string): string | null {
  const match = ref.match(/^#\/(?:components\/schemas|definitions)\/(.+)$/);
  return match ? decodeURIComponent(match[1].replace(/~1/g, "/").replace(/~0/g, "~")) : null;
}

export function resolveLocalRef(root: unknown, ref: string): unknown {
  if (!ref.startsWith("#/")) return undefined;

  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce<unknown>((current, part) => {
      if (current && typeof current === "object" && part in current) {
        return (current as Record<string, unknown>)[part];
      }
      return undefined;
    }, root);
}

export function collectLocalRefs(value: unknown, refs = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return refs;

  if (Array.isArray(value)) {
    value.forEach((item) => collectLocalRefs(item, refs));
    return refs;
  }

  const object = value as Record<string, unknown>;
  if (typeof object.$ref === "string" && object.$ref.startsWith("#/")) {
    refs.add(object.$ref);
  }

  Object.values(object).forEach((nested) => collectLocalRefs(nested, refs));
  return refs;
}
