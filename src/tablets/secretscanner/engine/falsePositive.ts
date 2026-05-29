import { PLACEHOLDER_WORDS } from "../constants";

export function isLikelyPlaceholder(value: string, context = ""): boolean {
  const normalized = `${value} ${context}`.toLowerCase();
  const compact = value.toLowerCase().replace(/[^a-z0-9_ -]/g, "");

  if (PLACEHOLDER_WORDS.some((word) => compact === word || normalized.includes(`your_${word}`) || normalized.includes(`${word}_here`))) {
    return true;
  }

  if (/(example|sample|dummy|changeme|replace_me|placeholder|redacted)/i.test(value)) {
    return true;
  }

  if (/^(x+|0+|1+|a+|z+|-+|_+)$/i.test(compact)) {
    return true;
  }

  return /^(sk|key|token|secret|password)[-_]?(test|example|sample)$/i.test(compact);
}

export function isRedactedPlaceholder(value: string): boolean {
  return /^\[?REDACTED(?:_[A-Z0-9]+)*_?\d*\]?$/i.test(value.trim());
}

export function looksLikeDocumentationContext(context: string): boolean {
  return /(example|sample|docs?|readme|tutorial|fake|mock|fixture)/i.test(context);
}
