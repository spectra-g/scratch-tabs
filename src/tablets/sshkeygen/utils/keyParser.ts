import { decodePublicKeyWire, decodePrivateKeyHeader } from './opensshFormat';
import type { ParsedKey, ParseError } from '../sshKeygenTypes';

const PUBLIC_KEY_PREFIXES = [
  'ssh-ed25519',
  'ssh-rsa',
  'ecdsa-sha2-nistp256',
  'ecdsa-sha2-nistp384',
  'ecdsa-sha2-nistp521',
];

function base64Decode(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function stripPemArmor(text: string, header: string, footer: string): string {
  const start = text.indexOf(header);
  const end = text.indexOf(footer);
  if (start === -1 || end === -1) throw new Error('Missing PEM armor');
  return text.slice(start + header.length, end).replace(/\s/g, '');
}

export function parseKey(text: string): ParsedKey | ParseError {
  const trimmed = text.trim();
  if (!trimmed) return { error: 'Empty input' };

  const matchedPrefix = PUBLIC_KEY_PREFIXES.find(p => trimmed.startsWith(p + ' '));
  if (matchedPrefix) {
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return { error: 'Invalid public key: missing base64 blob' };
    const [keyType, b64, ...commentParts] = parts;
    try {
      const wireBytes = base64Decode(b64);
      const decoded = decodePublicKeyWire(wireBytes);
      if (decoded.keyType !== keyType) return { error: `Key type mismatch: header says ${keyType}, wire says ${decoded.keyType}` };
      return {
        isPublic: true,
        keyType,
        bitLength: decoded.bitLength,
        comment: commentParts.length > 0 ? commentParts.join(' ') : undefined,
        wireBytes,
      };
    } catch (e) {
      return { error: `Failed to decode public key: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  if (trimmed.includes('-----BEGIN OPENSSH PRIVATE KEY-----')) {
    try {
      const b64 = stripPemArmor(
        trimmed,
        '-----BEGIN OPENSSH PRIVATE KEY-----',
        '-----END OPENSSH PRIVATE KEY-----',
      );
      const blob = base64Decode(b64);
      const header = decodePrivateKeyHeader(blob);
      const decoded = decodePublicKeyWire(header.pubWireBytes);
      return {
        isPublic: false,
        keyType: decoded.keyType,
        bitLength: decoded.bitLength,
        isEncrypted: header.isEncrypted,
        pubWireBytes: header.pubWireBytes,
      };
    } catch (e) {
      return { error: `Failed to parse private key: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  if (trimmed.includes('-----BEGIN RSA PRIVATE KEY-----') ||
      trimmed.includes('-----BEGIN EC PRIVATE KEY-----') ||
      trimmed.includes('-----BEGIN PRIVATE KEY-----')) {
    return { error: 'PKCS#1/PKCS#8 format is not supported. Use OpenSSH format (ssh-keygen -t ed25519).' };
  }

  return { error: 'Unrecognized key format. Paste an OpenSSH public key or private key.' };
}

export function isParseError(result: ParsedKey | ParseError): result is ParseError {
  return 'error' in result;
}

export function derivePublicKeyLine(parsedPrivateKey: ParsedKey, comment: string): string {
  if (!parsedPrivateKey.pubWireBytes) throw new Error('No embedded public key bytes');
  let bin = '';
  for (const byte of parsedPrivateKey.pubWireBytes) bin += String.fromCharCode(byte);
  const b64 = btoa(bin);
  const line = `${parsedPrivateKey.keyType} ${b64}`;
  return comment ? `${line} ${comment}` : line;
}

export function publicKeyBytesEqual(parsedPublic: ParsedKey, parsedPrivate: ParsedKey): boolean {
  const a = parsedPublic.wireBytes;
  const b = parsedPrivate.pubWireBytes;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((byte, i) => byte === b[i]);
}
