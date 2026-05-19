import { parseKey, isParseError, derivePublicKeyLine, publicKeyBytesEqual } from '../utils/keyParser';

// ── Reference keys ────────────────────────────────────────────────────────────
// Real Ed25519 public key (generated with ssh-keygen for testing)
const REF_ED25519_PUB = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEbpCNiWAfJJTW/0tqfG9F8Seo8wERcqhOUYPjA8UXGG test@host';

// ECDSA P-256 (nistp256)
const REF_ECDSA256_PUB = 'ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBHjCFPmDkJb5F+RQjxP1g3UNwcFhB6EH8VK8+Ie2WjJlbf6RLkf3usmIRJSnvKD77mMeTABt6rRHQGmIm5ZtBvc= user@example';

// A fake OPENSSH private key for testing (unencrypted, Ed25519-format structure)
// Built by encoding a known public key
function buildFakeEd25519Pem(pubKey: Uint8Array, seed: Uint8Array, comment: string = ''): string {
  const enc = (s: string | Uint8Array) => {
    const b = typeof s === 'string' ? new TextEncoder().encode(s) : s;
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, b.length, false);
    return new Uint8Array([...len, ...b]);
  };
  const u32 = (n: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n, false);
    return b;
  };
  const cat = (...arrays: Uint8Array[]) => {
    const total = arrays.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const a of arrays) { out.set(a, off); off += a.length; }
    return out;
  };

  const check = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
  const checkInt = new DataView(check.buffer).getUint32(0, false);
  const combined = cat(seed, pubKey); // 64 bytes

  let body = cat(
    u32(checkInt),
    u32(checkInt),
    enc('ssh-ed25519'),
    enc(pubKey),
    enc(combined),
    enc(comment),
  );

  // Pad to 8-byte boundary
  const padLen = (8 - (body.length % 8)) % 8;
  const padding = Uint8Array.from({ length: padLen }, (_, i) => i + 1);
  body = cat(body, padding);

  const pubWire = cat(enc('ssh-ed25519'), enc(pubKey));
  const magic = new TextEncoder().encode('openssh-key-v1\0');

  const outer = cat(
    magic,
    enc('none'),
    enc('none'),
    enc(new Uint8Array(0)),
    u32(1),
    enc(pubWire),
    enc(body),
  );

  let bin = '';
  for (const byte of outer) bin += String.fromCharCode(byte);
  const b64 = btoa(bin);
  const wrapped = b64.match(/.{1,70}/g)?.join('\n') ?? b64;
  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${wrapped}\n-----END OPENSSH PRIVATE KEY-----\n`;
}

const FAKE_PUB_KEY = new Uint8Array(32).fill(0x11);
const FAKE_SEED = new Uint8Array(32).fill(0x22);
const FAKE_COMMENT = 'fake@test';
const FAKE_PRIVATE_PEM = buildFakeEd25519Pem(FAKE_PUB_KEY, FAKE_SEED, FAKE_COMMENT);

// Corresponding public key line
let fakePubB64 = '';
const fakePubWire = (() => {
  const enc = (b: Uint8Array) => {
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, b.length, false);
    return new Uint8Array([...len, ...b]);
  };
  const cat = (...a: Uint8Array[]) => {
    const total = a.reduce((s, x) => s + x.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const x of a) { out.set(x, off); off += x.length; }
    return out;
  };
  const wire = cat(enc(new TextEncoder().encode('ssh-ed25519')), enc(FAKE_PUB_KEY));
  for (const b of wire) fakePubB64 += String.fromCharCode(b);
  return wire;
})();
const FAKE_PUBLIC_KEY_LINE = `ssh-ed25519 ${btoa(fakePubB64)} ${FAKE_COMMENT}`;

// ── parseKey — public key ─────────────────────────────────────────────────────

describe('parseKey — public key', () => {
  it('parses ssh-ed25519 correctly', () => {
    const result = parseKey(REF_ED25519_PUB);
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.keyType).toBe('ssh-ed25519');
      expect(result.isPublic).toBe(true);
      expect(result.bitLength).toBe(256);
      expect(result.comment).toBe('test@host');
    }
  });

  it('parses ecdsa-sha2-nistp256 correctly: bitLength=256', () => {
    const result = parseKey(REF_ECDSA256_PUB);
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.bitLength).toBe(256);
      expect(result.keyType).toBe('ecdsa-sha2-nistp256');
    }
  });

  it('preserves multi-word comment', () => {
    const key = `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEbpCNiWAfJJTW/0tqfG9F8Seo8wERcqhOUYPjA8UXGG user@host generated 2025-01-01`;
    const result = parseKey(key);
    if (!isParseError(result)) {
      expect(result.comment).toBe('user@host generated 2025-01-01');
    }
  });

  it('handles missing comment (returns comment=undefined)', () => {
    const key = `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEbpCNiWAfJJTW/0tqfG9F8Seo8wERcqhOUYPjA8UXGG`;
    const result = parseKey(key);
    if (!isParseError(result)) {
      expect(result.comment).toBeUndefined();
    }
  });

  it('has wireBytes field', () => {
    const result = parseKey(REF_ED25519_PUB);
    if (!isParseError(result)) {
      expect(result.wireBytes).toBeDefined();
      expect(result.wireBytes!.length).toBeGreaterThan(0);
    }
  });
});

// ── parseKey — OpenSSH private key ───────────────────────────────────────────

describe('parseKey — OpenSSH private key', () => {
  it('detects BEGIN OPENSSH PRIVATE KEY → isPublic=false', () => {
    const result = parseKey(FAKE_PRIVATE_PEM);
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.isPublic).toBe(false);
    }
  });

  it('unencrypted key → isEncrypted=false', () => {
    const result = parseKey(FAKE_PRIVATE_PEM);
    if (!isParseError(result)) {
      expect(result.isEncrypted).toBe(false);
    }
  });

  it('extracts embedded public key blob from unencrypted key', () => {
    const result = parseKey(FAKE_PRIVATE_PEM);
    if (!isParseError(result)) {
      expect(result.pubWireBytes).toBeDefined();
      expect(result.pubWireBytes!.length).toBeGreaterThan(0);
    }
  });

  it('embedded public key blob matches the corresponding public key line wire bytes', () => {
    const result = parseKey(FAKE_PRIVATE_PEM);
    if (!isParseError(result)) {
      expect(result.pubWireBytes).toEqual(fakePubWire);
    }
  });
});

// ── derivePublicKeyLine ───────────────────────────────────────────────────────

describe('derivePublicKeyLine', () => {
  it('derives correct ssh-ed25519 line from private key', () => {
    const result = parseKey(FAKE_PRIVATE_PEM);
    if (!isParseError(result)) {
      const line = derivePublicKeyLine(result, FAKE_COMMENT);
      expect(line).toBe(FAKE_PUBLIC_KEY_LINE);
    }
  });

  it('derived public key starts with ssh-ed25519', () => {
    const result = parseKey(FAKE_PRIVATE_PEM);
    if (!isParseError(result)) {
      const line = derivePublicKeyLine(result, '');
      expect(line.startsWith('ssh-ed25519 ')).toBe(true);
    }
  });
});

// ── publicKeyBytesEqual ───────────────────────────────────────────────────────

describe('publicKeyBytesEqual', () => {
  it('returns true for matching public + private key pair', () => {
    const pub = parseKey(FAKE_PUBLIC_KEY_LINE);
    const priv = parseKey(FAKE_PRIVATE_PEM);
    if (!isParseError(pub) && !isParseError(priv)) {
      expect(publicKeyBytesEqual(pub, priv)).toBe(true);
    }
  });

  it('returns false for public key from a different pair', () => {
    const differentPub = new Uint8Array(32).fill(0x99);
    const differentPem = buildFakeEd25519Pem(differentPub, FAKE_SEED, 'other@host');

    // FAKE_PUBLIC_KEY_LINE uses FAKE_PUB_KEY (0x11…), differentPem embeds differentPub (0x99…)
    const pub = parseKey(FAKE_PUBLIC_KEY_LINE);
    const priv = parseKey(differentPem);
    if (!isParseError(pub) && !isParseError(priv)) {
      expect(publicKeyBytesEqual(pub, priv)).toBe(false);
    }
  });
});

// ── parseKey — errors ─────────────────────────────────────────────────────────

describe('parseKey — errors', () => {
  it('returns ParseError for empty string', () => {
    const result = parseKey('');
    expect(isParseError(result)).toBe(true);
  });

  it('returns ParseError for arbitrary text', () => {
    const result = parseKey('hello world this is not a key');
    expect(isParseError(result)).toBe(true);
  });

  it('returns ParseError for truncated/corrupted base64 key', () => {
    const result = parseKey('ssh-ed25519 AAAAC3Nz!!CORRUPT==');
    expect(isParseError(result)).toBe(true);
  });

  it('returns ParseError for BEGIN RSA PRIVATE KEY (PKCS#1)', () => {
    const result = parseKey('-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----');
    expect(isParseError(result)).toBe(true);
    if (isParseError(result)) {
      expect(result.error).toContain('PKCS#1');
    }
  });
});
