import { pbkdf } from 'bcrypt-pbkdf';

// ── Low-level primitives ─────────────────────────────────────────────────────

export function encodeUint32(n: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, n >>> 0, false);
  return buf;
}

export function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

export function encodeBytes(bytes: Uint8Array): Uint8Array {
  return concat(encodeUint32(bytes.length), bytes);
}

export function encodeString(s: string | Uint8Array): Uint8Array {
  const bytes = typeof s === 'string' ? new TextEncoder().encode(s) : s;
  return encodeBytes(bytes);
}

// SSH mpint: big-endian 2's complement, leading-zero-free, MSB 0x00 if high bit set.
export function encodeMpint(bytes: Uint8Array): Uint8Array {
  let start = 0;
  while (start < bytes.length && bytes[start] === 0) start++;

  if (start === bytes.length) return encodeUint32(0); // zero

  const stripped = bytes.slice(start);
  if (stripped[0] & 0x80) {
    const withLeadingZero = new Uint8Array(stripped.length + 1);
    withLeadingZero.set(stripped, 1);
    return encodeBytes(withLeadingZero);
  }
  return encodeBytes(stripped);
}

// ── Decoding primitives ──────────────────────────────────────────────────────

export function readUint32(data: Uint8Array, offset: number): [number, number] {
  if (offset + 4 > data.length) throw new Error('Buffer underflow reading uint32');
  const n = new DataView(data.buffer, data.byteOffset + offset).getUint32(0, false);
  return [n, offset + 4];
}

export function readBytes(data: Uint8Array, offset: number): [Uint8Array, number] {
  const [len, next] = readUint32(data, offset);
  if (next + len > data.length) throw new Error('Buffer underflow reading bytes');
  return [data.slice(next, next + len), next + len];
}

export function readString(data: Uint8Array, offset: number): [string, number] {
  const [bytes, next] = readBytes(data, offset);
  return [new TextDecoder().decode(bytes), next];
}

// ── JWK helpers ──────────────────────────────────────────────────────────────

