import type { Diagnostic, ParsedSignature, VerificationInput } from './types';
import { detectBodyType, parseHeaders, summarizeBody } from './parser';

export function buildInputDiagnostics(
  input: VerificationInput,
  receivedSignatures: ParsedSignature[] = [],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const headers = parseHeaders(input.headersText);
  diagnostics.push(...headers.warnings.map((warning) => ({
    severity: 'warning' as const,
    title: 'Header parse warning',
    detail: warning,
  })));

  const contentType = input.contentType || headers.get('content-type') || '';
  const bodyType = detectBodyType(input.bodyText, contentType);
  if (contentType.toLowerCase().includes('json')) {
    try {
      if (input.bodyText.trim()) JSON.parse(input.bodyText);
    } catch {
      diagnostics.push({
        severity: 'warning',
        title: 'Content-Type says JSON, but body is invalid JSON',
        detail: 'Signature verification uses raw bytes, but invalid JSON may indicate a bad copy from logs.',
        fix: 'Paste the raw request body exactly as received.',
      });
    }
  }

  const summary = summarizeBody(input.bodyText, contentType);
  if (summary.hasTrailingNewline) {
    diagnostics.push({
      severity: 'info',
      title: 'Body has trailing newline',
      detail: 'Trailing newlines are part of the signed bytes and can change the HMAC.',
    });
  }

  if (bodyType === 'JSON' && input.bodyText.includes('\n') && receivedSignatures.length > 0) {
    diagnostics.push({
      severity: 'info',
      title: 'Pretty JSON body detected',
      detail: 'Most providers sign the raw compact body exactly as sent, not a reserialized JSON object.',
      fix: 'If verification fails, compare against the raw body captured before JSON parsing.',
    });
  }

  return diagnostics;
}

export function redactedSignature(value: string): string {
  if (!value) return '';
  if (value.length <= 16) return `${value.slice(0, 4)}...`;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}
