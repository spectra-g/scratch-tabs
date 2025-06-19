import { Base64Format } from '../types';

// Standard Base64 alphabet
const STANDARD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// URL-safe Base64 alphabet
const URL_SAFE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Standard Base64 validation regex
const STANDARD_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;
// URL-safe Base64 validation regex
const URL_SAFE_REGEX = /^[A-Za-z0-9\-_]*={0,2}$/;
// MIME Base64 validation regex (allows newlines)
const MIME_REGEX = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?(\r\n|\r|\n)?$/;

/**
 * Encodes a string to Base64 using the standard algorithm
 */
function encodeStandard(input: string): string {
  try {
    return btoa(unescape(encodeURIComponent(input)));
  } catch (e) {
    throw new Error('Failed to encode: Invalid input');
  }
}

/**
 * Decodes a Base64 string using the standard algorithm
 */
function decodeStandard(input: string): string {
  try {
    return decodeURIComponent(escape(atob(input)));
  } catch (e) {
    throw new Error('Failed to decode: Invalid Base64 input');
  }
}

/**
 * Encodes a string to URL-safe Base64
 */
function encodeUrlSafe(input: string): string {
  const standard = encodeStandard(input);
  return standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes a URL-safe Base64 string
 */
function decodeUrlSafe(input: string): string {
  // Add back padding if needed
  let padded = input;
  const padding = input.length % 4;
  if (padding) {
    padded += '='.repeat(4 - padding);
  }
  
  // Replace URL-safe chars with standard Base64 chars
  const standard = padded.replace(/-/g, '+').replace(/_/g, '/');
  return decodeStandard(standard);
}

/**
 * Encodes a string to MIME Base64 (with optional line wrapping)
 */
function encodeMime(input: string, wrap: boolean = false): string {
  const standard = encodeStandard(input);
  
  if (!wrap) return standard;
  
  // Wrap at 76 characters per line as per RFC 2045
  const wrapped = standard.match(/.{1,76}/g);
  return wrapped ? wrapped.join('\r\n') : standard;
}

/**
 * Decodes a MIME Base64 string
 */
function decodeMime(input: string): string {
  // Remove all whitespace (including newlines)
  const cleaned = input.replace(/\s/g, '');
  return decodeStandard(cleaned);
}

/**
 * Encodes a string to UTF-7 style Base64
 * Note: This is a simplified implementation
 */
function encodeUtf7(input: string): string {
  // UTF-7 uses a modified Base64 encoding for Unicode characters
  // This is a simplified version that doesn't handle all UTF-7 edge cases
  const standard = encodeStandard(input);
  return '+' + standard.replace(/\+/g, '+-').replace(/\//g, ',').replace(/=/g, '') + '-';
}

/**
 * Decodes a UTF-7 style Base64 string
 * Note: This is a simplified implementation
 */
function decodeUtf7(input: string): string {
  // Remove the leading + and trailing -
  if (!input.startsWith('+') || !input.endsWith('-')) {
    throw new Error('Invalid UTF-7 format');
  }
  
  const base64Part = input.slice(1, -1).replace(/\+-/g, '+').replace(/,/g, '/');
  // Add padding if needed
  const padding = base64Part.length % 4;
  const padded = padding ? base64Part + '='.repeat(4 - padding) : base64Part;
  
  return decodeStandard(padded);
}

/**
 * Encodes a string to IMAP Modified UTF-7
 * Note: This is a simplified implementation
 */
function encodeImapUtf7(input: string): string {
  // IMAP uses a modified UTF-7 encoding
  // This is a simplified version that doesn't handle all IMAP UTF-7 edge cases
  const standard = encodeStandard(input);
  return '&' + standard.replace(/\+/g, '&-').replace(/\//g, ',').replace(/=/g, '') + '-';
}

/**
 * Decodes an IMAP Modified UTF-7 string
 * Note: This is a simplified implementation
 */
function decodeImapUtf7(input: string): string {
  // Remove the leading & and trailing -
  if (!input.startsWith('&') || !input.endsWith('-')) {
    throw new Error('Invalid IMAP UTF-7 format');
  }
  
  const base64Part = input.slice(1, -1).replace(/&-/g, '&').replace(/,/g, '/');
  // Add padding if needed
  const padding = base64Part.length % 4;
  const padded = padding ? base64Part + '='.repeat(4 - padding) : base64Part;
  
  return decodeStandard(padded);
}

/**
 * Validates if a string is valid Base64 according to the standard format
 */
function validateStandard(input: string): boolean {
  return STANDARD_REGEX.test(input);
}

/**
 * Validates if a string is valid URL-safe Base64
 */
function validateUrlSafe(input: string): boolean {
  return URL_SAFE_REGEX.test(input);
}

/**
 * Validates if a string is valid MIME Base64
 */
function validateMime(input: string): boolean {
  // Remove all whitespace (including newlines) for validation
  const cleaned = input.replace(/\s/g, '');
  return STANDARD_REGEX.test(cleaned);
}

/**
 * Validates if a string is valid UTF-7 Base64
 */
function validateUtf7(input: string): boolean {
  return input.startsWith('+') && input.endsWith('-');
}

/**
 * Validates if a string is valid IMAP Modified UTF-7
 */
function validateImapUtf7(input: string): boolean {
  return input.startsWith('&') && input.endsWith('-');
}

export const base64Formats: Base64Format[] = [
  {
    id: 'standard',
    name: 'Standard (RFC 4648)',
    description: 'The standard Base64 encoding as defined in RFC 4648',
    encode: encodeStandard,
    decode: decodeStandard,
    validate: validateStandard
  },
  {
    id: 'url-safe',
    name: 'URL-safe (RFC 4648)',
    description: 'URL and filename safe Base64 variant that uses "-" and "_" instead of "+" and "/"',
    encode: encodeUrlSafe,
    decode: decodeUrlSafe,
    validate: validateUrlSafe
  },
  {
    id: 'mime',
    name: 'MIME (RFC 2045)',
    description: 'MIME Base64 encoding with optional line wrapping at 76 characters',
    encode: encodeMime,
    decode: decodeMime,
    validate: validateMime
  },
  {
    id: 'utf7',
    name: 'UTF-7 (RFC 2152)',
    description: 'Base64 variant used in UTF-7 encoding',
    encode: encodeUtf7,
    decode: decodeUtf7,
    validate: validateUtf7
  },
  {
    id: 'imap-utf7',
    name: 'IMAP Modified UTF-7 (RFC 3501)',
    description: 'Modified UTF-7 encoding used in IMAP mailbox names',
    encode: encodeImapUtf7,
    decode: decodeImapUtf7,
    validate: validateImapUtf7
  }
];

export function getFormatById(id: string): Base64Format {
  const format = base64Formats.find(f => f.id === id);
  if (!format) {
    throw new Error(`Unknown Base64 format: ${id}`);
  }
  return format;
}