export function fromBase64url(b64u: string): Uint8Array {
  let b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  // atob in some browsers requires padding; JWK fields are unpadded base64url.
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function padLeft(bytes: Uint8Array, length: number): Uint8Array {
  if (bytes.length === length) return bytes;
  if (bytes.length > length) return bytes.slice(bytes.length - length);
  const padded = new Uint8Array(length);
  padded.set(bytes, length - bytes.length);
  return padded;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// ── Public key wire-format encoding ─────────────────────────────────────────

export function buildEd25519PublicWire(pubKeyBytes: Uint8Array): Uint8Array {
  return concat(encodeString('ssh-ed25519'), encodeString(pubKeyBytes));
}

export function buildRsaPublicWire(e: Uint8Array, n: Uint8Array): Uint8Array {
  return concat(encodeString('ssh-rsa'), encodeMpint(e), encodeMpint(n));
}

const CURVE_FIELD_SIZE: Record<string, number> = {
  nistp256: 32,
  nistp384: 48,
  nistp521: 66,
};

export function buildEcdsaPublicWire(curve: string, x: Uint8Array, y: Uint8Array): Uint8Array {
  const fieldSize = CURVE_FIELD_SIZE[curve];
  const point = concat(new Uint8Array([0x04]), padLeft(x, fieldSize), padLeft(y, fieldSize));
  return concat(
    encodeString(`ecdsa-sha2-${curve}`),
    encodeString(curve),
    encodeString(point),
  );
}

// ── Public key wire-format decoding ─────────────────────────────────────────

export interface DecodedPublicKey {
  keyType: string;
  bitLength: number;
  fields: Record<string, Uint8Array>;
}

export function decodePublicKeyWire(blob: Uint8Array): DecodedPublicKey {
  let offset = 0;
  const [keyType, next] = readString(blob, offset);
  offset = next;

  if (keyType === 'ssh-ed25519') {
    const [pubKey, o2] = readBytes(blob, offset);
    return { keyType, bitLength: 256, fields: { pubKey } };
    void o2;
  }

  if (keyType === 'ssh-rsa') {
    const [e, o2] = readBytes(blob, offset);
    const [n, o3] = readBytes(blob, o2);
    // Strip leading 0x00 from mpint n to get actual byte count
    let start = 0;
    while (start < n.length - 1 && n[start] === 0) start++;
    const bitLength = (n.length - start) * 8;
    return { keyType, bitLength, fields: { e, n } };
    void o3;
  }

  if (keyType.startsWith('ecdsa-sha2-')) {
    const [curveName, o2] = readString(blob, offset);
    const [point, o3] = readBytes(blob, o2);
    const bitLength = { nistp256: 256, nistp384: 384, nistp521: 521 }[curveName] ?? 0;
    return { keyType, bitLength, fields: { curveName: new TextEncoder().encode(curveName), point } };
    void o3;
  }

  throw new Error(`Unsupported key type: ${keyType}`);
}

// ── Private key header decoding (for inspector) ──────────────────────────────

export interface DecodedPrivateKeyHeader {
  cipher: string;
  kdf: string;
  isEncrypted: boolean;
  pubWireBytes: Uint8Array;
}

const OPENSSH_MAGIC = 'openssh-key-v1\0';

export function decodePrivateKeyHeader(blob: Uint8Array): DecodedPrivateKeyHeader {
  const magic = new TextDecoder().decode(blob.slice(0, OPENSSH_MAGIC.length));
  if (magic !== OPENSSH_MAGIC) throw new Error('Not an OpenSSH v1 private key');

  let offset = OPENSSH_MAGIC.length;
  const [cipher, o1] = readString(blob, offset); offset = o1;
  const [kdf, o2] = readString(blob, offset); offset = o2;
  const [, o3] = readBytes(blob, offset); offset = o3; // kdfOpts
  const [numKeys, o4] = readUint32(blob, offset); offset = o4;
  if (numKeys !== 1) throw new Error(`Expected 1 key, got ${numKeys}`);
  const [pubWireBytes] = readBytes(blob, offset);

  return { cipher, kdf, isEncrypted: cipher !== 'none', pubWireBytes };
}

// ── Private key blob assembly ────────────────────────────────────────────────

function buildPrivatePlaintext(
  privateFields: Uint8Array,
  comment: string,
  blockSize: number,
): Uint8Array {
  const checkBytes = crypto.getRandomValues(new Uint8Array(4));
  const checkInt = new DataView(checkBytes.buffer).getUint32(0, false);

  const body = concat(
    encodeUint32(checkInt),
    encodeUint32(checkInt),
    privateFields,
    encodeString(comment),
  );

  const padLen = (blockSize - (body.length % blockSize)) % blockSize;
  const padding = Uint8Array.from({ length: padLen }, (_, i) => i + 1);
  return concat(body, padding);
}

export interface PrivateKeyEncoding {
  cipher: string;
  kdf: string;
  kdfOptsBlob: Uint8Array;
  encryptedBlob: Uint8Array;
}

export async function encodePrivateKey(
  publicWireBlob: Uint8Array,
  privateFields: Uint8Array,
  comment: string,
  passphrase: string,
): Promise<string> {
  let encoding: PrivateKeyEncoding;

  if (passphrase.length > 0) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const rounds = 16;

    const passBytes = new TextEncoder().encode(passphrase);
    const keyMaterial = new Uint8Array(48);
    pbkdf(
      passBytes, passBytes.length,
      salt, salt.length,
      keyMaterial, 48,
      rounds,
    );

    const aesKeyBytes = keyMaterial.slice(0, 32);
    const iv = keyMaterial.slice(32, 48);

    const plaintext = buildPrivatePlaintext(privateFields, comment, 16);

    const cryptoKey = await crypto.subtle.importKey(
      'raw', aesKeyBytes, { name: 'AES-CBC' }, false, ['encrypt'],
    );
    // Web Crypto AES-CBC appends a PKCS7 block; drop it — plaintext is already block-aligned.
    const ciphertextFull = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, cryptoKey, plaintext);
    const encryptedBlob = new Uint8Array(ciphertextFull).slice(0, plaintext.length);

    encoding = {
      cipher: 'aes256-cbc',
      kdf: 'bcrypt',
      kdfOptsBlob: concat(encodeString(salt), encodeUint32(rounds)),
      encryptedBlob,
    };
  } else {
    encoding = {
      cipher: 'none',
      kdf: 'none',
      kdfOptsBlob: new Uint8Array(0),
      encryptedBlob: buildPrivatePlaintext(privateFields, comment, 8),
    };
  }

  const wireBlob = concat(
    new TextEncoder().encode(OPENSSH_MAGIC),
    encodeString(encoding.cipher),
    encodeString(encoding.kdf),
    encodeString(encoding.kdfOptsBlob),
    encodeUint32(1),
    encodeString(publicWireBlob),
    encodeString(encoding.encryptedBlob),
  );

  const b64 = uint8ArrayToBase64(wireBlob);
  const wrapped = b64.match(/.{1,70}/g)?.join('\n') ?? b64;
  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${wrapped}\n-----END OPENSSH PRIVATE KEY-----\n`;
}

// ── Private field builders ───────────────────────────────────────────────────

export function buildEd25519PrivateFields(pubBytes: Uint8Array, seedBytes: Uint8Array): Uint8Array {
  // OpenSSH stores the 64-byte combined key: seed(32) || pub(32), matching libsodium's ed25519_sk.
  return concat(
    encodeString('ssh-ed25519'),
    encodeString(pubBytes),
    encodeString(concat(seedBytes, pubBytes)),
  );
}

export function buildRsaPrivateFields(jwk: JsonWebKey): Uint8Array {
  const n = fromBase64url(jwk.n!);
  const e = fromBase64url(jwk.e!);
  const d = fromBase64url(jwk.d!);
  const p = fromBase64url(jwk.p!);
  const q = fromBase64url(jwk.q!);
  const qi = fromBase64url(jwk.qi!);
  return concat(
    encodeString('ssh-rsa'),
    encodeMpint(n),
    encodeMpint(e),
    encodeMpint(d),
    encodeMpint(qi),
    encodeMpint(p),
    encodeMpint(q),
  );
}

export function buildEcdsaPrivateFields(
  curve: string,
  x: Uint8Array,
  y: Uint8Array,
  d: Uint8Array,
): Uint8Array {
  const fieldSize = CURVE_FIELD_SIZE[curve];
  const point = concat(new Uint8Array([0x04]), padLeft(x, fieldSize), padLeft(y, fieldSize));
  return concat(
    encodeString(`ecdsa-sha2-${curve}`),
    encodeString(curve),
    encodeString(point),
    encodeMpint(d),
  );
}
