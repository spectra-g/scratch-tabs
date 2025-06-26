// Utility to detect sensitive column headers
export const SENSITIVE_HEADER_PATTERNS = [
  /password/i,
  /passkey/i,
  /secret/i,
  /token/i,
  /api[-_ ]?key/i,
  /auth[-_ ]?key/i,
  /credential/i,
  /private[-_ ]?key/i,
  /ssn/i,
  /pin/i,
  /key$/i,
  /access[-_ ]?key/i,
  /refresh[-_ ]?token/i,
  /session[-_ ]?id/i,
  /user[-_ ]?id/i,
  /client[-_ ]?secret/i,
  /app[-_ ]?secret/i,
  /encryption[-_ ]?key/i,
  /decryption[-_ ]?key/i,
  /signature/i,
  /hash/i,
  /salt/i,
  /nonce/i,
  /iv/i,
  /cipher/i
];

export function isSensitiveHeader(header: string): boolean {
  return SENSITIVE_HEADER_PATTERNS.some((pattern) => pattern.test(header));
} 