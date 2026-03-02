const getClipboard = (): Clipboard | null => {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return null;
  }

  return navigator.clipboard;
};

const isNotAllowedError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "name" in error && error.name === "NotAllowedError";
};

export const safeCopy = async (text: string): Promise<void> => {
  if (!text) {
    return;
  }

  const clipboard = getClipboard();
  if (!clipboard || typeof clipboard.writeText !== "function") {
    console.warn("[clipboard] Clipboard API unavailable for copy");
    return;
  }

  try {
    await clipboard.writeText(text);
  } catch (error) {
    if (isNotAllowedError(error)) {
      console.warn("[clipboard] Copy blocked by browser permissions", error);
      return;
    }

    console.warn("[clipboard] Failed to copy text", error);
  }
};

export const safePaste = async (): Promise<string | null> => {
  const clipboard = getClipboard();
  if (!clipboard || typeof clipboard.readText !== "function") {
    console.warn("[clipboard] Clipboard API unavailable for paste");
    return null;
  }

  try {
    return await clipboard.readText();
  } catch (error) {
    console.error("[clipboard] Failed to read clipboard text", error);
    return null;
  }
};
