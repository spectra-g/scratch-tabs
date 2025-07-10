export function unstringifyJson(input: string): string {
  // Try to parse the input as a stringified JSON string
  let parsed: any;
  let lastError: Error | null = null;
  let attempts = [input];

  // If input starts with a quote but not ends, or ends but not starts, try to fix
  const trimmed = input.trim();
  if (
    (trimmed.startsWith('"') && !trimmed.endsWith('"')) ||
    (!trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    if (!trimmed.startsWith('"')) {
      attempts.push('"' + trimmed);
    }
    if (!trimmed.endsWith('"')) {
      attempts.push(trimmed + '"');
    }
  }

  for (const attempt of attempts) {
    try {
      parsed = JSON.parse(attempt);
      // If the result is a string, try to parse it again as JSON
      if (typeof parsed === "string") {
        try {
          const unstringified = JSON.parse(parsed);
          return JSON.stringify(unstringified, null, 2);
        } catch (e) {
          lastError = new Error(
            "Input is a string, but not valid stringified JSON.",
          );
          continue;
        }
      }
      // If the result is not a string, just return the pretty-printed version
      return JSON.stringify(parsed, null, 2);
    } catch (e: any) {
      lastError = e;
      continue;
    }
  }

  throw new Error("Input is not valid JSON or stringified JSON.");
}
